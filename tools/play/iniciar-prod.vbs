' Levanta el servidor de produccion (public/) en segundo plano, sin ventana.
' Si el puerto 5190 ya esta en uso, el nuevo proceso termina solo y se sigue usando el que ya corre.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\hecto\Escritorio\videojuego"
sh.Run """D:\Node\node.exe"" tools\play\servir.js", 0, False
sh.Popup "Servidor de produccion en segundo plano (puerto 5190).", 3, "Fin de la Gestion", 64
