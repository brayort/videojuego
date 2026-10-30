# Genera sprites provisionales en assets/placeholder/ (Pillow). Idempotente.
import os, sys, colorsys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "placeholder"))
F = lambda s, b=True: ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf" if b else "C:/Windows/Fonts/arial.ttf", s)
def out(sub, name, im):
    d = os.path.join(ROOT, sub); os.makedirs(d, exist_ok=True); im.save(os.path.join(d, name + ".png"))
def ctext(d, xy, t, font, fill, stroke=None):
    d.text(xy, t, font=font, fill=fill, anchor="mm", stroke_width=3 if stroke else 0, stroke_fill=stroke)

# id: (iniciales, nombre, rasgo)
P = {
 "rector":("AB","Rector Bañuelos","corbata"),"lider_sindical":("LI","Leonel Ibarra","chaleco"),
 "estudiante":("DR","Dafne Robles","panuelo"),"consejera":("MQ","Marisol Quintero","carpeta"),
 "tesorero":("EL","Evaristo Landeros","calculadora"),"profesora_sni":("IC","Dra. Carrillo","lentes"),
 "reportero":("CA","Chuy Armenta","gorra"),"empresario":("GV","Gonzalo Villaseñor","corbata"),
 "diputado":("RS","Ramiro Sandoval","corbata"),"desconocido":("??","Voz desconocida","capucha"),
 "madre_familia":("RC","Doña Rosario","rebozo"),"coordinador":("TM","Tadeo Mejía","taza"),
 "secretaria":("LN","Lupita Navarro","lentes"),"porro":("CH","El Chato","sudadera"),
 "abogada":("BO","Lic. Ochoa","portafolio"),"emisario":("SF","Sebastián Ferreira","corbata"),
 "candidato":("AQ","Dr. Quezada","corbata"),"auditora":("NA","C.P. Avendaño","carpeta"),
 "periodista":("KM","Karla Montes","libreta"),"proveedor":("CR","Cuauhtémoc Reyes","portafolio"),
 "predecesor":("ED","Ex director","caja"),"idealista":("DE","Mtro. Esquivel","mochila"),
 "hijo_rector":("EB","Mtro. Emilio","corbata"),"decano":("FM","Fausto Meléndez","barba"),
 "investigador":("MT","Dr. Tello","lentes"),"reclutado":("IZ","Iván Zúñiga","sudadera"),
 "buscadora":("CM","Doña Chayo","sombrero"),"wixarika":("NC","Nieves de la Cruz","sombrero"),
 "nayeri":("TV","Tomás Valdez","sombrero"),"proteccion":("HC","Ing. Cortés","casco"),
 "diversidad":("AM","Andrés Mora","arcoiris"),"hotelera":("MB","Marcela Beltrán","sombrero"),
 "egresado":("JR","Jorge Ramos","gorra"),"psicologa":("CV","Psic. Vera","libreta"),
 "planeacion":("GP","Lic. Pineda","corbata"),"fiscal":("AR","Fiscal Rosales","carpeta"),
 "alumna":("RP","Regina Palomino","panuelo"),"default":("?","Personaje","")}
ids = list(P)
import re, json
_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "js", "00_comun.js"), encoding="utf8").read()
LAYOUT = json.loads(re.search(r"/\*LAYOUT:BEGIN\*/(.*?)/\*LAYOUT:END\*/", _src, re.S).group(1))
PAL = {k: tuple(int(v[j:j+2], 16) for j in (1, 3, 5)) for k, v in LAYOUT["col"].items()}
def ss(w, h, fn, k=4):
    """Dibuja a k veces el tamano y reduce (bordes suaves)."""
    im = Image.new("RGBA", (w*k, h*k), (0,0,0,0)); fn(ImageDraw.Draw(im), k)
    return im.resize((w, h), Image.LANCZOS)
def color(i):
    h = (i * 0.618034) % 1.0
    r, g, b = colorsys.hsv_to_rgb(h, 0.45, 0.80)
    return (int(r*255), int(g*255), int(b*255))
def dark(c, k=0.6): return tuple(int(x*k) for x in c)

