// Construye la version de PRODUCCION del reproductor web: una carpeta estatica lista para subir a cualquier hosting.
// Uso: npm run prod   (o node tools/play/prod.js [--destino=carpeta] [--sin-mp3])   ->  public/
//      npm run prod:ver                                                             ->  la sirve para probarla
//
// Es el mismo motor y el mismo dibujo que `npm run play` (tools/play/player.js), pero:
//   · sin barra de herramientas, lint, panel de depuracion ni recarga en caliente;
//   · pagina a pantalla completa pensada para telefono (tactil, sin zoom ni desplazamiento, aviso de girar);
//   · en computadora, el juego va centrado sobre un fondo con una ilustracion de la UAN y un panel de controles;
//   · solo copia los recursos que el juego usa, y genera .mp3 para iPhone (Safari no reproduce .ogg) si hay ffmpeg.
// Igual que el reproductor de desarrollo, construye en un archivo TEMPORAL: no toca game.json ni hace falta cerrar GDevelop.
// Limite conocido: el ranking en linea de GDevelop no existe aqui (el reproductor lo simula vacio).
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto");
const { spawnSync } = require("child_process");
const RAIZ = path.join(__dirname, "..", "..");
const arg = n => { const a = process.argv.find(x => x.indexOf("--" + n + "=") === 0); return a ? a.slice(n.length + 3) : null; };
const DEST = path.resolve(RAIZ, arg("destino") || "public");
const SIN_MP3 = process.argv.includes("--sin-mp3");

// Ilustraciones para el fondo de escritorio (se elige una al azar en cada visita). Cambia la lista para usar otras.
const FONDOS_PC = ["assets/Unidad Academica de Economia.png", "assets/Rectoria.png", "assets/Biblioteca Magna UAN.png"];
// Lo unico que este script escribe (y borra) dentro de la carpeta destino; cualquier otro archivo tuyo se respeta.
const SALIDAS = ["assets", "fondo", "index.html", "player.js", "game.json"];

const aviso = [], fallo = m => { console.error("\nERROR: " + m); process.exit(1); };
const mb = n => (n / 1048576).toFixed(1) + " MB";

// ---- 1. build a un archivo temporal (como tools/play/server.js) ----
if (!fs.existsSync(path.join(RAIZ, "game.json"))) fallo("no existe game.json; corre primero `npm run build`.");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "uan-prod-")), GAME = path.join(TMP, "game.json");
process.on("exit", () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { } });
fs.copyFileSync(path.join(RAIZ, "game.json"), GAME);
const b = spawnSync(process.execPath, [path.join(RAIZ, "tools", "build", "build.js"), "--destino=" + GAME], { cwd: RAIZ, encoding: "utf8" });
if (b.status) fallo("el build falló:\n" + ((b.stdout || "") + (b.stderr || "")).trim().split("\n").slice(-10).join("\n"));
const g = JSON.parse(fs.readFileSync(GAME, "utf8"));

// ---- 2. lint (no bloquea, pero avisa) ----
try {
  const historia = require("../historia.js"), { revisar } = require("../lint.js");
  const cine = path.join(RAIZ, "src", "cinematicas.json");
  const r = revisar(historia.cargar(RAIZ), fs.existsSync(cine) ? JSON.parse(fs.readFileSync(cine, "utf8")) : null);
  const errores = r.filter(x => x.nivel === "error");
  const corto = s => s.length > 150 ? s.slice(0, 150) + "…" : s;
  if (errores.length) aviso.push("el lint tiene " + errores.length + " error(es); revisa con `npm run lint` antes de publicar. Primero: " + corto(errores[0].donde + ": " + errores[0].msg));
} catch (e) { aviso.push("no se pudo correr el lint: " + e.message); }

// ---- 3. el panel de depuracion nunca va a produccion ----
let depuracion = 0;
const recorrer = evs => evs.forEach(e => {
  if (typeof e.inlineCode === "string" && e.inlineCode.indexOf('"debug":true') >= 0) { e.inlineCode = e.inlineCode.split('"debug":true').join('"debug":false'); depuracion++; }
  if (e.events) recorrer(e.events);
});
g.layouts.forEach(l => recorrer(l.events));
if (depuracion) aviso.push('src/config.json tiene "debug": true; en esta version se apagó, pero conviene dejarlo en false.');

// ---- 4. recursos que el juego usa: imagenes de los objetos, fuentes de los textos y todo el audio ----
const archivos = new Set();
g.layouts.forEach(l => l.objects.forEach(o => {
  (o.animations || []).forEach(a => a.directions.forEach(d => d.sprites.forEach(s => archivos.add(s.image))));
  if (o.type === "TextObject::Text" && o.font) archivos.add(o.font);
}));
((g.resources && g.resources.resources) || []).filter(r => r.kind === "audio" || r.kind === "font").forEach(r => archivos.add(r.file));
try {   // el motor toma las rutas de sonido de este manifiesto
  const man = JSON.parse(fs.readFileSync(path.join(RAIZ, "assets", "audio", "audio.json"), "utf8"));
  Object.keys(man).forEach(k => Object.keys(man[k] || {}).forEach(n => { if (typeof man[k][n] === "string") archivos.add(man[k][n]); }));
} catch (e) { }

