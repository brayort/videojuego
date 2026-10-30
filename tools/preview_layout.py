"""Vista previa simulada de cada pantalla (no hace falta abrir GDevelop).

1. Lee el LAYOUT compartido (src/js/00_comun.js, espejo en src/layout.json) y comprueba que el espejo esta al dia.
2. Ejecuta el motor real con tools/dump_screens.js (objetos simulados que registran posicion, tamano, texto,
   animacion, color y opacidad) y obtiene una "foto" JSON por pantalla.
3. Compone cada foto con Pillow (sprites reales de assets/placeholder, fuentes reales de assets/fonts) en
   assets/preview/<pantalla>.png y hojas de contacto assets/preview/_hoja_N.png.
4. Avisa de textos menores a 22 px (titulos < 40), elementos fuera de pantalla, textos que se salen de su caja
   o de su panel, y textos que se solapan.

Uso:  python tools/preview_layout.py        (despues de node src/build.js y node src/assets_demo.js)
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(RAIZ, "assets", "preview")
os.makedirs(OUT, exist_ok=True)

# ---- 1. LAYOUT compartido ----
src = open(os.path.join(RAIZ, "src", "js", "00_comun.js"), encoding="utf8").read()
LAYOUT = json.loads(re.search(r"/\*LAYOUT:BEGIN\*/(.*?)/\*LAYOUT:END\*/", src, re.S).group(1))
espejo = os.path.join(RAIZ, "src", "layout.json")
if not os.path.exists(espejo) or json.load(open(espejo, encoding="utf8")) != LAYOUT:
    print("AVISO: src/layout.json no coincide con el LAYOUT de 00_comun.js (corre node src/build.js)")

# ---- 2. fotos del motor ----
dump = os.path.join(OUT, "_dump.json")
r = subprocess.run(["node", os.path.join(RAIZ, "tools", "dump_screens.js"), dump], capture_output=True, text=True, encoding="utf8")
if r.returncode != 0:
    print(r.stdout, r.stderr); sys.exit(1)
D = json.load(open(dump, encoding="utf8"))
game = json.load(open(os.path.join(RAIZ, "game.json"), encoding="utf8"))
DEFS = {l["name"]: {o["name"]: o for o in l["objects"]} for l in game["layouts"]}
W, H = D["W"], D["H"]

_img, _font = {}, {}
def imagen(escena, nombre, anim):
    d = DEFS[escena][nombre]
    an = next((a for a in d.get("animations", []) if a["name"] == anim), None) or (d.get("animations") or [None])[0]
    if not an: return None
    f = an["directions"][0]["sprites"][0]["image"]
    if f not in _img: _img[f] = Image.open(os.path.join(RAIZ, f)).convert("RGBA")
    return _img[f]
def fuente(path, size):
    k = (path, int(round(size)))
    if k not in _font: _font[k] = ImageFont.truetype(os.path.join(RAIZ, path), int(round(size)))
    return _font[k]

def ajustar_lineas(texto, f, ancho):
    out = []
    for par in texto.split("\n"):
        if not par: out.append(""); continue
        cur = ""
        for pal in par.split(" "):
            prueba = pal if not cur else cur + " " + pal
            if not cur or f.getlength(prueba) <= ancho: cur = prueba
            else: out.append(cur); cur = pal
        out.append(cur)
    return out

def render(nombre, snap):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    avisos, cajas, paneles = [], [], []
    objs = sorted(snap["objs"], key=lambda o: (o["z"], o["o"]))
    for o in objs:
        if o["h_"] or o["op"] <= 0: continue
        if o["t"] == "sprite":
            src_im = imagen(o["escena"], o["n"], o["anim"])
            if src_im is None: continue
            w = int(round(o["w"] if o["w"] is not None else src_im.width)); h = int(round(o["h"] if o["h"] is not None else src_im.height))
            if w < 1 or h < 1: continue
            s = src_im.resize((w, h), Image.NEAREST if o["n"] == "Panel" else Image.LANCZOS)
            if o["op"] < 255:
                a = s.getchannel("A").point(lambda v: int(v * o["op"] / 255)); s.putalpha(a)
            x, y = o["x"], o["y"]
            if o["a"]:
                cx, cy = x + w / 2, y + h / 2
                s = s.rotate(-o["a"], expand=True, resample=Image.BICUBIC); x, y = cx - s.width / 2, cy - s.height / 2
            im.alpha_composite(s, (int(round(x)), int(round(y)))) if 0 <= x < W and 0 <= y < H and x + s.width <= W and y + s.height <= H else paste_clip(im, s, int(round(x)), int(round(y)))
            if o["n"] == "Panel": paneles.append(o)
            if o["n"] not in ("Fondo", "Flash") and not o["a"]:
                if o["x"] < -1 or o["y"] < -1 or o["x"] + w > W + 1 or o["y"] + h > H + 1:
                    avisos.append("sprite fuera de pantalla: %s %s (%d,%d %dx%d)" % (o["n"], o["anim"], o["x"], o["y"], w, h))
        else:
            if not o["txt"].strip(): continue
            f = fuente(o["font"], o["size"]); asc, desc = f.getmetrics(); lh = asc + desc
            ancho = o["wrap"] or 0
            lines = ajustar_lineas(o["txt"], f, ancho) if ancho else o["txt"].split("\n")
            col = tuple(int(v) for v in o["col"].split(";"))
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
            x0, y0, x1, y1 = 1e9, 1e9, -1e9, -1e9
            for i, ln in enumerate(lines):
                lw = f.getlength(ln)
                dx = (ancho - lw) / 2 if (ancho and o["al"] == "center") else (ancho - lw if ancho and o["al"] == "right" else 0)
                d.text((o["x"] + dx, o["y"] + i * lh), ln, font=f, fill=col + (int(255 * o["op"] / 255),))
                x0 = min(x0, o["x"] + dx); x1 = max(x1, o["x"] + dx + lw);
                if ancho and lw > ancho + 2: avisos.append("linea mas ancha que su caja (%d > %d): %r" % (lw, ancho, ln[:40]))
            y0, y1 = o["y"], o["y"] + len(lines) * lh
            im.alpha_composite(layer)
            cajas.append((o, (x0, y0, x1, y1)))
            minimo = 40 if o["n"] == "TxtTitulo" else 22
            if o["size"] < minimo: avisos.append("texto pequeno (%s px < %d): %r" % (o["size"], minimo, o["txt"][:30]))
            if x0 < -1 or y0 < -1 or x1 > W + 1 or y1 > H + 1: avisos.append("texto fuera de pantalla: %r (%d,%d,%d,%d)" % (o["txt"][:30], x0, y0, x1, y1))
    # texto que se sale del panel donde empieza
    for o, (x0, y0, x1, y1) in cajas:
        cont = [p for p in paneles if p["op"] >= 150 and p["z"] <= o["z"] and p["x"] <= o["x"] + 2 and p["y"] <= o["y"] + 2 and p["x"] + (p["w"] or 0) >= o["x"] + 2 and p["y"] + (p["h"] or 0) >= o["y"] + 2 and (p["w"] or 0) * (p["h"] or 0) < W * H * 0.5]
        if not cont: continue
        p = max(cont, key=lambda q: (q["z"], q["o"]))
        if p["w"] < 6 or p["h"] < 6: continue
        if x1 > p["x"] + p["w"] + 3 or y1 > p["y"] + p["h"] + 3:
            avisos.append("texto desborda su panel: %r texto(%d,%d,%d,%d) panel(%d,%d,%d,%d)" % (o["txt"][:30], x0, y0, x1, y1, p["x"], p["y"], p["x"] + p["w"], p["y"] + p["h"]))
    # solapes de texto
    for i in range(len(cajas)):
        for j in range(i + 1, len(cajas)):
            a, b = cajas[i][1], cajas[j][1]
            ix = min(a[2], b[2]) - max(a[0], b[0]); iy = min(a[3], b[3]) - max(a[1], b[1])
            if ix > 3 and iy > 4 and abs(cajas[i][0]["z"] - cajas[j][0]["z"]) < 100:
                avisos.append("textos solapados: %r y %r (%dx%d px)" % (cajas[i][0]["txt"][:24], cajas[j][0]["txt"][:24], ix, iy))
    im.convert("RGB").save(os.path.join(OUT, nombre + ".png"))
    return avisos

def paste_clip(im, s, x, y):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); layer.paste(s, (x, y)); im.alpha_composite(layer)

total = 0
nombres = list(D["snaps"].keys())
for nombre in nombres:
    s = D["snaps"][nombre]
    av = render(nombre, s)
    if nombre == "juego_vuelo": av = [a for a in av if "fuera de pantalla" not in a]
    total += len(av)
    print("%-28s objetos:%4d  %s" % (nombre, s["nobjs"], "OK" if not av else "%d aviso(s)" % len(av)))
    for a in av[:12]: print("     -", a)

# hojas de contacto (4 por hoja)
esc = 0.42; tw, th = int(W * esc), int(H * esc)
for n in range(0, len(nombres), 4):
    hoja = Image.new("RGB", (tw * 4 + 10 * 5, th + 20), (30, 30, 30))
    for k, nombre in enumerate(nombres[n:n + 4]):
        hoja.paste(Image.open(os.path.join(OUT, nombre + ".png")).resize((tw, th), Image.LANCZOS), (10 + k * (tw + 10), 10))
    hoja.save(os.path.join(OUT, "_hoja_%d.png" % (n // 4 + 1)))
print("capturas en", OUT, "| avisos totales:", total)

# ---- ventanas de otros tamanos: resolucion logica fija 720x1280 con letterbox centrado ----
for (vw, vh) in ((1920, 1080), (390, 844)):
    env = dict(os.environ, RES_W=str(vw), RES_H=str(vh))
    alt = os.path.join(OUT, "_dump_%dx%d.json" % (vw, vh))
    subprocess.run(["node", os.path.join(RAIZ, "tools", "dump_screens.js"), alt], capture_output=True, text=True, env=env, check=True)
    igual = json.load(open(alt, encoding="utf8"))["snaps"] == D["snaps"]
    os.remove(alt)
    print("ventana %dx%d: layout %s del tamano de ventana" % (vw, vh, "independiente" if igual else "DEPENDE (error)"))
    esc2 = min(vw / W, vh / H); lw, lh2 = int(W * esc2), int(H * esc2)
    lienzo = Image.new("RGB", (vw, vh), (0, 0, 0))
    for k, nom in enumerate(("juego_arrastre_der", "menu")):
        pass
    lienzo.paste(Image.open(os.path.join(OUT, "juego_carta.png")).resize((lw, lh2), Image.LANCZOS), ((vw - lw) // 2, (vh - lh2) // 2))
    lienzo.save(os.path.join(OUT, "_ventana_%dx%d.png" % (vw, vh)))
