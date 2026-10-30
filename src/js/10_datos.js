// ============================================================================
// 10 DATOS — cartas, personajes, finales y minijuegos (contenido de cartas.json).
// build.js sustituye el marcador de abajo. Para cambiar contenido: edita
// src/cartas.json y ejecuta "node build.js". El esquema esta en src/ESQUEMA.md.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.mod_datos) {
  S.mod_datos = true;
  S.data = __CARTAS__;
  S.data.cartas = S.data.cartas || [];
  S.data.personajes = S.data.personajes || {};
  S.data.finales = S.data.finales || {};
  S.data.finales_raros = S.data.finales_raros || {};
  S.data.mini = S.data.mini || {};
  S.data.items = S.data.items || {};
  S.data.caidas = S.data.caidas || {};
  S.data.destinos = S.data.destinos || [];
  S.data.uan = S.data.uan || {};
  S.porId = {};
  S.data.cartas.forEach(c => { S.porId[c.id] = c; });
}
