// ============================================================================
// MENU — escena "Menu": Nueva partida, Continuar, Logros, Nueva historia, Crónica, Créditos.
// Comunica con la escena Juego mediante la variable GLOBAL "Modo"
// (nueva | continuar). Teclado: flechas + Enter; raton/tactil: botones grandes
// (se activan al soltar sobre ellos, con estado normal / hover / presionado).
// Muestra los medidores de la UAN y de Nayarit (meta-estado de la dinastia).
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.menuListo) {
  S.menuListo = true;
  const U = S.u, L = U.L, W = U.W, H = U.H, setTxt = U.setTxt, anim = U.anim, M = L.menu;
  S.ui = []; S.sub = []; S.vista = "menu"; S.kb = false;
  S.fondo = runtimeScene.createObject("Fondo");
  S.fondo.setPosition(0, 0); S.fondo.setZOrder(-10); anim(S.fondo, "menu");
  const t1 = U.mkTxt(S.ui, "TxtTitulo", 40, M.titulo.y, M.titulo.size, W - 80, { al: "center", col: "crema", z: 20 }); setTxt(t1, "DIRECTOR UAN");
  const t2 = U.mkTxt(S.ui, "TxtTitulo", 40, M.sub.y, M.sub.size, W - 80, { al: "center", col: "dorado", z: 20 }); setTxt(t2, "ECONOMÍA");
  U.pnl(S.ui, "dorado", W / 2 - 120, M.sub.y + 66, 240, 4, 20);
  const dyn = U.cargarDyn(), cron = U.cronica();
  S.hayGuardada = !!U.leerPartida();
  S.mp = U.metrosPanel(S.ui, M.metros, 10);
  S.info = U.mkTxt(S.ui, "TxtTexto", 40, M.info.y, M.info.size, W - 80, { al: "center", col: "crema_osc", z: 20 });
  setTxt(S.info, "Historia #" + (cron.length + 1) + " · Director #" + dyn.n + " · Récord: " + U.record() + " semanas\nLogros: " +
    Object.keys(U.logros).filter(k => U.LOGROS.some(l => l[0] === k)).length + "/" + U.LOGROS.length);
  S.dyn = dyn;
  U.pub("UAN_Solvencia", dyn.uan.solv); U.pub("UAN_Paz", dyn.uan.paz); U.pub("UAN_Autonomia", dyn.uan.aut); U.pub("UAN_Prestigio", dyn.uan.pre);
  U.pub("Nay_Desarrollo", dyn.nay.des); U.pub("Nay_Seguridad", dyn.nay.seg); U.pub("Historia", cron.length + 1);
  S.sel = 0; S.confirmaNH = false;
  S.items = ["Nueva partida", S.hayGuardada ? "Continuar" : "Continuar (sin partida)", "Logros", "Nueva historia", "Crónica", "Créditos"];
  S.btns = S.items.map((t, i) => U.mkBtn(S.ui, M.btn.x, M.btn.y + i * M.btn.pitch, M.btn.w, M.btn.h, t));
  if (!S.hayGuardada) S.btns[1].off = true;

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
    abreSub("CRÓNICA DE LA UAN");
    const A = S.sub, c = U.cronica().slice().reverse(), POR = 4;
    S.cron = { c, i: 0, n: Math.max(1, Math.ceil(c.length / POR)), items: [], nav: U.pager(A, 1030, 310) };
    S.cronPagina = function () {
      const C = S.cron;
      U.limpiar(C.items);
      if (!c.length) {
        const t = U.mkTxt(C.items, "TxtTexto", 40, 200, 26, W - 80, { al: "center", col: "crema", z: 310 });
        setTxt(t, "Aún no hay historias terminadas.\nUna historia termina tras 8 directores o si un medidor de la UAN o de Nayarit llega a un extremo.");
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
    setTxt(t, "Director UAN: Economía\n\nJuego de decisiones tipo cartas hecho con GDevelop 5.\n\nDiseño, texto y programación: equipo del proyecto.\n\nTipografías: Lora y Bebas Neue (SIL Open Font License).");
  };
  S.activar = function (i) {
    if (i !== 3) S.confirmaNH = false;
    if (i === 0) { U.gset("Modo", "nueva"); U.cambiarEscena("Juego"); }
    else if (i === 1) { if (S.hayGuardada) { U.gset("Modo", "continuar"); U.cambiarEscena("Juego"); } }
    else if (i === 2) U.cambiarEscena("Logros");
    else if (i === 3) {
      // Nueva historia: reinicia toda la dinastia y los medidores (los logros y la cronica se conservan). Pide confirmar.
      if (!S.confirmaNH) { S.confirmaNH = true; return; }
      U.guardarDyn(U.dynNueva()); U.borrarPartida();
      U.gset("Modo", "nueva"); U.cambiarEscena("Juego");
    } else if (i === 4) S.abrirCronica();
    else if (i === 5) S.abrirCreditos();
  };
}
if (!S.saliendo) {
  const U = S.u, I = S.in, n = S.items.length;
  S.mp.set(S.dyn, I.dt);
  if (S.vista === "sub") {
    let paso = 0;
    if (S.cron) {
      const C = S.cron;
      if (I.kp[37]) paso = -1; if (I.kp[39]) paso = 1;
      if (C.n > 1) {
        if (U.btnTick(C.nav.prev, I)) paso = -1;
        if (U.btnTick(C.nav.next, I)) paso = 1;
      }
      if (paso && C.i + paso >= 0 && C.i + paso < C.n) { C.i += paso; S.cronPagina(); }
    }
    const f = U.btnTick(S.volver, I);
    if (I.kp[27] || I.kp[13] || f) S.cierraSub();
  } else {
    if (I.kp[40]) { S.sel = (S.sel + 1) % n; S.kb = true; }
    if (I.kp[38]) { S.sel = (S.sel + n - 1) % n; S.kb = true; }
    let k = -1;
    if (I.kp[13] || I.kp[32]) k = S.sel;
    if (I.kp[49]) k = 0; else if (I.kp[50]) k = 1; else if (I.kp[51]) k = 2;
    S.btns.forEach((b, j) => {
      b.fijo = j === 3 && S.confirmaNH ? "peligro" : "";
      U.btnTxt(b, j === 3 && S.confirmaNH ? "¿Seguro? Toca otra vez" : S.items[j]);
      if (U.btnTick(b, I, S.kb && j === S.sel)) { k = j; S.sel = j; }
    });
    if (k >= 0) S.activar(k);
  }
  U.pub("Estado", "menu"); U.pub("MenuSeleccion", S.sel);
}
