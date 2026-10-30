const fs=require('fs');const P=require("path").join(__dirname,"..","..","src","cartas.json");
const d=JSON.parse(fs.readFileSync(P,'utf8'));
if(d.cartas.some(c=>c.id==='cal_arranque')){console.log('ya aplicado');process.exit()}
Object.assign(d.personajes,{
 emisario:"Lic. Sebastián Ferreira, enlace del Gobernador",
 candidato:"Dr. Arnulfo Quezada, aspirante a rector",
 auditora:"C.P. Nélida Avendaño, auditora",
 periodista:"Karla Montes, periodista de investigación",
 proveedor:"Cuauhtémoc Reyes, de Servicios Integrales Pacífico Norte",
 predecesor:"Ex director {ant}",
 decano:"Consejero decano Fausto Meléndez"});
d.items={grabacion_tesorero:"Grabación del tesorero",oficio_auditoria:"Oficio de la auditoría",carta_gobernador:"Carta compromiso del Gobernador",expediente_plagio:"Expediente de plagio",usb_rector:"USB del rector",contrato_fantasma:"Contrato de la empresa fantasma",cheques_copia:"Copia de cheques"};
d.finales.epi_corrupto="EPÍLOGO. Años después, una auditoría independiente abre tus cajones. Aparecen contratos, favores y silencios comprados. No fue una sola decisión, fue el hábito de ceder. Los pasillos de la Unidad todavía guardan tu nombre, pero lo pronuncian en voz baja y con cuidado de no ser escuchados.";
d.finales.epi_gris="EPÍLOGO. Nadie te levantará un monumento ni te abrirá un expediente. Hiciste lo que se pudo con lo que había: unas veces con firmeza, otras con prudencia, algunas con dudas que prefieres no revisar. La historia te recordará como un director de transición, y quizá eso fue lo más honesto que permitía el cargo.";
d.finales.epi_integro="EPÍLOGO. Te fuiste con el escritorio vacío y las cuentas claras. Perdiste batallas, pero no el apellido. Cada tanto, una generación de egresados cuenta que hubo un director que decía que no cuando convenía decir que sí. En una universidad pública, a veces eso es lo más parecido a una victoria.";
d.mini={
 presupuesto:{rubros:["Nómina","Becas","Infraestructura","Investigación"]},
 prensa:{preguntas:[
 {q:"¿Es cierto que la Unidad perdió puntos en el ranking nacional?",a:[["Bajamos dos lugares; presentaremos un plan con metas medibles.",2],["Esos rankings no miden lo que hacemos.",1],["No tengo por qué responder eso.",0]]},
 {q:"Hay denuncias de que cobran cuotas ilegales a los alumnos. ¿Qué responde?",a:[["Que presenten pruebas; abrimos un buzón y revisaremos cada caso.",2],["Es una calumnia de gente que quiere desprestigiarnos.",0],["Son cooperaciones voluntarias.",1]]},
 {q:"¿Cuánto gana usted y cuánto ganan sus coordinadores?",a:[["Los salarios son públicos y los publicaremos mañana mismo.",2],["Lo que marca el tabulador.",1],["Es información personal.",0]]},
 {q:"Los maestros dicen que usted los ignora. ¿Habrá paro?",a:[["Estamos en mesa de diálogo y queremos evitarlo.",2],["Si hay paro, se descuenta el día.",0],["Eso lo decide el sindicato, no yo.",1]]},
 {q:"¿Por qué se aprobó el contrato de la cafetería sin licitación?",a:[["No debió ser así. Pedí una revisión y se licitará de nuevo.",2],["Se hizo conforme a derecho, sin más.",1],["Pregúntele al tesorero.",0]]},
 {q:"Un egresado asegura que su tesis fue plagiada y nada pasó. ¿Qué dice?",a:[["Revisaremos el caso con el comité y con el afectado.",2],["Fue hace mucho tiempo.",0],["Todas las tesis pasan por filtros.",1]]},
 {q:"¿Cuántos alumnos desertaron este semestre?",a:[["Perdimos a 8 de cada 100; ya aplicamos tutorías y becas puente.",2],["Pocos, nada alarmante.",1],["No traigo la cifra.",0]]},
 {q:"¿Está de acuerdo con que el Gobernador intervenga en la Universidad?",a:[["La autonomía universitaria no se negocia.",2],["Colaboramos con todas las autoridades.",1],["Es un buen gobernador.",0]]},
 {q:"¿Piensa renunciar ante las presiones?",a:[["No; rendiré cuentas hasta el último día de mi periodo.",2],["Eso no está en mis planes.",1],["Qué clase de pregunta es esa.",0]]},
 {q:"Hay obra negra desde hace dos años en el edificio nuevo. ¿Dónde está el dinero?",a:[["Publicaremos el avance financiero y el calendario real.",2],["Está en proceso.",1],["Eso se heredó de la administración pasada.",0]]},
 {q:"¿Qué pasa con las becas? Los estudiantes aseguran que no les han pagado.",a:[["Hay un retraso de pago; el depósito sale esta semana y daré fechas.",2],["Se pagan cuando llegue el recurso.",1],["Algunos alumnos exageran.",0]]},
 {q:"¿La carrera de Economía todavía sirve para algo, director?",a:[["Sirve más que nunca: explica por qué se rompe lo que hoy rompe la región.",2],["Claro, tenemos buenos egresados.",1],["Eso depende de cada quien.",0]]},
 {q:"¿Hubo desvíos en la Unidad como en otras instituciones del país?",a:[["No lo descarto y por eso pedimos auditar todo.",2],["En esta Unidad no pasan esas cosas.",0],["Hablemos de logros, mejor.",1]]},
 {q:"¿Por qué no hay aire acondicionado en aulas si se cobran cuotas?",a:[["Priorizamos conectividad y biblioteca; presentaré el plan de climatización.",2],["Tiene razón, está horrible.",1],["Aquí se viene a estudiar, no a estar cómodo.",0]]}]},
 plagio:{originales:[
 "La inflación subyacente excluye los precios de energéticos y alimentos no procesados, según la serie del Banco de México.",
 "Se estimó un modelo de datos de panel con efectos fijos para 20 municipios de Nayarit (2010-2022).",
 "Los resultados sugieren una elasticidad ingreso de la demanda de vivienda menor a la unidad.",
 "A diferencia de lo reportado por otros estudios, nuestra muestra no encuentra efecto significativo del salario mínimo.",
 "Este trabajo contribuye a la literatura al medir la informalidad con la ENOE trimestral.",
 "Las limitaciones del estudio incluyen el tamaño de muestra y la ausencia de datos de empresas pequeñas.",
 "Se aplicó una encuesta propia a 312 productores de tabaco y agave entre 2022 y 2023.",
 "El capítulo dos revisa la teoría del consumidor y la contrasta con el comportamiento observado en tianguis locales.",
 "Se agradece a la Dra. Carrillo por los comentarios y a mi familia por la paciencia.",
 "La prueba de Hausman rechaza la hipótesis nula, por lo que se prefiere el modelo de efectos fijos.",
 "Se construyó un índice de marginación propio con análisis de componentes principales.",
 "Propongo medir la desigualdad con coeficientes de Gini por localidad y no solo por municipio."],
 plagiados:[
 "Según Wikipedia (consultado en 2019), la inflación es el aumento sostenido de precios...",
 "[Copiado de tesis UNAM 2011, p. 45] La política monetaria es el conjunto de acciones...",
 "Como lo explicó ChatGPT: «En conclusión, es importante destacar que...»",
 "Ctrl+C Ctrl+V del capítulo 3 de Mankiw, con distinta tipografía y sin comillas.",
 "monografias.com — Resumen: La macroeconomía estudia los agregados de la economía...",
 "Texto idéntico a la tesis de Sánchez (2014), incluso con la misma errata en la página 12.",
 "Párrafo en inglés traducido con Google, con 'el mercado de pulgas' en lugar de 'mercado informal'.",
 "«Según mi asesor, que ya lo dijo en otro libro» (el libro no existe en el catálogo).",
 "Gráfica con la marca de agua de otra universidad y los datos de otro país.",
 "Bibliografía con 40 fuentes; ninguna aparece citada en el texto. Todas copiadas de otra tesis.",
 "Encontramos este mismo párrafo en 6 tesis más; cambia solo el nombre del estado.",
 "Fragmento de blog personal pegado como si fuera marco teórico, con emoji incluido."]},
 consejo:{args:{datos:"Citar indicadores y evidencia",dinero:"Mostrar el ahorro y el costo",alumnos:"Hablar del impacto en los estudiantes",politica:"Recordar quién respalda la propuesta"},
 consejeros:[
 {n:"Dr. Fausto Meléndez",d:"Estadístico obsesivo; desconfía de todo lo que no tenga cifras.",ok:"datos",mal:"politica"},
 {n:"Mtra. Concepción Haro",d:"Ex tesorera, cuida cada peso como si fuera suyo.",ok:"dinero",mal:"alumnos"},
 {n:"Consejero Bryan Ocampo",d:"Representante estudiantil, vive en las asambleas.",ok:"alumnos",mal:"dinero"},
 {n:"Dr. Efraín Villaseca",d:"Operador político; le interesa qué opina la Rectoría.",ok:"politica",mal:"datos"},
 {n:"Dra. Marcela Peñaloza",d:"Investigadora SNI; escucha a quien llega con evidencia.",ok:"datos",mal:"dinero"},
 {n:"Mtro. Jacinto Robles",d:"Sindicalizado de la vieja guardia, recela de la política.",ok:"alumnos",mal:"politica"},
 {n:"Consejera Yadira Salcedo",d:"Administradora pragmática: si cuesta menos, está de acuerdo.",ok:"dinero",mal:"datos"},
 {n:"Dr. Octavio Mercado",d:"Cercano al Gobernador; vota con quien tenga más padrinos.",ok:"politica",mal:"alumnos"}]}};

