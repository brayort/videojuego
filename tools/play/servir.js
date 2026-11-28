// Sirve la carpeta de produccion (public/) para probarla antes de subirla a un hosting.
// Uso: npm run prod:ver   (o node tools/play/servir.js [puerto] [--lan] [--carpeta=ruta])  ->  http://localhost:5190
//
// Por defecto solo escucha en esta computadora. Con --lan escucha en toda la red local para abrir el juego desde el
// telefono (misma wifi); cualquiera en esa red puede verlo mientras este abierto, asi que cierralo al terminar (Ctrl+C).
// Solo entrega archivos estaticos de esa carpeta. Atiende peticiones por rangos, que Safari exige para el audio.
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const RAIZ = path.join(__dirname, "..", "..");
const arg = n => { const a = process.argv.find(x => x.indexOf("--" + n + "=") === 0); return a ? a.slice(n.length + 3) : null; };
const CARPETA = path.resolve(RAIZ, arg("carpeta") || "public");
const PUERTO = +(process.argv.slice(2).find(a => /^\d+$/.test(a))) || 5190;
const LAN = process.argv.includes("--lan");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css",
  ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".mp4": "video/mp4" };

if (!fs.existsSync(path.join(CARPETA, "index.html"))) { console.error("No existe " + path.join(CARPETA, "index.html") + ". Corre primero: npm run prod"); process.exit(1); }

http.createServer((req, res) => {
  let url; try { url = decodeURIComponent(req.url.split("?")[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (url.endsWith("/")) url += "index.html";
  const ruta = path.join(CARPETA, url);
  if (ruta !== CARPETA && ruta.indexOf(CARPETA + path.sep) !== 0) { res.writeHead(403); return res.end(); }   // nunca fuera de la carpeta
  fs.stat(ruta, (e, st) => {
    if (!e && st.isDirectory()) { res.writeHead(301, { Location: url + "/" }); return res.end(); }   // /nosotros -> /nosotros/
    if (e || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("no existe"); }
    const cab = { "Content-Type": MIME[path.extname(ruta).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache", "Accept-Ranges": "bytes" };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m && (m[1] || m[2])) {
      let ini = m[1] ? +m[1] : Math.max(0, st.size - +m[2]), fin = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (ini > fin || ini >= st.size) { res.writeHead(416, { "Content-Range": "bytes */" + st.size }); return res.end(); }
      res.writeHead(206, Object.assign(cab, { "Content-Range": "bytes " + ini + "-" + fin + "/" + st.size, "Content-Length": fin - ini + 1 }));
      return req.method === "HEAD" ? res.end() : fs.createReadStream(ruta, { start: ini, end: fin }).pipe(res);
    }
    res.writeHead(200, Object.assign(cab, { "Content-Length": st.size }));
    return req.method === "HEAD" ? res.end() : fs.createReadStream(ruta).pipe(res);
  });
}).listen(PUERTO, LAN ? "0.0.0.0" : "127.0.0.1", () => {
  console.log("Producción: http://localhost:" + PUERTO + "   · Ctrl+C para salir");
  if (LAN) {
    const ips = []; Object.values(os.networkInterfaces()).forEach(l => (l || []).forEach(i => { if (i.family === "IPv4" && !i.internal) ips.push(i.address); }));
    ips.forEach(ip => console.log("Desde el teléfono (misma red): http://" + ip + ":" + PUERTO));
    if (!ips.length) console.log("No encontré una dirección de red local.");
  } else console.log("Para abrirla desde el teléfono: npm run prod:ver -- --lan");
});
process.on("SIGINT", () => process.exit(0));
