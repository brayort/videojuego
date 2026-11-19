// ============================================================================
// MENU — escena "Menu". Pantalla de inicio con vida: fondo animado, personaje que saluda (se puede tocar),
// recuadro de dialogo con maquina de escribir, entrada escalonada de botones y transiciones con fundido.
// Comunica con la escena Juego mediante la variable GLOBAL "Modo" (nueva | continuar).
//
// El menu muestra solo lo que tiene sentido en este momento:
//   sin partida:  Jugar · Logros · Opciones · Creditos
//   con partida:  Continuar (con su contexto) · Nueva partida (pide confirmar) · ...
//   con progreso: aparece Cronica y "Empezar historia nueva" (pide confirmar)
//   Ranking solo si hay tablas de GDevelop configuradas.
// Titulo y subtitulo en src/config.json > "juego". Los personajes que saludan, con sus mensajes, en src/historia/menu.json
// (cada sprite con sus frases segun su personalidad, una frase "rara" y eventos especiales). Medidas en LAYOUT.menu (00_comun.js).
// Teclado: flechas + Enter; raton/tactil: botones (se activan al soltar sobre ellos).
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.menuListo) {
  S.menuListo = true;
  const U = S.u, L = U.L, W = U.W, H = U.H, setTxt = U.setTxt, anim = U.anim, M = L.menu, CF = (U.CFG && U.CFG.juego) || {};
  const clamp = U.clamp, rnd = (a, b) => a + Math.random() * (b - a);
  const MENU = __MENU__, PJ = MENU.personajes || {}, IDS = Object.keys(PJ);   // src/historia/menu.json (lo inserta build.js)
  S.ui = []; S.sub = []; S.vista = "menu"; S.kb = false; S.t = 0; S.px = 0; S.confirma = ""; S.confT = 0; S.sale = null;
  S.fondo = runtimeScene.createObject("Fondo");
  S.fondo.setPosition(0, 0); S.fondo.setZOrder(-10); anim(S.fondo, "menu");
  const crear = (obj, an, z, w, h) => {
    const o = runtimeScene.createObject(obj); anim(o, an); o.setZOrder(z); if (w) { o.setWidth(w); o.setHeight(h); } S.ui.push(o); return o;
  };

  // ---- ambiente: franjas de luz, papeles que suben y chispas que titilan ----
  S.bandas = [0, 1, 2].map(i => { const p = U.pnl(S.ui, i === 1 ? "crema" : "dorado_claro", 0, -300, 60 + i * 34, 1900, 2, 16); p.setAngle(18); return { p, v: 14 + i * 9, o: i * 330 }; });
  S.papeles = []; S.chispas = [];
  for (let i = 0; i < 14; i++) {
    const s = rnd(0.55, 1), o = crear("Particula", "papel", 3, 30 * s, 38 * s);
    S.papeles.push({ o, bx: rnd(20, W - 20), y: rnd(0, H), v: rnd(18, 44), sw: rnd(0.4, 1), ph: rnd(0, 6.28), a0: rnd(0, 360), vr: rnd(-26, 26), s });
  }
  for (let i = 0; i < 10; i++) S.chispas.push({ o: crear("Particula", "chispa", 4, 24, 24), x: rnd(30, W - 30), y: rnd(60, 700), f: rnd(1.2, 2.6), ph: rnd(0, 6.28), s: rnd(0.5, 1) });
  S.barrido = crear("Particula", "chispa", 22, 30, 30);

  // ---- titulo ----
  const t1 = U.mkTxt(S.ui, "TxtTitulo", 40, M.titulo.y, M.titulo.size, W - 80, { al: "center", col: "crema", z: 20 }); setTxt(t1, CF.titulo || "DIRECTOR UAN");
  const t2 = U.mkTxt(S.ui, "TxtTitulo", 40, M.sub.y, M.sub.size, W - 80, { al: "center", col: "dorado", z: 20 }); setTxt(t2, CF.subtitulo || "ECONOMÍA");
  S.titulo = [t1, t2];
  S.regla = U.pnl(S.ui, "dorado", W / 2, M.regla.y, 1, 4, 20);

  // ---- personaje (se puede tocar) ----
  const HS = M.hero.size, base = M.hero.y + HS;
  S.halo = crear("Halo", "dorado", 6, 560, 560);
  S.sombra = crear("Halo", "sombra", 7, 260, 40);
  S.hero = crear("Retrato", "default", 8, HS, HS);
  S.heroBox = { x: W / 2 - HS / 2, y: M.hero.y, w: HS, h: HS };
  S.hop = { h: 0, v: 0, sq: 0, at: 0 };

  // ---- recuadro de dialogo (mismo estilo que las cinematicas) ----
  const D = M.dialogo;
  S.dlg = { bg: U.pnl(S.ui, "guinda_osc", D.x, D.y, D.w, D.h, 12, 0), borde: U.pnl(S.ui, "dorado", D.x, D.y, D.w, 3, 13), placa: U.pnl(S.ui, "dorado", D.x + 16, D.y - 18, 110, 34, 14), full: "", t0: 1.3, n: -1 };
  S.dlg.nom = U.mkTxt(S.ui, "TxtTexto", D.x + 16, D.y - 15, 24, 110, { al: "center", col: "tinta", z: 15 });
  S.dlg.txt = U.mkTxt(S.ui, "TxtTexto", D.x + 22, D.y + 18, 26, D.w - 44, { col: "crema", z: 15 });
  S.fx = { tipo: "", t: 0 }; S.swap = null; S.libre = true; S.espTap = 0;

  // ---- personajes de la portada (src/historia/menu.json): cada uno con sus frases, una "rara" y eventos especiales ----
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const mezclar = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), x = arr[i]; arr[i] = arr[j]; arr[j] = x; } return arr; };
  S.gar = U.lsGet("menu_gar", {}); if (!S.gar || typeof S.gar !== "object") S.gar = {};   // cambios desde la ultima vez que salio cada personaje con "garantia"
  S.hist = U.lsGet("menu_hist", []); if (!Array.isArray(S.hist)) S.hist = [];              // personajes recientes (el mas reciente primero), se conserva entre visitas
  S.vistas = U.lsGet("menu_vistas", {}); if (!S.vistas || typeof S.vistas !== "object") S.vistas = {};   // frases normales ya dichas por cada personaje
  // Quien sale: al azar y con peso, pero (1) nadie vuelve hasta que pasen "ventana" apariciones (12 por defecto; propia de cada personaje
  // si la define), y (2) quien lleva mucho sin salir gana hasta +100 % de peso para que todos roten. "garantia" fuerza a quien lleva N cambios sin verse.
  S.elegirPersonaje = function (excluir) {
    const ids = IDS.filter(i => i !== excluir); if (!ids.length) return IDS[0];
    for (let k = 0; k < ids.length; k++) { const g = PJ[ids[k]].garantia; if (g && (S.gar[ids[k]] || 0) >= g) return ids[k]; }
    const cand = []; let tot = 0;
    ids.forEach(i => {
      const v = Math.min(PJ[i].ventana || MENU.ventana || 10, IDS.length - 2), idx = S.hist.indexOf(i), sin = idx < 0 ? Infinity : idx;
      if (sin < v) return;                                                                        // salio hace poco: descansa
      const w = (PJ[i].peso || 1) * (1 + 0.5 * Math.min(2, sin === Infinity ? 2 : (sin - v) / v));
      cand.push([i, w]); tot += w;
    });
    if (!cand.length) ids.forEach(i => { cand.push([i, PJ[i].peso || 1]); tot += PJ[i].peso || 1; });   // por si el catalogo es muy chico
    let r = Math.random() * tot;
    for (let k = 0; k < cand.length; k++) { r -= cand[k][1]; if (r <= 0) return cand[k][0]; }
    return cand[cand.length - 1][0];
  };
  S.cargarPersonaje = function (id) {
    const d = PJ[id] || { nombre: id, frases: ["..."], raras: [] };
    S.pj = { id, d, cola: [], n: 0, ult: "", tipo: "" };
    anim(S.hero, id); U.lsSet("menu_ult", id);
    IDS.forEach(i => { if (PJ[i].garantia) S.gar[i] = i === id ? 0 : (S.gar[i] || 0) + 1; }); U.lsSet("menu_gar", S.gar);
    S.hist = [id].concat(S.hist.filter(i => i !== id)).slice(0, 40); U.lsSet("menu_hist", S.hist);
    const w = clamp(U.ancho(d.nombre || id, 24, "cuerpo") + 36, 110, 300);
    setTxt(S.dlg.nom, d.nombre || id); S.dlg.nom.setWrappingWidth(w); U.pset(S.dlg.placa, D.x + 16, D.y - 18, w, 34);
    S.siguienteSaludo();
  };
  // Mensaje siguiente: normal (por turnos, sin repetir), raro (poco probable, en dorado) o especial (rarisimo, con efecto).
  S.siguienteSaludo = function () {
    const p = S.pj, d = p.d, esp = MENU.especiales || []; let txt, tipo = "", fx = "";
    if (esp.length && Math.random() < (MENU.prob_especial === undefined ? 0.02 : MENU.prob_especial)) { const e = pick(esp); txt = e.texto; tipo = "especial"; fx = e.efecto || ""; }
    else if ((d.raras || []).length && Math.random() < (MENU.prob_rara === undefined ? 0.07 : MENU.prob_rara)) { txt = pick(d.raras); tipo = "rara"; }
    else {
      if (!p.cola.length) {
        const fr = d.frases || ["..."]; let vis = S.vistas[p.id] || [], nuevas = fr.filter(t => vis.indexOf(t) < 0);
        if (!nuevas.length) { vis = []; S.vistas[p.id] = vis; nuevas = fr.slice(); }                 // ya las dijo todas: empieza otra vuelta
        p.cola = mezclar(nuevas).concat(mezclar(fr.filter(t => nuevas.indexOf(t) < 0)));             // primero las no vistas
        if (p.cola.length > 1 && p.cola[0] === p.ult) p.cola.push(p.cola.shift());
      }
      txt = p.cola.shift();
      const vv = S.vistas[p.id] || (S.vistas[p.id] = []); if (vv.indexOf(txt) < 0) { vv.push(txt); U.lsSet("menu_vistas", S.vistas); }
    }
    p.ult = txt; p.n++; p.tipo = tipo;
    S.dlg.full = txt; S.dlg.t0 = S.t; S.dlg.n = -1; S.fx = { tipo: fx, t: 0 };
    U.c(S.dlg.txt, "setColor", U.CC[tipo ? "dorado_claro" : "crema"]);
    if (tipo === "especial") U.ev("sube");
  };
  // Pasa al mensaje siguiente; tras unos cuantos mensajes entra otro personaje.
  S.avanzarPersonaje = function () {
    if (S.swap) return;
    U.ev("pagina");
    if (S.pj.n >= (MENU.mensajes_por_personaje || 3)) S.swap = { t: 0, id: S.elegirPersonaje(S.pj.id), hecho: false };
    else S.siguienteSaludo();
  };

  // ---- datos y botones (solo lo que corresponde) ----
  const dyn = U.cargarDyn(), cron = U.cronica(), part = U.leerPartida();
  S.hayGuardada = !!part; S.dyn = dyn;
  const progreso = dyn.hist.length > 0 || dyn.n > 1;
  const filas = [{ ids: [S.hayGuardada ? "continuar" : "jugar"], h: M.h.pri }];
  if (S.hayGuardada) filas.push({ ids: ["nueva"], h: M.h.sec });
  const fa = ["logros"]; if (cron.length) fa.push("cronica"); if (U.rank && U.rank.hayIds()) fa.push("ranking");
  filas.push({ ids: fa, h: M.h.filaA }, { ids: ["opciones", "creditos"], h: M.h.filaB });
  if (progreso) filas.push({ ids: ["nuevahistoria"], h: M.h.pie });
  S.ETQ = { jugar: "Jugar", continuar: "Continuar", nueva: "Nueva partida", logros: "Logros", cronica: "Crónica", ranking: "Ranking", opciones: "Opciones", creditos: "Créditos", nuevahistoria: "Empezar historia nueva" };
  S.filas = filas.map(f => f.ids); S.btns = {}; S.orden = [];
  // el bloque de botones se reparte entre lo que hay: con pocos botones baja un poco (con todos queda en y0)
  const total = filas.reduce((t, f) => t + f.h + M.col.gap, 0) + (S.hayGuardada ? M.h.ctx : 0), maxTotal = M.h.pri + M.h.sec + M.h.filaA + M.h.filaB + M.h.pie + 4 * M.col.gap + M.h.ctx + M.col.gap;
  let y = M.col.y0 + Math.max(0, Math.round((maxTotal - total) * 0.5)), n = 0;
  filas.forEach((f, fi) => {
    const gw = (M.col.w - (f.ids.length - 1) * M.col.gap) / f.ids.length;
    f.ids.forEach((id, c) => {
      const pri = id === "jugar" || id === "continuar", b = U.mkBtn(S.ui, M.col.x + c * (gw + M.col.gap), y, gw, f.h, S.ETQ[id], 50, { size: pri ? 40 : f.h >= 76 ? 34 : f.h >= 64 ? 30 : 28 });
      if (!pri && (fi >= 2 || id === "nuevahistoria")) b.base = "suave";
      Object.assign(b, { id, delay: 0.95 + 0.075 * n++, k: 0, nl: null, nn: 1 }); S.btns[id] = b; S.orden.push(b);
    });
    y += f.h + M.col.gap;
    if (fi === 0 && S.hayGuardada) {   // contexto de la partida guardada, bajo el boton principal
      S.ctx = U.mkTxt(S.ui, "TxtTexto", M.col.x, y - 4, 22, M.col.w, { al: "center", col: "crema_osc", z: 20 });
      setTxt(S.ctx, "Semana " + part.semana + " · Director #" + dyn.n); y += M.h.ctx;
    }
  });
  S.glow = crear("Halo", "dorado", 49, 10, 10);
  S.sel = { f: 0, c: 0 };
  { const ult = U.lsGet("menu_ult", ""); S.cargarPersonaje(!S.hayGuardada && !progreso && !ult ? (MENU.anfitrion || IDS[0]) : S.elegirPersonaje(ult)); S.dlg.t0 = 1.3; }   // la primera vez siempre da la bienvenida la anfitriona
  S.velo = U.pnl(null, "negro", 0, 0, W, H, 900, 255);     // fundido de entrada y de salida
  U.cine.disparar("menu");   // cinematica de bienvenida (src/cinematicas.json, normalmente "una_vez")

  // ---- subvistas: cronica (paginada) y creditos ----
  S.cierraSub = function () {
    if (S.cron) U.limpiar(S.cron.items);
    U.limpiar(S.sub); S.vista = "menu"; S.cron = null; U.ocultar(S.ui, false);
  };
  const abreSub = function (titulo) {
    S.vista = "sub"; U.ocultar(S.ui, true);
    const A = S.sub;
    U.pnl(A, "guinda_osc", 0, 0, W, H, 300, 235);
    setTxt(U.mkTxt(A, "TxtTitulo", 40, 36, 60, W - 80, { al: "center", col: "dorado_claro", z: 310 }), titulo);
    S.volver = U.mkBtn(A, 80, 1118, 560, 96, "Volver", 310);
  };
  S.abrirCronica = function () {
    abreSub("CRÓNICA");
    const A = S.sub, c = U.cronica().slice().reverse(), POR = 4;
    S.cron = { c, i: 0, n: Math.max(1, Math.ceil(c.length / POR)), items: [], nav: U.pager(A, 1030, 310) };
    S.cronPagina = function () {
      const C = S.cron;
      U.limpiar(C.items);
      if (!c.length) {
        const t = U.mkTxt(C.items, "TxtTexto", 40, 200, 26, W - 80, { al: "center", col: "crema", z: 310 });
        setTxt(t, "Aún no hay historias terminadas.\nAquí quedará el registro de cada una cuando la termines.");
      }
      c.slice(C.i * POR, C.i * POR + POR).forEach((e, k) => {
        const y = 130 + k * 220, num = c.length - (C.i * POR + k);
        U.pnl(C.items, "guinda", 24, y, 672, 208, 305, 235); U.pnl(C.items, "dorado", 24, y, 672, 3, 306);
        const h = U.mkTxt(C.items, "TxtTexto", 40, y + 10, 26, 640, { col: "dorado_claro", z: 310 }); setTxt(h, "Historia #" + num + " · " + e.titulo);
        const s = U.mkTxt(C.items, "TxtTexto", 40, y + 46, 22, 640, { col: "crema_osc", z: 310 }); setTxt(s, e.directores + " directores, hasta ~" + e.anio);
        const l = U.mkTxt(C.items, "TxtTexto", 40, y + 78, 22, 640, { col: "crema", z: 310 });
        setTxt(l, (e.lista || []).slice(0, 4).join("\n"));
      });
      C.nav.set(C.i, C.n);
    };
    S.cronPagina();
  };
  S.abrirCreditos = function () {
    abreSub("CRÉDITOS");
    const t = U.mkTxt(S.sub, "TxtTexto", 40, 200, 28, W - 80, { al: "center", col: "crema", z: 310 });
    setTxt(t, (CF.titulo || "Director UAN") + "\n\nJuego de decisiones tipo cartas hecho con GDevelop 5.\n\nEncargo y buena onda: prof. Sergio Olivares.\nDiseño, texto y programación: equipo del proyecto.\n\nTipografías: Nunito y Fredoka (SIL Open Font License).");
  };
  // Ventanas Opciones y Ranking (U.modalOpciones / U.modalRanking de 05_audio.js).
  const abreModal = function (fab) {
    try { U.ocultar(S.ui, true); S.modal = fab(300); S.vista = "modal"; }
    catch (e) { S.modal = null; U.ocultar(S.ui, false); S.vista = "menu"; }
  };
  // Cambio de escena con fundido a negro.
  const irA = fn => { S.sale = { t: 0, fn }; };
  S.activar = function (id) {
    if (U.cine && U.cine.activo || S.sale) return;
    if (typeof id === "number") id = S.orden[id] && S.orden[id].id;     // compatibilidad: indice en orden visual
    if (!S.btns[id]) return;
    const peligro = id === "nueva" || id === "nuevahistoria";
    if (peligro && S.confirma !== id) { S.confirma = id; S.confT = 4; return; }   // primer toque: pide confirmar
    S.confirma = "";
    if (id === "jugar") irA(() => { U.gset("Modo", "nueva"); U.cambiarEscena("Juego"); });
    else if (id === "continuar") irA(() => { U.gset("Modo", "continuar"); U.cambiarEscena("Juego"); });
    else if (id === "nueva") irA(() => { U.borrarPartida(); U.gset("Modo", "nueva"); U.cambiarEscena("Juego"); });
    else if (id === "nuevahistoria") irA(() => { U.guardarDyn(U.dynNueva()); U.borrarPartida(); U.gset("Modo", "nueva"); U.cambiarEscena("Juego"); });   // los logros y la cronica se conservan
    else if (id === "logros") irA(() => U.cambiarEscena("Logros"));
    else if (id === "ranking") abreModal(U.modalRanking);
    else if (id === "opciones") abreModal(U.modalOpciones);
    else if (id === "cronica") S.abrirCronica();
    else if (id === "creditos") S.abrirCreditos();
  };
}

