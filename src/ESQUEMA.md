# Esquema de `cartas.json` y mecánicas del motor

Todo el contenido vive en `src/cartas.json`. Tras editarlo: `node build.js` (ver `README.md`).

## Estructura raíz

| clave | contenido |
|---|---|
| `personajes` | `id -> nombre mostrado`. El `id` es también el nombre de animación de `Carta` y `Retrato`. |
| `candidatos` | roster de profesores que pueden ser director (ver *Sucesión*). |
| `cartas` | lista de cartas. |
| `uan` | configuración del meta-estado: `n_directores`, `regresion`, `reeleccion`, `epilogo`, `deriva`, `nombres` (ver *Capa global*). |
| `caidas` | por causa de caída: `t` (consecuencia para la UAN), `uan`, `nay`; en los extremos de un medidor también `causa` y `texto`. |
| `destinos` | los FINALES del juego: 9 destinos de la UAN y de Nayarit (ver *Capa global*). |
| `finales` | textos de caída de director: `acad0/acad100/est0/est100/fin0/fin100/pol0/pol100`, epílogos `epi_corrupto/epi_gris/epi_integro/epi_retiro`, y `derrota`, `retiro`, `limite`. |
| `finales_raros` | caídas especiales por condición (Exilio, Homenaje, Desaparecido, Rector, Burnout, Diputado; ver abajo). |
| `items` | `id -> nombre` de expedientes. |
| `mini` | datos de los minijuegos (`presupuesto`, `prensa`, `plagio`, `consejo`). |

Stats: `e` es `[Académico, Estudiantes, Finanzas, Política]`, rango 0..100. Llegar a 0 o a 100 = destitución.
`int` = Integridad (0..100, oculta). Los textos admiten `{n}` (número de director), `{ant}`, `{causa}`, `{antsem}` (director anterior), `{dir}` (director actual) y `{ex}` (ex director).

## Carta

```json
{ "id": "x", "pj": "rector", "texto": "...", "izq": OPCION, "der": OPCION, "arriba": OPCION_EXPEDIENTE,
  "unica": true, "peso": 1, ...condiciones... }
```

`unica` (por defecto cada carta sale una vez; `false` = repetible con enfriamiento de 6 semanas; `true` = nunca se recicla aunque se agote el mazo). `peso` pondera la elección (x0.3 si el personaje repite).
`solo_luego: true` = nunca sale al azar, solo como consecuencia (`luego`).
`fx` (opcional): efecto visual mientras la carta está en pantalla. Hoy solo `"fx":"lluvia"` (gotas de lluvia; lo llevan las 4 cartas del huracán: `n_hurr_simulacro`, `hu1`, `hu1b`, `hu_impacto`). Valores desconocidos se ignoran. Lo dibuja `src/js/55_efectos.js` con el pool de partículas (máx. 150).

### Condiciones (cartas **y** finales raros)

| campo | significado |
|---|---|
| `req` / `noreq` | banderas que deben estar / no estar puestas. `reqitem`: expedientes requeridos. |
| `semana` (n o lista) / `sem16` | carta de calendario, forzada en esa semana (ventana de 2 semanas). `sem16:k` = semana k de cada semestre. |
| `uansi` | umbral de los medidores globales: `{"solv":"<30","des":">=60","prom":">50","min":">=40"}`. Claves `solv paz aut pre des seg` más `prom` (promedio de los seis) y `min`. Operadores `< <= > >= = !=`. Vale en cartas y en caídas especiales. |
| `semmin` / `semmax` | rango de semana de la partida. |
| `si` | umbral de stat: `{"fin":"<20","est":">=60","int":"<=25"}`. Claves `acad est fin pol int`; operadores `< <= > >= = !=`. |
| `afmin` / `afmax` | afinidad: `{"rector":3}` exige afinidad >= 3 (afmin) o <= valor (afmax). Pesan x3 en la elección; con \|afinidad\| >= 4 hay 25 % de forzar una de estas cartas ("aliado"/"enemigo"). |
| `desde` / `hasta` | era, `"AAAA-MM"` inclusive. La semana 0 es **septiembre 2025**, 1 carta = 1 semana. Cartas con `desde` pesan x3 mientras la época está activa. Ej.: Mundial `"2026-05".."2026-07"`, intermedias `"2027-05".."2027-06"`. |
| `de` | id de candidato: la carta se omite cuando ese profesor es el director (ya no es un personaje). |
| `rasgo` | solo sale si el director tiene ese rasgo. |
| `reelmin` / `reelmax` | solo con ese número de reelecciones. |
| `campana: true` | pertenece al mazo de campaña (solo sale en las últimas 8 semanas del mandato). |

