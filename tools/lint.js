// Lint de contenido: revisa src/cartas.json y src/cinematicas.json contra el esquema (src/ESQUEMA.md)
// y contra los assets. No modifica nada.
// Uso: node tools/lint.js [--json]      (npm run lint)   Sale con codigo 1 si hay errores.
// Tambien se usa como modulo: require("./lint.js").revisar(cartas, cine) -> [{nivel, donde, msg}]
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const leerJ = (p, def) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : def);
const lsPng = d => { const p = path.join(RAIZ, "assets", "placeholder", d); return fs.existsSync(p) ? fs.readdirSync(p).filter(f => f.endsWith(".png")).map(f => f.slice(0, -4)) : []; };

const MINIS = ["presupuesto", "prensa", "plagio", "consejo"];
const MEDIDORES = ["solv", "paz", "aut", "pre", "des", "seg", "prom", "min"];
const STATS = ["acad", "est", "fin", "pol", "int"];
const PLACE = ["n", "ant", "causa", "antsem", "dir", "ex", "jugador", "evento"];
const BANDERAS_MOTOR = ["sucesor", "reforma"];       // banderas que pone el motor (20_estado.js)
const PREFIJOS_MOTOR = ["legado_", "ex_"];            // legado_* (dinastia) y ex_<tono> (ex director)
const delMotor = f => PREFIJOS_MOTOR.some(p => f.indexOf(p) === 0);
const OPS = /^(<=|>=|!=|<|>|=)\s*-?\d+(\.\d+)?$/;

