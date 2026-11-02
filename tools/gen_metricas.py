"""Mide el avance real de cada caracter en las fuentes del juego y lo guarda en LAYOUT.txt.metricas
(src/js/00_comun.js). El motor (U.anchoEm) usa esa tabla para envolver, centrar y paginar el texto
exactamente como se dibuja. Correr cada vez que cambies una fuente en LAYOUT.fuente:

    python tools/gen_metricas.py      (y luego npm run build)
"""
import json, os, re
from fontTools.ttLib import TTFont

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
P = os.path.join(RAIZ, "src", "js", "00_comun.js")
src = open(P, encoding="utf8").read()
m = re.search(r"/\*LAYOUT:BEGIN\*/([\s\S]*?)/\*LAYOUT:END\*/", src)
L = json.loads(m.group(1))

CHARS = "".join(chr(c) for c in range(32, 127)) + "áéíóúÁÉÍÓÚñÑüÜ¿¡«»·—–“”‘’…ºª°€×÷±"


def medir(ruta):
    f = TTFont(os.path.join(RAIZ, ruta))
    upm, cmap, hmtx = f["head"].unitsPerEm, f.getBestCmap(), f["hmtx"]
    w = []
    for ch in CHARS:
        g = cmap.get(ord(ch))
        w.append(round(hmtx[g][0] / upm, 3) if g else 0)
    return {"chars": CHARS, "w": w}


met = {k: medir(L["fuente"][k]) for k in ("cuerpo", "titulo")}
nuevo = json.dumps(met, ensure_ascii=False, separators=(",", ":"))
bloque = m.group(1)
if '"metricas":' in bloque:
    bloque = re.sub(r'"metricas": \{.*?\]\}\}', '"metricas": ' + nuevo, bloque, flags=re.S)
else:
    bloque = bloque.replace('"txt": {', '"txt": {"metricas": ' + nuevo + ",\n    ", 1)
json.loads(bloque)
open(P, "w", encoding="utf8").write(src.replace(m.group(1), bloque))
faltan = {k: "".join(c for c, x in zip(CHARS, met[k]["w"]) if not x) for k in met}
print("metricas actualizadas:", {k: L["fuente"][k] for k in met}, "| sin glifo:", faltan)