const cs=[];
const o=(t,e,x)=>Object.assign({t,e},x||{});
const c=(id,pj,texto,izq,der,x)=>cs.push(Object.assign({id,pj,texto,izq,der},x||{}));
const mini=(tipo,bien,mal,x)=>Object.assign({tipo,bien,mal},x||{});
const Z=[0,0,0,0];

// ---- CALENDARIO ----
c('cal_arranque','secretaria',"Arranca el semestre. Hay 214 grupos, 31 sin maestro y la fotocopiadora sigue descompuesta. ¿Cómo abres el ciclo?",
 o("Contratar interinos de emergencia",[-3,4,-5,0]),o("Fusionar grupos pequeños",[2,-5,4,0]),{sem16:0,unica:false});
c('cal_vacaciones','lider_sindical',"Se acerca el receso vacacional y el sindicato pide cerrar la Unidad dos semanas completas, con prima vacacional incluida.",
 o("Conceder el cierre",[-2,-3,-4,4]),o("Mantener guardias mínimas",[2,2,0,-5]),{sem16:10,unica:false});
c('cal_federal','diputado',"Noviembre: se discute el Presupuesto de Egresos de la Federación y la subvención a las universidades podría recortarse. Alguien tiene que mover el reparto interno.",
 o("Cabildear con diputados",[0,0,-2,3],{int:-3}),o("Reasignar el presupuesto yo mismo",Z,{mini:mini('presupuesto',[3,2,4,0],[-5,-4,-4,0])}),{semana:[13,65,117],unica:false});
