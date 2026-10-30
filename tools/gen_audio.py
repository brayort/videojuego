# Genera los sonidos y la musica del juego de forma PROCEDURAL (sintesis propia, sin muestras externas).
# Salida: assets/audio/sfx/*.ogg|wav, assets/audio/musica/*.ogg|wav y assets/audio/audio.json (manifiesto).
# OGG si hay ffmpeg con libvorbis; si no, WAV. Todo es CC0 (ver assets/audio/README.md).
# Uso: python tools/gen_audio.py        (antes de node src/build.js)
import os, sys, json, wave, shutil, subprocess
import numpy as np

SR = 44100
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AUD = os.path.join(RAIZ, "assets", "audio")
FFMPEG = shutil.which("ffmpeg")
USAR_OGG = False
if FFMPEG:
    try:
        enc = subprocess.run([FFMPEG, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
        USAR_OGG = "libvorbis" in enc
    except Exception:
        USAR_OGG = False

rng = np.random.default_rng(20261029)
T = lambda d: np.arange(int(SR * d)) / SR

def midi(n): return 440.0 * 2 ** ((n - 69) / 12.0)
def adsr(n, a=0.005, d=0.1, s=0.0, r=0.05):
    e = np.ones(n); a_n, d_n, r_n = int(SR * a), int(SR * d), int(SR * r)
    a_n = max(1, min(a_n, n)); e[:a_n] = np.linspace(0, 1, a_n)
    d_n = min(d_n, n - a_n)
    if d_n > 0: e[a_n:a_n + d_n] = np.linspace(1, s, d_n)
    e[a_n + d_n:] = s
    r_n = min(r_n, n)
    if r_n > 0: e[n - r_n:] *= np.linspace(1, 0, r_n)
    return e
def decay(n, tau): return np.exp(-np.arange(n) / (SR * tau))
def sine(f, d, ph=0.0):
    f = np.asarray(f) if np.ndim(f) else f
    t = T(d)
    if np.ndim(f): return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)
    return np.sin(2 * np.pi * f * t + ph)
def sweep(f0, f1, d, curva=1.0):
    n = int(SR * d); u = np.linspace(0, 1, n) ** curva
    return np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * u) / SR)
def noise(d): return rng.standard_normal(int(SR * d))
def bp(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = ((f >= lo) & (f <= hi)).astype(float)
    # bordes suaves
    k = max(1, int(len(x) / SR * 80)); m = np.convolve(m, np.ones(k) / k, mode="same")
    return np.fft.irfft(X * m, len(x))
def norm(x, pico=0.7):
    m = np.max(np.abs(x)) or 1.0
    return x / m * pico
def fade(x, i=0.004, o=0.02):
    x = x.copy(); a, b = int(SR * i), int(SR * o)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x
def mezcla(*partes, n=None):
    n = n or int(max(len(p[1]) + SR * p[0] for p in partes))
    o = np.zeros(n)
    for off, p in partes:
        i = int(SR * off); L = min(len(p), n - i)
        if L > 0: o[i:i + L] += p[:L]
    return o
def campana(f, d, brillo=1.0, tau=0.8):
    n = int(SR * d); t = np.arange(n) / SR; o = np.zeros(n)
    for r, a, k in ((1.0, 1.0, 1.0), (2.76, 0.5, 0.6), (5.4, 0.25, 0.35), (8.93, 0.12, 0.2)):
        o += a * brillo ** (r > 1) * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (tau * k))
    return o * adsr(n, 0.002, 0.01, 1.0, 0.05)

def tono(f, d, arm=(1.0, 0.0, 0.0), a=0.01, tau=0.3, r=0.04):
    n = int(SR * d); t = np.arange(n) / SR
    o = sum(w * np.sin(2 * np.pi * f * (k + 1) * t) for k, w in enumerate(arm) if w)
    return o * np.minimum(1, t / a) * np.exp(-t / tau) * adsr(n, 0.001, 0.0, 1.0, r)

# ---------------------------- EFECTOS ----------------------------
def sfx_arrastre():
    d = 0.38; n = int(SR * d); x = noise(d)
    x = bp(x, 400, 2200) * 0.8 + bp(noise(d), 120, 500) * 0.5
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.6
    return fade(norm(x * e, 0.45))