## Opción (`izq`, `der`, `arriba`)

```json
{ "t": "Texto", "e": [0,0,0,0], "int": -3, "set": ["bandera"], "unset": ["bandera"], "item": "id", "usa": "id_expediente",
  "mini": "prensa" | {"tipo":"prensa","bien":[..],"mal":[..],"bien_set":[..],"mal_set":[..],...},
  "af": {"rector": 1}, "uan": [0,0,0,0], "nay": [0,0], "luego": {"semanas":4,"carta":"id"}, "estado": {...}, "quita": ["id_estado"],
  "azar": {...}, "cand": {"idealista": -2}, "conspira": "consejera", "fe": 2, "voto": {"est": 2},
  "retiro": true, "final": "exilio" }
```

Banderas `legado_*` se guardan en la dinastía y las heredan los siguientes directores. Los resultados de minijuego aceptan los mismos extras con prefijo `bien_` / `mal_` (`bien_af`, `mal_estado`, ...).

### Capa global: UAN y Nayarit

Las decisiones y las caídas de cada director cambian a toda la Universidad, no solo a la Unidad de Economía. El meta-estado vive en la dinastía (`directorUAN_dinastia`) y sobrevive a los directores. Medidores 0-100, que empiezan en 50:

| clave | nombre | qué mide |
|---|---|---|
| `solv` | Solvencia UAN | pensiones y subsidio |
| `paz` | Paz Social | sindicato (SPAUAN) y estudiantes |
| `aut` | Autonomía | independencia frente al gobierno estatal |
| `pre` | Prestigio UAN | acreditaciones, ranking, reputación |
| `des` | Desarrollo de Nayarit | empleo, economía y retención de jóvenes (migración) |
| `seg` | Seguridad en Nayarit | violencia y extorsión |

* Opciones: `"uan":[solv,paz,aut,pre]` y `"nay":[des,seg]` (efectos chicos, +-1..5; también `bien_uan`, `mal_uan`, y dentro de `azar`/resultados).
* Condición `uansi` en cartas y raros: eventos institucionales (huelga general del SPAUAN, rescate federal, Congreso del Estado, cambio de rector, reforma a la Ley Orgánica, privatización de servicios, alianzas con otras universidades).
* Cada **caída** de director aplica `caidas[causa]` (consecuencia institucional) y el epílogo por integridad (`uan.epilogo`); una **reelección limpia** (Integridad >= 55) aplica `uan.reeleccion`. Después los medidores regresan un poco hacia 50 (`uan.regresion`, institución que se recupera) y Nayarit se mueve con la UAN (`uan.deriva`: `des` sigue a Prestigio/Solvencia/Autonomía; `seg` sigue a Paz Social/Autonomía).
* Los directores siguientes heredan esa UAN: los stats iniciales se ajustan levemente (Prestigio->Académico, Paz->Estudiantes, Solvencia->Finanzas, Autonomía->Política; -5..+5).
* Se publican como variables de escena `UAN_Solvencia UAN_Paz UAN_Autonomia UAN_Prestigio Nay_Desarrollo Nay_Seguridad` y se muestran en el Menú, en el informe semestral y en la pantalla de Sucesión ("Estado de la UAN").

### Caídas y destinos (finales)

La salida de un director (stat en 0/100, elección perdida, retiro, límite, caída especial o un medidor en un extremo) es una **caída**: la pantalla dice "FIN DE LA GESTIÓN DE X", añade una línea de *Para la UAN: ...* y luego vienen Sucesión y Epílogo; **el juego continúa** con el siguiente director.

Los únicos **FINALES** del juego son los **destinos** (`destinos`), que cierran la historia completa:

* se disparan tras `uan.n_directores` directores (8 por defecto), o en cuanto algún medidor (UAN o Nayarit) llega a 0 o 100 (cae el director en curso con "LA UAN LLEGA A UN LÍMITE" y se muestra el destino);
* cada destino: `{id,titulo,ext:["solv0",...],cond,texto,detalle}`. `ext` lista los extremos que lo disparan; `cond` (objeto o lista = O, mismas claves que `uansi`) se evalúa en orden tras N directores y gana el primero; el último (`gris`) no tiene `cond`. `texto` narra 2040 y `detalle` menciona a la Unidad de Economía y a `{ant}` (el último director);
* la pantalla del destino añade la **crónica de la dinastía**: lista de directores con la causa de su caída;
* los 9 destinos: Renacimiento, Motor del desarrollo regional, Último refugio (violencia), Quiebra y rescate (Nayarit expulsor), Huelga indefinida, Intervención estatal, Captura total, Torre de marfil y Sobrevivió (gris, el más común);
* al cerrar el destino la historia se archiva en la **Crónica** (`directorUAN_cronica`, visible en el Menú) y se reinician la dinastía y los medidores. Los logros se conservan. El Menú ofrece **Nueva historia** (pide confirmación) para reiniciar en cualquier momento.

### Afinidad (-5..5)
`"af":{"rector":1}` suma afinidad con ese personaje (se muestra en pantalla, corazones/cruces). Cuenta además en las elecciones (un sector vota según su personaje) y en la sucesión (x2).

### Efectos retardados
`"luego":{"semanas":4,"carta":"id"}` (o lista) encola una carta que saldrá en 4 semanas (prioridad máxima al vencer). Usa `solo_luego:true` en la carta destino.

### Estados persistentes (buffs/debuffs)
`"estado":{"id":"paro","nombre":"Paro","semanas":3,"cada":[0,-2,-3,0],"int":0}`: aplica `cada` **cada semana** (incluida la actual) durante `semanas`. Se muestran en `TxtEstados`. Volver a aplicar el mismo `id` renueva su duración; `"quita":["paro"]` lo cancela.

### Opciones con probabilidad
`"azar":{"p":0.4,"exito":[e]|{e,set,int,af,estado,...},"fallo":[e]|{...},"msg_exito":"...","msg_fallo":"..."}`. El `e` normal de la opción se aplica siempre; el resultado se suma. En la vista previa se muestra `¿?` y `?` junto a los stats posibles.

`"ruido": n` (entero, opcional, en cualquier opción): variación oculta. Al elegir, a CADA stat que la opción ya afecta (`e[i] != 0`) se le suma un entero uniforme en [-n, n]. Si falta, se usa el ruido global `S.RUIDO` (20_estado.js, ahora 9). `"ruido":0` lo desactiva. No muestra `¿?`, no da mensaje y no cambia la vista previa (como en Reigns, el resultado exacto es algo incierto). Úsalo en lugar de un `azar` simétrico genérico; reserva `azar` para apuestas con texto propio.

### Minijuegos
`presupuesto`, `prensa`, `plagio`, `consejo` (sin cambios de esquema; ahora toleran datos faltantes sin romperse).

### Caídas especiales (finales raros de director)
`finales_raros`: `{"exilio":{"titulo":"Exilio","causa":"...","texto":"...", ...condiciones...}}`. Se evalúan tras cada decisión; si las condiciones se cumplen cae el director con esa caída especial (logro "Caída especial"), con un impacto mayor en los medidores (`caidas`). Incluyen: Exilio, Homenaje, Desaparecido (meterse demasiado con el crimen: banderas `crimen_a`, `crimen_b`, `crimen_c`), Rector (Política alta + afinidad con el rector + medidores sanos: bono global), Burnout (tres jornadas sin descanso) y Diputado (cooptado para 2027). También se activan con `"final":"id"` en una opción. Pueden recibir bonos en la sucesión (`favorece:{"exilio":3}` en candidatos).

## Candidatos y sucesión

```json
"candidatos":[{ "id":"idealista","pj":"idealista","nombre":"Mtro. Darío Esquivel","rasgo":"idealista",
  "faccion":"nueva generación","bonos":[3,6,-4,-4],"fuerza":10,"favorece":{"est0":5,"fin100":1} }]
```
`bonos` = ajuste a los stats iniciales cuando es director (se limitan a 8..92). `fuerza` base (10). `favorece` = puntos extra según la **causa de caída**: `acad0 acad100 est0 est100 fin0 fin100 pol0 pol100 derrota retiro limite` o el id de un final raro.