c('cal_elecciones','emisario',"Se acercan las elecciones estatales de 2027. Los partidos buscan el auditorio de la Unidad y los votos del personal. Todos quieren una foto contigo.",
 o("Cerrar la Unidad a actos de campaña",[3,2,0,-8],{int:4}),o("Abrir foro a todos los candidatos",[-2,0,3,8],{int:-2}),{semana:94});
c('cal_aniversario','rector',"Aniversario de la Unidad. El Rector quiere un homenaje con tamales, banda y un discurso de media hora. Alguien dijo que sería mejor invertir en el laboratorio de cómputo.",
 o("Celebrar con sobriedad",[3,2,2,-3],{int:2}),o("Gran fiesta con invitados",[-2,2,-6,6]),{semana:40});
c('cal_cierre','secretaria',"Se cierra el sexto semestre de tu gestión. Se te acumulan los oficios y todos quieren entregar un último informe. ¿Qué reportas?",
 o("Informe honesto, con pendientes",[2,2,-2,-4],{int:5}),o("Informe de logros, sin pendientes",[-2,-2,2,5],{int:-5}),{semana:96});

// ---- MINIJUEGOS ----
c('m_pres1','tesorero',"Cierre de año: tenemos 100 millones y cuatro rubros que juran que sin más se acaba el mundo. Reparte tú el presupuesto o delega en mí.",
 o("Repartirlo yo mismo",Z,{mini:mini('presupuesto',[4,3,3,3],[-5,-4,-4,-2])}),o("Delegar al tesorero",[-2,-2,3,-3],{int:-3}),{unica:true,peso:1.5});
c('m_pres2','coordinador',"Llegó el recorte federal del 8%. Si no ajustamos hoy, nos quedamos sin luz en enero. Hay que redistribuir los 100 millones.",
 o("Hacer el ajuste yo",Z,{mini:mini('presupuesto',[3,2,5,2],[-6,-5,-3,-3])}),o("Cobrar cuotas extra",[-3,-9,6,-2]),{unica:true});
