// Genera / ACTUALIZA ../game.json (proyecto GDevelop 5) a partir de src/js/*.js + cartas.json.
// Uso:  node build.js [--destino=ruta.json]  (fusiona con el game.json existente, con respaldo)
//       node build.js --limpio   (ignora el game.json existente y lo crea de cero, con respaldo)
// IMPORTANTE: cierra el proyecto en GDevelop (o recargalo despues) al correr este script,
// o el editor podria sobrescribir los cambios al guardar.
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const JS = path.join(__dirname, "js");
const MARCA = "[AUTO]";            // los eventos "Group" cuyo nombre empieza asi son generados y se reemplazan

const leer = f => fs.readFileSync(path.join(JS, f), "utf8");
const { LAYOUT, aplicarEstilo, registrarFuentes } = require("./estilo.js");

// ---------- helpers de objetos y eventos ----------
const texto = (name, size) => aplicarEstilo({
  name, type: "TextObject::Text", variables: [], effects: [], behaviors: [],
  string: "", font: "", characterSize: size, bold: false, italic: false, underlined: false,
  smoothed: true, textAlignment: "left", color: { r: 255, g: 255, b: 255 },
  content: {
    bold: false, isOutlineEnabled: true, outlineThickness: 2, outlineColor: "0;0;0",
    isShadowEnabled: false, shadowColor: "0;0;0", shadowOpacity: 127, shadowAngle: 90,
    shadowDistance: 4, shadowBlurRadius: 2, italic: false, smoothed: true, underlined: false,
    text: "", font: "", textAlignment: "left", verticalTextAlignment: "top",
    characterSize: size, lineHeight: 0, color: "255;255;255",
  },
});
const sprite = name => ({
  name, type: "Sprite", variables: [], effects: [], behaviors: [],
  updateIfNotVisible: false, animations: [],
});
const comentario = (t, color) => ({
  type: "BuiltinCommonInstructions::Comment", disabled: false, folded: false,
  color: color || { b: 109, g: 230, r: 255, textB: 0, textG: 0, textR: 0 }, comment: t,
});
const js = codigo => ({ type: "BuiltinCommonInstructions::JsCode", inlineCode: codigo, parameterObjects: "", useStrict: true, eventsSheetExpanded: false });
const grupo = (nombre, events) => ({
  type: "BuiltinCommonInstructions::Group", disabled: false, folded: true, name: MARCA + " " + nombre,
  source: "", creationTime: 0, colorR: 74, colorG: 120, colorB: 74, events, parameters: [],
});
const inst = (value, parameters) => ({ type: { inverted: false, value }, parameters, subInstructions: [] });
const std = (conditions, actions) => ({
  type: "BuiltinCommonInstructions::Standard", disabled: false, folded: false, conditions, actions, events: [],
});

// ---------- modulos ----------
const cartas = JSON.parse(fs.readFileSync(path.join(__dirname, "cartas.json"), "utf8"));
// Configuracion editable (ids de leaderboards, volumenes) y manifiesto de audio generado por tools/gen_audio.py.
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const AUDIO = fs.existsSync(path.join(RAIZ, "assets", "audio", "audio.json")) ? JSON.parse(fs.readFileSync(path.join(RAIZ, "assets", "audio", "audio.json"), "utf8")) : { sfx: {}, musica: {} };
const modulo = (archivo, titulo, desc) => grupo(titulo, [comentario(desc), js("// [AUTO:" + archivo + "]\n" + leer(archivo)
  .replace("__CARTAS__", () => JSON.stringify(cartas)).replace("__AUDIO__", () => JSON.stringify({ sfx: AUDIO.sfx || {}, musica: AUDIO.musica || {} }))
  .replace("__CONFIG__", () => JSON.stringify(CONFIG)))]);
const COMUN = () => modulo("00_comun.js", "Comun: utilidades, logros, guardado, entrada", "Utilidades compartidas, logros, guardado y lectura de la entrada (mouse/teclas). Generado: no lo edites, edita src/js/00_comun.js.");
const AUDIOM = () => modulo("05_audio.js", "Audio, vibracion, ajustes y ranking", "Sonido y musica (gdjs.evtTools.sound), vibracion, opciones guardadas, Leaderboards de GDevelop y ventanas de Opciones y Ranking. Generado: edita src/js/05_audio.js y src/config.json.");

