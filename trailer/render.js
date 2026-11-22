// Exporta trailer.html a MP4 (1080x1920, 30 fps) con la canción de esta carpeta.
// Uso:   node render.js                     -> fin_de_la_gestion_trailer_vertical.mp4
//        node render.js --frames 2,8,14     -> miniaturas JPG en _frames/ (para revisar momentos sueltos)
// Requiere Chrome, ffmpeg y Node 22 o superior (usa fetch y WebSocket integrados). No instala nada.
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const DIR = __dirname;
const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333, W = 1080, H = 1920, FPS = 30;
// Si el MP4 anterior está abierto en un reproductor, Windows no deja sobrescribirlo: se usa _v2, _v3...
function salidaLibre() {
  for (let i = 1; i < 50; i++) {
    const f = path.join(DIR, "fin_de_la_gestion_trailer_vertical" + (i > 1 ? "_v" + i : "") + ".mp4");
    if (!fs.existsSync(f)) return f;
    try { fs.closeSync(fs.openSync(f, "r+")); return f; } catch (e) { console.log("ocupado, pruebo otro nombre: " + path.basename(f)); }
  }
  throw new Error("No encontré un nombre de salida libre");
}
const mp3 = fs.readdirSync(DIR).filter(f => f.toLowerCase().endsWith(".mp3")).map(f => path.join(DIR, f))[0];
const iF = process.argv.indexOf("--frames");
const sueltos = iF > 0 ? process.argv[iF + 1].split(",").map(Number) : null;
const dormir = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "fg-trailer-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=" + PORT, "--user-data-dir=" + perfil, "--hide-scrollbars",
    "--window-size=" + W + "," + H, "--force-device-scale-factor=1", "--no-first-run", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
  let ffmpeg = null;
  try {
    // 1) conectar con Chrome (protocolo DevTools)
    let pagina = null;
    for (let i = 0; i < 60 && !pagina; i++) {
      try { pagina = (await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json()).find(x => x.type === "page"); } catch (e) { await dormir(250); }
    }
    if (!pagina) throw new Error("No pude conectar con Chrome");
    const ws = new WebSocket(pagina.webSocketDebuggerUrl);
    await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });
    let id = 0; const espera = new Map(), eventos = new Map();
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && espera.has(m.id)) { const [ok, mal] = espera.get(m.id); espera.delete(m.id); m.error ? mal(new Error(m.error.message)) : ok(m.result); }
      else if (m.method && eventos.has(m.method)) { eventos.get(m.method)(m.params); eventos.delete(m.method); }
    };
    const cdp = (method, params = {}) => new Promise((ok, mal) => { espera.set(++id, [ok, mal]); ws.send(JSON.stringify({ id, method, params })); });
    const evento = method => new Promise(ok => eventos.set(method, ok));

    // 2) abrir el tráiler en modo exportación
    await cdp("Page.enable");
    await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const cargada = evento("Page.loadEventFired");
    await cdp("Page.navigate", { url: pathToFileURL(path.join(DIR, "trailer.html")).href + "?render" });
    await cargada;
    const listo = await cdp("Runtime.evaluate", { expression: "window.listo", awaitPromise: true, returnByValue: true });
    if (listo.exceptionDetails) throw new Error("Error en trailer.html: " + JSON.stringify(listo.exceptionDetails));
    const cuadro = async (t, extra) => {
      const r = await cdp("Runtime.evaluate", { expression: "seek(" + t + ")", returnByValue: true });
      if (r.exceptionDetails) throw new Error("Error en t=" + t + ": " + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
      const s = await cdp("Page.captureScreenshot", Object.assign({ format: "jpeg", quality: 94 }, extra || {}));
      return Buffer.from(s.data, "base64");
    };

    if (sueltos) {
      // 3a) miniaturas de momentos sueltos
      const out = path.join(DIR, "_frames"); fs.mkdirSync(out, { recursive: true });
      for (const t of sueltos) {
        const buf = await cuadro(t, { quality: 82, clip: { x: 0, y: 0, width: W, height: H, scale: 0.25 } });
        fs.writeFileSync(path.join(out, "f_" + t.toFixed(2).padStart(5, "0") + ".jpg"), buf);
      }
      console.log("miniaturas: " + sueltos.length);
    } else {
      // 3b) todos los cuadros -> ffmpeg (video + canción con fundido de salida)
      const FIN = (await cdp("Runtime.evaluate", { expression: "FIN", returnByValue: true })).result.value;   // duración definida en trailer.html
      const SALIDA = salidaLibre();
      const total = Math.round(FIN * FPS);
      ffmpeg = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "pipe:0",
        "-t", String(FIN), "-i", mp3,
        "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p",
        "-af", "afade=t=in:st=0:d=0.15,afade=t=out:st=" + (FIN - 2.4) + ":d=2.4",
        "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-r", String(FPS),
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", SALIDA], { stdio: ["pipe", "inherit", "inherit"] });
      const fin = new Promise(ok => ffmpeg.on("close", ok));
      let roto = false; ffmpeg.stdin.on("error", () => { roto = true; });
      const t0 = Date.now();
      for (let i = 0; i < total; i++) {
        if (roto) throw new Error("ffmpeg se cerró antes de tiempo (revisa el mensaje de arriba)");
        const buf = await cuadro(i / FPS);
        if (!ffmpeg.stdin.write(buf)) await new Promise(ok => ffmpeg.stdin.once("drain", ok));
        if (i % 150 === 0) console.log("cuadro " + i + "/" + total + "  (" + ((Date.now() - t0) / 1000).toFixed(0) + " s)");
      }
      ffmpeg.stdin.end();
      const codigo = await fin;
      console.log(codigo === 0 ? "LISTO " + SALIDA : "ffmpeg terminó con error " + codigo);
    }
    ws.close();
  } catch (e) {
    console.log("ERROR " + e.message);
    if (ffmpeg) try { ffmpeg.kill(); } catch (x) {}
    process.exitCode = 1;
  } finally {
    chrome.kill();
    await dormir(600);
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {}
  }
})();
