# Director UAN: Economía (GDevelop 5)

Juego de cartas tipo Reigns. Lógica en eventos JavaScript de GDevelop; contenido en `src/cartas.json`.

## Estructura

```
game.json            proyecto GDevelop (generado/fusionado; ábrelo en el editor). Escenas Menu, Juego y Logros
package.json         atajos: npm run build | check | sim | balance | audio | placeholders | preview
src/                 EL JUEGO (lo que se edita)
  js/*.js            motor, un archivo por sección: 00_comun, 05_audio, 10_datos, 20_estado, 30_cartas,
                     40_minijuegos, 50_entrada, 55_efectos, 60_render, menu, logros (cada uno = un grupo [AUTO])
  cartas.json        contenido; esquema y mecánicas en src/ESQUEMA.md
  config.json        ids de leaderboards y volúmenes por defecto
  layout.json        espejo generado del LAYOUT de 00_comun.js (no editar)
tools/               HERRAMIENTAS (no van dentro del juego)
  build/build.js     genera / fusiona game.json   ·  build/assets.js registra sprites, audio y fuentes
  build/estilo.js    fuente/color de los textos (compartido por build y assets)
  balance/           simulación de partidas por bot → balance/reporte.txt
  sim/               simulador headless de las escenas (prueba de regresión)
  gen_audio.py, gen_placeholders.py, preview_layout.py, dump_screens.js
assets/              audio, fuentes y sprites provisionales
```

`npm run check` construye en un archivo temporal y corre el simulador: úsalo tras tocar `src/js`. `SPRITES.txt` lista el arte a dibujar.

## Herramientas del juego

| comando | qué hace |
|---|---|
| `npm run editor` | **Editor web** en http://localhost:5178 (solo local). **Cartas**: buscar y filtrar (personaje, con problemas, solo_luego, campaña, era, con cine, nunca vistas), formulario por carta y opción, vista previa con el LAYOUT real (marca en rojo el texto que no cabe), referencias cruzadas (quién pone o lee cada bandera, quién encola la carta). **Cinemáticas**: editar guiones línea a línea, disparos y un reproductor igual al del juego. **Balance**: corre la simulación y la muestra en gráficas (duración, causas de caída, destinos, sucesores, cartas más vistas, nunca vistas y con opción dominante). **Revisión**: el lint en vivo. Guarda `src/cartas.json` y `src/cinematicas.json` con respaldo en `tools/editor/respaldos/`; el botón *Build* genera `game.json` (cierra GDevelop antes). |
| `npm run lint` | Revisa el contenido: ids duplicados, personajes, expedientes, `luego` hacia cartas que no existen, cartas `solo_luego` que nunca se encolan, banderas que se leen pero nada pone, umbrales y eras mal escritos, cinemáticas y assets que faltan, textos demasiado largos. `--todo` muestra también la info. |
| `npm run check` | lint + build a un archivo temporal + simulador de escenas. Úsalo antes de cada commit. |
| `npm run balance` | 5000 partidas por bot → `tools/balance/reporte.txt` y `reporte.json` (este último lo lee el editor). |
| Panel de depuración | Pon `"debug": true` en `src/config.json` y corre `npm run build`. En la escena Juego, **F2** abre un panel con el estado completo y botones para mover stats y medidores, saltar a una carta por id, poner banderas, dar expedientes, avanzar semanas y forzar elección, caída, destino o cinemática. **Vuelve a ponerlo en false antes de publicar.** |

## Flujo de trabajo (editas arte en GDevelop y cartas en JSON)

Orden completo (desde la raíz): `npm run audio` (solo si cambias el audio) → `npm run build` (= `build.js` + `assets.js`) → pruebas: `node tools/sim/sim.js <semilla> [frames]` (con `SIM_RANK=1` simula el ranking configurado) y `python tools/preview_layout.py` (capturas en `assets/preview`).

1. Cierra el proyecto en GDevelop (o prepárate a **recargarlo**). Si el editor queda abierto y guarda, sobrescribe lo que haga el script.
2. Edita `src/cartas.json` (o `src/js/*.js`) y corre `node tools/build/build.js`.
3. Abre / recarga `game.json` en GDevelop.

`build.js` **no sobrescribe**: si `game.json` existe, lo fusiona.
* Se conservan: recursos, animaciones de cada objeto, instancias, objetos extra que hayas creado, capas, propiedades del proyecto (nombre, tamaño, icono), variables y **todos tus eventos**.
* Solo se reemplazan los eventos generados: son los grupos cuyo nombre empieza por `[AUTO]`. No renombres ni metas tus eventos *dentro* de esos grupos (se pierden); ponlos fuera, antes o después. Si borras un grupo `[AUTO]` el siguiente build lo vuelve a crear.
* Se agregan los objetos, variables y escenas que falten.
* Antes de escribir se guarda `game.backup-AAAAMMDD-HHMMSS.json` junto a `game.json`.
* `node tools/build/build.js --limpio` ignora el `game.json` existente (también con respaldo). `--destino=ruta.json` escribe en otro archivo.

## Usar el estado desde eventos normales de GDevelop

