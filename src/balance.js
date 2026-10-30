// Simulacion de balance: 5000 partidas por bot (aleatorio, codicioso, equilibrado) usando el MOTOR REAL
// (los mismos eventos JsCode de la escena Juego) con un runtimeScene simulado.
// Uso: node balance.js [partidas_por_bot]   ->  escribe src/balance_reporte.txt
// No modifica cartas.json.
const fs = require("fs"), path = require("path");
const { construir } = require("./build.js");
const N = +process.argv[2] || 5000;
const CAP = 400;                       // semanas maximas por partida
let seed = 12345;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.gdjs = { evtTools: { runtimeScene: { replaceScene() { } } } };

const proj = construir();
const lay = proj.layouts.find(l => l.name === "Juego");
const codigos = [];
(function rec(evs) { evs.forEach(e => { if (e.type.endsWith("JsCode")) codigos.push(e.inlineCode); if (e.events) rec(e.events); }); })(lay.events);
const fns = codigos.map(c => new Function("runtimeScene", "objects", c));

function mkObj() {
  const o = { setText() { }, setCharacterSize() { }, setWrapping() { }, setWrappingWidth() { }, setPosition() { }, setAnimationName() { }, hasAnimationNamed() { return false; },
    setOpacity() { }, setZOrder() { }, getZOrder() { return 0; }, setAngle() { }, getWidth() { return 100; }, getHeight() { return 100; }, setWidth() { }, setHeight() { }, hide() { }, deleteFromScene() { } };
  return o;
}
const vars = {};
const mkVar = n => ({ setNumber(v) { vars[n] = v; }, setString(v) { vars[n] = v; }, getAsString() { return String(vars[n] || ""); } });
const gm = {
  getInputManager() { return { getCursorX: () => 0, getCursorY: () => 0, isMouseButtonPressed: () => false, isKeyPressed: () => false }; },
  getGameResolutionWidth: () => 720, getGameResolutionHeight: () => 1280, getVariables() { return { get: mkVar }; },
};
const scene = { createObject: () => mkObj(), getGame: () => gm, getElapsedTime: () => 16, getLayer: () => ({ setCameraX() { }, setCameraY() { } }), getVariables() { return { get: mkVar }; } };
fns.forEach(f => f(scene));            // frame 1: inicializa el motor
const S = scene.__reigns, U = S.u;
const cartas = S.data.cartas;

// ---- bots ----
// El ruido oculto tiene media 0, asi que el valor esperado de una opcion no lo incluye (misma regla del motor: S.conRuido).
const efecto = op => {
  if (!op) return [0, 0, 0, 0];
  const e = (op.e || [0, 0, 0, 0]).slice();
  if (op.azar) {
    const p = typeof op.azar.p === "number" ? op.azar.p : 0.5, a = x => (Array.isArray(x) ? x : (x && x.e) || [0, 0, 0, 0]);
    for (let i = 0; i < 4; i++) e[i] += p * (a(op.azar.exito)[i] || 0) + (1 - p) * (a(op.azar.fallo)[i] || 0);
  }
  return e;
};
const BOTS = {
  aleatorio: c => (Math.random() < 0.5 ? c.izq : c.der),
  codicioso: c => { const s = o => efecto(o).reduce((a, b) => a + b, 0) + (o.retiro ? -99 : 0); return s(c.izq) >= s(c.der) ? c.izq : c.der; },
  equilibrado: c => {
    const costo = o => { const e = efecto(o); return S.v.reduce((a, v, i) => a + Math.pow(Math.max(0, v + e[i]) - 50, 2), 0) + (o.retiro ? 1e6 : 0); };
    return costo(c.izq) <= costo(c.der) ? c.izq : c.der;
  },
};