// Variables de ESCENA de senal / datos de audio, vibracion y ranking (todas las escenas).
const VARS_AUDIO = [["SenalSonido", 0], ["SonidoUltimo", ""], ["MusicaPista", ""], ["SenalVibracion", 0], ["SonidosPropios", 0], ["SenalRanking", 0], ["PuntajeSemanas", 0], ["PuntajeDestino", 0], ["NombreJugador", ""], ["RuntimeKeepAlive", 0]];
const idLB = k => { const v = CONFIG.leaderboards && CONFIG.leaderboards[k]; return typeof v === "string" && v.trim() ? v.trim() : "PEGA_AQUI_EL_ID"; };
// Eventos ESTANDAR que nunca se ejecutan (RuntimeKeepAlive = 123456789 no ocurre jamas). Su unico fin es que GDevelop incluya en la
// exportacion el runtime de Sonido (gdjs.evtTools.sound) y de la extension Leaderboards (gdjs.evtTools.leaderboards), que solo
// se agregan cuando algun evento estandar usa sus instrucciones. El primer parametro "" es el parametro interno "escena actual".
const RUNTIME = () => grupo("Runtime (audio y ranking; no se ejecuta)", [
  comentario("NO BORRAR: estos eventos nunca se ejecutan (RuntimeKeepAlive nunca vale 123456789). Hacen que GDevelop incluya en el juego exportado el runtime de sonido y de la extension Leaderboards, que el codigo JavaScript usa. Las tablas reales se configuran en src/config.json (ver README)."),
  std([inst("VarScene", ["RuntimeKeepAlive", "=", "123456789"])], [
    inst("PlaySound", ["", JSON.stringify(Object.values(AUDIO.sfx || {})[0] || "audio.ogg"), "no", "100", "1"]),
    inst("PlayMusic", ["", JSON.stringify(Object.values(AUDIO.musica || {})[0] || "audio.ogg"), "yes", "100", "1"]),
    inst("Leaderboards::SavePlayerScore", ["", JSON.stringify(idLB("semanas")), "0", JSON.stringify("Jugador")]),
    inst("Leaderboards::DisplayLeaderboard", ["", JSON.stringify(idLB("destino")), "no"]),
  ]),
]);

// Variables de ESCENA que el motor publica cada frame (para eventos normales de GDevelop).
const VARS_JUEGO = [
  ["Academico", 50], ["Estudiantes", 50], ["Finanzas", 50], ["Politica", 50], ["Integridad", 50],
  ["Semana", 0], ["Estado", "carta"], ["Personaje", ""], ["Director", 1], ["DirectorNombre", ""], ["Rasgo", ""],
  ["Fecha", ""], ["Mes", 9], ["Anio", 2025], ["Afinidad", 0], ["Estados", ""], ["FinTipo", ""],
  ["Reelecciones", 0], ["SemanasEleccion", 0], ["Campana", 0], ["FuerzaElectoral", 0], ["Sucesor", ""],
  ["SenalCarta", 0], ["SenalEleccion", 0], ["SenalFin", 0], ["SenalAzar", 0], ["SenalVoto", 0], ["SenalLogro", 0],
  ["UAN_Solvencia", 50], ["UAN_Paz", 50], ["UAN_Autonomia", 50], ["UAN_Prestigio", 50], ["Nay_Desarrollo", 50], ["Nay_Seguridad", 50], ["Historia", 1], ["Destino", ""],
  ["UltimoLogro", ""], ["Record", 0], ["AlertaFinanzas", 0],
];
VARS_JUEGO.push(["SenalSonido", 0], ["SonidoUltimo", ""], ["MusicaPista", ""], ["SenalVibracion", 0], ["SonidosPropios", 0], ["SenalRanking", 0], ["PuntajeSemanas", 0], ["PuntajeDestino", 0], ["NombreJugador", ""], ["RuntimeKeepAlive", 0]);
const variable = ([name, v]) => ({ name, type: typeof v === "number" ? "number" : "string", value: v });

