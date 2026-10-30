// ============================================================================
// 05 AUDIO — sonido, musica, vibracion, ajustes (localStorage), ranking (Leaderboards de GDevelop)
// y las ventanas de Opciones y Ranking. Se incluye en TODAS las escenas, tras 00_comun.
// Todo es tolerante: si una API no existe (sonido, vibracion, leaderboards) el juego sigue igual.
// Senales para tus propios eventos (variables de ESCENA): SenalSonido + SonidoUltimo (id del sonido),
// MusicaPista, SenalVibracion, SenalRanking, PuntajeSemanas, PuntajeDestino, NombreJugador.
// Si pones la variable de escena SonidosPropios = 1, el motor NO reproduce sonidos ni musica por si mismo
// (solo publica las senales) y tu usas tus propios eventos.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.u.audioListo) {
  S.u.audioListo = true;
  const U = S.u, game = runtimeScene.getGame(), W = U.W, H = U.H, setTxt = U.setTxt;
  const AUD = __AUDIO__;        // manifiesto assets/audio/audio.json (lo inserta build.js)
  const CFG = __CONFIG__;       // src/config.json (lo inserta build.js)
  const AC = CFG.audio || {};
  U.AUD = AUD; U.CFG = CFG;
  // Estado que sobrevive al cambio de escena: cuelga del objeto de juego.
  const G = game.__dirUAN || (game.__dirUAN = { interactuo: false, mus: "", musDeseada: "", musVol: -1, ult: {}, nSnd: 0, nVib: 0, chk: 0, sem: (Date.now() % 2147483647) + 1 });
  const lcg = () => { G.sem = (G.sem * 1103515245 + 12345) % 2147483648; return G.sem / 2147483648; };   // no toca Math.random (el azar del juego)
  const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
  const ST = () => { try { return (typeof gdjs !== "undefined" && gdjs.evtTools && gdjs.evtTools.sound) || null; } catch (e) { return null; } };
  const propios = () => { try { const v = runtimeScene.getVariables().get("SonidosPropios"); return !!(v && typeof v.getAsNumber === "function" && v.getAsNumber() === 1); } catch (e) { return false; } };

  // ---------------- ajustes persistentes ----------------
  const aj = U.aj = Object.assign({ musica: num(AC.volumen_musica, 0.5), efectos: num(AC.volumen_efectos, 0.8), mudo: false, vibracion: true, nombre: "", nombrePedido: false, enviada: "" }, U.lsGet("ajustes", {}) || {});
  aj.musica = U.clamp(num(+aj.musica, 0.5), 0, 1); aj.efectos = U.clamp(num(+aj.efectos, 0.8), 0, 1);
  aj.mudo = !!aj.mudo; aj.vibracion = aj.vibracion !== false; aj.nombre = typeof aj.nombre === "string" ? aj.nombre : "";
  U.guardarAj = () => { U.lsSet("ajustes", aj); U.pub("NombreJugador", aj.nombre); };

  // ---------------- efectos de sonido ----------------
  // opt: {vol: 0..1 (relativo), v: variacion aleatoria del pitch (p.ej. 0.08), pitch, min: ms minimos entre repeticiones}
  U.sonido = function (id, opt) {
    try {
      opt = opt || {};
      G.nSnd++; U.pub("SenalSonido", G.nSnd); U.pub("SonidoUltimo", id);
      const f = AUD.sfx && AUD.sfx[id];
      if (!f || !G.interactuo || propios() || aj.mudo || aj.efectos <= 0) return;
      const now = Date.now();
      if (G.ult[id] && now - G.ult[id] < (opt.min || 70)) return;
      G.ult[id] = now;
      const vol = Math.round(100 * U.clamp(aj.efectos * num(opt.vol, 1), 0, 1));
      let pitch = num(opt.pitch, 1);
      if (opt.v) pitch *= 1 + (lcg() * 2 - 1) * opt.v;
      const st = ST();
      if (st && typeof st.playSound === "function") st.playSound(runtimeScene, f, false, vol, pitch);
      else {
        const sm = typeof runtimeScene.getSoundManager === "function" ? runtimeScene.getSoundManager() : (typeof game.getSoundManager === "function" ? game.getSoundManager() : null);
        if (sm && typeof sm.playSound === "function") sm.playSound(f, false, vol, pitch);
      }
    } catch (e) { }
  };

  // ---------------- musica (canal 1) ----------------
  const volMus = () => (aj.mudo ? 0 : U.clamp(aj.musica * num(AC.musica_ganancia, 0.45), 0, 1));
  U.pista = id => { G.musDeseada = id; };
  U.aplicarVol = function () {
    try {
      const st = ST();
      if (G.mus && st && typeof st.setMusicOnChannelVolume === "function") st.setMusicOnChannelVolume(runtimeScene, 1, Math.round(100 * volMus()));
      G.musVol = volMus();
    } catch (e) { }
  };
  U.pistaAuto = function () {
    const e = S.estado === "pausa" ? (S.estadoPrev || "carta") : S.estado;
    if (e === "destino" || e === "epilogo") return "destino";
    let camp = false; try { camp = typeof S.enCampana === "function" && S.listo && S.enCampana(); } catch (er) { }
    return (e === "eleccion" || e === "sucesion" || camp) ? "campana" : "oficina";
  };
  U.tickAudio = function (I) {
    try {
      // El navegador solo permite audio tras una interaccion: la musica empieza con el primer toque / clic / tecla.
      if (!G.interactuo && (I.pulsado || I.click || Object.keys(I.kp || {}).some(k => I.kp[k]))) G.interactuo = true;
      G.musDeseada = U.pistaAuto();
      U.pub("MusicaPista", G.mus || "");
      if (!G.interactuo || propios()) return;
      const f = AUD.musica && AUD.musica[G.musDeseada], st = ST();
      if (!f || !st || typeof st.playMusicOnChannel !== "function") return;
      const vol = volMus();
      G.chk -= I.dt;
      let reiniciar = G.mus !== G.musDeseada;
      if (!reiniciar && G.chk <= 0) {            // la escena anterior pudo cortar el sonido: se comprueba una vez por segundo
        G.chk = 1;
        if (typeof st.isMusicOnChannelPlaying === "function" && !st.isMusicOnChannelPlaying(runtimeScene, 1)) reiniciar = true;
      }
      if (reiniciar) {
        if (G.mus && typeof st.stopMusicOnChannel === "function") st.stopMusicOnChannel(runtimeScene, 1);
        st.playMusicOnChannel(runtimeScene, f, 1, true, 0, 1);
        G.mus = G.musDeseada; G.chk = 1; G.musVol = vol;
        if (typeof st.fadeMusicVolume === "function") st.fadeMusicVolume(runtimeScene, 1, Math.round(100 * vol), 1.5);
        else if (typeof st.setMusicOnChannelVolume === "function") st.setMusicOnChannelVolume(runtimeScene, 1, Math.round(100 * vol));
        U.pub("MusicaPista", G.mus);
      } else if (Math.abs(G.musVol - vol) > 0.001) U.aplicarVol();
    } catch (e) { }
  };

  // ---------------- vibracion ----------------
  U.vibDisp = () => { try { return typeof navigator !== "undefined" && !!navigator && typeof navigator.vibrate === "function"; } catch (e) { return false; } };
  U.vibrar = function (patron) {
    try {
      G.nVib++; U.pub("SenalVibracion", G.nVib);
      if (!aj.vibracion || !G.interactuo || !U.vibDisp()) return;
      navigator.vibrate(patron);
    } catch (e) { }
  };

  // ---------------- eventos del juego: sonido + vibracion (+ particulas si existe S.fxEvento) ----------------
  const EV = {
    boton: { s: ["boton", { v: 0.05, vol: 0.7 }] },
    arrastre: { s: ["arrastre", { v: 0.1, vol: 0.7, min: 150 }] },
    soltar: { s: ["soltar", { v: 0.1 }], vib: 25 },
    voltear: { s: ["voltear", { v: 0.1, vol: 0.8, min: 120 }] },
    pagina: { s: ["pagina", { v: 0.06 }] },
    sube: { s: ["sube", { v: 0.04, vol: 0.8 }] },
    baja: { s: ["baja", { v: 0.04, vol: 0.8 }] },
    grande: { s: ["golpe", { v: 0.05 }], vib: [40, 50, 40] },
    logro: { s: ["logro", {}], vib: [40, 40, 40, 40, 90] },
    caida: { s: ["golpe", { pitch: 0.8 }], vib: [90, 50, 90, 50, 220] },
    sucesion: { s: ["gong", {}] },
    destino: { s: ["final", {}], vib: [60, 60, 60, 60, 160] },
    eleccion: { s: ["campana", {}] },
    voto: { s: ["voto", { v: 0.06, min: 100 }] },
    eleccion_gana: { s: ["acierto", {}], vib: [50, 40, 50, 40, 120] },
    eleccion_pierde: { s: ["error", {}], vib: [160] },
    acierto: { s: ["acierto", { v: 0.04 }], vib: 30 },
    error: { s: ["error", { v: 0.04 }], vib: [80] },
    tic: { s: ["tic", { v: 0.03, vol: 0.8, min: 250 }] },
  };
  U.ev = function (n, a, b) {
    try {
      const e = EV[n];
      if (e) { if (e.s) U.sonido(e.s[0], e.s[1]); if (e.vib) U.vibrar(e.vib); }
      if (typeof S.fxEvento === "function") S.fxEvento(n, a, b);
    } catch (er) { }
  };

  // ---------------- ranking: Leaderboards de GDevelop ----------------
  U.rank = {
    id(k) { const v = (CFG.leaderboards || {})[k]; return typeof v === "string" && v.trim() && v.indexOf("PEGA_AQUI") < 0 ? v.trim() : ""; },
    api() { try { const LB = typeof gdjs !== "undefined" && gdjs.evtTools && gdjs.evtTools.leaderboards; return LB && typeof LB.savePlayerScore === "function" && typeof LB.displayLeaderboard === "function" ? LB : null; } catch (e) { return null; } },
    hayIds() { return !!(U.rank.id("semanas") || U.rank.id("destino")); },
    // "" si se puede usar la tabla k; si no, el mensaje que se muestra al jugador.
    motivo(k) {
      if (!U.rank.hayIds()) return "El ranking en línea todavía no está configurado.\n\nPara activarlo: crea las dos tablas en GDevelop (Game Dashboard > Leaderboards), copia sus ID y pégalos en src/config.json (campos \"semanas\" y \"destino\"); luego corre node src/build.js. Los pasos están en el README.";
      if (!U.rank.api()) return "El ranking no está disponible en esta versión del juego: falta la extensión Leaderboards en la exportación. Revisa la sección Ranking del README.";
      if (k && !U.rank.id(k)) return "Esta tabla todavía no tiene ID en src/config.json.";
      return "";
    },
    mostrar(k) {
      const m = U.rank.motivo(k);
      if (m) return m;
      try {
        const r = U.rank.api().displayLeaderboard(runtimeScene, U.rank.id(k), true);
        if (r && typeof r.catch === "function") r.catch(function () { });
        U.pub("SenalRanking", (G.nRank = (G.nRank || 0) + 1));
      } catch (e) { return "No se pudo abrir el ranking: " + (e && e.message ? e.message : e); }
      return "";
    },
    enviar(k, score, nombre) {
      if (U.rank.motivo(k)) return false;
      try { U.rank.api().savePlayerScore(runtimeScene, U.rank.id(k), Math.max(0, Math.round(score)), nombre); return true; } catch (e) { return false; }
    },
    // Se llama al cerrar una historia: semanas totales y calidad del destino (promedio de los 6 medidores x10).
    enviarHistoria(semanas, calidad, destino) {
      if (U.rank.motivo("")) return false;
      const lim = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_").replace(/[^\w-]/g, "");
      const nm = lim(U.pedirNombre(false)).slice(0, 14) || "Director";
      U.pub("PuntajeSemanas", semanas); U.pub("PuntajeDestino", calidad);
      const a = U.rank.enviar("semanas", semanas, nm);
      const b = U.rank.enviar("destino", calidad, (nm + "-" + lim(destino)).slice(0, 30));
      return a || b;
    },
  };
  // Nombre del jugador: prompt() del navegador (se pide una sola vez, o cuando forzar = true). Si no hay prompt()
  // o se cancela, se usa un nombre automatico; se puede cambiar desde Opciones.
  U.pedirNombre = function (forzar) {
    if (!forzar && (aj.nombrePedido || (aj.nombre && !forzar))) return aj.nombre;
    if (!forzar && U.rank.motivo("")) return aj.nombre;     // sin ranking disponible todavia no se pregunta
    let n = "";
    try { if (typeof prompt === "function") { const r = prompt("Nombre para el ranking (máx. 14 letras):", aj.nombre || ""); if (typeof r === "string") n = r; } } catch (e) { }
    n = n.replace(/[^\wÁÉÍÓÚÜÑáéíóúüñ .\-]/g, "").trim().slice(0, 14);
    if (!n) n = aj.nombre || ("Director" + (1000 + Math.floor(lcg() * 9000)));
    aj.nombre = n; aj.nombrePedido = true; U.guardarAj();
    return n;
  };

  // ---------------- ventanas modales: Opciones y Ranking ----------------
  // Cada una devuelve {lista, tick(I) -> true al cerrar, destroy()}. z0 = capa base (Menu 300, Juego 920).
  const cierra = I => I.kp[27] || I.kp[13];
  U.modalOpciones = function (z0) {
    const A = [], M = { lista: A };
    U.pnl(A, "guinda_osc", 0, 0, W, H, z0);
    setTxt(U.mkTxt(A, "TxtTitulo", 40, 36, 60, W - 80, { al: "center", col: "dorado_claro", z: z0 + 10 }), "OPCIONES");
    const fila = (y, titulo, key) => {
      const lb = U.mkTxt(A, "TxtTexto", 40, y + 14, 30, 240, { col: "crema", z: z0 + 10 }); setTxt(lb, titulo);
      const v = U.mkTxt(A, "TxtTexto", 270, y + 16, 28, 110, { col: "dorado_claro", z: z0 + 10, al: "right" });
      const bar = U.barra(A, 40, y + 80, 640, 22, "dorado", z0 + 5);
      const menos = U.mkBtn(A, 400, y, 120, 64, "-", z0 + 10, { size: 40 }), mas = U.mkBtn(A, 560, y, 120, 64, "+", z0 + 10, { size: 40 });
      return { key, v, bar, menos, mas };
    };
    const filas = [fila(150, "Música", "musica"), fila(280, "Efectos", "efectos")];
    const bMudo = U.mkBtn(A, 80, 430, 560, 84, "", z0 + 10, { size: 32 });
    const bVib = U.mkBtn(A, 80, 540, 560, 84, "", z0 + 10, { size: 32 });
    const tNom = U.mkTxt(A, "TxtTexto", 40, 664, 26, W - 80, { al: "center", col: "crema", z: z0 + 10 });
    const bNom = U.mkBtn(A, 80, 710, 560, 84, "Cambiar nombre", z0 + 10, { size: 32 });
    const tAy = U.mkTxt(A, "TxtTexto", 40, 830, 22, W - 80, { al: "center", col: "crema_osc", z: z0 + 10 });
    setTxt(tAy, "Los cambios se guardan solos.\nLa música empieza tras tu primer toque (regla del navegador).");
    const bVol = U.mkBtn(A, 80, 1118, 560, 96, "Volver", z0 + 10);
    M.tick = function (I) {
      filas.forEach(f => {
        let d = 0;
        if (U.btnTick(f.menos, I)) d = -0.1;
        if (U.btnTick(f.mas, I)) d = 0.1;
        if (d) {
          aj[f.key] = Math.round(U.clamp(aj[f.key] + d, 0, 1) * 10) / 10;
          U.guardarAj(); U.aplicarVol();
          if (f.key === "efectos") U.sonido("sube", { min: 0 });
        }
        const r = Math.round(aj[f.key] * 100) + " %";
        if (f.v.__s !== r) setTxt(f.v, r);
        f.bar.set(aj[f.key]);
      });
      U.btnTxt(bMudo, "Sonido: " + (aj.mudo ? "SILENCIADO" : "ACTIVADO"));
      U.btnTxt(bVib, "Vibración: " + (aj.vibracion ? "SÍ" : "NO") + (U.vibDisp() ? "" : " (no disponible aquí)"));
      const nt = "Nombre en el ranking: " + (aj.nombre || "(sin definir)");
      if (tNom.__s !== nt) setTxt(tNom, nt);
      if (U.btnTick(bMudo, I)) { aj.mudo = !aj.mudo; U.guardarAj(); U.aplicarVol(); }
      if (U.btnTick(bVib, I)) { aj.vibracion = !aj.vibracion; U.guardarAj(); if (aj.vibracion) U.vibrar(40); }
      if (U.btnTick(bNom, I)) U.pedirNombre(true);
      return !!(U.btnTick(bVol, I) || cierra(I));
    };
    M.destroy = () => U.limpiar(A);
    return M;
  };
  U.modalRanking = function (z0) {
    const A = [], M = { lista: A };
    U.pnl(A, "guinda_osc", 0, 0, W, H, z0);
    setTxt(U.mkTxt(A, "TxtTitulo", 40, 36, 60, W - 80, { al: "center", col: "dorado_claro", z: z0 + 10 }), "RANKING");
    const info = U.mkTxt(A, "TxtTexto", 40, 140, 26, W - 80, { al: "center", col: "crema", z: z0 + 10 });
    setTxt(info, U.rank.motivo("") || "Compara tu dinastía con la de otros jugadores.\nElige una tabla.");
    const b1 = U.mkBtn(A, 80, 760, 560, 96, "Semanas de la dinastía", z0 + 10, { size: 34 });
    const b2 = U.mkBtn(A, 80, 880, 560, 96, "Destino", z0 + 10, { size: 34 });
    const bVol = U.mkBtn(A, 80, 1118, 560, 96, "Volver", z0 + 10);
    M.tick = function (I) {
      if (U.btnTick(b1, I)) setTxt(info, U.rank.mostrar("semanas") || "Abriendo la tabla «Semanas de la dinastía»...");
      if (U.btnTick(b2, I)) setTxt(info, U.rank.mostrar("destino") || "Abriendo la tabla «Destino»...");
      return !!(U.btnTick(bVol, I) || cierra(I));
    };
    M.destroy = () => U.limpiar(A);
    return M;
  };
  U.pub("NombreJugador", aj.nombre);
}
if (!S.saliendo) S.u.tickAudio(S.in);
