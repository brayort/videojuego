// Reproductor web con recarga en caliente (hot reload).
// Uso: npm run play   (o node tools/play/server.js [puerto])  ->  http://localhost:5180
//
// Ejecuta el MOTOR REAL del juego (los eventos JavaScript de game.json) en el navegador, con los mismos objetos
// simulados que usan tools/sim y tools/dump_screens, y los dibuja en un canvas con los sprites y fuentes del proyecto.
// Vigila src/ (historia, js, cinematicas, config...), game.json y assets/placeholder: cada cambio reconstruye en un archivo TEMPORAL (no toca game.json,
// no necesita cerrar GDevelop), vuelve a pasar el lint y avisa a la pagina por SSE para que recargue la escena.
// No sustituye a GDevelop: el dibujo es una aproximacion (mismas fotos que assets/preview), no el renderizador de GDevelop.
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const RAIZ = path.join(__dirname, "..", ".."), SRC = path.join(RAIZ, "src");
const PUERTO = +process.argv[2] || 5180;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "uan-play-")), GAME = path.join(TMP, "game.json");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css",
  ".png": "image/png", ".ttf": "font/ttf", ".ogg": "audio/ogg", ".wav": "audio/wav", ".mp3": "audio/mpeg" };

let version = 0, estado = { ok: true, msg: "", lint: { errores: 0, avisos: 0, items: [] }, hora: "" }, trabajando = false, pendiente = false;
const clientes = new Set();
const publicar = () => { const m = "data: " + JSON.stringify(Object.assign({ version }, estado)) + "\n\n"; clientes.forEach(r => r.write(m)); };

function correrBuild() {
  return new Promise(ok => {
    fs.copyFileSync(path.join(RAIZ, "game.json"), GAME);   // base con los objetos y recursos; build.js solo cambia el codigo y los datos
    const p = spawn(process.execPath, [path.join(RAIZ, "tools", "build", "build.js"), "--destino=" + GAME], { cwd: RAIZ });
    let out = ""; p.stdout.on("data", d => { out += d; }); p.stderr.on("data", d => { out += d; });
    p.on("close", code => ok({ code, out }));
  });
}
function revisarLint() {
  try {
    const historia = require("../historia.js"), { revisar } = require("../lint.js");
    const cine = path.join(SRC, "cinematicas.json");
    const r = revisar(historia.cargar(RAIZ), fs.existsSync(cine) ? JSON.parse(fs.readFileSync(cine, "utf8")) : null);
    const f = n => r.filter(x => x.nivel === n);
    return { errores: f("error").length, avisos: f("aviso").length, items: f("error").concat(f("aviso")).slice(0, 60).map(x => x.nivel + " · " + x.donde + ": " + x.msg) };
  } catch (e) { return { errores: 1, avisos: 0, items: ["error · lint: " + e.message] }; }
}
async function reconstruir() {
  if (trabajando) { pendiente = true; return; }
  trabajando = true;
  do {
    pendiente = false;
    const t0 = Date.now(), b = await correrBuild();
    const hora = new Date().toLocaleTimeString("es-MX");
    if (b.code) estado = { ok: false, msg: "El build falló:\n" + b.out.trim().split("\n").slice(-8).join("\n"), lint: estado.lint, hora };
    else { version++; estado = { ok: true, msg: "Reconstruido en " + (Date.now() - t0) + " ms", lint: revisarLint(), hora }; }
    console.log(hora, b.code ? "BUILD FALLÓ" : "v" + version + " · " + estado.lint.errores + " errores · " + estado.lint.avisos + " avisos");
    publicar();
  } while (pendiente);
  trabajando = false;
}

// ---- vigilancia de src/ ----
let temporizador = null;
const ignorado = f => !f || /(^|[\\/])(layout\.json|historias)([\\/]|$)/.test(f) || /\.(tmp|swp)$|~$/.test(f);   // layout.json lo reescribe build.js
fs.watch(SRC, { recursive: true }, (ev, f) => { if (process.env.PLAY_DEBUG) console.log("fs.watch", ev, f, ignorado(f) ? "(ignorado)" : ""); if (ignorado(f)) return; clearTimeout(temporizador); temporizador = setTimeout(reconstruir, 250); });

// tambien se reconstruye al cambiar game.json (npm run build registra sprites nuevos en el) o los assets del juego
const pedir = () => { clearTimeout(temporizador); temporizador = setTimeout(reconstruir, 400); };
fs.watch(RAIZ, { recursive: false }, (ev, f) => { if (f === "game.json") pedir(); });
fs.watch(path.join(RAIZ, "assets", "placeholder"), { recursive: true }, (ev, f) => { if (f && /.png$/i.test(f)) pedir(); });

// ---- servidor ----
const enviarArchivo = (res, ruta) => {
  fs.readFile(ruta, (e, b) => {
    if (e) { res.writeHead(404); return res.end("no existe"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(ruta).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" }); res.end(b);
  });
};
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/" || url === "/index.html") return enviarArchivo(res, path.join(__dirname, "index.html"));
  if (url === "/player.js") return enviarArchivo(res, path.join(__dirname, "player.js"));
  if (url === "/game.json") return enviarArchivo(res, GAME);
  if (url === "/estado") { res.writeHead(200, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" }); return res.end(JSON.stringify(Object.assign({ version }, estado))); }
  if (url === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    res.write("data: " + JSON.stringify(Object.assign({ version }, estado)) + "\n\n");
    clientes.add(res); const hb = setInterval(() => res.write(": ping\n\n"), 20000);
    return req.on("close", () => { clientes.delete(res); clearInterval(hb); });
  }
  if (/^\/(assets)\//.test(url)) {     // solo los recursos del juego (nunca el resto del proyecto)
    const ruta = path.join(RAIZ, url);
    if (ruta.indexOf(path.join(RAIZ, "assets") + path.sep) !== 0) { res.writeHead(403); return res.end(); }
    return enviarArchivo(res, ruta);
  }
  res.writeHead(404); res.end("no existe");
}).listen(PUERTO, "127.0.0.1", () => {
  console.log("Reproductor (hot reload): http://localhost:" + PUERTO + "   · vigila src/ · Ctrl+C para salir");
  reconstruir();
});
process.on("exit", () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { } });
process.on("SIGINT", () => process.exit(0));
