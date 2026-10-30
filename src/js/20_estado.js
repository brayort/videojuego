// ============================================================================
// 20 ESTADO — reglas del juego: stats, afinidad, estados temporales, efectos
// retardados, azar, rasgos de director, elecciones periodicas, sucesion entre
// profesores, finales (normales y raros), guardado y partida nueva.
// Estados de pantalla (S.estado):
//   carta | informe | mini | eleccion | fin | sucesion | epilogo | pausa
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.mod_estado) {
  S.mod_estado = true;
  const U = S.u, anim = U.anim, setTxt = U.setTxt, clamp = U.clamp;

  S.STATS = ["Académico", "Estudiantes", "Finanzas", "Política"];
  S.STAT_ANIM = ["academico", "estudiantes", "finanzas", "politica"];
  S.STAT_KEY = { acad: 0, est: 1, fin: 2, pol: 3 };
  const FIN_KEYS = [["acad0", "acad100"], ["est0", "est100"], ["fin0", "fin100"], ["pol0", "pol100"]];
  const CAUSAS = {
    acad0: "el colapso académico", acad100: "una obsesión académica que ignoró a todos los demás",
    est0: "el abandono y la rebelión estudiantil", est100: "ceder a todo lo que pedían los alumnos",
    fin0: "la quiebra financiera", fin100: "acumular caja mientras la comunidad carecía de todo",
    pol0: "el aislamiento político", pol100: "someter la Unidad al poder político",
    derrota: "perder la elección de director", retiro: "un retiro digno", limite: "el límite de reelecciones",
  };
  const NOMBRES_DIR = ["Dr. Rubén Alcántar", "Mtra. Georgina Peñuelas", "Dr. Ignacio Cárdenas", "Dra. Teresa Zepeda", "Mtro. Armando Haro", "Dra. Ximena Lozoya"];
  // Elecciones
  S.MANDATO_MIN = 40; S.MANDATO_MAX = 50; S.CAMPANA = 8; S.MAX_REEL = 2;
  // [id, nombre, peso en %, personaje cuya afinidad cuenta]
  S.SECTORES = [
    ["prof", "Profesores", 30, "profesora_sni"],
    ["est", "Estudiantes", 30, "estudiante"],
    ["trab", "Trabajadores", 15, "lider_sindical"],
    ["cons", "Consejo", 25, "consejera"],
  ];
  // ventaja de cada rasgo en cada sector (prof, est, trab, cons)
  const SESGO = {
    sindicalista: [0, 0, 12, 0], tecnocrata: [10, -4, 0, 2], operador: [0, 0, 2, 12],
    idealista: [2, 12, 0, -5], veterano: [6, 0, 4, 4], hijo_exdirector: [0, 0, 0, 8],
  };

  // ---- estado de largo plazo (se cargan una vez) ----
  S.record = U.record();
  S.dyn = U.cargarDyn();
  S.dyn.cand = S.dyn.cand || {}; S.dyn.afh = S.dyn.afh || {}; S.dyn.dirId = S.dyn.dirId || ""; S.dyn.ex = S.dyn.ex || null;
  S.senal = { carta: 0, eleccion: 0, fin: 0, azar: 0, voto: 0 };
  S.estado = "carta";

  S.guardarDyn = function () { U.guardarDyn(S.dyn); };
  S.setEstado = function (e) {
    S.estado = e; S.espera = 0.5;
    // Cada cambio de estado exige soltar el boton y descarta teclas/arrastre en curso:
    // evita que un mismo toque dispare dos acciones.
    S.teclaDir = 0; S.dx = 0; S.dy = 0; S.drag = false; S.esperaSoltar = true;
    if (S.o) anim(S.o.fondo, e === "mini" && S.m ? "mini_" + S.m.tipo : e);
  };
  S.ant = function () {
    const h = S.dyn.hist;
    return h.length ? h[h.length - 1] : { nombre: "el director anterior", causa: "circunstancias desconocidas", sem: 0 };
  };
  S.fmt = function (s) {
    const a = S.ant(), ex = S.dyn.ex;
    return String(s).replace(/\{n\}/g, S.dyn.n).replace(/\{ant\}/g, a.nombre).replace(/\{causa\}/g, a.causa).replace(/\{antsem\}/g, a.sem)
      .replace(/\{dir\}/g, S.dirNombre || "").replace(/\{ex\}/g, ex ? ex.nombre : a.nombre);
  };
  S.causaTxt = k => CAUSAS[k] || (S.data.finales_raros[k] || {}).causa || (S.data.caidas[k] || {}).causa || k;
  S.dar = U.dar;
  S.fecha = () => U.fecha(S.semana);
  S.checkLogros = function () {
    if (S.semana >= 16) S.dar("semestre1");
    if (S.semana >= 48) S.dar("tres_semestres");
    if (S.semana >= 96) S.dar("veterano");
    if (S.int >= 85) S.dar("integro");
    if (S.int <= 15) S.dar("corrupto");
    if (Object.keys(S.items).length >= 3) S.dar("coleccionista");
    if (S.semana >= 32 && S.v.every(x => x >= 35 && x <= 65)) S.dar("equilibrio");
    const afs = Object.keys(S.af).map(k => S.af[k]);
    if (afs.some(x => x >= 5)) S.dar("aliado_total");
    if (afs.some(x => x <= -5)) S.dar("enemigo_total");
    if (S.fecha().ym >= "2026-06") S.dar("era_mundial");
  };

  // ---- meta-estado: medidores de la UAN y de Nayarit (persisten en la dinastia) ----
  const UK = ["solv", "paz", "aut", "pre"], NK = ["des", "seg"];
  S.uanDatos = () => S.data.uan || {};
  S.metros = function () { U.normDyn(S.dyn); return Object.assign({}, S.dyn.uan, S.dyn.nay); };
  S.metroVal = function (k) {
    const m = S.metros();
    if (k === "prom") return (UK.concat(NK).reduce((a, x) => a + m[x], 0)) / 6;
    if (k === "min") return Math.min.apply(null, UK.concat(NK).map(x => m[x]));
    return m[k] === undefined ? 50 : m[k];
  };
  // a = [solv, paz, aut, pre] ; b = [des, seg]
  S.metroMover = function (a, b) {
    U.normDyn(S.dyn);
    if (Array.isArray(a)) UK.forEach((k, i) => { S.dyn.uan[k] = clamp(S.dyn.uan[k] + (a[i] || 0), 0, 100); });
    if (Array.isArray(b)) NK.forEach((k, i) => { S.dyn.nay[k] = clamp(S.dyn.nay[k] + (b[i] || 0), 0, 100); });
    S.guardarDyn();
  };
  // Condicion 'uansi': {"solv":"<30","des":">=60","prom":">50","min":">=40"}
  const RE_U = /^\s*(<=|>=|!=|<|>|=)\s*(-?\d+(?:\.\d+)?)\s*$/;
  S.cumpleUan = function (si) {
    return Object.keys(si).every(k => {
      const m = RE_U.exec(String(si[k]));
      if (!m) return true;
      const val = S.metroVal(k), n = +m[2];
      return m[1] === "<" ? val < n : m[1] === "<=" ? val <= n : m[1] === ">" ? val > n : m[1] === ">=" ? val >= n : m[1] === "!=" ? val !== n : val === n;
    });
  };
  // La UAN arrastra a Nayarit: cada caida de director mueve el estado segun la salud de la universidad.
  S.derivaNayarit = function () {
    const d = S.uanDatos().deriva || { des: { pre: 0.10, solv: 0.05, aut: 0.05 }, seg: { paz: 0.10, aut: 0.05 } };
    const m = S.metros(), r = k => Math.round(Object.keys(d[k] || {}).reduce((a, x) => a + (m[x] - 50) * d[k][x], 0));
    S.metroMover(null, [r("des"), r("seg")]);
  };
  // Las instituciones se recuperan (o se enfrian): cada caida, los medidores se acercan un poco a 50 (data.uan.regresion).
  S.regresionMetros = function () {
    const f = S.uanDatos().regresion || 0;
    if (!f) return;
    const m = S.metros(), g = k => Math.trunc((50 - m[k]) * f);
    S.metroMover(UK.map(g), NK.map(g));
  };
  S.extremoMetro = function () {
    const m = S.metros(), ks = UK.concat(NK);
    for (let i = 0; i < ks.length; i++) { if (m[ks[i]] <= 0) return ks[i] + "0"; if (m[ks[i]] >= 100) return ks[i] + "100"; }
    return null;
  };
  // Destino de la historia: por extremo (ext) o, tras N directores, por cond. Devuelve el objeto o null.
  S.destinoCheck = function () {
    const D = S.data.destinos || [], ext = S.extremoMetro();
    if (!D.length) return null;
    if (ext) { const d = D.find(x => (x.ext || []).indexOf(ext) >= 0); if (d) return d; }
    if (S.dyn.hist.length >= (S.uanDatos().n_directores || 8)) {
      return D.find(x => !x.cond || [].concat(x.cond).some(c => S.cumpleUan(c))) || D[D.length - 1];
    }
    return null;
  };
  S.metrosLinea = function () { return U.metrosTxt(S.dyn); };
  // Cierra la historia: archiva la cronica, reinicia dinastia y medidores. Los logros se mantienen.
  S.cerrarHistoria = function () {
    const d = S.destinoPend;
    if (d) {
      U.addCronica({ id: d.id, titulo: d.titulo, directores: S.dyn.hist.length, anio: 2025 + Math.round(S.dyn.hist.reduce((a, h) => a + h.sem, 0) / 52),
        lista: S.dyn.hist.map(h => h.nombre + " (" + h.causa + ")").slice(-10) });
      S.dar("fin_historia"); S.dar("destino_" + d.id);
      if (U.cronica().length >= 3) S.dar("tres_historias");
    }
    S.dyn = U.dynNueva(); S.destinoPend = null; S.guardarDyn();
  };

  // ---- efectos ----
  // Rasgos del director y desgaste por reelecciones: solo afectan a SUS decisiones (S.modOn).
  S.modE = function (e) {
    const r = S.rasgo;
    let o = e.slice();
    if (r === "sindicalista" && S.ctxPj === "lider_sindical") o = o.map(x => Math.trunc(x * 0.5));
    if (r === "tecnocrata" && o[0] > 0) o[0] = Math.round(o[0] * 1.2);
    if (r === "operador" && o[3] > 0) o[3] = Math.round(o[3] * 1.2);
    if (r === "idealista" && o[1] > 0) o[1] = Math.round(o[1] * 1.15);
    if (r === "veterano" || r === "hijo_exdirector") for (let i = 0; i < 4; i++) if (o[i] < 0) o[i] = Math.trunc(o[i] * (r === "veterano" ? 0.85 : 0.9));
    if (S.reel > 0) { const d = Math.pow(1.15, S.reel); o = o.map(x => x < 0 ? Math.round(x * d) : x); }
    return o;
  };
  S.aplicarE = function (e) {
    e = e || [0, 0, 0, 0];
    if (S.modOn) e = S.modE(e);
    let grande = false, signo = 0;
    for (let i = 0; i < 4; i++) {
      const viejo = S.v[i];
      S.v[i] = clamp(viejo + (e[i] || 0), 0, 100);
      const d = S.v[i] - viejo;
      if (d !== 0 && S.iconos) { anim(S.iconos[i], d > 0 ? "subir" : "bajar"); S.iconT[i] = 0.5; }
      if (Math.abs(d) >= 15) { grande = true; signo += d; }
    }
    if (grande && S.o) { S.flash = 1; S.shake = 0.4; anim(S.o.flash, signo >= 0 ? "bueno" : "malo"); }
  };
  // Efectos "extra" de una opcion o de un resultado de minijuego/azar.
  // pre = "" (opcion normal) | "bien_" | "mal_" (minijuego).
  // Claves: set, unset, int, item, af, estado, quita, luego, cand, conspira, fe, voto, retiro, final.
  S.aplicarExtras = function (o, pre) {
    (o[pre + "set"] || []).forEach(f => { S.flags[f] = true; if (f.indexOf("legado_") === 0) { S.dyn.legado[f] = true; S.guardarDyn(); } });
    (o[pre + "unset"] || []).forEach(f => { delete S.flags[f]; if (f.indexOf("legado_") === 0) { delete S.dyn.legado[f]; S.guardarDyn(); } });
    if (typeof o[pre + "int"] === "number") S.int = clamp(S.int + o[pre + "int"], 0, 100);
    if (o[pre + "item"]) S.items[o[pre + "item"]] = true;
    const af = o[pre + "af"];
    if (af) Object.keys(af).forEach(k => { S.af[k] = clamp((S.af[k] || 0) + af[k], -5, 5); });
    [].concat(o[pre + "estado"] || []).forEach(s => {
      if (!s || !s.id) return;
      const n = { id: s.id, nombre: s.nombre || s.id, rest: Math.max(1, s.semanas | 0 || 1), cada: s.cada || [0, 0, 0, 0], int: s.int || 0 };
      const k = S.estados.findIndex(x => x.id === s.id);
      if (k >= 0) S.estados[k] = n; else S.estados.push(n);
    });
    [].concat(o[pre + "quita"] || []).forEach(id => { S.estados = S.estados.filter(x => x.id !== id); });
    [].concat(o[pre + "luego"] || []).forEach(l => {
      if (l && l.carta) S.futuro.push({ sem: S.semana + Math.max(1, l.semanas | 0 || 1), id: l.carta });
    });
    // Sucesion y elecciones
    const cd = o[pre + "cand"];     // fuerza de los candidatos rivales {id: +-n}
    if (cd) Object.keys(cd).forEach(k => { S.cand[k] = (S.cand[k] || 0) + cd[k]; });
    [].concat(o[pre + "conspira"] || []).forEach(k => { S.conspira[k] = true; S.cand[k] = (S.cand[k] || 0) + 2; });
    if (typeof o[pre + "fe"] === "number") S.fe += o[pre + "fe"];   // tu fuerza electoral
    const vt = o[pre + "voto"];     // apoyo por sector {prof, est, trab, cons}
    if (vt) Object.keys(vt).forEach(k => { S.votoS[k] = (S.votoS[k] || 0) + vt[k]; });
    if (o[pre + "uan"] || o[pre + "nay"]) S.metroMover(o[pre + "uan"], o[pre + "nay"]);
    if (o[pre + "retiro"]) S.retiro = true;
    if (o[pre + "final"]) S.finalPend = o[pre + "final"];
  };
  // Ruido oculto: a cada stat que la opcion ya afecta (e[i] != 0) se le suma un entero
  // uniforme en [-n, n]. n = op.ruido, o S.RUIDO por defecto. No se ve en la vista previa.
  S.RUIDO = 9; S.ESCALA = 1.3;   // ruido y escala globales (ajustados con balance.js)
  S.conRuido = function (op) {
    const e = op.e;
    if (!e) return e;
    const n = typeof op.ruido === "number" ? Math.max(0, Math.round(op.ruido)) : S.RUIDO;
    if (!n) return e;
    // El ruido cambia la magnitud pero nunca el signo: lo que anuncia la vista previa se respeta.
    // S.ESCALA endurece todo el mazo; el ruido varía la magnitud sin invertir el signo.
    const k = S.ESCALA || 1;
    return e.map(x => x ? Math.sign(x) * Math.max(1, Math.round(Math.abs(x) * k) + Math.floor(Math.random() * (2 * n + 1)) - n) : x);
  };
  // Opcion con probabilidad: azar:{p, exito:[e]|{e,set,...}, fallo:..., msg_exito, msg_fallo}
  S.resolverAzar = function (op) {
    const a = op.azar;
    if (!a) return;
    const p = typeof a.p === "number" ? clamp(a.p, 0, 1) : 0.5;
    const ok = Math.random() < p;
    const norm = x => Array.isArray(x) ? { e: x } : (x || {});
    const r = norm(ok ? a.exito : a.fallo);
    S.aplicarE(r.e); S.aplicarExtras(r, "");
    U.cola.push(ok ? (a.msg_exito || "¡Salió bien!") : (a.msg_fallo || "Salió mal."));
    S.senal.azar++; S.ultAzar = ok ? 1 : 0;
    if (ok) S.dar("suerte");
  };
  // Estados persistentes: cada semana aplican su efecto "cada" y se agotan.
  S.tickEstados = function () {
    if (!S.estados.length) return;
    S.estados.forEach(s => { S.aplicarE(s.cada); if (s.int) S.int = clamp(S.int + s.int, 0, 100); s.rest--; });
    S.estados = S.estados.filter(s => s.rest > 0);
  };
  S.estadosTxt = function () {
    return S.estados.map(s => s.nombre + " (" + s.rest + " sem)").join(" · ");
  };
  S.inventario = function () {
    const ks = Object.keys(S.items);
    return "Expedientes: " + (ks.length ? ks.map(k => S.data.items[k] || k).join(" · ") : "(ninguno)");
  };

  // ---- ciclo de la gestion ----
  S.semanasParaEleccion = () => Math.max(0, S.eleccionEn - S.semana);
  S.enCampana = () => S.semanasParaEleccion() <= S.CAMPANA;
  S.puedeReelegirse = () => S.reel < S.MAX_REEL || !!S.flags.reforma;
  S.elegir = function (op) {
    if (!op) return;
    S.ctxPj = S.c ? S.c.pj : ""; S.modOn = true;
    S.aplicarE(S.conRuido(op));
    S.aplicarExtras(op, "");
    S.resolverAzar(op);
    S.modOn = false;
    if (op.usa) { delete S.items[op.usa]; S.dar("expediente_util"); }
    S.semana++;
    S.tickEstados();
    S.senal.eleccion++;
    if (op.set || op.mini || op.item || op.usa || op.final || op.azar || op.retiro) S.bitacora.push("Sem " + S.semana + ": " + op.t);
    S.checkLogros();
    if (op.mini && !S.finalPend) S.iniciarMini(op.mini); else S.postEleccion();
  };
  S.revisarRaros = function () {
    if (S.finalPend) { const k = S.finalPend; S.finalPend = null; return k; }
    const R = S.data.finales_raros;
    return Object.keys(R).find(k => S.cumpleCond(R[k])) || null;
  };
  S.postEleccion = function () {
    const raro = S.revisarRaros();
    if (raro) return S.terminar("raro", raro);
    const i = S.v.findIndex(x => x <= 0 || x >= 100);
    if (i >= 0) return S.terminar("stat", i);
    const ex = S.extremoMetro();
    if (ex) return S.terminar("uan", ex);
    if (S.semana >= S.eleccionEn) return S.eleccionPantalla();
    if (S.semana > 0 && S.semana % 16 === 0) return S.informe();
    S.siguiente();
  };
  S.informe = function () {
    S.setEstado("informe");
    const sem = Math.floor(S.semana / 16);
    setTxt(S.o.pj, "INFORME SEMESTRAL " + sem + "\nSemana " + S.semana + " · " + S.fecha().txt + " · cierras el semestre " + sem);
    setTxt(S.o.texto,
      "Decisiones clave:\n" + (S.bitacora.length ? S.bitacora.slice(-5).map(x => "• " + x).join("\n") : "• Un semestre sin sobresaltos.") +
      "\n\n" + S.inventario() + "\nElección en " + S.semanasParaEleccion() + " semanas.");
    setTxt(S.o.opcion, "");
    S.bitacora = [];
  };

  // ---- elecciones de director ----
  S.iniciarMandato = function () {
    S.mandato = S.MANDATO_MIN + U.rnd(S.MANDATO_MAX - S.MANDATO_MIN + 1);
    S.eleccionEn = S.semana + S.mandato;
    S.fe = 0; S.votoS = {}; S.retiro = false;
  };
  S.rivales = function () {
    return (S.data.candidatos || []).filter(c => c.id !== S.dirId).map(c => {
      const base = c.fuerza === undefined ? 10 : c.fuerza;
      const total = base + (S.cand[c.id] || 0) + (S.conspira[c.id] ? 3 : 0) - 1.5 * (S.af[c.pj || c.id] || 0);
      return { c, total };
    }).sort((a, b) => b.total - a.total).slice(0, 3);
  };
  // Calcula el reparto de votos por sector; devuelve {sectores, totales, ganador}
  S.calcularVotos = function () {
    const rv = S.rivales(), v = S.v, af = id => S.af[id] || 0;
    const base = {
      prof: v[0] * 0.6 + v[3] * 0.2 + S.int * 0.2,
      est: v[1] * 0.7 + S.int * 0.3,
      trab: v[2] * 0.5 + v[3] * 0.3 + S.int * 0.2,
      cons: v[3] * 0.5 + v[2] * 0.2 + S.int * 0.3,
    };
    const part = [{ id: "yo", nombre: "Tú" }].concat(rv.map(r => ({ id: r.c.id, nombre: r.c.nombre })));
    const tot = {}; part.forEach(p => { tot[p.id] = 0; });
    const sectores = S.SECTORES.map(([id, nom, peso, pj], si) => {
      const pun = part.map((p, k) => {
        if (k === 0) return Math.max(1, base[id] + 3 * af(pj) + 3 * (S.votoS[id] || 0) + 1.5 * S.fe);
        const r = rv[k - 1];
        return Math.max(1, 30 + r.total * 1.5 + ((SESGO[r.c.rasgo] || [0, 0, 0, 0])[si]));
      });
      const sq = pun.map(x => x * x), sum = sq.reduce((a, b) => a + b, 0);
      const pct = sq.map(x => peso * x / sum);
      part.forEach((p, k) => { tot[p.id] += pct[k]; });
      return { id, nom, peso, pct };
    });
    let g = part[0];
    part.forEach(p => { if (tot[p.id] > tot[g.id]) g = p; });
    return { part, sectores, tot, ganador: g };
  };
  S.eleccionPantalla = function () {
    S.setEstado("eleccion");
    S.senal.voto++;
    setTxt(S.o.pj, "DÍA DE LA ELECCIÓN\n" + S.fecha().txt + " · votan los sectores de la Unidad");
    setTxt(S.o.opcion, "");
    if (S.retiro || !S.puedeReelegirse()) {
      // No te presentas (retiro) o ya no puedes (limite de reelecciones).
      S.elec = { tipo: S.retiro ? "retiro" : "limite", fase: 99, t: 0 };
      return S.terminar(S.retiro ? "retiro" : "limite");
    }
    S.elec = { tipo: "voto", res: S.calcularVotos(), t: 0, fase: 0 };
    S.elec.ok = S.elec.res.ganador.id === "yo";
  };
  // Conteo animado: cada sector se "abre" en 1.2 s.
  S.updateEleccion = function (dt) {
    const E = S.elec;
    if (!E || E.tipo !== "voto") return;
    E.t += dt;
    const r = E.res, n = r.sectores.length;
    const idx = Math.min(n, Math.floor(E.t / 1.2));
    E.fase = idx;
    // Progreso de cada sector (0..1) para las barras animadas de 60_render.
    E.pp = r.sectores.map((s, i) => (i > idx ? 0 : i < idx ? 1 : Math.min(1, (E.t - i * 1.2) / 1.2)));
    E.listo = idx >= n;
  };
  S.cerrarEleccion = function () {
    const E = S.elec;
    if (!E || !E.listo) return;
    if (E.ok) {
      S.reel++;
      S.dar("reelegido");
      if (S.reel >= 2) S.dar("doble_reeleccion");
      for (let i = 0; i < 4; i++) S.v[i] = Math.max(S.v[i], Math.min(90, S.v[i] + 8));
      S.int = clamp(S.int + 5, 0, 100);
      if (S.int >= 55) { const r = S.uanDatos().reeleccion; if (r) S.metroMover(r.uan, r.nay); }
      Object.keys(S.cand).forEach(k => { S.cand[k] = Math.round(S.cand[k] * 0.5); });
      S.iniciarMandato();
      S.bitacora = [];
      S.elec = null;
      S.checkLogros();
      S.siguiente();
    } else {
      const g = E.res.ganador.id;
      S.elec = null;
      S.terminar("derrota", g);
    }
  };

  // ---- fin de gestion ----
  // tipo: "stat" (dato = indice), "raro" (dato = id), "derrota" (dato = id del ganador),
  //       "retiro", "limite".
  S.terminar = function (tipo, dato) {
    S.setEstado("fin");
    S.senal.fin++;
    let texto, causaKey, titulo, forzado = null;
    if (tipo === "raro") {
      const R = S.data.finales_raros[dato] || {};
      texto = R.texto || ""; causaKey = dato;
      titulo = R.titulo ? "CAÍDA ESPECIAL · " + R.titulo : "CAÍDA ESPECIAL";
      U.logros["final_" + dato] = true; U.lsSet("logros", U.logros);
      S.dar("final_secreto");
    } else if (tipo === "stat") {
      const baja = S.v[dato] <= 0;
      causaKey = FIN_KEYS[dato][baja ? 0 : 1];
      texto = S.data.finales[causaKey] || ""; titulo = "FIN DE LA GESTIÓN";
    } else if (tipo === "uan") {
      causaKey = dato;
      texto = (S.data.caidas[dato] || {}).texto || "Uno de los pilares de la Universidad llegó a su límite durante tu gestión.";
      titulo = "LA UAN LLEGA A UN LÍMITE";
    } else {
      causaKey = tipo; forzado = tipo === "derrota" ? dato : null;
      titulo = tipo === "derrota" ? "ELECCIÓN PERDIDA" : tipo === "retiro" ? "RETIRO DIGNO" : "FIN DEL MANDATO";
      texto = S.data.finales[tipo] || ({
        derrota: "Las urnas hablaron: la comunidad prefirió a otro profesor. Entregas la dirección con la frente en alto o con rencor, según lo que hayas sembrado.",
        retiro: "Decides no presentarte. Entregas la oficina, cierras el cajón con llave y te vas a dar clases, que era lo que querías de joven.",
        limite: "El reglamento no te permite otro periodo. La comunidad se despide con aplausos tibios y un pastel de sábana.",
      })[tipo];
      if (tipo === "retiro") S.dar("retiro_digno");
    }
    S.finTipo = tipo; S.finKey = causaKey;
    const semestres = Math.floor(S.semana / 16);
    if (S.semana > S.record) { S.record = S.semana; U.setRecord(S.record); }
    S.dyn.hist.push({ n: S.dyn.n, nombre: S.dirNombre, causa: S.causaTxt(causaKey), sem: S.semana, k: causaKey });
    if (S.dyn.hist.length > 20) S.dyn.hist.shift();
    S.dyn.n++;
    const ep = tipo === "retiro" ? "epi_retiro" : S.int <= 35 ? "epi_corrupto" : S.int >= 65 ? "epi_integro" : "epi_gris";
    // Consecuencia institucional de la caida + epilogo por integridad + deriva de Nayarit.
    const caida = S.data.caidas[causaKey] || {}, epi = (S.uanDatos().epilogo || {})[ep] || {};
    S.metroMover(caida.uan, caida.nay);
    S.metroMover(epi.uan, epi.nay);
    S.regresionMetros();
    S.derivaNayarit();
    S.destinoPend = S.destinoCheck();
    S.calcularSucesion(causaKey, forzado);
    S.guardarDyn();
    U.borrarPartida();
    S.dar("primer_fin");
    S.epilogo = (S.data.finales[ep] || S.data.finales.epi_gris || "") + "\n\nTu sucesor será el Director #" + S.dyn.n + (S.suc ? ", " + S.suc.ganador.nombre : "") +
      ". Lo que dejaste marcado como legado lo heredará; tú quedas como ex director de la Unidad" + (S.dyn.ex && S.dyn.ex.tono === "aliado" ? ", y como aliado." : ", y con cuentas pendientes.");
    setTxt(S.o.pj, titulo + "\nGestión de " + S.dirNombre + " · Director #" + (S.dyn.n - 1));
    setTxt(S.o.texto, S.fmt(texto) + (caida.t ? "\n\nPara la UAN: " + S.fmt(caida.t) : "") +
      "\n\nDuraste " + S.semana + " semanas (" + semestres + " semestres) hasta " + S.fecha().txt + ". Récord: " + S.record + ".");
    setTxt(S.o.opcion, "");
  };
  S.morir = (i, raro) => (raro ? S.terminar("raro", raro) : S.terminar("stat", i));   // compatibilidad

  // ---- sucesion entre profesores ----
  // Fuerza = base + decisiones (cand) + afinidad*2 + favor de la CAUSA de caida + 3 si conspiro.
  // Gana la mayor (empate al azar). 'forzado' = ganador de una eleccion perdida.
  S.calcularSucesion = function (causaKey, forzado) {
    S.suc = null;
    const C = S.data.candidatos || [];
    if (!C.length) return;
    let lista = C.filter(c => c.id !== S.dirId).map(c => {
      const base = c.fuerza === undefined ? 10 : c.fuerza, dec = S.cand[c.id] || 0, af = (S.af[c.pj || c.id] || 0) * 2;
      const fav = (c.favorece && c.favorece[causaKey]) || 0, cons = S.conspira[c.id] ? 3 : 0;
      return { c, base, dec, af, fav, cons, total: base + dec + af + fav + cons, r: Math.random() };
    }).sort((a, b) => b.total - a.total || b.r - a.r);
    if (!lista.length) return;
    if (forzado) { const k = lista.findIndex(x => x.c.id === forzado); if (k > 0) lista = [lista[k]].concat(lista.filter((x, j) => j !== k)); }
    const g = lista[0];
    S.suc = { ganador: g.c, lista, causaKey, brutus: !!g.cons, forzado: !!forzado };
    // Memoria: los demas conservan la mitad de su fuerza; las afinidades, la mitad.
    const nc = {};
    lista.slice(1).forEach(x => { nc[x.c.id] = Math.round((x.dec + x.fav) * 0.5); });
    if (S.dirId) nc[S.dirId] = 0;
    S.dyn.cand = nc;
    S.dyn.afh = {}; Object.keys(S.af).forEach(k => { const h = Math.trunc(S.af[k] * 0.5); if (h) S.dyn.afh[k] = h; });
    S.dyn.dirId = g.c.id;
    // El caido pasa a ser personaje: aliado si lo hiciste con integridad o te retiraste con dignidad.
    S.dyn.ex = { id: S.dirId, nombre: S.dirNombre, tono: (S.int >= 55 || causaKey === "retiro" || causaKey === "limite") ? "aliado" : "resentido" };
    if (S.suc.brutus) { S.dyn.legado.legado_brutus = true; S.dar("brutus"); }
  };
  S.sucesionPantalla = function () {
    const s = S.suc;
    S.setEstado("sucesion");
    const causa = S.causaTxt(s ? s.causaKey : S.finKey);
    setTxt(S.o.pj, "SUCESIÓN\nTu gestión termina por " + causa + ". " + (s && s.brutus ? "¡Conspiró contra ti: Brutus! " : "") + (S.destinoPend ? "Es la última gestión de esta historia." : ""));
    setTxt(S.o.opcion, "");
    if (!s) { setTxt(S.o.texto, "No hay candidatos: el Consejo nombra a un interino."); return; }
    // Retratos, ranking y motivos los dibuja 60_render a partir de S.suc; este texto es solo respaldo.
    const sg = n => (n > 0 ? "+" : "") + n;
    const motivo = x => [x.dec ? "tu gestión " + sg(x.dec) : "", x.af ? "afinidad " + sg(x.af) : "", x.fav ? "tu caída +" + x.fav : "", x.cons ? "conspiró +3" : ""].filter(Boolean).join(", ") || "sin factores";
    setTxt(S.o.texto, "El Consejo elige entre los profesores:\n\n" + s.lista.slice(0, 4).map((x, i) => (i === 0 ? "GANA: " : "") + x.c.nombre + " (" + x.c.rasgo + "): " + x.total + " — " + motivo(x)).join("\n"));
  };
  S.epilogoPantalla = function () {
    S.setEstado("epilogo");
    setTxt(S.o.pj, "EPÍLOGO\nEstado de la UAN y de Nayarit tras tu paso");
    setTxt(S.o.texto, S.epilogo + (S.destinoPend ? "\n\nLa historia de la UAN llega a su destino." : "\n\nLlega el siguiente director."));
  };
  // Destino de la UAN y de Nayarit: unico FINAL del juego (tras N directores o un medidor en un extremo).
  S.destinoPantalla = function () {
    const d = S.destinoPend;
    if (!d) return S.nuevaPartida();
    S.setEstado("destino");
    S.senal.fin++;
    const dr = S.dyn.hist.map((h, i) => (i + 1) + ". " + h.nombre + ": " + h.causa + " (" + h.sem + " sem)").join("\n");
    setTxt(S.o.pj, d.titulo + "\nDestino de la UAN y de Nayarit · 2040");
    setTxt(S.o.texto, S.fmt(d.texto) + "\n\n" + S.fmt(d.detalle || "") + "\n\nCrónica de la dinastía:\n" + dr);
    setTxt(S.o.opcion, "");
  };
  S.destinoCerrar = function () {
    S.cerrarHistoria();
    U.cambiarEscena("Menu");
  };

  // ---- partida nueva ----
  S.reiniciarEstado = function () {
    const cd = (S.data.candidatos || []).find(c => c.id === S.dyn.dirId) || null;
    S.cd = cd; S.dirId = cd ? cd.id : ""; S.rasgo = cd ? cd.rasgo : ""; S.dirNombre = cd ? cd.nombre : NOMBRES_DIR[0];
    S.v = [0, 1, 2, 3].map(i => clamp(50 + (cd && cd.bonos ? cd.bonos[i] || 0 : 0), 8, 92));
    // La UAN heredada ajusta levemente los stats iniciales: Prestigio->Academico, Paz->Estudiantes, Solvencia->Finanzas, Autonomia->Politica.
    { const m = S.metros(), aj = x => clamp(Math.round((x - 50) / 10), -5, 5); [m.pre, m.paz, m.solv, m.aut].forEach((x, i) => { S.v[i] = clamp(S.v[i] + aj(x), 8, 92); }); }
    S.int = clamp(50 + (S.rasgo === "idealista" ? 15 : 0), 0, 100); S.items = {};
    S.flags = {}; Object.keys(S.dyn.legado).forEach(f => { S.flags[f] = true; });
    if (S.dyn.ex) S.flags["ex_" + S.dyn.ex.tono] = true;
    S.af = {}; Object.keys(S.dyn.afh).forEach(k => { S.af[k] = clamp(S.dyn.afh[k], -5, 5); });
    if (S.rasgo === "hijo_exdirector") S.af.rector = clamp((S.af.rector || 0) + 2, -5, 5);
    S.cand = Object.assign({}, S.dyn.cand); S.conspira = {}; S.modOn = false; S.ctxPj = "";
    S.estados = []; S.futuro = []; S.finalPend = null; S.elec = null; S.suc = null; S.reel = 0;
    S.usadas = {}; S.ult = {}; S.bitacora = []; S.semana = 0; S.pjUlt = ""; S.m = null; S.c = null;
    S.iniciarMandato();
  };
  S.nuevaPartida = function () {
    if (!S.destinoPend && S.dyn.hist.length) S.destinoPend = S.destinoCheck();    // historia que quedo sin cerrar
    if (S.destinoPend) S.cerrarHistoria();      // la historia ya habia terminado: empieza una nueva
    S.reiniciarEstado();
    if (S.dyn.n > 1) { S.flags.sucesor = true; S.dar("heredero"); }
    if (S.dyn.n >= 3) S.dar("dinastia");
    U.limpiar(S.ui);
    S.siguiente();
  };

  // ---- autoguardado (en cada carta) y reanudacion ----
  S.guardar = function () {
    if (!S.c || S.estado === "fin" || S.estado === "epilogo" || S.estado === "sucesion") return;
    U.guardarPartida({
      ver: 1, v: S.v, int: S.int, items: S.items, flags: S.flags, af: S.af, estados: S.estados,
      futuro: S.futuro, usadas: S.usadas, ult: S.ult, semana: S.semana, bitacora: S.bitacora.slice(-8),
      cid: S.c.id, pjUlt: S.pjUlt, cand: S.cand, conspira: S.conspira, dirId: S.dirId,
      reel: S.reel, mandato: S.mandato, eleccionEn: S.eleccionEn, fe: S.fe, votoS: S.votoS, retiro: S.retiro,
    });
  };
  S.cargarPartida = function (d) {
    if (!d) return false;
    S.reiniciarEstado();
    S.v = d.v.map(x => clamp(+x || 50, 0, 100)); S.int = clamp(+d.int || 50, 0, 100);
    S.items = d.items || {}; S.flags = d.flags || {}; S.af = d.af || {};
    S.estados = Array.isArray(d.estados) ? d.estados : []; S.futuro = Array.isArray(d.futuro) ? d.futuro : [];
    S.usadas = d.usadas || {}; S.ult = d.ult || {}; S.semana = d.semana | 0;
    S.bitacora = Array.isArray(d.bitacora) ? d.bitacora : []; S.pjUlt = d.pjUlt || "";
    S.cand = d.cand || S.cand; S.conspira = d.conspira || {};
    S.reel = d.reel | 0; S.mandato = d.mandato || 45; S.eleccionEn = typeof d.eleccionEn === "number" ? d.eleccionEn : S.semana + 45;
    S.fe = +d.fe || 0; S.votoS = d.votoS || {}; S.retiro = !!d.retiro;
    // Director guardado (rasgo/nombre); si el dato falta se conserva el de la dinastia.
    const cd = (S.data.candidatos || []).find(c => c.id === d.dirId);
    if (cd) { S.cd = cd; S.dirId = cd.id; S.rasgo = cd.rasgo; S.dirNombre = cd.nombre; }
    // Las banderas de legado siempre se heredan, aunque la partida guardada sea anterior.
    Object.keys(S.dyn.legado).forEach(f => { S.flags[f] = true; });
    U.limpiar(S.ui);
    const c = S.porId[d.cid];
    if (c) { S.setEstado("carta"); S.c = c; S.mostrarCarta(); } else S.siguiente();
    return true;
  };
}
