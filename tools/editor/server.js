// Editor del juego: servidor local sin dependencias (solo 127.0.0.1).
// Uso: npm run editor   (o node tools/editor/server.js [puerto])  ->  http://localhost:5178
// Lee y GUARDA src/cartas.json y src/cinematicas.json (con respaldo en tools/editor/respaldos/),
// valida con tools/lint.js, corre el balance y el build. Cierra GDevelop antes de "Build".
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");
const { revisar } = require("../lint.js");
const RAIZ = path.join(__dirname, "..", ".."), SRC = path.join(RAIZ, "src");
const PUERTO = +process.argv[2] || 5178;
const ARCH = { cartas: path.join(SRC, "cartas.json"), cinematicas: path.join(SRC, "cinematicas.json") };
const RESP = path.join(__dirname, "respaldos");
const leerJ = (p, def) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : def);
const lsPng = d => { const p = path.join(RAIZ, "assets", "placeholder", d); return fs.existsSync(p) ? fs.readdirSync(p).filter(f => f.endsWith(".png")).map(f => f.slice(0, -4)).sort() : []; };
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".ogg": "audio/ogg", ".wav": "audio/wav", ".json": "application/json" };

const enviar = (res, cod, obj) => { res.writeHead(cod, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); };
const cuerpo = req => new Promise((ok, mal) => { let b = ""; req.on("data", c => { b += c; if (b.length > 50e6) req.destroy(); }); req.on("end", () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { mal(e); } }); });
const correr = (args, env) => new Promise(ok => {
  const p = spawn(process.execPath, args, { cwd: RAIZ, env: Object.assign({}, process.env, env || {}) });
  let out = ""; p.stdout.on("data", d => { out += d; }); p.stderr.on("data", d => { out += d; });
  p.on("close", code => ok({ code, out: out.slice(-20000) }));
});
const datos = () => ({
  cartas: leerJ(ARCH.cartas), cinematicas: leerJ(ARCH.cinematicas, { disparos: {}, cinematicas: {} }),
  layout: leerJ(path.join(SRC, "layout.json")), audio: leerJ(path.join(RAIZ, "assets", "audio", "audio.json"), { sfx: {}, musica: {} }),
  assets: { retratos: lsPng("retratos"), cartas: lsPng("cartas"), fondos: lsPng("fondos"), iconos: lsPng("iconos") },
  balance: leerJ(path.join(RAIZ, "tools", "balance", "reporte.json"), null),
});

const rutas = {
  "GET /api/datos": async () => datos(),
  "POST /api/lint": async b => revisar(b.cartas, b.cinematicas),
  "POST /api/guardar": async b => {
    const f = ARCH[b.archivo];
    if (!f || !b.datos || typeof b.datos !== "object") throw new Error("archivo o datos invalidos");
    fs.mkdirSync(RESP, { recursive: true });
    const sello = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
    if (fs.existsSync(f)) fs.copyFileSync(f, path.join(RESP, b.archivo + "-" + sello + ".json"));
    // limpia respaldos viejos (se quedan los 20 mas recientes por archivo)
    fs.readdirSync(RESP).filter(x => x.indexOf(b.archivo + "-") === 0).sort().reverse().slice(20).forEach(x => fs.unlinkSync(path.join(RESP, x)));
    // misma sangria y mismo final de archivo que el original (diff limpio en git)
    const prev = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "\n";
    const sangria = (/\n( +)"/.exec(prev) || [0, "  "])[1].length;
    fs.writeFileSync(f, JSON.stringify(b.datos, null, sangria) + (/\n$/.test(prev) ? "\n" : ""));
    return { ok: true, respaldo: b.archivo + "-" + sello + ".json" };
  },
  "POST /api/build": async () => {
    const a = await correr(["tools/build/build.js"]);
    if (a.code) return { ok: false, out: a.out };
    const b = await correr(["tools/build/assets.js"]);
    fs.readdirSync(RAIZ).filter(x => /^game\.backup-.*\.json$/.test(x)).sort().reverse().slice(5).forEach(x => fs.unlinkSync(path.join(RAIZ, x)));
    return { ok: !b.code, out: a.out + "\n" + b.out };
  },
  "POST /api/balance": async b => {
    const n = Math.max(50, Math.min(5000, +b.n || 500));
    const oficial = n >= 5000;
    const dir = oficial ? path.join(RAIZ, "tools", "balance") : fs.mkdtempSync(path.join(os.tmpdir(), "uan-balance-"));
    const r = await correr(["tools/balance/balance.js", String(n)], { BALANCE_OUT: dir });
    if (r.code) return { ok: false, out: r.out };
    return { ok: true, oficial, reporte: leerJ(path.join(dir, "reporte.json")) };
  },
  "POST /api/sim": async b => correr(["tools/sim/sim.js", String(+b.semilla || 7), String(+b.frames || 20000)]),
};

http.createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const r = rutas[req.method + " " + url];
    if (r) {
      const b = req.method === "POST" ? await cuerpo(req) : {};
      return enviar(res, 200, await r(b));
    }
    // estaticos: la pagina del editor y los assets/fuentes del juego
    let f = url === "/" ? path.join(__dirname, "index.html") : url.indexOf("/assets/") === 0 ? path.join(RAIZ, url) : path.join(__dirname, url);
    f = path.normalize(f);
    if ((f.indexOf(RAIZ + path.sep + "assets") !== 0 && f.indexOf(__dirname) !== 0) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("no existe"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(f).pipe(res);
  } catch (e) { enviar(res, 500, { error: String(e && e.message || e) }); }
}).listen(PUERTO, "127.0.0.1", () => console.log("Editor del juego en http://localhost:" + PUERTO + "  (Ctrl+C para salir)"));
