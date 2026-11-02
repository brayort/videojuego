// ============================================================================
// 45 DEBUG — panel de depuracion de la escena Juego (solo si src/config.json
// tiene "debug": true; en la version publicada no existe).
// F2 abre/cierra el panel. Mientras esta abierto consume la entrada.
// Permite: ver el estado, mover stats y medidores, saltar a una carta por id,
// avanzar semanas, dar expedientes, forzar caida / eleccion / destino y ver
// cinematicas. Publica la variable de escena DebugActivo.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.mod_debug) {
  S.mod_debug = true;
  const U = S.u, L = U.L, W = U.W, H = U.H, setTxt = U.setTxt;
  const ON = !!(U.CFG && U.CFG.debug);
  const D = S.dbg = { on: ON, abierto: false, ui: [], btn: [], info: null, msg: "" };
  const Z = 950;
  const pedir = (txt, def) => { try { if (typeof prompt === "function") { const r = prompt(txt, def || ""); return typeof r === "string" ? r.trim() : null; } } catch (e) { } return null; };
  const aviso = m => { D.msg = m; };
  const enCarta = () => S.estado === "carta" && S.c;
  const mover = (i, d) => { S.v[i] = U.clamp(S.v[i] + d, 1, 99); };

  // [etiqueta, accion]  (filas de 3)
  const ACC = [
    ["Acad −10", () => mover(0, -10)], ["Acad +10", () => mover(0, 10)], ["Integr. ±", () => { S.int = S.int >= 50 ? 20 : 80; }],
    ["Est −10", () => mover(1, -10)], ["Est +10", () => mover(1, 10)], ["Todo a 50", () => { S.v = [50, 50, 50, 50]; }],
    ["Fin −10", () => mover(2, -10)], ["Fin +10", () => mover(2, 10)], ["Expedientes", () => { Object.keys(S.data.items || {}).forEach(k => { S.items[k] = true; }); aviso("todos los expedientes"); }],
    ["Pol −10", () => mover(3, -10)], ["Pol +10", () => mover(3, 10)], ["+8 semanas", () => { S.semana += 8; aviso("semana " + S.semana); }],
    ["Ir a carta…", () => {
      const id = pedir("Id de la carta:", S.c ? S.c.id : ""); if (!id) return;
      const c = S.porId[id]; if (!c) return aviso("no existe la carta " + id);
      cerrar(); S.setEstado("carta"); S.c = c; S.mostrarCarta(); aviso("carta " + id);
    }],
    ["Otra carta", () => { cerrar(); S.siguiente(); }],
    ["Bandera…", () => { const f = pedir("Bandera (prefijo - para quitarla):"); if (!f) return; if (f[0] === "-") delete S.flags[f.slice(1)]; else S.flags[f] = true; aviso("banderas: " + Object.keys(S.flags).length); }],
    ["Elección ya", () => { cerrar(); S.eleccionEn = S.semana; S.postEleccion(); }],
    ["Caer (Fin 0)", () => { cerrar(); S.v[2] = 0; S.postEleccion(); }],
    ["Medidores…", () => {
      const r = pedir("solv,paz,aut,pre,des,seg (0-100):", [S.dyn.uan.solv, S.dyn.uan.paz, S.dyn.uan.aut, S.dyn.uan.pre, S.dyn.nay.des, S.dyn.nay.seg].join(","));
      if (!r) return; const v = r.split(",").map(x => U.clamp(+x || 0, 0, 100)); if (v.length !== 6) return aviso("hacen falta 6 valores");
      [S.dyn.uan.solv, S.dyn.uan.paz, S.dyn.uan.aut, S.dyn.uan.pre, S.dyn.nay.des, S.dyn.nay.seg] = v; S.guardarDyn(); aviso("medidores actualizados");
    }],
    ["Destino…", () => {
      const ids = (S.data.destinos || []).map(d => d.id), id = pedir("Destino (" + ids.join(", ") + "):", ids[0]); if (!id) return;
      const d = (S.data.destinos || []).find(x => x.id === id); if (!d) return aviso("no existe el destino " + id);
      cerrar(); S.destinoPend = d; S.destinoPantalla();
    }],
    ["Cinemática…", () => {
      const id = pedir("Id de la cinemática:"); if (!id) return;
      if (!U.cine.existe(id)) return aviso("no existe la cinemática " + id);
      cerrar(); U.lsDel("cine_vistas"); U.cine.reproducir(id);
    }],
    ["Cerrar (F2)", () => cerrar()],
  ];

  function abrir() {
    if (D.abierto) return;
    D.abierto = true; D.msg = "";
    const A = D.ui, x0 = 24, w = W - 48;
    U.pnl(A, "negro", 0, 0, W, H, Z, 230);
    setTxt(U.mkTxt(A, "TxtTitulo", 24, 20, 48, w, { al: "center", col: "dorado_claro", z: Z + 2 }), "DEPURACIÓN");
    D.info = U.mkTxt(A, "TxtTexto", x0, 84, 22, w, { al: "left", col: "crema", z: Z + 2 });
    const bw = (w - 16) / 3, bh = 70, y0 = 560;
    D.btn = ACC.map((a, i) => U.mkBtn(A, x0 + (i % 3) * (bw + 8), y0 + Math.floor(i / 3) * (bh + 8), bw, bh, a[0], Z + 4, { size: 24 }));
  }
  function cerrar() { if (!D.abierto) return; U.limpiar(D.ui); D.btn = []; D.info = null; D.abierto = false; S.espera = 0.3; S.esperaSoltar = true; }
  D.cerrar = cerrar;

  function texto() {
    const c = S.c, u = S.dyn.uan, n = S.dyn.nay;
    const fl = Object.keys(S.flags), it = Object.keys(S.items);
    return [
      "Estado: " + S.estado + " · semana " + S.semana + " (" + S.fecha().txt + ") · elección en " + S.semanasParaEleccion() + " sem",
      "Director #" + S.dyn.n + " " + (S.dirNombre || "") + " · rasgo " + (S.rasgo || "-") + " · reelecciones " + S.reel,
      "Stats  acad " + S.v[0] + " · est " + S.v[1] + " · fin " + S.v[2] + " · pol " + S.v[3] + " · integridad " + S.int,
      "UAN  solv " + u.solv + " · paz " + u.paz + " · aut " + u.aut + " · pre " + u.pre + "   Nayarit  des " + n.des + " · seg " + n.seg,
      "Carta: " + (c ? c.id + " (" + c.pj + ")" : "-") + " · usadas " + Object.keys(S.usadas || {}).length + "/" + S.data.cartas.length + " · encoladas " + (S.futuro || []).length,
      "Banderas (" + fl.length + "): " + (fl.slice(-8).join(", ") || "-"),
      "Expedientes: " + (it.join(", ") || "-") + " · Estados: " + (S.estadosTxt() || "-"),
      D.msg ? "» " + D.msg : "",
    ].join("\n");
  }

  S.tickDebug = function () {
    if (!D.on) return;
    const I = S.in;
    if (I.kp[113]) { D.abierto ? cerrar() : (U.cine && U.cine.activo ? null : abrir()); }
    if (!D.abierto) return;
    const t = texto(); if (D.info && U.getTxt(D.info) !== t) setTxt(D.info, t);
    D.btn.forEach((b, i) => { if (U.btnTick(b, I)) { try { ACC[i][1](); } catch (e) { aviso("error: " + e.message); } } });
    if (I.kp[27]) cerrar();
    I.click = false; I.kp = {}; I.kd = {}; I.soltar = false; I.pulsado = false;   // el juego no recibe la entrada
  };
}
if (S.listo && !S.saliendo) {
  S.tickDebug();
  S.u.pub("DebugActivo", S.dbg.abierto ? 1 : 0);
}