Rasgos con efecto mecánico (sobre las **decisiones** del director):

| rasgo | efecto |
|---|---|
| `sindicalista` | efectos de cartas de `lider_sindical` x0.5 |
| `tecnocrata` | Académico sube +20 % |
| `operador` | Política sube +20 % |
| `idealista` | Integridad inicial +15; Estudiantes sube +15 % |
| `veterano` | efectos negativos x0.85 |
| `hijo_exdirector` | afinidad inicial +2 con `rector`; efectos negativos x0.9 |

Fuerza de un candidato = `fuerza` + decisiones (`cand` y `conspira`, +2 y +3 si conspiró) + afinidad con su `pj` x2 + `favorece[causa]`. Las opciones mueven rivales con `"cand":{"id":±n}`; `"conspira":"id"` marca que ese candidato intriga (y le da +2). Al caer (stat en 0/100, final raro, derrota, retiro, límite) se muestra la pantalla **Sucesión** con el ranking y los motivos; gana la mayor fuerza (empate al azar) salvo en derrota electoral, donde gana quien ganó la elección. El sucesor empieza con stats base 50 + `bonos`, conserva la mitad de las afinidades y de la fuerza de los demás; el director caído pasa a ser el ex director (bandera `ex_aliado` si terminó con Integridad >= 55, retiro o límite; `ex_resentido` si no) y puede aparecer con cartas `req:["ex_aliado"]`/`["ex_resentido"]` (personaje `predecesor`, texto con `{ex}`). Si el sucesor había conspirado: logro **Brutus** y bandera `legado_brutus` (carta `mx_brutus`).

## Elecciones periódicas

* Al iniciar una gestión (y tras cada reelección) la duración se sortea entre **40 y 50 semanas**; se muestra "Elección en N semanas".
* Últimas **8 semanas**: campaña. 70 % de las cartas salen del mazo `campana:true`. Mueven tu **fuerza electoral** `fe`, el apoyo por sector `voto:{prof,est,trab,cons}` y la fuerza de los rivales (`cand`).
* Día de la elección (estado `eleccion`): votan **profesores 30 %**, **estudiantes 30 %**, **trabajadores 15 %**, **consejo 25 %**. Tu puntaje por sector depende de tus stats (Académico/Política→profesores, Estudiantes→estudiantes, Finanzas/Política→trabajadores, Política/Finanzas→consejo), la Integridad, la afinidad con el personaje del sector (x3), `voto` (x3) y `fe` (x1.5). Los 3 rivales más fuertes compiten con ventaja por rasgo en su sector; cada sector reparte su peso ∝ puntaje². Conteo animado sector por sector (clic/Espacio salta la animación).
* Ganas: **reelección** (+8 a cada stat hasta 90, +5 Integridad, logro "Otro periodo"), las cartas se endurecen: **efectos negativos x1.15 por reelección acumulada**. Límite **2 reelecciones**; la carta `mx_camp_reforma` (azar) pone la bandera `reforma` para intentar una tercera.
* Pierdes: el ganador te sucede (pantalla Sucesión) y quedas como ex director. Sin reelección posible: final `limite`. `"retiro":true` (carta `mx_camp_retiro`): retiro digno, epílogo propio y logro.
* Caer por stat en 0/100 sigue siendo destitución inmediata con su sucesión.

## Estados de pantalla (variable de escena `Estado`)
`carta`, `informe`, `mini`, `eleccion`, `fin` (caída de un director), `sucesion`, `epilogo`, `destino` (final de la historia), `pausa` (en el Menú `menu`, en Logros `logros`).

## Variables de escena que publica el motor (escena Juego, cada frame)

`Academico Estudiantes Finanzas Politica Integridad Semana Estado Personaje Director DirectorNombre Rasgo Fecha Mes Anio Afinidad Estados FinTipo Reelecciones SemanasEleccion Campana FuerzaElectoral Sucesor Record UltimoLogro UAN_Solvencia UAN_Paz UAN_Autonomia UAN_Prestigio Nay_Desarrollo Nay_Seguridad Historia Destino`