c('m_pres3','lider_sindical',"Hay remanentes por 100 millones sin ejercer y varias áreas los reclaman. El sindicato quiere nómina; los alumnos, becas. Tú decides.",
 o("Mediar el reparto",Z,{mini:mini('presupuesto',[3,4,2,3],[-4,-5,-3,-3]),int:2}),o("Guardarlo en reserva",[-2,-5,7,-2]),{unica:true});
c('m_prensa1','reportero',"Cayó el ranking de la Unidad y los medios piden tu postura. Chuy Armenta convocó una rueda de prensa para mañana a las 10.",
 o("Dar la rueda de prensa",Z,{mini:mini('prensa',[3,4,0,5],[-4,-5,0,-6])}),o("Enviar un comunicado",[0,-2,0,-3]),{unica:true,peso:1.5});
c('m_prensa2','reportero',"Se rumora un paro de labores. Hay cámaras afuera de tu oficina y un micrófono que no deja de acercarse a tu cara.",
 o("Salir a dar la cara",Z,{mini:mini('prensa',[3,4,0,4],[-3,-6,0,-5])}),o("Salir por la puerta de atrás",[0,-4,0,-2],{int:-3}),{unica:true});
c('m_prensa3','reportero',"Anunciaste un ajuste de cuotas y la nota ya es «UAN cobra más». Armenta pide aclarar frente a todos los medios.",
 o("Aclarar en rueda de prensa",Z,{mini:mini('prensa',[2,4,3,3],[-3,-7,0,-4])}),o("No hablar del tema",[0,-3,2,-2]),{unica:true});
c('m_plagio1','profesora_sni',"Llegaron 20 tesis de maestría a revisión y el software dejó pasar casi todas. Me temo que hay copiadas. ¿Las revisas conmigo?",
 o("Revisarlas personalmente",Z,{mini:mini('plagio',[7,2,0,1],[-6,-3,0,-2],{bien_item:'expediente_plagio',bien_int:3})}),o("Confiar en el software",[-4,0,0,0],{int:-3}),{unica:true,peso:1.5});
c('m_plagio2','abogada',"Una denuncia anónima afirma que un funcionario del Gobierno estatal plagió su tesis en nuestra facultad. Hay que revisar un lote de documentos del archivo.",
 o("Revisar el archivo",Z,{mini:mini('plagio',[4,0,0,3],[-3,0,0,-5],{bien_item:'expediente_plagio'})}),o("Archivar la denuncia",[-2,-2,0,4],{int:-6}),{unica:true});
c('m_consejo1','consejera',"La reforma curricular llega al Consejo Técnico. Sin mayoría no pasa, y cada consejero tiene su carácter. Te toca convencerlos uno por uno.",
 o("Ir al Consejo a convencerlos",Z,{mini:mini('consejo',[7,3,0,3],[-5,-3,0,-3])}),o("Aplazar la reforma",[-4,0,0,2]),{unica:true,peso:1.5});
c('m_consejo2','secretaria',"El nuevo reglamento de evaluación docente se vota hoy. Varios consejeros siguen indecisos y la sesión empieza en cinco minutos.",
 o("Cabildear antes de la sesión",Z,{mini:mini('consejo',[5,0,2,3],[-3,0,-2,-4])}),o("Votar tal cual",[1,-2,0,-3]),{unica:true});
c('m_consejo3','rector',"Quieres destituir a un coordinador negligente, pero hace falta la mayoría del Consejo. Los consejeros te miran con cautela.",
 o("Buscar la mayoría",Z,{mini:mini('consejo',[5,3,0,3],[-2,-4,0,-5]),int:2}),o("Dejarlo en su cargo",[-4,-3,0,0]),{unica:true});

// ---- ITEMS ----
c('it_grab','tesorero',"Landeros te susurra: grabó a un proveedor ofreciendo comisiones a cambio de contratos. «Por si algún día hace falta», dice, y te ofrece el audio.",
 o("Guardarla bajo llave",[0,0,-1,-2],{item:'grabacion_tesorero',int:-2}),o("Que la destruya, no quiero saberlo",[0,0,0,2],{int:2}),{unica:true});
c('it_use_grab','empresario',"Villaseñor exige un contrato inflado para remodelar la cafetería. Me lo prometió el tesorero, dice, y tú sabes cómo se cobran los favores.",
 o("Firmar el contrato",[-2,0,-7,6],{int:-8}),o("Rechazarlo",[1,2,2,-5],{int:4}),{reqitem:['grabacion_tesorero'],unica:true,
 arriba:o("Ponerle la grabación enfrente",[2,0,5,-2],{usa:'grabacion_tesorero',int:6,set:['grab_usada']})});