const EJEMPLOS = () => grupo("Ejemplos de eventos estandar (editalos o borralos)", [
  comentario("Ejemplos de eventos NORMALES de GDevelop que leen las variables de escena que publica el motor. Usa la misma idea para sonidos, animaciones, particulas, etc. Ver README.md y src/ESQUEMA.md."),
  // Estado = "fin"  ->  oculta el inventario
  std([inst("VarSceneTxt", ["Estado", "=", "\"fin\""])], [inst("Cache", ["TxtInventario", ""])]),
  // Estado distinto de "fin" -> lo muestra
  std([inst("VarSceneTxt", ["Estado", "!=", "\"fin\""])], [inst("Montre", ["TxtInventario", ""])]),
  // Finanzas < 20 -> bandera AlertaFinanzas = 1 (puedes enlazarle sonido/parpadeo)
  std([inst("VarScene", ["Finanzas", "<", "20"])], [inst("ModVarScene", ["AlertaFinanzas", "=", "1"])]),
  std([inst("VarScene", ["Finanzas", ">=", "20"])], [inst("ModVarScene", ["AlertaFinanzas", "=", "0"])]),
]);

// ---------- definicion de escenas ----------
function escenas() {
  const texts = (...l) => l.map(([n, s]) => texto(n, s));
  return [
    {
      name: "Menu",
      objects: [sprite("Fondo"), sprite("BotonMini"), sprite("Panel"), sprite("IconoUI"), ...texts(["TxtTitulo", 96], ["TxtTexto", 22], ["TxtLogro", 26], ["TxtBoton", 36])],
      variables: [["Estado", "menu"], ["MenuSeleccion", 0], ["UAN_Solvencia", 50], ["UAN_Paz", 50], ["UAN_Autonomia", 50], ["UAN_Prestigio", 50], ["Nay_Desarrollo", 50], ["Nay_Seguridad", 50], ["Historia", 1], ...VARS_AUDIO],
      eventos: [grupo("Comun", COMUN().events), AUDIOM(), modulo("menu.js", "Menu principal", "Escena Menu: Nueva partida, Continuar, Logros, Ranking, Nueva historia, Cronica, Opciones, Creditos."), RUNTIME()],
    },
    {
      name: "Juego",
      objects: [
        sprite("Fondo"), sprite("Carta"), sprite("Retrato"), sprite("IconoStat"), sprite("Flash"), sprite("BotonMini"), sprite("Fragmento"), sprite("Panel"), sprite("IconoUI"), sprite("SombraCarta"), sprite("Particula"),
        ...texts(["TxtTitulo", 56], ["TxtPersonaje", 40], ["TxtTexto", 26], ["TxtOpcion", 26], ["TxtStats", 22], ["TxtTiempo", 22], ["TxtInventario", 22],
          ["TxtLogro", 24], ["TxtBoton", 36], ["TxtFragmento", 22], ["TxtEstados", 22], ["TxtAfinidad", 22], ["TxtEleccion", 22]),
      ],
      variables: VARS_JUEGO,
      eventos: [
        grupo("Comun", COMUN().events),
        AUDIOM(),
        modulo("10_datos.js", "Datos (cartas.json)", "Contenido: cartas, personajes, candidatos, finales y minijuegos. Se regenera desde src/cartas.json."),
        modulo("20_estado.js", "Estado y reglas", "Stats, afinidad, estados, azar, elecciones, sucesion, finales, guardado."),
        modulo("30_cartas.js", "Seleccion de cartas", "Condiciones, eras, efectos retardados, campana, ponderacion."),
        modulo("40_minijuegos.js", "Minijuegos", "Presupuesto, prensa, plagio y consejo."),
        modulo("50_entrada.js", "Entrada y pausa", "Enrutado de entrada por estado; pausa con Escape."),
        modulo("55_efectos.js", "Efectos de particulas", "Pool propio de particulas (confeti, papeles, chispas, lluvia, polvo) con el sprite Particula."),
        modulo("60_render.js", "Render y variables de escena", "Dibuja la carta/HUD y publica las variables de escena."),
        EJEMPLOS(),
        RUNTIME(),
      ],
    },
    {
      name: "Logros",
      objects: [sprite("Fondo"), sprite("BotonMini"), sprite("Panel"), sprite("IconoUI"), ...texts(["TxtTitulo", 60], ["TxtTexto", 26], ["TxtBoton", 36])],
      variables: [["Estado", "logros"], ...VARS_AUDIO],
      eventos: [grupo("Comun", COMUN().events), AUDIOM(), modulo("logros.js", "Lista de logros", "Escena Logros.")],
    },
  ];
}