El motor publica cada frame variables de escena (`Academico`, `Estado`, `Fecha`, `SemanasEleccion`, ...) y señales (`SenalCarta`, `SenalFin`, ...). Ver la lista en `src/ESQUEMA.md`. El grupo `[AUTO] Ejemplos de eventos estandar` trae ejemplos que puedes copiar a tus propios eventos (por ejemplo: `Estado = "fin"` oculta `TxtInventario`; `Finanzas < 20` activa `AlertaFinanzas`).

Los objetos se crean por código; en la escena Juego puedes añadir animaciones a `Fondo`, `Carta`, `Retrato`, `IconoStat`, `Flash`, `BotonMini`, `Fragmento` (nombres en `SPRITES.txt`) y cambiar fuente/color de los textos; el motor ignora animaciones que no existan.

## Estructura del juego: caídas, destinos, UAN y Nayarit

* **Varios directores.** Cuando un director cae (stat en 0/100, elección perdida, retiro, límite, caída especial) NO es el final: se muestra "Fin de la gestión de X" con una línea de consecuencia para la UAN, luego Sucesión y Epílogo, y juega el siguiente director.
* **Meta-estado persistente.** Seis medidores 0-100 que empiezan en 50 y viven en la dinastía: Solvencia UAN, Paz Social, Autonomía, Prestigio UAN y, para el estado, Desarrollo y Seguridad de Nayarit. Se mueven con opciones (`uan`, `nay`), con la causa de cada caída, con el epílogo según la integridad y con las reelecciones limpias; los directores siguientes heredan la UAN (los stats iniciales se ajustan levemente). Cartas con `uansi` solo salen cuando los medidores cruzan umbrales (huelga del SPAUAN, rescate federal, intervención del Congreso, cambio de rector, reforma a la Ley Orgánica, privatización, alianzas).
* **Finales = destinos.** Tras 8 directores (`uan.n_directores`) o si algún medidor llega a un extremo, la historia termina con uno de 9 destinos de la UAN y de Nayarit (2040: Renacimiento, Motor del desarrollo, Último refugio, Quiebra y rescate, Huelga indefinida, Intervención estatal, Captura total, Torre de marfil, Sobrevivió) y una crónica de los directores que jugaste. Después la historia se archiva en la **Crónica** del Menú y se reinicia todo (los logros se conservan).
* **Menú:** Nueva partida (siguiente director), Continuar, Logros, **Ranking**, **Opciones**, **Nueva historia** (reinicia dinastía y medidores; pide confirmar), **Crónica** (historias pasadas) y Créditos; muestra el estado actual de la UAN.
* Las variables de escena `UAN_Solvencia`, `UAN_Paz`, `UAN_Autonomia`, `UAN_Prestigio`, `Nay_Desarrollo`, `Nay_Seguridad`, `Historia` y `Destino` están disponibles para tus eventos. Detalle completo en `src/ESQUEMA.md`.

## Controles
Arrastrar la carta o flechas ←/→ (↑ usa expediente); Espacio/Enter/clic avanzan; minijuegos con ratón o teclas 1-3; **Escape** pausa (Continuar / Opciones / Guardar y salir al menú). Se autoguarda en cada carta.


## Paleta y fuentes (LAYOUT.col y LAYOUT.fuente, en `src/js/00_comun.js`)

Paleta azul, blanco y amarillo. Los **nombres** de los colores se conservan de la versión anterior (guinda, dorado…) para no romper `cartas.json`, `cinematicas.json` ni el código; la columna *uso* dice qué es cada uno. Fuentes: **Nunito SemiBold** (texto) y **Fredoka SemiBold** (títulos y botones), ambas SIL OFL, en `assets/fonts/`. Si cambias una fuente corre `python tools/gen_metricas.py` (mide el ancho real de cada carácter para que el texto se ajuste bien) y luego `npm run build`.

Los sprites `Panel` (una animación por color), los textos y los botones usan solo estos colores; si cambias uno en `LAYOUT.col`, corre `node tools/build/build.js` y `python tools/gen_placeholders.py`.

| nombre | hex | uso |
|---|---|---|
| guinda | #1E4FA3 | azul medio: relleno de botones y tarjetas |
| guinda_osc | #0E2550 | azul marino: fondos de paneles y ventanas |
| vino | #2F6FD0 | azul vivo: botón en hover, bordes de indicadores |
| dorado | #F2C230 | amarillo: bordes, barras, acentos |
| dorado_claro | #FFE58A | amarillo claro: títulos y nombres |
| crema | #FFFFFF | blanco: texto principal, carta |
| crema_osc | #D6E2F5 | blanco azulado: texto secundario |
| tinta | #0B1A33 | texto sobre fondos claros |
| azul | #12407F | avisos, chips de elección |
| azul_cl | #5B9BEA | barras de Nayarit y rivales |
| verde | #3E9E5F | acierto, reelección |
| rojo | #D2453A | error, peligro, derrota |
| ambar | #E58A1F | resultado intermedio |
| gris | #8A93A6 | desactivado |
| negro | #060F22 | pistas de barras, capa de pausa |
| blanco | #FFFFFF | destellos |