def retrato(i, pid):
    ini, nom, rasgo = P[pid]; c = color(i); s = 480
    im = Image.new("RGBA", (s, s), (0,0,0,0)); d = ImageDraw.Draw(im)
    skin = (232, 190, 150)
    d.rounded_rectangle((60, 290, 420, 520), 90, fill=c, outline=dark(c), width=6)
    d.rectangle((210, 250, 270, 310), fill=skin)
    d.ellipse((150, 70, 330, 270), fill=skin, outline=dark(skin, .6), width=5)
    d.ellipse((200, 150, 214, 164), fill=(30,30,30)); d.ellipse((266, 150, 280, 164), fill=(30,30,30))
    d.arc((210, 190, 270, 235), 20, 160, fill=(120,40,40), width=5)
    k = dark(c, .5)
    if rasgo == "corbata":
        d.polygon([(228,300),(252,300),(260,340),(240,430),(220,340)], fill=(170,30,40))
    elif rasgo == "lentes":
        d.ellipse((190,140,228,178), outline=(20,20,20), width=5); d.ellipse((252,140,290,178), outline=(20,20,20), width=5); d.line((228,158,252,158), fill=(20,20,20), width=5)
    elif rasgo == "sombrero":
        d.ellipse((110,95,370,150), fill=(190,150,70), outline=(110,80,30), width=5); d.pieslice((170,30,310,150), 180, 360, fill=(190,150,70), outline=(110,80,30), width=5)
    elif rasgo == "panuelo":
        d.polygon([(190,285),(290,285),(240,350)], fill=(40,150,70))
    elif rasgo == "gorra":
        d.pieslice((150,50,330,200), 180, 360, fill=k); d.rectangle((150,125,380,140), fill=k)
    elif rasgo == "casco":
        d.pieslice((140,45,340,215), 180, 360, fill=(240,200,30), outline=(150,120,10), width=5); d.rectangle((135,128,345,142), fill=(240,200,30))
    elif rasgo == "capucha":
        d.ellipse((130,50,350,290), fill=(35,35,45)); d.ellipse((180,110,300,270), fill=(10,10,15))
    elif rasgo == "rebozo":
        d.polygon([(70,300),(410,300),(380,500),(100,500)], fill=(150,60,70)); d.pieslice((140,60,340,230), 180, 360, fill=(150,60,70))
    elif rasgo == "barba":
        d.pieslice((170,190,310,300), 0, 180, fill=(220,220,220)); d.pieslice((150,60,330,170), 180, 360, fill=(220,220,220))
    elif rasgo == "chaleco":
        d.rectangle((120,300,200,520), fill=(200,60,40)); d.rectangle((280,300,360,520), fill=(200,60,40))
    elif rasgo == "arcoiris":
        for j, col in enumerate([(220,40,40),(240,160,30),(240,230,40),(50,170,70),(50,100,220),(130,60,190)]): d.rectangle((300, 320+j*8, 370, 328+j*8), fill=col)
    elif rasgo == "carpeta":
        d.rectangle((300,380,420,500), fill=(60,90,150), outline=(20,40,80), width=4)
    elif rasgo == "portafolio":
        d.rounded_rectangle((300,430,430,510), 12, fill=(40,30,30), outline=(0,0,0), width=4)
    elif rasgo == "calculadora":
        d.rounded_rectangle((320,400,420,510), 8, fill=(70,70,70)); d.rectangle((330,410,410,430), fill=(150,220,150))
    elif rasgo == "taza":
        d.rectangle((330,430,400,500), fill=(240,240,240), outline=(100,100,100), width=4)
    elif rasgo == "libreta":
        d.rectangle((310,400,410,510), fill=(250,250,200), outline=(120,120,60), width=4)
    elif rasgo == "caja":
        d.rectangle((110,400,370,520), fill=(170,130,80), outline=(100,70,30), width=5)
    elif rasgo == "mochila":
        d.rounded_rectangle((60,300,110,470), 20, fill=k); d.rounded_rectangle((370,300,420,470), 20, fill=k)
    elif rasgo == "sudadera":
        d.pieslice((150,60,330,200), 180, 360, fill=k); d.ellipse((190,300,290,360), fill=k)
    ctext(d, (240, 430), ini, F(110), (255,255,255), stroke=dark(c, .35))
    ctext(d, (240, 40), nom, F(28), (255,255,255), stroke=(0,0,0))
    out("retratos", pid, im)


