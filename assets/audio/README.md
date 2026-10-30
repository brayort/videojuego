# Audio de Director UAN

Todos los archivos de esta carpeta se generan de forma procedural con `tools/gen_audio.py`
(sintesis propia con Python + numpy, sin muestras ni grabaciones de terceros) y se codifican a OGG Vorbis con ffmpeg
(si no hay ffmpeg con libvorbis quedan en WAV). `audio.json` es el manifiesto que lee `src/build.js`.

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
    node src/build.js && node src/assets_demo.js

Para reemplazar un sonido, conserva el nombre de archivo (o cambia la ruta en `audio.json`) y vuelve a correr `build.js` y `assets_demo.js`.
