"""Vista previa de UNA cinematica: una captura por linea del guion (sprites, globos, caja de dialogo).

Uso:  npm run cine -- <id>      (por ejemplo: npm run cine -- inter_cafe)
Genera assets/preview/cine_<id>_NN.png y una hoja de contacto assets/preview/cine_<id>_hoja.png.
Reutiliza el renderizador de tools/preview_layout.py (sin volver a generar todas las pantallas).
"""
import json, os, subprocess, sys
try: sys.stdout.reconfigure(encoding="utf-8")   # consola de Windows (cp932/cp1252) no admite todas las letras
except Exception: pass
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
if len(sys.argv) < 2:
    print(__doc__); sys.exit(1)
cid = sys.argv[1]
OUTD = os.path.join(RAIZ, "assets", "preview"); os.makedirs(OUTD, exist_ok=True)
dump = os.path.join(OUTD, "_dump_cine.json")
# se reconstruye el juego en un archivo temporal (no se toca game.json)
tmp = os.path.join(OUTD, "_game_cine.json")
import shutil
shutil.copyfile(os.path.join(RAIZ, "game.json"), tmp)
b = subprocess.run(["node", os.path.join(RAIZ, "tools", "build", "build.js"), "--destino=" + tmp], capture_output=True, text=True, encoding="utf8", cwd=RAIZ)
if b.returncode != 0:
    print(b.stdout, b.stderr); sys.exit(1)
env = dict(os.environ, DUMP_GAME=tmp)
if cid.startswith("@"): env["DUMP_MODO"] = cid[1:]      # p. ej. npm run cine -- @nueva (nueva partida y modos de juego)
else: env["DUMP_CINE_ID"] = cid
r = subprocess.run(["node", os.path.join(RAIZ, "tools", "dump_screens.js"), dump], capture_output=True, text=True, encoding="utf8", env=env)
if r.returncode != 0:
    print(r.stdout, r.stderr); sys.exit(1)
# se reutilizan las definiciones y el render de preview_layout.py (solo hasta el bucle principal, sin volver a correr el volcado)
fuente = open(os.path.join(RAIZ, "tools", "preview_layout.py"), encoding="utf8").read()
ini = fuente.index("# ---- 1. LAYOUT"); b = fuente.index("game = json.load("); fin = fuente.index("total = 0")
g = {"__file__": os.path.join(RAIZ, "tools", "preview_layout.py"), "__name__": "preview"}
exec(fuente[:ini], g)                       # imports, RAIZ y OUT
g["D"] = json.load(open(dump, encoding="utf8"))
exec(fuente[b:fin], g)                      # definiciones (game, DEFS, W, H) y render()
nombres = list(g["D"]["snaps"].keys())
for n in nombres:
    av = g["render"](n, g["D"]["snaps"][n])
    print("%-28s %s" % (n, "OK" if not av else "; ".join(av[:3])))
from PIL import Image
W, H = g["W"], g["H"]; esc = 0.3; tw, th = int(W * esc), int(H * esc); cols = 6; filas = (len(nombres) + cols - 1) // cols
hoja = Image.new("RGB", (cols * (tw + 8) + 8, filas * (th + 8) + 8), (30, 30, 30))
for k, n in enumerate(nombres):
    hoja.paste(Image.open(os.path.join(OUTD, n + ".png")).resize((tw, th), Image.LANCZOS), (8 + (k % cols) * (tw + 8), 8 + (k // cols) * (th + 8)))
hoja.save(os.path.join(OUTD, "cine_%s_hoja.png" % cid))
for f in (tmp, dump):
    try: os.remove(f)
    except OSError: pass
print("capturas:", len(nombres), "| hoja:", os.path.join(OUTD, "cine_%s_hoja.png" % cid))