def carta(i, pid):
    c = color(i) if pid != "carta" else (150,150,150)
    w = h = 560
    def f(d, k):
        d.rounded_rectangle((6*k,6*k,(w-6)*k,(h-6)*k), 40*k, fill=PAL["crema"], outline=PAL["guinda"], width=12*k)
        d.rounded_rectangle((26*k,26*k,(w-26)*k,(h-26)*k), 26*k, outline=PAL["dorado"], width=4*k)
        d.rounded_rectangle((34*k,34*k,(w-34)*k,(h-34)*k), 20*k, outline=c, width=2*k)
        for cx, cy in ((46,46),(w-46,46),(46,h-46),(w-46,h-46)):
            d.ellipse(((cx-7)*k,(cy-7)*k,(cx+7)*k,(cy+7)*k), fill=PAL["dorado"])
    out("cartas", pid, ss(w, h, f))

def lerp(a, b, t): return tuple(int(a[k]*(1-t)+b[k]*t) for k in range(3))
def grad(w, h, c1, c2):
    im = Image.new("RGB", (w, h)); px = ImageDraw.Draw(im)
    for y in range(h): px.line((0,y,w,y), fill=lerp(c1, c2, y/(h-1)))
    return im.convert("RGBA")
# nombre: (titulo, color arriba, color abajo)
G, GO, AZ, NE = PAL["guinda"], PAL["guinda_osc"], PAL["azul"], PAL["negro"]
FON = {"juego":("Oficina",GO,lerp(GO,G,.7)),"carta":("Oficina del director",GO,lerp(GO,G,.7)),
 "menu":("Director UAN",NE,lerp(GO,G,.9)),"logros":("Logros",GO,lerp(GO,AZ,.45)),
 "informe":("Informe semestral",lerp(AZ,NE,.5),GO),"fin":("Fin de la gestión",NE,lerp(GO,G,.5)),
 "epilogo":("Epílogo",lerp(AZ,NE,.4),lerp(GO,G,.8)),"destino":("Destino de la UAN",lerp(AZ,NE,.3),lerp(G,PAL["dorado"],.35)),
 "sucesion":("Sucesión",GO,lerp(GO,AZ,.4)),"eleccion":("Día de la elección",lerp(AZ,NE,.4),lerp(AZ,GO,.5)),
 "pausa":("Pausa",NE,lerp(NE,GO,.4)),
 "mini_presupuesto":("Presupuesto",lerp(AZ,NE,.5),lerp(GO,AZ,.35)),"mini_prensa":("Rueda de prensa",NE,lerp(GO,AZ,.3)),
 "mini_plagio":("Cacería de plagio",GO,lerp(GO,PAL["ambar"],.25)),"mini_consejo":("Consejo universitario",GO,lerp(GO,G,.6))}
def fondo(n):
    t, a, b = FON[n]; im = grad(720, 1280, a, b)
    ov = Image.new("RGBA", (720,1280), (0,0,0,0)); od = ImageDraw.Draw(ov)
    od.rounded_rectangle((14,14,706,1266), 30, outline=PAL["dorado"]+(70,), width=3)
    od.rounded_rectangle((24,24,696,1256), 24, outline=PAL["dorado"]+(30,), width=2)
    for k in range(-1280, 720, 64): od.line((k,1280,k+1280,0), fill=(255,255,255,7), width=2)
    ctext(od, (360, 640), t, F(56), (255,255,255,26))
    ctext(od, (360, 700), "(fondo provisional)", F(26, False), (255,255,255,22))
    out("fondos", n, Image.alpha_composite(im, ov))

