// ============================================================================
// 00 COMUN — utilidades, logros, guardado y lectura de entrada.
// Este mismo evento se incluye en TODAS las escenas (Menu, Juego, Logros).
// Todo el estado vive en runtimeScene.__reigns (S). Las funciones compartidas
// cuelgan de S.u. La parte final (fuera del bloque de definiciones) corre
// cada frame y deja la entrada del frame en S.in.
// ============================================================================
const S = runtimeScene.__reigns || (runtimeScene.__reigns = {});
if (!S.u) {
  const game = runtimeScene.getGame();
  const U = S.u = {};
  U.W = 720; U.H = 1280;   // resolucion logica fija (igual que LAYOUT.W/H); GDevelop escala con letterbox
  U.PRE = "directorUAN_";
  // 13 Enter, 27 Esc, 32 Espacio, 37-40 flechas, 49-51 teclas 1-3
  U.KEYS = [13, 27, 32, 37, 38, 39, 40, 49, 50, 51];

  // ---- texto, objetos, animaciones ----
  U.setTxt = function (o, s) { if (!o) return; s = String(s); o.__s = s; if (o.setText) o.setText(s); else o.setString(s); };
  // Texto: tamano minimo 22 px (legible en celular). opt = {al:"center", col:"crema", z:20} (ver U.estilo).
  U.txt = function (name, x, y, size, wrap, opt) {
    const o = runtimeScene.createObject(name);
    o.setCharacterSize(Math.max(22, size));
    if (wrap) { o.setWrapping(true); o.setWrappingWidth(wrap); }
    o.setPosition(x, y);
    if (opt) U.estilo(o, opt);
    return o;
  };
  U.anim = function (o, name) {
    if (o.__a === name) return;
    try {
      if (o.hasAnimationNamed && !o.hasAnimationNamed(name)) return;
      if (o.setAnimationName) { o.setAnimationName(name); o.__a = name; }
    } catch (e) { }
  };
  // Borrado seguro (idempotente) de un objeto, y de la lista que lo contenga.
  U.borrar = function (o, lista) {
    if (!o) return;
    if (lista) { const i = lista.indexOf(o); if (i >= 0) lista.splice(i, 1); }
    if (o.__borrado) return;
    o.__borrado = true;
    try { o.deleteFromScene(runtimeScene); } catch (e) { }
  };
  U.limpiar = function (lista) { lista.slice().forEach(o => U.borrar(o, lista)); lista.length = 0; };
  U.mkTxt = function (lista, name, x, y, size, wrap, opt) { const o = U.txt(name, x, y, size, wrap, opt); lista.push(o); return o; };
  U.hit = (b, px, py) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  U.ocultar = function (lista, v) { lista.forEach(o => { try { o.hide(v); } catch (e) { } }); };
  // ================= UI: LAYOUT compartido, estilos y widgets =================
  // LAYOUT: unica fuente de posiciones/tamanos/paleta. build.js lo espeja en src/layout.json
  // (lo leen tools/preview_layout.py y tools/gen_placeholders.py). Debe ser JSON valido.
  U.L = /*LAYOUT:BEGIN*/{
  "W": 720,
  "H": 1280,
  "col": {"guinda": "#6B1D2A", "guinda_osc": "#3A0F18", "vino": "#8E2B3B", "dorado": "#D4A63A", "dorado_claro": "#F0D58A", "crema": "#F5ECD6", "crema_osc": "#E2D2AC", "tinta": "#2B1B1F", "azul": "#1F3A5F", "azul_cl": "#3E6296", "verde": "#3E8E5A", "rojo": "#B3372F", "ambar": "#C98A1B", "gris": "#8A7F78", "negro": "#140A0D", "blanco": "#FFFFFF"},
  "fuente": {"cuerpo": "assets/fonts/Lora.ttf", "titulo": "assets/fonts/BebasNeue-Regular.ttf"},
  "txt": {"cwLora": 0.53, "cwBebas": 0.43, "lh": 1.32, "min": 22, "minTitulo": 40, "lhB": 1.15},
  "ease": {"volar": 0.38, "voltear": 0.34, "suave": 9},
  "hud": {
    "margen": 24,
    "punto": {"cy": 28, "chico": 14, "grande": 28},
    "ind": {"x0": 24, "celda": 168, "y": 50, "s": 96, "borde": 4, "icono": 48, "etY": 150},
    "chips": {"x": 24, "y": 194, "w": 672, "h": 38, "pitch": 44, "filas": 2, "padX": 14, "gap": 10, "size": 22},
    "texto": {"x": 24, "y": 286, "w": 672, "h": 166, "pad": 14, "sizes": [30, 28, 26, 24, 22]},
    "carta": {"x": 80, "y": 462, "w": 560, "h": 560, "ret": 480, "retDx": 40, "retDy": 40, "sombra": 10},
    "nombre": {"x": 40, "y": 1030, "w": 640, "h": 76, "sizes": [40, 34, 30, 26]},
    "afin": {"y": 1108, "h": 32, "icono": 28},
    "hint": {"y": 1146, "h": 32},
    "inv": {"x": 24, "y": 1186, "w": 672, "h": 38, "pitch": 44, "size": 22},
    "aviso": {"x": 24, "y": 1184, "w": 672, "h": 86},
    "etiqueta": {"w": 330, "margen": 14, "size": 26},
    "umbral": 120
  },
  "pant": {
    "titulo": {"x": 40, "y": 40, "w": 640, "size": 56, "lines": 2},
    "sub": {"x": 40, "y": 176, "w": 640, "size": 26, "lines": 2},
    "cuerpo": {"x": 24, "y": 252, "w": 672, "h": 636, "pad": 20, "size": 26},
    "metros": {"x": 24, "y": 904, "w": 672, "h": 196},
    "pag": {"y": 1112, "h": 44},
    "btn": {"x": 80, "y": 1168, "w": 560, "h": 96}
  },
  "informe": {"barras": {"x": 24, "y": 252, "w": 672, "h": 212, "row": 50}, "cuerpo": {"y": 478, "h": 410}},
  "suc": {"retrato": 200, "y": 232, "filas": {"y": 520, "h": 104, "n": 4}, "metros": {"y": 960, "h": 196}},
  "elec": {"y": 186, "bloque": 168, "fila": 32, "total": {"y": 862}, "banner": {"y": 1034, "h": 94}},
  "mini": {
    "titulo": {"x": 40, "y": 36, "w": 640, "size": 52},
    "instr": {"x": 24, "y": 110, "w": 672, "h": 196, "pad": 14, "size": 24},
    "barra": {"x": 24, "y": 322, "w": 672, "h": 22},
    "cap": {"x": 24, "y": 350, "w": 672, "size": 22},
    "zona": 392,
    "btn": {"x": 40, "w": 640, "h": 160, "pitch": 180, "size": 26},
    "fb": {"x": 24, "y": 1004, "w": 672, "h": 112, "size": 26},
    "pres": {"pitch": 140, "h": 112, "lab": {"x": 24, "w": 372}, "menos": {"x": 412, "w": 120}, "mas": {"x": 548, "w": 120}, "ok": {"x": 160, "y": 962, "w": 400, "h": 96}},
    "plagio": {"x": 50, "w": 620, "h": 112, "vel": 170, "fin": 1090}
  },
  "menu": {
    "titulo": {"y": 40, "size": 92},
    "sub": {"y": 148, "size": 52},
    "metros": {"x": 24, "y": 240, "w": 672, "h": 196},
    "btn": {"x": 80, "y": 468, "w": 560, "h": 96, "pitch": 108},
    "info": {"y": 1128, "size": 22}
  },
  "logros": {
    "titulo": {"y": 36, "size": 60},
    "barra": {"x": 40, "y": 112, "w": 640, "h": 16},
    "resumen": {"y": 138, "size": 22},
    "lista": {"x": 24, "y": 212, "w": 672, "row": 112, "n": 7},
    "pag": {"y": 1018},
    "volver": {"x": 80, "y": 1118, "w": 560, "h": 96}
  },
  "pausa": {"titulo": {"y": 180, "size": 96}, "btn": {"x": 80, "y": 520, "w": 560, "h": 112, "pitch": 136}, "info": {"y": 330}}
}/*LAYOUT:END*/;
  const L = U.L;
  U.rgb = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) + ";" + ((n >> 8) & 255) + ";" + (n & 255); };
  U.CC = {}; Object.keys(L.col).forEach(k => { U.CC[k] = U.rgb(L.col[k]); });
  // Llamada tolerante a un metodo opcional del objeto (versiones de GDevelop distintas).
  U.c = function (o, m) {
    if (!o || typeof o[m] !== "function") return undefined;
    try { return o[m].apply(o, Array.prototype.slice.call(arguments, 2)); } catch (e) { return undefined; }
  };
  U.getTxt = o => (o && o.__s) || "";
  U.estilo = function (o, opt) {
    if (!opt) return o;
    if (opt.al) U.c(o, "setTextAlignment", opt.al);
    if (opt.col) U.c(o, "setColor", U.CC[opt.col] || opt.col);
    if (opt.z !== undefined) o.setZOrder(opt.z);
    return o;
  };
  U.tam = (o, s) => o.setCharacterSize(Math.max(L.txt.min, s));
  // Estimacion de lineas (para centrar, ajustar y paginar). Mismo criterio en el motor y en la vista previa.
  U.cw = f => (f === "titulo" ? L.txt.cwBebas : L.txt.cwLora);
  U.lh = f => (f === "titulo" ? L.txt.lhB : L.txt.lh);
  U.envolver = function (s, size, w, f) {
    const cap = Math.max(4, Math.floor(w / (size * U.cw(f)))), out = [];
    String(s).split("\n").forEach(par => {
      if (!par.length) { out.push(""); return; }
      let cur = "";
      par.split(" ").forEach(pal => {
        while (pal.length > cap) { if (cur) { out.push(cur); cur = ""; } out.push(pal.slice(0, cap)); pal = pal.slice(cap); }
        if (!cur) cur = pal; else if ((cur + " " + pal).length <= cap) cur += " " + pal; else { out.push(cur); cur = pal; }
      });
      out.push(cur);
    });
    return out;
  };
  // Elige el mayor tamano de 'sizes' cuyo texto cabe en h (px). Devuelve {size, n, alto}.
  U.ajustar = function (s, sizes, w, h, f) {
    let r = null;
    for (let i = 0; i < sizes.length; i++) {
      const n = U.envolver(s, sizes[i], w, f).length, alto = n * sizes[i] * U.lh(f);
      r = { size: sizes[i], n, alto };
      if (alto <= h) break;
    }
    return r;
  };
  U.paginar = function (s, size, w, h, f) {
    const lines = U.envolver(s, size, w, f), per = Math.max(1, Math.floor(h / (size * U.lh(f)))), pages = [];
    for (let i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per));
    // un encabezado que termina en ":" no se queda huerfano al final de la pagina
    for (let i = 0; i < pages.length - 1; i++) { const p = pages[i]; if (p.length > 1 && /:$/.test(p[p.length - 1])) pages[i + 1].unshift(p.pop()); }
    return pages.length ? pages.map(p => p.join("\n")) : [""];
  };
  U.ease = {
    out: t => 1 - Math.pow(1 - U.clamp(t, 0, 1), 3),
    in: t => Math.pow(U.clamp(t, 0, 1), 3),
    io: t => { t = U.clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    back: t => { t = U.clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  // Interpolacion exponencial hacia el objetivo (barras suaves).
  U.suave = function (cur, obj, dt) {
    const n = cur + (obj - cur) * Math.min(1, dt * L.ease.suave);
    return Math.abs(obj - n) < 0.05 ? obj : n;
  };
  // Rectangulo de color plano (objeto Panel, animacion = nombre de color de la paleta).
  U.pnl = function (lista, col, x, y, w, h, z, op) {
    const p = runtimeScene.createObject("Panel");
    U.anim(p, col); U.pset(p, x, y, w, h);
    p.setZOrder(z === undefined ? 10 : z);
    if (op !== undefined && op < 255) p.setOpacity(op);
    if (lista) lista.push(p);
    return p;
  };
  U.pset = function (p, x, y, w, h) {
    if (w < 1 || h < 1) { if (!p.__oc) { p.__oc = true; p.hide(true); } return; }
    if (p.__oc) { p.__oc = false; p.hide(false); }
    p.setPosition(x, y); p.setWidth(w); p.setHeight(h);
  };
  U.ico = function (lista, nombre, x, y, s, z) {
    const o = runtimeScene.createObject("IconoUI");
    U.anim(o, nombre); o.setPosition(x, y); o.setWidth(s); o.setHeight(s); o.setZOrder(z === undefined ? 20 : z);
    if (lista) lista.push(o);
    return o;
  };
  // Boton de color plano (borde + relleno + etiqueta) con estados.
  U.BTN = {
    normal: ["guinda", "dorado", "crema"], hover: ["vino", "dorado_claro", "crema"], down: ["guinda_osc", "crema", "dorado_claro"],
    ok: ["verde", "dorado_claro", "crema"], mal: ["rojo", "crema", "crema"], medio: ["dorado", "crema", "tinta"],
    off: ["guinda_osc", "gris", "gris"], peligro: ["rojo", "dorado_claro", "crema"],
  };
  U.mkBtn = function (lista, x, y, w, h, label, z, opt) {
    z = z || 50;
    const size = (opt && opt.size) || (h >= 90 ? 36 : h >= 70 ? 32 : 28), fobj = (opt && opt.obj) || "TxtBoton";
    const bd = U.pnl(lista, "dorado", x, y, w, h, z), f = U.pnl(lista, "guinda", x + 4, y + 4, w - 8, h - 8, z + 1);
    const t = U.txt(fobj, x + 12, y, size, w - 24, { al: "center", col: "crema", z: z + 2 }); lista.push(t);
    const b = { x, y, w, h, bd, f, s: f, t, size, fuente: fobj === "TxtBoton" ? "titulo" : "cuerpo", est: "", lbl: null, down: false, off: false, fijo: "" };
    U.btnTxt(b, label); U.btnVer(b, "normal");
    return b;
  };
  U.btnTxt = function (b, label) {
    if (b.lbl === label) return;
    b.lbl = label; U.setTxt(b.t, label);
    const n = U.envolver(label, b.size, b.w - 24, b.fuente).length;
    b.t.setPosition(b.x + 12, b.y + Math.max(2, (b.h - n * b.size * L.txt.lhB) / 2));
  };
  U.btnVer = function (b, est) {
    if (b.est === est) return;
    b.est = est;
    const e = U.BTN[est] || U.BTN.normal;
    U.anim(b.f, e[0]); U.anim(b.bd, e[1]); U.c(b.t, "setColor", U.CC[e[2]]);
  };
  U.btnDel = function (b, lista) { [b.bd, b.f, b.t, b.ic].forEach(o => { if (o) U.borrar(o, lista); }); };
  U.btnOcultar = function (b, v) { [b.bd, b.f, b.t, b.ic].forEach(o => { if (o) { try { o.hide(v); } catch (e) { } } }); };
  // Estado visual del boton segun el puntero; devuelve true cuando se SUELTA sobre el (pulsar y soltar).
  U.btnTick = function (b, I, sel) {
    const dentro = U.hit(b, I.mx, I.my);
    if (I.click && dentro) b.down = true;
    let fire = false;
    if (!I.pulsado) { fire = b.down && dentro; b.down = false; }
    const abajo = b.down && I.pulsado && dentro;
    U.btnVer(b, b.off ? "off" : b.fijo ? b.fijo : abajo ? "down" : (dentro || sel) ? "hover" : "normal");
    if (fire && !b.off && U.ev) U.ev("boton");
    return fire && !b.off;
  };
  // Chip de texto (fondo de color + etiqueta). Devuelve el ancho.
  U.chipW = (txt, size) => Math.ceil(String(txt).length * (size || L.hud.chips.size) * L.txt.cwLora) + 2 * L.hud.chips.padX;
  U.chip = function (lista, x, y, txt, col, colTxt, z) {
    const C = L.hud.chips, size = C.size, w = U.chipW(txt, size);
    U.pnl(lista, col, x, y, w, C.h, z);
    const t = U.txt("TxtTexto", x + C.padX, y + (C.h - size * 1.25) / 2, size, 0, { col: colTxt, z: z + 1 }); lista.push(t);
    U.setTxt(t, txt);
    return w;
  };
  // Reparte chips [[txt,col,colTxt],...] en filas; devuelve cuantos no cupieron.
  U.chipsFlujo = function (lista, items, area, z) {
    const C = L.hud.chips; let x = area.x, fila = 0, caben = 0;
    for (let i = 0; i < items.length; i++) {
      const w = U.chipW(items[i][0], C.size);
      if (x + w > area.x + area.w && x > area.x) { fila++; x = area.x; }
      if (fila >= area.filas) break;
      U.chip(lista, x, area.y + fila * C.pitch, items[i][0], items[i][1], items[i][2], z);
      x += w + C.gap; caben++;
    }
    return items.length - caben;
  };
  // Barra horizontal (pista + relleno). set(frac 0..1).
  U.barra = function (lista, x, y, w, h, col, z) {
    const o = { x, y, w, h };
    o.pista = U.pnl(lista, "negro", x, y, w, h, z, 200);
    o.fill = U.pnl(lista, col, x + 2, y + 2, w - 4, h - 4, z + 1);
    o.set = f => U.pset(o.fill, x + 2, y + 2, (w - 4) * U.clamp(f, 0, 1), h - 4);
    o.col = c => U.anim(o.fill, c);
    o.set(0);
    return o;
  };
  // Paginador: botones anterior / siguiente (iconos) y contador. set(i, n) lo muestra solo si n > 1.
  U.pager = function (lista, y, z) {
    const P = L.pant.pag, g = {};
    g.prev = U.mkBtn(lista, 80, y, 110, P.h, "", z);
    g.next = U.mkBtn(lista, 530, y, 110, P.h, "", z);
    g.prev.ic = U.ico(lista, "flecha_izq", 80 + 55 - 18, y + (P.h - 36) / 2, 36, z + 5);
    g.next.ic = U.ico(lista, "flecha_der", 530 + 55 - 18, y + (P.h - 36) / 2, 36, z + 5);
    g.txt = U.txt("TxtTexto", 200, y + (P.h - 28) / 2, 24, 320, { al: "center", col: "crema_osc", z: z }); lista.push(g.txt);
    g.n = 1; g.i = 0;
    g.set = function (i, n) {
      g.i = i; g.n = n;
      const v = n > 1;
      [g.prev, g.next].forEach(b => U.btnOcultar(b, !v));
      g.txt.hide(!v);
      if (v) { U.setTxt(g.txt, "Página " + (i + 1) + " de " + n); g.prev.off = i <= 0; g.next.off = i >= n - 1; }
    };
    g.set(0, 1);
    return g;
  };
  // Medidores de la UAN y de Nayarit: panel con 6 barras animadas. set(dyn, dt).
  U.METROS = [["solv", "Solvencia", "uan"], ["paz", "Paz Social", "uan"], ["aut", "Autonomía", "uan"], ["pre", "Prestigio", "uan"], ["des", "Desarrollo", "nay"], ["seg", "Seguridad", "nay"]];
  U.metrosPanel = function (lista, R, z) {
    const o = { cur: {}, bar: {}, val: {} }, half = R.w / 2;
    U.pnl(lista, "guinda_osc", R.x, R.y, R.w, R.h, z, 230); U.pnl(lista, "dorado", R.x, R.y, R.w, 3, z + 1);
    const hd = (txt, x) => { const t = U.txt("TxtTexto", x, R.y + 10, 22, 300, { col: "dorado_claro", z: z + 2 }); lista.push(t); U.setTxt(t, txt); };
    hd("UNIVERSIDAD (UAN)", R.x + 16); hd("NAYARIT", R.x + half + 16);
    let iu = 0, inn = 0;
    U.METROS.forEach(([k, nom, g]) => {
      const col = g === "uan" ? 0 : 1, row = col ? inn++ : iu++, x = R.x + col * half + 16, y = R.y + 48 + row * 36;
      const lb = U.txt("TxtTexto", x, y, 22, 130, { col: "crema", z: z + 2 }); lista.push(lb); U.setTxt(lb, nom);
      o.bar[k] = U.barra(lista, x + 134, y + 7, 112, 16, g === "uan" ? "dorado" : "azul_cl", z + 2);
      const v = U.txt("TxtTexto", x + 252, y, 22, 50, { col: "crema_osc", z: z + 2 }); lista.push(v); o.val[k] = v;
      o.cur[k] = 0;
    });
    o.set = function (dyn, dt, directo) {
      U.METROS.forEach(([k, , g]) => {
        const obj = (g === "uan" ? dyn.uan : dyn.nay)[k];
        o.cur[k] = directo ? obj : U.suave(o.cur[k], obj, dt);
        o.bar[k].set(o.cur[k] / 100);
        const r = String(Math.round(o.cur[k]));
        if (o.val[k].__s !== r) U.setTxt(o.val[k], r);
      });
    };
    return o;
  };

  // ---- aleatorio / numeros ----
  U.rnd = n => Math.floor(Math.random() * n);
  U.shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = U.rnd(i + 1); const t = r[i]; r[i] = r[j]; r[j] = t; } return r; };
  U.clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ---- almacenamiento ----
  U.lsGet = function (k, def) { try { const v = localStorage.getItem(U.PRE + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
  U.lsSet = function (k, v) { try { localStorage.setItem(U.PRE + k, JSON.stringify(v)); } catch (e) { } };
  U.lsDel = function (k) { try { localStorage.removeItem(U.PRE + k); } catch (e) { } };
  U.leerPartida = function () {
    const d = U.lsGet("partida", null);
    return d && d.ver === 1 && Array.isArray(d.v) && d.v.length === 4 && typeof d.semana === "number" ? d : null;
  };
  U.guardarPartida = d => U.lsSet("partida", d);
  U.borrarPartida = () => U.lsDel("partida");

  // ---- variables de GDevelop (escena y juego) ----
  // Publica un valor en una variable de ESCENA para usarla desde eventos normales.
  U.pub = function (n, v) {
    try {
      const vr = runtimeScene.getVariables().get(n);
      if (typeof v === "number") vr.setNumber(isFinite(v) ? v : 0); else vr.setString(String(v));
    } catch (e) { }
  };
  // Variables GLOBALES del juego (comunican escenas): p.ej. "Modo" = nueva | continuar.
  U.gset = function (n, v) { try { game.getVariables().get(n).setString(String(v)); } catch (e) { } };
  U.gget = function (n) { try { return game.getVariables().get(n).getAsString(); } catch (e) { return ""; } };

  // ---- cambio de escena ----
  U.cambiarEscena = function (nombre) {
    if (S.saliendo) return;
    S.saliendo = true;
    try {
      if (gdjs.evtTools && gdjs.evtTools.runtimeScene && gdjs.evtTools.runtimeScene.replaceScene)
        gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, nombre, true);
      else runtimeScene.requestChange(gdjs.SceneChangeRequest.REPLACE_SCENE, nombre);
    } catch (e) { S.saliendo = false; }
  };

  // ---- calendario: la semana 0 es el lunes 1 de septiembre de 2025 ----
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  U.fecha = function (sem) {
    const d = new Date(Date.UTC(2025, 8, 1 + 7 * Math.max(0, sem | 0)));
    const y = d.getUTCFullYear(), m = d.getUTCMonth();
    return { y, m: m + 1, ym: y + "-" + (m < 9 ? "0" : "") + (m + 1), txt: MESES[m] + " " + y };
  };

  // ---- logros: [id, titulo, descripcion, secreto] ----
  U.LOGROS = [
    ["semestre1", "Primer semestre", "Sobrevive 16 semanas."],
    ["tres_semestres", "Gestión consolidada", "Llega a 48 semanas."],
    ["veterano", "Veterano de la Unidad", "Llega a 96 semanas."],
    ["integro", "Manos limpias", "Integridad altísima."],
    ["corrupto", "Pacto de silencio", "Integridad por los suelos."],
    ["coleccionista", "Archivo secreto", "Ten 3 expedientes a la vez."],
    ["expediente_util", "El papel manda", "Usa un expediente."],
    ["mini_presupuesto", "Tesorero sin cifras rojas", "Gana el reparto de presupuesto."],
    ["mini_prensa", "Cero declaraciones torpes", "Gana la rueda de prensa."],
    ["mini_plagio", "Ojo de lince", "Gana la cacería de plagio."],
    ["mini_consejo", "Mayoría en el Consejo", "Gana la votación del Consejo."],
    ["primer_fin", "Todo termina", "Termina tu primera gestión."],
    ["heredero", "Herencia", "Gobierna como sucesor."],
    ["dinastia", "Dinastía", "Llega al Director #3."],
    ["equilibrio", "Equilibrista", "Stats entre 35 y 65 pasada la semana 32."],
    ["aliado_total", "Aliado incondicional", "Afinidad +5 con un personaje."],
    ["enemigo_total", "Enemigo declarado", "Afinidad -5 con un personaje."],
    ["suerte", "Quien arriesga", "Gana una jugada de azar."],
    ["final_secreto", "Caída especial", "Descubre una caída especial de director.", true],
    ["fin_historia", "Fin de la historia", "Lleva una dinastía hasta el destino de la UAN y de Nayarit."],
    ["destino_renacimiento", "Renacimiento", "Alcanza el destino «Renacimiento».", true],
    ["destino_motor", "Motor regional", "Alcanza el destino «Motor del desarrollo».", true],
    ["destino_gris", "Sobrevivió", "Alcanza el destino gris."],
    ["destino_quiebra", "Rescate y éxodo", "Alcanza el destino de la quiebra.", true],
    ["destino_intervencion", "Rector del Gobernador", "Alcanza el destino de la intervención estatal.", true],
    ["destino_huelga", "Ciclo perdido", "Alcanza el destino de la huelga indefinida.", true],
    ["destino_captura", "Botín político", "Alcanza el destino de la captura total.", true],
    ["destino_torre", "Torre de marfil", "Alcanza el destino de la élite excluyente.", true],
    ["destino_violencia", "Último refugio", "Alcanza el destino de la violencia.", true],
    ["tres_historias", "Memoria larga", "Completa tres historias de la UAN."],
    ["era_mundial", "Año del Mundial", "Gobierna hasta junio de 2026."],
    ["reelegido", "Otro periodo", "Gana una reelección."],
    ["doble_reeleccion", "Inamovible", "Gana dos reelecciones."],
    ["retiro_digno", "Retiro digno", "No te presentes a la reelección."],
    ["brutus", "¿Tú también, Brutus?", "Que te suceda quien conspiró contra ti.", true],
  ];
  U.logros = U.lsGet("logros", {}) || {};
  U.cola = [];            // avisos en pantalla (logros, resultados de azar)
  U.dar = function (id) {
    if (U.logros[id]) return;
    U.logros[id] = true; U.lsSet("logros", U.logros);
    const l = U.LOGROS.find(x => x[0] === id);
    if (l) U.cola.push("Logro: " + l[1] + "\n" + l[2]);
    U.nlogros = (U.nlogros || 0) + 1;
    U.pub("SenalLogro", U.nlogros);
    U.pub("UltimoLogro", l ? l[1] : id);
    if (U.ev) U.ev("logro");
  };

  // ---- dinastia y record ----
  // Meta-estado persistente: 4 medidores de la UAN (solv, paz, aut, pre) y 2 de Nayarit (des, seg).
  U.UAN0 = () => ({ solv: 50, paz: 50, aut: 50, pre: 50 });
  U.NAY0 = () => ({ des: 50, seg: 50 });
  U.dynNueva = () => ({ n: 1, legado: {}, hist: [], cand: {}, afh: {}, dirId: "", ex: null, uan: U.UAN0(), nay: U.NAY0() });
  U.normDyn = function (d) {
    d.uan = Object.assign(U.UAN0(), d.uan || {}); d.nay = Object.assign(U.NAY0(), d.nay || {});
    Object.keys(d.uan).concat(Object.keys(d.nay)).forEach(k => { const o = k in d.uan ? d.uan : d.nay; o[k] = Math.max(0, Math.min(100, +o[k] || 0)); });
    return d;
  };
  U.cargarDyn = function () {
    let d = U.lsGet("dinastia", null);
    if (!d || typeof d.n !== "number" || !d.legado || typeof d.legado !== "object" || !Array.isArray(d.hist)) d = U.dynNueva();
    return U.normDyn(d);
  };
  // Cronica: historias terminadas (destino de la UAN y de Nayarit).
  U.cronica = () => { const c = U.lsGet("cronica", []); return Array.isArray(c) ? c : []; };
  U.addCronica = function (e) { const c = U.cronica(); c.push(e); while (c.length > 30) c.shift(); U.lsSet("cronica", c); };
  U.NOM_METRO = { solv: "Solvencia", paz: "Paz Social", aut: "Autonomía", pre: "Prestigio", des: "Desarrollo", seg: "Seguridad" };
  U.metrosTxt = function (d) {
    return "UAN · Solvencia " + d.uan.solv + " · Paz Social " + d.uan.paz + " · Autonomía " + d.uan.aut + " · Prestigio " + d.uan.pre +
      "\nNayarit · Desarrollo " + d.nay.des + " · Seguridad " + d.nay.seg;
  };
  U.guardarDyn = d => U.lsSet("dinastia", d);
  U.record = function () { try { return parseInt(localStorage.getItem(U.PRE + "record") || "0", 10) || 0; } catch (e) { return 0; } };
  U.setRecord = function (n) { try { localStorage.setItem(U.PRE + "record", String(n)); } catch (e) { } };
}

// ---- Entrada (se lee UNA vez por frame para todos los modulos) ----
{
  const U = S.u, game = runtimeScene.getGame(), inp = game.getInputManager();
  const I = S.in || (S.in = { prevKd: {}, prev: false, primero: true });
  I.mx = inp.getCursorX ? inp.getCursorX() : inp.getMouseX();
  I.my = inp.getCursorY ? inp.getCursorY() : 0;
  I.pulsado = !!inp.isMouseButtonPressed(0);
  I.dt = Math.min(0.25, runtimeScene.getElapsedTime() / 1000);
  // Defensa: la camara de la capa base siempre centrada en el lienzo logico (sin importar el tamano de ventana).
  try { const ly = runtimeScene.getLayer(""); ly.setCameraX(U.W / 2, 0); ly.setCameraY(U.H / 2, 0); } catch (e) { }
  const kd = {}, kp = {};
  U.KEYS.forEach(k => {
    kd[k] = !!inp.isKeyPressed(k);
    // En el primer frame de una escena lo que ya estaba pulsado no cuenta como "nuevo".
    kp[k] = kd[k] && !(I.primero ? true : I.prevKd[k]);
  });
  I.click = I.pulsado && !(I.primero ? true : I.prev);
  I.soltar = !I.pulsado && !I.primero && I.prev;
  I.kd = kd; I.kp = kp;
  I.prevKd = kd; I.prev = I.pulsado; I.primero = false;
}
