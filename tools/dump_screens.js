// Ejecuta el MOTOR REAL (los eventos JavaScript de game.json) con objetos simulados que registran
// posicion, tamano, texto, animacion, color y opacidad, y escribe una "foto" JSON por pantalla.
// tools/preview_layout.py las compone con Pillow en assets/preview/*.png.
// Uso: node tools/dump_screens.js [salida.json]      (correr despues de build.js y assets_demo.js)
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const g = JSON.parse(fs.readFileSync(path.join(RAIZ, "game.json"), "utf8"));
const salida = process.argv[2] || path.join(RAIZ, "assets", "preview", "_dump.json");
const W = 720, H = 1280;

const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
let seed = 7;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

function recoger(evs, out) { evs.forEach(e => { if (e.type.endsWith("JsCode")) out.push(e.inlineCode); if (e.events) recoger(e.events, out); }); return out; }
const layouts = {};
g.layouts.forEach(l => {
  const defs = {}; l.objects.forEach(o => { defs[o.name] = o; });
  layouts[l.name] = { fns: recoger(l.events, []).map(c => new Function("runtimeScene", "objects", c)), defs, vars: l.variables };
});
const gvars = {}; g.variables.forEach(v => { gvars[v.name] = String(v.value); });
const mkVar = (map, n) => ({ setNumber(v) { map[n] = v; }, setString(v) { map[n] = v; }, getAsString() { return String(map[n] === undefined ? "" : map[n]); } });
const png = {};
function pngSize(rel) {
  if (png[rel]) return png[rel];
  const b = fs.readFileSync(path.join(RAIZ, rel));
  return (png[rel] = [b.readUInt32BE(16), b.readUInt32BE(20)]);
}
const animInfo = (def, name) => { const a = (def.animations || []).find(x => x.name === name); return a ? a.directions[0].sprites[0].image : null; };

