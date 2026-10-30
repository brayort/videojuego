// ============================================================================
// 50 ENTRADA — enrutado de la entrada segun el estado + pausa (Escape).
// La lectura cruda (mouse/teclas/dt) ya la dejo 00_comun en S.in.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.mod_entrada) {
  S.mod_entrada = true;
  const U = S.u, L = U.L, W = U.W, H = U.H, setTxt = U.setTxt;
  const UMBRAL = L.hud.umbral;
  S.pui = [];
  S.psel = 0; S.pkb = false;

  // ---- pausa: capa oscura con botones grandes por encima de todo lo demas ----
  S.pausar = function () {
    if (S.estado === "pausa") return;
    S.estadoPrev = S.estado; S.estado = "pausa"; S.espera = 0.3; S.psel = 0; S.pkb = false;
    const P = L.pausa, A = S.pui;
    U.pnl(A, "negro", 0, 0, W, H, 900, 238);
    setTxt(U.mkTxt(A, "TxtTitulo", 40, P.titulo.y, P.titulo.size, W - 80, { al: "center", col: "dorado_claro", z: 910 }), "PAUSA");
    setTxt(U.mkTxt(A, "TxtTexto", 40, P.info.y, 26, W - 80, { al: "center", col: "crema", z: 910 }),
      "Director #" + S.dyn.n + " · " + S.fecha().txt + " · Semana " + S.semana + "\nLa partida se autoguarda en cada carta.");
    S.pbtn = [
      U.mkBtn(A, P.btn.x, P.btn.y, P.btn.w, P.btn.h, "Continuar", 910),
      U.mkBtn(A, P.btn.x, P.btn.y + P.btn.pitch, P.btn.w, P.btn.h, "Opciones", 910),
      U.mkBtn(A, P.btn.x, P.btn.y + 2 * P.btn.pitch, P.btn.w, P.btn.h, "Guardar y salir al menú", 910),
    ];
    setTxt(U.mkTxt(A, "TxtTexto", 40, P.btn.y + 3 * P.btn.pitch + 10, 22, W - 80, { al: "center", col: "crema_osc", z: 910 }), "Esc, Enter o 1 para continuar · 2 opciones · 3 para salir");
  };
  S.reanudar = function () {
    U.limpiar(S.pui); S.pbtn = [];
    S.estado = S.estadoPrev || "carta"; S.espera = 0.3;
    S.esperaSoltar = true; S.teclaDir = 0; S.dx = 0; S.dy = 0; S.drag = false;
  };
  S.updatePausa = function (I) {
    let k = -1;
    if (I.kp[38]) { S.psel = Math.max(0, S.psel - 1); S.pkb = true; }
    if (I.kp[40]) { S.psel = Math.min(2, S.psel + 1); S.pkb = true; }
    if (S.espera <= 0 && (I.kp[13] || I.kp[32])) k = S.psel;
    if (I.kp[49]) k = 0; else if (I.kp[50]) k = 1; else if (I.kp[51]) k = 2;
    S.pbtn.forEach((b, j) => { if (U.btnTick(b, I, S.pkb && j === S.psel) && S.espera <= 0) k = j; });
    if (k === 0) S.reanudar();
    else if (k === 1) {
      // Opciones (volumen, silencio, vibracion, nombre): ventana modal sobre la pausa.
      try { U.ocultar(S.pui, true); S.modal = U.modalOpciones(920); S.modal.pausa = true; } catch (e) { S.modal = null; U.ocultar(S.pui, false); }
    } else if (k === 2) { U.limpiar(S.pui); U.cambiarEscena("Menu"); }
  };

  // ---- carta: arrastre (mouse/tactil) y teclas ----
  S.inputCarta = function (I) {
    const kd = I.kd, pulsado = I.pulsado, mx = I.mx, my = I.my, dt = I.dt;
    if (S.esperaSoltar) { if (!pulsado) S.esperaSoltar = false; S.dx = 0; S.dy = 0; return; }
    if (pulsado) {
      if (!S.drag) { S.drag = true; S.x0 = mx; S.y0 = my; }
      S.dx = mx - S.x0; S.dy = my - S.y0;
      if (!S.sndArr && (Math.abs(S.dx) > 40 || Math.abs(S.dy) > 40)) { S.sndArr = true; U.ev("arrastre"); }
    } else if (S.drag) {
      S.sndArr = false;
      S.drag = false;
      const dx = S.dx, dy = S.dy; S.dx = 0; S.dy = 0;
      if (S.arribaDisp() && -dy > UMBRAL && -dy > Math.abs(dx)) S.elegir(S.c.arriba);
      else if (Math.abs(dx) > UMBRAL) S.elegir(dx < 0 ? S.c.izq : S.c.der);
    } else {
      if (kd[37]) S.teclaDir = -1;
      else if (kd[39]) S.teclaDir = 1;
      else if (kd[38] && S.arribaDisp()) S.teclaDir = 2;
      else if (S.teclaDir) {
        const t = S.teclaDir; S.teclaDir = 0; S.dx = 0; S.dy = 0;
        return S.elegir(t === 2 ? S.c.arriba : t < 0 ? S.c.izq : S.c.der);
      }
      // Animacion de la carta mientras se mantiene la tecla / al volver al centro
      S.dx = S.teclaDir === 2 ? 0 : S.teclaDir ? S.teclaDir * (UMBRAL + 20) : S.dx * Math.max(0, 1 - dt * 12);
      S.dy = S.teclaDir === 2 ? -(UMBRAL + 20) : S.teclaDir ? 0 : S.dy * Math.max(0, 1 - dt * 12);
    }
  };

  S.entrada = function () {
    const I = S.in;
    // Ventana modal abierta (Opciones desde la pausa, Ranking desde el destino): ella recibe toda la entrada.
    if (S.modal) {
      if (S.modal.tick(I)) {
        const m = S.modal; S.modal = null; m.destroy();
        if (m.pausa) U.ocultar(S.pui, false);
        S.espera = 0.3; S.esperaSoltar = true;
      }
      return;
    }
    S.espera = Math.max(0, (S.espera || 0) - I.dt);
    const enRk = S.estado === "destino" && S.rkBtn && !S.rkBtn.t.__borrado && U.hit(S.rkBtn, I.mx, I.my);
    const quiere = !enRk && S.espera <= 0 && (I.click || I.kp[32] || I.kp[13]);
    // En pantallas paginadas el toque pasa de pagina (o retrocede con el boton de la izquierda) antes de continuar.
    const avanza = quiere && !(S.pagManejar && S.estado !== "pausa" && S.estado !== "carta" && S.pagManejar(I));
    if (I.kp[27]) { if (S.estado === "pausa") S.reanudar(); else S.pausar(); return; }
    switch (S.estado) {
      case "pausa": S.updatePausa(I); break;
      case "fin": if (avanza) S.sucesionPantalla(); break;
      case "sucesion": if (avanza) S.epilogoPantalla(); break;
      case "epilogo": if (avanza) { if (S.destinoPend) S.destinoPantalla(); else S.nuevaPartida(); } break;
      case "destino": if (avanza) S.destinoCerrar(); break;
      case "informe": if (avanza) S.siguiente(); break;
      case "eleccion":
        if (S.elec) {
          if (avanza && !S.elec.listo) S.elec.t = 99;            // saltar la animacion
          else if (avanza) { S.cerrarEleccion(); break; }
          S.updateEleccion(I.dt);
        }
        break;
      case "mini":
        if (S.m && S.m.fase === "res") { if (avanza) S.cerrarMini(); }
        else if (S.m) S.updateMini(I.dt, I.click, I.mx, I.my, I.kp);
        break;
      default: S.inputCarta(I);
    }
  };
}
if (S.listo && !S.saliendo) S.entrada();