Señales (contadores que **aumentan** al ocurrir el evento; compara con el valor anterior o usa "Una sola vez" para disparar sonidos): `SenalCarta` (nueva carta), `SenalEleccion` (decisión tomada), `SenalFin`, `SenalAzar`, `SenalVoto`, `SenalLogro`.

Audio y ranking (todas las escenas): `SenalSonido` (cuenta sonidos; `SonidoUltimo` = id del último), `MusicaPista`, `SenalVibracion`, `SonidosPropios` (= 1 desactiva el sonido interno para que lo reproduzcas tú con eventos), `SenalRanking`, `PuntajeSemanas`, `PuntajeDestino`, `NombreJugador`, `RuntimeKeepAlive` (no tocar). Ver README, secciones Audio y Ranking. Variable global del juego `Modo` (`nueva|continuar`) la usa el Menú para comunicarse con la escena Juego.

El proyecto incluye eventos estándar de ejemplo (grupo `[AUTO] Ejemplos...`) que usan `VarSceneTxt`, `VarScene`, `ModVarScene`, `Cache` y `Montre`. Para sonido: evento con condición "Variable de escena `SenalCarta` ≠ valor previo" (guarda el previo en otra variable) y acción "Reproducir sonido".

## Guardado
`localStorage`: `directorUAN_partida` (autoguardado en cada carta, borrado al terminar la gestión), `directorUAN_dinastia` (director actual, legado, candidatos, ex director), `directorUAN_cronica` (historias terminadas), `directorUAN_logros`, `directorUAN_record`, `directorUAN_ajustes` (volúmenes, silencio, vibración, nombre del jugador). Pausa con **Escape**.

## Contenido de la Fase B (resumen)

* **362 cartas** (167 nuevas): actualidad mexicana con fechas (Mundial 2026, aranceles y T-MEC, impuesto a remesas, reforma judicial, austeridad, SECIHTI/SNI, intermedias 2027, Banxico, nearshoring, gentrificación en Riviera Nayarit, huracanes, sequía, LGES, IA, salud mental, desapariciones, extorsión, Ley Olimpia, LGBT+, pueblos wixárika y náayeri, deserción y egresados migrantes), 14 eventos institucionales con `uansi` (ids `u_*`), 40+ cartas con efectos `nay`.
* **6 arcos de personaje** de 6 cartas (5 por camino), condicionados por afinidad con `afmin`/`afmax` y banderas: `ar_chato*` (redención), `ar_lupita*` (lealtad), `ar_evaristo*` (enemigo o redención), `ar_gonzalo*` (aliado o enemigo), `ar_nieves*` (acceso universitario wixárika) y `ar_chayo*` (madre buscadora). Estructura: `X1 -> X2 -> X3a (afinidad >= 0) | X3b (afinidad < 0) -> X4 -> X5`.
* **3 cadenas largas**: `rc1..rc9` (estudiante reclutado vía falsa oferta laboral, con ramas de rescate o abandono), `hu*` (huracán, edificio B destruido y reconstrucción con fondos opacos; dos disparadores de temporada `hu1`/`hu1b`) e `in1..in9` (investigador SNI que descubre cifras maquilladas del INEGI). Usan `luego`, `estado`, `azar`, `item` y `arriba` (`base_tello`, `dictamen_cortes`).
* **25 cartas de campaña** (`campana:true`), **10 cartas de sucesor/ex director** (`n_suc_*`, `n_ex_*`, con `{ant} {causa} {antsem} {ex}`) y minijuegos con 6 cartas de presupuesto, 6 de prensa, 5 de plagio y 6 de consejo.
* Bancos de minijuegos ampliados: prensa 32 preguntas, plagio 24 originales + 24 plagiados, consejo 18 consejeros y 6 argumentos (`ley`, `comunidad` nuevos).
* **Balance**: se corrigieron las 20 cartas con opción dominante; Brutus depende de 6 intrigas con `azar` (en las que la conspiración solo ocurre en el resultado favorable de la tirada); `mx_est_obra` es única y su "posponer" lleva a `n_obra_techo`; la varianza no controlable es ahora el campo `ruido` (global `S.RUIDO`=9; se eliminaron 298 `azar` genéricos, quedan 18 escritos a mano) para que los jugadores prudentes también puedan caer. Métricas finales: `src/balance_reporte.txt`.
