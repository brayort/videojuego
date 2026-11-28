// Empaqueta el juego en UN SOLO archivo HTML que se abre con doble clic, sin servidor ni internet.
// Uso: npm run html   (o node tools/play/html.js [--destino=archivo.html])   ->  JUGAR.html
//
// Construye la version de produccion (tools/play/prod.js) en una carpeta temporal y mete dentro de la pagina el
// reproductor, game.json, las imagenes, las fuentes, el audio y los fondos. No toca public/ ni game.json.
const fs = require("fs"), path = require("path"), os = require("os");
const { spawnSync } = require("child_process");
const RAIZ = path.join(__dirname, "..", "..");
const a = process.argv.find(x => x.indexOf("--destino=") === 0);
const DEST = path.resolve(RAIZ, a ? a.slice(10) : "JUGAR.html");

const fallo = m => { console.error("\nERROR: " + m); process.exit(1); };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "uan-html-"));
process.on("exit", () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { } });

// ---- 1. version de produccion en la carpeta temporal ----
const p = spawnSync(process.execPath, [path.join(__dirname, "prod.js"), "--destino=" + TMP], { cwd: RAIZ, encoding: "utf8" });
if (p.status) fallo("`prod` falló:\n" + ((p.stdout || "") + (p.stderr || "")).trim());
const avisos = (p.stdout || "").split("\n").filter(l => l.indexOf("AVISO:") >= 0);

const TIPOS = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ttf": "font/ttf", ".ogg": "audio/ogg", ".mp3": "audio/mpeg" };
const dataUri = f => "data:" + TIPOS[path.extname(f).toLowerCase()] + ";base64," + fs.readFileSync(path.join(TMP, f)).toString("base64");

// ---- 2. recursos, indexados por la ruta con la que los pide el juego ----
const archivos = {};
const recorrer = dir => fs.readdirSync(path.join(TMP, dir), { withFileTypes: true }).forEach(e => {
  const f = dir + "/" + e.name;
  if (e.isDirectory()) return recorrer(f);
  const ext = path.extname(f).toLowerCase();
  if (!TIPOS[ext] || ext === ".mp3") return;   // los .mp3 entran en lugar de su .ogg
  // Una sola copia de cada sonido: .mp3 si existe (suena en todos los navegadores, tambien en Safari); si no, .ogg.
  const mp3 = f.replace(/\.ogg$/i, ".mp3");
  archivos[f] = dataUri(ext === ".ogg" && fs.existsSync(path.join(TMP, mp3)) ? mp3 : f);
});
recorrer("assets");

// ---- 3. pagina: todo lo que antes era un archivo aparte pasa a ir dentro ----
let pagina = fs.readFileSync(path.join(TMP, "index.html"), "utf8");
const cambiar = (patron, nuevo, que) => {
  if (!patron.test(pagina)) fallo("tools/play/prod.html cambió: no encontré " + que + " para incrustarlo.");
  pagina = pagina.replace(patron, nuevo);   // siempre con funcion: asi un "$" del contenido no se interpreta
};
cambiar(/url\("assets\/fonts\/[^"]+"\)/g, m => 'url("' + archivos[m.slice(5, -2)] + '")', "las fuentes");
const fondos = fs.existsSync(path.join(TMP, "fondo")) ? fs.readdirSync(path.join(TMP, "fondo")).sort().map(n => dataUri("fondo/" + n)) : [];
cambiar(/var fondos = \[[^\]]*\]/, () => "var fondos = " + JSON.stringify(fondos), "la lista de fondos");

// "<" se escapa para que ningun texto del juego pueda cerrar la etiqueta <script>.
const seguro = v => JSON.stringify(v).replace(/</g, "\\u003c");
const juego = JSON.parse(fs.readFileSync(path.join(TMP, "game.json"), "utf8"));
const reproductor = fs.readFileSync(path.join(TMP, "player.js"), "utf8").replace(/<\/script/gi, "<\\/script");
cambiar(/<script src="player\.js[^"]*"><\/script>/, () =>
  "<script>\nwindow.__PROD.juego = " + seguro(juego) + ";\nwindow.__PROD.archivos = " + seguro(archivos) + ";\n</script>\n<script>\n" + reproductor + "</script>",
  "la etiqueta de player.js");
cambiar(/<!doctype html>\r?\n/i, m => m + "<!-- Generado por `npm run html` (tools/play/html.js). No editar a mano. -->\n", "el doctype");

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, pagina);

console.log("Juego en un solo archivo: " + path.relative(RAIZ, DEST).replace(/\\/g, "/") + "  (" + (Buffer.byteLength(pagina) / 1048576).toFixed(1) + " MB)");
console.log("  " + Object.keys(archivos).length + " recursos + " + fondos.length + " fondos incrustados. Ábrelo con doble clic.");
avisos.forEach(l => console.log(l));