c('it_oficio','auditora',"Nélida Avendaño te entrega un oficio con observaciones de la auditoría superior: 11 pagos sin soporte. Es un documento que pocos quieren ver.",
 o("Guardar el oficio",[0,0,-2,-2],{item:'oficio_auditoria',int:3}),o("Pedirle que lo reserve",[0,0,2,3],{int:-4}),{unica:true});
c('it_use_oficio','diputado',"El diputado Sandoval te cita a comer y deja claro que quiere \"cerrar con discreción\" las observaciones de la auditoría y pasar a otro asunto.",
 o("Aceptar la discreción",[0,-2,3,6],{int:-8}),o("Cambiar de tema",[0,0,0,-4]),{reqitem:['oficio_auditoria'],unica:true,
 arriba:o("Mostrarle el oficio original",[2,0,3,-6],{usa:'oficio_auditoria',int:8})});
c('it_usb','secretaria',"Lupita encontró una USB olvidada en la oficina del Rector: contiene minutas de reuniones con el sindicato y con el Gobernador. «Yo no la vi», dice.",
 o("Copiarla y guardarla",[0,0,0,3],{item:'usb_rector',int:-4}),o("Devolverla sin abrirla",[0,0,0,-2],{int:5}),{unica:true});
c('it_use_usb','lider_sindical',"Leonel Ibarra amenaza con paralizar la Unidad si no se le respeta un acuerdo que, según él, hizo el Rector con el sindicato en secreto.",
 o("Ceder a sus demandas",[-2,-3,-5,5],{int:-3}),o("Mantenerme firme",[2,2,2,-5],{int:3}),{reqitem:['usb_rector'],unica:true,
 arriba:o("Mostrarle las minutas",[1,0,3,2],{usa:'usb_rector',int:-2})});
c('it_cheques','auditora',"Una empleada, bajo anonimato, te entrega copias de cheques firmados a nombre de una empresa de papel. «No sé qué son, pero algo huele mal».",
 o("Archivar las copias",[0,0,0,-2],{item:'cheques_copia',int:2}),o("Pedir que las olvide",[0,0,2,2],{int:-6}),{unica:true,peso:0.8});
c('it_use_cheques','abogada',"El abogado externo de Servicios Integrales amenaza con demandar por daño moral si seguimos preguntando por los pagos de aquella empresa.",
 o("Dar marcha atrás",[-1,-2,2,3],{int:-5}),o("Resistir la demanda",[0,2,-3,-3],{int:4}),{reqitem:['cheques_copia'],unica:true,
 arriba:o("Responder con las copias de cheques",[2,0,3,-2],{usa:'cheques_copia',int:7})});

// ---- CADENA A: ELECCIÓN DE RECTOR ----
c('el1','rector',"Mi periodo termina en primavera. Se abre la convocatoria para rector y la comunidad espera saber con quién estará la Unidad de Economía.",
 o("Impulsar una planilla académica",[4,2,-2,-4],{set:['el_inicio','el_academica']}),o("Mantener neutralidad",[0,0,0,0],{set:['el_inicio','el_neutral'],int:1}),{unica:true,peso:1.5});
c('el2','emisario',"Ferreira llega con una sonrisa. El Gobernador respalda al Dr. Arnulfo Quezada para rector y ofrece ampliación presupuestal a quien lo apoye. Hay un compromiso por escrito.",
 o("Rechazar la injerencia",[3,3,-5,-7],{set:['el_rechaza_gob','legado_independencia'],int:8}),o("Aceptar el apoyo",[-3,-3,8,8],{set:['el_acepta_gob','legado_pacto_gobernador'],int:-10,item:'carta_gobernador'}),{req:['el_inicio'],unica:true});
c('el3a','candidato',"Soy Arnulfo Quezada. Con su respaldo me comprometo a respetar a la Unidad. Solo necesito que movilice a sus profesores en el Consejo el día de la votación.",
 o("Movilizar a mis profesores",[-2,-2,3,5],{set:['el_movilizas'],int:-6}),o("Apoyar sin presionar",[1,1,0,2],{set:['el_apoyo_suave']}),{req:['el_acepta_gob'],unica:true});