const capa = () => ({
  ambientLightColorB: 200, ambientLightColorG: 200, ambientLightColorR: 200,
  camera3DFarPlaneDistance: 10000, camera3DFieldOfView: 45, camera3DNearPlaneDistance: 3,
  followBaseLayerCamera: false, isLightingLayer: false, isLocked: false, name: "",
  renderingType: "", visibility: true,
  cameras: [{ defaultSize: true, defaultViewport: true, height: 0, viewportBottom: 1, viewportLeft: 0, viewportRight: 1, viewportTop: 0, width: 0 }],
  effects: [],
});
const layoutNuevo = e => ({
  b: 30, v: 25, r: 40, mangledName: e.name, name: e.name, title: "",
  standardSortMethod: true, stopSoundsOnStartup: false, oglFOV: 90, oglZFar: 500, oglZNear: 1,
  uiSettings: { grid: false, gridType: "rectangular", gridWidth: 32, gridHeight: 32, gridOffsetX: 0, gridOffsetY: 0, gridColor: 10401023, gridAlpha: 0.8, snap: false, zoomFactor: 0.5, windowMask: false },
  objectsGroups: [], variables: e.variables.map(variable), instances: [],
  objects: e.objects, events: e.eventos, layers: [capa()], behaviorsSharedData: [],
});

function proyectoNuevo() {
  return {
    firstLayout: "Menu",
    gdVersion: { build: 98, major: 4, minor: 0, revision: 0 },
    properties: {
      adaptGameResolutionAtRuntime: false, folderProject: false, orientation: "portrait",
      packageName: "mx.uan.directoreconomia", projectFile: "", scaleMode: "linear",
      pixelsRounding: false, sizeOnStartupMode: "", templateSlug: "",
      useExternalSourceFiles: false, version: "1.0.0", name: "Director UAN: Economía",
      description: "Juego de decisiones tipo cartas", author: "", windowWidth: 720, windowHeight: 1280,
      latestCompilationDirectory: "", maxFPS: 60, minFPS: 20, verticalSync: false,
      platformSpecificAssets: {}, loadingScreen: { showGDevelopSplash: true },
      authorIds: [], authorUsernames: [], categories: [], playableDevices: [],
      extensionProperties: [], platforms: [{ name: "GDevelop JS platform" }], currentPlatform: "GDevelop JS platform",
    },
    resources: { resources: [], resourceFolders: [] },
    objects: [], objectsGroups: [], variables: [{ name: "Modo", type: "string", value: "nueva" }],
    layouts: escenas().map(layoutNuevo),
    externalEvents: [], eventsFunctionsExtensions: [], externalLayouts: [], externalSourceFiles: [],
  };
}