function revisar(D, CINE, assets) {
  assets = assets || { retratos: lsPng("retratos"), cartas: lsPng("cartas"), fondos: lsPng("fondos"), audio: leerJ(path.join(RAIZ, "assets", "audio", "audio.json"), { sfx: {}, musica: {} }) };
  const out = [], E = (donde, msg) => out.push({ nivel: "error", donde, msg }), A = (donde, msg) => out.push({ nivel: "aviso", donde, msg }), N = (donde, msg) => out.push({ nivel: "info", donde, msg });
  const pjs = D.personajes || {}, items = D.items || {}, raros = D.finales_raros || {};
  const cines = (CINE && CINE.cinematicas) || {}, cartas = D.cartas || [];
  const porId = {}, setF = new Map(), leeF = new Map(), destinosLuego = new Set(), estadosDef = new Set(), estadosQuita = [], cineUsado = new Set();
  const nota = (m, f, donde) => { if (!m.has(f)) m.set(f, []); m.get(f).push(donde); };
  BANDERAS_MOTOR.forEach(f => nota(setF, f, "motor"));

  const textos = (s, donde) => {
    if (typeof s !== "string") return;
    (s.match(/\{(\w+)\}/g) || []).forEach(m => { if (!PLACE.includes(m.slice(1, -1))) A(donde, "marcador desconocido " + m); });
  };
  const umbral = (o, claves, donde, campo) => {
    if (!o) return;
    Object.keys(o).forEach(k => {
      if (!claves.includes(k)) E(donde, campo + ": clave desconocida '" + k + "'");
      if (!OPS.test(String(o[k]).trim())) E(donde, campo + "." + k + ": umbral invalido '" + o[k] + "'");
    });
  };
  const condiciones = (c, donde) => {
    [].concat(c.req || []).forEach(f => nota(leeF, f, donde));
    [].concat(c.noreq || []).forEach(f => nota(leeF, f, donde));
    [].concat(c.reqitem || []).forEach(i => { if (!items[i]) E(donde, "reqitem '" + i + "' no existe en items"); });
    umbral(c.si, STATS, donde, "si"); umbral(c.uansi, MEDIDORES, donde, "uansi");
    ["afmin", "afmax"].forEach(k => c[k] && Object.keys(c[k]).forEach(p => { if (!pjs[p]) E(donde, k + ": personaje '" + p + "' no existe"); }));
    const era = /^\d{4}-(0[1-9]|1[0-2])$/;
    ["desde", "hasta"].forEach(k => { if (c[k] && !era.test(c[k])) E(donde, k + " debe ser AAAA-MM: '" + c[k] + "'"); });
    if (c.desde && c.hasta && c.desde > c.hasta) E(donde, "desde (" + c.desde + ") es posterior a hasta (" + c.hasta + ")");
    if (typeof c.semmin === "number" && typeof c.semmax === "number" && c.semmin > c.semmax) E(donde, "semmin > semmax");
    if (c.de && !(D.candidatos || []).some(x => x.id === c.de)) E(donde, "de: candidato '" + c.de + "' no existe");
  };
  // Efectos de una opcion (o de un resultado de azar/minijuego, con prefijo bien_/mal_).
  const efectos = (o, donde, pre) => {
    if (!o || typeof o !== "object") return;
    pre = pre || "";
    const g = k => o[pre + k];
    if (g("e") !== undefined && (!Array.isArray(g("e")) || g("e").length !== 4 || g("e").some(x => typeof x !== "number"))) E(donde, pre + "e debe ser [acad, est, fin, pol] numericos");
    if (Array.isArray(g("e")) && g("e").some(x => Math.abs(x) > 40)) A(donde, pre + "e tiene un cambio mayor que 40");
    if (g("uan") !== undefined && (!Array.isArray(g("uan")) || g("uan").length !== 4)) E(donde, pre + "uan debe tener 4 valores");
    if (g("nay") !== undefined && (!Array.isArray(g("nay")) || g("nay").length !== 2)) E(donde, pre + "nay debe tener 2 valores");
    [].concat(g("set") || []).forEach(f => nota(setF, f, donde));
    [].concat(g("unset") || []).forEach(f => nota(leeF, f, donde));
    if (g("item") && !items[g("item")]) E(donde, pre + "item '" + g("item") + "' no existe en items");
    if (g("usa") && !items[g("usa")]) E(donde, pre + "usa '" + g("usa") + "' no existe en items");
    if (g("af")) Object.keys(g("af")).forEach(p => { if (!pjs[p]) E(donde, pre + "af: personaje '" + p + "' no existe"); });
    if (g("final") && !raros[g("final")]) E(donde, pre + "final '" + g("final") + "' no existe en finales_raros");
    if (g("estado")) { const es = g("estado"); if (!es.id) E(donde, "estado sin id"); else estadosDef.add(es.id); if (es.cada && (!Array.isArray(es.cada) || es.cada.length !== 4)) E(donde, "estado.cada debe tener 4 valores"); }
    [].concat(g("quita") || []).forEach(q => estadosQuita.push([q, donde]));
    [].concat(g("luego") || []).forEach(l => {
      if (!l || !l.carta) return E(donde, "luego sin carta");
      destinosLuego.add(l.carta);
      if (!porId[l.carta]) E(donde, "luego: la carta '" + l.carta + "' no existe");
      else if (!porId[l.carta].solo_luego) A(donde, "luego apunta a '" + l.carta + "', que no tiene solo_luego (puede salir antes al azar)");
    });
    if (g("cine")) { cineUsado.add(g("cine")); if (!cines[g("cine")]) E(donde, "cine '" + g("cine") + "' no existe en cinematicas.json"); }
  };
  const opcion = (op, donde) => {
    if (!op) return;
    if (typeof op.t !== "string" || !op.t.trim()) E(donde, "opcion sin texto 't'");
    else { textos(op.t, donde); if (op.t.length > 70) A(donde, "texto de opcion largo (" + op.t.length + " letras; la etiqueta corta en ~70)"); }
    efectos(op, donde);
    if (op.azar) {
      const z = op.azar;
      if (!(z.p > 0 && z.p < 1)) E(donde, "azar.p debe estar entre 0 y 1");
      ["exito", "fallo"].forEach(k => { const r = z[k]; if (Array.isArray(r)) efectos({ e: r }, donde + ".azar." + k); else efectos(r, donde + ".azar." + k); });
    }
    if (op.mini) {
      const tipo = typeof op.mini === "string" ? op.mini : op.mini.tipo;
      if (!MINIS.includes(tipo)) E(donde, "minijuego desconocido '" + tipo + "'");
      if (typeof op.mini === "object") { efectos(op.mini, donde + ".mini", "bien_"); efectos(op.mini, donde + ".mini", "mal_"); }
    }
  };

  // ---- cartas ----
  cartas.forEach((c, i) => {
    const donde = "carta " + (c.id || "#" + i);
    if (!c.id) E(donde, "carta sin id");
    else if (porId[c.id]) E(donde, "id duplicado");
    else porId[c.id] = c;
  });
  cartas.forEach((c, i) => {
    const donde = "carta " + (c.id || "#" + i);
    if (!pjs[c.pj]) E(donde, "personaje '" + c.pj + "' no existe en personajes");
    if (typeof c.texto !== "string" || !c.texto.trim()) E(donde, "carta sin texto");
    else { textos(c.texto, donde); if (c.texto.length > 330) A(donde, "texto largo (" + c.texto.length + " letras): puede no caber en la carta"); }
    if (!c.izq || !c.der) E(donde, "faltan opciones izq/der");
    opcion(c.izq, donde + ".izq"); opcion(c.der, donde + ".der");
    if (c.arriba) { opcion(c.arriba, donde + ".arriba"); if (!c.arriba.usa && !c.reqitem) A(donde, "opcion arriba sin 'usa' ni 'reqitem' (normalmente requiere un expediente)"); }
    condiciones(c, donde);
    if (c.cine) { cineUsado.add(c.cine); if (!cines[c.cine]) E(donde, "cine '" + c.cine + "' no existe en cinematicas.json"); }
  });
  Object.keys(raros).forEach(k => condiciones(raros[k], "final_raro " + k));
  (D.candidatos || []).forEach(c => { if (!pjs[c.pj]) E("candidato " + c.id, "personaje '" + c.pj + "' no existe"); });

  // ---- alcanzabilidad ----
  cartas.forEach(c => { if (c.solo_luego && !destinosLuego.has(c.id)) E("carta " + c.id, "solo_luego, pero ninguna opcion la encola con luego: nunca sale"); });
  leeF.forEach((donde, f) => {
    if (delMotor(f) || setF.has(f)) return;
    E(donde[0], "requiere la bandera '" + f + "', que nada pone (" + donde.length + " uso" + (donde.length > 1 ? "s" : "") + ")");
  });
  setF.forEach((donde, f) => { if (!leeF.has(f) && donde[0] !== "motor" && !delMotor(f)) N(donde[0], "bandera '" + f + "' se pone pero ninguna carta la lee"); });
  estadosQuita.forEach(([q, donde]) => { if (!estadosDef.has(q)) A(donde, "quita '" + q + "', estado que ninguna opcion crea"); });

  // ---- assets ----
  const usados = new Set(Object.keys(pjs));
  usados.forEach(p => {
    if (!assets.retratos.includes(p)) A("personaje " + p, "sin retrato (assets/placeholder/retratos/" + p + ".png); se usa default");
    if (!assets.cartas.includes(p)) A("personaje " + p, "sin carta (assets/placeholder/cartas/" + p + ".png)");
  });
  const nuncaUsados = Object.keys(pjs).filter(p => !cartas.some(c => c.pj === p) && !(D.candidatos || []).some(c => c.pj === p));
  nuncaUsados.forEach(p => A("personaje " + p, "ninguna carta lo usa"));

  // ---- cinematicas ----
  if (CINE) {
    const disp = CINE.disparos || {}, sfx = Object.keys(assets.audio.sfx || {}), mus = Object.keys(assets.audio.musica || {});
    Object.keys(disp).forEach(k => { cineUsado.add(disp[k]); if (!cines[disp[k]]) E("disparo " + k, "apunta a la cinematica '" + disp[k] + "', que no existe"); });
    Object.keys(cines).forEach(id => {
      const g = cines[id], donde = "cine " + id;
      if (!cineUsado.has(id)) A(donde, "ningun disparo, carta u opcion la usa");
      if (!Array.isArray(g.lineas) || !g.lineas.length) return E(donde, "sin lineas");
      const fondo = f => { if (f && !assets.fondos.includes(f)) A(donde, "fondo '" + f + "' no existe en assets/placeholder/fondos"); };
      const musica = m => { if (m && !mus.includes(m)) E(donde, "musica '" + m + "' no existe en audio.json"); };
      fondo(g.fondo); musica(g.musica);
      g.lineas.forEach((ln, i) => {
        const d = donde + " linea " + (i + 1), tipos = ["texto", "narra", "titulo"].filter(k => ln[k] !== undefined);
        if (tipos.length !== 1) E(d, "cada linea necesita exactamente uno de texto / narra / titulo");
        if (ln.texto !== undefined && !ln.pj) E(d, "dialogo sin pj (usa narra para narracion)");
        if (ln.pj && !pjs[ln.pj]) E(d, "personaje '" + ln.pj + "' no existe");
        if (ln.lado && !["izq", "der", "centro"].includes(ln.lado)) E(d, "lado debe ser izq, der o centro");
        if (ln.sfx && !sfx.includes(ln.sfx)) E(d, "sfx '" + ln.sfx + "' no existe en audio.json");
        fondo(ln.fondo); musica(ln.musica);
        [ln.texto, ln.narra, ln.titulo, ln.sub, ln.nombre].forEach(s => textos(s, d));
        const s = ln.texto || ln.narra || "";
        if (s.length > 260) A(d, "texto largo (" + s.length + " letras): puede no caber en la caja");
      });
    });
  }
  return out;
}
module.exports = { revisar };

