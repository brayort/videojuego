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

  // ---------------- animaciones de sprites ("anima", "entra") ----------------
  // Duracion (s) de cada animacion. Las que estan en MANTIENE se quedan en su ultima pose hasta que otra las reemplaza.
  const DUR = { salto: 0.9, brinco: 0.65, temblor: 0.9, giro: 1.1, gigante: 1.6, latido: 1.2, balanceo: 1.4, cabeceo: 0.9, no: 0.85, huir: 0.8, susto: 0.6,
    desmayo: 1.0, levanta: 0.6, derrumbe: 1.3, asciende: 1.4, baile: 2.6, saludo: 1.3, risa: 1.4, aplauso: 1.3, furia: 1.1, pensar: 1.6,
    entra_lado: 0.55, entra_caer: 0.9, entra_pop: 0.5 };
  const MANTIENE = { desmayo: true, huir: true, derrumbe: true };
  const rebote = u => { u = clamp(u, 0, 1); if (u < 1 / 2.75) return 7.5625 * u * u; if (u < 2 / 2.75) { u -= 1.5 / 2.75; return 7.5625 * u * u + 0.75; } if (u < 2.5 / 2.75) { u -= 2.25 / 2.75; return 7.5625 * u * u + 0.9375; } u -= 2.625 / 2.75; return 7.5625 * u * u + 0.984375; };
  // Desplazamiento / giro / escala de un sprite segun su animacion. dir = -1 (izq), 1 (der), 0 (centro).
  function pose(f, dir) {
    const T = DUR[f.tipo] || 1, t = f.t, u = clamp(t / T, 0, 1), P = { dx: 0, dy: 0, rot: 0, esc: 1, op: 1, fin: t >= T };
    switch (f.tipo) {
      case "salto": P.dy = -Math.abs(Math.sin(u * Math.PI * 2)) * 70 * (1 - u * 0.4); break;
      case "brinco": P.dy = -Math.sin(u * Math.PI) * 130; break;
      case "temblor": P.dx = Math.sin(t * 75) * 11 * (1 - u); break;
      case "giro": P.rot = 360 * U.ease.io(u); break;
      case "gigante": P.esc = 1 + 0.22 * Math.sin(u * Math.PI); break;
      case "latido": P.esc = 1 + 0.09 * Math.abs(Math.sin(u * Math.PI * 3)); break;
      case "balanceo": P.rot = Math.sin(t * 9) * 9 * (1 - u); break;
      case "cabeceo": P.dy = Math.abs(Math.sin(u * Math.PI * 3)) * 24; break;
      case "no": P.dx = Math.sin(t * 20) * 18 * (1 - u); P.rot = Math.sin(t * 20) * 3 * (1 - u); break;
      case "huir": { const e = U.ease.in(u), d = dir || 1; P.dx = d * e * 640; P.rot = d * e * 28; P.dy = -Math.abs(Math.sin(t * 22)) * 24 * (1 - u); P.op = 1 - clamp((u - 0.7) / 0.3, 0, 1); break; }
      case "susto": P.esc = 1 + 0.18 * Math.sin(clamp(u * 1.7, 0, 1) * Math.PI); P.dy = -Math.sin(clamp(u * 1.7, 0, 1) * Math.PI) * 45; P.dx = Math.sin(t * 85) * 7 * (1 - u); break;
      case "desmayo": { const e = U.ease.out(u); P.rot = (dir >= 0 ? 1 : -1) * 82 * e; P.dy = 150 * e; P.dx = (dir >= 0 ? 1 : -1) * 40 * e; break; }
      case "levanta": { const e = 1 - U.ease.out(u); P.rot = (dir >= 0 ? 1 : -1) * 82 * e; P.dy = 150 * e; P.dx = (dir >= 0 ? 1 : -1) * 40 * e; break; }
      case "derrumbe": { const e = U.ease.in(u), d = dir >= 0 ? 1 : -1; P.dy = e * 950; P.rot = d * e * 55; P.dx = d * e * 70; P.op = 1 - clamp((u - 0.55) / 0.45, 0, 1); break; }   // cae por el borde de abajo y desaparece
      case "asciende": { const e = U.ease.out(u); P.dy = (1 - e) * 640; P.esc = 0.7 + 0.3 * U.ease.back(u); P.op = clamp(u * 3, 0, 1); break; }       // sube desde abajo hasta su lugar
      case "baile": P.dy = -Math.abs(Math.sin(t * 7)) * 48; P.rot = Math.sin(t * 7) * 8; break;
      case "saludo": P.rot = Math.sin(t * 11) * 7 * (1 - u * 0.4); P.dy = -Math.abs(Math.sin(t * 11)) * 8; break;
      case "risa": P.dy = Math.sin(t * 30) * 6 * (1 - u * 0.5); P.rot = Math.sin(t * 15) * 3; break;
      case "aplauso": P.esc = 1 + 0.045 * Math.sin(t * 26); break;
      case "furia": P.dx = Math.sin(t * 60) * 6; P.esc = 1 + 0.08 * Math.sin(u * Math.PI); break;
      case "pensar": P.rot = Math.sin(u * Math.PI) * 6 * (dir >= 0 ? -1 : 1); P.dy = Math.sin(u * Math.PI) * 10; break;
      case "entra_lado": P.dx = (dir || 1) * (1 - U.ease.out(u)) * 560; break;
      case "entra_caer": P.dy = -(1 - rebote(u)) * 820; break;
      case "entra_pop": P.esc = 0.3 + 0.7 * U.ease.back(u); break;
    }
    return P;
  }
  // Particulas del pool de 55_efectos.js (solo existe en la escena Juego), por encima de la cinematica.
  const EL = { py: 760, ph: 100, by: 890, bh: 100, pitch: 150 };   // decision "elige": panel de la pregunta, botones y separacion
  const EMOTE_W = 240;   // ancho (de texto) del globo: el texto va centrado en el
  const PZ = 815, rr = (a, b) => a + (b - a) * Math.random();
  function parte(tipo, lado) {
    const P = S.part; if (!P || !P.emitir) return;
    const k = C.retrato, cx = (k[lado] === undefined ? k.centro : k[lado]) + k.s / 2;
    if (tipo === "confeti") { for (let i = 0; i < 64; i++) { const izq = i % 2 === 0; P.emitir("confeti_" + (1 + Math.floor(Math.random() * 5)), { x: izq ? 30 : W - 30, y: H * 0.6, vx: (izq ? 1 : -1) * rr(120, 520), vy: -rr(650, 1150), g: 1100, vr: rr(-540, 540), vida: rr(2.2, 3.4), esc: rr(0.9, 1.5), sway: rr(0, 60), z: PZ }); } }
    else if (tipo === "papeles") { for (let i = 0; i < 28; i++) P.emitir("papel", { x: rr(0, W), y: -rr(30, 520), vy: rr(150, 300), g: 30, vr: rr(-150, 150), vida: 6, esc: rr(0.8, 1.4), sway: rr(40, 110), z: PZ, op: 230 }); }
    else if (tipo === "chispas") { for (let i = 0; i < 22; i++) { const a = rr(0, 6.283), v = rr(120, 420); P.emitir("chispa", { x: cx, y: k.y + k.s * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 420, vr: rr(-300, 300), vida: rr(0.6, 1.2), esc: rr(0.5, 1.1), z: PZ }); } }
    else if (tipo === "polvo") { for (let i = 0; i < 14; i++) P.emitir("polvo", { x: cx + rr(-150, 150), y: k.y + k.s - 20 + rr(-10, 10), vx: rr(-90, 90), vy: -rr(5, 60), vr: rr(-40, 40), vida: rr(0.5, 0.9), esc: rr(1.2, 2.2), op: 170, z: PZ }); }
    else if (tipo === "lluvia") R.lluvia = true;
    else if (tipo === "nada") R.lluvia = false;
  }
  // Periodico del semestre: {nombre, fecha, notas:[{h, t}]}. Las notas salen una por una; un toque las muestra todas y luego continua.
  function limpiaPer() { if (R && R.per) { R.per.objs.forEach(x => U.borrar(x, A)); R.per = null; } }
  function ponerPeriodico(P) {
    const z = C.z + 30, X = 56, WT = 608, objs = [], bloques = [];
    const add = o => { objs.push(o); A.push(o); return o; };
    const T = (name, txt, size, y, col, al) => { const o = add(U.txt(name, X, y, size, WT, { al: al || "left", col, z: z + 4 })); U.tam(o, size); setTxt(o, txt); return o; };
    add(U.pnl(null, "dorado", 28, 64, 664, 1150, z)); add(U.pnl(null, "crema", 34, 70, 652, 1138, z + 1));
    T("TxtTitulo", fmt(P.nombre || "EL PREGONERO NAYARITA", R.ctx), 44, 92, "tinta", "center");
    T("TxtTexto", fmt(P.fecha || "{fecha}", R.ctx) + " · Edición del semestre {sem}".replace("{sem}", (R.ctx && R.ctx.sem) || ""), 22, 150, "azul", "center");
    add(U.pnl(null, "tinta", X, 190, WT, 4, z + 3));
    let y = 214;
    (P.notas || []).forEach(n => {
      const h = fmt(n.h, R.ctx), t = fmt(n.t, R.ctx), hs = 38, ts = 27;
      const lh = U.envolver(h, hs, WT, "titulo").length, lt = U.envolver(t, ts, WT, "cuerpo").length;
      const hO = T("TxtPersonaje", h, hs, y, "guinda_osc"), tO = T("TxtTexto", t, ts, y + lh * hs * L.txt.lhB + 8, "tinta");
      const regla = add(U.pnl(null, "gris", X, y + lh * hs * L.txt.lhB + 8 + lt * ts * L.txt.lh + 12, WT, 2, z + 3));
      [hO, tO, regla].forEach(o => o.hide(true));
      bloques.push([hO, tO, regla]);
      y += lh * hs * L.txt.lhB + lt * ts * L.txt.lh + 56;
    });
    const sig = T("TxtTexto", "Toca para continuar", 22, 1168, "azul", "center"); sig.hide(true);
    R.per = { objs, bloques, sig, t: 0, n: 0, listo: false };
  }
  function tickPer(dt) {
    const p = R.per; if (!p) return;
    p.t += dt;
    const n = Math.min(p.bloques.length, Math.floor((p.t - 0.5) / 1.3) + 1);
    while (p.n < n) { p.bloques[p.n].forEach(o => o.hide(false)); p.n++; try { U.sonido("pagina"); } catch (e) { } }
    if (!p.listo && p.n >= p.bloques.length) { p.listo = true; p.t = 0; }
    p.sig.hide(!(p.listo && Math.floor(p.t * 2) % 2 === 0));
  }
  // Decision entre capitulos: {id, texto, izq: OPCION, der: OPCION}. Las opciones son las del juego (t, e, int, af, set, luego, estado...).
  // En modo facil se muestra bajo cada boton que sube y que baja; en modo dificil, nada.
  const nombresStat = () => (S.STATS || ["Profesores", "Alumnos", "Finanzas", "Rectoría"]);
  function pista(op) {
    const e = (op && op.e) || [], N = nombresStat(), sube = [], baja = [];
    e.forEach((v, i) => { if (v > 0) sube.push(N[i]); else if (v < 0) baja.push(N[i]); });
    return [sube.length ? "Sube: " + sube.join(", ") : "", baja.length ? "Baja: " + baja.join(", ") : ""].filter(Boolean).join("  ·  ");
  }
  function ponerElige(E) {
    const o = R.o, facil = !(U.aj && U.aj.dificultad === "dificil");
    setTxt(o.eTx, fmt(E.texto || "¿Qué haces?", R.ctx));
    const ops = [E.izq, E.der];
    o.eBt.forEach((b, k) => { U.btnTxt(b, fmt((ops[k] && ops[k].t) || "", R.ctx)); b.down = false; setTxt(o.eHt[k], facil ? pista(ops[k]) : ""); });
    R.elige = { E, ops, listo: false, t: 0 };
  }
  function elegirOpcion(k) {
    const el = R.elige; if (!el || el.listo) return;
    el.listo = true;
    try { if (typeof S.aplicarOpcionCine === "function") S.aplicarOpcionCine(el.ops[k], el.E.id); } catch (e) { }
    try { U.sonido("voto"); } catch (e) { }
    R.flash = 0.6; anim(R.o.flash, "blanco");
    R.elige = null; linea(R.i + 1);
  }
  // Globo de dialogo corto sobre un sprite ("emote": "!", "?", "...").
  function emote(lado, texto) {
    const e = R.o.emo[lado]; if (!e) return;
    setTxt(e.tx, texto); e.w = Math.max(90, U.ancho(texto, 40, "titulo") + 44); e.h = 74; e.t = 0; e.on = true; e.tx.hide(true);
    const k = C.retrato; e.cx = (lado === "izq" ? k.izq : lado === "der" ? k.der : k.centro) + k.s / 2; e.cy = k.y - 14;   // sobre la cabeza del sprite
  }

  const vistas = () => U.lsGet("cine_vistas", {}) || {};
  const marcarVista = id => { const v = vistas(); v[id] = true; U.lsSet("cine_vistas", v); };
  // Sustituye {claves}: primero las del contexto, despues las del juego (S.fmt en la escena Juego).
  const fmt = (s, ctx) => {
    s = String(s || "").replace(/\{(\w+)\}/g, (m, k) => (ctx && ctx[k] !== undefined ? ctx[k] : k === "jugador" ? ((U.aj && U.aj.nombre) || "Director") : m));
    try { if (typeof S.fmt === "function") s = S.fmt(s); } catch (e) { }
    return s;
  };

  cine.existe = id => !!GUIONES[id];
  cine.linea = () => (R ? R.i : -1);
  cine.completo = () => !R || R.n >= R.total;      // indice de la linea en curso (lo usa tools/dump_screens.js para capturar guiones)
  cine.reproducir = function (id, ctx, alTerminar) {
    const g = GUIONES[id];
    if (!g || !Array.isArray(g.lineas) || !g.lineas.length) { if (alTerminar) alTerminar(); return false; }
    if (g.una_vez && vistas()[id]) { if (alTerminar) alTerminar(); return false; }
    if (cine.activo) { cine.cola.push([id, ctx, alTerminar]); return true; }
    abrir(id, g, ctx || {}, alTerminar);
    return true;
  };
  cine.disparar = function () { return cine.dispararCon.apply(null, [{}].concat([].slice.call(arguments))); };
  // Igual que disparar, pero con contexto para el guion: {caido, sucesor} (ids de retrato para "pj": "@caido" / "@sucesor") y claves de texto ({suc}, {n}...).
  cine.dispararCon = function (ctx) {
    for (let i = 1; i < arguments.length; i++) {
      const k = arguments[i], id = k && DISPAROS[k];
      if (id && GUIONES[id]) return cine.reproducir(id, Object.assign({ evento: k }, ctx));
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
      ret[lado] = { o, pj: "", a: 0, obj: 0, activo: false, fx: null };
    });
    const emo = {}; ["izq", "der", "centro"].forEach(lado => {   // globos cortos ("emote") sobre los sprites
      const bd = U.pnl(A, "dorado", 0, 0, 0, 0, z + 26), f = U.pnl(A, "crema", 0, 0, 0, 0, z + 27);
      const tx = U.mkTxt(A, "TxtPersonaje", 0, 0, 40, EMOTE_W, { al: "center", col: "guinda_osc", z: z + 28 }); tx.hide(true);
      emo[lado] = { bd, f, tx, on: false, t: 0, dur: 1.9, w: 90, h: 74, cx: 0, cy: 0 };
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
    // decision ("elige"): pregunta + dos botones (+ pista de efectos en modo facil)
    const ePn = U.pnl(A, "guinda_osc", 24, EL.py, 672, EL.ph, z + 20, 236), eBd = U.pnl(A, "dorado", 24, EL.py, 672, 3, z + 21);
    const eTx = U.mkTxt(A, "TxtTexto", 52, EL.py + 14, 28, 616, { al: "center", col: "crema", z: z + 24 });
    const eBt = [0, 1].map(k => U.mkBtn(A, 40, EL.by + k * EL.pitch, 640, EL.bh, "", z + 25, { size: 28, obj: "TxtTexto" }));
    const eHt = [0, 1].map(k => U.mkTxt(A, "TxtTexto", 52, EL.by + k * EL.pitch + EL.bh + 4, 22, 616, { al: "center", col: "dorado_claro", z: z + 25 }));
    const elOcultar = v => { U.pset(ePn, 24, EL.py, 672, v ? 0 : EL.ph); U.pset(eBd, 24, EL.py, 672, v ? 0 : 3); eTx.hide(v); eBt.forEach(b => U.btnOcultar(b, v)); eHt.forEach(t => t.hide(v)); };
    elOcultar(true);
    const flash = U.pnl(A, "blanco", 0, 0, W, H, z + 60, 0);
    const velo = U.pnl(A, "negro", 0, 0, W, H, z + 70, 255);
    const SB = C.saltar, saltar = U.mkBtn(A, SB.x, SB.y, SB.w, SB.h, "Saltar »", z + 50, { size: 28 });
    anim(fondo, g.fondo || "carta");
    R = { id, g, ctx, alTerminar, i: -1, t: 0, n: 0, total: 0, full: "", espera: 0, velo: 1, veloObj: 0, cerrando: false, flash: 0, shake: 0, tinte: g.tinte || 0,
      lluvia: false, lluviaAcc: 0, elige: null,
      o: { fondo, tinte, ret, emo, ePn, eBd, eTx, eBt, eHt, elOcultar, cajaBd, caja, nomBd, nomF, nom, txt, sigue, tit, sub, flash, velo, saltar } };
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
    const g = R.g, ln0 = g.lineas[i];
    if (!ln0) { R.cerrando = true; R.veloObj = 1; return; }
    const ln = ln0.pj && ln0.pj.charAt(0) === "@" ? Object.assign({}, ln0, { pj: (R.ctx && R.ctx[ln0.pj.slice(1)]) || "director" }) : ln0;   // "@caido" / "@sucesor": sprite elegido por el juego
    if (ln.elige && ln.elige.id && S.flags && S.flags["elig_" + ln.elige.id]) return linea(i + 1);   // ya decidida (p. ej. al recargar): no se repite
    limpiaPer();
    R.i = i; R.t = 0; R.n = 0; R.elige = null;
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
      if (p.pj !== ln.pj || p.sale) { p.pj = ln.pj; p.a = 0; p.sale = false; p.fx = ln.entra ? { tipo: "entra_" + ln.entra, t: 0 } : null; anim(p.o, ln.expr || ln.pj); p.o.hide(false); }
      else if (ln.expr) anim(p.o, ln.expr);
      p.obj = 1;
    }
    Object.keys(o.ret).forEach((k, n) => {
      const p = o.ret[k]; p.activo = ln.gag !== undefined || ln.elige !== undefined || ln.periodico !== undefined || (!!ln.pj && (p === (o.ret[lado] || o.ret.izq)));
      p.o.setZOrder(C.z + (p.activo && ln.gag === undefined ? 14 : 10 + n));   // quien habla va al frente; los demas (mas tenues) quedan hasta atras
    });
    // animaciones de sprites, globos de emocion y particulas (string = el que habla; objeto = por lado)
    const porLado = v => (typeof v === "string" ? { [lado || "izq"]: v } : v || {});
    if (ln.anima) {   // si el sprite acaba de entrar con "entra", la animacion empieza cuando termina la entrada
      const m = porLado(ln.anima);
      Object.keys(m).forEach(k => { const p = o.ret[k]; if (!p || !p.pj || p.sale) return; const nueva = m[k] === "nada" ? null : { tipo: m[k], t: 0 };
        if (nueva && p.fx && p.fx.tipo.indexOf("entra_") === 0 && p.fx.t < 0.05) p.fx.sig = nueva.tipo; else p.fx = nueva; });
    }
    if (ln.emote) { const m = porLado(ln.emote); Object.keys(m).forEach(k => emote(k, m[k])); }
    if (ln.parte) [].concat(ln.parte).forEach(t => parte(t, lado || "centro"));
    // tipo de linea
    const esTit = ln.titulo !== undefined, esNarra = ln.narra !== undefined, esGag = ln.gag !== undefined, esElige = ln.elige !== undefined, esPer = ln.periodico !== undefined;   // gag: solo accion, sin caja ni texto; avanza sola. elige: decision con dos botones
    const caja = !esTit && !esGag && !esElige && !esPer;
    [o.cajaBd, o.caja].forEach(x => x.hide(!caja)); R.conCaja = caja;
    o.elOcultar(!esElige);
    [o.tit, o.sub].forEach(x => x.hide(!esTit));
    const conNom = !!ln.pj && !esNarra && !esGag && !esElige && !esPer;
    [o.nomBd, o.nomF, o.nom].forEach(x => x.hide(!conNom));
    if (esTit) {
      const t = fmt(ln.titulo, R.ctx), f = U.ajustar(t, [C.titulo.size, 72, 60, 52, 44], W - 80, 3 * C.titulo.size * L.txt.lhB, "titulo");
      setTxt(o.tit, t); U.tam(o.tit, f.size); U.c(o.tit, "setColor", U.CC[ln.col || "dorado_claro"]);
      o.sub.setPosition(60, C.titulo.y + f.alto + 18); setTxt(o.sub, fmt(ln.sub || "", R.ctx));
      R.full = ""; R.total = 0; o.txt.hide(true);
    } else if (esGag) {
      R.full = ""; R.total = 0; o.txt.hide(true);
    } else if (esElige) {
      R.full = ""; R.total = 0; o.txt.hide(true);
      ponerElige(ln.elige);
    } else if (esPer) {
      R.full = ""; R.total = 0; o.txt.hide(true);
      ponerPeriodico(ln.periodico);
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
    R.espera = esGag ? (+ln.gag || 1.2) : typeof ln.espera === "number" ? ln.espera : 0;
    if (U.ev && !esTit) U.ev("pagina");
  }
  const nombrePj = pj => { try { return (S.data && S.data.personajes && S.data.personajes[pj]) || (DATOS.nombres || {})[pj] || pj; } catch (e) { return pj; } };

  function avanzar() {
    if (R.elige) return;                                    // una decision solo se resuelve con sus botones
    if (R.per) { if (!R.per.listo) { R.per.t = 99; tickPer(0); } else linea(R.i + 1); return; }   // periodico: primero se muestran todas las notas
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
    // retratos: fundido de entrada, animaciones (pose) y atenuado del que no habla
    const RT = C.retrato;
    Object.keys(o.ret).forEach(k => {
      const p = o.ret[k]; if (!p.pj) return;
      p.a = clamp(p.a + (p.obj > p.a ? dt / C.fundido : -dt / C.fundido), 0, 1);
      if (p.a <= 0 && p.sale) { p.o.hide(true); p.pj = ""; p.sale = false; p.fx = null; return; }
      const dir = k === "izq" ? -1 : k === "der" ? 1 : 0;
      let P = null, entra = false;
      if (p.fx) {
        p.fx.t += dt; P = pose(p.fx, dir); entra = p.fx.tipo.indexOf("entra_") === 0 || p.fx.tipo === "asciende";
        if (P.fin) { if (p.fx.tipo === "huir" && !p.sale) { p.obj = 0; p.sale = true; } else if (p.fx.sig) p.fx = { tipo: p.fx.sig, t: 0 }; else if (!MANTIENE[p.fx.tipo]) p.fx = null; }
      }
      const e = P ? P.esc : 1, w = RT.s * e, dyIn = entra ? 0 : (1 - U.ease.out(p.a)) * RT.entrada;   // entra subiendo (o con su "entra"): nunca se sale de la pantalla
      p.o.setWidth(w); p.o.setHeight(w);
      p.o.setPosition(RT[k] + (RT.s - w) / 2 + (P ? P.dx : 0), RT.y + (RT.s - w) + dyIn + (P ? P.dy : 0));
      p.o.setAngle(P ? P.rot : 0);
      p.o.setOpacity(p.a * (P ? P.op : 1) * (p.activo ? 255 : RT.inactivo));
    });
    tickPer(dt);
    // globos de emocion
    Object.keys(o.emo).forEach(k => {
      const e = o.emo[k]; if (!e.on) return;
      e.t += dt; const u = e.t / e.dur;
      if (u >= 1) { e.on = false; U.pset(e.bd, 0, 0, 0, 0); U.pset(e.f, 0, 0, 0, 0); e.tx.hide(true); return; }
      const pop = u > 0.85 ? 1 - (u - 0.85) / 0.15 : U.ease.back(e.t / 0.28), w = e.w * pop, h = e.h * pop, cy = e.cy - 22 * U.ease.out(u);
      U.pset(e.bd, e.cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8); U.pset(e.f, e.cx - w / 2, cy - h / 2, w, h);
      e.tx.hide(pop < 0.75); e.tx.setPosition(e.cx - EMOTE_W / 2, cy - 27);
    });
    // lluvia continua ("parte": "lluvia" hasta "parte": "nada")
    if (R.lluvia && S.part && S.part.emitir) {
      R.lluviaAcc += dt * 55;
      while (R.lluviaAcc >= 1) { R.lluviaAcc -= 1; if (S.part.vivasDe("gota") >= 90) { R.lluviaAcc = 0; break; } S.part.emitir("gota", { x: rr(-60, W + 20), y: rr(-60, -10), vx: -110, vy: rr(950, 1250), vida: 1.5, op: rr(110, 180), z: PZ - 2, ang: 6 }); }
    }
    // flash y sacudida
    if (R.flash > 0) { R.flash = Math.max(0, R.flash - dt * 2.5); o.flash.setOpacity(R.flash * 200); }
    if (R.shake > 0) {
      R.shake = Math.max(0, R.shake - dt); const a = 14 * Math.min(1, R.shake / 0.4);
      try { const ly = runtimeScene.getLayer(""); ly.setCameraX(W / 2 + (Math.random() * 2 - 1) * a, 0); ly.setCameraY(H / 2 + (Math.random() * 2 - 1) * a, 0); } catch (e) { }
    }
    // entrada: Saltar (boton o Escape), avance con toque / Espacio / Enter, o espera automatica
    if (U.btnTick(o.saltar, I) || I.kp[27]) { R.cerrando = true; R.veloObj = 1; }
    else if (R.velo < 0.5 && R.elige) {
      R.elige.t += dt;
      if (R.elige.t > 0.35) {                               // pausa breve para no elegir por accidente con el toque anterior
        if (U.btnTick(o.eBt[0], I) || I.kp[49] || I.kp[37]) elegirOpcion(0);
        else if (U.btnTick(o.eBt[1], I) || I.kp[50] || I.kp[39]) elegirOpcion(1);
      }
    }
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