def sfx_soltar():
    d = 0.2; n = int(SR * d)
    th = sweep(190, 70, d, 0.6) * decay(n, 0.05)
    cl = bp(noise(d), 1500, 5000) * decay(n, 0.008)
    return fade(norm(th + 0.35 * cl, 0.6))
def sfx_voltear():
    d = 0.22; n = int(SR * d); x = noise(d)
    x = bp(x, 1800, 7500)
    crack = (rng.random(n) > 0.9985).astype(float) * rng.standard_normal(n) * 3
    e = np.exp(-((np.arange(n) / SR - 0.05) ** 2) / (2 * 0.04 ** 2)) + 0.5 * np.exp(-np.arange(n) / (SR * 0.03))
    return fade(norm((x + bp(crack, 2500, 9000)) * e, 0.5))
def sfx_pagina():
    d = 0.42; n = int(SR * d); x = bp(noise(d), 900, 6500)
    t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2 * (0.75 + 0.25 * np.sin(2 * np.pi * 22 * t))
    return fade(norm(x * e, 0.5), 0.01, 0.06)
def sfx_sube():
    notas = [midi(72), midi(76), midi(79)]
    return fade(norm(mezcla(*[(i * 0.07, tono(f, 0.22, (1, 0.25, 0.1), tau=0.12)) for i, f in enumerate(notas)]), 0.55))
def sfx_baja():
    notas = [midi(74), midi(69), midi(62)]
    return fade(norm(mezcla(*[(i * 0.08, tono(f, 0.26, (1, 0.35, 0.12), tau=0.14)) for i, f in enumerate(notas)]), 0.55))
def sfx_golpe():
    d = 0.9; n = int(SR * d)
    b = sweep(95, 38, d, 0.35) * decay(n, 0.28)
    r = bp(noise(d), 60, 400) * decay(n, 0.12)
    c = bp(noise(d), 1200, 4000) * decay(n, 0.01)
    return fade(norm(b + 0.6 * r + 0.3 * c, 0.85), 0.002, 0.05)
def sfx_logro():
    a = campana(midi(88), 1.3, tau=0.5); b = campana(midi(95), 1.6, tau=0.7)
    return fade(norm(mezcla((0, a), (0.13, b * 0.9)), 0.6), 0.002, 0.15)
def sfx_boton():
    d = 0.07; n = int(SR * d)
    x = (np.sin(2 * np.pi * 1250 * T(d)) * 0.8 + bp(noise(d), 2000, 6000) * 0.4) * decay(n, 0.012)
    return fade(norm(x, 0.5), 0.001, 0.01)
def sfx_tic():
    d = 0.06; n = int(SR * d)
    x = (np.sin(2 * np.pi * 2200 * T(d)) * 0.6 + bp(noise(d), 3000, 9000) * 0.5) * decay(n, 0.006)
    return fade(norm(x, 0.45), 0.0005, 0.01)
def sfx_acierto():
    return fade(norm(mezcla((0, tono(midi(76), 0.18, (1, 0.3), tau=0.12)), (0.09, tono(midi(83), 0.34, (1, 0.3, 0.1), tau=0.2))), 0.55), 0.002, 0.08)
def sfx_error():
    d = 0.4; n = int(SR * d); f = np.linspace(190, 110, n)
    saw = ((np.cumsum(f) / SR) % 1.0) * 2 - 1
    x = (saw * 0.6 + np.sign(np.sin(2 * np.pi * np.cumsum(f * 0.5) / SR)) * 0.2) * adsr(n, 0.005, 0.1, 0.7, 0.12)
    x = bp(x, 80, 900)
    return fade(norm(x, 0.5), 0.002, 0.05)
def sfx_campana():
    a = campana(midi(69), 2.4, tau=1.0); b = campana(midi(69) * 1.5, 2.4, tau=0.9) * 0.4
    return fade(norm(a + b, 0.6), 0.002, 0.25)
def sfx_voto():
    d = 0.1; n = int(SR * d)
    x = (np.sin(2 * np.pi * 760 * T(d)) + 0.4 * np.sin(2 * np.pi * 1520 * T(d))) * decay(n, 0.018)
    return fade(norm(x, 0.45), 0.001, 0.015)
