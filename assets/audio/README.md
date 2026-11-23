# Audio de Fin de la Gestión

Todos los archivos de esta carpeta se generan de forma procedural con `tools/gen_audio.py`
(sintesis propia con Python + numpy/scipy, sin muestras ni grabaciones de terceros) y se codifican a OGG Vorbis con ffmpeg
(si no hay ffmpeg con libvorbis quedan en WAV de 16 bits con dither).

## Calidad del sonido

* **Estereo**, 44.1 kHz. Efectos en Vorbis q8 (~256 kbps) y musica en q6 (~192 kbps), codificados desde float32 (sin cuantizar antes).
* Filtros Butterworth y osciladores limitados en banda (sin aliasing); timbres con armonicos (FM, campana con parciales inarmonicos,
  piano electrico, pads con detune); reverb por convolucion con respuesta al impulso sintetica; saturacion suave y limitador con anticipacion.
* **Volumen coherente**: cada sonido se ajusta a un RMS objetivo por categoria (no solo al pico) y el pico queda en -1 dBFS.
* **Grave audible en celulares**: el golpe, el bombo y el bajo llevan armonicos sinteticos (150-900 Hz), porque las bocinas pequenas casi no
  reproducen por debajo de ~150 Hz.
* Los loops de musica incluyen la reverberacion plegada sobre el inicio: sin costura audible.
* Si algo suena fuerte o flojo, el nivel de cada sonido es el segundo argumento de `maestro(...)` en `tools/gen_audio.py` (RMS en dBFS). `audio.json` es el manifiesto que lee `tools/build/build.js`.

## Licencia

CC0 1.0 Universal (dominio publico): https://creativecommons.org/publicdomain/zero/1.0/
Puedes usarlos, modificarlos y redistribuirlos, incluso con fines comerciales, sin atribucion.
Si regeneras los sonidos con otro script o los reemplazas por los tuyos, la licencia de esos archivos sera la tuya.

## Contenido

`sfx/` (efectos): arrastre, soltar, voltear (carta), pagina, sube, baja, golpe (cambio grande), logro, boton, tic (temporizador),
acierto, error, campana (eleccion), voto (conteo), gong (sucesion), final (destino).

`musica/` (loops de 30-60 s, se reproducen a volumen bajo): oficina (tonalidad menor, tempo lento), campana (mas pulso), destino (ambiental).

## Regenerar

    python tools/gen_audio.py
    node tools/build/build.js && node tools/build/assets.js

Para reemplazar un sonido, conserva el nombre de archivo (o cambia la ruta en `audio.json`) y vuelve a correr `build.js` y `tools/build/assets.js`.
