// Estilo de los objetos de texto (fuente, color, alineacion). Lo usan build.js y assets_demo.js.
// Los colores salen de la paleta del LAYOUT (src/js/00_comun.js); en ejecucion el motor tambien
// los fija con setColor, estos son los valores por defecto del editor.
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
function extraerLayout() {
  const s = fs.readFileSync(path.join(__dirname, "js", "00_comun.js"), "utf8");
  const m = /\/\*LAYOUT:BEGIN\*\/([\s\S]*?)\/\*LAYOUT:END\*\//.exec(s);
  if (!m) throw new Error("00_comun.js: no se encuentra el bloque LAYOUT");
  return JSON.parse(m[1]);
}
const LAYOUT = extraerLayout();
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// nombre -> [fuente ("titulo" = Bebas Neue, "cuerpo" = Lora), color de la paleta, alineacion]
const ESTILO = {
  TxtTitulo: ["titulo", "crema", "center"], TxtBoton: ["titulo", "crema", "center"], TxtPersonaje: ["titulo", "dorado_claro", "center"],
  TxtFragmento: ["cuerpo", "tinta", "left"], TxtOpcion: ["cuerpo", "crema", "center"],
};
const estiloDe = name => ESTILO[name] || ["cuerpo", "crema", "left"];
const fuenteDe = name => LAYOUT.fuente[estiloDe(name)[0]];
// Aplica el estilo a un objeto de texto de game.json (campo font del objeto y de content.font).
function aplicarEstilo(o) {
  const [, col, al] = estiloDe(o.name), c = rgb(LAYOUT.col[col]), font = fuenteDe(o.name);
  o.font = font; o.textAlignment = al; o.color = { r: c[0], g: c[1], b: c[2] };
  o.content = o.content || {};
  Object.assign(o.content, { font, textAlignment: al, color: c.join(";"), isOutlineEnabled: false, isShadowEnabled: false });
  return o;
}
const FUENTES_ARCHIVOS = Object.values(LAYOUT.fuente);
module.exports = { LAYOUT, ESTILO, estiloDe, fuenteDe, aplicarEstilo, FUENTES_ARCHIVOS, RAIZ };
// Registra las fuentes (assets/fonts/*.ttf) como recursos {"kind":"font"} de game.json. Idempotente.
function registrarFuentes(g) {
  g.resources = g.resources || { resources: [], resourceFolders: [] };
  const res = g.resources.resources = g.resources.resources || [];
  let n = 0;
  FUENTES_ARCHIVOS.forEach(f => {
    if (!fs.existsSync(path.join(RAIZ, f))) throw new Error("falta la fuente " + f);
    const r = res.find(x => x.name === f);
    if (r) { r.kind = "font"; r.file = f; return; }
    res.push({ kind: "font", name: f, file: f, metadata: "", userAdded: true, alwaysLoaded: false }); n++;
  });
  return n;
}
module.exports.registrarFuentes = registrarFuentes;
