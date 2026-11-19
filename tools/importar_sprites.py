"""Importa sprites de personajes (sprites/NN-nombre.png) como retrato del juego (la carta es un marco comun).

Uso:  python tools/importar_sprites.py monica [otro_id ...]     (el id es el del personaje en src/historia/personajes.json)
      python tools/importar_sprites.py monica=08-monica          (id=prefijo del archivo en sprites/, si no coincide)
      python tools/importar_sprites.py oscar_alumno=Oscar.png    (id=nombre de archivo EXACTO si termina en .png)
      python tools/importar_sprites.py --todos [--solo-retrato] [--optimizar]
        importa TODOS los sprites de sprites/unidades_academicas.json; el id es el nombre del archivo sin el numero
        (01-alejandro.png -> alejandro) y, si se repite, lleva el numero (19-jose.png -> jose_19).
Escribe assets/placeholder/retratos/<id>.png (480x480), con el personaje pegado abajo y fondo transparente. --optimizar reduce los PNG a 256 colores (el estilo plano casi no se nota).
Despues: npm run build (assets.js los registra como animaciones).
"""
import os, sys, glob, re, json
from PIL import Image

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

def buscar(clave):
    exacto = os.path.join(RAIZ, "sprites", clave)          # nombre de archivo exacto (p. ej. id=Oscar.png)
    if clave.lower().endswith(".png") and os.path.exists(exacto): return exacto
    for patron in ("*-%s.png" % clave, "%s.png" % clave, "%s*.png" % clave):
        r = sorted(glob.glob(os.path.join(RAIZ, "sprites", patron)))
        if r: return r[0]
    return None

def cuadrado(im, lado, margen=0.04):
    bb = im.getbbox() or (0, 0, im.width, im.height)
    im = im.crop(bb)
    k = lado * (1 - 2 * margen) / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    lienzo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    lienzo.alpha_composite(im, ((lado - im.width) // 2, lado - im.height - round(lado * margen)))   # pegado abajo
    return lienzo

def ids_todos():
    """id -> archivo, para todos los sprites del directorio (id = nombre sin numero; con numero si se repite)."""
    j = json.load(open(os.path.join(RAIZ, "sprites", "unidades_academicas.json"), encoding="utf8"))
    arch = [p["sprite"] for u in j["unidades_academicas"] for p in u["personas"] if p.get("sprite")]
    base = {a: re.sub(r"^\d+-", "", a[:-4]) for a in arch}
    cuenta = {}
    for b in base.values(): cuenta[b] = cuenta.get(b, 0) + 1
    return {(b if cuenta[b] == 1 else "%s_%s" % (b, a.split("-")[0])): os.path.join(RAIZ, "sprites", a) for a, b in base.items()}

def guardar(im, ruta, optimizar):
    if optimizar: im = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    im.save(ruta, optimize=True)

args = [a for a in sys.argv[1:] if not a.startswith("--")]
solo_retrato, optimizar = "--solo-retrato" in sys.argv, "--optimizar" in sys.argv
trabajos = []
if "--todos" in sys.argv: trabajos = sorted(ids_todos().items())
for arg in args:
    pid, _, clave = arg.partition("=")
    f = buscar(clave or pid)
    if not f: print("NO ENCONTRADO sprite para", arg); continue
    trabajos.append((pid, f))
for pid, f in trabajos:
    im = Image.open(f).convert("RGBA")
    for sub, lado in (("retratos", 480),):       # la carta es un marco comun por tipo de personaje (gen_placeholders.py marcos)
        d = os.path.join(RAIZ, "assets", "placeholder", sub); os.makedirs(d, exist_ok=True)
        guardar(cuadrado(im, lado), os.path.join(d, pid + ".png"), optimizar)
    print("ok", pid, "<-", os.path.relpath(f, RAIZ))