def icono(n):
    k = 4; s = 48
    m = Image.new("L", (s*k, s*k), 0); d = ImageDraw.Draw(m); Wt = 255
    def P(*pts): return [(x*k, y*k) for x, y in pts]
    if n=="academico":
        d.polygon(P((24,8),(46,18),(24,28),(2,18)), fill=Wt); d.rectangle((12*k,24*k,36*k,34*k), fill=Wt); d.line(P((44,19),(44,34)), fill=Wt, width=3*k)
    elif n=="estudiantes":
        for x in (10,24,38): d.ellipse(((x-6)*k,10*k,(x+6)*k,22*k), fill=Wt); d.pieslice(((x-9)*k,24*k,(x+9)*k,48*k), 180, 360, fill=Wt)
    elif n=="finanzas":
        d.ellipse((3*k,3*k,45*k,45*k), fill=Wt)
    elif n=="politica":
        d.polygon(P((24,3),(46,15),(2,15)), fill=Wt)
        for x in (8,19,30): d.rectangle((x*k,18*k,(x+7)*k,36*k), fill=Wt)
        d.rectangle((3*k,38*k,45*k,44*k), fill=Wt)
    elif n=="subir":
        d.polygon(P((24,3),(44,26),(32,26),(32,45),(16,45),(16,26),(4,26)), fill=Wt)
    elif n=="bajar":
        d.polygon(P((24,45),(44,22),(32,22),(32,3),(16,3),(16,22),(4,22)), fill=Wt)
    m = m.resize((s, s), Image.LANCZOS)
    col = {"subir":(70,210,100),"bajar":(235,70,60),"finanzas":(240,200,40)}.get(n, (255,255,255))
    halo = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(.6))
    im = Image.new("RGBA", (s, s), (0,0,0,0))
    im.paste(Image.new("RGBA", (s, s), PAL["negro"]+(255,)), (0,0), halo)
    im.paste(Image.new("RGBA", (s, s), col+(255,)), (0,0), m)
    if n == "finanzas":
        d2 = ImageDraw.Draw(im); ctext(d2, (24,24), "$", F(30), (120,80,0))
    out("iconos", n, im)

# ---- UI: paneles de color plano, iconos y puntos ----
def panel(n, c): out("ui", "panel_" + n, Image.new("RGBA", (8, 8), c + (255,)))
def iconoui(n):
    import math
    s = 48
    def P(k, *pts): return [(x*k, y*k) for x, y in pts]
    def f(d, k):
        C, D = PAL["crema"], PAL["dorado"]
        if n == "flecha_izq": d.polygon(P(k,(30,6),(10,24),(30,42),(30,32),(40,32),(40,16),(30,16)), fill=C)
        elif n == "flecha_der": d.polygon(P(k,(18,6),(38,24),(18,42),(18,32),(8,32),(8,16),(18,16)), fill=C)
        elif n == "flecha_arriba": d.polygon(P(k,(24,5),(43,26),(31,26),(31,43),(17,43),(17,26),(5,26)), fill=PAL["dorado_claro"])
        elif n in ("estrella", "estrella_vacia"):
            pts = [(24+(22 if j%2==0 else 9)*math.sin(j*math.pi/5), 25-(22 if j%2==0 else 9)*math.cos(j*math.pi/5)) for j in range(10)]
            if n == "estrella": d.polygon(P(k,*pts), fill=D, outline=PAL["guinda_osc"])
            else: d.polygon(P(k,*pts), outline=PAL["gris"], width=3*k)
        elif n == "corazon":
            d.ellipse((6*k,8*k,26*k,28*k), fill=(222,72,92)); d.ellipse((22*k,8*k,42*k,28*k), fill=(222,72,92)); d.polygon(P(k,(7,22),(41,22),(24,43)), fill=(222,72,92))
        elif n == "cruz":
            d.line(P(k,(10,10),(38,38)), fill=PAL["gris"], width=7*k); d.line(P(k,(38,10),(10,38)), fill=PAL["gris"], width=7*k)
        elif n == "candado":
            d.arc((14*k,6*k,34*k,28*k), 180, 360, fill=PAL["gris"], width=5*k); d.rounded_rectangle((10*k,22*k,38*k,43*k), 4*k, fill=PAL["gris"])
        elif n == "punto_crema": d.ellipse((2*k,2*k,46*k,46*k), fill=PAL["crema"], outline=PAL["guinda_osc"], width=3*k)
        elif n == "punto_dorado": d.ellipse((2*k,2*k,46*k,46*k), fill=PAL["dorado"], outline=PAL["guinda_osc"], width=3*k)
    out("ui", "icono_" + n, ss(s, s, f))