c('el3b','estudiante',"Hay un foro de candidatos y Dafne quiere que organices el debate. Tres planillas, incluida la que apoya el Gobernador, y miles de alumnos mirando.",
 o("Organizar el foro con reglas claras",[3,5,-2,-3],{set:['el_foro'],int:4}),o("Dejarlo a los alumnos",[0,3,1,-2],{set:['el_foro']}),{req:['el_rechaza_gob'],unica:true});
c('el4','consejera',"El Consejo vota dentro de una semana. Marisol Quintero calcula que estamos a dos votos de la mayoría. Hay que convencer a los indecisos.",
 o("Hacer campaña en el Consejo",Z,{mini:mini('consejo',[3,2,2,4],[-3,-2,-2,-5],{bien_set:['el_voto_ok'],mal_set:['el_voto_mal']})}),o("Dejar que voten solos",[0,0,0,0],{set:['el_voto_mal']}),{req:['el_inicio'],unica:true});
c('el5','reportero',"Armenta publica: «¿Elige el Gobernador al próximo rector?» Pide tu postura y si has recibido llamadas.",
 o("Responder con transparencia",[2,3,-2,-5],{set:['el_prensa'],int:5}),o("Negar todo",[-2,-3,0,5],{set:['el_prensa'],int:-6}),{req:['el_voto_ok'],unica:true});
c('el6a','emisario',"Ganó Quezada. Ferreira viene a cobrar: quiere plazas de confianza para allegados del Gobernador y acceso al padrón de becas.",
 o("Negarme a entregar el padrón",[3,3,-4,-8],{set:['el_final_gob_bajo'],int:6}),o("Entregar plazas y padrón",[-6,-7,6,9],{set:['el_final_gob_alto','legado_pacto_gobernador'],int:-12}),{req:['el_acepta_gob','el_voto_ok'],unica:true});
c('el6b','candidato',"Perdió Quezada. El Gobernador está molesto y vi una nota: congelaron el apoyo extraordinario que prometieron.",
 o("Buscar recursos propios",[0,0,-6,-3],{set:['el_final_pierde']}),o("Pedir disculpas al Gobernador",[-2,-2,3,6],{set:['el_final_pierde'],int:-5}),{req:['el_acepta_gob','el_voto_mal'],unica:true});
c('el6c','rector',"La planilla académica ganó, sin respaldo del Gobernador. El nuevo rector es de otra facultad pero respetado. Tu reputación crece, y tus enemigos también.",
 o("Felicitar y ofrecer colaboración",[4,3,-2,-3],{set:['el_final_academica','legado_independencia'],int:3}),o("Pedir un cargo en su equipo",[2,0,2,4],{set:['el_final_academica'],int:-4}),{req:['el_rechaza_gob','el_voto_ok'],unica:true});
c('el6d','emisario',"Ganó la planilla del Gobernador a pesar de tu rechazo. Ferreira recuerda que «cada decisión tiene memoria» y que habrá auditorías sorpresa.",
 o("Hacer las paces por escrito",[0,-2,3,6],{set:['el_final_gob_alto'],int:-8}),o("Prepararme para resistir",[2,2,-4,-6],{set:['el_final_gob_bajo'],int:5}),{req:['el_rechaza_gob','el_voto_mal'],unica:true});
c('el7','rector',"Hubo cambios en la Rectoría. El resultado de la elección ya está en la Unidad: todos tienen opinión, nadie la dice en voz alta.",
 o("Hacer un balance público",[2,3,0,-3],{int:3}),o("Cerrar el tema",[0,-2,0,2]),{req:['el_final_academica'],unica:true});
c('el8','estudiante',"La elección de rector dejó una brecha. Los alumnos exigen que se publiquen las actas del Consejo para saber cómo votó cada quien.",
 o("Publicar las actas",[1,5,-2,-5],{int:6}),o("Mantenerlas reservadas",[0,-5,0,3],{int:-4}),{req:['el_inicio','el_voto_ok'],noreq:['el_final_academica'],unica:true});

// ---- CADENA B: DESFALCO / EMPRESA FANTASMA ----
c('ds1','tesorero',"Detecté pagos por 38 millones a «Servicios Integrales Pacífico Norte» en conceptos como «consultoría» y «mantenimiento». Nadie sabe quién trabajó ahí. Ni siquiera tienen domicilio fiscal.",
 o("Abrir una revisión interna",[1,0,-3,-3],{set:['ds_inicio','ds_revision'],int:4}),o("Dejarlo así por ahora",[0,0,3,2],{set:['ds_inicio','ds_ignora'],int:-8}),{unica:true,peso:1.5});