const ctx = { mouse: false, cx: 0, cy: 0, keys: {}, scene: null, cambio: null, ms: 33 };
global.gdjs = { evtTools: { runtimeScene: { replaceScene(sc, nombre) { ctx.cambio = nombre; } } } };
const gm = {
  getInputManager() { return { getCursorX: () => ctx.cx, getCursorY: () => ctx.cy, isMouseButtonPressed: () => ctx.mouse, isKeyPressed: k => !!ctx.keys[k] }; },
  getGameResolutionWidth: () => +process.env.RES_W || W, getGameResolutionHeight: () => +process.env.RES_H || H,
  getVariables() { return { get: n => mkVar(gvars, n) }; },
};
let orden = 0;
function mkObj(name, sc) {
  const def = sc.L.defs[name], esTxt = def.type === "TextObject::Text";
  const o = {
    name, tipo: esTxt ? "text" : "sprite", orden: orden++, deleted: false, hidden: false, x: 0, y: 0, w: null, h: null, ang: 0, op: 255, z: 0,
    anim: null, txt: "", size: def.characterSize || 20, wrap: 0, al: def.textAlignment || "left", col: (def.content && def.content.color) || "255;255;255", font: esTxt ? def.font : "",
  };
  const chk = () => { if (o.deleted) throw new Error("use after delete " + name); };
  const nat = () => { const f = o.anim ? animInfo(def, o.anim) : ((def.animations || [])[0] ? def.animations[0].directions[0].sprites[0].image : null); return f ? pngSize(f) : [100, 100]; };
  Object.assign(o, {
    setText(s) { chk(); if (typeof s !== "string") throw new Error("text not string " + name); o.txt = s; }, getText: () => o.txt,
    setCharacterSize(s) { chk(); o.size = s; }, setWrapping(v) { chk(); o.wrapOn = v; }, setWrappingWidth(w) { chk(); o.wrap = w; },
    setTextAlignment(a) { chk(); o.al = a; }, setColor(c) { chk(); o.col = c; },
    setPosition(x, y) { chk(); if (!isFinite(x) || !isFinite(y)) throw new Error("NaN pos " + name); o.x = x; o.y = y; },
    setAnimationName(a) { chk(); o.anim = a; }, hasAnimationNamed(a) { return !!animInfo(def, a); },
    setOpacity(v) { chk(); o.op = v; }, setZOrder(z) { chk(); o.z = z; }, getZOrder: () => o.z, setAngle(a) { chk(); o.ang = a; },
    getWidth() { return o.w !== null ? o.w : nat()[0]; }, getHeight() { return o.h !== null ? o.h : nat()[1]; },
    setWidth(w) { chk(); if (!isFinite(w) || w < 0) throw new Error("bad width " + name + " " + w); o.w = w; },
    setHeight(h) { chk(); if (!isFinite(h) || h < 0) throw new Error("bad height " + name + " " + h); o.h = h; },
    hide(v) { chk(); o.hidden = !!v; },
    deleteFromScene(s) { if (o.deleted) throw new Error("double delete " + name); o.deleted = true; s.objs.delete(o); },
  });
  return o;
}
function mkScene(nombre) {
  const L = layouts[nombre], vars = {}; L.vars.forEach(v => { vars[v.name] = v.value; });
  return {
    nombre, L, objs: new Set(), el: 33, vars,
    createObject(n) { if (!L.defs[n]) throw new Error("objeto desconocido " + n + " en " + nombre); const o = mkObj(n, this); this.objs.add(o); return o; },
    getGame() { return gm; }, getElapsedTime() { return this.el; }, getLayer() { return { setCameraX() { }, setCameraY() { } }; },
    getVariables() { return { get: n => mkVar(vars, n) }; },
  };
}
const snaps = {}, avisos = [];
function frames(n) { for (let i = 0; i < n; i++) { ctx.scene.el = ctx.ms; ctx.scene.L.fns.forEach(fn => fn(ctx.scene)); } }
function iniciar(escena) { ctx.scene = mkScene(escena); ctx.mouse = false; ctx.keys = {}; ctx.cambio = null; frames(3); return ctx.scene.__reigns; }
function foto(nombre, extra) {
  const objs = [...ctx.scene.objs].filter(o => !o.deleted).map(o => ({
    n: o.name, t: o.tipo, o: o.orden, x: o.x, y: o.y, w: o.w, h: o.h, a: o.ang, op: o.op, z: o.z, h_: o.hidden, anim: o.anim, txt: o.txt, size: o.size,
    wrap: o.wrap, al: o.al, col: o.col, font: o.font, escena: ctx.scene.nombre,
  }));
  snaps[nombre] = { escena: ctx.scene.nombre, objs, nobjs: objs.length, extra: extra || null };
}
const tocar = (x, y, abajo) => { ctx.cx = x; ctx.cy = y; ctx.mouse = !!abajo; };

// ---------------- escenarios ----------------
const cartas = () => ctx.scene.__reigns.data.cartas;
function forzarCarta(S, c) { S.c = c; S.mostrarCarta(); }