def sfx_gong():
    d = 3.2; n = int(SR * d); t = np.arange(n) / SR; o = np.zeros(n)
    for f, a, tau in ((110, 1.0, 1.8), (164.8, 0.55, 1.5), (131.0, 0.5, 1.6), (220, 0.4, 1.1), (301, 0.25, 0.8), (497, 0.15, 0.5)):
        o += a * np.sin(2 * np.pi * f * t + 0.8 * np.sin(2 * np.pi * 1.7 * t) * 0.3) * np.exp(-t / tau)
    o += 0.25 * bp(noise(d), 200, 1500) * decay(n, 0.25)
    return fade(norm(o, 0.7), 0.005, 0.3)
def sfx_final():
    d = 4.5; n = int(SR * d); t = np.arange(n) / SR; o = np.zeros(n)
    for m_, a in ((50, 1.0), (57, 0.8), (62, 0.7), (65, 0.6), (69, 0.5), (74, 0.35)):
        f = midi(m_)
        o += a * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t) + 0.5 * np.sin(2 * np.pi * (f * 1.003) * t))
    env = np.minimum(1, t / 0.6) * np.exp(-np.maximum(0, t - 1.2) / 1.6)
    return fade(norm(o * env, 0.65), 0.01, 0.4)

SFX = {
    "arrastre": sfx_arrastre, "soltar": sfx_soltar, "voltear": sfx_voltear, "pagina": sfx_pagina, "sube": sfx_sube,
    "baja": sfx_baja, "golpe": sfx_golpe, "logro": sfx_logro, "boton": sfx_boton, "tic": sfx_tic, "acierto": sfx_acierto,
    "error": sfx_error, "campana": sfx_campana, "voto": sfx_voto, "gong": sfx_gong, "final": sfx_final,
}

# ---------------------------- MUSICA ----------------------------
def nota_pad(f, d, vol=1.0, det=0.004, a=1.2, r=1.5):
    n = int(SR * d); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * (1 + det) * t) + 0.4 * np.sin(2 * np.pi * f * (1 - det) * t) + 0.2 * np.sin(2 * np.pi * 2 * f * t)
    return x * vol * adsr(n, a, 0.0, 1.0, r)
def pluck(f, d, vol=1.0, tau=0.5):
    n = int(SR * d); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.15) + 0.15 * np.sin(2 * np.pi * 3 * f * t)
    return x * vol * np.exp(-t / tau) * adsr(n, 0.004, 0.0, 1.0, 0.05)
def bombo(vol=1.0):
    d = 0.35; n = int(SR * d); return sweep(120, 42, d, 0.4) * decay(n, 0.11) * vol
def caja(vol=1.0):
    d = 0.2; n = int(SR * d); return (bp(noise(d), 1200, 6000) * decay(n, 0.05) + 0.4 * np.sin(2 * np.pi * 190 * T(d)) * decay(n, 0.04)) * vol
def hat(vol=1.0):
    d = 0.06; n = int(SR * d); return bp(noise(d), 6000, 12000) * decay(n, 0.012) * vol

def render_musica(dur, escena, cola=4.0):
    """Renderiza dur + cola s y pliega la cola sobre el inicio para que el loop sea continuo."""
    n = int(SR * (dur + cola)); buf = np.zeros(n)
    escena(buf)
    base = buf[:int(SR * dur)].copy(); tail = buf[int(SR * dur):]
    base[:len(tail)] += tail
    return base

def poner(buf, t0, x):
    i = int(SR * t0)
    if i >= len(buf): return
    L = min(len(x), len(buf) - i); buf[i:i + L] += x[:L]

def musica_oficina():
    bpm = 62; beat = 60 / bpm; bar = 4 * beat; nb = 12; dur = nb * bar
    ac = [(45, [57, 60, 64]), (41, [53, 57, 60]), (38, [53, 57, 62]), (40, [52, 56, 59])]  # Am F Dm E
    pent = [69, 72, 74, 76, 79, 81]
    def esc(buf):
        for b in range(nb):
            raiz, acorde = ac[b % 4]; t0 = b * bar
            for m_ in acorde: poner(buf, t0, nota_pad(midi(m_), bar + 2.5, 0.16))
            poner(buf, t0, nota_pad(midi(raiz - 12 + 12), bar + 1.5, 0.22, a=0.3, r=1.2))
            if b % 4 == 3: poner(buf, t0 + bar * 0.5, nota_pad(midi(70), bar, 0.07, a=2.0, r=1.5))   # roce disonante (Bb)
            poner(buf, t0, bombo(0.5)); poner(buf, t0 + 2 * beat, bombo(0.32))
            for k in range(4): poner(buf, t0 + k * beat + beat / 2, hat(0.07))
            for k in range(2):
                if rng.random() < 0.8:
                    poner(buf, t0 + (0.5 + k * 1.75 + rng.random() * 0.5) * beat * 2, pluck(midi(int(rng.choice(pent))), 2.5, 0.2, tau=0.7))
    x = render_musica(dur, esc)
    return norm(x, 0.8)

