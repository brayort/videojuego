// ============================================================================
// 07 CINE — cinematicas estilo novela visual (misma resolucion 720x1280, paleta
// y fuentes del juego). Se incluye en TODAS las escenas. Guiones en
// src/cinematicas.json (formato en src/ESQUEMA.md, seccion Cinematicas).
//
// API (S.u.cine):
//   reproducir(id, ctx, alTerminar)  -> reproduce un guion (se encola si ya hay uno)
//   disparar(clave1, clave2, ..)     -> reproduce el guion asociado a la PRIMERA clave
//                                       que exista en "disparos" (de especifica a generica)
//   activo                           -> true mientras hay una cinematica en pantalla
// Mientras esta activa consume toda la entrada del frame (los modulos siguientes
// ven I.click/teclas en falso). Publica CineActivo / CineId / SenalCine.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.u.cine) {
  const U = S.u, L = U.L, W = U.W, H = U.H, C = L.cine, setTxt = U.setTxt, anim = U.anim, clamp = U.clamp;
  const DATOS = __CINE__;
  const GUIONES = DATOS.cinematicas || {}, DISPAROS = DATOS.disparos || {};
  const cine = U.cine = { activo: false, id: "", musica: "", cola: [], senal: 0 };
  let A = null;            // objetos de la cinematica en curso
  let R = null;            // estado de reproduccion

  const vistas = () => U.lsGet("cine_vistas", {}) || {};
  const marcarVista = id => { const v = vistas(); v[id] = true; U.lsSet("cine_vistas", v); };
  // Sustituye {claves}: primero las del contexto, despues las del juego (S.fmt en la escena Juego).
  const fmt = (s, ctx) => {
    s = String(s || "").replace(/\{(\w+)\}/g, (m, k) => (ctx && ctx[k] !== undefined ? ctx[k] : k === "jugador" ? ((U.aj && U.aj.nombre) || "Director") : m));
    try { if (typeof S.fmt === "function") s = S.fmt(s); } catch (e) { }
    return s;
  };

  cine.existe = id => !!GUIONES[id];
  cine.reproducir = function (id, ctx, alTerminar) {
    const g = GUIONES[id];
    if (!g || !Array.isArray(g.lineas) || !g.lineas.length) { if (alTerminar) alTerminar(); return false; }
    if (g.una_vez && vistas()[id]) { if (alTerminar) alTerminar(); return false; }
    if (cine.activo) { cine.cola.push([id, ctx, alTerminar]); return true; }
    abrir(id, g, ctx || {}, alTerminar);
    return true;
  };
  cine.disparar = function () {
    for (let i = 0; i < arguments.length; i++) {
      const k = arguments[i], id = k && DISPAROS[k];
      if (id && GUIONES[id]) return cine.reproducir(id, { evento: k });
    }
    return false;
  };

  // ---------------- construccion de la escena ----------------
  function abrir(id, g, ctx, alTerminar) {
    A = []; cine.activo = true; cine.id = id; cine.musica = g.musica || ""; cine.senal++;
    const z = C.z, K = C.caja, N = C.nombre;
    const fondo = runtimeScene.createObject("Fondo"); A.push(fondo);
    fondo.setPosition(0, 0); fondo.setWidth(W); fondo.setHeight(H); fondo.setZOrder(z);
    const tinte = U.pnl(A, "negro", 0, 0, W, H, z + 1, 0);
    const ret = {}; ["izq", "der", "centro"].forEach((lado, k) => {
      const o = runtimeScene.createObject("Retrato"); A.push(o);
      o.setWidth(C.retrato.s); o.setHeight(C.retrato.s); o.setZOrder(z + 10 + k); o.hide(true);
      ret[lado] = { o, pj: "", a: 0, obj: 0, activo: false };
    });
    const cajaBd = U.pnl(A, "dorado", K.x - K.borde, K.y - K.borde, K.w + 2 * K.borde, K.h + 2 * K.borde, z + 20);
    const caja = U.pnl(A, "guinda_osc", K.x, K.y, K.w, K.h, z + 21, K.op);
    const nomBd = U.pnl(A, "dorado", N.x - K.borde, N.y - K.borde, 10, N.h + 2 * K.borde, z + 22);
    const nomF = U.pnl(A, "guinda", N.x, N.y, 10, N.h, z + 23);
    const nom = U.mkTxt(A, "TxtPersonaje", N.x + N.pad, N.y + 6, N.size, 0, { al: "left", col: "dorado_claro", z: z + 24 });
    const txt = U.mkTxt(A, "TxtTexto", K.x + K.pad, K.y + K.pad, K.sizes[0], K.w - 2 * K.pad, { al: "left", col: "crema", z: z + 24 });
    const sigue = U.ico(A, "flecha_der", C.sigue.x, C.sigue.y, C.sigue.s, z + 25);
    const tit = U.mkTxt(A, "TxtTitulo", 40, C.titulo.y, C.titulo.size, W - 80, { al: "center", col: "dorado_claro", z: z + 24 });
    const sub = U.mkTxt(A, "TxtTexto", 60, C.titulo.y + C.titulo.size + 16, C.titulo.sub, W - 120, { al: "center", col: "crema_osc", z: z + 24 });
    const flash = U.pnl(A, "blanco", 0, 0, W, H, z + 60, 0);
    const velo = U.pnl(A, "negro", 0, 0, W, H, z + 70, 255);
    const SB = C.saltar, saltar = U.mkBtn(A, SB.x, SB.y, SB.w, SB.h, "Saltar »", z + 50, { size: 28 });
    anim(fondo, g.fondo || "carta");
    R = { id, g, ctx, alTerminar, i: -1, t: 0, n: 0, total: 0, full: "", espera: 0, velo: 1, veloObj: 0, cerrando: false, flash: 0, shake: 0, tinte: g.tinte || 0,
      o: { fondo, tinte, ret, cajaBd, caja, nomBd, nomF, nom, txt, sigue, tit, sub, flash, velo, saltar } };
    tinte.setOpacity(R.tinte);
    linea(0);
  }

  function cerrar() {
    const r = R;
    if (A) U.limpiar(A);
    A = null; R = null; cine.activo = false; cine.id = ""; cine.musica = "";
    if (r && r.g.una_vez) marcarVista(r.id);
    S.espera = Math.max(S.espera || 0, 0.3); S.esperaSoltar = true;   // que el ultimo toque no actue sobre el juego
    try { const ly = runtimeScene.getLayer(""); ly.setCameraX(W / 2, 0); ly.setCameraY(H / 2, 0); } catch (e) { }
    if (r && r.alTerminar) { try { r.alTerminar(); } catch (e) { } }
    if (!cine.activo && cine.cola.length) { const q = cine.cola.shift(); cine.reproducir(q[0], q[1], q[2]); }
  }

  // Aplica la linea i del guion (dialogo, narracion o titulo + comandos).
  function linea(i) {
    const g = R.g, ln = g.lineas[i];
    if (!ln) { R.cerrando = true; R.veloObj = 1; return; }
    R.i = i; R.t = 0; R.n = 0;
    const o = R.o, K = C.caja, N = C.nombre;
    // comandos
    if (ln.fondo) anim(o.fondo, ln.fondo);
    if (typeof ln.tinte === "number") { R.tinte = clamp(ln.tinte, 0, 255); o.tinte.setOpacity(R.tinte); }
    if (ln.musica !== undefined) cine.musica = ln.musica;
    if (ln.sfx) { try { U.sonido(ln.sfx); } catch (e) { } }
    if (ln.flash) { anim(o.flash, ln.flash === true ? "blanco" : ln.flash); R.flash = 1; }
    if (ln.sacudir) R.shake = +ln.sacudir || 0.4;
    if (ln.vibrar) U.vibrar(ln.vibrar);
    if (ln.fundido) { R.velo = 1; R.veloObj = 0; }
    if (ln.salir) [].concat(ln.salir === "todos" ? ["izq", "der", "centro"] : ln.salir).forEach(l => { const p = o.ret[l]; if (p) { p.obj = 0; p.sale = true; } });
    // retratos: el que habla entra / se ilumina; los demas quedan atenuados
    const lado = ln.lado || (ln.pj ? "izq" : "");
    if (ln.pj) {
      const p = o.ret[lado] || o.ret.izq;
      if (p.pj !== ln.pj || p.sale) { p.pj = ln.pj; p.a = 0; p.sale = false; anim(p.o, ln.expr || ln.pj); p.o.hide(false); }
      else if (ln.expr) anim(p.o, ln.expr);
      p.obj = 1;
    }
    Object.keys(o.ret).forEach(k => { o.ret[k].activo = !!ln.pj && (o.ret[k] === (o.ret[lado] || o.ret.izq)); });
    // tipo de linea
    const esTit = ln.titulo !== undefined, esNarra = ln.narra !== undefined;
    const caja = !esTit;
    [o.cajaBd, o.caja].forEach(x => x.hide(!caja)); R.conCaja = caja;
    [o.tit, o.sub].forEach(x => x.hide(!esTit));
    const conNom = !!ln.pj && !esNarra;
    [o.nomBd, o.nomF, o.nom].forEach(x => x.hide(!conNom));
    if (esTit) {
      const t = fmt(ln.titulo, R.ctx), f = U.ajustar(t, [C.titulo.size, 72, 60, 52, 44], W - 80, 3 * C.titulo.size * L.txt.lhB, "titulo");
      setTxt(o.tit, t); U.tam(o.tit, f.size); U.c(o.tit, "setColor", U.CC[ln.col || "dorado_claro"]);
      o.sub.setPosition(60, C.titulo.y + f.alto + 18); setTxt(o.sub, fmt(ln.sub || "", R.ctx));
      R.full = ""; R.total = 0; o.txt.hide(true);
    } else {
      const t = fmt(esNarra ? ln.narra : ln.texto, R.ctx), wT = K.w - 2 * K.pad, hT = K.h - 2 * K.pad - 24;
      const f = U.ajustar(t, K.sizes, wT, hT, "cuerpo");
      U.tam(o.txt, f.size); o.txt.hide(false);
      U.c(o.txt, "setTextAlignment", esNarra ? "center" : "left");
      U.c(o.txt, "setColor", U.CC[ln.col || (esNarra ? "crema_osc" : "crema")]);
      o.txt.setPosition(K.x + K.pad, K.y + (esNarra ? Math.max(K.pad, (K.h - f.alto) / 2) : K.pad));
      R.full = t; R.total = t.length; setTxt(o.txt, "");
      if (conNom) {
        const nm = fmt(ln.nombre || nombrePj(ln.pj), R.ctx), w = U.ancho(nm, N.size, "titulo") + 2 * N.pad;
        setTxt(o.nom, nm); U.c(o.nom, "setColor", U.CC[ln.colNombre || "dorado_claro"]);
        U.pset(o.nomBd, N.x - K.borde, N.y - K.borde, w + 2 * K.borde, N.h + 2 * K.borde); U.pset(o.nomF, N.x, N.y, w, N.h);
      }
    }
    R.espera = typeof ln.espera === "number" ? ln.espera : 0;
    if (U.ev && !esTit) U.ev("pagina");
  }
  const nombrePj = pj => { try { return (S.data && S.data.personajes && S.data.personajes[pj]) || (DATOS.nombres || {})[pj] || pj; } catch (e) { return pj; } };

  function avanzar() {
    if (R.n < R.total) { R.n = R.total; setTxt(R.o.txt, R.full); return; }   // completa el texto
    linea(R.i + 1);
  }

  cine.tick = function (I) {
    if (!R) return;
    const dt = I.dt, o = R.o, ln = R.g.lineas[R.i] || {};
    // velo de fundido (entrada, salida y "fundido": true)
    R.velo += clamp(R.veloObj - R.velo, -dt / C.fundido, dt / C.fundido);
    o.velo.setOpacity(255 * R.velo);
    if (R.cerrando) { if (R.velo >= 0.999) cerrar(); I.click = false; I.kp = {}; I.kd = {}; I.soltar = false; I.pulsado = false; return; }
    // maquina de escribir
    if (R.n < R.total) {
      R.t += dt; const n = Math.min(R.total, Math.floor(R.t * (ln.cps || R.g.cps || C.cps)));
      if (n !== R.n) { R.n = n; setTxt(o.txt, R.full.slice(0, n)); }
    }
    const listo = R.n >= R.total;
    o.sigue.hide(!(listo && R.conCaja) || Math.floor(R.t * 2.5) % 2 === 1);
    // retratos: fundido de entrada, desplazamiento y atenuado del que no habla
    Object.keys(o.ret).forEach(k => {
      const p = o.ret[k]; if (!p.pj) return;
      p.a = clamp(p.a + (p.obj > p.a ? dt / C.fundido : -dt / C.fundido), 0, 1);
      if (p.a <= 0 && p.sale) { p.o.hide(true); p.pj = ""; p.sale = false; return; }
      const dy = (1 - U.ease.out(p.a)) * C.retrato.entrada;   // entra subiendo: nunca se sale de la pantalla
      p.o.setPosition(C.retrato[k], C.retrato.y + dy); p.o.setOpacity(p.a * (p.activo ? 255 : C.retrato.inactivo));
    });
    // flash y sacudida
    if (R.flash > 0) { R.flash = Math.max(0, R.flash - dt * 2.5); o.flash.setOpacity(R.flash * 200); }
    if (R.shake > 0) {
      R.shake = Math.max(0, R.shake - dt); const a = 14 * Math.min(1, R.shake / 0.4);
      try { const ly = runtimeScene.getLayer(""); ly.setCameraX(W / 2 + (Math.random() * 2 - 1) * a, 0); ly.setCameraY(H / 2 + (Math.random() * 2 - 1) * a, 0); } catch (e) { }
    }
    // entrada: Saltar (boton o Escape), avance con toque / Espacio / Enter, o espera automatica
    if (U.btnTick(o.saltar, I) || I.kp[27]) { R.cerrando = true; R.veloObj = 1; }
    else if (R.velo < 0.5) {
      const enBoton = U.hit(o.saltar, I.mx, I.my);
      if ((I.click && !enBoton) || I.kp[32] || I.kp[13] || I.kp[39]) avanzar();
      else if (listo && R.espera > 0) { R.espera -= dt; if (R.espera <= 0) linea(R.i + 1); }
    }
    // la cinematica se queda con la entrada de este frame
    I.click = false; I.kp = {}; I.kd = {}; I.soltar = false; I.pulsado = false;
  };
}
// ---- cada frame ----
{
  const U = S.u, c = U.cine;
  if (c.activo && S.in) c.tick(S.in);
  U.pub("CineActivo", c.activo ? 1 : 0); U.pub("CineId", c.id); U.pub("SenalCine", c.senal);
}
