// Contenido de la historia dividido en modulos: carga y guarda src/historia/ como UN solo objeto (el mismo
// que antes era src/cartas.json), de modo que build, lint, balance y editor no cambian de formato.
//
//   src/historia/personajes.json    personajes, candidatos, fichas (datos de editor: rol, unidad, personalidad...)
//   src/historia/finales.json       finales, finales_raros, caidas, destinos
//   src/historia/mundo.json         uan, items, mini (todo lo demas que no son cartas)
//   src/historia/menu.json          menu: mensajes de los personajes de la portada (solo los usa la escena Menu)
//   src/historia/cartas/genericas.json      cartas sin condiciones: salen al azar en cualquier momento
//   src/historia/cartas/especiales.json     cartas con condicion (semana, era, bandera, stat, afinidad, campana, cine...)
//   src/historia/cartas/consecuencias.json  cartas "solo_luego": solo salen como consecuencia de una opcion
//   src/historia/cartas/cadenas/<id>.json   mini historias: {id, titulo, resumen, cartas:[...]}; cada carta lleva "cadena":"<id>"
//
// El TIPO de una carta se deduce de la propia carta (clasificar), asi que el editor puede crear cartas sin
// elegir carpeta: al guardar, cada carta se reparte sola en su archivo.
// Uso:  node tools/historia.js --info                      cuenta cartas por tipo
//       node tools/historia.js --normalizar                recarga y reescribe src/historia (reparte cartas movidas a mano)
//       node tools/historia.js --migrar <cartas.json>      divide un cartas.json monolitico en src/historia
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");

// Campos de condicion: si una carta tiene alguno es ESPECIAL (no sale "en cualquier momento").
const CONDICIONES = ["semana", "sem16", "semmin", "semmax", "desde", "hasta", "uansi", "si", "req", "noreq", "reqitem",
  "afmin", "afmax", "de", "rasgo", "reelmin", "reelmax", "campana", "cine", "fx"];
const TIPOS = ["generica", "especial", "consecuencia", "cadena"];
const clasificar = c => c.cadena ? "cadena" : c.solo_luego ? "consecuencia" : CONDICIONES.some(k => c[k] !== undefined) ? "especial" : "generica";

const ARCH_TIPO = { generica: "genericas.json", especial: "especiales.json", consecuencia: "consecuencias.json" };
const ARCH_RAIZ = { personajes: "personajes.json", candidatos: "personajes.json", finales: "finales.json", finales_raros: "finales.json", caidas: "finales.json", destinos: "finales.json", menu: "menu.json", fichas: "personajes.json" };
const dirHistoria = raiz => path.join(raiz || RAIZ, "src", "historia");
const leerJ = (p, def) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : def);
const escribir = (p, obj) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n"); };

function cargar(raiz) {
  const dir = dirHistoria(raiz), D = {};
  if (!fs.existsSync(dir)) throw new Error("No existe " + dir + " (migra con: node tools/historia.js --migrar <cartas.json>)");
  fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort().forEach(f => Object.assign(D, leerJ(path.join(dir, f), {})));
  D.cartas = []; D.cadenas = {};
  const dc = path.join(dir, "cartas");
  Object.keys(ARCH_TIPO).forEach(t => D.cartas.push(...(leerJ(path.join(dc, ARCH_TIPO[t]), {}).cartas || [])));
  const dch = path.join(dc, "cadenas");
  if (fs.existsSync(dch)) fs.readdirSync(dch).filter(f => f.endsWith(".json")).sort().forEach(f => {
    const j = leerJ(path.join(dch, f), {}), id = j.id || f.slice(0, -5);
    D.cadenas[id] = { titulo: j.titulo || id, resumen: j.resumen || "" };
    (j.cartas || []).forEach(c => { c.cadena = id; D.cartas.push(c); });   // el archivo manda sobre el campo
  });
  return D;
}

// Reparte las cartas por tipo y escribe todos los archivos. Borra archivos de cadenas que ya no existen.
function guardar(D, raiz) {
  const dir = dirHistoria(raiz), dc = path.join(dir, "cartas"), dch = path.join(dc, "cadenas");
  const raices = {};
  Object.keys(D).forEach(k => {
    if (k === "cartas" || k === "cadenas") return;
    const f = ARCH_RAIZ[k] || "mundo.json";
    (raices[f] = raices[f] || {})[k] = D[k];
  });
  Object.keys(raices).forEach(f => escribir(path.join(dir, f), raices[f]));
  const por = { generica: [], especial: [], consecuencia: [] }, cad = {};
  (D.cartas || []).forEach(c => { const t = clasificar(c); if (t === "cadena") (cad[c.cadena] = cad[c.cadena] || []).push(c); else por[t].push(c); });
  Object.keys(ARCH_TIPO).forEach(t => escribir(path.join(dc, ARCH_TIPO[t]), { cartas: por[t] }));
  const ids = new Set(Object.keys(D.cadenas || {}).concat(Object.keys(cad)));
  ids.forEach(id => { const m = (D.cadenas || {})[id] || {}; escribir(path.join(dch, id + ".json"), { id, titulo: m.titulo || id, resumen: m.resumen || "", cartas: cad[id] || [] }); });
  if (fs.existsSync(dch)) fs.readdirSync(dch).filter(f => f.endsWith(".json") && !ids.has(f.slice(0, -5))).forEach(f => fs.unlinkSync(path.join(dch, f)));
}

const resumen = D => {
  const n = { generica: 0, especial: 0, consecuencia: 0, cadena: 0 };
  (D.cartas || []).forEach(c => n[clasificar(c)]++);
  return n;
};
module.exports = { cargar, guardar, clasificar, resumen, TIPOS, CONDICIONES };

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === "--migrar") {
    if (!a[1]) { console.error("Uso: node tools/historia.js --migrar <cartas.json>"); process.exit(1); }
    guardar(JSON.parse(fs.readFileSync(path.resolve(a[1]), "utf8")));
    console.log("Migrado a src/historia:", JSON.stringify(resumen(cargar())));
  } else if (a[0] === "--normalizar") { const D = cargar(); guardar(D); console.log("Normalizado:", JSON.stringify(resumen(D))); }
  else { const D = cargar(); console.log(JSON.stringify(resumen(D)), "· cadenas:", Object.keys(D.cadenas).join(", ") || "-"); }
}