c('ds2','auditora',"Avendaño entrega los primeros hallazgos: la empresa se constituyó hace seis meses, el domicilio es un baldío y el apoderado comparte apellido con un funcionario de Finanzas.",
 o("Sumarme y pedir apoyo de la Auditoría Superior",[1,0,-2,-4],{set:['ds_auditoria'],int:5,item:'oficio_auditoria'}),o("Frenarlo: puede ser un error contable",[0,0,2,3],{set:['ds_frenado'],int:-8}),{req:['ds_revision'],unica:true});
c('ds2b','periodista',"Karla Montes me dice que sus fuentes le pasaron una copia de los contratos. Si nadie la contradice, publica una investigación de ocho páginas sobre la «estafa maestra local».",
 o("Dar acceso a los documentos",[2,3,-3,-6],{set:['ds_prensa'],int:6}),o("Pedir que no publique",[-2,-5,0,3],{set:['ds_presion'],int:-9}),{req:['ds_ignora'],unica:true});
c('ds3','proveedor',"Soy Cuauhtémoc Reyes. La empresa es legítima y cumplimos con lo contratado. Una conversación amable, de caballeros, resolvería todo y se hablaría de una «cooperación» para la Unidad.",
 o("Escuchar su propuesta",[0,0,5,3],{set:['ds_soborno'],int:-12}),o("Colgar y avisar al abogado",[0,0,-2,-3],{set:['ds_rechaza'],int:5}),{req:['ds_inicio'],unica:true});
c('ds4','tesorero',"Estoy asustado. Firmé pagos por instrucciones «de arriba» y ahora me siguen coches. Si tengo respaldo, entrego todo; si no, me voy del país.",
 o("Ofrecerle protección legal",[0,0,-2,-3],{set:['ds_testigo'],int:5,item:'contrato_fantasma'}),o("Deslindarme",[0,0,3,2],{set:['ds_sin_testigo'],int:-7}),{req:['ds_auditoria'],unica:true});
c('ds5','abogada',"El expediente está listo para denuncia penal. Si lo presentamos, el escándalo será grande, la Fiscalía tiene sus tiempos y hay quien nos quiere callar.",
 o("Presentar la denuncia",[2,2,-4,-8],{set:['ds_denuncia'],int:8,item:'cheques_copia'}),o("Solo hacer una queja administrativa",[0,0,1,2],{set:['ds_queja'],int:-3}),{req:['ds_testigo'],unica:true});
c('ds6','diputado',"Ramiro Sandoval llama: un «amigo» de la empresa quiere hablar contigo. Lo mejor sería no meternos con empresarios que tienen amigos en el Congreso.",
 o("Ceder a la presión",[0,-2,3,7],{set:['ds_cede'],int:-12}),o("Seguir adelante",[2,2,-3,-8],{set:['ds_sigue'],int:6}),{req:['ds_denuncia'],unica:true});
c('ds7','reportero',"La nota salió: «Estafa maestra en la UAN: 38 millones a una empresa fantasma». La gente está furiosa. Los estudiantes piden la renuncia del tesorero y la tuya.",
 o("Dar la cara y entregar archivos",Z,{mini:mini('prensa',[3,6,0,-2],[-3,-4,0,-6],{bien_set:['ds_prensa_bien'],bien_int:4,mal_int:-3})}),o("Culpar al tesorero",[-2,-5,2,3],{int:-8,set:['ds_culpa_tesorero']}),{req:['ds_prensa'],unica:true});
c('ds8','estudiante',"La sociedad de alumnos toma el edificio. Exigen una auditoría externa total y devolver el dinero a becas. Dafne dice que no quitará la toma sin una respuesta firme.",
 o("Aceptar la auditoría externa",[1,6,-4,-5],{set:['ds_auditoria_externa','legado_auditoria_abierta'],int:8}),o("Pedir tiempo",[0,-6,2,3],{set:['ds_tiempo'],int:-3}),{req:['ds_prensa'],unica:true});
c('ds9','auditora',"Con el contrato fantasma, las copias de cheques y el testimonio, tenemos todo para cerrar el caso. Falta decidir qué haremos con el dinero recuperado, que aún no es seguro.",
 o("Destinar lo recuperado a becas",[1,5,3,-3],{set:['ds_final_expuesto','legado_auditoria_abierta'],int:6}),o("Dejar que lo administre Tesorería",[0,0,5,0],{set:['ds_final_expuesto'],int:0}),{req:['ds_sigue'],unica:true});
