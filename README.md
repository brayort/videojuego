# Director UAN: Economía (GDevelop 5)

Juego de cartas tipo Reigns. Lógica en eventos JavaScript de GDevelop; contenido en `src/cartas.json`.

## Estructura

* `game.json`: proyecto GDevelop (ábrelo desde el editor). Escenas **Menu**, **Juego** y **Logros**.
* `src/js/*.js`: el motor, un archivo por sección (`00_comun`, `10_datos`, `20_estado`, `30_cartas`, `40_minijuegos`, `50_entrada`, `60_render`, `menu`, `logros`). Cada uno acaba como un evento JavaScript dentro de un grupo de eventos `[AUTO] ...`.
* `src/cartas.json`: contenido. Esquema y mecánicas: `src/ESQUEMA.md`.
* `src/build.js`: genera / **fusiona** `game.json`.
* `src/balance.js`: simulación de 5000 partidas por bot (también en dinastía continua, con la distribución de destinos y directores por historia) → `src/balance_reporte.txt`.
* `SPRITES.txt`: lista de arte a dibujar.

## Flujo de trabajo (editas arte en GDevelop y cartas en JSON)

1. Cierra el proyecto en GDevelop (o prepárate a **recargarlo**). Si el editor queda abierto y guarda, sobrescribe lo que haga el script.
2. Edita `src/cartas.json` (o `src/js/*.js`) y corre `node src/build.js`.
3. Abre / recarga `game.json` en GDevelop.

`build.js` **no sobrescribe**: si `game.json` existe, lo fusiona.
* Se conservan: recursos, animaciones de cada objeto, instancias, objetos extra que hayas creado, capas, propiedades del proyecto (nombre, tamaño, icono), variables y **todos tus eventos**.
* Solo se reemplazan los eventos generados: son los grupos cuyo nombre empieza por `[AUTO]`. No renombres ni metas tus eventos *dentro* de esos grupos (se pierden); ponlos fuera, antes o después. Si borras un grupo `[AUTO]` el siguiente build lo vuelve a crear.
* Se agregan los objetos, variables y escenas que falten.
* Antes de escribir se guarda `game.backup-AAAAMMDD-HHMMSS.json` junto a `game.json`.
* `node src/build.js --limpio` ignora el `game.json` existente (también con respaldo). `--destino=ruta.json` escribe en otro archivo.

## Usar el estado desde eventos normales de GDevelop

El motor publica cada frame variables de escena (`Academico`, `Estado`, `Fecha`, `SemanasEleccion`, ...) y señales (`SenalCarta`, `SenalFin`, ...). Ver la lista en `src/ESQUEMA.md`. El grupo `[AUTO] Ejemplos de eventos estandar` trae ejemplos que puedes copiar a tus propios eventos (por ejemplo: `Estado = "fin"` oculta `TxtInventario`; `Finanzas < 20` activa `AlertaFinanzas`).

Los objetos se crean por código; en la escena Juego puedes añadir animaciones a `Fondo`, `Carta`, `Retrato`, `IconoStat`, `Flash`, `BotonMini`, `Fragmento` (nombres en `SPRITES.txt`) y cambiar fuente/color de los textos; el motor ignora animaciones que no existan.

## Estructura del juego: caídas, destinos, UAN y Nayarit

* **Varios directores.** Cuando un director cae (stat en 0/100, elección perdida, retiro, límite, caída especial) NO es el final: se muestra "Fin de la gestión de X" con una línea de consecuencia para la UAN, luego Sucesión y Epílogo, y juega el siguiente director.
* **Meta-estado persistente.** Seis medidores 0-100 que empiezan en 50 y viven en la dinastía: Solvencia UAN, Paz Social, Autonomía, Prestigio UAN y, para el estado, Desarrollo y Seguridad de Nayarit. Se mueven con opciones (`uan`, `nay`), con la causa de cada caída, con el epílogo según la integridad y con las reelecciones limpias; los directores siguientes heredan la UAN (los stats iniciales se ajustan levemente). Cartas con `uansi` solo salen cuando los medidores cruzan umbrales (huelga del SPAUAN, rescate federal, intervención del Congreso, cambio de rector, reforma a la Ley Orgánica, privatización, alianzas).
* **Finales = destinos.** Tras 8 directores (`uan.n_directores`) o si algún medidor llega a un extremo, la historia termina con uno de 9 destinos de la UAN y de Nayarit (2040: Renacimiento, Motor del desarrollo, Último refugio, Quiebra y rescate, Huelga indefinida, Intervención estatal, Captura total, Torre de marfil, Sobrevivió) y una crónica de los directores que jugaste. Después la historia se archiva en la **Crónica** del Menú y se reinicia todo (los logros se conservan).
* **Menú:** Nueva partida (siguiente director), Continuar, Logros, **Nueva historia** (reinicia dinastía y medidores; pide confirmar), **Crónica** (historias pasadas) y Créditos; muestra el estado actual de la UAN.
* Las variables de escena `UAN_Solvencia`, `UAN_Paz`, `UAN_Autonomia`, `UAN_Prestigio`, `Nay_Desarrollo`, `Nay_Seguridad`, `Historia` y `Destino` están disponibles para tus eventos. Detalle completo en `src/ESQUEMA.md`.

## Controles
Arrastrar la carta o flechas ←/→ (↑ usa expediente); Espacio/Enter/clic avanzan; minijuegos con ratón o teclas 1-3; **Escape** pausa (Continuar / Guardar y salir al menú). Se autoguarda en cada carta.