(function main() {
  let S = iniciar("Juego");
  frames(40); foto("juego_carta");
  // arrastre a la derecha / izquierda (con vista previa de efectos)
  let c = cartas().find(x => x.izq && x.der && x.izq.e && x.der.e && x.izq.e.some(v => Math.abs(v) >= 15) && !x.izq.azar);
  forzarCarta(S, c); frames(30);
  tocar(360, 800, true); frames(2); tocar(430, 800, true); frames(2); foto("juego_arrastre_der_parcial");
  tocar(470, 800, true); frames(3); foto("juego_arrastre_der");
  tocar(250, 800, true); frames(3); foto("juego_arrastre_izq");
  tocar(610, 800, true); frames(3); foto("juego_sombra_rot_p15");
  tocar(110, 800, true); frames(3); foto("juego_sombra_rot_m15");
  tocar(360, 800, false); frames(6);
  // carta con azar
  c = cartas().find(x => x.der && x.der.azar); if (c) { forzarCarta(S, c); frames(30); tocar(360, 800, true); frames(2); tocar(470, 800, true); frames(3); foto("juego_azar"); tocar(360, 800, false); frames(6); }
  // opcion "arriba": expediente
  c = cartas().find(x => x.arriba); S.items[c.arriba.usa] = true; forzarCarta(S, c); frames(30);
  foto("juego_hint_arriba");
  tocar(360, 800, true); frames(2); tocar(360, 690, true); frames(3); foto("juego_arriba");
  tocar(360, 800, false); frames(6);
  // peor caso de texto: carta mas larga, personaje de nombre largo, estados, campana, 3 expedientes
  const larga = cartas().slice().sort((a, b) => b.texto.length - a.texto.length)[0];
  const largo = Object.keys(S.data.personajes).sort((a, b) => S.data.personajes[b].length - S.data.personajes[a].length)[0];
  larga.pj = largo; S.items.grabacion_tesorero = true; S.items.oficio_auditoria = true; S.items.carta_gobernador = true;
  S.estados.push({ id: "paro", nombre: "Paro", rest: 3, cada: [0, -2, -3, 0] }, { id: "beca", nombre: "Beca extra", rest: 2, cada: [0, 3, 0, 0] });
  S.eleccionEn = S.semana + 5; S.v = [8, 92, 50, 20]; S.af[largo] = 3;
  forzarCarta(S, larga); frames(40); foto("juego_peor_caso");
  tocar(360, 800, true); frames(2); tocar(250, 800, true); frames(3); foto("juego_peor_caso_arrastre"); tocar(360, 800, false); frames(6);
  // eleccion de carta: salida volando + entrada con volteo
  S.v = [50, 50, 50, 50]; S.estados.length = 0; S.eleccionEn = S.semana + 40; S.af[largo] = 0; frames(40);
  forzarCarta(S, cartas()[3]); frames(40);
  S.dx = -140; S.elegir(S.c.izq); frames(5); foto("juego_vuelo");
  frames(6); foto("juego_voltear");
  frames(40);
  // carta con lluvia (fx "lluvia": cartas del huracan) y particulas
  forzarCarta(S, S.porId.hu1); frames(90); foto("juego_lluvia");
  // destello por cambio grande + aviso de logro
  S.aplicarE([20, -20, 0, 0]); U_cola(S); frames(4); foto("juego_destello");
  frames(60);
  // pausa
  S.pausar(); frames(6); foto("pausa");
  tocar(360, 570, true); frames(2); foto("pausa_boton_presionado");
  tocar(360, 570, false); frames(2); if (S.estado === "pausa") S.reanudar(); frames(3);
  // pausa > Opciones
  S.pausar(); frames(4); tocar(360, 700, true); frames(2); tocar(360, 700, false); frames(4); foto("pausa_opciones");
  ctx.keys = { 27: true }; frames(2); ctx.keys = {}; frames(3); if (S.estado === "pausa") S.reanudar(); frames(3);

  // informe semestral
  S.semana = 16; S.bitacora = ["Sem 3: Recortar becas a cambio de liquidez", "Sem 7: Pactar con el sindicato", "Sem 11: Auditoría sorpresa a Finanzas", "Sem 12: Entregar el edificio B", "Sem 15: Votar a favor de la reforma"];
  S.items.grabacion_tesorero = true; S.informe(); frames(80); foto("informe");
  // fin de gestion + sucesion + epilogo
  S.setEstado("carta"); S.semana = 40; S.v[2] = 0; S.terminar("stat", 2); frames(60); foto("fin");
  S.sucesionPantalla(); frames(60); foto("sucesion");
  S.epilogoPantalla(); frames(60); foto("epilogo");
  // destino 2040 (paginado)
  S.destinoPend = S.data.destinos[0]; S.dyn.hist = []; for (let i = 0; i < 8; i++) S.dyn.hist.push({ n: i + 1, nombre: ["Dr. Rubén Alcántar", "Mtra. Georgina Peñuelas", "Dr. Ignacio Cárdenas", "Dra. Teresa Zepeda"][i % 4], causa: ["la quiebra financiera", "el colapso académico", "perder la elección de director"][i % 3], sem: 30 + i * 7, k: "x" });
  S.destinoPantalla(); frames(60); foto("destino_p1"); const P = S.pag; if (P && P.n > 1) { P.i = 1; frames(4); foto("destino_p2"); P.i = P.n - 1; frames(4); foto("destino_pfin"); }
  // destino > boton Ranking (sin ids configurados: mensaje explicativo)
  tocar(100, 1215, true); frames(2); tocar(100, 1215, false); frames(4); foto("destino_ranking");
  ctx.keys = { 27: true }; frames(2); ctx.keys = {}; frames(3);
  // eleccion (a medias y terminada)
  S.reiniciarEstado(); S.siguiente(); S.semana = S.eleccionEn; S.eleccionPantalla(); frames(2);
  for (let i = 0; i < 40; i++) { S.updateEleccion(0.033); frames(1); } foto("eleccion_parcial");
  S.elec.ok = true; S.elec.t = 99; frames(4); S.updateEleccion(0.033); frames(4); foto("eleccion_fin");
  frames(14); foto("eleccion_confeti");
  // minijuegos
  S.reiniciarEstado(); S.siguiente();
  S.iniciarMini("presupuesto"); frames(40); S.m.asig = [30, 20, 25, 10]; S.m.sel = 1; frames(4); foto("mini_presupuesto");
  S.iniciarMini("prensa"); frames(30); S.m.t = 2.2; frames(2); foto("mini_prensa");
  ctx.keys = { 49: true }; S.espera = 0; frames(2); ctx.keys = {}; frames(2); foto("mini_prensa_feedback");
  S.iniciarMini("plagio"); S.espera = 0; frames(40); S.m.t = 13; for (let i = 0; i < 110; i++) frames(1); foto("mini_plagio");
  S.iniciarMini("consejo"); frames(30); foto("mini_consejo");
  ctx.keys = { 50: true }; S.espera = 0; frames(2); ctx.keys = {}; frames(2); foto("mini_consejo_feedback");
  S.finMini(true, "Tu reparto: Nómina 30, Becas 20, Infraestructura 25, Investigación 25.\nLo que pedía la comunidad: Nómina 25, Becas 25, Infraestructura 30, Investigación 20.\nDesviación total: 20 millones."); frames(40); foto("mini_resultado_bien");
  S.m = null; S.iniciarMini("prensa"); S.finMini(false, "Puntos de la rueda de prensa: 2 de 6 (necesitas 4)."); frames(40); foto("mini_resultado_mal");

  // ---- Menu ----
  S = iniciar("Menu"); frames(60); foto("menu");
  S.kb = true; S.sel = 2; frames(2); foto("menu_seleccion");
  tocar(360, 620, false); frames(2); foto("menu_hover");
  tocar(360, 620, true); frames(2); foto("menu_presionado"); tocar(360, 620, false); frames(2);
  S.abrirCronica(); frames(3); foto("menu_cronica_vacia"); S.cierraSub();
  const lista = []; for (let i = 0; i < 6; i++) lista.push({ id: "x", titulo: ["Sobrevivió", "Renacimiento", "Quiebra y rescate"][i % 3], directores: 8, anio: 2038 + i, lista: ["Dr. Rubén Alcántar (la quiebra financiera)", "Mtra. Georgina Peñuelas (el colapso académico)", "Dr. Ignacio Cárdenas (perder la elección de director)", "Dra. Teresa Zepeda (un retiro digno)"] });
  store.directorUAN_cronica = JSON.stringify(lista);
  S.abrirCronica(); frames(3); foto("menu_cronica"); S.cierraSub();
  S.abrirCreditos(); frames(3); foto("menu_creditos"); S.cierraSub();
  S.saliendo = false; ctx.cambio = null;   // los clics de las pruebas anteriores pudieron activar un boton
  S.activar(6); frames(4); foto("menu_opciones"); ctx.keys = { 27: true }; frames(2); ctx.keys = {}; frames(3);
  S.activar(3); frames(4); foto("menu_ranking"); ctx.keys = { 27: true }; frames(2); ctx.keys = {}; frames(3);
  // ---- Logros ----
  store.directorUAN_logros = JSON.stringify({ semestre1: true, tres_semestres: true, integro: true, coleccionista: true, final_secreto: true, brutus: true });
  S = iniciar("Logros"); frames(40); foto("logros_p1"); S.pag = 4; S.pagina(); frames(3); foto("logros_p5");
  // verificacion de fugas: objetos vivos por escena
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, JSON.stringify({ W, H, snaps }, null, 0));
  console.log("fotos:", Object.keys(snaps).length, "->", salida);
})();
function U_cola(S) { S.u.cola.push("Logro: Primer semestre\nSobrevive 16 semanas."); }
