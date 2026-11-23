// Respaldos de game.json: todos van a la carpeta respaldos/ (en la raiz del proyecto), no sueltos junto a game.json.
// Nombre: game.backup-AAAAMMDD-HHMMSS.json. Se conservan los MAX mas recientes.
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const CARPETA = path.join(RAIZ, "respaldos");
const MAX = 20;
const RE = /^game\.backup-\d{8}-\d{6}\.json$/;

function sello() {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

// Copia `origen` a respaldos/ y poda los viejos. Devuelve la ruta del respaldo.
function respaldar(origen) {
  fs.mkdirSync(CARPETA, { recursive: true });
  const destino = path.join(CARPETA, "game.backup-" + sello() + ".json");
  fs.copyFileSync(origen, destino);
  fs.readdirSync(CARPETA).filter(x => RE.test(x)).sort().reverse().slice(MAX).forEach(x => fs.unlinkSync(path.join(CARPETA, x)));
  return destino;
}

module.exports = { respaldar, CARPETA };
