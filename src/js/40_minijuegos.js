// ============================================================================
// 40 MINIJUEGOS — presupuesto, prensa, plagio y consejo.
// Cada minijuego crea objetos efimeros registrados en S.ui; S.limpiarUI() los
// borra todos (tambien al terminar, al pausar-salir o al reiniciar la partida).
// Textos: S.o.pj = titulo, S.o.texto = instrucciones, S.o.opcion = retroalimentacion
// (color segun m.res: ok | med | mal), S.o.tiempo = leyenda de la barra. Los dibuja
// 60_render (posiciones en U.L.mini). Aqui van los botones, filas y fragmentos.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.mod_mini) {
  S.mod_mini = true;
  const U = S.u, L = U.L, M = L.mini, W = U.W, H = U.H, setTxt = U.setTxt, anim = U.anim, rnd = U.rnd, shuffle = U.shuffle, hit = U.hit;
  S.ui = [];
  S.m = null;
  S.limpiarUI = function () { U.limpiar(S.ui); };
  const mkTxt = (n, x, y, s, w, opt) => U.mkTxt(S.ui, n, x, y, s, w, opt);
  const mkBtn = (x, y, w, h, l, opt) => U.mkBtn(S.ui, x, y, w, h, l, 50, opt);
  const borrarBtns = m => { (m.btn || []).forEach(b => U.btnDel(b, S.ui)); m.btn = []; };
  const RES_BTN = { ok: "ok", med: "medio", mal: "mal" };
  const respuesta = (x, k, l) => mkBtn(M.btn.x, M.zona + k * M.btn.pitch, M.btn.w, M.btn.h, (k + 1) + ". " + l, { obj: "TxtTexto", size: M.btn.size });

  S.iniciarMini = function (cfg) {
    if (typeof cfg === "string") cfg = { tipo: cfg, bien: [0, 0, 0, 0], mal: [0, 0, 0, 0] };
    S.limpiarUI();
    const m = S.m = { tipo: cfg.tipo, cfg, fase: "juego", t: 0, fb: 0, btn: [], res: "" };
    S.setEstado("mini");
    const D = S.data.mini[cfg.tipo] || {};
    setTxt(S.o.opcion, ""); setTxt(S.o.tiempo, "");
    if (cfg.tipo === "presupuesto") {
      m.rub = D.rubros && D.rubros.length >= 4 ? D.rubros : ["Nómina", "Becas", "Infraestructura", "Investigación"];
      m.asig = [0, 0, 0, 0]; m.pres = m.rub.map(() => 1 + rnd(5)); m.sel = 0; m.filas = [];
      const P = M.pres;
      m.rub.slice(0, 4).forEach((r, i) => {
        const y = M.zona + i * P.pitch;
        const bd = U.pnl(S.ui, "dorado", P.lab.x, y, P.lab.w, P.h, 8), bg = U.pnl(S.ui, "guinda_osc", P.lab.x + 3, y + 3, P.lab.w - 6, P.h - 6, 9);
        const lab = mkTxt("TxtTexto", P.lab.x + 16, y + 10, 26, P.lab.w - 32, { col: "crema", z: 20 });
        U.mkTxt(S.ui, "TxtTexto", P.lab.x + 16, y + 62, 22, 100, { col: "crema_osc", z: 20 }); setTxt(S.ui[S.ui.length - 1], "Presión");
        for (let k = 0; k < 5; k++) U.pnl(S.ui, k < m.pres[i] ? "dorado" : "gris", P.lab.x + 118 + k * 34, y + 70, 28, 16, 20);
        m.filas.push({ bd, bg, lab, menos: mkBtn(P.menos.x, y, P.menos.w, P.h, "−"), mas: mkBtn(P.mas.x, y, P.mas.w, P.h, "+") });
      });
      m.ok = mkBtn(P.ok.x, P.ok.y, P.ok.w, P.ok.h, "Confirmar");
      setTxt(S.o.pj, "ASIGNACIÓN DE PRESUPUESTO");
      setTxt(S.o.texto, "Hay 100 millones por repartir. Cada rubro presiona según su necesidad (barras doradas). Reparte en proporción. Teclado: flechas arriba y abajo eligen rubro, izquierda y derecha ajustan, Enter confirma.");
    } else if (cfg.tipo === "prensa" && (D.preguntas || []).length) {
      m.qs = shuffle(D.preguntas).slice(0, 3); m.i = 0; m.pts = 0; m.t = 6;
      setTxt(S.o.pj, "RUEDA DE PRENSA");
      S.prensaPregunta();
    } else if (cfg.tipo === "plagio" && ((D.originales || []).length && (D.plagiados || []).length)) {
      m.frag = []; m.next = 0.3; m.hits = 0; m.falsos = 0; m.perdidos = 0; m.t = 20;
      setTxt(S.o.pj, "COMITÉ DE INTEGRIDAD ACADÉMICA");
      setTxt(S.o.texto, "Toca los fragmentos PLAGIADOS (texto sospechoso). Deja pasar los originales. La tecla Espacio marca el fragmento más bajo.");
    } else if (cfg.tipo === "consejo" && (D.consejeros || []).length && Object.keys(D.args || {}).length >= 3) {
      m.cs = shuffle(D.consejeros).slice(0, 5); m.i = 0; m.favor = 0; m.args = D.args;
      setTxt(S.o.pj, "CONSEJO TÉCNICO");
      S.consejoTurno();
    } else {
      S.finMini(true, "(minijuego no disponible: " + cfg.tipo + ")");
    }
  };
  S.prensaPregunta = function () {
    const m = S.m;
    borrarBtns(m);
    m.t = 6; m.fb = 0; m.res = "";
    const q = m.qs[m.i];
    m.ans = shuffle(q.a);
    setTxt(S.o.texto, "Pregunta " + (m.i + 1) + " de " + m.qs.length + ":\n«" + q.q + "»");
    m.ans.forEach((a, k) => m.btn.push(respuesta(m, k, a[0])));
    setTxt(S.o.opcion, "");
  };
  S.prensaResponder = function (k) {
    const m = S.m, p = k >= 0 ? m.ans[k][1] : 0;
    m.pts += p; m.fb = 1.1;
    m.res = p === 2 ? "ok" : p === 1 ? "med" : "mal";
    U.ev(p === 2 ? "acierto" : p === 1 ? "boton" : "error");
    if (k >= 0) {
      m.btn[k].fijo = RES_BTN[m.res];
      if (p < 2) { const b = m.ans.findIndex(a => a[1] === 2); if (b >= 0) m.btn[b].fijo = "ok"; }
    }
    setTxt(S.o.opcion, k < 0 ? "Se acabó el tiempo. Silencio incómodo." : p === 2 ? "Buena respuesta." : p === 1 ? "Respuesta aceptable." : "Mala respuesta. Los flashes se disparan.");
  };
  S.consejoTurno = function () {
    const m = S.m;
    borrarBtns(m);
    m.fb = 0; m.res = "";
    const c = m.cs[m.i];
    const otros = shuffle(Object.keys(m.args).filter(k => k !== c.ok)).slice(0, 2);
    m.opts = shuffle(otros.concat([c.ok]));
    setTxt(S.o.texto, "Consejero " + (m.i + 1) + " de " + m.cs.length + ": " + c.n + "\n" + c.d + "\n¿Con qué argumento lo convences? Necesitas 3 votos.");
    m.opts.forEach((k, j) => m.btn.push(respuesta(m, j, m.args[k] || k)));
    setTxt(S.o.opcion, "");
  };
  S.consejoResponder = function (j) {
    const m = S.m, c = m.cs[m.i], k = m.opts[j];
    U.ev(k === c.ok ? "acierto" : k === c.mal ? "error" : "boton");
    if (k === c.ok) { m.favor++; m.res = "ok"; setTxt(S.o.opcion, c.n + " votará a favor."); }
    else if (k === c.mal) { m.res = "mal"; setTxt(S.o.opcion, c.n + " se ofendió: votará en contra."); }
    else { m.res = "med"; setTxt(S.o.opcion, c.n + " se abstiene."); }
    m.btn[j].fijo = RES_BTN[m.res];
    if (k !== c.ok) { const b = m.opts.indexOf(c.ok); if (b >= 0) m.btn[b].fijo = "ok"; }
    m.fb = 1.2;
  };
  S.finMini = function (ok, resumen) {
    const m = S.m;
    m.fase = "res"; m.ok = ok;
    U.ev(ok ? "acierto" : "error");
    S.limpiarUI();
    m.btn = []; m.filas = [];
    S.espera = 0.5; S.esperaSoltar = true;
    setTxt(S.o.pj, ok ? "RESULTADO: BIEN\nLa Unidad sale fortalecida" : "RESULTADO: MAL\nLa Unidad paga las consecuencias");
    setTxt(S.o.texto, resumen);
    setTxt(S.o.opcion, ""); setTxt(S.o.tiempo, "");
  };
  S.cerrarMini = function () {
    const m = S.m, c = m.cfg, p = m.ok ? "bien_" : "mal_";
    S.limpiarUI();
    S.ctxPj = S.c ? S.c.pj : ""; S.modOn = true;
    S.aplicarE(m.ok ? c.bien : c.mal);
    S.modOn = false;
    S.aplicarExtras(c, p);
    if (m.ok) S.dar("mini_" + m.tipo);
    S.m = null;
    S.checkLogros();
    S.postEleccion();
  };
  S.updateMini = function (dt, click, mx, my, kp) {
    const m = S.m;
    if (m.fase === "res") return;
    if (S.espera > 0) { click = false; kp = {}; }       // evita que el toque que abrio el minijuego cuente dentro
    if (m.tipo === "presupuesto") {
      const pool = 100 - m.asig.reduce((a, b) => a + b, 0);
      const mover = (i, d) => { if (d > 0 && pool >= 5) m.asig[i] += 5; else if (d < 0 && m.asig[i] >= 5) m.asig[i] -= 5; };
      if (kp[38]) m.sel = (m.sel + 3) % 4;
      if (kp[40]) m.sel = (m.sel + 1) % 4;
      if (kp[37]) mover(m.sel, -1);
      if (kp[39]) mover(m.sel, 1);
      let conf = kp[13] || kp[32];
      if (click) {
        m.filas.forEach((f, i) => { if (hit(f.menos, mx, my)) { m.sel = i; mover(i, -1); } else if (hit(f.mas, mx, my)) { m.sel = i; mover(i, 1); } });
        if (hit(m.ok, mx, my)) conf = true;
      }
      const pool2 = 100 - m.asig.reduce((a, b) => a + b, 0);
      m.filas.forEach((f, i) => {
        setTxt(f.lab, m.rub[i] + ": " + m.asig[i] + " M");
        anim(f.bg, i === m.sel ? "vino" : "guinda_osc");
      });
      setTxt(S.o.tiempo, "Sin asignar: " + pool2 + " de 100 millones");
      if (conf) {
        if (pool2 !== 0) { m.res = "mal"; setTxt(S.o.opcion, "Debes asignar los 100 millones."); return; }
        const tot = Math.max(1, m.pres.reduce((a, b) => a + b, 0));
        const ideal = m.pres.map(p => Math.round(100 * p / tot));
        const err = m.asig.reduce((a, x, i) => a + Math.abs(x - ideal[i]), 0);
        S.finMini(err <= 40, "Tu reparto: " + m.asig.map((x, i) => m.rub[i] + " " + x).join(", ") + ".\nLo que pedía la comunidad: " + ideal.map((x, i) => m.rub[i] + " " + x).join(", ") + ".\nDesviación total: " + err + " millones.");
      } else if (pool2 === 0 && U.getTxt(S.o.opcion) === "Debes asignar los 100 millones.") setTxt(S.o.opcion, "");
    } else if (m.tipo === "prensa") {
      if (m.fb > 0) {
        m.fb -= dt;
        if (m.fb <= 0) {
          m.i++;
          if (m.i >= m.qs.length) return S.finMini(m.pts >= 4, "Puntos de la rueda de prensa: " + m.pts + " de " + (m.qs.length * 2) + " (necesitas 4).");
          S.prensaPregunta();
        }
        return;
      }
      m.t -= dt;
      let k = -2;
      if (kp[49]) k = 0; else if (kp[50]) k = 1; else if (kp[51]) k = 2;
      if (click) m.btn.forEach((b, j) => { if (hit(b, mx, my)) k = j; });
      if (k >= m.ans.length) k = -2;
      if (m.t <= 0) k = -1;
      setTxt(S.o.tiempo, "Tiempo: " + Math.max(0, m.t).toFixed(1) + " s");
      if (k !== -2) S.prensaResponder(k);
    } else if (m.tipo === "plagio") {
      const D = S.data.mini.plagio, PG = M.plagio;
      m.t -= dt; m.next -= dt;
      if (m.t > 1.5 && m.next <= 0) {
        m.next = 1.1 + Math.random() * 0.4;
        const plag = Math.random() < 0.5;
        const lista = plag ? D.plagiados : D.originales;
        const f = { plag, y: M.zona, res: null, tr: 0 };
        f.s = runtimeScene.createObject("Fragmento");
        try { f.s.setWidth(PG.w); f.s.setHeight(PG.h); } catch (e) { }
        f.s.setZOrder(15); f.s.setPosition(PG.x, f.y);
        S.ui.push(f.s);
        f.t = mkTxt("TxtFragmento", PG.x + 22, f.y + 10, 22, PG.w - 44, { col: "tinta", z: 16 });
        setTxt(f.t, lista[rnd(lista.length)]);
        m.frag.push(f);
      }
      const marcar = f => {
        if (f.res) return;
        if (f.plag) { f.res = "bien"; m.hits++; } else { f.res = "mal"; m.falsos++; }
        U.ev(f.plag ? "acierto" : "error");
        anim(f.s, f.res);
      };
      if (click) {
        const cand = m.frag.filter(f => !f.res && mx >= PG.x && mx <= PG.x + PG.w && my >= f.y && my <= f.y + PG.h).sort((a, b) => b.y - a.y);
        if (cand.length) marcar(cand[0]);
      }
      if (kp[32] || kp[13]) {
        const cand = m.frag.filter(f => !f.res).sort((a, b) => b.y - a.y);
        if (cand.length) marcar(cand[0]);
      }
      m.frag.forEach(f => {
        f.y += PG.vel * dt; f.s.setPosition(PG.x, f.y); f.t.setPosition(PG.x + 22, f.y + 10);
        if (f.res) f.tr += dt;
        if (!f.res && f.y > PG.fin) { f.res = "paso"; if (f.plag) m.perdidos++; f.tr = 99; }
      });
      m.frag = m.frag.filter(f => {
        if (f.tr > 0.35) { U.borrar(f.s, S.ui); U.borrar(f.t, S.ui); return false; }
        return true;
      });
      setTxt(S.o.tiempo, "Tiempo: " + Math.max(0, m.t).toFixed(0) + " s   Aciertos: " + m.hits + "   Errores: " + m.falsos + "   Escapados: " + m.perdidos);
      if (m.t <= 0) {
        const pts = m.hits - m.falsos - m.perdidos * 0.5;
        S.finMini(pts >= 4, "Plagios detectados: " + m.hits + ". Falsas acusaciones: " + m.falsos + ". Plagios que se escaparon: " + m.perdidos + ".\nPuntaje: " + pts + " (necesitas 4).");
      }
    } else if (m.tipo === "consejo") {
      if (m.fb > 0) {
        m.fb -= dt;
        if (m.fb <= 0) {
          m.i++;
          if (m.i >= m.cs.length) return S.finMini(m.favor >= 3, "Votos a favor: " + m.favor + " de " + m.cs.length + " (mayoría: 3).");
          S.consejoTurno();
        }
        return;
      }
      let j = -1;
      if (kp[49]) j = 0; else if (kp[50]) j = 1; else if (kp[51]) j = 2;
      if (click) m.btn.forEach((b, k) => { if (hit(b, mx, my)) j = k; });
      if (j >= 0 && j < m.opts.length) S.consejoResponder(j);
      setTxt(S.o.tiempo, "Votos a favor: " + m.favor + " de 3 necesarios · consejero " + (m.i + 1) + " de " + m.cs.length);
    }
  };
}