// ---------- fusion con un game.json existente ----------
const esAuto = ev => {
  if (!ev) return false;
  if (ev.type === "BuiltinCommonInstructions::Group" && typeof ev.name === "string" && ev.name.indexOf(MARCA) === 0) return true;
  // Formato anterior (un solo JsCode sin grupo)
  if (ev.type === "BuiltinCommonInstructions::JsCode" && typeof ev.inlineCode === "string" && ev.inlineCode.indexOf("runtimeScene.__reigns") >= 0) return true;
  if (ev.type === "BuiltinCommonInstructions::Comment" && typeof ev.comment === "string" && ev.comment.indexOf("Toda la lógica está en el evento JavaScript") === 0) return true;
  return false;
};
function fusionar(viejo, nuevo) {
  const info = { escenasNuevas: [], objetosNuevos: [], eventosPropios: 0, eventosAuto: 0 };
  const salida = viejo;
  salida.layouts = Array.isArray(salida.layouts) ? salida.layouts : [];
  let habiaAuto = false, legacy = false;
  nuevo.layouts.forEach(ln => {
    const lv = salida.layouts.find(l => l.name === ln.name);
    if (!lv) { salida.layouts.push(ln); info.escenasNuevas.push(ln.name); return; }
    // objetos: solo se agregan los que faltan (los del usuario y sus animaciones no se tocan)
    lv.objects = lv.objects || [];
    ln.objects.forEach(o => { if (!lv.objects.some(x => x.name === o.name)) { lv.objects.push(o); info.objetosNuevos.push(ln.name + "/" + o.name); } });
    // variables de escena
    lv.variables = lv.variables || [];
    ln.variables.forEach(v => { if (!lv.variables.some(x => x.name === v.name)) lv.variables.push(v); });
    // eventos: los generados se reemplazan en el sitio del primero; los demas se conservan
    const ev = lv.events || [], res = [];
    let puesto = false;
    ev.forEach(e => {
      if (esAuto(e)) { habiaAuto = true; if (e.type !== "BuiltinCommonInstructions::Group") legacy = true; info.eventosAuto++; if (!puesto) { puesto = true; ln.events.forEach(x => res.push(x)); } }
      else { res.push(e); info.eventosPropios++; }
    });
    if (!puesto) ln.events.slice().reverse().forEach(x => res.unshift(x));
    lv.events = res;
    lv.layers = lv.layers && lv.layers.length ? lv.layers : ln.layers;
    lv.stopSoundsOnStartup = false;     // la musica sigue al cambiar de escena (05_audio.js la reinicia si hace falta)
  });
  // variables globales que falten
  salida.variables = salida.variables || [];
  nuevo.variables.forEach(v => { if (!salida.variables.some(x => x.name === v.name)) salida.variables.push(v); });
  // Proyecto generado con el formato anterior: arrancar en el Menu.
  const eraViejo = legacy;
  if (!salida.firstLayout || (eraViejo && salida.firstLayout === "Juego")) salida.firstLayout = "Menu";
  // Resolucion logica fija 720x1280 (propiedad del proyecto generado, no del usuario): evita que el layout quede pegado a la izquierda.
  salida.properties = salida.properties || {};
  Object.assign(salida.properties, { windowWidth: 720, windowHeight: 1280, adaptGameResolutionAtRuntime: false, sizeOnStartupMode: "", orientation: "portrait" });
  return info;
}

function construir() { return proyectoNuevo(); }
module.exports = { construir, MARCA, LAYOUT };

if (require.main === module) {
  const arg = process.argv.find(a => a.indexOf("--destino=") === 0);
  const destino = arg ? path.resolve(arg.slice(10)) : path.join(RAIZ, "game.json");
  const limpio = process.argv.includes("--limpio");
  console.log("AVISO: cierra el proyecto en GDevelop (o recargalo despues de este script). Si el editor sigue abierto y guarda,");
  console.log("       sobrescribira estos cambios con su copia en memoria.");
  const nuevo = proyectoNuevo();
  let salida = nuevo, info = null;
  if (fs.existsSync(destino)) {
    const d = new Date(), p = n => String(n).padStart(2, "0");
    const sello = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
    const resp = path.join(path.dirname(destino), "game.backup-" + sello + ".json");
    fs.copyFileSync(destino, resp);
    console.log("Respaldo:", path.basename(resp));
    if (!limpio) {
      let viejo = null;
      try { viejo = JSON.parse(fs.readFileSync(destino, "utf8")); } catch (e) { console.log("game.json existente no es JSON valido; se crea uno nuevo (queda el respaldo)."); }
      if (viejo) { info = fusionar(viejo, nuevo); salida = viejo; }
    }
  }
  registrarFuentes(salida);
  fs.writeFileSync(destino, JSON.stringify(salida, null, 2));
  // Espejo del LAYOUT (00_comun.js) para tools/preview_layout.py y tools/gen_placeholders.py.
  const espejo = JSON.stringify(LAYOUT, null, 2) + "\n", fl = path.join(__dirname, "layout.json");
  if (!fs.existsSync(fl) || fs.readFileSync(fl, "utf8") !== espejo) fs.writeFileSync(fl, espejo);
  console.log("layout.json actualizado desde LAYOUT (00_comun.js)");
  console.log("game.json " + (info ? "fusionado" : "generado") + ":", cartas.cartas.length, "cartas,", (cartas.candidatos || []).length, "candidatos");
  if (info) console.log("  eventos propios conservados:", info.eventosPropios, "| eventos generados reemplazados:", info.eventosAuto,
    "| escenas nuevas:", info.escenasNuevas.join(",") || "-", "| objetos nuevos:", info.objetosNuevos.length);
}
