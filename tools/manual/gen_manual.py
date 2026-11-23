# Genera docs/Manual_Director_UAN.pdf siguiendo la estructura de
# "manual videojuegos_ok_final.pdf" (Centro de Cultura Digital, 2017).
# Uso: python tools/manual/gen_manual.py
import os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, Image, PageBreak, NextPageTemplate, KeepTogether)

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
F = os.path.join(RAIZ, "assets", "fonts")
pdfmetrics.registerFont(TTFont("Nunito", os.path.join(F, "Nunito-SemiBold.ttf")))
from reportlab.lib.fonts import addMapping
pdfmetrics.registerFont(TTFont("Sym", "C:/Windows/Fonts/seguisym.ttf"))
pdfmetrics.registerFont(TTFont("Fredoka", os.path.join(F, "Fredoka-SemiBold.ttf")))

from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Nunito", normal="Nunito", bold="Fredoka", italic="Nunito", boldItalic="Fredoka")

TEAL = HexColor("#93B6BA")
LINEA = HexColor("#8FB3B8")
TXT = HexColor("#222222")
GRIS = HexColor("#777777")
AZUL = HexColor("#1E4FA3")
AMAR = HexColor("#F2C230")

W, H = landscape(letter)
M = 48
BODY = W - 2 * M - 206  # ancho del texto a la derecha de una sección

s_body = ParagraphStyle("b", fontName="Nunito", fontSize=10.5, leading=15, textColor=TXT)
s_small = ParagraphStyle("s", parent=s_body, fontSize=9, leading=12.5)
s_tiny = ParagraphStyle("t", parent=s_body, fontSize=8, leading=10.5)
s_h = ParagraphStyle("h", fontName="Fredoka", fontSize=15, leading=18, textColor=HexColor("#000000"))
s_sub = ParagraphStyle("sub", fontName="Fredoka", fontSize=11.5, leading=15, textColor=HexColor("#000000"), spaceBefore=4, spaceAfter=3)
s_lienzo_h = ParagraphStyle("lh", fontName="Fredoka", fontSize=9.5, leading=12)
s_ej = ParagraphStyle("ej", parent=s_small)


def P(t, st=s_body):
    return Paragraph(t, st)


def bullets(items, st=s_body):
    return [P("• " + i, st) for i in items]


def seccion(titulo, cuerpo):
    """Bloque estilo del manual: título en mayúsculas a la izquierda, línea vertical, texto a la derecha."""
    t = Table([[P(titulo.upper().replace(" / ", "<br/>"), s_h), cuerpo]], colWidths=[170, W - 2 * M - 170])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEAFTER", (0, 0), (0, 0), 0.8, LINEA),
        ("LEFTPADDING", (1, 0), (1, 0), 36), ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def regla():
    t = Table([[""]], colWidths=[W - 2 * M], rowHeights=[10])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.8, LINEA)]))
    return t


def ejercicio(n, titulo, respuesta):
    return KeepTogether([P(f"<b>Ejercicio {n}:</b> {titulo}", s_small), Spacer(1, 3)] +
                        (respuesta if isinstance(respuesta, list) else [P(respuesta, s_small)]) + [Spacer(1, 9)])


def tabla(data, widths, cab=True, st=s_small):
    data = [[c if not isinstance(c, str) else P(c, st) for c in fila] for fila in data]
    t = Table(data, colWidths=widths, repeatRows=1 if cab else 0)
    estilo = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.5, LINEA),
              ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5)]
    if cab:
        estilo.append(("BACKGROUND", (0, 0), (-1, 0), HexColor("#E3EEF0")))
    t.setStyle(TableStyle(estilo))
    return t


