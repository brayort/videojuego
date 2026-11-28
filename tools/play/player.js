// Reproductor del juego en el navegador (lo sirve tools/play/server.js).
// Ejecuta el MOTOR REAL (los eventos JavaScript de game.json) con objetos simulados, igual que tools/sim/sim.js y
// tools/dump_screens.js, y dibuja el resultado en un canvas con los sprites y fuentes de assets/. La logica de
// dibujo replica tools/preview_layout.py (mismas reglas de orden, escala, rotacion, opacidad y ajuste de texto).
// Recarga en caliente: el servidor avisa por SSE (/events) cuando cambia src/ y se reinicia la escena actual.
// Este mismo archivo se usa en PRODUCCION (npm run prod lo copia a public/): alli la pagina define window.__PROD y el
// reproductor arranca sin barra de herramientas, sin lint, sin depuracion y sin recarga en caliente.
(function () {
  "use strict";
  const W = 720, H = 1280;
  const $ = id => document.getElementById(id);
  const cv = $("lienzo"), ctx = cv.getContext("2d");
  // Produccion: public/index.html define window.__PROD = { version, mp3 }. Las rutas son relativas para que funcione en una subcarpeta.
  const PROD = window.__PROD || null, BASE = PROD ? "" : "/";

  // ---------------- estado del reproductor ----------------
  let juego = null, versionCargada = -1, escena = null, actual = "Menu", cambio = null, cargando = false, conError = false;
  const layouts = {}, gvars = {}, imgs = new Map(), fuentes = new Set(), medidas = new Map();
  const entrada = { mouse: false, cx: 0, cy: 0, keys: {} }, liberar = { mouse: false, keys: [] };
  let orden = 0, ultimo = 0;
  const opciones = { depuracion: true, continuar: true };
  try { Object.assign(opciones, JSON.parse(localStorage.getItem("uan_play_opc") || "{}")); } catch (e) { }
  if (PROD) { opciones.depuracion = false; opciones.continuar = false; }

  // ---------------- API de GDevelop simulada (sonido, ranking) ----------------
  let musica = null;
  // Safari en iPhone no reproduce .ogg: en produccion se usan los .mp3 que genera npm run prod (si hay ffmpeg).
  const sinOgg = !!(PROD && PROD.mp3) && !document.createElement("audio").canPlayType('audio/ogg; codecs="vorbis"');
  // Archivo unico (npm run html): los recursos vienen dentro de la pagina como data: URI, indexados por su ruta.
  const incrustado = f => PROD && PROD.archivos && PROD.archivos[f];
  const rutaAudio = n => incrustado(n) || BASE + encodeURI(sinOgg ? n.replace(/\.ogg$/i, ".mp3") : n);
  // Si el navegador rechazo la musica (aun no habia un toque), se reintenta en el siguiente toque o tecla. Al ocultar la
  // pestana o bloquear el telefono se pausa, y vuelve al regresar.
  let pausadaPorOculta = false;
  const despertarAudio = () => { if (musica && musica.paused && !document.hidden) musica.play().catch(() => { }); };
  window.addEventListener("pointerdown", despertarAudio, true); window.addEventListener("keydown", despertarAudio, true);
  document.addEventListener("visibilitychange", () => {
    if (!musica) return;
    if (document.hidden) { pausadaPorOculta = !musica.paused; musica.pause(); }
    else if (pausadaPorOculta) { pausadaPorOculta = false; musica.play().catch(() => { }); }
  });
  const sonar = (n, vol, pitch, loop) => { try { const a = new Audio(rutaAudio(n)); a.volume = Math.max(0, Math.min(1, vol / 100)); a.playbackRate = pitch || 1; a.loop = !!loop; a.play().catch(() => { }); return a; } catch (e) { return null; } };
  window.gdjs = { evtTools: {
    runtimeScene: { replaceScene(sc, nombre) { cambio = nombre; } },
    sound: {
      playSound(sc, n, loop, vol, pitch) { sonar(n, vol, pitch, loop); },
      playMusicOnChannel(sc, n, ch, loop, vol, pitch) { if (musica) musica.pause(); musica = sonar(n, vol, pitch, loop); },
      stopMusicOnChannel() { if (musica) musica.pause(); musica = null; },
      setMusicOnChannelVolume(sc, ch, v) { if (musica) musica.volume = Math.max(0, Math.min(1, v / 100)); },
      isMusicOnChannelPlaying() { return !!musica && !musica.paused; },
      fadeMusicVolume(sc, ch, v) { if (musica) musica.volume = Math.max(0, Math.min(1, v / 100)); },
    },
    leaderboards: { savePlayerScore() { }, displayLeaderboard() { return Promise.resolve(); } },
  } };

  // ---------------- objetos y escena simulados (mismos que dump_screens.js) ----------------
  const mkVar = (map, n) => ({ setNumber(v) { map[n] = v; }, setString(v) { map[n] = v; }, getAsString() { return String(map[n] === undefined ? "" : map[n]); } });
  const gm = {
    getInputManager() { return { getCursorX: () => entrada.cx, getCursorY: () => entrada.cy, isMouseButtonPressed: () => entrada.mouse, isKeyPressed: k => !!entrada.keys[k] }; },
    getGameResolutionWidth: () => W, getGameResolutionHeight: () => H,
    getVariables() { return { get: n => mkVar(gvars, n) }; },
  };
  const animImg = (def, nombre) => { const a = (def.animations || []).find(x => x.name === nombre); return a ? a.directions[0].sprites[0].image : null; };
  const primeraImg = def => { const a = (def.animations || [])[0]; return a ? a.directions[0].sprites[0].image : null; };
  const tam = f => { const i = f && imgs.get(f); return i ? [i.naturalWidth, i.naturalHeight] : [100, 100]; };
  function mkObj(nombre, sc) {
    const def = sc.L.defs[nombre], esTxt = def.type === "TextObject::Text";
    const o = {
      name: nombre, def, tipo: esTxt ? "text" : "sprite", orden: orden++, deleted: false, hidden: false, x: 0, y: 0, w: null, h: null, ang: 0, op: 255, z: 0,
      anim: null, txt: "", size: def.characterSize || 20, wrap: 0, al: def.textAlignment || "left", col: (def.content && def.content.color) || "255;255;255", font: esTxt ? def.font : "",
    };
    const chk = () => { if (o.deleted) throw new Error("se usa un objeto ya borrado: " + nombre); };
    const nat = () => tam(o.anim ? animImg(def, o.anim) : primeraImg(def));
    Object.assign(o, {
      setText(s) { chk(); if (typeof s !== "string") throw new Error("el texto no es string: " + nombre); o.txt = s; }, getText: () => o.txt,
      setCharacterSize(s) { chk(); o.size = s; }, setWrapping(v) { chk(); o.wrapOn = v; }, setWrappingWidth(w) { chk(); o.wrap = w; },
      setTextAlignment(a) { chk(); o.al = a; }, setColor(c) { chk(); o.col = c; },
      setPosition(x, y) { chk(); if (!isFinite(x) || !isFinite(y)) throw new Error("posicion NaN: " + nombre); o.x = x; o.y = y; },
      setAnimationName(a) { chk(); o.anim = a; }, hasAnimationNamed(a) { return !!animImg(def, a); },
      setOpacity(v) { chk(); o.op = v; }, setZOrder(z) { chk(); o.z = z; }, getZOrder: () => o.z, setAngle(a) { chk(); o.ang = a; },
      getWidth() { return o.w !== null ? o.w : nat()[0]; }, getHeight() { return o.h !== null ? o.h : nat()[1]; },
      setWidth(w) { chk(); if (!isFinite(w) || w < 0) throw new Error("ancho invalido " + nombre + " " + w); o.w = w; },
      setHeight(h) { chk(); if (!isFinite(h) || h < 0) throw new Error("alto invalido " + nombre + " " + h); o.h = h; },
      hide(v) { chk(); o.hidden = !!v; },
      deleteFromScene(s) { if (o.deleted) throw new Error("objeto borrado dos veces: " + nombre); o.deleted = true; s.objs.delete(o); },
    });
    return o;
  }
  function mkScene(nombre) {
    const L = layouts[nombre], vars = {};
    if (!L) throw new Error("la escena " + nombre + " no existe");
    L.vars.forEach(v => { vars[v.name] = v.value; });
    return {
      nombre, L, objs: new Set(), el: 16.6, vars,
      createObject(n) { if (!L.defs[n]) throw new Error("objeto desconocido " + n + " en " + nombre); const o = mkObj(n, this); this.objs.add(o); return o; },
      getGame() { return gm; }, getElapsedTime() { return this.el; }, getLayer() { return { setCameraX() { }, setCameraY() { } }; },
      getVariables() { return { get: n => mkVar(vars, n) }; },
    };
  }

  // ---------------- carga de game.json, imagenes y fuentes ----------------
  const recoger = (evs, out) => { evs.forEach(e => { if (e.type.endsWith("JsCode")) out.push(e.inlineCode); if (e.events) recoger(e.events, out); }); return out; };
  const familia = ruta => ruta.split("/").pop().replace(/\.[^.]+$/, "");
  const cargarImg = f => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = incrustado(f) || BASE + encodeURI(f); });
  const progreso = (n, total) => { const b = $("cargaBarra"); if (b) b.style.width = Math.round(100 * n / Math.max(1, total)) + "%"; };   // barra de carga (solo existe en produccion)
  async function prepararAssets(g) {
    const rutas = new Set(), tipos = new Set();
    g.layouts.forEach(l => l.objects.forEach(o => {
      (o.animations || []).forEach(a => a.directions.forEach(d => d.sprites.forEach(s => rutas.add(s.image))));
      if (o.type === "TextObject::Text" && o.font) tipos.add(o.font);
    }));
    imgs.clear(); medidas.clear();
    (g.prodOmitir || []).forEach(f => rutas.delete(f));   // produccion: sprites que game.json nombra pero aun no existen (ver tools/play/prod.js)
    let hechas = 0;
    await Promise.all([...rutas].map(async f => { const i = await cargarImg(f); if (i) imgs.set(f, i); progreso(++hechas, rutas.size); }));
    await Promise.all([...tipos].filter(f => !fuentes.has(f)).map(async f => {
      try { const ff = new FontFace(familia(f), "url(" + (incrustado(f) || BASE + encodeURI(f)) + ")"); await ff.load(); document.fonts.add(ff); fuentes.add(f); } catch (e) { console.warn("fuente no cargada", f, e); }
    }));
    return { imagenes: imgs.size, fuentes: fuentes.size };
  }
  function montar(g) {
    Object.keys(layouts).forEach(k => delete layouts[k]);
    g.layouts.forEach(l => {
      const defs = {}; l.objects.forEach(o => { defs[o.name] = o; });
      let codigos = recoger(l.events, []);
      if (opciones.depuracion) codigos = codigos.map(c => c.split('"debug":false').join('"debug":true'));   // panel F2 de src/js/45_debug.js
      layouts[l.name] = { fns: codigos.map(c => new Function("runtimeScene", "objects", c)), defs, vars: l.variables };
    });
    Object.keys(gvars).forEach(k => delete gvars[k]);
    g.variables.forEach(v => { gvars[v.name] = String(v.value); });
  }

  // ---------------- recarga en caliente ----------------
  async function pedirJuego() {
    if (PROD && PROD.juego) return PROD.juego;   // archivo unico: sin servidor no hay fetch (file://)
    for (let i = 0; i < 6; i++) { try { const r = await fetch(PROD ? "game.json?v=" + PROD.version : "/game.json", { cache: PROD ? "default" : "no-store" }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); } catch (e) { await new Promise(ok => setTimeout(ok, 300)); } }
    throw new Error("no se pudo leer game.json del servidor");
  }
  async function recargar(version, primera) {
    if (cargando) return; cargando = true;
    try {
      const nombre = actual, seguir = !primera && opciones.continuar && nombre === "Juego";
      const g = await pedirJuego(); await prepararAssets(g); montar(g); juego = g; versionCargada = version;
      if (primera) { actual = "Menu"; } else if (seguir && localStorage.getItem("directorUAN_partida")) gvars.Modo = "continuar";
      escena = mkScene(actual); cambio = null; conError = false; $("error").hidden = true;
      if ($("info")) $("info").textContent = primera ? "Listo." : "Recargado: " + new Date().toLocaleTimeString("es-MX") + " (escena " + actual + ")";
      if ($("carga")) $("carga").hidden = true;
    } catch (e) { mostrarError(e); }
    cargando = false;
  }
  function mostrarError(e) {
    conError = true; console.error(e);
    if (PROD) { if ($("carga")) $("carga").hidden = true; $("error").hidden = false; $("error").textContent = "Algo falló en el juego.\nRecarga la página para continuar: tu partida se guarda sola en cada carta."; return; }
    $("error").hidden = false; $("error").textContent = "Error en el juego (se reintenta al guardar el siguiente cambio):\n\n" + (e && e.stack ? e.stack.split("\n").slice(0, 6).join("\n") : String(e));
  }
  function pintarEstado(m) {
    $("punto").className = m.ok ? (m.lint.errores ? "mal" : "bien") : "mal";
    $("estado").textContent = (m.ok ? "v" + m.version + " · " : "BUILD FALLÓ · ") + m.hora;
    $("lintResumen").textContent = m.lint.errores + " errores · " + m.lint.avisos + " avisos";
    $("lintResumen").className = m.lint.errores ? "mal" : "";
    $("lintLista").textContent = m.ok ? (m.lint.items.join("\n") || "Sin errores ni avisos.") : m.msg;
    if (!m.ok) { $("error").hidden = false; $("error").textContent = m.msg; }
  }
  function conectar() {
    const es = new EventSource("/events");
    es.onmessage = ev => {
      const m = JSON.parse(ev.data); pintarEstado(m);
      if (m.ok && m.version > 0 && m.version !== versionCargada) recargar(m.version, versionCargada < 0);
    };
    es.onerror = () => { $("estado").textContent = "Sin conexión con el servidor (reintentando)…"; $("punto").className = "mal"; };
  }

  // ---------------- dibujo (misma logica que tools/preview_layout.py) ----------------
  const rgb = c => "rgb(" + String(c).split(";").map(v => Math.max(0, Math.min(255, +v || 0))).join(",") + ")";
  function medida(fuente) {
    let m = medidas.get(fuente);
    if (!m) { ctx.font = fuente; const t = ctx.measureText("Hg"); m = { asc: t.fontBoundingBoxAscent || 0, lh: (t.fontBoundingBoxAscent || 0) + (t.fontBoundingBoxDescent || 0) || 1 }; medidas.set(fuente, m); }
    return m;
  }
  function lineas(texto, ancho) {
    const out = [];
    texto.split("\n").forEach(par => {
      if (!par) { out.push(""); return; }
      let cur = "";
      par.split(" ").forEach(pal => { const prueba = cur ? cur + " " + pal : pal; if (!cur || ctx.measureText(prueba).width <= ancho) cur = prueba; else { out.push(cur); cur = pal; } });
      out.push(cur);
    });
    return out;
  }
  // En produccion el lienzo se dibuja a la resolucion real de la pantalla (hasta 2x) para que el texto se vea nitido en
  // telefonos y monitores grandes; las coordenadas del juego siguen siendo 720 x 1280.
  let esc = 1;
  function ajustar() {
    const r = cv.getBoundingClientRect(); if (!r.height) return;
    const e = Math.round(Math.max(1, Math.min(2, r.height * (window.devicePixelRatio || 1) / H)) * 4) / 4;
    if (e !== esc) { esc = e; cv.width = W * esc; cv.height = H * esc; }
  }
  function dibujar() {
    ctx.setTransform(esc, 0, 0, esc, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    if (!escena) return;
    const objs = [...escena.objs].filter(o => !o.deleted && !o.hidden && o.op > 0).sort((a, b) => a.z - b.z || a.orden - b.orden);
    for (const o of objs) {
      ctx.globalAlpha = Math.min(1, o.op / 255);
      if (o.tipo === "sprite") {
        const f = (o.anim && animImg(o.def, o.anim)) || primeraImg(o.def), im = f && imgs.get(f); if (!im) continue;
        const w = o.w !== null ? o.w : im.naturalWidth, h = o.h !== null ? o.h : im.naturalHeight; if (w < 1 || h < 1) continue;
        ctx.imageSmoothingEnabled = o.name !== "Panel";
        if (o.ang) { ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.rotate(o.ang * Math.PI / 180); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
        else ctx.drawImage(im, o.x, o.y, w, h);
      } else {
        if (!o.txt || !o.txt.trim()) continue;
        const fuente = o.size + 'px "' + (o.font ? familia(o.font) : "sans-serif") + '", sans-serif', m = medida(fuente);
        ctx.font = fuente; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"; ctx.fillStyle = rgb(o.col);
        const ancho = o.wrap || 0, ls = ancho ? lineas(o.txt, ancho) : o.txt.split("\n");
        ls.forEach((ln, i) => {
          const lw = ctx.measureText(ln).width, dx = ancho ? (o.al === "center" ? (ancho - lw) / 2 : o.al === "right" ? ancho - lw : 0) : 0;
          ctx.fillText(ln, o.x + dx, o.y + i * m.lh + m.asc);
        });
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------------- bucle ----------------
  function cuadro(t) {
    requestAnimationFrame(cuadro);
    const dt = Math.min(100, Math.max(1, t - (ultimo || t))); ultimo = t;
    if (escena && !cargando && !conError) {
      escena.el = dt;
      try { layouts[actual].fns.forEach(fn => fn(escena)); }
      catch (e) { mostrarError(e); }
      if (liberar.mouse) { entrada.mouse = false; liberar.mouse = false; }
      liberar.keys.forEach(k => { delete entrada.keys[k]; }); liberar.keys.length = 0;
      if (cambio && !conError) { try { escena = mkScene(cambio); actual = cambio; } catch (e) { mostrarError(e); } cambio = null; }
    }
    dibujar();
  }

  // ---------------- entrada ----------------
  const aJuego = e => { const r = cv.getBoundingClientRect(); entrada.cx = (e.clientX - r.left) * W / r.width; entrada.cy = (e.clientY - r.top) * H / r.height; };
  cv.addEventListener("pointerdown", e => { aJuego(e); entrada.mouse = true; liberar.mouse = false; cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener("pointermove", e => { aJuego(e); });
  cv.addEventListener("pointerup", e => { aJuego(e); liberar.mouse = true; });
  cv.addEventListener("pointercancel", () => { liberar.mouse = true; });
  window.addEventListener("keydown", e => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "")) return;
    entrada.keys[e.keyCode] = true; if ([32, 37, 38, 39, 40, 113].includes(e.keyCode)) e.preventDefault();
  });
  window.addEventListener("keyup", e => { liberar.keys.push(e.keyCode); });
  window.addEventListener("blur", () => { entrada.keys = {}; entrada.mouse = false; });

  if (PROD) cv.addEventListener("contextmenu", e => e.preventDefault());   // sin menu al mantener pulsado en el telefono

  // ---------------- arranque en produccion (sin barra, sin servidor de desarrollo) ----------------
  if (PROD) {
    ajustar(); window.addEventListener("resize", ajustar);
    requestAnimationFrame(cuadro);
    recargar(1, true);
    return;
  }

  // ---------------- barra de herramientas ----------------
  const guardarOpc = () => { try { localStorage.setItem("uan_play_opc", JSON.stringify(opciones)); } catch (e) { } };
  const ir = (nombre, modo) => { if (!layouts[nombre]) return; if (modo) gvars.Modo = modo; conError = false; $("error").hidden = true; escena = mkScene(nombre); actual = nombre; cambio = null; };
  $("bMenu").onclick = () => ir("Menu");
  $("bNueva").onclick = () => ir("Juego", "nueva");
  $("bBorrar").onclick = () => {
    if (!confirm("¿Borrar el guardado del navegador (partida, dinastía, crónica, logros)?")) return;
    Object.keys(localStorage).filter(k => k.indexOf("directorUAN_") === 0).forEach(k => localStorage.removeItem(k)); ir("Menu");
  };
  $("bLint").onclick = () => { $("lint").hidden = !$("lint").hidden; };
  $("oCont").checked = opciones.continuar; $("oDebug").checked = opciones.depuracion;
  $("oCont").onchange = () => { opciones.continuar = $("oCont").checked; guardarOpc(); };
  $("oDebug").onchange = () => { opciones.depuracion = $("oDebug").checked; guardarOpc(); if (juego) { montar(juego); ir(actual); } };

  window.__play = { get escena() { return escena; }, get actual() { return actual; }, entrada };   // para pruebas y depuracion desde la consola
  requestAnimationFrame(cuadro);
  conectar();
})();