const rep = {};
const vistas = {};
function jugar(nombre, continuo) {
  const bot = BOTS[nombre];
  const clave = nombre + (continuo ? " (dinastia continua: el estado heredado se conserva entre partidas)" : "");
  const n = continuo ? Math.round(N / 5) : N;
  if (continuo) S.dyn = U.dynNueva();
  const R = rep[clave] = rep[clave] || { dur: [], causas: {}, tipos: {}, elecciones: 0, ganadas: 0, reelMax: [0, 0, 0, 0], reach: 0, cap: 0, destinos: {}, hist: [], met: [], brutus: 0, sucesores: {} };
  for (let g = 0; g < n; g++) {
    if (!continuo) S.dyn = U.dynNueva();
    U.borrarPartida();
    S.nuevaPartida();
    if (continuo && g === 0) S.dyn.n = 1;
    let pasos = 0, resuelta = false;
    while (!resuelta && pasos++ < 5000) {
      switch (S.estado) {
        case "carta": {
          const c = S.c;
          vistas[c.id] = (vistas[c.id] || 0) + 1;
          let op = bot(c);
          if (c.arriba && S.items[c.arriba.usa] && Math.random() < 0.5) op = c.arriba;
          S.elegir(op);
          break;
        }
        case "mini": if (S.m.fase !== "res") S.finMini(Math.random() < 0.5, ""); else S.cerrarMini(); break;
        case "informe": S.siguiente(); break;
        case "eleccion": S.elec.t = 999; S.updateEleccion(1); R.elecciones++; if (S.elec.ok) R.ganadas++; S.cerrarEleccion(); break;
        case "fin": {
          R.dur.push(S.semana);
          R.tipos[S.finTipo] = (R.tipos[S.finTipo] || 0) + 1;
          R.causas[S.finKey] = (R.causas[S.finKey] || 0) + 1;
          R.reelMax[Math.min(3, S.reel)]++;
          if (S.reel > 0 || S.finTipo === "derrota" || S.finTipo === "retiro" || S.finTipo === "limite") R.reach++;
          if (S.destinoPend) { R.destinos[S.destinoPend.id] = (R.destinos[S.destinoPend.id] || 0) + 1; R.hist.push(S.dyn.hist.length); R.met.push([S.dyn.uan.solv, S.dyn.uan.paz, S.dyn.uan.aut, S.dyn.uan.pre, S.dyn.nay.des, S.dyn.nay.seg]); }
          if (S.suc) { R.sucesores[S.suc.ganador.id] = (R.sucesores[S.suc.ganador.id] || 0) + 1; if (S.suc.brutus) R.brutus++; }
          resuelta = true; break;
        }
        default: resuelta = true;
      }
      if (S.semana >= CAP && S.estado !== "fin") { R.dur.push(S.semana); R.cap++; R.reelMax[Math.min(3, S.reel)]++; resuelta = true; }
    }
  }
}
Object.keys(BOTS).forEach(b => jugar(b, false));
Object.keys(BOTS).forEach(b => jugar(b, true));