# ---------- páginas ----------
def portada(c, doc):
    c.setFillColor(TEAL); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(HexColor("#000000"))
    c.setFont("Nunito", 13); c.drawString(200, H / 2 + 70, "Manual")
    c.setFont("Fredoka", 30)
    c.drawString(200, H / 2 + 36, "Desarrollo de videojuegos")
    c.setFont("Fredoka", 22); c.drawString(200, H / 2 + 4, "Fin de la Gestión")
    c.setFont("Nunito", 11)
    c.drawString(200, H / 2 - 22, "Aplicación del manual del Centro de Cultura Digital a un juego de cartas de decisiones")
    # iconos: corazón pixel, joystick y control
    c.setStrokeColor(HexColor("#000000")); c.setLineWidth(2.2)
    x0, y0, p = 200, H / 2 - 120, 9
    pix = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"]
    for r, fila in enumerate(pix):
        for k, v in enumerate(fila):
            if v == "1":
                c.rect(x0 + k * p, y0 - r * p, p, p, stroke=0, fill=1)
    c.circle(330, H / 2 - 92, 12); c.line(330, H / 2 - 104, 330, H / 2 - 128)
    c.rect(305, H / 2 - 140, 50, 12)
    c.roundRect(390, H / 2 - 150, 120, 52, 26)
    c.line(415, H / 2 - 124, 435, H / 2 - 124); c.line(425, H / 2 - 114, 425, H / 2 - 134)
    for dx, dy in ((480, -116), (490, -124), (480, -132), (470, -124)):
        c.circle(dx, H / 2 + dy, 3.5)
    c.setFont("Nunito", 10)
    c.drawString(200, 60, "Universidad Autónoma de Nayarit · Unidad Académica de Economía · Noviembre 2026")


def normal(c, doc):
    c.setFont("Nunito", 8); c.setFillColor(GRIS)
    c.drawCentredString(W / 2, H - 30, str(doc.page))
    c.setStrokeColor(LINEA); c.setLineWidth(0.8); c.line(M, H - 42, W - M, H - 42)
    c.drawString(M, 22, "Fin de la Gestión · Manual de desarrollo")