def musica_campana():
    bpm = 100; beat = 60 / bpm; bar = 4 * beat; nb = 16; dur = nb * bar
    ac = [(38, [57, 62, 65]), (34, [53, 57, 62]), (31, [55, 58, 62]), (33, [57, 61, 64])]  # Dm Bb Gm A
    arp = lambda a: [a[0], a[1], a[2], a[1]]
    def esc(buf):
        for b in range(nb):
            raiz, acorde = ac[b % 4]; t0 = b * bar
            for m_ in acorde: poner(buf, t0, nota_pad(midi(m_), bar + 1.0, 0.1, a=0.4, r=0.8))
            for k in range(4):
                poner(buf, t0 + k * beat, bombo(0.7))
                if k in (1, 3): poner(buf, t0 + k * beat, caja(0.35))
            for k in range(8):
                poner(buf, t0 + k * beat / 2, pluck(midi(raiz), beat * 0.45, 0.28, tau=0.12))
                poner(buf, t0 + k * beat / 2 + beat / 4, hat(0.08))
            for k, m_ in enumerate(arp(acorde) * 2):
                if b >= 4: poner(buf, t0 + k * beat / 2, pluck(midi(m_ + 12), 0.6, 0.12, tau=0.25))
    x = render_musica(dur, esc, 3.0)
    return norm(x, 0.8)

def musica_destino():
    bpm = 48; beat = 60 / bpm; bar = 4 * beat; nb = 10; dur = nb * bar
    ac = [(38, [57, 62, 66, 69]), (43, [59, 62, 67, 71]), (36, [55, 60, 64, 67]), (38, [57, 62, 66, 73])]  # Dmaj add / Gmaj7 / Cmaj / D add
    esc_ = [62, 66, 69, 73, 74, 78]
    def esc(buf):
        for b in range(nb):
            raiz, acorde = ac[b % 4]; t0 = b * bar
            for m_ in acorde: poner(buf, t0, nota_pad(midi(m_), bar + 3.0, 0.14, det=0.006, a=2.2, r=2.5))
            poner(buf, t0, nota_pad(midi(raiz), bar + 2.0, 0.2, a=1.5, r=2.0))
            if rng.random() < 0.9:
                poner(buf, t0 + rng.random() * bar * 0.5, campana(midi(int(rng.choice(esc_)) + 12), 3.0, tau=0.9) * 0.1)
            if b % 2 == 1: poner(buf, t0 + bar * 0.5, campana(midi(int(rng.choice(esc_)) + 24), 3.0, tau=1.2) * 0.07)
    x = render_musica(dur, esc, 5.0)
    return norm(x, 0.75)

MUS = {"oficina": musica_oficina, "campana": musica_campana, "destino": musica_destino}

# ---------------------------- salida ----------------------------
def guardar(sub, nombre, x, ogg_q):
    d = os.path.join(AUD, sub); os.makedirs(d, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    wav = os.path.join(d, nombre + ".wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    if USAR_OGG:
        o = os.path.join(d, nombre + ".ogg")
        r = subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", str(ogg_q), o])
        if r.returncode == 0 and os.path.exists(o):
            os.remove(wav)
            return "assets/audio/%s/%s.ogg" % (sub, nombre)
    return "assets/audio/%s/%s.wav" % (sub, nombre)

man = {"sfx": {}, "musica": {}}
for k, fn in SFX.items(): man["sfx"][k] = guardar("sfx", k, fn(), 4)
for k, fn in MUS.items(): man["musica"][k] = guardar("musica", k, fn(), 3)
man["formato"] = "ogg" if USAR_OGG else "wav"
os.makedirs(AUD, exist_ok=True)
with open(os.path.join(AUD, "audio.json"), "w", encoding="utf8") as f: json.dump(man, f, indent=1)
tam = sum(os.path.getsize(os.path.join(RAIZ, p)) for g in ("sfx", "musica") for p in man[g].values())
print("audio generado (%s): %d efectos, %d pistas, %.0f KB" % (man["formato"], len(man["sfx"]), len(man["musica"]), tam / 1024))
