// Registra los PNG provisionales (assets/placeholder) en game.json y los asigna a los sprites.
// Idempotente. Uso: node assets_demo.js   (correr DESPUES de build.js; cierra GDevelop antes)
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const { aplicarEstilo, registrarFuentes } = require("./estilo.js");
const GJ = path.join(RAIZ, "game.json");
const BASE = "assets/placeholder";
const ls = d => fs.existsSync(path.join(RAIZ, BASE, d)) ? fs.readdirSync(path.join(RAIZ, BASE, d)).filter(f => f.endsWith(".png")).map(f => f.slice(0, -4)).sort() : [];
const r = (d, n) => `${BASE}/${d}/${n}.png`;

const retratos = ls("retratos"), cartas = ls("cartas"), fondos = ls("fondos"), iconos = ls("iconos"), ui = ls("ui");
const deUi = pre => ui.filter(n => n.indexOf(pre) === 0).map(n => [n.slice(pre.length), r("ui", n)]);
// objeto -> lista ordenada [animacion, recurso]; la primera es la por defecto.
const prim = (lista, p) => lista.includes(p) ? [p, ...lista.filter(x => x !== p)] : lista;
const MAPA = {
  Fondo: prim(fondos, "juego").map(n => [n, r("fondos", n)]),
  Carta: prim(cartas, "carta").map(n => [n, r("cartas", n)]),
  Retrato: prim(retratos, "default").map(n => [n, r("retratos", n)]),
  IconoStat: iconos.map(n => [n, r("iconos", n)]),
  Flash: [["blanco", r("efectos", "flash_blanco")], ["bueno", r("efectos", "flash_bueno")], ["malo", r("efectos", "flash_malo")]],
  BotonMini: [["normal", r("ui", "boton_normal")], ["activo", r("ui", "boton_activo")], ["presionado", r("ui", "boton_presionado")]],
  Panel: deUi("panel_"),          // rectangulos de color plano (una animacion por color de la paleta)
  SombraCarta: [["sombra", r("ui", "sombra_carta")]],
  IconoUI: deUi("icono_"),        // flechas, estrella, corazon, cruz, candado, puntos
  Fragmento: [["default", r("ui", "fragmento")], ["bien", r("ui", "fragmento_bien")], ["mal", r("ui", "fragmento_mal")]],
};
const anim = (name, img) => ({
  name, useMultipleDirections: false,
  directions: [{ looping: false, timeBetweenFrames: 0.08, sprites: [{
    hasCustomCollisionMask: false, image: img, points: [], originPoint: { name: "origine", x: 0, y: 0 },
    centerPoint: { automatic: true, name: "centre", x: 0, y: 0 }, customCollisionMask: [] }] }],
});

const g = JSON.parse(fs.readFileSync(GJ, "utf8"));
const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14).replace(/^(\d{8})(\d{6})$/, "$1-$2");
fs.copyFileSync(GJ, path.join(RAIZ, `game.backup-${stamp}.json`));

// recursos
g.resources = g.resources || { resources: [], resourceFolders: [] };
const res = g.resources.resources = g.resources.resources || [];
const have = new Set(res.map(x => x.name));
let nuevosRes = 0;
for (const lista of Object.values(MAPA)) for (const [, img] of lista) {
  if (!fs.existsSync(path.join(RAIZ, img))) throw new Error("falta archivo " + img);
  if (!have.has(img)) { res.push({ kind: "image", name: img, file: img, metadata: "", smoothed: true, userAdded: true, alwaysLoaded: false }); have.add(img); nuevosRes++; }
}
// objetos (globales y de cada escena)
let nuevasAn = 0, objs = 0;
const tocar = lista => (lista || []).forEach(o => {
  if (o.type !== "Sprite" || !MAPA[o.name]) return;
  o.animations = o.animations || [];
  const existentes = new Set(o.animations.map(a => a.name));
  MAPA[o.name].forEach(([n, img]) => { if (!existentes.has(n)) { o.animations.push(anim(n, img)); nuevasAn++; } });
  objs++;
});
tocar(g.objects); (g.layouts || []).forEach(l => tocar(l.objects));
// fuentes (recurso "font") y estilo de los objetos de texto: font del objeto y de content.font
const nuevasFuentes = registrarFuentes(g);
let textos = 0;
const estilar = lista => (lista || []).forEach(o => { if (o.type === "TextObject::Text") { aplicarEstilo(o); textos++; } });
estilar(g.objects); (g.layouts || []).forEach(l => estilar(l.objects));
JSON.parse(JSON.stringify(g));
fs.writeFileSync(GJ, JSON.stringify(g, null, 2));
console.log(`recursos nuevos: ${nuevosRes}, fuentes nuevas: ${nuevasFuentes}, animaciones nuevas: ${nuevasAn}, objetos sprite tocados: ${objs}, textos con fuente: ${textos}`);