c('ds10','periodista',"Han pasado semanas. El caso de la empresa fantasma se enfrió. ¿Seguirás con la investigación, o es mejor que el silencio haga su trabajo?",
 o("Seguir hasta el final",[2,2,-3,-5],{set:['ds_final_expuesto','legado_auditoria_abierta'],int:5}),o("Dejar que se enfríe",[0,0,3,3],{set:['ds_final_impune','legado_desfalco_impune'],int:-7}),{req:['ds_cede'],unica:true});
c('ds10b','proveedor',"Servicios Integrales cerró y reabrió con otro nombre. Reyes manda saludos: «No hay rencores, solo negocios». Y un sobre como muestra de buena fe.",
 o("Rechazar el sobre",[0,0,0,-3],{set:['ds_final_expuesto'],int:6}),o("Aceptarlo y callar",[0,0,5,4],{set:['ds_final_impune','legado_desfalco_impune'],int:-15}),{req:['ds_soborno'],unica:true});
c('ds11','secretaria',"Por la ventanilla pasa un correo que dice «seguimiento al caso Pacífico Norte». Alguien más ya lo leyó: está marcado como abierto. Y no fuimos nosotros.",
 o("Investigar quién fue",[0,0,-2,-2],{int:2}),o("Borrarlo",[0,0,0,1],{int:-5}),{req:['ds_final_expuesto'],unica:true});

// ---- DINASTÍA ----
c('suc1','predecesor',"Dejé una carpeta en el cajón de abajo. {ant} fue destituido por {causa} a las {antsem} semanas. Léela antes de firmar cualquier cosa, director.",
 o("Leerla con atención",[2,0,0,0],{int:1}),o("Tirarla y empezar de cero",[0,0,0,2]),{req:['sucesor'],semana:0,unica:true});
c('suc2','estudiante',"Dicen que vienes a reemplazar a {ant}. En el pasillo se comenta que cayó por {causa}. ¿Vas a ser distinto?",
 o("Prometer cambios reales",[1,5,-2,-2],{int:2}),o("Pedir que no me comparen",[0,-3,0,2]),{req:['sucesor'],unica:true});
c('suc3','emisario',"Saludos de parte del Gobernador. Tu antecesor dejó firmado un compromiso con nosotros. Venimos a honrarlo, ¿verdad?",
 o("Respetar lo pactado",[-2,-2,5,6],{int:-6}),o("Desconocer el compromiso",[2,2,-3,-8],{int:6,set:['legado_independencia']}),{req:['legado_pacto_gobernador','sucesor'],unica:true});
c('suc4','proveedor',"Reyes, de Servicios Integrales, otra vez. Con el director anterior teníamos un entendimiento de caballeros; confío en que lo retomemos.",
 o("Aceptar el entendimiento",[-2,0,6,3],{int:-12}),o("Cerrarle la puerta",[1,1,-2,-5],{int:6}),{req:['legado_desfalco_impune','sucesor'],unica:true});
c('suc5','auditora',"Soy Nélida Avendaño, de la auditoría. Nos quedó pendiente un seguimiento que su predecesor abrió. Quiero retomarlo con usted.",
 o("Dar acceso total",[2,2,-2,-3],{int:7}),o("Pedir tiempo para revisar",[0,0,1,1],{int:-1}),{req:['legado_auditoria_abierta','sucesor'],unica:true});
c('suc6','lider_sindical',"Con {ant} dejamos pendientes unos acuerdos laborales. Los trabajadores quieren que los cumplas. No somos como los de arriba que se van sin pagar.",
 o("Cumplirlos todos",[-2,-2,-6,4],{int:3}),o("Revisarlos uno por uno",[1,0,1,-3]),{req:['sucesor'],unica:true});
c('suc7','consejera',"El Consejo te pone a prueba. Sacó a {ant} por {causa} y no quiere repetir. ¿Cómo piensas evitarlo?",
 o("Informar cada mes al Consejo",[2,1,0,3],{int:3}),o("Confiar en mi criterio",[0,0,0,-3]),{req:['sucesor'],unica:true});
c('suc8','rector',"Dicen que el legado de la Unidad es de quien lo hereda. Te dejo el gafete de {ant} y mi consejo: no te cases con nadie, ni con tus propias ideas.",
 o("Conservar el gafete",[0,0,0,1],{set:['legado_gafete'],int:1}),o("Cambiar el protocolo",[1,0,-1,-1]),{req:['sucesor','legado_independencia'],unica:true});

d.cartas.push(...cs);
fs.writeFileSync(P,JSON.stringify(d,null,1));
console.log('cartas nuevas',cs.length,'total',d.cartas.length);