def construir(salida):
    doc = BaseDocTemplate(salida, pagesize=(W, H), leftMargin=M, rightMargin=M, topMargin=58, bottomMargin=40,
                          title="Manual de desarrollo: Fin de la Gestión", author="HectorUwO")
    fr = Frame(M, 40, W - 2 * M, H - 98, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate("portada", [Frame(0, 0, W, H)], onPage=portada),
                          PageTemplate("normal", [fr], onPage=normal)])
    S = [NextPageTemplate("normal"), PageBreak()]

    # ---- 2. Desarrollo de videojuegos / herramientas ----
    S.append(seccion("Desarrollo / de videojuegos", [
        P("Este documento aplica el <i>Manual de desarrollo de videojuegos</i> (Centro de Cultura Digital, 2017) a "
          "<b>Fin de la Gestión</b>, un juego de cartas de decisiones en el que el jugador dirige la Unidad "
          "Académica de Economía de la Universidad Autónoma de Nayarit. Cada carta es una semana: se desliza a la "
          "izquierda o a la derecha para decidir, y cada decisión mueve cuatro indicadores (Académico, Estudiantes, "
          "Finanzas y Política). Si uno llega a 0 o a 100, el director cae y la historia sigue con su sucesor."),
        Spacer(1, 6),
        P("Se sigue el mismo orden que el manual: herramientas, componentes, preparación (investigación, "
          "conceptualización, calendarización, preproducción, desarrollo y lanzamiento) y los ejercicios de cada sección, "
          "resueltos para este proyecto."),
    ]))
    S += [Spacer(1, 10), P("<b>Herramientas / utensilios</b>", s_sub)]
    S.append(tabla([
        ["Herramienta del manual", "Lo que usa este proyecto"],
        ["Computadora personal (PC)", "PC con Windows 11."],
        ["Periféricos", "Teclado y ratón. El juego se controla arrastrando la carta (ratón o pantalla táctil) o con las flechas <font name='Sym'>←</font>/<font name='Sym'>→</font>/<font name='Sym'>↑</font>."],
        ["Motor de desarrollo (<i>Engine</i>)", "<b>GDevelop 5</b>. La lógica está escrita como eventos JavaScript (<font face='Courier'>src/js/*.js</font>) "
         "que un script inserta en el proyecto <font face='Courier'>game.json</font>."],
        ["Software de producción (<i>Middleware</i>)", "Node.js (build, simulador, lint, editor web de cartas y balance), Python + numpy "
         "(genera audio, sprites provisionales y métricas de fuente), ffmpeg (codifica OGG)."],
        ["Archivos de sonidos e imágenes", "Audio sintetizado por código con licencia CC0; fuentes Nunito y Fredoka (SIL OFL); "
         "sprites provisionales generados mientras se dibuja el arte final (lista en <font face='Courier'>SPRITES.txt</font>)."],
        ["Control de código fuente", "Git."],
        ["Sitio web o repositorio", "GitHub: <font face='Courier'>github.com/brayort/videojuego</font>."],
    ], [200, W - 2 * M - 200]))
    S.append(Spacer(1, 8))
    S.append(P("<b>Lista</b>  <font name='Sym'>☑</font> Computadora  <font name='Sym'>☑</font> Periféricos  <font name='Sym'>☑</font> Motor (GDevelop 5)  <font name='Sym'>☑</font> Middleware (Node, Python)  "
               "<font name='Sym'>☑</font> Sonidos e imágenes  <font name='Sym'>☑</font> Control de código (Git)  <font name='Sym'>☑</font> Repositorio (GitHub)", s_small))
    S.append(PageBreak())

    # ---- 3. Componentes ----
    col = (W - 2 * M - 20) / 3
    mec = [P("Mecánicas y dinámicas de juego", s_sub)] + bullets([
        "<b>Mapas / mundos:</b> la Unidad de Economía dentro de la UAN y el estado de Nayarit.",
        "<b>Niveles:</b> cada director es una partida; la historia dura hasta 8 directores.",
        "<b>Rompecabezas:</b> 4 minijuegos (presupuesto, prensa, plagio y consejo).",
        "<b>Recompensas:</b> reelección y 35 logros.",
        "<b>Obstáculos:</b> 362 cartas con dilemas; elecciones cada mandato.",
        "<b>Dificultad:</b> equilibrar 4 indicadores que matan en 0 y en 100; integridad oculta.",
        "<b>Ritmo:</b> 1 carta = 1 semana, desde septiembre de 2025; calendario académico, Mundial 2026, elecciones intermedias.",
        "<b>Coleccionables:</b> 13 expedientes que desbloquean la opción <font name='Sym'>↑</font>.",
    ], s_small)
    nar = [P("Narrativa", s_sub)] + bullets([
        "<b>Tema:</b> la gestión universitaria: dinero, sindicato, estudiantes, política estatal y corrupción.",
        "<b>Técnica:</b> narrativa ramificada por banderas, cartas encadenadas (<i>luego</i>) y una dinastía de directores.",
        "<b>Personajes:</b> 37 (rector, tesorero, líder sindical, reportero, auditora, estudiantes wixárika y náayeri…).",
        "<b>Antagonistas:</b> diputado, empresa fantasma, porro de la facultad, aspirante a rector.",
        "<b>Conflictos:</b> huelga del SPAUAN, pensiones, plagio, huracán, inseguridad.",
        "<b>Soluciones:</b> 6 caídas especiales y 9 destinos finales de la UAN y de Nayarit hacia 2040.",
        "<b>Pacing:</b> cinemáticas tipo novela visual en la introducción, la historia y los destinos.",
    ], s_small)
    est = [P("Estética", s_sub)] + bullets([
        "<b>Gráficos:</b> pantalla vertical 720×1280, paleta azul, blanco y amarillo.",
        "<b>GUI:</b> barra de 4 indicadores, fecha, contador a la elección, afinidad, expedientes, menú, pausa, logros, ranking y crónica.",
        "<b>Animación:</b> carta que se inclina al arrastrarla, transiciones, cinemáticas.",
        "<b>Efectos especiales:</b> partículas (lluvia del huracán), destellos, vibración.",
        "<b>Sonido FX:</b> 16 efectos; <b>Música:</b> 3 loops (oficina, campaña, destino).",
        "<b>Licencias:</b> fuentes OFL, audio CC0.",
        "<b>Publicidad:</b> pendiente (ver Lanzamiento).",
    ], s_small)
    S.append(seccion("Componentes", [
        P("La lista del manual se divide en mecánicas y dinámicas, narrativa y estética. En este juego la <b>mecánica</b> "
          "es la regla «desliza para decidir, cada opción suma o resta a cuatro indicadores y en 0 o 100 caes»; la "
          "<b>dinámica</b> es lo que surge al jugar: el jugador aprende a no complacer demasiado a nadie, porque un "
          "indicador en 100 también te tumba. La <b>estética</b> busca tensión y sátira institucional, y la narrativa "
          "conduce al jugador por la historia de la UAN a lo largo de varios directores."),
    ]))
    S.append(Spacer(1, 8))
    t = Table([[mec, nar, est]], colWidths=[col, col, col])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBEFORE", (1, 0), (2, 0), 0.6, LINEA),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
    S.append(t)
    S.append(PageBreak())

    S.append(seccion("Componentes", [
        P("<b>Licencias.</b> GDevelop es software libre (MIT). Las fuentes Nunito y Fredoka usan la SIL Open Font License, "
          "que permite incluirlas en el juego. Todo el audio se generó por código propio y se publica como CC0, así "
          "que no hay que dar crédito a terceros. Los nombres de personajes son ficticios."),
        Spacer(1, 6),
        P("<b>Interfaz gráfica (GUI).</b> Es el primer contacto con el jugador. Arriba están los cuatro indicadores con "
          "icono; debajo, la fecha, las semanas que faltan para la elección y el número de director. En el centro, la "
          "pregunta y la carta del personaje; al arrastrarla aparece el texto de la opción. Abajo, el nombre del "
          "personaje, su afinidad y los expedientes. Una herramienta del proyecto marca en rojo cualquier texto que "
          "no cabe en su caja, para que la información siempre se lea completa."),
        Spacer(1, 8),
        Image(os.path.join(RAIZ, "assets", "preview", "_hoja_1.png"), width=520, height=520 * 557 / 1258),
        P("Capturas de la escena Juego: carta inicial y carta del diputado arrastrada a cada lado.", s_tiny),
    ]))
    S.append(PageBreak())

    # ---- 7. Preparación ----
    etapas = [
        ["Etapa (manual)", "Qué incluye en este juego", "Estado"],
        ["1. Investigación", "Licencias, motor (GDevelop), plataforma (web y móvil vertical), historia y contexto de la UAN y Nayarit, mecánicas de juegos de cartas de decisión.", "Hecho"],
        ["2. Conceptualización", "Mapas (UAN / Nayarit), personajes, obstáculos, GUI, mecánicas, historia, recompensas, logros, habilidades (expedientes), paleta, música.", "Hecho"],
        ["3. Calendarización", "Prueba de juego, arte, programación, lanzamiento (página «Calendarizar»).", "Hecho"],
        ["4. Preproducción", "Prototipo jugable con sprites provisionales y simulador por bots.", "Hecho"],
        ["5. Desarrollo", "Alfa: mecánicas, minijuegos, audio. Beta: cinemáticas, herramientas, paleta y fuentes finales.", "En curso (beta)"],
        ["6. Postproducción", "Enriquecer (arte final de SPRITES.txt), pulir, probar, datos estadísticos (reporte de balance y ranking).", "Pendiente"],
        ["7. Lanzamiento", "Lanzamiento suave en la Unidad de Economía y después público.", "Pendiente"],
    ]
    S.append(seccion("Preparación", [
        P("El manual advierte que empezar con una historia ya decidida suele frustrar, y que lo más importante es diseñar "
          "y probar las mecánicas. Por eso el proyecto empezó con un juego pequeño y conocido en su forma (cartas de dos "
          "opciones) y con lo que el autor sabe hacer: programar. El arte quedó con sprites provisionales hasta tener las "
          "mecánicas probadas, y el contenido (las cartas) vive en un archivo JSON aparte para crecer sin tocar el código."),
        Spacer(1, 8),
        tabla(etapas, [110, BODY - 190, 80]),
    ]))
    S.append(PageBreak())

    # ---- 9. Investigación ----
    S.append(seccion("Investigación", [
        P("Para la investigación se usó el <b>Lienzo de modelado de juegos</b> (<i>Game Model Canvas</i>), en la "
          "página siguiente. Las decisiones que más pesaron:"),
        Spacer(1, 4),
        *bullets([
            "<b>Plataforma.</b> El público (estudiantes y profesores) juega sobre todo en el celular, así que la pantalla "
            "es vertical (720×1280) y todo se controla con un dedo. GDevelop exporta a web, Android y PC sin cambiar el juego.",
            "<b>Estética según el dispositivo.</b> En un celular los detalles finos se pierden: se usan tarjetas grandes, "
            "iconos simples y fuentes redondeadas (Nunito y Fredoka) que se leen bien en pantallas chicas.",
            "<b>Licencias.</b> Se eligieron recursos que se pueden redistribuir sin problemas legales: motor MIT, fuentes OFL, "
            "audio propio en CC0.",
            "<b>Locaciones e historia.</b> El juego está ambientado en un lugar real (UAN, Tepic, Sayulita, la sierra), así que se "
            "documentaron temas reales: pensiones y subsidio, sindicato SPAUAN, acreditaciones, migración de jóvenes, "
            "seguridad, huracanes y comunidades wixárika y náayeri. Los personajes son ficticios.",
            "<b>Estudio de mercado.</b> Los juegos de cartas de decisión de dos opciones ya han demostrado que funcionan en "
            "móvil y no hay uno sobre la vida universitaria en Nayarit: ese es el «gancho».",
        ]),
    ]))
    S.append(PageBreak())

    # ---- 10. Lienzo ----
    S.append(P("<font color='#8FB3B8'>NOMBRE DEL PROYECTO: Fin de la Gestión · DISEÑADO PARA: comunidad UAN · "
               "DISEÑADO POR: HectorUwO · EN: GDevelop 5 · ITERACIÓN: 1.0 (beta)</font>", s_tiny))
    S.append(P("<font color='#8FB3B8'>LIENZO DE MODELADO DE JUEGOS</font>", s_h))
    S.append(Spacer(1, 6))
    cw = (W - 2 * M) / 5

    def celda(t, txt):
        return [P(t.upper(), s_lienzo_h), Spacer(1, 3)] + [P(x, s_tiny) for x in txt]
    lienzo = [[
        celda("Plataformas", ["Web (navegador del celular o PC), Android y PC de escritorio.",
                              "Pantalla vertical 720×1280; control por arrastre táctil, ratón o teclado.",
                              "Las mecánicas solo requieren arrastrar a un lado: funcionan igual en todas."]),
        celda("Mecánicas", ["Desliza la carta a la izquierda o a la derecha para decidir.",
                            "Cada opción suma o resta a Académico, Estudiantes, Finanzas y Política.",
                            "Un indicador en 0 o en 100 = caída del director.",
                            "Hacia arriba: usar un expediente.",
                            "Elección: hay que ganar votos para reelegirse.",
                            "La dificultad crece: cartas por umbral, eras y consecuencias encadenadas."]),
        celda("Dinámicas", ["Estatus (director, reelecciones).", "Progresión (semanas, directores, dinastía).",
                            "Escasez (presupuesto, aliados).", "Recompensa (logros, destinos).",
                            "Identidad (rasgos del director, integridad oculta)."]),
        celda("Estética", ["Reto: sobrevivir el mayor tiempo posible.", "Narrativa y descubrimiento: 362 cartas y 9 destinos.",
                           "Expresión: decidir si ser íntegro o corrupto.", "Sensación: tensión, humor y sátira institucional."]),
        celda("Jugadores", ["Estudiantes y profesores de la UAN (18 a 50 años).",
                            "Juegan en ratos cortos en el celular.",
                            "Les interesa reconocer su universidad y reírse de la política interna."]),
    ], [
        celda("Componentes", ["Puntos (4 indicadores + 6 medidores de la UAN y Nayarit).", "Logros (35).",
                              "Niveles (directores).", "Tabla de clasificación (ranking).", "Cuenta regresiva (elección).",
                              "Inventario (expedientes).", "Aleatorio (mazo y eventos)."]),
        "", "",
        celda("Comportamientos", ["Leer cada carta antes de decidir.", "Volver a jugar con otro director.",
                                  "Comparar destinos en la Crónica.", "Recomendar el juego a compañeros.",
                                  "Competir en el ranking."]),
        "",
    ]]
    # Componentes va debajo de Mecánicas: mueve celda
    lienzo[1][0], lienzo[1][1] = "", lienzo[1][0]
    lt = Table(lienzo, colWidths=[cw] * 5, rowHeights=[250, 160])
    lt.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, GRIS), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("SPAN", (0, 0), (0, 1)), ("SPAN", (2, 0), (2, 1)), ("SPAN", (4, 0), (4, 1)),
        ("LINEAFTER", (0, 0), (3, 1), 0.6, GRIS),
        ("LINEBELOW", (1, 0), (1, 0), 0.6, GRIS), ("LINEBELOW", (3, 0), (3, 0), 0.6, GRIS),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 7),
    ]))
    S.append(lt)
    S.append(PageBreak())

    # ---- 11. Conceptualización ----
    S.append(seccion("Conceptualización", [
        P("Del lienzo salieron los puntos que el manual pide revisar:"),
        Spacer(1, 4),
        tabla([
            ["Punto del manual", "En Fin de la Gestión"],
            ["Objetivo general", "Dirigir la Unidad de Economía el mayor tiempo posible y dejar a la UAN y a Nayarit en el mejor destino."],
            ["Objetivos específicos", "Mantener los 4 indicadores entre 0 y 100, ganar las elecciones, conseguir expedientes y logros."],
            ["Reglas fáciles y coherentes", "Una sola acción (deslizar). Las consecuencias tienen sentido en el contexto: pagar al sindicato baja Finanzas y sube Estudiantes."],
            ["Juego balanceado", "Un simulador juega 5000 partidas con tres bots. El bot equilibrado dura una media de 83.5 semanas y el aleatorio 30.2: jugar bien sí se nota. "
             "El reporte también señala qué indicador mata más para corregir cartas."],
            ["Nivel de dificultad", "Al principio pocas cartas fuertes; después aparecen crisis por umbrales (huelga, rescate federal, intervención del Congreso)."],
            ["Sentido de control", "La carta se inclina mientras se arrastra y muestra la opción antes de soltarla."],
            ["Retroalimentación y recompensas", "Los indicadores suben o bajan con animación y sonido; avisos de logro; epílogo y crónica al caer."],
            ["Gancho", "Es tu universidad: personajes, lugares y problemas reconocibles, y cada caída cambia la historia del siguiente director."],
        ], [150, BODY - 150]),
    ]))
    S.append(PageBreak())

    # ---- 12. Calendarizar ----
    cal = [
        ["Etapa", "Programación", "Diseño de juego", "Arte y sonido", "Fecha"],
        ["Prototipo", "Motor de cartas e indicadores", "Primeras cartas y finales", "Sprites provisionales", "29 oct 2026 <font name='Sym'>✓</font>"],
        ["Mecánicas centrales", "Minijuegos, elección, sucesión", "Mazo de 362 cartas, dinastía, destinos", "Audio procedural, partículas", "29 oct 2026 <font name='Sym'>✓</font>"],
        ["Herramientas", "Build, simulador, lint, editor web, depuración", "Reporte de balance", "Previsualización del layout", "2 nov 2026 <font name='Sym'>✓</font>"],
        ["Beta", "Cinemáticas tipo novela visual", "Guiones de intro y destinos", "Paleta y fuentes finales", "2 nov 2026 <font name='Sym'>✓</font>"],
        ["Prueba interna", "Corregir errores", "Ajustar cartas según balance", "Arte final de personajes y fondos", "Por definir"],
        ["Prueba externa", "Soft launch", "Ajustes por datos de jugadores", "Pulir arte y empaque", "Por definir"],
        ["Lanzamiento", "Exportar web y Android", "", "Material de difusión", "Por definir"],
    ]
    S.append(seccion("Calendarizar", [
        P("El trabajo se dividió en programación, diseño de juego y arte y sonido. Como es un juego 2D, el arte final no "
          "bloquea a la programación: se trabajó con sprites provisionales (el código ignora animaciones que aún no existen) "
          "y primero se cerraron las mecánicas principales. Las fechas con <font name='Sym'>✓</font> salen del historial de Git; las demás aún no "
          "tienen fecha, y conviene fijarlas para no perder el ritmo, como recomienda el manual."),
        Spacer(1, 6),
        tabla(cal, [78, 112, 112, 112, BODY - 414]),
    ]))
    S.append(PageBreak())

    # ---- 13-14. Preproducción y desarrollo ----
    S.append(seccion("Preproducción", [
        P("El demo jugable se armó pronto con sprites provisionales para probar las mecánicas y la usabilidad. En lugar de "
          "un demo físico, el proyecto usa un <b>simulador</b> que juega miles de partidas con bots (aleatorio, codicioso y "
          "equilibrado) y un simulador de escenas que sirve como prueba de regresión. Con esos datos se ajustaron pesos de "
          "cartas y efectos, y la posición de los elementos en pantalla se revisa con capturas generadas automáticamente."),
    ]))
    S.append(Spacer(1, 12)); S.append(regla()); S.append(Spacer(1, 12))
    S.append(seccion("Desarrollo", [
        P("<b>Etapa Alfa</b> (completa): mecánicas principales terminadas (cartas, indicadores, elección, sucesión, "
          "minijuegos, expedientes, dinastía y destinos), audio, vibración, partículas y ranking."),
        Spacer(1, 5),
        P("<b>Etapa Beta</b> (en curso): cinemáticas, menú con crónica y opciones, paleta y fuentes definitivas, métricas "
          "reales de texto sin avisos de diseño. Para probar en cada cambio, <font face='Courier'>npm run check</font> revisa el "
          "contenido, construye el juego y corre el simulador; el editor web muestra cartas, cinemáticas, balance y "
          "revisión; el panel de depuración (F2) permite forzar cualquier situación dentro del juego."),
        Spacer(1, 5),
        P("<b>Falta para cerrar la Beta:</b> arte final de personajes y fondos (lista en SPRITES.txt) y pruebas con jugadores reales."),
        Spacer(1, 5),
        P("<i>Nota del manual: dentro del calendario hay que dejar tiempo para ajustes.</i>", s_small),
    ]))
    S.append(PageBreak())

    # ---- 15. Lanzamiento / otras consideraciones ----
    S.append(seccion("Lanzamiento", [
        P("Se propone un <b>lanzamiento suave</b> (<i>soft launch</i>): publicar la versión web solo para estudiantes y "
          "profesores de la Unidad de Economía durante unas semanas. Con el ranking, la crónica y el reporte de balance se "
          "revisa en qué indicador caen más los jugadores, si algún texto confunde y si la dificultad es justa; después se "
          "abre al resto de la UAN y se publica en Android."),
    ]))
    S.append(Spacer(1, 18))
    S.append(seccion("Otras / consideraciones", [
        P("Plan de publicidad en paralelo a la producción: mostrar avances (capturas, cartas curiosas, destinos) en las "
          "redes de la Unidad y de la sociedad de alumnos para generar expectativa."),
        Spacer(1, 5),
        P("Lista de medios: gaceta y radio universitaria, medios locales de Nayarit y grupos de estudiantes."),
        Spacer(1, 5),
        P("Antes de publicar: desactivar el modo de depuración (<font face='Courier'>\"debug\": false</font> en "
          "<font face='Courier'>src/config.json</font>) y quitar la pantalla de GDevelop si se desea."),
    ]))
    S.append(PageBreak())

    # ---- Ejercicios ----
    S.append(seccion("Ejercicios", [P("Respuestas a los ejercicios del manual, aplicadas a este proyecto.")]))
    S.append(Spacer(1, 8))
    S.append(ejercicio(1, "¿Cuántos motores de juego gratuitos y no gratuitos puedes encontrar en internet?", [
        P("<b>Gratuitos / libres:</b> GDevelop (el de este proyecto), Godot, Defold, Bevy, Phaser, Ren'Py, Love2D, Pygame. "
          "<b>Gratuitos con licencia o regalías:</b> Unity, Unreal Engine. <b>De pago:</b> GameMaker (comercial), Construct 3, "
          "RPG Maker. Son más de una docena de opciones conocidas; se eligió GDevelop porque es libre, exporta a web y móvil "
          "y permite escribir la lógica en JavaScript.", s_small)]))
    S.append(ejercicio(2, "Investiga las licencias libres y sus requisitos para usar sonidos e imágenes.", [
        tabla([["Licencia", "Requisito"],
               ["CC0", "Ninguno; dominio público (el audio de este juego)."],
               ["CC BY", "Dar crédito al autor."],
               ["CC BY-SA", "Crédito y compartir las obras derivadas con la misma licencia."],
               ["CC BY-NC", "Crédito y sin uso comercial."],
               ["SIL OFL", "Fuentes: se pueden incluir en el juego; no se venden solas (Nunito y Fredoka)."],
               ["MIT", "Software: conservar el aviso de copyright (GDevelop)."]], [90, 500], st=s_tiny)]))
    S.append(ejercicio(3, "¿Cuál es la diferencia entre mecánicas y dinámicas de juego?",
                       "La mecánica es la regla escrita: «deslizar a un lado aplica los efectos de esa opción; un indicador en 0 o 100 "
                       "termina el mandato». La dinámica es el comportamiento que aparece al jugar con esa regla: el jugador "
                       "evita complacer siempre al mismo grupo, busca cartas que bajen el indicador que está muy alto y arriesga "
                       "la integridad cuando se acerca la elección. El manual coincide: las mecánicas son las reglas y las "
                       "dinámicas, la forma en que se comporta el juego."))
    S.append(ejercicio(4, "Diferencias del juego en varias plataformas.",
                       "<b>Móvil:</b> pantalla vertical, arrastre con el dedo, partidas cortas, vibración. <b>PC:</b> mismo juego con "
                       "ratón o flechas; habría espacio para fondos más detallados. <b>Consola:</b> se jugaría con el stick o "
                       "los gatillos; la pantalla horizontal obligaría a rediseñar la GUI y el texto tendría que verse desde lejos. "
                       "En el lienzo, la plataforma cambia sobre todo Plataformas, Estética y Jugadores."))
    S.append(ejercicio(5, "Tiempo de desarrollo y calendario.",
                       "Según el historial de Git: el prototipo con mecánicas, minijuegos y audio quedó el 29 de octubre de 2026 y "
                       "las herramientas, cinemáticas, paleta y fuentes el 2 de noviembre de 2026. El calendario completo está en "
                       "la página «Calendarizar»."))
    S.append(ejercicio(6, "Demo y prueba con personas.",
                       "El demo ya existe y se prueba con bots (5000 partidas). Falta presentarlo a compañeros: observar si "
                       "entienden el arrastre sin explicación, si leen los indicadores y en qué carta abandonan, y anotarlo."))
    S.append(PageBreak())

    # ---- Créditos ----
    S.append(seccion("Créditos", [
        P("<b>Juego:</b> Fin de la Gestión · versión 1.0.0 (beta)"),
        P("<b>Desarrollo:</b> HectorUwO"),
        P("<b>Motor:</b> GDevelop 5 · <b>Fuentes:</b> Nunito y Fredoka (SIL OFL) · <b>Audio:</b> generado por código (CC0)"),
        P("<b>Repositorio:</b> github.com/brayort/videojuego"),
        Spacer(1, 10),
        P("Estructura basada en: <i>Manual de desarrollo de videojuegos</i>, Jacinto Quesnel, Héctor Guerrero y Norman Ávila. "
          "Secretaría de Cultura / Centro de Cultura Digital, Ciudad de México, 2017. Licencia Creative Commons "
          "Atribución-NoComercial-CompartirIgual 4.0.", s_small),
    ]))

    doc.build(S)


if __name__ == "__main__":
    out = os.path.join(RAIZ, "docs", "Manual_Director_UAN.pdf")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    construir(out)
    print(out)
