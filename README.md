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


## Paleta (LAYOUT.col, en `src/js/00_comun.js`)

Los sprites `Panel` (una animación por color), los textos y los botones usan solo estos colores; si cambias uno en `LAYOUT.col`, corre `node tools/build/build.js` y `python tools/gen_placeholders.py`.

| nombre | hex | uso |
|---|---|---|
| guinda | #6B1D2A | relleno de botones y tarjetas |
| guinda_osc | #3A0F18 | fondos de paneles y de ventanas modales |
| vino | #8E2B3B | borde de indicadores, botón en hover |
| dorado | #D4A63A | bordes, barras, acentos |
| dorado_claro | #F0D58A | títulos y nombres |
| crema | #F5ECD6 | texto principal, carta |
| crema_osc | #E2D2AC | texto secundario |
| tinta | #2B1B1F | texto sobre fondos claros |
| azul | #1F3A5F | avisos, chips de elección |
| azul_cl | #3E6296 | barras de Nayarit y rivales |
| verde | #3E8E5A | acierto, reelección |
| rojo | #B3372F | error, peligro, derrota |
| ambar | #C98A1B | resultado intermedio |
| gris | #8A7F78 | desactivado |
| negro | #140A0D | pistas de barras, capa de pausa |
| blanco | #FFFFFF | destellos |

## Audio, vibración y partículas

**Audio** (`src/js/05_audio.js`, archivos en `assets/audio/`). Los 16 efectos y las 3 pistas de música (oficina: menor y lenta; campaña: más pulso; destino 2040: ambiental) se generan por síntesis con `tools/gen_audio.py` (OGG si hay ffmpeg con libvorbis, si no WAV) y son **CC0** (ver `assets/audio/README.md`). `tools/build/assets.js` los registra como recursos `{"kind":"audio"}` (efectos con `preloadAsSound`, música con `preloadAsMusic`).
* El motor usa `gdjs.evtTools.sound.playSound(escena, archivo, false, volumen, pitch)` (volumen 0-100) y `playMusicOnChannel(escena, archivo, canal 1, true, volumen, pitch)`; si esa API no existe, cae a `getSoundManager()`. Pitch aleatorio leve en los sonidos repetitivos (generador propio: no altera el azar del juego).
* **Opciones** (Menú y Pausa): volumen de música y de efectos, silenciar, vibración y nombre del jugador; se guardan en `localStorage` (`directorUAN_ajustes`). La música empieza tras el primer toque/clic/tecla (regla de autoplay del navegador) y sigue entre escenas (las escenas ya no cortan el sonido al empezar).
* **Reemplazar sonidos con tus eventos**: cada sonido incrementa la variable de escena `SenalSonido` y deja su id en `SonidoUltimo` (`arrastre soltar voltear pagina sube baja golpe logro boton tic acierto error campana voto gong final`); también `MusicaPista` (pista actual) y `SenalVibracion`. Si pones `SonidosPropios = 1`, el motor deja de reproducir sonido y música y tú los manejas con eventos estándar. Para cambiar un archivo conserva el nombre (o edita `assets/audio/audio.json`) y vuelve a correr `build.js` y `tools/build/assets.js`.
* GDevelop solo incluye `gdjs.evtTools.sound` y el runtime de Leaderboards cuando algún evento estándar usa sus instrucciones. Por eso las escenas Menu y Juego traen el grupo `[AUTO] Runtime (audio y ranking; no se ejecuta)` con eventos que nunca se ejecutan (`RuntimeKeepAlive = 123456789`). **No lo borres.**

**Vibración**: `navigator.vibrate` (si existe; funciona en web Android y en la build Android): pulso corto al soltar la carta, doble pulso en cambios ≥ 15, patrón al caer el director, al terminar la historia y en los logros. Se activa/desactiva en Opciones.

**Partículas** (`src/js/55_efectos.js`): pool propio con el sprite `Particula` (no usa el ParticleEmitter de GDevelop), máximo 150 vivas; las que salen o mueren se reciclan. Confeti al ganar la elección, papeles al caer el director, chispas doradas en logros, polvo al salir la carta y lluvia en las cartas con `"fx":"lluvia"` (las del huracán).

## Ranking (Leaderboards de GDevelop)

El juego usa `gdjs.evtTools.leaderboards.savePlayerScore(escena, idTabla, puntos, nombre)` y `displayLeaderboard(escena, idTabla, true)`. Dos tablas:
* **Semanas de la dinastía**: puntos = semanas totales de la historia (suma de todos los directores).
* **Destino**: puntos = promedio de los 6 medidores de la UAN y Nayarit × 10 (0-1000); el nombre lleva el destino (`Nombre-Renacimiento`). GDevelop quita acentos, cambia espacios por `_` y recorta el nombre a 30 caracteres.

Mientras los ID valgan `PEGA_AQUI_EL_ID` o estén vacíos **no se llama a la API** y el botón **Ranking** (Menú y pantalla del Destino) muestra un mensaje explicativo. Las puntuaciones se envían una vez por historia al pulsar "Cerrar esta historia" o "Ranking" en el Destino.

**Nombre del jugador**: se pide una sola vez con `prompt()` del navegador al terminar la primera historia (solo si el ranking está configurado y disponible); si no hay `prompt()` o se cancela, se usa `DirectorNNNN`. Se cambia en Opciones > "Cambiar nombre".

### Pasos en el editor de GDevelop
1. Abre `game.json` en GDevelop 5 y guarda el proyecto en tu cuenta (nube) o regístralo: **Menú del proyecto > Game dashboard** (o Publicar > "Registrar el juego"). Los leaderboards solo existen para juegos registrados en tu cuenta, y el juego debe estar **publicado** (Publicar > Web, itch.io, Android...) para que las puntuaciones se envíen y se vean.
2. En **Game dashboard > Leaderboards** pulsa **Crear un nuevo leaderboard** y crea dos: `Semanas de la dinastía` y `Destino`. En ambos elige orden **descendente** (la mayor puntuación gana) y, si quieres, "una sola entrada por jugador" (mejor puntuación).
3. Abre cada leaderboard y usa **Copiar ID** (es un UUID tipo `a1b2c3d4-...`).
4. Pega los ID en `src/config.json`: `"semanas": "<id de Semanas de la dinastía>"`, `"destino": "<id de Destino>"`.
5. Cierra GDevelop, corre `node tools/build/build.js` y `node tools/build/assets.js`, y vuelve a abrir el proyecto.
6. Prueba: juega una historia hasta el Destino (o fuerza uno) y pulsa **Ranking**.

**Si el ranking dice "no disponible en esta versión"**: la exportación no incluyó la extensión Leaderboards. El grupo `[AUTO] Runtime` la usa con las instrucciones `Leaderboards::SavePlayerScore` y `Leaderboards::DisplayLeaderboard` (parámetros `["", id, puntos, nombre]` y `["", id, "no"]`, donde `""` es la escena actual). Los identificadores se tomaron del código fuente de la extensión (`Extensions/Leaderboards/JsExtension.js`) pero no pude comprobarlos abriendo el editor: si GDevelop marca esos eventos como inválidos, bórralos y crea a mano, en un evento que nunca se ejecute, las acciones "Guardar la puntuación del jugador" y "Mostrar un leaderboard" (categoría Leaderboards). También puedes activar la extensión en Proyecto > Gestionar extensiones.