// ---------------------------------------------------------------------------- bucle
if (!S.saliendo && !S.u.cine.activo) {
  const U = S.u, I = S.in, L = U.L, W = U.W, H = U.H, M = L.menu, clamp = U.clamp, dt = Math.min(0.05, I.dt || 0.016);
  const eo = p => { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); };
  const eb = p => { p = clamp(p, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  const sel = () => S.filas[S.sel.f][S.sel.c];
  if (S.vista === "modal") {
    if (S.modal && S.modal.tick(I)) { S.modal.destroy(); S.modal = null; U.ocultar(S.ui, false); S.vista = "menu"; }
  } else if (S.vista === "sub") {
    let paso = 0;
    if (S.cron) {
      const C = S.cron;
      if (I.kp[37]) paso = -1; if (I.kp[39]) paso = 1;
      if (C.n > 1) {
        if (U.btnTick(C.nav.prev, I)) paso = -1;
        if (U.btnTick(C.nav.next, I)) paso = 1;
      }
      if (paso && C.i + paso >= 0 && C.i + paso < C.n) { C.i += paso; S.cronPagina(); U.ev("pagina"); }
    }
    const f = U.btnTick(S.volver, I);
    if (I.kp[27] || I.kp[13] || f) S.cierraSub();
  } else {
    S.t += dt; const t = S.t;
    // ---- entrada ----
    const fl = S.filas;
    if (I.kp[40] || I.kp[38] || I.kp[37] || I.kp[39]) {
      S.kb = true;
      if (I.kp[40]) S.sel.f = Math.min(fl.length - 1, S.sel.f + 1);
      if (I.kp[38]) S.sel.f = Math.max(0, S.sel.f - 1);
      S.sel.c = clamp(S.sel.c, 0, fl[S.sel.f].length - 1);
      if (I.kp[39]) S.sel.c = Math.min(fl[S.sel.f].length - 1, S.sel.c + 1);
      if (I.kp[37]) S.sel.c = Math.max(0, S.sel.c - 1);
    }
    let k = "";
    if (I.kp[13] || I.kp[32]) k = sel();
    if (I.kp[49]) k = fl[0][0];
    // toque al personaje: salta y pasa al siguiente mensaje. Seguros: el boton debe haberse soltado antes y hay una pausa entre toques.
    if (!I.pulsado) S.libre = true;
    S.espTap = Math.max(0, S.espTap - dt);
    if (I.click && S.libre && S.espTap <= 0 && !S.sale && !S.swap && U.hit(S.heroBox, I.mx, I.my)) { S.libre = false; S.espTap = 0.7; S.hop.v = 640; S.hop.at = 0; S.avanzarPersonaje(); }
    S.orden.forEach(b => {
      const pend = S.confirma === b.id;
      b.fijo = pend ? "peligro" : "";
      U.btnTxt(b, pend ? "¿Seguro? Toca otra vez" : S.ETQ[b.id]);
      if (U.btnTick(b, I, S.kb && sel() === b.id)) { k = b.id; S.sel = { f: fl.findIndex(r => r.indexOf(b.id) >= 0), c: fl.find(r => r.indexOf(b.id) >= 0).indexOf(b.id) }; }
    });
    if (S.confirma && (S.confT -= dt) <= 0) S.confirma = "";
    if (k) S.activar(k);

    // ---- ambiente ----
    const mx = clamp(((I.mx || W / 2) - W / 2) / (W / 2), -1, 1);
    S.px = U.suave(S.px, mx, dt);
    S.bandas.forEach((b, i) => { b.p.setPosition(((t * b.v + b.o) % (W + 520)) - 260 - S.px * 22, -300); b.p.setOpacity(16 + 9 * Math.sin(t * 0.45 + i * 2)); });
    S.papeles.forEach(p => {
      p.y -= p.v * dt; if (p.y < -60) { p.y = H + 40; p.bx = 20 + Math.random() * (W - 40); }
      const x = p.bx + Math.sin(t * p.sw + p.ph) * 30 - S.px * 12 * p.s;
      p.o.setPosition(x, p.y); p.o.setAngle(p.a0 + t * p.vr);
      p.o.setOpacity(Math.max(0, 120 * Math.min(1, p.y / 140, (H - p.y) / 140)) * clamp(t / 1.2, 0, 1));
    });
    S.chispas.forEach(c => {
      const s = 0.5 + 0.5 * Math.sin(t * c.f + c.ph), sz = (8 + 24 * s) * c.s;
      c.o.setWidth(sz); c.o.setHeight(sz); c.o.setPosition(c.x - sz / 2 - S.px * 16, c.y - sz / 2); c.o.setOpacity(200 * s * s * clamp((t - 0.6) / 1.2, 0, 1));
    });
    // destello que cruza el titulo cada ~7 s
    { const fase = (t - 1.4) % 7; let a = 0, x = 0;
      if (t > 1.4 && fase < 0.9) { const p = fase / 0.9; a = Math.sin(Math.PI * p); x = 70 + 580 * eo(p); }
      const sz = 12 + 34 * a; S.barrido.setWidth(sz); S.barrido.setHeight(sz); S.barrido.setPosition(x - sz / 2, M.titulo.y + M.titulo.size * 0.6 - sz / 2); S.barrido.setOpacity(255 * a); }

    // ---- titulo: cae con rebote, subtitulo despues y la regla se abre ----
    [[S.titulo[0], M.titulo.y, 0.1], [S.titulo[1], M.sub.y, 0.32]].forEach(([o, y0, d]) => {
      const p = (t - d) / 0.7; o.setPosition(40, y0 - (1 - eb(p)) * 50); o.setOpacity(255 * clamp(p * 1.6, 0, 1));
    });
    { const w = M.regla.w * eo((t - 0.55) / 0.6) * (1 + 0.05 * Math.sin(t * 1.4)); U.pset(S.regla, W / 2 - w / 2, M.regla.y, Math.max(0, w), 4); }

    // ---- personaje: aparece subiendo, respira, se mece y salta al tocarlo ----
    let sf = 1;     // visibilidad por el cambio de personaje (1 = presente)
    { const h = S.hop, base = M.hero.y + M.hero.size, HS = M.hero.size, p = (t - 0.25) / 0.9, resp = Math.sin(t * 1.7 + 1);
      // cambio de personaje: sale (0.22 s), se carga el nuevo y entra con un saltito (0.28 s)
      if (S.swap) {
        const w = S.swap; w.t += dt;
        if (w.t < 0.22) sf = 1 - eo(w.t / 0.22);
        else { if (!w.hecho) { w.hecho = true; S.cargarPersonaje(w.id); S.dlg.t0 = S.t + 0.1; h.v = 380; h.at = 0; } sf = eo((w.t - 0.22) / 0.28); }
        if (w.t >= 0.5) S.swap = null;
      }
      const a = clamp(p * 1.6, 0, 1) * sf;
      if (h.h > 0 || h.v > 0) { h.at += dt; h.v -= 2100 * dt; h.h += h.v * dt; if (h.h <= 0 || h.at > 1.4) { h.h = 0; if (h.v < -150) h.sq = 0.1; h.v = 0; h.at = 0; } }   // tope de 1.4 s en el aire
      h.sq = Math.max(0, h.sq - dt * 0.5);
      // efectos de los mensajes especiales
      const fx = S.fx; fx.t += dt; let rot = 0, esc = 1, opf = 1, dx = 0;
      if (fx.tipo === "giro") rot = 360 * eo(fx.t / 1.3);
      else if (fx.tipo === "gigante") esc = 1 + 0.28 * Math.sin(Math.PI * clamp(fx.t / 2.2, 0, 1));
      else if (fx.tipo === "fantasma") { if (fx.t < 2.4) opf = 0.4 + 0.5 * Math.pow(Math.sin(fx.t * 9), 2); }
      else if (fx.tipo === "glitch") { if (fx.t < 1.3) { dx = (Math.random() - 0.5) * 20; opf = Math.random() < 0.25 ? 0.35 : 1; } }
      else if (fx.tipo === "temblor") { if (fx.t < 1.4) dx = Math.sin(fx.t * 70) * 8 * (1 - fx.t / 1.4); }
      const sq = h.sq * Math.min(1, h.sq * 14), alto = HS * (1 + 0.012 * resp - sq) * esc, ancho = HS * (1 - 0.006 * resp + sq * 0.6) * esc;
      const bob = Math.sin(t * 1.7) * 5 + (1 - eb(p)) * 80 + (1 - sf) * 50;
      S.hero.setWidth(ancho); S.hero.setHeight(alto); S.hero.setPosition(W / 2 - ancho / 2 + S.px * 8 + dx, base - alto - h.h + bob);
      S.hero.setAngle(Math.sin(t * 1.1) * 1.2 + S.px * 1.5 + (h.h > 0 ? h.v * 0.004 : 0) + rot); S.hero.setOpacity(255 * a * opf);
      const gs = 560 * (1 + 0.04 * Math.sin(t * 1.3));
      S.halo.setWidth(gs); S.halo.setHeight(gs); S.halo.setPosition(W / 2 - gs / 2 + S.px * 14, M.hero.y + HS / 2 - gs / 2 - h.h * 0.3); S.halo.setOpacity((75 + 35 * Math.sin(t * 1.3)) * a);
      const sw = 270 * (1 - Math.min(0.5, h.h / 260)), shh = 34 * (1 - Math.min(0.5, h.h / 260));
      S.sombra.setWidth(sw); S.sombra.setHeight(shh); S.sombra.setPosition(W / 2 - sw / 2 + S.px * 8, base - 12); S.sombra.setOpacity(170 * a * (1 - Math.min(0.6, h.h / 220))); }

    // ---- recuadro de dialogo: aparece y escribe (cambia de frase solo tras unos segundos) ----
    { const D = S.dlg, a = clamp((t - 0.95) / 0.45, 0, 1) * sf, n = Math.max(0, Math.floor((t - D.t0) * 34));
      D.bg.setOpacity(225 * a); D.borde.setOpacity(255 * a); D.placa.setOpacity(255 * a); D.nom.setOpacity(255 * a); D.txt.setOpacity(255 * a);
      const cuantos = Math.min(D.full.length, n);
      if (cuantos !== D.n) { D.n = cuantos; U.setTxt(D.txt, D.full.slice(0, cuantos)); }
      if (n > D.full.length + 34 * 5.5) S.avanzarPersonaje(); }

    // ---- botones: entran escalonados, crecen al apuntarlos y se hunden al pulsarlos ----
    S.orden.forEach(b => {
      const p = (t - b.delay) / 0.5, al = clamp(p * 2, 0, 1) * 255, dy = (1 - eb(p)) * 46;
      b.k = U.suave(b.k, b.est === "hover" ? 1 : b.est === "down" ? -0.5 : 0, dt);
      const e = 6 * b.k, y = b.y + dy;
      if (b.nl !== b.lbl) { b.nl = b.lbl; b.nn = U.envolver(b.lbl, b.size, b.w - 24, b.fuente).length; }
      U.pset(b.bd, b.x - e, y - e, b.w + 2 * e, b.h + 2 * e); U.pset(b.f, b.x - e + 4, y - e + 4, b.w + 2 * e - 8, b.h + 2 * e - 8);
      b.t.setPosition(b.x + 12, y + Math.max(2, (b.h - b.nn * b.size * L.txt.lhB) / 2));
      b.bd.setOpacity(al); b.f.setOpacity(al); b.t.setOpacity(al);
    });
    { const b = S.orden[0], al = clamp((t - b.delay) / 0.5, 0, 1), gw = b.w + 150, gh = b.h + 110;
      S.glow.setWidth(gw); S.glow.setHeight(gh); S.glow.setPosition(b.x + b.w / 2 - gw / 2, b.y + b.h / 2 - gh / 2); S.glow.setOpacity(al * (60 + 40 * Math.sin(t * 2.4)));
      if (S.ctx) S.ctx.setOpacity(255 * al); }

    // ---- fundido de entrada / salida ----
    if (S.sale) { S.sale.t += dt; S.velo.setOpacity(255 * eo(S.sale.t / 0.3)); if (S.sale.t >= 0.3) { const fn = S.sale.fn; S.sale = null; fn(); } }
    else S.velo.setOpacity(255 * (1 - eo(t / 0.55)));
  }
  U.pub("Estado", "menu"); U.pub("MenuSeleccion", S.sel.f);
}