// ---- analisis ----
const media = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const mediana = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };
const L = [];
L.push("REPORTE DE BALANCE — " + N + " partidas por bot (motor real, semilla fija). Cap por partida: " + CAP + " semanas.");
L.push("Cartas en el mazo: " + cartas.length + ". Candidatos: " + (S.data.candidatos || []).length + ".");
L.push("");
Object.keys(rep).forEach(b => {
  const R = rep[b];
  L.push("=== Bot " + b + " ===");
  L.push("Duracion (semanas): media " + media(R.dur).toFixed(1) + ", mediana " + mediana(R.dur) + ", max " + Math.max(...R.dur) + ", llegan al cap: " + R.cap);
  const causas = Object.keys(R.causas).sort((x, y) => R.causas[y] - R.causas[x]);
  L.push("Causas de fin: " + causas.map(k => k + " " + (100 * R.causas[k] / R.dur.length).toFixed(1) + "%").join(", "));
  const stat = { acad: 0, est: 0, fin: 0, pol: 0 };
  Object.keys(R.causas).forEach(k => { const m = /^(acad|est|fin|pol)[01]/.exec(k); if (m) stat[m[1]] += R.causas[k]; });
  const mk = Object.keys(stat).sort((x, y) => stat[y] - stat[x])[0];
  L.push("Stat que mas mata: " + mk + " (" + (100 * stat[mk] / R.dur.length).toFixed(1) + "% de las partidas). Por stat: " + Object.keys(stat).map(k => k + " " + stat[k]).join(", "));
  L.push("Tipos de fin: " + Object.keys(R.tipos).map(k => k + " " + R.tipos[k]).join(", "));
  L.push("Elecciones: " + R.elecciones + ", ganadas " + R.ganadas + " (" + (100 * R.ganadas / Math.max(1, R.elecciones)).toFixed(1) + "%). Partidas por reelecciones logradas [0,1,2,3+]: " + R.reelMax.join(","));
  L.push("Sucesores: " + Object.keys(R.sucesores).map(k => k + " " + R.sucesores[k]).join(", ") + ". Brutus: " + R.brutus);
  L.push("");
});
L.push("=== OBJETIVOS (bots de la partida simple) ===");
const stk = ["acad0","acad100","est0","est100","fin0","fin100","pol0","pol100"];
const pct = (a, b) => (100 * a / Math.max(1, b)).toFixed(1) + "%";
const shareMax = R => { const tot = stk.reduce((a, k) => a + (R.causas[k] || 0), 0); const m = stk.map(k => [k, R.causas[k] || 0]).sort((x, y) => y[1] - x[1])[0]; return pct(m[1], tot) + " (" + m[0] + ")"; };
const ra = rep["aleatorio"], rc = rep["codicioso"], re = rep["equilibrado"];
const sd = R => stk.reduce((a, k) => a + (R.causas[k] || 0), 0);
L.push("Aleatorio: media " + media(ra.dur).toFixed(1) + " sem (objetivo 30-45).");
L.push("Equilibrado: llega a la 1.a eleccion " + pct(re.reach, re.dur.length) + " (objetivo >60%); muertes por stat " + pct(sd(re), re.dur.length) + " (objetivo >25%); elecciones ganadas " + pct(re.ganadas, re.elecciones) + " (objetivo 45-65%).");
L.push("Muerte extrema mas frecuente, como % de las muertes por stat: aleatorio " + shareMax(ra) + ", codicioso " + shareMax(rc) + ", equilibrado " + shareMax(re) + ".");
const pool = {}; stk.forEach(k => { pool[k] = (ra.causas[k] || 0) + (rc.causas[k] || 0) + (re.causas[k] || 0); }); const pt = stk.reduce((a, k) => a + (pool[k] || 0), 0);
L.push("Reparto agrupado de los 3 bots por extremo: " + stk.map(k => k + " " + pct(pool[k] || 0, pt)).join(", ") + ".");
L.push("Brutus (% de sucesiones): aleatorio " + pct(ra.brutus, ra.dur.length) + ", codicioso " + pct(rc.brutus, rc.dur.length) + ", equilibrado " + pct(re.brutus, re.dur.length) + ".");
L.push("mx_est_obra: " + (vistas["mx_est_obra"] || 0) + " apariciones en " + (3 * N) + " partidas (" + ((vistas["mx_est_obra"] || 0) / (3 * N)).toFixed(2) + " por partida).");
L.push("");
L.push("=== DESTINOS DE LA UAN Y NAYARIT (dinastia continua: historias terminadas) ===");
Object.keys(rep).filter(k => /continua/.test(k)).forEach(k => {
  const R = rep[k], tot = Object.keys(R.destinos).reduce((a, d) => a + R.destinos[d], 0);
  L.push(k.split(" ")[0] + ": " + tot + " historias, directores por historia: media " + media(R.hist).toFixed(1) + ", min " + (R.hist.length ? Math.min(...R.hist) : 0) + ", max " + (R.hist.length ? Math.max(...R.hist) : 0) +
    " | medidores finales medios [solv,paz,aut,pre,des,seg]: " + [0, 1, 2, 3, 4, 5].map(i => media(R.met.map(m => m[i])).toFixed(0)).join("/") + " | destinos: " + Object.keys(R.destinos).sort((a, b) => R.destinos[b] - R.destinos[a]).map(d => d + " " + pct(R.destinos[d], tot)).join(", "));
});
L.push("");
const nunca = cartas.filter(c => !vistas[c.id]).map(c => c.id + (c.solo_luego ? "(solo_luego)" : ""));
L.push("=== Cartas NUNCA vistas (" + nunca.length + ") ===");
L.push(nunca.join(", ") || "(ninguna)");
L.push("");
const orden = cartas.map(c => [c.id, vistas[c.id] || 0]).sort((a, b) => b[1] - a[1]);
L.push("Cartas mas frecuentes: " + orden.slice(0, 10).map(x => x.join(" ")).join(", "));
L.push("Cartas menos frecuentes (vistas): " + orden.filter(x => x[1] > 0).slice(-10).map(x => x.join(" ")).join(", "));
L.push("");
// dominantes: una opcion es mejor o igual en todo y estrictamente mejor en algo
const dom = [];
cartas.forEach(c => {
  const a = efecto(c.izq), b = efecto(c.der), ai = c.izq.int || 0, bi = c.der.int || 0;
  const ge = (x, y, xi, yi) => x.every((v, i) => v >= y[i]) && xi >= yi && (x.some((v, i) => v > y[i]) || xi > yi);
  if (ge(a, b, ai, bi)) dom.push(c.id + " (izq domina)");
  else if (ge(b, a, bi, ai)) dom.push(c.id + " (der domina)");
});
L.push("=== Cartas con opcion dominante (" + dom.length + ") ===");
L.push(dom.join(", ") || "(ninguna)");
L.push("");
// suma neta de efectos: cartas muy sesgadas
const sesgo = cartas.map(c => [c.id, efecto(c.izq).reduce((x, y) => x + y, 0), efecto(c.der).reduce((x, y) => x + y, 0)]);
const mejoran = sesgo.filter(x => x[1] > 6 && x[2] > 6).map(x => x[0]);
const empeoran = sesgo.filter(x => x[1] < -6 && x[2] < -6).map(x => x[0]);
L.push("Cartas donde AMBAS opciones suben mucho (>6 neto): " + (mejoran.join(", ") || "(ninguna)"));
L.push("Cartas donde AMBAS opciones bajan mucho (<-6 neto): " + (empeoran.join(", ") || "(ninguna)"));
fs.writeFileSync(path.join(__dirname, "balance_reporte.txt"), L.join("\n") + "\n");
console.log(L.join("\n"));
