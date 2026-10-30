// ============================================================================
// 55 EFECTOS — pool PROPIO de particulas con el sprite "Particula" (animaciones: confeti_1..5, papel, chispa,
// gota, polvo). No usa el objeto ParticleEmitter de GDevelop. Limite de particulas vivas = S.part.max (150):
// las que salen de pantalla o mueren se esconden y se reciclan, nunca se borran ni se crean de mas.
// Efectos: confeti (ganar la eleccion), papeles (caida del director), chispas doradas (logros),
// lluvia (cartas con "fx":"lluvia") y polvo leve (al salir la carta). Se disparan desde U.ev() (05_audio.js)
// a traves de S.fxEvento. Usa su propio generador aleatorio: no altera el azar del juego.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.mod_fx) {
  S.mod_fx = true;
  const U = S.u, L = U.L, W = U.W, H = U.H, CD = L.hud.carta, CX = CD.x + CD.w / 2;
  const MAX = 150, LLUVIA_MAX = 90;
  const TAM = { confeti: [16, 10], papel: [30, 38], chispa: [24, 24], gota: [6, 22], polvo: [20, 20] };
  let sem = 987654321;
  const rf = () => { sem = (sem * 1664525 + 1013904223) % 4294967296; return sem / 4294967296; };
  const rr = (a, b) => a + (b - a) * rf();
  const P = S.part = { vivas: [], libres: [], total: 0, max: MAX, lluviaAcc: 0 };

  P.tomar = function () {
    let p = P.libres.pop();
    if (p) return p;
    if (P.total >= MAX) return null;            // limite global: nunca se crean mas de MAX objetos Particula
    let o = null;
    try { o = runtimeScene.createObject("Particula"); } catch (e) { return null; }
    if (!o) return null;
    P.total++;
    return { o };
  };
  P.liberar = function (p) {
    try { p.o.hide(true); } catch (e) { }
    P.libres.push(p);
  };
  // forma: nombre de animacion; o = {x,y,vx,vy,g,vr,vida,esc,op,z,sway}
  P.emitir = function (forma, o) {
    if (P.vivas.length >= MAX) return false;
    const p = P.tomar();
    if (!p) return false;
    const base = forma.indexOf("confeti") === 0 ? "confeti" : forma, t = TAM[base] || [16, 16];
    Object.assign(p, { forma, x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, ang: o.ang === undefined ? rr(0, 360) : o.ang, vr: o.vr || 0, t: 0, vida: o.vida || 2,
      op: o.op === undefined ? 255 : o.op, sway: o.sway || 0, fase: rr(0, 6.28), w: t[0] * (o.esc || 1), h: t[1] * (o.esc || 1), clase: base });
    try {
      p.o.hide(false); U.anim(p.o, forma);
      p.o.setWidth(p.w); p.o.setHeight(p.h); p.o.setZOrder(o.z === undefined ? 600 : o.z);
      p.o.setPosition(p.x, p.y); p.o.setAngle(p.ang); p.o.setOpacity(p.op);
    } catch (e) { }
    P.vivas.push(p);
    return true;
  };
  P.vivasDe = clase => P.vivas.reduce((n, p) => n + (p.clase === clase ? 1 : 0), 0);
  P.tick = function (dt) {
    for (let i = P.vivas.length - 1; i >= 0; i--) {
      const p = P.vivas[i];
      p.t += dt;
      p.vy += p.g * dt;
      p.x += (p.vx + (p.sway ? Math.sin(p.t * 3 + p.fase) * p.sway : 0)) * dt; p.y += p.vy * dt; p.ang += p.vr * dt;
      if (p.t >= p.vida || p.y > H + 80 || p.y < -400 || p.x < -120 || p.x > W + 120) {
        P.vivas.splice(i, 1); P.liberar(p); continue;
      }
      const resto = (p.vida - p.t) / Math.max(0.2, p.vida * 0.35);
      try {
        p.o.setPosition(p.x, p.y); p.o.setAngle(p.ang);
        p.o.setOpacity(Math.max(0, Math.min(1, resto)) * p.op);
      } catch (e) { }
    }
    // lluvia continua mientras la carta lleva fx = "lluvia"
    if (S.estado === "carta" && S.c && S.c.fx === "lluvia" && S.hudVis) {
      P.lluviaAcc += dt * 55;
      while (P.lluviaAcc >= 1) {
        P.lluviaAcc -= 1;
        if (P.vivasDe("gota") >= LLUVIA_MAX) { P.lluviaAcc = 0; break; }
        P.emitir("gota", { x: rr(-60, W + 20), y: rr(-60, -10), vx: -110, vy: rr(950, 1250), vida: 1.5, op: rr(90, 150), z: 40, ang: 6 });
      }
    } else P.lluviaAcc = 0;
  };
  P.confeti = function () {
    for (let i = 0; i < 70; i++) {
      const izq = i % 2 === 0;
      P.emitir("confeti_" + (1 + Math.floor(rf() * 5)), { x: izq ? 40 : W - 40, y: H * 0.62, vx: (izq ? 1 : -1) * rr(120, 520), vy: -rr(650, 1150), g: 1100,
        vr: rr(-540, 540), vida: rr(2.2, 3.4), esc: rr(0.9, 1.5), sway: rr(0, 60) });
    }
  };
  P.papeles = function () {
    for (let i = 0; i < 34; i++)
      P.emitir("papel", { x: rr(0, W), y: -rr(30, 520), vx: 0, vy: rr(110, 230), g: 25, vr: rr(-150, 150), vida: 6, esc: rr(0.8, 1.4), sway: rr(40, 110) });
  };
  P.chispas = function (x, y) {
    for (let i = 0; i < 22; i++) {
      const a = rr(0, 6.283), v = rr(120, 420);
      P.emitir("chispa", { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 420, vr: rr(-300, 300), vida: rr(0.6, 1.2), esc: rr(0.5, 1.1), z: 900 });
    }
  };
  P.polvo = function (x, y) {
    for (let i = 0; i < 9; i++)
      P.emitir("polvo", { x: x + rr(-CD.w * 0.4, CD.w * 0.4), y: y + rr(-10, 10), vx: rr(-70, 70), vy: -rr(5, 45), g: 0, vr: rr(-40, 40), vida: rr(0.45, 0.8), esc: rr(1, 1.8), op: 150, z: 3 });
  };
  // Despachador de eventos (lo llama U.ev de 05_audio.js).
  S.fxEvento = function (n, a) {
    if (n === "soltar") P.polvo(CX + (S.dx || 0), CD.y + CD.h - 8);
    else if (n === "caida") P.papeles();
    else if (n === "logro") P.chispas(W / 2, S.hudVis ? L.hud.aviso.y + 30 : 220);
    else if (n === "eleccion_gana") P.confeti();
  };
}
if (S.listo && !S.saliendo) S.part.tick(S.in.dt);
