# Genera los sonidos y la musica del juego de forma PROCEDURAL (sintesis propia, sin muestras externas).
# Salida: assets/audio/sfx/*.ogg|wav, assets/audio/musica/*.ogg|wav y assets/audio/audio.json (manifiesto).
# Todo es CC0 (ver assets/audio/README.md).
# Uso: python tools/gen_audio.py        (antes de node tools/build/build.js)
#
# Calidad (v2): ESTEREO, filtros Butterworth (sin los ecos previos de los filtros por FFT), osciladores limitados en
# banda (sin aliasing), timbres con armonicos (FM, parciales inarmonicos de campana, piano electrico, pads con detune),
# reverb por convolucion (IR sintetica estereo), saturacion suave, limitador con anticipacion, volumen coherente por
# categoria (RMS objetivo, no solo pico) y codificacion Vorbis de calidad alta (efectos q8, musica q6) desde float32.
import os, sys, json, wave, shutil, subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR = 44100
TAU = 2 * np.pi
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AUD = os.path.join(RAIZ, "assets", "audio")
FFMPEG = shutil.which("ffmpeg")
USAR_OGG = False
if FFMPEG:
    try:
        USAR_OGG = "libvorbis" in subprocess.run([FFMPEG, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
    except Exception:
        USAR_OGG = False

rng = np.random.default_rng(20261029)

# ------------------------------------------------------------------ utilidades basicas
def N(d): return int(round(SR * d))
def T(d): return np.arange(N(d)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12.0)
def db(x): return 10 ** (x / 20.0)
def decay(n, tau): return np.exp(-np.arange(n) / (SR * tau))
def noise(d): return rng.standard_normal(N(d))

def adsr(n, a=0.005, d=0.1, s=0.0, r=0.05):
    e = np.ones(n); a_n, d_n, r_n = N(a), N(d), N(r)
    a_n = max(1, min(a_n, n)); e[:a_n] = np.linspace(0, 1, a_n)
    d_n = min(d_n, n - a_n)
    if d_n > 0: e[a_n:a_n + d_n] = np.linspace(1, s, d_n)
    e[a_n + d_n:] = s
    r_n = min(r_n, n)
    if r_n > 0: e[n - r_n:] *= np.linspace(1, 0, r_n)
    return e

# ------------------------------------------------------------------ filtros (Butterworth, causales y estables)
def _sos(kind, fc, order):
    fc = np.atleast_1d(np.asarray(fc, float)) / (SR / 2); fc = np.clip(fc, 1e-4, 0.97)
    return signal.butter(order, fc if len(fc) > 1 else fc[0], btype=kind, output="sos")
def lp(x, fc, order=2): return signal.sosfilt(_sos("lowpass", fc, order), x, axis=0)
def hp(x, fc, order=2): return signal.sosfilt(_sos("highpass", fc, order), x, axis=0)
def bp(x, lo, hi, order=2): return signal.sosfilt(_sos("bandpass", [lo, hi], order), x, axis=0)

# ------------------------------------------------------------------ osciladores
def sen(f, d, ph=0.0): return np.sin(TAU * f * T(d) + ph)
def saw(f, d, ph=0.0, maxh=24):
    """Diente de sierra limitado en banda (aditivo): sin aliasing."""
    t = T(d); k = int(max(1, min(maxh, (SR * 0.45) / f))); o = np.zeros(len(t))
    for h in range(1, k + 1): o += np.sin(TAU * f * h * t + ph * h) / h
    return o * (2 / np.pi)
def sqr(f, d, ph=0.0, maxh=24):
    t = T(d); k = int(max(1, min(maxh, (SR * 0.45) / f))); o = np.zeros(len(t))
    for h in range(1, k + 1, 2): o += np.sin(TAU * f * h * t + ph * h) / h
    return o * (4 / np.pi) * 0.5
def barrido(f0, f1, d, curva=1.0):
    n = N(d); u = np.linspace(0, 1, n) ** curva
    return np.sin(TAU * np.cumsum(f0 + (f1 - f0) * u) / SR)
def fm(f, d, ratio=2.0, idx=2.0, tau_idx=0.2, tau=0.6, a=0.002, r=0.05):
    t = T(d); mod = np.sin(TAU * f * ratio * t) * idx * np.exp(-t / tau_idx)
    n = len(t)
    return np.sin(TAU * f * t + mod) * np.exp(-t / tau) * adsr(n, a, 0.0, 1.0, r)

# ------------------------------------------------------------------ estereo, efectos y masterizacion
def st(x):   # mono -> (n, 2)
    x = np.asarray(x, float)
    return np.stack([x, x], 1) if x.ndim == 1 else x
def pan(x, p):   # p: -1 (izq) .. 1 (der), ley de potencia constante
    a = (p + 1) * np.pi / 4; return np.stack([x * np.cos(a), x * np.sin(a)], 1) if np.ndim(x) == 1 else x * np.array([np.cos(a), np.sin(a)])
def poner(buf, t0, x, p=0.0, g=1.0):
    """Suma x (mono o estereo) en buf (n,2) a partir de t0 segundos."""
    i = int(round(SR * t0))
    if i >= len(buf) or i < 0: return
    y = pan(x, p) if np.ndim(x) == 1 else x
    L = min(len(y), len(buf) - i); buf[i:i + L] += y[:L] * g

def grave_audible(x, fmax=170, g=0.55):
    """Los celulares casi no reproducen por debajo de ~150 Hz: se sintetizan armonicos del grave (saturacion) para que
    el golpe se 'sienta' tambien en bocinas pequenas."""
    x = np.asarray(x, float); bajo_ = lp(x, fmax, 2)
    arm = bp(np.tanh(bajo_ * 5.0), 170, 900, 2)
    arm *= np.max(np.abs(bajo_)) / max(np.max(np.abs(arm)), 1e-9) * g
    return x + arm
def sat(x, d=1.5):   # saturacion suave (calidez): tanh normalizada
    return np.tanh(x * d) / np.tanh(d)

_IR = {}
def ir(t60, damp=5500, pre=0.012, semilla=0):
    """Respuesta al impulso estereo sintetica: ruido decorrelado, cola exponencial y oscurecimiento progresivo."""
    k = (t60, damp, pre, semilla)
    if k in _IR: return _IR[k]
    g = np.random.default_rng(777 + semilla); n = N(t60 * 1.25 + pre); t = np.arange(n) / SR; sal = []
    for c in range(2):
        r = g.standard_normal(n)
        claro, oscuro = lp(r, damp), lp(r, max(400, damp / 5))
        mezcla = np.exp(-t / (t60 * 0.18))             # al principio brillante, luego oscuro
        h = (claro * mezcla + oscuro * (1 - mezcla)) * np.exp(-6.91 * t / t60)
        h[: N(pre)] = 0
        # reflexiones tempranas dispersas
        for _ in range(7):
            i = N(pre) + int(g.integers(N(0.004), N(0.045))); h[i] += g.standard_normal() * 0.6 * h.std() * 6
        sal.append(h / np.sqrt(np.sum(h ** 2)))
    _IR[k] = np.stack(sal, 1); return _IR[k]
def reverb(x, t60=1.2, mezcla=0.2, damp=5500, pre=0.012, cola=True, semilla=0):
    """Reverb por convolucion. cola=True alarga la senal para no cortar la cola."""
    x = st(x).copy(); h = ir(t60, damp, pre, semilla)
    L = min(len(x), N(0.03)); x[-L:] *= np.linspace(1, 0, L)[:, None]          # sin cortes secos: evita el clic al final de la senal
    ext = len(h) if cola else 0
    xi = np.concatenate([x, np.zeros((ext, 2))]) if ext else x
    mono = hp(xi.mean(1), 180, 1)
    wet = np.stack([signal.fftconvolve(mono, h[:, c])[:len(xi)] for c in range(2)], 1)
    return xi * (1 - 0.35 * mezcla) + wet * mezcla * 1.6
def retardo(x, tiempo, fb=0.35, mezcla=0.3, oscuro=3500, rebotes=6):
    """Eco ping-pong estereo con repeticiones cada vez mas oscuras."""
    x = st(x); n = len(x); o = x.copy(); d = N(tiempo); cur = x
    for k in range(1, rebotes + 1):
        cur = lp(cur[:, ::-1] if k % 2 else cur[:, ::-1], oscuro, 1) * fb          # cruza canales
        i = d * k
        if i >= n: break
        o[i:] += cur[: n - i] * mezcla
    return o

def rms_activo(x, umbral_db=-55):
    m = x.mean(1) if x.ndim == 2 else x
    v = max(1, N(0.05)); n = len(m) // v
    if n < 1: return db(-60), 0
    f = np.sqrt((m[: n * v].reshape(n, v) ** 2).mean(1)); act = f > db(umbral_db)
    if not act.any(): return db(-60), 0
    return float(np.sqrt((f[act] ** 2).mean())), float(act.mean())
def limitar(x, techo=0.89, anticipo=0.004):
    w = max(3, N(anticipo)) | 1
    pico = np.max(np.abs(x), axis=1)
    g = np.minimum(1.0, techo / np.maximum(maximum_filter1d(pico, w * 2 + 1), 1e-9))
    g = uniform_filter1d(g, w * 2 + 1)
    y = x * g[:, None]; m = np.max(np.abs(y))
    return y * (techo / m) if m > techo else y
def maestro(x, rms_db=-18.0, techo=0.89, i=0.002, o=0.03, recortar=True):
    """Ajusta al RMS objetivo (sobre la parte activa), limita picos y recorta el silencio final."""
    x = st(x).copy()
    if recortar:
        env = uniform_filter1d(np.abs(x).max(1), N(0.02)); idx = np.nonzero(env > db(-60))[0]
        if len(idx): x = x[: min(len(x), idx[-1] + N(0.05))]
    r, _ = rms_activo(x); x *= db(rms_db) / max(r, 1e-9)
    x = limitar(x, techo)
    a, b = N(i), N(o)
    if a: x[:a] *= np.linspace(0, 1, a)[:, None]
    if b and len(x) > b: x[-b:] *= np.linspace(1, 0, b)[:, None]
    return x

# ------------------------------------------------------------------ voces
def campana_parciales(f, d, tau=1.0, brillo=1.0, golpe=0.35):
    """Campana: parciales inarmonicos con batido (dos copias desafinadas) y transitorio de golpe."""
    t = T(d); o = np.zeros(len(t))
    for r, a, k in ((0.5, 0.45, 3.0), (1.0, 1.0, 2.4), (1.19, 0.6, 1.8), (1.56, 0.42, 1.5), (2.0, 0.55, 1.4), (2.51, 0.3, 1.0), (2.66, 0.26, 0.9), (3.01, 0.24, 0.8), (4.17, 0.14, 0.5), (5.43, 0.08, 0.35)):
        g = a * (brillo if r > 2 else 1.0) * np.exp(-t / (tau * k))
        o += g * (np.sin(TAU * f * r * t) + 0.7 * np.sin(TAU * (f * r + 0.35 + 0.1 * r) * t + 1.1))
    imp = hp(noise(d), 2500, 1) * np.exp(-t / 0.006) * golpe * 0.6
    return (o * 0.5 + imp) * adsr(len(t), 0.001, 0.0, 1.0, min(0.15, d * 0.2))
def pluck(f, d, tau=0.5, brillo=1.0, vol=1.0):
    """Cuerda pulsada: armonicos que decaen mas rapido cuanto mas agudos."""
    t = T(d); o = np.zeros(len(t))
    for h, a in ((1, 1.0), (2, 0.5), (3, 0.32), (4, 0.2), (5, 0.12), (6, 0.08)):
        if f * h < SR * 0.42: o += a * (brillo if h > 1 else 1) * np.sin(TAU * f * h * t + 0.3 * h) * np.exp(-t / (tau / (1 + 0.55 * (h - 1))))
    return o * vol * adsr(len(t), 0.002, 0.0, 1.0, 0.04)
def piano_ep(f, d, vel=1.0):
    """Piano electrico tipo Rhodes (FM): cuerpo calido + 'tine' brillante que se apaga rapido."""
    t = T(d); n = len(t)
    cuerpo = np.sin(TAU * f * t + 1.3 * vel * np.exp(-t / 0.45) * np.sin(TAU * f * t))
    tine = 0.22 * vel * np.sin(TAU * f * 7.0 * t + 0.8 * np.sin(TAU * f * 14.0 * t)) * np.exp(-t / 0.07)
    trem = 1 + 0.06 * np.sin(TAU * 4.6 * t)
    return (cuerpo * np.exp(-t / 1.6) + tine) * trem * adsr(n, 0.003, 0.0, 1.0, 0.25) * (0.5 + 0.5 * vel)
def bajo(f, d, vol=1.0, tau=0.9):
    t = T(d); n = len(t)
    x = np.sin(TAU * f * t) + 0.35 * np.sin(TAU * 2 * f * t) * np.exp(-t / 0.25)
    return lp(grave_audible(sat(x, 1.8), 140, 0.45), 900, 2) * vol * np.exp(-t / tau) * adsr(n, 0.006, 0.0, 1.0, 0.08)
def pad(f, d, vol=1.0, det=0.0035, a=1.2, r=1.5, brillo=1600):
    """Pad calido: tres sierras desafinadas limitadas en banda + sub, con filtro suave."""
    n = N(d); ph = rng.uniform(0, TAU, 3)
    x = saw(f, d, ph[0], 14) + 0.8 * saw(f * (1 + det), d, ph[1], 14) + 0.8 * saw(f * (1 - det), d, ph[2], 14) + 0.5 * sen(f * 0.5, d)
    x = lp(x, brillo, 2) * (1 + 0.04 * np.sin(TAU * 0.23 * T(d) + ph[0]))
    return x * vol * 0.3 * adsr(n, a, 0.0, 1.0, r)
def bombo(vol=1.0, largo=0.5):
    n = N(largo); t = np.arange(n) / SR
    f = 44 + 95 * np.exp(-t / 0.028); x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    clic = hp(noise(largo), 1800, 1) * np.exp(-t / 0.004) * 0.25
    return grave_audible(sat(x + clic, 1.6), 150, 0.5) * vol * adsr(n, 0.001, 0.0, 1.0, 0.03)
def caja(vol=1.0, suave=False):
    d = 0.3; n = N(d); t = np.arange(n) / SR
    ruido = bp(noise(d), 1300, 7500) * np.exp(-t / (0.16 if suave else 0.11))
    cuerpo = np.sin(TAU * 185 * t) * np.exp(-t / 0.05) * 0.6
    return (ruido * (0.55 if suave else 0.8) + cuerpo) * vol * adsr(n, 0.001, 0.0, 1.0, 0.03)
def hat(vol=1.0, abierto=False):
    d = 0.25 if abierto else 0.07; n = N(d); t = np.arange(n) / SR
    return hp(bp(noise(d), 5500, 15000), 6000, 1) * np.exp(-t / (0.09 if abierto else 0.016)) * vol

# ====================================================================== EFECTOS ======================================================================
def ruido_st(d, lo, hi):
    return np.stack([bp(noise(d), lo, hi), bp(noise(d), lo, hi)], 1)

def sfx_arrastre():      # papel deslizandose: ruido de banda media con "granos" y cuerpo grave
    d = 0.38; n = N(d); t = np.arange(n) / SR
    x = ruido_st(d, 600, 3800) * (0.6 + 0.4 * lp(rng.standard_normal(n), 35, 1)[:, None] * 6).clip(0.2, 1.4)
    cuerpo = ruido_st(d, 150, 520) * 0.5
    e = (np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5)[:, None]
    return maestro(reverb((x + cuerpo) * e, 0.35, 0.12), -23.5)
def sfx_soltar():        # golpecito suave de la carta al soltarla
    d = 0.22; n = N(d); t = np.arange(n) / SR
    th = barrido(200, 72, d, 0.6) * np.exp(-t / 0.055)
    cl = hp(noise(d), 2200, 1) * np.exp(-t / 0.007) * 0.4
    cuerpo = bp(noise(d), 250, 900) * np.exp(-t / 0.03) * 0.5
    return maestro(reverb(grave_audible(sat(th + cl + cuerpo, 1.3), 160, 0.6), 0.4, 0.14), -19)
def sfx_voltear():       # giro de carta: barrido de aire que sube + aterrizaje suave
    d = 0.26; n = N(d); t = np.arange(n) / SR; x = np.zeros(n)
    for (lo, hi), c, s in (((700, 2200), 0.05, 0.035), ((2000, 5200), 0.085, 0.03), ((4200, 9500), 0.12, 0.025)):
        x += bp(noise(d), lo, hi) * np.exp(-((t - c) ** 2) / (2 * s ** 2))
    th = np.sin(TAU * 130 * t) * np.exp(-np.maximum(0, t - 0.15) / 0.03) * (t > 0.15) * 0.8
    return maestro(reverb(st(x * 0.9 + th) , 0.45, 0.16), -21)
def sfx_pagina():        # hoja que se pasa: roce con aleteo
    d = 0.42; n = N(d); t = np.arange(n) / SR
    x = ruido_st(d, 900, 6800)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2 * (0.7 + 0.3 * np.sin(TAU * 20 * t + rng.uniform(0, 6)))
    return maestro(reverb(x * e[:, None] + ruido_st(d, 160, 600) * 0.25 * e[:, None], 0.4, 0.14), -23, o=0.06)
def _arpegio(notas, sep, dur, tau, brillo, pans, vol):
    n = N(sep * len(notas) + dur + 0.3); buf = np.zeros((n, 2))
    for i, (m_, p) in enumerate(zip(notas, pans)):
        poner(buf, i * sep, lp(pluck(midi(m_), dur, tau, brillo), 7000, 1), p, vol * (0.85 + 0.15 * i / max(1, len(notas) - 1)))
    return buf
def sfx_sube():
    return maestro(reverb(_arpegio([72, 76, 79, 84], 0.065, 0.45, 0.22, 1.0, [-0.35, -0.1, 0.15, 0.4], 1.0), 1.1, 0.24), -19)
def sfx_baja():
    return maestro(reverb(_arpegio([74, 69, 65, 62], 0.075, 0.5, 0.2, 0.55, [0.35, 0.1, -0.15, -0.4], 1.0), 1.0, 0.22, damp=3800), -20)
def sfx_golpe():         # impacto grande: bombo profundo + cuerpo + chasquido, con cola de sala
    d = 1.5; n = N(d); t = np.arange(n) / SR
    b = barrido(105, 36, d, 0.35) * np.exp(-t / 0.3)
    r = lp(noise(d), 420, 2) * np.exp(-t / 0.13)
    c = hp(noise(d), 1500, 1) * np.exp(-t / 0.011) * 0.35
    m = bp(noise(d), 180, 1400) * np.exp(-t / 0.09) * 0.7                  # cuerpo en medios (se oye en bocinas chicas)
    return maestro(reverb(grave_audible(sat(b + 0.5 * r + c + m, 1.7), 150, 0.7), 1.3, 0.22, damp=4500), -14, i=0.001, o=0.12)
def sfx_logro():         # campanitas brillantes que suben
    b = np.zeros((N(2.4), 2))
    for i, (m_, p, v) in enumerate(((88, -0.3, 1.0), (95, 0.1, 0.9), (100, 0.4, 0.75))):
        poner(b, i * 0.12, campana_parciales(midi(m_), 1.9, 0.5, 1.0, 0.15), p, v * 0.6)
    poner(b, 0.0, hp(noise(1.0), 6000, 1) * np.exp(-T(1.0) / 0.12) * 0.07, 0)     # brillito inicial
    return maestro(reverb(b, 2.2, 0.3, damp=7500), -17, o=0.2)
def sfx_boton():         # "pop" suave
    d = 0.09; n = N(d); t = np.arange(n) / SR
    x = np.sin(TAU * np.cumsum(1250 - 420 * np.minimum(1, t / 0.03)) / SR) * np.exp(-t / 0.022)
    x += 0.45 * np.sin(TAU * 2480 * t) * np.exp(-t / 0.012) + hp(noise(d), 3000, 1) * np.exp(-t / 0.004) * 0.5
    return maestro(reverb(x, 0.2, 0.1), -21, i=0.0008, o=0.012)
def sfx_tic():           # bloque de madera
    d = 0.1; n = N(d); t = np.arange(n) / SR
    x = (np.sin(TAU * 1850 * t) * np.exp(-t / 0.014) + 0.5 * np.sin(TAU * 2790 * t + 0.5) * np.exp(-t / 0.009) + 0.3 * np.sin(TAU * 905 * t) * np.exp(-t / 0.02))
    x += hp(noise(d), 4000, 1) * np.exp(-t / 0.003) * 0.45 + 0.3 * np.sin(TAU * 4100 * t) * np.exp(-t / 0.006)
    return maestro(reverb(x, 0.2, 0.08), -23, i=0.0005, o=0.015)
def sfx_acierto():       # dos notas tipo marimba, ascendentes
    def marimba(m_, d):
        f = midi(m_); t = T(d)
        return (np.sin(TAU * f * t) + 0.45 * np.sin(TAU * 4 * f * t) * np.exp(-t / 0.035) + 0.12 * np.sin(TAU * 10 * f * t) * np.exp(-t / 0.012)) * np.exp(-t / 0.26) * adsr(len(t), 0.001, 0, 1, 0.06)
    b = np.zeros((N(0.8), 2)); poner(b, 0, marimba(76, 0.5), -0.15); poner(b, 0.1, marimba(83, 0.6), 0.2)
    return maestro(reverb(b, 0.9, 0.22), -19)
def sfx_error():         # dos notas graves "bonk", suaves y redondas (no un zumbido)
    b = np.zeros((N(0.7), 2))
    for i, (m_, d) in enumerate(((55, 0.3), (50, 0.42))):
        f = midi(m_); x = lp(sat(saw(f, d, 0.0, 10) * 0.7 + sqr(f * 0.5, d) * 0.4, 1.6), 900, 2) * adsr(N(d), 0.006, 0.12, 0.55, 0.14)
        poner(b, i * 0.16, x, 0.0, 1.0)
    return maestro(reverb(b, 0.5, 0.12, damp=3000), -18)
def sfx_campana():       # campana de escuela / aviso de eleccion
    x = campana_parciales(midi(69), 3.2, 1.0, 1.0, 0.4)
    return maestro(reverb(x, 2.2, 0.24, damp=6500), -17.5, o=0.3)
def sfx_voto():          # tic de madera mas grave
    d = 0.12; n = N(d); t = np.arange(n) / SR
    x = (np.sin(TAU * 760 * t) + 0.45 * np.sin(TAU * 1520 * t) * np.exp(-t / 0.012)) * np.exp(-t / 0.024)
    x += hp(noise(d), 3000, 1) * np.exp(-t / 0.004) * 0.4 + 0.3 * np.sin(TAU * 2280 * t) * np.exp(-t / 0.01)
    return maestro(reverb(x, 0.25, 0.1), -22.5, i=0.0008, o=0.02)
def sfx_gong():          # tam-tam: modos inarmonicos que se mueven + oleada de ruido
    d = 5.0; t = T(d); n = len(t); o = np.zeros(n)
    for r, a, tau in ((1.0, 1.0, 3.6), (1.47, 0.6, 3.0), (1.79, 0.55, 2.8), (2.13, 0.45, 2.2), (2.76, 0.4, 1.8), (3.52, 0.28, 1.3), (4.9, 0.18, 0.9), (6.3, 0.1, 0.6)):
        vib = 0.35 * np.sin(TAU * (0.25 + 0.07 * r) * t + r)
        o += a * np.sin(TAU * 110 * r * t + vib) * np.exp(-t / tau)
    ola = bp(noise(d), 180, 2800) * (np.minimum(1, t / 0.35) * np.exp(-t / 2.2))
    golpe = lp(noise(d), 900, 2) * np.exp(-t / 0.05) * 0.5
    return maestro(reverb(o * 0.55 + ola * 0.25 + golpe, 3.4, 0.28, damp=5000), -16, o=0.5)
def sfx_final():         # cierre de historia: enjambre calido de pad + campana, cola larga
    d = 6.0; n = N(d); t = np.arange(n) / SR; b = np.zeros((n, 2))
    for m_, a in ((50, 1.0), (57, 0.85), (62, 0.75), (65, 0.65), (69, 0.5), (74, 0.4)):
        v = pad(midi(m_), d, a, 0.004, 0.7, 1.5, 1500) * np.exp(-np.maximum(0, t - 1.4) / 1.8)
        poner(b, 0, v, rng.uniform(-0.5, 0.5))
    poner(b, 0.0, campana_parciales(midi(74), 4.0, 1.2, 1.0, 0.3), 0.0, 0.22)
    return maestro(reverb(b, 3.6, 0.3, damp=5200), -16, o=0.6)

SFX = {
    "arrastre": sfx_arrastre, "soltar": sfx_soltar, "voltear": sfx_voltear, "pagina": sfx_pagina, "sube": sfx_sube,
    "baja": sfx_baja, "golpe": sfx_golpe, "logro": sfx_logro, "boton": sfx_boton, "tic": sfx_tic, "acierto": sfx_acierto,
    "error": sfx_error, "campana": sfx_campana, "voto": sfx_voto, "gong": sfx_gong, "final": sfx_final,
}

# ====================================================================== MUSICA ======================================================================
def render_musica(dur, escena, t60, mezcla, damp, cola, rms=-16.0, brillo_max=11000, calidez=1.25):
    """Renderiza dur + cola s, procesa (reverb, saturacion de cinta, filtros) y PLIEGA la cola sobre el inicio:
    el loop queda continuo, con la reverberacion incluida."""
    n = N(dur + cola); buf = np.zeros((n, 2)); escena(buf)
    buf = sat(buf, calidez)
    buf = reverb(buf, t60, mezcla, damp, 0.02)
    buf = hp(lp(buf, brillo_max, 2), 38, 2)
    base = buf[:N(dur)].copy(); resto = buf[N(dur):]
    i = 0
    while i < len(resto):
        L = min(len(base), len(resto) - i); base[:L] += resto[i:i + L]; i += L
    return maestro(base, rms, 0.89, 0.0, 0.0, recortar=False)

def musica_oficina():    # calma, lo-fi: piano electrico, bajo suave, escobillas y un eco de celesta
    bpm = 62; beat = 60 / bpm; bar = 4 * beat; nb = 12; dur = nb * bar
    ac = [(45, [57, 60, 64]), (41, [53, 57, 60]), (38, [53, 57, 62]), (40, [52, 56, 59])]  # Am F Dm E
    pent = [69, 72, 74, 76, 79, 81]
    def esc(buf):
        mel = np.zeros_like(buf)
        for b in range(nb):
            raiz, acorde = ac[b % 4]; t0 = b * bar
            for k, m_ in enumerate(acorde):
                poner(buf, t0 + 0.012 * k, piano_ep(midi(m_), bar * 0.95, 0.9), -0.3 + 0.3 * k, 0.55)              # acorde (rasgueo leve)
                poner(buf, t0 + 2 * beat + 0.01 * k, piano_ep(midi(m_), bar * 0.45, 0.55), -0.3 + 0.3 * k, 0.32)
            poner(buf, t0, pad(midi(acorde[1]), bar + 2.2, 0.5, 0.004, 1.2, 1.5, 1100), 0, 0.45)
            poner(buf, t0, bajo(midi(raiz), bar * 0.9, 0.85, 1.4), 0)
            poner(buf, t0 + 2.5 * beat, bajo(midi(raiz), beat * 0.9, 0.5, 0.5), 0)
            poner(buf, t0, bombo(0.42), 0); poner(buf, t0 + 2 * beat, bombo(0.28), 0)
            for k in (1, 3): poner(buf, t0 + k * beat, caja(0.22, True), 0.15)
            for k in range(8): poner(buf, t0 + k * beat / 2 + (0.035 * beat if k % 2 else 0), hat(0.07 if k % 2 else 0.1), 0.35 if k % 2 else -0.15)
            for k in range(2):
                if rng.random() < 0.8:
                    poner(mel, t0 + (0.5 + k * 1.75 + rng.random() * 0.5) * beat * 2, fm(midi(int(rng.choice(pent)) + 12), 2.0, 3.0, 1.3, 0.12, 0.45), rng.uniform(-0.6, 0.6), 0.16)
        buf += retardo(mel, beat * 0.75, 0.42, 0.55, 3000)[:len(buf)]
    return render_musica(dur, esc, 1.8, 0.22, 5200, 5.0, -14.5)

def musica_campana():    # mas pulso (elecciones, sucesion): bombo, caja, bajo pulsado y arpegio con eco
    bpm = 100; beat = 60 / bpm; bar = 4 * beat; nb = 16; dur = nb * bar
    ac = [(38, [57, 62, 65]), (34, [53, 57, 62]), (31, [55, 58, 62]), (33, [57, 61, 64])]  # Dm Bb Gm A
    arp = lambda a: [a[0], a[1], a[2], a[1]]
    def esc(buf):
        padbus = np.zeros_like(buf); arpbus = np.zeros_like(buf); golpes = []
        for b in range(nb):
            raiz, acorde = ac[b % 4]; t0 = b * bar
            for k, m_ in enumerate(acorde): poner(padbus, t0, pad(midi(m_), bar + 1.0, 0.8, 0.005, 0.4, 0.8, 1900), -0.4 + 0.4 * k)
            for k in range(4):
                poner(buf, t0 + k * beat, bombo(0.75), 0); golpes.append(t0 + k * beat)
                if k in (1, 3): poner(buf, t0 + k * beat, caja(0.42), 0.1)
            for k in range(8):
                poner(buf, t0 + k * beat / 2, bajo(midi(raiz + 12), beat * 0.42, 0.55, 0.16), 0)
                poner(buf, t0 + k * beat / 2 + beat / 4, hat(0.1), 0.3 if k % 2 else -0.3)
                if k % 4 == 3: poner(buf, t0 + k * beat / 2 + beat / 2 - 0.02, hat(0.12, True), 0.25)
            if b >= 4:
                for k, m_ in enumerate(arp(acorde) * 2): poner(arpbus, t0 + k * beat / 2, pluck(midi(m_ + 12), 0.7, 0.26, 0.9), -0.5 + 0.14 * k, 0.2)
        t = np.arange(len(buf)) / SR; duck = np.ones(len(buf))                   # el pad "respira" con cada bombo
        for g_ in golpes:
            i = int(g_ * SR); L = min(N(0.35), len(buf) - i)
            if L > 0: duck[i:i + L] = np.minimum(duck[i:i + L], 1 - 0.55 * np.exp(-np.arange(L) / (SR * 0.11)))
        buf += padbus * duck[:, None] + retardo(arpbus, beat * 0.75, 0.38, 0.5, 3600)[:len(buf)]
    return render_musica(dur, esc, 1.3, 0.16, 6000, 3.5, -14.0)

def musica_destino():    # ambiental, amplio: pads anchos, drone grave y campanas lejanas
    bpm = 48; beat = 60 / bpm; bar = 4 * beat; nb = 10; dur = nb * bar
    ac = [(38, [57, 62, 66, 69]), (43, [59, 62, 67, 71]), (36, [55, 60, 64, 67]), (38, [57, 62, 66, 73])]  # D / Gmaj7 / C / D add
    esc_ = [62, 66, 69, 73, 74, 78]
    def esc(buf):
        for b in range(nb):
            raiz, acorde = ac[b % 4]; t0 = b * bar
            for k, m_ in enumerate(acorde): poner(buf, t0, pad(midi(m_), bar + 3.4, 0.85, 0.006, 2.2, 2.6, 2300), -0.7 + 0.47 * k)
            poner(buf, t0, pad(midi(raiz), bar + 2.2, 1.0, 0.003, 1.5, 2.0, 700), 0)
            poner(buf, t0, sen(midi(raiz - 12), bar + 1.8) * adsr(N(bar + 1.8), 1.2, 0, 1, 1.6) * 0.18, 0)
            if rng.random() < 0.9:
                poner(buf, t0 + rng.random() * bar * 0.5, campana_parciales(midi(int(rng.choice(esc_)) + 12), 3.4, 0.9, 0.8, 0.2), rng.uniform(-0.7, 0.7), 0.11)
            if b % 2 == 1:
                poner(buf, t0 + bar * 0.5, campana_parciales(midi(int(rng.choice(esc_)) + 24), 3.4, 1.2, 0.8, 0.15), rng.uniform(-0.8, 0.8), 0.08)
    return render_musica(dur, esc, 3.6, 0.34, 4800, 6.5, -15.5, 9500, 1.1)

MUS = {"oficina": musica_oficina, "campana": musica_campana, "destino": musica_destino}

# ====================================================================== salida ======================================================================
def guardar(sub, nombre, x, ogg_q):
    d = os.path.join(AUD, sub); os.makedirs(d, exist_ok=True)
    wav = os.path.join(d, nombre + ".wav")
    wavfile.write(wav, SR, x.astype(np.float32))                 # float32: el codificador recibe la senal sin cuantizar
    if USAR_OGG:
        o = os.path.join(d, nombre + ".ogg")
        r = subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", wav, "-ac", "2", "-c:a", "libvorbis", "-q:a", str(ogg_q), o])
        if r.returncode == 0 and os.path.exists(o):
            os.remove(wav)
            return "assets/audio/%s/%s.ogg" % (sub, nombre)
    pcm = (np.clip(x + (rng.random(x.shape) - rng.random(x.shape)) / 32768.0, -1, 1) * 32767).astype("<i2")   # dither TPDF para el WAV de 16 bits
    with wave.open(wav, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    return "assets/audio/%s/%s.wav" % (sub, nombre)

if __name__ == "__main__":
    man = {"sfx": {}, "musica": {}}
    for k, fn in SFX.items(): man["sfx"][k] = guardar("sfx", k, fn(), 8)
    for k, fn in MUS.items(): man["musica"][k] = guardar("musica", k, fn(), 6)
    man["formato"] = "ogg" if USAR_OGG else "wav"
    os.makedirs(AUD, exist_ok=True)
    with open(os.path.join(AUD, "audio.json"), "w", encoding="utf8") as f: json.dump(man, f, indent=1)
    tam = sum(os.path.getsize(os.path.join(RAIZ, p)) for g in ("sfx", "musica") for p in man[g].values())
    print("audio generado (%s, estereo): %d efectos, %d pistas, %.0f KB" % (man["formato"], len(man["sfx"]), len(man["musica"]), tam / 1024))
