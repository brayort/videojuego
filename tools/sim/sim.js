// Simulador headless de las escenas Menu / Juego / Logros de game.json.
// Uso: node sim.js [semilla] [frames] [ruta_game.json]
const path = process.argv[4] || require("path").join(__dirname, "..", "..", "game.json");
const g = JSON.parse(require("fs").readFileSync(path, "utf8"));
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const W = 720, H = 1280;
let seed = +process.argv[2] || 1;
const R = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
Math.random = R;   // reproducible

function recoger(evs, out) { evs.forEach(e => { if (e.type.endsWith("JsCode")) out.push(e.inlineCode); if (e.events) recoger(e.events, out); }); return out; }
const layouts = {};
g.layouts.forEach(l => { layouts[l.name] = { fns: recoger(l.events, []).map(c => new Function("runtimeScene", "objects", c)), known: new Set(l.objects.map(o => o.name)), vars: l.variables }; });

const gvars = {};
g.variables.forEach(v => { gvars[v.name] = String(v.value); });
function mkVar(map, n) {
  return { setNumber(v) { map[n] = v; }, setString(v) { map[n] = v; }, getAsString() { return String(map[n] === undefined ? "" : map[n]); } };
}
let mouse = false, cx = 0, cy = 0, keys = {};
let cambio = null;
global.gdjs = { evtTools: { runtimeScene: { replaceScene(sc, nombre) { cambio = nombre; } } } };
const gm = {
  getInputManager() { return { getCursorX: () => cx, getCursorY: () => cy, isMouseButtonPressed: () => mouse, isKeyPressed: k => !!keys[k] }; },
  getGameResolutionWidth: () => W, getGameResolutionHeight: () => H,
  getVariables() { return { get: n => mkVar(gvars, n) }; },
};
function mkObj(name, sc) {
  const o = {
    name, deleted: false, w: 100, h: 100, txt: "", anim: null, opacity: 255, x: 0, y: 0, hidden: false,
    setText(s) { chk(); if (typeof s !== "string") throw new Error("text not string " + name); o.txt = s; },
    setCharacterSize() { chk(); }, setWrapping() { }, setWrappingWidth() { },
    setPosition(x, y) { chk(); if (!isFinite(x) || !isFinite(y)) throw new Error("NaN pos " + name); o.x = x; o.y = y; },
    setAnimationName(a) { chk(); o.anim = a; }, hasAnimationNamed() { return false; }, setOpacity(v) { chk(); o.opacity = v; },
    setZOrder() { }, getZOrder() { return 0; }, setAngle() { }, getWidth() { return o.w; }, getHeight() { return o.h; },
    setWidth(w) { o.w = w; }, setHeight(h) { o.h = h; }, hide(v) { chk(); o.hidden = v; },
    deleteFromScene(s) { if (o.deleted) throw new Error("double delete " + name); o.deleted = true; s.objs.delete(o); },
  };
  function chk() { if (o.deleted) throw new Error("use after delete " + name); }
  return o;
}
function mkScene(nombre) {
  const L = layouts[nombre], vars = {};
  L.vars.forEach(v => { vars[v.name] = v.value; });
  return {
    nombre, objs: new Set(), el: 16.6, vars,
    createObject(n) { if (!L.known.has(n)) throw new Error("objeto desconocido " + n + " en " + nombre); const o = mkObj(n, this); this.objs.add(o); return o; },
    getGame() { return gm; }, getElapsedTime() { return this.el; }, getLayer() { return { setCameraX() { }, setCameraY() { } }; },
    getVariables() { return { get: n => mkVar(vars, n) }; },
  };
}

const frames = +process.argv[3] || 4000;
const seen = { escenas: {}, estados: {}, minis: {}, ok: {}, cambios: 0, elecciones: 0, reelectos: 0, sucesiones: 0, retiros: 0, azar: 0, derrotas: 0 };
let scene = mkScene("Menu"), cur = "Menu";
function paso(f) {
  cambio = null;
  scene.el = R() < 0.2 ? 400 : 16.6;
  if (R() < 0.05) mouse = !mouse;
  if (R() < 0.5) { cx = R() * W; cy = R() * H; }
  if (mouse && R() < 0.3) cx = Math.max(0, Math.min(W, cx + (R() - 0.5) * 300));
  keys = {};
  [13, 27, 32, 37, 38, 39, 40, 49, 50, 51].forEach(k => { if (R() < (k === 27 ? 0.004 : 0.03)) keys[k] = true; });
  // empuja las elecciones en algunas corridas para que ocurran siempre
  const S0 = scene.__reigns;
  if (S0 && S0.listo && cur === "Juego" && S0.estado === "carta" && f % 150 === 0 && S0.semana < S0.eleccionEn - 9) { S0.semana = S0.eleccionEn - 9; }
  layouts[cur].fns.forEach(fn => fn(scene));
  seen.escenas[cur] = (seen.escenas[cur] || 0) + 1;
  const S = scene.__reigns;
  if (cur === "Juego" && S && S.listo) {
    seen.estados[S.estado] = (seen.estados[S.estado] || 0) + 1;
    if (S.m) { seen.minis[S.m.tipo] = 1; if (S.m.fase === "res") seen.ok[S.m.tipo + ":" + S.m.ok] = 1; }
    if (S.estado === "eleccion" && S.elec && !S.elec.visto) { S.elec.visto = true; seen.elecciones++; }
    if (S.estado === "sucesion" && !S.sucVisto) { S.sucVisto = true; seen.sucesiones++; }
    if (S.estado !== "sucesion") S.sucVisto = false;
    seen.azar = S.senal.azar;
    if (S.estado === "fin" && !S.finVisto) { S.finVisto = true; seen.fines = seen.fines || {}; seen.fines[S.finTipo] = (seen.fines[S.finTipo] || 0) + 1; if (S.suc && S.suc.brutus) seen.brutus = (seen.brutus || 0) + 1; }
    if (S.estado !== "fin") S.finVisto = false;
    if (S.reel > (seen.reelectos || 0)) seen.reelectos = S.reel;
  }
  if (cambio) {
    seen.cambios++;
    // la escena nueva reemplaza a la vieja: todo objeto vivo antiguo desaparece
    scene = mkScene(cambio); cur = cambio;
  }
}
for (let f = 0; f < frames; f++) {
  try { paso(f); } catch (e) { console.log("EXCEPCION frame", f, "escena", cur, e.stack.split("\n").slice(0, 5).join("\n")); process.exit(1); }
}
const S = scene.__reigns;
const vivos = scene.objs.size;
if (vivos > 400) { console.log("FUGA de objetos:", vivos); process.exit(1); }
console.log("ok seed", process.argv[2], "frames", frames, JSON.stringify(seen), "logros", Object.keys(JSON.parse(store.directorUAN_logros || "{}")).length, "objs vivos", vivos,
  cur === "Juego" ? "dir#" + S.dyn.n + " sem " + S.semana + " dir=" + S.dirId + " reel=" + S.reel : "");
// Variables de escena publicadas (muestra)
if (cur === "Juego") console.log("vars", JSON.stringify({ Estado: scene.vars.Estado, Fecha: scene.vars.Fecha, Academico: scene.vars.Academico, SemanasEleccion: scene.vars.SemanasEleccion }));
