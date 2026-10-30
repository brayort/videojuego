// ============================================================================
// LOGROS — escena "Logros": lista paginada de logros (estrella = desbloqueado).
// Esc / Enter / boton "Volver" regresan al Menu. Flechas izq/der o botones cambian de pagina.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.logrosListo) {
  S.logrosListo = true;
  const U = S.u, L = U.L, W = U.W, H = U.H, setTxt = U.setTxt, LG = L.logros;
  S.ui = []; S.filas = [];
  S.fondo = runtimeScene.createObject("Fondo");
  S.fondo.setPosition(0, 0); S.fondo.setZOrder(-10); U.anim(S.fondo, "logros");
  const total = U.LOGROS.length, ok = U.LOGROS.filter(l => U.logros[l[0]]).length;
  const fin = Object.keys(U.logros).filter(k => k.indexOf("final_") === 0 && k !== "final_secreto").length;
  setTxt(U.mkTxt(S.ui, "TxtTitulo", 40, LG.titulo.y, LG.titulo.size, W - 80, { al: "center", col: "dorado_claro", z: 20 }), "LOGROS  " + ok + "/" + total);
  const br = U.barra(S.ui, LG.barra.x, LG.barra.y, LG.barra.w, LG.barra.h, "dorado", 10); br.set(ok / Math.max(1, total));
  setTxt(U.mkTxt(S.ui, "TxtTexto", 40, LG.resumen.y, LG.resumen.size, W - 80, { al: "center", col: "crema_osc", z: 20 }),
    "Caídas especiales descubiertas: " + fin + " · Destinos de la UAN: " + Object.keys(U.logros).filter(k => k.indexOf("destino_") === 0).length + "/9");
  S.n = Math.max(1, Math.ceil(total / LG.lista.n)); S.pag = 0;
  S.nav = U.pager(S.ui, LG.pag.y, 30);
  S.volver = U.mkBtn(S.ui, LG.volver.x, LG.volver.y, LG.volver.w, LG.volver.h, "Volver");
  S.pagina = function () {
    U.limpiar(S.filas);
    const R = LG.lista;
    U.LOGROS.slice(S.pag * R.n, S.pag * R.n + R.n).forEach((l, k) => {
      const y = R.y + k * R.row, got = !!U.logros[l[0]], sec = !got && !!l[3];
      U.pnl(S.filas, got ? "dorado" : "gris", R.x, y, R.w, R.row - 8, 8, got ? 255 : 120);
      U.pnl(S.filas, got ? "guinda" : "guinda_osc", R.x + 3, y + 3, R.w - 6, R.row - 14, 9);
      U.ico(S.filas, got ? "estrella" : sec ? "candado" : "estrella_vacia", R.x + 20, y + 22, 48, 20);
      const t = U.mkTxt(S.filas, "TxtTexto", R.x + 88, y + 8, 26, R.w - 108, { col: got ? "dorado_claro" : "crema", z: 20 });
      setTxt(t, sec ? "???" : l[1]);
      const d = U.mkTxt(S.filas, "TxtTexto", R.x + 88, y + 42, 22, R.w - 108, { col: got ? "crema" : "crema_osc", z: 20 });
      setTxt(d, sec ? "Logro secreto: sigue jugando para descubrirlo." : l[2]);
    });
    S.nav.set(S.pag, S.n);
  };
  S.pagina();
  U.pub("Estado", "logros");
}
if (!S.saliendo) {
  const U = S.u, I = S.in;
  let paso = 0;
  if (I.kp[37]) paso = -1; if (I.kp[39]) paso = 1;
  if (S.n > 1) {
    if (U.btnTick(S.nav.prev, I)) paso = -1;
    if (U.btnTick(S.nav.next, I)) paso = 1;
  }
  if (paso && S.pag + paso >= 0 && S.pag + paso < S.n) { S.pag += paso; S.pagina(); }
  const f = U.btnTick(S.volver, I);
  if (I.kp[27] || I.kp[13] || f) U.cambiarEscena("Menu");
}
