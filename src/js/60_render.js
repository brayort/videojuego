// ============================================================================
// 60 RENDER — arranca la partida (nueva o continuada), dibuja el HUD de la carta
// y las pantallas (informe, fin, sucesion, epilogo, destino, eleccion, minijuegos)
// y PUBLICA el estado en VARIABLES DE ESCENA de GDevelop (ver ESQUEMA.md).
// Posiciones y tamanos: U.L (LAYOUT de 00_comun.js, espejo en src/layout.json).
// Los modulos 20/30/40 dejan sus textos en "ranuras" (S.o.pj, S.o.texto, S.o.opcion,
// S.o.tiempo); aqui se decide donde y como se muestran segun el estado.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.mod_render) {
  S.mod_render = true;
  const U = S.u, L = U.L, W = U.W, H = U.H, setTxt = U.setTxt, anim = U.anim, E = U.ease, HL = L.hud, CD = HL.carta;
  const CX = CD.x + CD.w / 2;
  S.hud = []; S.cond = []; S.scr = []; S.fant = [];
  S.chipsL = []; S.invL = []; S.afL = []; S.keys = {};
  S.hudVis = null; S.vistaId = 0; S.pag = null; S.pantalla = null;
  const vis = (o, v) => { if (o.__v === v) return; o.__v = v; try { o.hide(!v); } catch (e) { } };
  const T = (lista, name, x, y, size, w, col, al, z) => { const o = U.txt(name, x, y, size, w, { col, al, z }); lista.push(o); return o; };
  const clamp = U.clamp;

  // La vista se reconstruye cada vez que cambia el estado.
  const setEstadoOrig = S.setEstado;
  S.setEstado = function (e) { S.vistaId++; return setEstadoOrig.call(S, e); };

  // ---- cartas "fantasma": la carta elegida sale volando y rotando ----
  const elegirOrig = S.elegir;
  S.elegir = function (op) {
    if (S.estado === "carta" && S.c && op && S.hudVis) {
      const dir = op === S.c.izq ? -1 : op === S.c.der ? 1 : 0;
      const g = { dir, t: 0, x: CX + S.dx, y: CD.y + Math.abs(S.dx) * 0.1, ang: S.dx * 0.06 };
      g.c = runtimeScene.createObject("Carta"); g.r = runtimeScene.createObject("Retrato"); g.s = runtimeScene.createObject("SombraCarta"); anim(g.s, "sombra"); g.s.setZOrder(29); g.s.setWidth(CD.w); g.s.setHeight(CD.h);
      anim(g.c, S.c.pj); anim(g.r, S.c.pj);
      g.c.setZOrder(30); g.r.setZOrder(31);
      [g.c, g.r].forEach((o, k) => { o.setWidth(k ? CD.ret : CD.w); o.setHeight(k ? CD.ret : CD.h); });
      S.fant.push(g);
      S.flipRetraso = L.ease.volar * 0.45;
    }
    return elegirOrig.apply(this, arguments);
  };
  S.tickFant = function (dt) {
    S.fant.slice().forEach(g => {
      g.t += dt;
      const p = clamp(g.t / L.ease.volar, 0, 1), e = E.in(p);
      const x = g.x + g.dir * (W * 0.9) * e, y = g.y + (g.dir === 0 ? -H * 0.8 * e : H * 0.12 * e), ang = g.ang + (g.dir || 0) * 42 * e;
      g.c.setPosition(x - CD.w / 2, y); g.c.setAngle(ang);
      g.r.setPosition(x - CD.ret / 2, y + CD.retDy); g.r.setAngle(ang);
      g.s.setPosition(x - CD.w / 2 + CD.sombra * 0.8, y + CD.sombra * 1.2); g.s.setAngle(ang); g.s.setOpacity(255 * (1 - 0.6 * e));
      g.c.setOpacity(255 * (1 - 0.6 * e)); g.r.setOpacity(255 * (1 - 0.6 * e));
      if (p >= 1) { U.borrar(g.c); U.borrar(g.r); U.borrar(g.s); const i = S.fant.indexOf(g); if (i >= 0) S.fant.splice(i, 1); }
    });
  };

  // ======================= HUD de la carta =======================
  S.arrancar = function () {
    const hud = S.hud;
    S.o = {
      fondo: runtimeScene.createObject("Fondo"),
      flash: runtimeScene.createObject("Flash"),
    };
    S.o.fondo.setPosition(0, 0); S.o.fondo.setZOrder(-10);
    try { S.o.flash.setWidth(W); S.o.flash.setHeight(H); } catch (e) { }
    S.o.flash.setPosition(0, 0); S.o.flash.setZOrder(1000); S.o.flash.setOpacity(0);

    // indicadores: marco + relleno vertical + icono + etiqueta + punto de vista previa
    S.ind = S.STATS.map((n, i) => {
      const I = HL.ind, cx = I.x0 + i * I.celda + I.celda / 2, x = cx - I.s / 2, y = I.y, b = I.borde, o = { cx };
      o.bd = U.pnl(hud, "vino", x, y, I.s, I.s, 12);
      U.pnl(hud, "guinda_osc", x + b, y + b, I.s - 2 * b, I.s - 2 * b, 13);
      o.fill = U.pnl(hud, "dorado", x + b, y + I.s - b, I.s - 2 * b, 0, 14);
      o.ic = runtimeScene.createObject("IconoStat"); anim(o.ic, S.STAT_ANIM[i]);
      o.ic.setPosition(cx - I.icono / 2, y + (I.s - I.icono) / 2); o.ic.setZOrder(15); hud.push(o.ic);
      o.lab = T(hud, "TxtTexto", cx - I.celda / 2, I.etY, 22, I.celda, "crema", "center", 20); setTxt(o.lab, n);
      o.dot = U.ico(S.cond, "punto_crema", cx - 7, HL.punto.cy - 7, HL.punto.chico, 20); o.dot.hide(true); o.dot.__v = false;
      o.q = T(S.cond, "TxtTexto", cx - 20, HL.punto.cy - 18, 28, 40, "dorado_claro", "center", 20); setTxt(o.q, "?"); o.q.hide(true); o.q.__v = false;
      o.vis = S.v ? S.v[i] : 50; o.fillCol = "dorado"; o.bdCol = "vino";
      return o;
    });
    S.iconos = S.ind.map(o => o.ic);
    S.iconT = [0, 0, 0, 0];

    // texto de la carta (encima), carta con sombra y retrato, nombre debajo
    const TX = HL.texto;
    S.pTexto = U.pnl(hud, "guinda_osc", TX.x, TX.y, TX.w, TX.h, 8, 225);
    U.pnl(hud, "dorado", TX.x, TX.y, TX.w, 2, 9);
    S.o.texto = T(hud, "TxtTexto", TX.x + TX.pad, TX.y + TX.pad, 30, TX.w - 2 * TX.pad, "crema", "center", 20);
    S.sombra = runtimeScene.createObject("SombraCarta"); anim(S.sombra, "sombra"); S.sombra.setZOrder(4); hud.push(S.sombra);
    S.o.carta = runtimeScene.createObject("Carta"); S.o.carta.setZOrder(5); hud.push(S.o.carta);
    S.o.retrato = runtimeScene.createObject("Retrato"); S.o.retrato.setZOrder(6); hud.push(S.o.retrato);
    S.o.pj = T(hud, "TxtPersonaje", HL.nombre.x, HL.nombre.y, 34, HL.nombre.w, "dorado_claro", "center", 20);
    // etiqueta de la opcion (esquina de la carta al arrastrar)
    S.etBd = U.pnl(S.cond, "dorado", 0, 0, 10, 10, 60); S.etFill = U.pnl(S.cond, "guinda", 0, 0, 10, 10, 61);
    S.o.opcion = T(S.cond, "TxtOpcion", 0, 0, HL.etiqueta.size, HL.etiqueta.w, "crema", "center", 62);
    [S.etBd, S.etFill, S.o.opcion].forEach(o => { o.hide(true); o.__v = false; });
    // sugerencia de deslizar hacia arriba (solo con opcion "arriba")
    S.hintIco = U.ico(S.cond, "flecha_arriba", 0, HL.hint.y, 30, 20); S.hintTxt = T(S.cond, "TxtTexto", 0, HL.hint.y + 2, 22, 0, "dorado_claro", "left", 20);
    setTxt(S.hintTxt, "Desliza hacia arriba para usar un expediente");
    const hw = 30 + 8 + Math.ceil(S.hintTxt.__s.length * 22 * L.txt.cwLora), hx = (W - hw) / 2;
    S.hintIco.setPosition(hx, HL.hint.y); S.hintTxt.setPosition(hx + 38, HL.hint.y + 2);
    [S.hintIco, S.hintTxt].forEach(o => { o.hide(true); o.__v = false; });
    // aviso (logros, resultado de azar)
    S.avBd = U.pnl(S.cond, "dorado", HL.aviso.x, HL.aviso.y, HL.aviso.w, HL.aviso.h, 800);
    S.avFill = U.pnl(S.cond, "azul", HL.aviso.x + 3, HL.aviso.y + 3, HL.aviso.w - 6, HL.aviso.h - 6, 801);
    S.o.logro = T(S.cond, "TxtLogro", HL.aviso.x + 16, HL.aviso.y + 8, 24, HL.aviso.w - 32, "crema", "center", 802);
    [S.avBd, S.avFill, S.o.logro].forEach(o => { o.hide(true); o.__v = false; });
    // ranuras de texto sin mostrar (las usan los modulos 20/40 como "datos" de las pantallas)
    S.o.tiempo = U.txt("TxtTiempo", 0, 0, 22, 600); S.o.tiempo.hide(true);

    S.flash = 0; S.shake = 0; S.logroT = 0; S.cVista = null; S.flipT = 0; S.flipRetraso = 0;
    S.dx = 0; S.dy = 0; S.drag = false; S.teclaDir = 0;
    // Venimos del menu: "Modo" (variable GLOBAL del juego) dice si continuar o empezar.
    const modo = U.gget("Modo");
    const guardada = modo === "continuar" ? U.leerPartida() : null;
    if (!(guardada && S.cargarPartida(guardada))) S.nuevaPartida();
    U.gset("Modo", "nueva");
    S.setEstado(S.estado);
    S.esperaSoltar = true;
    S.listo = true;
  };

  S.mostrarHud = function (v) {
    if (S.hudVis === v) return;
    S.hudVis = v;
    S.hud.forEach(o => vis(o, v));
    [S.chipsL, S.invL, S.afL].forEach(l => l.forEach(o => vis(o, v)));
    if (!v) { S.cond.forEach(o => vis(o, false)); S.cVista = null; }
  };
  // Reconstruye una lista de objetos solo cuando su "clave" cambia.
  const pool = function (k, lista, clave, construir) {
    if (S.keys[k] === clave) return;
    S.keys[k] = clave; U.limpiar(lista); construir(lista);
  };

  const uanDelta = op => { const f = op.e || [0, 0, 0, 0]; return f; };
  const afecta = (op, i) => !!((op.e && op.e[i]) || (op.azar && ((op.azar.exito && (op.azar.exito.e || op.azar.exito)[i]) || (op.azar.fallo && (op.azar.fallo.e || op.azar.fallo)[i]))));

  S.renderCarta = function (dt) {
    const c = S.c; if (!c) return;
    const I = S.in;
    // --- volteo de la carta nueva ---
    if (S.cVista !== c) { S.cVista = c; S.flipT = -(S.flipRetraso || 0); S.flipRetraso = 0; }
    if (S.flipT < L.ease.voltear) S.flipT += dt;
    const fp = clamp(S.flipT / L.ease.voltear, 0, 1), sx = Math.max(0.02, E.back(fp));
    const dyv = S.arribaDisp() ? Math.min(0, S.dy || 0) * 0.4 : 0;
    const cx = CX + S.dx, cy = CD.y + Math.abs(S.dx) * 0.1 + dyv, cw = CD.w * sx, rw = CD.ret * sx;
    S.o.carta.setPosition(cx - cw / 2, cy); S.o.carta.setWidth(cw); S.o.carta.setHeight(CD.h); S.o.carta.setAngle(S.dx * 0.06);
    S.o.retrato.setPosition(cx - rw / 2, cy + CD.retDy); S.o.retrato.setWidth(rw); S.o.retrato.setHeight(CD.ret); S.o.retrato.setAngle(S.dx * 0.06);
    S.sombra.setPosition(cx - cw / 2 + CD.sombra * 0.8, cy + CD.sombra * 1.2); S.sombra.setWidth(cw); S.sombra.setHeight(CD.h); S.sombra.setAngle(S.dx * 0.06);
    [S.o.texto, S.o.pj].forEach(o => o.setOpacity(255 * fp)); S.sombra.setOpacity(255 * fp); S.o.carta.setOpacity(255 * fp); S.o.retrato.setOpacity(255 * fp);

    // --- texto de la carta y nombre ---
    const TX = HL.texto, tx = U.getTxt(S.o.texto);
    if (S.o.texto.__fit !== tx) {
      S.o.texto.__fit = tx;
      const f = U.ajustar(tx, TX.sizes, TX.w - 2 * TX.pad, TX.h - 2 * TX.pad, "cuerpo");
      U.tam(S.o.texto, f.size); S.o.texto.setPosition(TX.x + TX.pad, TX.y + Math.max(TX.pad / 2, (TX.h - f.alto) / 2));
    }
    const nm = U.getTxt(S.o.pj), N = HL.nombre;
    if (S.o.pj.__fit !== nm) {
      S.o.pj.__fit = nm;
      const f = U.ajustar(nm, N.sizes, N.w, N.h, "titulo");
      U.tam(S.o.pj, f.size); S.o.pj.setPosition(N.x, N.y + Math.max(0, (N.h - f.alto) / 2));
    }

    // --- opcion que se previsualiza ---
    const lado = S.dx < -30 ? c.izq : S.dx > 30 ? c.der : null;
    const arr = S.arribaDisp() ? c.arriba : null;
    let op = lado, tipo = lado ? (S.dx < 0 ? "izq" : "der") : "", a = 0;
    if (lado) a = clamp((Math.abs(S.dx) - 30) / (HL.umbral - 30), 0, 1);
    else if (arr && S.dy < -30) { op = arr; tipo = "arr"; a = clamp((-S.dy - 30) / (HL.umbral - 30), 0, 1); }
    if (!op || a <= 0.02) op = null;
    // etiqueta en la esquina superior de la carta, con fade segun el arrastre
    const et = HL.etiqueta;
    vis(S.etBd, !!op); vis(S.etFill, !!op); vis(S.o.opcion, !!op);
    if (op) {
      const s = op.t + (op.azar ? "  ¿?" : "");
      if (S.etKey !== s || U.getTxt(S.o.opcion) !== s) {
        S.etKey = s; setTxt(S.o.opcion, s);
        const ls = U.envolver(s, et.size, et.w, "cuerpo"), wmax = ls.reduce((m, x) => Math.max(m, x.length), 0);
        S.etW = Math.min(et.w + 28, Math.ceil(wmax * et.size * L.txt.cwLora) + 32); S.etH = ls.length * et.size * L.txt.lh + 20;
        S.o.opcion.setWrappingWidth(S.etW - 24);
      }
      const ex = clamp(tipo === "izq" ? cx - cw / 2 + et.margen : tipo === "der" ? cx + cw / 2 - et.margen - S.etW : cx - S.etW / 2, 10, W - 10 - S.etW), ey = cy + et.margen;
      U.pset(S.etBd, ex - 3, ey - 3, S.etW + 6, S.etH + 6); U.pset(S.etFill, ex, ey, S.etW, S.etH);
      S.o.opcion.setPosition(ex + 12, ey + 10);
      [S.etBd, S.etFill, S.o.opcion].forEach(o => o.setOpacity(255 * a));
    }
    // --- indicadores: relleno vertical suave, resaltado y puntos de vista previa ---
    S.ind.forEach((o, i) => {
      const IN = HL.ind, inner = IN.s - 2 * IN.borde;
      o.vis = U.suave(o.vis, S.v[i], dt);
      const fh = inner * clamp(o.vis / 100, 0, 1);
      U.pset(o.fill, o.cx - IN.s / 2 + IN.borde, IN.y + IN.s - IN.borde - fh, inner, fh);
      const peligro = S.v[i] <= 15 || S.v[i] >= 85, toca = !!(op && afecta(op, i));
      const fc = peligro ? "rojo" : "dorado", bc = toca ? "dorado_claro" : "vino";
      if (o.fillCol !== fc) { o.fillCol = fc; anim(o.fill, fc); }
      if (o.bdCol !== bc) { o.bdCol = bc; anim(o.bd, bc); }
      const azar = !!(op && op.azar && toca), grande = !!(op && op.e && Math.abs(op.e[i]) >= 15);
      vis(o.dot, toca && !azar); vis(o.q, azar);
      if (toca && !azar) {
        const s = grande ? HL.punto.grande : HL.punto.chico;
        o.dot.setPosition(o.cx - s / 2, HL.punto.cy - s / 2); o.dot.setWidth(s); o.dot.setHeight(s); o.dot.setOpacity(255 * Math.min(1, a * 2));
      }
      if (azar) o.q.setOpacity(255 * Math.min(1, a * 2));
      if (S.iconT[i] > 0) { S.iconT[i] -= dt; if (S.iconT[i] <= 0) anim(o.ic, S.STAT_ANIM[i]); }
    });

    // --- chips: fecha, eleccion, campana, director, reelecciones y estados activos ---
    const f = S.fecha(), rest = S.semanasParaEleccion();
    const chips = [[f.txt, "guinda", "crema"],
      ["Elección en " + rest + (rest === 1 ? " semana" : " semanas"), rest <= 4 ? "rojo" : "azul", "crema"]];
    if (S.enCampana()) chips.push(["CAMPAÑA · fuerza " + S.fe, "dorado", "tinta"]);
    chips.push(["Director #" + S.dyn.n + " · Reelecc. " + S.reel + "/" + S.MAX_REEL + (S.flags.reforma ? "+" : ""), "vino", "crema"]);
    S.estados.forEach(s => chips.push([s.nombre + " (" + s.rest + " sem)", (s.cada || []).reduce((x, y) => x + y, 0) < 0 || (s.int || 0) < 0 ? "rojo" : "verde", "crema"]));
    pool("chips", S.chipsL, chips.map(x => x[0]).join("|"), l => {
      const falta = U.chipsFlujo(l, chips, HL.chips, 12);
      if (falta > 0) { /* los que no caben se omiten */ }
    });
    // --- afinidad ---
    const af = S.af[c.pj] || 0;
    pool("afin", S.afL, c.pj + ":" + af, l => {
      const lab = af === 0 ? "Afinidad: neutral" : "Afinidad", lw = Math.ceil(lab.length * 22 * L.txt.cwLora), n = Math.abs(af), ic = HL.afin.icono;
      const tw = lw + (n ? 10 + n * (ic + 4) : 0); let x = (W - tw) / 2;
      const t = T(l, "TxtAfinidad", x, HL.afin.y + 2, 22, 0, "crema_osc", "left", 20); setTxt(t, lab);
      x += lw + 10;
      for (let k = 0; k < n; k++) { U.ico(l, af > 0 ? "corazon" : "cruz", x, HL.afin.y, ic, 20); x += ic + 4; }
    });
    // --- sugerencia de deslizar hacia arriba ---
    const hint = !!S.arribaDisp();
    vis(S.hintIco, hint); vis(S.hintTxt, hint);
    // --- inventario de expedientes ---
    const ks = Object.keys(S.items), IV = HL.inv;
    pool("inv", S.invL, ks.join("|"), l => {
      const items = ks.length ? [["Expedientes", "dorado", "tinta"]].concat(ks.map(k => [S.data.items[k] || k, "crema_osc", "tinta"])) : [["Sin expedientes", "guinda_osc", "crema_osc"]];
      U.chipsFlujo(l, items, { x: IV.x, y: IV.y, w: IV.w, filas: 2 }, 12);
    });
    // --- aviso (logros / azar) ---
    if (S.logroT > 0) {
      S.logroT -= dt;
      const a2 = clamp(Math.min(S.logroT, 3 - S.logroT) * 4, 0, 1);
      [S.avBd, S.avFill, S.o.logro].forEach(o => o.setOpacity(255 * a2));
      if (S.logroT <= 0) { vis(S.avBd, false); vis(S.avFill, false); vis(S.o.logro, false); }
    } else if (U.cola.length) {
      const msg = U.cola.shift(), AV = HL.aviso, ff = U.ajustar(msg, [24, 22], AV.w - 32, AV.h - 16, "cuerpo");
      setTxt(S.o.logro, msg); U.tam(S.o.logro, ff.size); S.o.logro.setPosition(AV.x + 16, AV.y + Math.max(6, (AV.h - ff.alto) / 2));
      S.logroT = 3; vis(S.avBd, true); vis(S.avFill, true); vis(S.o.logro, true);
    }
  };

  // ======================= PANTALLAS =======================
  const SCR = {};
  S.pagManejar = function (I) {
    const P = S.pag;
    if (!P || P.n <= 1) return false;
    if (I.click && P.nav.prev && !P.nav.prev.off && U.hit(P.nav.prev, I.mx, I.my)) { P.i = Math.max(0, P.i - 1); return true; }
    if (P.i < P.n - 1) { P.i++; return true; }
    return false;
  };
  // titulo (Bebas) + subtitulo a partir de la ranura S.o.pj ("TITULO\nsubtitulo")
  const cabecera = function (A, holder, banner) {
    const P = L.pant, tt = T(A, "TxtTitulo", P.titulo.x, P.titulo.y, P.titulo.size, P.titulo.w, banner ? "crema" : "dorado_claro", "center", 20);
    const sb = T(A, "TxtTexto", P.sub.x, P.sub.y, P.sub.size, P.sub.w, "crema_osc", "center", 20);
    if (banner) U.pnl(A, banner, 24, P.titulo.y - 12, 672, 84, 8);
    let key = null;
    return function () {
      const raw = U.getTxt(holder);
      if (raw === key) return; key = raw;
      const nl = raw.indexOf("\n"), t1 = nl < 0 ? raw : raw.slice(0, nl), s1 = nl < 0 ? "" : raw.slice(nl + 1);
      const f = U.ajustar(t1, [56, 52, 48, 44, 40], P.titulo.w, P.titulo.lines * 56 * L.txt.lhB, "titulo");
      setTxt(tt, t1); U.tam(tt, f.size); tt.setPosition(P.titulo.x, P.titulo.y + (banner ? Math.max(0, (60 - f.alto) / 2 + 2) : 0));
      const sy = P.titulo.y + (banner ? 72 : f.alto) + 8, maxL = f.n <= 1 ? 3 : 2;
      let g = U.ajustar(s1, [26, 24, 22], P.sub.w, maxL * 24 * L.txt.lh, "cuerpo");
      setTxt(sb, s1); U.tam(sb, g.size); sb.setPosition(P.sub.x, sy);
    };
  };
  // cuerpo con paginas: texto de la ranura 'holder' repartido en paginas
  const cuerpo = function (A, R, holder) {
    U.pnl(A, "guinda_osc", R.x, R.y, R.w, R.h, 8, 225); U.pnl(A, "dorado", R.x, R.y, R.w, 2, 9);
    const wT = R.w - 2 * R.pad, hT = R.h - 2 * R.pad, t = T(A, "TxtTexto", R.x + R.pad, R.y + R.pad, R.size, wT, "crema", "left", 20);
    const nav = U.pager(A, L.pant.pag.y, 30);
    const P = S.pag = { i: 0, n: 1, nav, key: null, pages: [""] };
    P.upd = function () {
      const s = U.getTxt(holder);
      if (s !== P.key) { P.key = s; P.pages = U.paginar(s, R.size, wT, hT, "cuerpo"); P.n = P.pages.length; P.i = Math.min(P.i, P.n - 1); P.shown = -1; }
      if (P.shown !== P.i) { P.shown = P.i; setTxt(t, P.pages[P.i]); nav.set(P.i, P.n); }
    };
    return P;
  };
  const pie = (A, etiqueta) => { const B = L.pant.btn; return U.mkBtn(A, B.x, B.y, B.w, B.h, etiqueta, 50); };
  const tickPagina = function (P, bt, I, ultima) {
    if (I.kp[37] && P.i > 0) P.i--;
    U.btnTick(bt, I);
    if (P.n > 1) { U.btnTick(P.nav.prev, I); U.btnTick(P.nav.next, I); }
    U.btnTxt(bt, P.i < P.n - 1 ? "Siguiente" : ultima);
  };
  const ETQ = { informe: "Continuar", fin: "Ver sucesión", sucesion: "Ver epílogo", destino: "Cerrar esta historia" };
  const etiqueta = e => (e === "epilogo" ? (S.destinoPend ? "Ver el destino" : "Siguiente director") : ETQ[e] || "Continuar");

  // pantallas de texto: fin de gestion, epilogo, destino y resultado de minijuego
  const pantallaTexto = function (estado, conMetros, banner) {
    return function (A) {
      const hd = cabecera(A, S.o.pj, banner && banner());
      const R = Object.assign({}, L.pant.cuerpo); if (!conMetros) R.h += L.pant.metros.h + 8;
      const P = cuerpo(A, R, S.o.texto), mp = conMetros ? U.metrosPanel(A, L.pant.metros, 10) : null, bt = pie(A, etiqueta(estado));
      return function (dt, I) {
        hd(); P.upd(); if (mp) mp.set(S.dyn, dt);
        tickPagina(P, bt, I, etiqueta(estado));
      };
    };
  };
  SCR.fin = pantallaTexto("fin", true);
  SCR.epilogo = pantallaTexto("epilogo", true);
  SCR.destino = pantallaTexto("destino", true);

  SCR.informe = function (A) {
    const hd = cabecera(A, S.o.pj), B = L.informe.barras;
    U.pnl(A, "guinda_osc", B.x, B.y, B.w, B.h, 8, 225); U.pnl(A, "dorado", B.x, B.y, B.w, 2, 9);
    const filas = S.STATS.map((n, i) => {
      const y = B.y + 12 + i * B.row;
      const lb = T(A, "TxtTexto", B.x + 20, y + 6, 26, 200, "crema", "left", 20); setTxt(lb, n);
      const br = U.barra(A, B.x + 230, y + 8, 330, 28, "dorado", 10), v = T(A, "TxtTexto", B.x + 580, y + 6, 26, 80, "crema_osc", "left", 20);
      return { br, v, cur: 0, i };
    });
    const R = { x: 24, y: L.informe.cuerpo.y, w: 672, h: L.informe.cuerpo.h, pad: 20, size: 26 };
    const P = cuerpo(A, R, S.o.texto), mp = U.metrosPanel(A, L.pant.metros, 10), bt = pie(A, ETQ.informe);
    return function (dt, I) {
      hd(); P.upd(); mp.set(S.dyn, dt);
      filas.forEach(f => {
        f.cur = U.suave(f.cur, S.v[f.i], dt);
        f.br.set(f.cur / 100); f.br.col(S.v[f.i] <= 15 || S.v[f.i] >= 85 ? "rojo" : "dorado");
        const r = String(Math.round(f.cur)); if (f.v.__s !== r) setTxt(f.v, r);
      });
      tickPagina(P, bt, I, ETQ.informe);
    };
  };

  SCR.sucesion = function (A) {
    const s = S.suc;
    if (!s) return pantallaTexto("sucesion", true)(A);
    const SG = L.suc, R = SG.retrato, hd = cabecera(A, S.o.pj);
    const retr = (x, pj) => {
      U.pnl(A, "dorado", x, SG.y, R + 16, R + 16, 10); U.pnl(A, "crema", x + 4, SG.y + 4, R + 8, R + 8, 11);
      const r = runtimeScene.createObject("Retrato"); anim(r, pj); r.setPosition(x + 8, SG.y + 8); r.setWidth(R); r.setHeight(R); r.setZOrder(12); A.push(r);
    };
    const xl = 60, xr = W - 60 - (R + 16);
    retr(xl, S.cd && S.cd.pj ? S.cd.pj : "default"); retr(xr, s.ganador.pj || "default");
    U.ico(A, "flecha_der", W / 2 - 32, SG.y + (R + 16) / 2 - 32, 64, 12);
    const cap = (x, rol, nombre) => {
      const c0 = x + (R + 16) / 2 - 150;
      const a = T(A, "TxtTexto", c0, SG.y + R + 22, 22, 300, "dorado_claro", "center", 20); setTxt(a, rol);
      const b = T(A, "TxtTexto", c0, SG.y + R + 22 + 30, 24, 300, "crema", "center", 20); setTxt(b, nombre);
    };
    cap(xl, "TU GESTIÓN TERMINA", S.dirNombre); cap(xr, s.forzado ? "GANÓ LA ELECCIÓN" : "SUCEDE", s.ganador.nombre);
    // ranking de candidatos con barras y motivos
    const sg = n => (n > 0 ? "+" : "") + n;
    const motivo = x => [x.dec ? "tu gestión " + sg(x.dec) : "", x.af ? "afinidad " + sg(x.af) : "", x.fav ? "tu caída +" + x.fav : "", x.cons ? "conspiró +3" : ""].filter(Boolean).join(", ") || "sin factores";
    const lista = s.lista.slice(0, SG.filas.n), mx = Math.max(1, lista.reduce((m, x) => Math.max(m, x.total), 1));
    lista.forEach((x, i) => {
      const y = SG.filas.y + i * SG.filas.h, ganador = i === 0;
      if (ganador) U.pnl(A, "dorado", 24, y - 3, 672, SG.filas.h - 6, 8);
      U.pnl(A, "guinda_osc", ganador ? 27 : 24, ganador ? y : y, ganador ? 666 : 672, ganador ? SG.filas.h - 12 : SG.filas.h - 6, 9, 235);
      const n = T(A, "TxtTexto", 40, y + 4, 24, 460, ganador ? "dorado_claro" : "crema", "left", 20); setTxt(n, x.c.nombre + " (" + x.c.rasgo + ")");
      const v = T(A, "TxtTexto", 510, y + 4, 24, 170, "crema", "right", 20); setTxt(v, "Fuerza " + x.total);
      const b = U.barra(A, 40, y + 38, 640, 14, ganador ? "dorado" : "gris", 10); b.set(Math.max(0.04, x.total / mx));
      const m = T(A, "TxtTexto", 40, y + 56, 22, 640, "crema_osc", "left", 20); setTxt(m, motivo(x));
    });
    if (s.brutus) U.chip(A, W / 2 - 150, SG.y + R + 16 - 6, "¡Conspiró contra ti!", "rojo", "crema", 14);
    const mp = U.metrosPanel(A, { x: 24, y: SG.metros.y, w: 672, h: SG.metros.h }, 10), bt = pie(A, ETQ.sucesion);
    S.pag = null;
    return function (dt, I) { hd(); mp.set(S.dyn, dt); U.btnTick(bt, I); };
  };

  SCR.eleccion = function (A) {
    const Ev = S.elec;
    if (!Ev || Ev.tipo !== "voto") return null;
    const EL = L.elec, r = Ev.res, hd = cabecera(A, S.o.pj), bloques = [];
    const bloque = (y, titulo, n) => {
      U.pnl(A, "guinda_osc", 24, y, 672, 30 + n * EL.fila + 6, 8, 225);
      const h = T(A, "TxtTexto", 40, y + 2, 24, 640, "dorado_claro", "left", 20); setTxt(h, titulo);
      return r.part.map((p, k) => {
        const yy = y + 34 + k * EL.fila;
        const lb = T(A, "TxtTexto", 40, yy + 2, 22, 250, k === 0 ? "dorado_claro" : "crema", "left", 20); setTxt(lb, p.nombre);
        const br = U.barra(A, 300, yy + 6, 300, 20, k === 0 ? "dorado" : "azul_cl", 10);
        const v = T(A, "TxtTexto", 612, yy + 2, 22, 84, "crema_osc", "right", 20);
        return { br, v };
      });
    };
    r.sectores.forEach((sc, i) => { bloques.push(bloque(EL.y + i * EL.bloque, sc.nom + " · " + sc.peso + " % del voto", r.part.length)); });
    const tot = bloque(EL.total.y, "TOTAL", r.part.length);
    const bn = U.pnl(A, "verde", 24, EL.banner.y, 672, EL.banner.h, 8); bn.hide(true); bn.__v = false;
    const bt0 = T(A, "TxtTitulo", 40, EL.banner.y + 12, 52, 640, "crema", "center", 20); bt0.hide(true); bt0.__v = false;
    const bt = pie(A, "Saltar conteo");
    S.pag = null;
    return function (dt, I) {
      const Q = S.elec; if (!Q || Q.tipo !== "voto") return;
      hd();
      const pp = Q.pp || [], acum = r.part.map(() => 0);
      r.sectores.forEach((sc, i) => {
        const p = pp[i] || 0;
        sc.pct.forEach((x, k) => {
          const b = bloques[i][k];
          b.br.set((x / Math.max.apply(null, sc.pct)) * p);
          const val = (x * p).toFixed(1) + " %"; if (b.v.__s !== val) setTxt(b.v, val);
          acum[k] += x * p;
        });
      });
      tot.forEach((b, k) => { b.br.set(acum[k] / 60); const val = acum[k].toFixed(1) + " %"; if (b.v.__s !== val) setTxt(b.v, val); });
      const fin = !!Q.listo;
      vis(bn, fin); vis(bt0, fin);
      if (fin) {
        const s = Q.ok ? "¡REELECTO!" : "Gana " + r.ganador.nombre;
        if (bt0.__s !== s) { setTxt(bt0, s); U.tam(bt0, U.ajustar(s, [52, 44, 40], 640, 60, "titulo").size); }
        anim(bn, Q.ok ? "verde" : "rojo");
      }
      U.btnTxt(bt, fin ? "Continuar" : "Saltar conteo");
      U.btnTick(bt, I);
    };
  };

  // ---- minijuegos ----
  const MINI_TMAX = { prensa: 6, plagio: 20 };
  const MC = { ok: "verde", med: "ambar", mal: "rojo" };
  SCR.mini = function (A) {
    const m = S.m, M = L.mini, hdT = T(A, "TxtTitulo", M.titulo.x, M.titulo.y, M.titulo.size, M.titulo.w, "dorado_claro", "center", 20);
    U.pnl(A, "guinda_osc", M.instr.x, M.instr.y, M.instr.w, M.instr.h, 8, 225); U.pnl(A, "dorado", M.instr.x, M.instr.y, M.instr.w, 2, 9);
    const ins = T(A, "TxtTexto", M.instr.x + M.instr.pad, M.instr.y + M.instr.pad, 24, M.instr.w - 2 * M.instr.pad, "crema", "center", 20);
    const br = U.barra(A, M.barra.x, M.barra.y, M.barra.w, M.barra.h, "dorado", 10);
    const cap = T(A, "TxtTexto", M.cap.x, M.cap.y, M.cap.size, M.cap.w, "crema_osc", "center", 20);
    const fbBd = U.pnl(A, "dorado", M.fb.x, M.fb.y, M.fb.w, M.fb.h, 8), fbF = U.pnl(A, "azul", M.fb.x + 3, M.fb.y + 3, M.fb.w - 6, M.fb.h - 6, 9);
    const fbT = T(A, "TxtTexto", M.fb.x + 16, M.fb.y + 10, M.fb.size, M.fb.w - 32, "crema", "center", 20);
    let kT = null, kI = null, kF = null, fbCol = "";
    S.pag = null;
    return function (dt, I) {
      const mm = S.m; if (!mm || mm.fase !== "juego") return;
      const t = U.getTxt(S.o.pj);
      if (t !== kT) { kT = t; const f = U.ajustar(t, [52, 46, 40], M.titulo.w, 2 * 52 * L.txt.lhB, "titulo"); setTxt(hdT, t); U.tam(hdT, f.size); hdT.setPosition(M.titulo.x, M.titulo.y + Math.max(0, (66 - f.alto) / 2)); }
      const s = U.getTxt(S.o.texto);
      if (s !== kI) {
        kI = s; const f = U.ajustar(s, [26, 24, 22], M.instr.w - 2 * M.instr.pad, M.instr.h - 2 * M.instr.pad, "cuerpo");
        setTxt(ins, s); U.tam(ins, f.size); ins.setPosition(M.instr.x + M.instr.pad, M.instr.y + Math.max(6, (M.instr.h - f.alto) / 2));
      }
      const c2 = U.getTxt(S.o.tiempo); if (c2 !== cap.__s) setTxt(cap, c2);
      // barra: tiempo restante (prensa/plagio), asignado (presupuesto) o votos (consejo)
      let fr = 0, cl = "dorado";
      if (mm.tipo === "presupuesto") { fr = mm.asig.reduce((a, b) => a + b, 0) / 100; cl = fr >= 1 ? "verde" : "dorado"; }
      else if (mm.tipo === "consejo") { fr = Math.min(1, mm.favor / 3); cl = fr >= 1 ? "verde" : "azul_cl"; }
      else { fr = clamp(mm.t / MINI_TMAX[mm.tipo], 0, 1); cl = fr < 0.25 ? "rojo" : "dorado"; }
      br.set(fr); br.col(cl);
      // retroalimentacion de acierto / error
      const fb = U.getTxt(S.o.opcion), col = fb ? (MC[mm.res] || "azul") : "";
      vis(fbBd, !!fb); vis(fbF, !!fb); vis(fbT, !!fb);
      if (fb) {
        if (col !== fbCol) { fbCol = col; anim(fbF, col); }
        if (fb !== kF) { kF = fb; const f = U.ajustar(fb, [26, 24, 22], M.fb.w - 32, M.fb.h - 20, "cuerpo"); setTxt(fbT, fb); U.tam(fbT, f.size); fbT.setPosition(M.fb.x + 16, M.fb.y + Math.max(6, (M.fb.h - f.alto) / 2)); }
      }
      // estados visuales de los botones (la accion la resuelve 40_minijuegos)
      const bs = (mm.btn || []).slice();
      (mm.filas || []).forEach(f => { bs.push(f.menos, f.mas); });
      if (mm.ok && typeof mm.ok === "object") bs.push(mm.ok);
      bs.forEach(b => { if (b && !b.t.__borrado) U.btnTick(b, I); });
    };
  };
  SCR.mini_res = function (A) {
    const ok = !!(S.m && S.m.ok);
    return pantallaTexto("mini_res", false, () => (ok ? "verde" : "rojo"))(A);
  };

  const claveVista = function () {
    const e = S.estado === "pausa" ? (S.estadoPrev || "carta") : S.estado;
    return e === "mini" ? "mini:" + (S.m ? S.m.tipo + ":" + S.m.fase : "?") + ":" + S.vistaId : e + ":" + S.vistaId;
  };
  S.renderPantalla = function (dt) {
    const clave = claveVista();
    if (!S.pantalla || S.pantalla.clave !== clave) {
      U.limpiar(S.scr); S.pag = null; S.pantalla = null;
      const e = S.estado === "pausa" ? (S.estadoPrev || "carta") : S.estado;
      const b = e === "mini" ? (S.m && S.m.fase === "res" ? SCR.mini_res : SCR.mini) : SCR[e];
      if (b) { const upd = b(S.scr); if (upd) S.pantalla = { clave, upd }; else { U.limpiar(S.scr); } }
    }
    const I = S.in;
    if (S.pantalla && S.estado !== "pausa") { if (S.pag) S.pag.upd(); S.pantalla.upd(dt, I); }
    else if (S.pantalla && S.pag) S.pag.upd();
    S.o.tiempo.hide(true);
  };

  // ---- variables de escena ----
  S.publicar = function () {
    const P = U.pub, f = S.fecha(), c = S.c;
    P("Academico", S.v[0]); P("Estudiantes", S.v[1]); P("Finanzas", S.v[2]); P("Politica", S.v[3]);
    P("Integridad", S.int); P("Semana", S.semana); P("Estado", S.estado);
    P("Personaje", c ? c.pj : ""); P("Director", S.dyn.n); P("DirectorNombre", S.dirNombre);
    P("Rasgo", S.rasgo || ""); P("Fecha", f.txt); P("Mes", f.m); P("Anio", f.y);
    P("Afinidad", c ? (S.af[c.pj] || 0) : 0);
    P("Estados", S.estadosTxt()); P("FinTipo", S.finTipo || "");
    P("Reelecciones", S.reel); P("SemanasEleccion", S.semanasParaEleccion());
    P("Campana", S.enCampana() ? 1 : 0); P("FuerzaElectoral", S.fe);
    P("Sucesor", S.suc ? S.suc.ganador.nombre : "");
    P("SenalCarta", S.senal.carta); P("SenalEleccion", S.senal.eleccion); P("SenalFin", S.senal.fin);
    P("UAN_Solvencia", S.dyn.uan.solv); P("UAN_Paz", S.dyn.uan.paz); P("UAN_Autonomia", S.dyn.uan.aut); P("UAN_Prestigio", S.dyn.uan.pre);
    P("Nay_Desarrollo", S.dyn.nay.des); P("Nay_Seguridad", S.dyn.nay.seg); P("Historia", U.cronica().length + 1); P("Destino", S.destinoPend ? S.destinoPend.titulo : "");
    P("SenalAzar", S.senal.azar); P("SenalVoto", S.senal.voto); P("Record", S.record);
  };
}
if (!S.listo && !S.saliendo) S.arrancar();

if (S.listo && !S.saliendo) {
  const U = S.u, dt = S.in.dt, L = U.L;
  const enCarta = S.estado === "carta" || (S.estado === "pausa" && (S.estadoPrev || "carta") === "carta");
  S.mostrarHud(enCarta);
  if (enCarta) { if (S.pantalla) { U.limpiar(S.scr); S.pantalla = null; S.pag = null; } S.renderCarta(dt); }
  else S.renderPantalla(dt);
  S.tickFant(dt);

  // ---- Efectos: flash y sacudida ----
  if (S.flash > 0) { S.flash = Math.max(0, S.flash - dt * 2.5); S.o.flash.setOpacity(S.flash * 150); }
  if (S.shake > 0) {
    S.shake = Math.max(0, S.shake - dt);
    const a = S.shake > 0 ? 14 * (S.shake / 0.4) : 0;
    try {
      const ly = runtimeScene.getLayer("");
      ly.setCameraX(U.W / 2 + (Math.random() * 2 - 1) * a, 0); ly.setCameraY(U.H / 2 + (Math.random() * 2 - 1) * a, 0);
    } catch (e) { }
  }
  S.publicar();
}