// ---- 5. limpiar solo lo nuestro y copiar ----
fs.mkdirSync(DEST, { recursive: true });
SALIDAS.forEach(n => fs.rmSync(path.join(DEST, n), { recursive: true, force: true }));
let copiados = 0, bytes = 0; const faltan = [];
const dentro = ruta => path.resolve(RAIZ, ruta).indexOf(path.join(RAIZ, "assets") + path.sep) === 0;   // solo recursos del juego
[...archivos].sort().forEach(f => {
  const origen = path.join(RAIZ, f);
  if (!dentro(f) || !fs.existsSync(origen)) { faltan.push(f); return; }
  const dest = path.join(DEST, f); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(origen, dest);
  copiados++; bytes += fs.statSync(dest).size;
});

// game.json nombra sprites que aun no existen en assets/ (arte por dibujar). El reproductor los ignora, pero en produccion
// no tiene caso pedirlos al hosting: se le pasa la lista para que no haga esas peticiones.
g.prodOmitir = faltan.filter(f => /\.(png|jpe?g|webp)$/i.test(f));

// ---- 6. .mp3 para Safari / iPhone (opcional: necesita ffmpeg) ----
let mp3 = false, nMp3 = 0;
if (!SIN_MP3) {
  const hay = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (hay.error || hay.status) aviso.push("no encontré ffmpeg: no se generaron .mp3 y en iPhone (Safari) el juego puede quedar sin sonido.");
  else {
    const oggs = [...archivos].filter(f => /\.ogg$/i.test(f) && fs.existsSync(path.join(DEST, f)));
    let mal = 0;
    oggs.forEach(f => {
      const salida = path.join(DEST, f.replace(/\.ogg$/i, ".mp3"));
      const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(DEST, f), "-codec:a", "libmp3lame", "-q:a", "5", salida], { encoding: "utf8" });
      if (r.status || !fs.existsSync(salida)) mal++; else { nMp3++; bytes += fs.statSync(salida).size; }
    });
    mp3 = oggs.length > 0 && mal === 0;
    if (mal) aviso.push(mal + " sonido(s) no se pudieron convertir a .mp3; se usará solo .ogg.");
  }
}

// ---- 7. fondos de escritorio: se reducen y pasan a .webp con Pillow (si no se puede, queda el degradado azul) ----
const fondos = [];
const PY = "import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGBA')\nbg=Image.new('RGBA',im.size,(12,33,82,255))\nbg.alpha_composite(im)\nim=bg.convert('RGB')\nw=int(sys.argv[3])\nif im.width>w: im=im.resize((w,round(im.height*w/im.width)),Image.LANCZOS)\nim.save(sys.argv[2],'WEBP',quality=74,method=6)\n";
FONDOS_PC.forEach((f, i) => {
  const origen = path.join(RAIZ, f);
  if (!fs.existsSync(origen)) { aviso.push("no existe el fondo " + f); return; }
  const nombre = "fondo/fondo-" + (i + 1) + ".webp", salida = path.join(DEST, nombre);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const r = spawnSync("python", ["-c", PY, origen, salida, "1600"], { encoding: "utf8" });
  if (r.error || r.status || !fs.existsSync(salida)) { aviso.push("no se pudo preparar el fondo " + f + " (¿falta Python con Pillow?)"); return; }
  fondos.push(nombre); bytes += fs.statSync(salida).size;
});

// ---- 8. game.json, reproductor y pagina ----
const juegoTxt = JSON.stringify(g), reproductor = fs.readFileSync(path.join(__dirname, "player.js"), "utf8");
let pagina = fs.readFileSync(path.join(__dirname, "prod.html"), "utf8");
const version = crypto.createHash("sha1").update(juegoTxt).update(reproductor).update(pagina).digest("hex").slice(0, 10);   // rompe la cache del hosting al cambiar algo
pagina = pagina.replace(/<!-- PLANTILLA[\s\S]*?-->\r?\n/, "").split("__VERSION__").join(version).split("__MP3__").join(String(mp3)).split("__FONDOS__").join(JSON.stringify(fondos));
fs.writeFileSync(path.join(DEST, "game.json"), juegoTxt);
fs.writeFileSync(path.join(DEST, "player.js"), reproductor);
fs.writeFileSync(path.join(DEST, "index.html"), pagina);
bytes += Buffer.byteLength(juegoTxt) + Buffer.byteLength(reproductor) + Buffer.byteLength(pagina);

// ---- resumen ----
console.log("Producción lista en " + path.relative(RAIZ, DEST).replace(/\\/g, "/") + "/  (versión " + version + ")");
console.log("  " + copiados + " recursos + " + nMp3 + " mp3 + " + fondos.length + " fondos de escritorio · " + mb(bytes) + " en total");
if (faltan.length) console.log("  " + faltan.length + " recursos de game.json no existen en assets/ y se omitieron (el juego ya los ignora), p. ej. " + faltan[0]);
aviso.forEach(a => console.log("  AVISO: " + a));
console.log("  Pruébala con: npm run prod:ver   (añade --lan para abrirla desde el teléfono en la misma red)");