if (require.main === module) {
  const D = leerJ(path.join(RAIZ, "src", "cartas.json")), CINE = leerJ(path.join(RAIZ, "src", "cinematicas.json"), null);
  const r = revisar(D, CINE);
  if (process.argv.includes("--json")) { console.log(JSON.stringify(r, null, 1)); process.exit(r.some(x => x.nivel === "error") ? 1 : 0); }
  const err = r.filter(x => x.nivel === "error"), av = r.filter(x => x.nivel === "aviso"), inf = r.filter(x => x.nivel === "info");
  const verTodo = process.argv.includes("--todo");
  [["ERRORES", err], ["AVISOS", av]].concat(verTodo ? [["INFO", inf]] : []).forEach(([t, l]) => {
    if (!l.length) return;
    console.log("\n" + t + " (" + l.length + ")");
    (verTodo || t === "ERRORES" ? l : l.slice(0, 40)).forEach(x => console.log("  " + x.donde + ": " + x.msg));
    if (!verTodo && t === "AVISOS" && l.length > 40) console.log("  ... y " + (l.length - 40) + " mas (usa --todo)");
  });
  console.log("\n" + (D.cartas || []).length + " cartas · " + err.length + " errores · " + av.length + " avisos · " + inf.length + " info" + (verTodo ? "" : " (--todo para verlos)"));
  process.exit(err.length ? 1 : 0);
}