SOLO = sys.argv[1:]   # "particulas": regenera solo las particulas
if not SOLO:
    for i, pid in enumerate(ids): retrato(i, pid); carta(i, pid)
    carta(0, "carta")
    for n in FON: fondo(n)
    for n in ("academico","estudiantes","finanzas","politica","subir","bajar"): icono(n)
    for n, c in PAL.items(): panel(n, c)
    for n in ("flecha_izq","flecha_der","flecha_arriba","estrella","estrella_vacia","corazon","cruz","candado","punto_crema","punto_dorado"): iconoui(n)
    out("efectos", "flash_blanco", Image.new("RGBA",(720,1280),(255,255,255,255)))
    out("efectos", "flash_bueno", Image.new("RGBA",(720,1280),(230,255,200,255)))
    out("efectos", "flash_malo", Image.new("RGBA",(720,1280),(150,20,20,255)))
    def boton(n, fill, brd):
        def f(d, k): d.rounded_rectangle((3*k,3*k,557*k,93*k), 26*k, fill=fill, outline=brd, width=6*k)
        out("ui", n, ss(560, 96, f))
    boton("boton_normal",PAL["guinda"],PAL["dorado"]); boton("boton_activo",PAL["vino"],PAL["dorado_claro"]); boton("boton_presionado",PAL["guinda_osc"],PAL["crema"])
    def frag(n, brd, sello=None):
        w, h = 620, 112
        im = Image.new("RGBA",(w,h),(0,0,0,0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((2,2,w-2,h-2), 12, fill=PAL["crema"], outline=brd, width=5)
        for y in (34,60,86): d.line((14,y+8,w-14,y+8), fill=(215,205,180), width=2)
        if sello=="bien": d.rounded_rectangle((w-150,h-48,w-14,h-12), 6, outline=PAL["verde"], width=4); ctext(d,(w-82,h-30),"COPIA",F(24),PAL["verde"])
        if sello=="mal": d.line((20,20,w-20,h-20), fill=PAL["rojo"], width=7); d.line((20,h-20,w-20,20), fill=PAL["rojo"], width=7)
        out("ui", n, im)
    frag("fragmento", PAL["gris"]); frag("fragmento_bien",PAL["verde"],"bien"); frag("fragmento_mal",PAL["rojo"],"mal")
# sombra de la carta: mismo tamano (560x560) y mismo contorno que la carta; el motor la mueve con ella (+8,+12)
def sombra():
    def f(d, k): d.rounded_rectangle((6*k, 6*k, 554*k, 554*k), 40*k, fill=(0, 0, 0, 110))
    out("ui", "sombra_carta", ss(560, 560, f))
sombra()

# ---- particulas del pool propio (objeto "Particula"; una animacion por forma) ----
def particula(n, w, h, fn):
    out("particulas", n, ss(w, h, fn))
def _confeti(c):
    def f(d, k): d.rounded_rectangle((1*k, 1*k, 15*k, 9*k), 2*k, fill=c)
    return f
for j, c in enumerate(("dorado", "rojo", "azul_cl", "verde", "crema")):
    particula("confeti_%d" % (j + 1), 16, 10, _confeti(PAL[c]))
def _papel(d, k):
    d.polygon([(2*k,2*k),(24*k,0),(28*k,34*k),(4*k,36*k)], fill=PAL["crema"], outline=PAL["gris"])
    for y in (10, 17, 24): d.line((6*k, y*k, 23*k, (y-1)*k), fill=PAL["gris"], width=2*k)
particula("papel", 30, 38, _papel)
def _chispa(d, k):
    c = PAL["dorado_claro"]; d.polygon([(12*k,0),(15*k,9*k),(24*k,12*k),(15*k,15*k),(12*k,24*k),(9*k,15*k),(0,12*k),(9*k,9*k)], fill=c)
    d.ellipse((9*k,9*k,15*k,15*k), fill=(255,255,255))
particula("chispa", 24, 24, _chispa)
def _gota(d, k): d.rounded_rectangle((1*k, 0, 5*k, 22*k), 2*k, fill=(150, 190, 235, 200))
particula("gota", 6, 22, _gota)
def _polvo(d, k):
    for r, a in ((10, 40), (7, 60), (4, 80)): d.ellipse(((10-r)*k, (10-r)*k, (10+r)*k, (10+r)*k), fill=(226, 210, 172, a))
particula("polvo", 20, 20, _polvo)
print("ok")
