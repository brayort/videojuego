// Lint de contenido: revisa src/historia/ (cartas por tipo, cadenas, finales...) y src/cinematicas.json contra el esquema (src/ESQUEMA.md)
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
const PLACE = ["n", "ant", "causa", "antsem", "dir", "ex", "jugador", "evento", "suc", "sem", "fecha"];
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
    if (g("destino") && !(D.destinos || []).some(x => x.id === g("destino"))) E(donde, pre + "destino '" + g("destino") + "' no existe en destinos");
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
  // REGLA de reparto: entre los personajes con sprite (aliados y anfitriona) el que mas cartas tiene y el que menos no pueden diferir en mas de 4.
  // Quedan fuera el director (jugador) y los villanos (antagonistas). Para cumplirla se AGREGAN cartas a los que tienen menos; nunca se quitan.
  {
    const fi = D.fichas || {}, rolDe = id => (fi[id] || {}).rol, cnt = {};
    Object.keys(pjs).filter(id => ["aliado", "anfitriona"].includes(rolDe(id))).forEach(id => { cnt[id] = 0; });
    cartas.forEach(c => { if (cnt[c.pj] !== undefined) cnt[c.pj]++; });
    const v = Object.entries(cnt).sort((a, b) => a[1] - b[1]);
    if (v.length && v[v.length - 1][1] - v[0][1] > 4) {
      const max = v[v.length - 1][1], faltan = v.filter(x => x[1] < max - 4).map(x => pjs[x[0]] + " (" + x[1] + ", faltan " + (max - 4 - x[1]) + ")");
      E("reparto de personajes", "mas de 4 cartas de diferencia: " + pjs[v[v.length - 1][0]] + " tiene " + max + " y " + pjs[v[0][0]] + " solo " + v[0][1] + ". Agrega cartas a: " + faltan.join(", "));
    }
  }
  // semestres (mundo.json > uan.semestres): interludio, periodico, banderas de capitulo y cartas de noticias extra
  ((D.uan && D.uan.semestres) || []).forEach((e, i) => {
    const donde = "semestre " + (i + 1);
    [e.cine, e.diario].filter(Boolean).forEach(id => { cineUsado.add(id); if (!cines[id]) E(donde, "la cinematica '" + id + "' no existe"); });
    (e.noticias || []).forEach(id => { if (!porId[id]) E(donde, "la carta de noticias '" + id + "' no existe"); else { destinosLuego.add(id); if (!porId[id].extra) A(donde, "la noticia '" + id + "' deberia llevar extra:true (no gastar semana)"); } });
    (e.set || []).forEach(f => { if (!setF.has(f)) setF.set(f, [donde]); });
  });
  // las decisiones de las cinematicas (linea "elige") tambien encolan cartas con luego
  Object.values(cines).forEach(g => (g.lineas || []).forEach(ln => ["izq", "der"].forEach(lado => { const op = ln.elige && ln.elige[lado]; if (op) [].concat(op.luego || []).forEach(l => l && l.carta && destinosLuego.add(l.carta)); })));
  cartas.forEach(c => { if (c.solo_luego && !destinosLuego.has(c.id)) E("carta " + c.id, "solo_luego, pero ninguna opcion la encola con luego: nunca sale"); });
  leeF.forEach((donde, f) => {
    if (delMotor(f) || setF.has(f)) return;
    E(donde[0], "requiere la bandera '" + f + "', que nada pone (" + donde.length + " uso" + (donde.length > 1 ? "s" : "") + ")");
  });
  setF.forEach((donde, f) => { if (!leeF.has(f) && donde[0] !== "motor" && !delMotor(f)) N(donde[0], "bandera '" + f + "' se pone pero ninguna carta la lee"); });
  estadosQuita.forEach(([q, donde]) => { if (!estadosDef.has(q)) A(donde, "quita '" + q + "', estado que ninguna opcion crea"); });

  // ---- tipos de carta y cadenas (mini historias) ----
  const clasif = require("./historia.js").clasificar;
  const luegos = (o, acc) => { if (o && typeof o === "object") Object.keys(o).forEach(k => { if (k === "luego") [].concat(o[k]).forEach(l => l && l.carta && acc.push(l.carta)); else luegos(o[k], acc); }); return acc; };
  const cadenas = {}, encoladoPor = {};
  cartas.forEach(c => {
    if (c.cadena) (cadenas[c.cadena] = cadenas[c.cadena] || []).push(c);
    luegos({ izq: c.izq, der: c.der, arriba: c.arriba }, []).forEach(t => (encoladoPor[t] = encoladoPor[t] || []).push(c));
  });
  Object.keys(cadenas).forEach(id => {
    const cs = cadenas[id], donde = "cadena " + id, ids = new Set(cs.map(c => c.id));
    if (!(D.cadenas || {})[id]) A(donde, "sin titulo/resumen (src/historia/cartas/cadenas/" + id + ".json)");
    if (cs.length < 2) A(donde, "una cadena necesita al menos 2 cartas (tiene " + cs.length + ")");
    const entrada = cs.filter(c => !c.solo_luego), desdeFuera = cs.some(c => (encoladoPor[c.id] || []).some(o => !ids.has(o.id)));
    if (!entrada.length && !desdeFuera) A(donde, "ninguna carta es de entrada (todas solo_luego) y nada de fuera la inicia");
    cs.forEach(c => luegos({ izq: c.izq, der: c.der, arriba: c.arriba }, []).forEach(t => {
      const d = porId[t]; if (d && d.cadena && d.cadena !== id) A("carta " + c.id, "encola '" + t + "' de OTRA cadena (" + d.cadena + "); una cadena debe cerrarse sobre si misma");
    }));
  });
  cartas.filter(c => clasif(c) === "consecuencia").forEach(c => {
    const quien = (encoladoPor[c.id] || []).filter(o => o.cadena), cads = new Set(quien.map(o => o.cadena));
    if (quien.length && quien.length === (encoladoPor[c.id] || []).length && cads.size === 1) A("carta " + c.id, "solo la encolan cartas de la cadena '" + [...cads][0] + "': marcala con \"cadena\" para que viva en esa mini historia");
  });

  // ---- assets ----
  const usados = new Set(Object.keys(pjs));
  usados.forEach(p => {
    if (!assets.retratos.includes(p)) A("personaje " + p, "sin retrato (assets/placeholder/retratos/" + p + ".png); se usa default");
  });
  const nuncaUsados = Object.keys(pjs).filter(p => !cartas.some(c => c.pj === p) && !(D.candidatos || []).some(c => c.pj === p));
  nuncaUsados.forEach(p => A("personaje " + p, "ninguna carta lo usa"));

  // ---- nombres de personajes: cada uno con un nombre unico en pantalla ----
  { const nom = {}, add = (id, n) => { if (!n || /\{/.test(n)) return; (nom[n] = nom[n] || new Set()).add(id); };
    Object.entries(D.personajes || {}).forEach(([id, n]) => add(id, n));
    Object.entries(((D.menu || {}).personajes) || {}).forEach(([id, p]) => add(id, p.nombre));
    Object.keys(nom).forEach(n => { if (nom[n].size > 1) E("personajes", "nombre repetido '" + n + "' en: " + [...nom[n]].join(", ") + " (cambialo en la pestana Personajes del editor)"); });
    Object.keys(D.fichas || {}).forEach(id => { if (!(D.personajes || {})[id] && !(((D.menu || {}).personajes) || {})[id]) A("ficha " + id, "la ficha no corresponde a ningun personaje de cartas ni del menu"); });
    const u = D.uan || {}; if (u.retrato_director && !assets.retratos.includes(u.retrato_director)) A("uan", "retrato_director '" + u.retrato_director + "' no existe en assets/placeholder/retratos"); }

  // ---- menu (portada): personajes que saludan, sus frases y eventos especiales ----
  if (D.menu) {
    const MN = D.menu, pm = MN.personajes || {}, EFECTOS = ["giro", "gigante", "fantasma", "glitch", "temblor"], LIM = 84;
    if (MN.anfitrion && !pm[MN.anfitrion]) E("menu", "anfitrion '" + MN.anfitrion + "' no existe en menu.personajes");
    if (MN.ventana !== undefined && !(Number.isInteger(MN.ventana) && MN.ventana >= 0)) E("menu", "ventana debe ser un entero >= 0");
    if ((MN.ventana || 10) > Object.keys(pm).length - 2) A("menu", "ventana (" + (MN.ventana || 10) + ") es muy grande para " + Object.keys(pm).length + " personajes: se ajusta sola, pero casi no habra aleatoriedad");
    ["prob_rara", "prob_especial"].forEach(k => { if (MN[k] !== undefined && !(MN[k] >= 0 && MN[k] <= 1)) E("menu", k + " debe estar entre 0 y 1"); });
    Object.keys(pm).forEach(id => {
      const p = pm[id], d = "menu " + id;
      if (!assets.retratos.includes(id)) A(d, "sin retrato (assets/placeholder/retratos/" + id + ".png; importalo con tools/importar_sprites.py)");
      if (!p.nombre) A(d, "sin nombre para la placa");
      if (p.peso !== undefined && !(p.peso > 0)) E(d, "peso debe ser un numero mayor que 0");
      if (p.ventana !== undefined && !(Number.isInteger(p.ventana) && p.ventana >= 0)) E(d, "ventana debe ser un entero >= 0 (apariciones de descanso antes de volver a salir)");
      if (p.garantia !== undefined && !(Number.isInteger(p.garantia) && p.garantia >= 2)) E(d, "garantia debe ser un entero >= 2 (cambios de personaje sin salir antes de forzarlo)");
      if (!Array.isArray(p.frases) || !p.frases.length) E(d, "necesita al menos una frase en 'frases'");
      [].concat(p.frases || [], p.raras || []).forEach(t => {
        if (typeof t !== "string" || !t.trim()) E(d, "frase vacia");
        else if (t.length > LIM) A(d, "frase larga (" + t.length + " letras; el recuadro cabe en 2 lineas, ~" + LIM + "): " + t.slice(0, 30) + "...");
      });
    });
    (MN.especiales || []).forEach((e, i) => {
      if (!e.texto) E("menu especial #" + (i + 1), "sin texto");
      else if (e.texto.length > LIM) A("menu especial #" + (i + 1), "frase larga (" + e.texto.length + " letras)");
      if (e.efecto && !EFECTOS.includes(e.efecto)) E("menu especial #" + (i + 1), "efecto desconocido '" + e.efecto + "' (usa " + EFECTOS.join(", ") + ")");
    });
  }

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
        const d = donde + " linea " + (i + 1), tipos = ["texto", "narra", "titulo", "gag", "elige", "periodico"].filter(k => ln[k] !== undefined);
        if (tipos.length !== 1) E(d, "cada linea necesita exactamente uno de texto / narra / titulo / gag / elige / periodico");
        if (ln.periodico !== undefined) {   // periodico: {nombre, fecha, notas:[{h, t}]}
          const pe = ln.periodico || {};
          if (!Array.isArray(pe.notas) || !pe.notas.length) E(d, "periodico necesita notas [{h, t}]");
          (pe.notas || []).forEach((n, k) => { if (!n.h || !n.t) E(d, "periodico nota " + (k + 1) + " necesita h (titular) y t (texto)"); else { if (n.h.length > 75) A(d, "titular largo (" + n.h.length + " letras)"); if (n.t.length > 190) A(d, "nota larga (" + n.t.length + " letras)"); } });
        }
        if (ln.elige !== undefined) {   // decision: {id, texto, izq, der}; las opciones son opciones normales del juego
          const el = ln.elige || {};
          if (!el.id) E(d, "elige necesita un id (evita repetir la decision)");
          if (!el.texto) E(d, "elige necesita texto (la pregunta)"); else if (el.texto.length > 100) A(d, "pregunta larga (" + el.texto.length + " letras): puede no caber en el panel");
          ["izq", "der"].forEach(lado => {
            const op = el[lado];
            if (!op || !op.t) return E(d, "elige." + lado + " necesita una opcion con texto (t)");
            if (op.t.length > 90) A(d, "elige." + lado + ": texto de boton largo (" + op.t.length + " letras)");
            [].concat(op.luego || []).forEach(l => { if (l && l.carta && !porId[l.carta]) E(d, "elige." + lado + ": la carta '" + l.carta + "' (luego) no existe"); });
            Object.keys(op.af || {}).forEach(p => { if (!pjs[p]) E(d, "elige." + lado + ": af con personaje '" + p + "' que no existe"); });
          });
        }
        if (ln.gag !== undefined && !(+ln.gag > 0)) E(d, "gag debe ser un numero de segundos > 0");
        if (ln.entra !== undefined && !["lado", "caer", "pop"].includes(ln.entra)) E(d, "entra debe ser lado, caer o pop");
        const lados = ["izq", "der", "centro"], porLado = v => (typeof v === "string" ? null : v || {});
        const animas = ["salto", "brinco", "temblor", "giro", "gigante", "latido", "balanceo", "cabeceo", "no", "huir", "susto", "desmayo", "levanta", "derrumbe", "asciende", "baile", "saludo", "risa", "aplauso", "furia", "pensar", "nada"];
        [["anima", ln.anima], ["emote", ln.emote]].forEach(([nom, v]) => {
          if (v === undefined) return;
          if (typeof v === "string") { if (!ln.pj && !ln.lado) E(d, nom + " como texto necesita pj/lado (o usa un objeto {izq,der,centro})"); }
          else Object.keys(porLado(v)).forEach(k => { if (!lados.includes(k)) E(d, nom + ": lado '" + k + "' no es izq, der ni centro"); });
          const vals = typeof v === "string" ? [v] : Object.values(v);
          if (nom === "anima") vals.forEach(a => { if (!animas.includes(a)) E(d, "anima '" + a + "' desconocida (" + animas.join(", ") + ")"); });
          else vals.forEach(a => { if (String(a).length > 8) A(d, "emote '" + a + "' largo: el globo es corto (max. 8 letras)"); });
        });
        if (ln.parte !== undefined) [].concat(ln.parte).forEach(t => { if (!["confeti", "papeles", "chispas", "polvo", "lluvia", "nada"].includes(t)) E(d, "parte '" + t + "' desconocida (confeti, papeles, chispas, polvo, lluvia, nada)"); });
        if (ln.texto !== undefined && !ln.pj) E(d, "dialogo sin pj (usa narra para narracion)");
        if (ln.pj && ln.pj.charAt(0) === "@") { if (!["caido", "sucesor"].includes(ln.pj.slice(1))) E(d, "pj dinamico '" + ln.pj + "' desconocido (@caido, @sucesor)"); }
        else if (ln.pj && !pjs[ln.pj] && !(CINE.nombres || {})[ln.pj]) E(d, "personaje '" + ln.pj + "' no existe (ni en personajes ni en cinematicas.json > nombres)");
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
  const D = require("./historia.js").cargar(RAIZ), CINE = leerJ(path.join(RAIZ, "src", "cinematicas.json"), null);
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
