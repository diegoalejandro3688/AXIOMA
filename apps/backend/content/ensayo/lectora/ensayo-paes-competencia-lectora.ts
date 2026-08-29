// ENSAYOS-LECTORA -- SOURCE del Ensayo PAES Competencia Lectora ZETRYND.
//
// Contenido editorial APPROVED / EDITORIALMENTE CLOSED, transcrito VERBATIM
// desde el paquete "ZETRYND — ENSAYO PAES COMPETENCIA LECTORA / MASTER
// IMPLEMENTATION PROMPT" (10 textos, 65 preguntas, con la Q19 DEFINITIVA
// CORREGIDA). Clasificacion (readingSkill + difficulty) y clave por pregunta
// del mismo paquete. Reutiliza la infraestructura de textos compartidos +
// tablas estructuradas cerrada en ENSAYOS-F2 (commit 5baa53f).
//
// Unicas adaptaciones aplicadas -- puramente tecnicas, contenido visible
// identico (ADR-0024):
//   - Marcadores markdown de enfasis (**...**) de la entrevista del Texto 4
//     -> texto plano (el renderer de parrafos no interpreta negrita).
//   - Cada linea del paquete -> un bloque 'paragraph' independiente, en orden.
//   - Las 3 tablas (Textos 2, 5 y 10) -> bloque 'table' estructurado de F2
//     (headers / rows / footnote), sin alterar ningun valor ni unidad.
//   - El titulo de cada texto se guarda en ExamPassage.title, no duplicado
//     dentro del contenido (arquitectura F2).
//
// Cero cambios de prosa, stems, distractores, respuesta correcta,
// explicaciones, habilidad, dificultad, titulos, valores de tabla ni mapping
// texto->pregunta. NO se importa desde este archivo directamente (eso es el
// importer) y NO forma parte del CONTENT_MANIFEST de Study.
import type { ExamSourceModule } from '../schema';

const module_: ExamSourceModule = {
  examKey: 'ENSAYO.LECTORA',
  title: 'Ensayo PAES Competencia Lectora',
  subjectKey: 'lenguaje',
  durationMinutes: 150,
  passages: [
    {
      passageKey: 'ENSAYO.LECTORA.T1',
      displayOrder: 1,
      title: 'El banco azul',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El lunes por la mañana, Elisa abrió la cortina metálica del antiguo taller de costura de su abuela Teresa. Habían pasado casi cuatro meses desde el funeral y, hasta entonces, nadie de la familia había querido entrar. El local debía quedar vacío el viernes, cuando un corredor recibiría las llaves para ponerlo en arriendo.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Elisa había viajado hasta el pueblo con una idea sencilla: separar lo que pudiera venderse, guardar unas pocas cosas y tirar el resto.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '—Vine a vaciar, no a recordar —le había dicho a su hermano por teléfono.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Dentro, todo parecía más pequeño de lo que conservaba en la memoria. Las cajas de hilos ocupaban una pared; las dos máquinas de coser seguían junto a la ventana y, bajo esta, permanecía el banco azul donde los clientes esperaban su turno.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'Elisa comenzó por los cajones. Encontró botones, cierres, agujas y trozos de tela cuidadosamente enrollados. En el último cajón había un cuaderno de tapas negras. Era el registro de trabajos de su abuela.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'Las primeras páginas eran normales: nombres, fechas, prendas y precios. Pero, a medida que avanzaba, las anotaciones se volvían menos previsibles.',
        },
        {
          type: 'paragraph',
          order: 6,
          text: '“Dobladillo pantalón de Marta. Pagado con dos kilos de mandarinas”.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: '“Cierre mochila de Matías. Pendiente: que venga a contarme si pasó de curso”.',
        },
        {
          type: 'paragraph',
          order: 8,
          text: '“Vestido de señora Elena. Sin cobro”.',
        },
        {
          type: 'paragraph',
          order: 9,
          text: 'En otras páginas aparecían dibujos infantiles, recetas escritas al margen e incluso la dirección de una persona acompañada por la frase: “Llevarle sopa el jueves”.',
        },
        {
          type: 'paragraph',
          order: 10,
          text: 'Elisa cerró el cuaderno.',
        },
        {
          type: 'paragraph',
          order: 11,
          text: 'Recordó entonces una chaqueta que su abuela le había reparado cuando ella tenía doce años. Elisa había protestado porque el remiendo se notaba demasiado.',
        },
        {
          type: 'paragraph',
          order: 12,
          text: '—Entonces no está arreglada —había dicho.',
        },
        {
          type: 'paragraph',
          order: 13,
          text: 'Su abuela había observado la costura antes de responder:',
        },
        {
          type: 'paragraph',
          order: 14,
          text: '—Una costura bien hecha no hace desaparecer la rotura. Hace que la tela pueda seguir usándose.',
        },
        {
          type: 'paragraph',
          order: 15,
          text: 'Al mediodía apareció don Félix, dueño del almacén vecino.',
        },
        {
          type: 'paragraph',
          order: 16,
          text: '—Pensé que quizá volverías a abrir —dijo, mirando las máquinas.',
        },
        {
          type: 'paragraph',
          order: 17,
          text: '—No sé coser como ella.',
        },
        {
          type: 'paragraph',
          order: 18,
          text: '—No pregunté eso.',
        },
        {
          type: 'paragraph',
          order: 19,
          text: 'Elisa sonrió, pero negó con la cabeza.',
        },
        {
          type: 'paragraph',
          order: 20,
          text: 'Don Félix se sentó unos segundos en el banco azul.',
        },
        {
          type: 'paragraph',
          order: 21,
          text: '—Aquí uno venía por un pantalón y terminaba contando media vida —dijo—. A veces tu abuela todavía no había empezado el arreglo cuando ya llevábamos una hora conversando.',
        },
        {
          type: 'paragraph',
          order: 22,
          text: 'Durante los días siguientes, Elisa continuó vaciando el local. Vendió los estantes, regaló varias cajas de materiales y guardó el cuaderno de tapas negras.',
        },
        {
          type: 'paragraph',
          order: 23,
          text: 'No cambió de opinión respecto del taller: no lo reabriría.',
        },
        {
          type: 'paragraph',
          order: 24,
          text: 'Sin embargo, el jueves llamó al centro comunitario del barrio y ofreció las dos máquinas para el curso de costura que funcionaba allí. Después preguntó a la bibliotecaria de la esquina si podía instalar el banco azul junto a la entrada.',
        },
        {
          type: 'paragraph',
          order: 25,
          text: 'El viernes, antes de entregar las llaves, se quedó unos minutos frente al local vacío.',
        },
        {
          type: 'paragraph',
          order: 26,
          text: 'En el lugar donde habían estado las máquinas quedaban dos rectángulos más claros sobre el piso.',
        },
        {
          type: 'paragraph',
          order: 27,
          text: 'Elisa apagó la luz y cerró.',
        },
        {
          type: 'paragraph',
          order: 28,
          text: 'Al caminar hacia la biblioteca vio el banco azul bajo una ventana. Dos personas estaban sentadas allí conversando.',
        },
        {
          type: 'paragraph',
          order: 29,
          text: 'No se detuvo, pero disminuyó el paso.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.LECTORA.T2',
      displayOrder: 2,
      title: 'Más que plantar: diseñar sombra',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando una ciudad anuncia la plantación de miles de árboles, la cifra suele presentarse como una medida directa de éxito ambiental. Sin embargo, contar árboles recién plantados dice poco acerca de la sombra que existirá años después.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Para estudiar este problema, el municipio de la ciudad ficticia de Río Claro comparó durante el verano tres zonas con características diferentes. Las mediciones se realizaron a las 15:00 en días despejados.',
        },
        {
          type: 'table',
          order: 2,
          headers: [
            'Zona',
            'Cobertura aproximada de copas',
            'Temperatura del pavimento',
            'Árboles plantados cinco años antes que seguían vivos',
          ],
          rows: [
            ['Avenida Norte', '8 %', '38,6 °C', '54 %'],
            ['Barrio Estación', '22 %', '34,2 °C', '76 %'],
            ['Parque Sur', '47 %', '29,8 °C', '89 %'],
          ],
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Los resultados muestran una asociación clara: las zonas con mayor cobertura de copas presentan, en estas mediciones, temperaturas más bajas. Sin embargo, los investigadores advierten que la tabla no permite atribuir toda la diferencia exclusivamente a los árboles. El material del pavimento, la altura de los edificios, la circulación de vehículos y la orientación de las calles también pueden modificar la temperatura.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'La vegetación puede enfriar los espacios de dos maneras principales. La primera es fácil de observar: las copas bloquean parte de la radiación solar y producen sombra. La segunda es menos visible. Al liberar agua hacia la atmósfera, las plantas consumen energía térmica mediante un proceso conocido como evapotranspiración.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'Pero plantar más no siempre significa enfriar mejor. Un árbol que muere dos veranos después de ser plantado aporta poco a la cobertura futura. Además, una especie adecuada para un parque amplio puede ser inconveniente en una calle angosta si sus raíces dañan infraestructura o si una copa excesivamente densa dificulta la circulación del aire.',
        },
        {
          type: 'paragraph',
          order: 6,
          text: 'También importa dónde se planta. Si una ciudad concentra sus nuevos árboles en sectores que ya poseen abundante vegetación, puede aumentar su cifra total sin reducir la exposición al calor de quienes viven en los barrios con menos sombra.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: 'Por estas razones, algunos especialistas proponen dejar de evaluar los programas urbanos únicamente mediante el número de ejemplares plantados. Sugieren observar, entre otros indicadores, la supervivencia después de varios años, el aumento efectivo de cobertura de copas y la distribución de esa cobertura en las zonas donde las temperaturas y la exposición de la población son mayores.',
        },
        {
          type: 'paragraph',
          order: 8,
          text: 'En otras palabras, una política de arbolado no debería preguntarse solamente cuántos árboles caben en la ciudad, sino qué sombra necesita la ciudad y dónde la necesita.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.LECTORA.T3',
      displayOrder: 3,
      title: 'Quince minutos sin pregunta',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En muchas salas de clases, leer es casi siempre el paso previo a hacer otra cosa. Se lee para responder un cuestionario, completar una guía, preparar una prueba o encontrar una cita que permita justificar una respuesta. Es comprensible: enseñar requiere comprobar aprendizajes. El problema aparece cuando el estudiante aprende que toda lectura será seguida inmediatamente por una obligación externa.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Por eso propongo algo bastante modesto: dos veces por semana, reservar quince minutos para que los estudiantes lean en silencio un texto elegido entre varias alternativas disponibles en la sala, sin recibir después una prueba ni una guía sobre esas páginas.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'La propuesta puede parecer extraña precisamente porque no promete un resultado inmediato y fácil de medir.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'No estoy sugiriendo reemplazar la enseñanza explícita de estrategias lectoras. Un estudiante necesita aprender a identificar información, construir inferencias, examinar argumentos y enfrentarse a vocabulario desconocido. Tampoco propongo que el profesor se desentienda de lo que ocurre. Puede seleccionar materiales diversos, recomendar lecturas, conversar con quienes no encuentran algo que les interese y ayudar cuando un texto resulta demasiado difícil.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'Lo que debería desaparecer durante esos quince minutos es otra cosa: la certeza de que cada párrafo será convertido de inmediato en una respuesta evaluada.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'Cuando toda lectura termina en una nota, es razonable que el estudiante adapte su manera de leer a la nota. Puede buscar rápidamente aquello que parece “preguntable”, avanzar mientras entienda lo suficiente para responder y abandonar las dudas que no tendrán efecto en su puntaje. Esa estrategia puede ser útil para ciertas tareas, pero no agota lo que significa leer.',
        },
        {
          type: 'paragraph',
          order: 6,
          text: 'La objeción más evidente es el tiempo. Los programas escolares son extensos y quince minutos parecen valiosos cuando todavía queda contenido por enseñar. Pero precisamente por eso la propuesta es pequeña: no se trata de dedicar una mañana completa ni de sustituir clases. Son treinta minutos semanales destinados a practicar algo que también esperamos de un lector competente: sostener la atención cuando nadie le indica exactamente qué información deberá recuperar después.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: 'Además, no toda consecuencia educativa necesita producirse al terminar una actividad. Aprender a tolerar algunas páginas difíciles, descubrir que un texto mejora después de un comienzo lento o abandonar razonadamente un libro para escoger otro son decisiones que forman parte de una lectura autónoma.',
        },
        {
          type: 'paragraph',
          order: 8,
          text: 'Si queremos estudiantes capaces de leer únicamente cuando una instrucción les señala qué buscar, podemos entrenar exclusivamente esa conducta. Si queremos también lectores que entren por voluntad propia en textos cuyo valor todavía desconocen, necesitamos ofrecerles alguna oportunidad de hacerlo.',
        },
        {
          type: 'paragraph',
          order: 9,
          text: 'Quince minutos no convertirán automáticamente a nadie en lector. Pero pueden ofrecer algo que una guía, por muy buena que sea, no puede ofrecer al mismo tiempo: un breve espacio en que continuar leyendo sea, durante unos minutos, una decisión del propio lector.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.LECTORA.T4',
      displayOrder: 4,
      title: 'Restaurar no es dejar nuevo',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Entrevista a Laura Méndez, conservadora de documentos gráficos',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '—Cuando alguien escucha la palabra “restauración”, suele imaginar un objeto que vuelve a verse como cuando era nuevo. ¿Ese es realmente el objetivo?',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '—No necesariamente. En conservación patrimonial, dejar algo “como nuevo” puede ser incluso una mala intervención. Un cartel de cine de 1940, por ejemplo, puede tener pequeñas pérdidas de color, dobleces o marcas de uso que forman parte de su historia. Nuestro trabajo no consiste en borrar automáticamente esas huellas, sino en evitar que el deterioro avance y permitir que el objeto pueda seguir siendo estudiado, exhibido o consultado.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: '—Entonces, ¿hay daños que se conservan deliberadamente?',
        },
        {
          type: 'paragraph',
          order: 4,
          text: '—Hay que distinguir. Una mancha provocada por humedad activa puede seguir destruyendo el papel y exige tratamiento. En cambio, una anotación hecha por el dueño de un libro hace setenta años puede tener valor histórico. Dos marcas que visualmente parecen “defectos” pueden exigir decisiones completamente distintas.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: '—¿Cómo se decide qué modificar?',
        },
        {
          type: 'paragraph',
          order: 6,
          text: '—Primero se estudia el objeto. Se identifica de qué materiales está hecho, qué intervenciones anteriores ha sufrido y qué riesgos enfrenta. Después intentamos aplicar tratamientos mínimos y, cuando es posible, reversibles. Si adherimos una pieza de refuerzo, por ejemplo, preferimos materiales que un conservador futuro pueda retirar sin dañar el original.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: '—¿Por qué importa que una intervención pueda revertirse?',
        },
        {
          type: 'paragraph',
          order: 8,
          text: '—Porque nuestro conocimiento también cambia. Una técnica considerada adecuada hoy puede dejar de serlo dentro de treinta años. No deberíamos obligar a quienes trabajen después de nosotros a cargar con una decisión imposible de deshacer.',
        },
        {
          type: 'paragraph',
          order: 9,
          text: '—¿Existe entonces una especie de límite ético?',
        },
        {
          type: 'paragraph',
          order: 10,
          text: '—Exactamente. Restaurar implica intervenir en un objeto que no nos pertenece solo a nosotros. Por eso documentamos lo que hacemos: fotografías, materiales utilizados, zonas tratadas y razones de cada decisión. Una buena restauración no intenta engañar al observador haciéndole creer que nunca ocurrió nada.',
        },
        {
          type: 'paragraph',
          order: 11,
          text: '—¿Eso significa que una reparación debería notarse?',
        },
        {
          type: 'paragraph',
          order: 12,
          text: '—No tiene por qué llamar la atención, pero tampoco debería falsificar el objeto. Hay una diferencia entre integrar visualmente una zona perdida y fabricar detalles sobre los que no existe evidencia. Si en una fotografía falta parte de un rostro, inventar un ojo porque “seguramente estaba ahí” sería cruzar esa línea.',
        },
        {
          type: 'paragraph',
          order: 13,
          text: '—¿Cuál es el error más frecuente de quienes intentan reparar objetos antiguos en casa?',
        },
        {
          type: 'paragraph',
          order: 14,
          text: '—Usar materiales demasiado agresivos o permanentes. Cinta adhesiva común, pegamentos domésticos y algunos métodos de limpieza producen daños que al principio no se ven. Muchas veces recibimos documentos en los que el problema original era pequeño, pero la reparación posterior terminó siendo más difícil de solucionar.',
        },
        {
          type: 'paragraph',
          order: 15,
          text: '—Entonces, ¿una restauración exitosa es aquella en que el restaurador hace mucho?',
        },
        {
          type: 'paragraph',
          order: 16,
          text: '—A veces es exactamente lo contrario. Una de las decisiones más difíciles es reconocer cuándo basta con estabilizar, almacenar correctamente y no intervenir más. Hacer menos también puede exigir conocimiento.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.LECTORA.T5',
      displayOrder: 5,
      title: 'El bosque también se escucha de noche',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante muchos años, estudiar la presencia de animales en un bosque significaba recorrer senderos, buscar huellas o permanecer varias horas observando. Esas técnicas continúan siendo útiles, pero actualmente los ecólogos disponen de otra herramienta: los grabadores acústicos automáticos.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Estos dispositivos pueden permanecer durante semanas sujetos a un árbol y registrar fragmentos de sonido a intervalos programados. Posteriormente, investigadores o programas informáticos analizan las grabaciones en busca de cantos, llamados y otros sonidos asociados a distintas especies.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Un equipo instaló grabadores durante treinta noches en tres sectores de un bosque. Todos los equipos utilizaron el mismo horario y configuración.',
        },
        {
          type: 'table',
          order: 3,
          headers: [
            'Sector',
            'Horas grabadas',
            'Especies acústicamente identificadas',
            'Registros de vocalizaciones',
          ],
          rows: [
            ['Quebrada', '120', '18', '640'],
            ['Bosque alto', '120', '24', '510'],
            ['Borde agrícola', '120', '13', '790'],
          ],
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'A primera vista, podría parecer extraño que el Borde agrícola tenga más registros de vocalizaciones que el Bosque alto, aunque en este último se identificaron más especies. La explicación es que cantidad de sonidos y cantidad de especies no son equivalentes. Una misma especie muy vocal puede producir cientos de registros, mientras varias especies silenciosas o poco frecuentes pueden aparecer pocas veces.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'También existen dificultades técnicas. La lluvia intensa puede ocultar sonidos; el viento puede activar falsamente algunos sistemas de detección, y una vocalización puede propagarse desde un animal situado lejos del dispositivo. Por eso un registro acústico no indica necesariamente que el individuo se encontraba justo al lado del grabador.',
        },
        {
          type: 'paragraph',
          order: 6,
          text: 'Además, no todos los animales producen sonidos fáciles de identificar. Una metodología basada únicamente en audio podría representar muy bien a ciertas aves o anfibios y, al mismo tiempo, pasar por alto organismos silenciosos.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: 'Esto no vuelve inútiles a los grabadores. Al contrario: permiten obtener información durante periodos largos y en horarios en que mantener observadores humanos sería difícil. Su principal valor aparece cuando se entiende qué pregunta pueden responder y cuáles no.',
        },
        {
          type: 'paragraph',
          order: 8,
          text: 'Por ejemplo, las grabaciones pueden ser especialmente útiles para estudiar cambios a través del tiempo. Si durante varios años se mantiene el mismo protocolo en los mismos lugares, una disminución persistente de determinados sonidos puede servir como señal para investigar qué está ocurriendo.',
        },
        {
          type: 'paragraph',
          order: 9,
          text: 'Sin embargo, incluso en ese caso los investigadores deben evitar conclusiones apresuradas. Menos registros podrían reflejar menos animales, pero también cambios en la época de reproducción, condiciones meteorológicas diferentes o modificaciones en el comportamiento de las especies.',
        },
        {
          type: 'paragraph',
          order: 10,
          text: 'Escuchar un bosque mediante sensores, por tanto, no elimina la necesidad de interpretar. La tecnología amplía aquello que podemos registrar; no decide por sí sola qué significa lo registrado.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.LECTORA.T6',
      displayOrder: 6,
      title: 'Prohibir todas las notificaciones no resuelve el problema',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cada vez que una pantalla se ilumina durante una clase, resulta tentador pensar que existe una solución sencilla: impedir cualquier notificación mientras dure la jornada escolar. La propuesta parece lógica. Si las alertas distraen, eliminemos las alertas.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Sin embargo, creo que esa respuesta confunde dos problemas diferentes: reducir interrupciones y aprender a gestionar la atención.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'No cuestiono que las notificaciones puedan interrumpir. Una vibración breve basta para que alguien abandone durante unos segundos una explicación, una lectura o un ejercicio. Incluso cuando la persona no abre el mensaje, la pregunta sobre quién escribió puede ocupar parte de su atención.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Por eso algunas restricciones son razonables. Durante una prueba, una exposición o una actividad que exige concentración sostenida, mantener los teléfonos guardados o activar un modo sin interrupciones tiene sentido.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'El problema aparece cuando esa protección se convierte en la única estrategia educativa. Fuera de la escuela, nadie desactivará todas las alertas por nosotros. Una persona deberá decidir qué aplicaciones pueden interrumpirla, cuándo revisar mensajes y qué conversaciones pueden esperar.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'La escuela podría aprovechar precisamente esa dificultad para enseñar hábitos concretos. Por ejemplo, antes de una actividad de treinta minutos, cada estudiante podría configurar el dispositivo para permitir únicamente llamadas de contactos importantes y silenciar el resto. Al terminar, podría revisar qué notificaciones llegaron y discutir cuáles realmente requerían atención inmediata.',
        },
        {
          type: 'paragraph',
          order: 6,
          text: 'Esto no implica que el teléfono deba utilizarse en todas las clases. Tampoco significa que un estudiante tenga derecho a responder cualquier mensaje cuando quiera. Significa que entre prohibición absoluta y disponibilidad permanente existe un espacio para practicar decisiones.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: 'Alguien podría objetar que enseñar autorregulación requiere tiempo y que es mucho más sencillo guardar todos los dispositivos en una caja. Es cierto. La caja probablemente reduce las interrupciones de forma más inmediata.',
        },
        {
          type: 'paragraph',
          order: 8,
          text: 'Pero si nuestro único objetivo fuera conseguir silencio durante cuarenta y cinco minutos, bastaría con retirar el problema de la sala. Si también queremos que los estudiantes aprendan a proteger su atención cuando nadie esté vigilándolos, en algún momento tendrán que practicar esa decisión con el distractor presente.',
        },
        {
          type: 'paragraph',
          order: 9,
          text: 'No toda clase necesita convertirse en un laboratorio de hábitos digitales. Algunas requieren simplemente cerrar la pantalla y trabajar. Precisamente por eso una política sensata debería distinguir contextos en vez de tratar todas las situaciones como si fueran idénticas.',
        },
        {
          type: 'paragraph',
          order: 10,
          text: 'La pregunta no debería ser solo “¿cómo impedimos que el teléfono interrumpa esta clase?”, sino también “¿qué necesitará saber hacer este estudiante cuando nadie pueda quitarle el teléfono?”.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.LECTORA.T7',
      displayOrder: 7,
      title: 'Leer también lo que un mapa calla',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando el Archivo Municipal de Santa Aurelia comenzó a digitalizar sus mapas antiguos, uno de los documentos que despertó mayor interés fue un plano de 1927 elaborado para una compañía de seguros contra incendios.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'A primera vista, el mapa parecía extraordinariamente preciso. Cada edificio aparecía acompañado por símbolos que indicaban si estaba construido con madera, ladrillo o adobe; también se registraban depósitos de combustible, talleres y conexiones de agua.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Sin embargo, una investigadora llamada Irene Salas notó algo extraño. En varios censos de la misma década aparecían familias domiciliadas en un pasaje llamado Los Aromos, pero ese nombre no figuraba en el plano.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Durante algunas semanas, Irene buscó otros registros. Encontró solicitudes de conexión eléctrica asociadas al pasaje, fotografías aéreas posteriores y una libreta escolar donde varios estudiantes habían escrito “Los Aromos” como domicilio.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'Finalmente descubrió que el pasaje había estado compuesto principalmente por pequeñas viviendas levantadas detrás de construcciones comerciales. Para la compañía que produjo el plano, esas casas tenían poca importancia comparadas con los edificios que representaban un riesgo económico mayor.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'El hallazgo no significaba que el mapa estuviera “mal hecho”. Había sido elaborado para responder una pregunta específica: ¿qué estructuras podían aumentar o reducir el riesgo de pérdidas por incendio? No pretendía registrar cada aspecto de la vida urbana.',
        },
        {
          type: 'paragraph',
          order: 6,
          text: 'Este tipo de situaciones obliga a los historiadores a considerar el propósito de una fuente. Un censo, una fotografía familiar, un plano de seguros y un periódico pueden describir una misma calle de maneras muy distintas porque fueron producidos por personas e instituciones con objetivos diferentes.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: 'Por eso, cuando algo no aparece en un documento, la ausencia no siempre demuestra que nunca existió. A veces indica simplemente que aquello no era relevante para quien produjo el registro.',
        },
        {
          type: 'paragraph',
          order: 8,
          text: 'Esto no significa que cualquier vacío pueda llenarse con imaginación. Para sostener que Los Aromos existió, Irene necesitó reunir documentos independientes que apuntaban en la misma dirección.',
        },
        {
          type: 'paragraph',
          order: 9,
          text: 'Los historiadores llaman a menudo corroboración a este procedimiento: comparar fuentes para determinar dónde coinciden, dónde se contradicen y qué puede afirmarse con mayor seguridad.',
        },
        {
          type: 'paragraph',
          order: 10,
          text: 'Una fuente histórica, entonces, no es una ventana transparente hacia el pasado. Se parece más a una ventana construida para mirar en cierta dirección. Para comprender lo que queda fuera del marco, suele ser necesario buscar otra.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.LECTORA.T8',
      displayOrder: 8,
      title: 'La bandeja vacía',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante las vacaciones de invierno, Mara aceptó encargarse del pequeño invernadero de su escuela. No era una tarea complicada: debía ir los martes y viernes, revisar la humedad de las bandejas y anotar cualquier cambio.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'El profesor Salgado le entregó una llave y un cuaderno cuadriculado.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '—No necesitas hacer que pase nada —le dijo—. Solo observa.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Mara pensó que era una manera extraña de describir el cuidado de plantas.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'Las primeras bandejas contenían tomates, albahaca y lechugas. Cada una llevaba una etiqueta con la fecha de siembra. En el estante inferior había una bandeja diferente. La tierra estaba seca en la superficie y no asomaba ningún brote.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'La etiqueta decía:',
        },
        {
          type: 'paragraph',
          order: 6,
          text: 'Lote 7 — semillas recolectadas junto al río.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: 'El primer martes, Mara agregó agua.',
        },
        {
          type: 'paragraph',
          order: 8,
          text: 'El viernes no había cambiado nada.',
        },
        {
          type: 'paragraph',
          order: 9,
          text: 'La semana siguiente tampoco.',
        },
        {
          type: 'paragraph',
          order: 10,
          text: 'Al octavo día decidió que las semillas probablemente estaban muertas. Encontró una bandeja nueva y empezó a trasladar la tierra.',
        },
        {
          type: 'paragraph',
          order: 11,
          text: 'El profesor Salgado apareció justo cuando ella había retirado la primera cucharada.',
        },
        {
          type: 'paragraph',
          order: 12,
          text: '—¿Qué haces?',
        },
        {
          type: 'paragraph',
          order: 13,
          text: '—Ordenando. Esta no funcionó.',
        },
        {
          type: 'paragraph',
          order: 14,
          text: 'Él miró la bandeja.',
        },
        {
          type: 'paragraph',
          order: 15,
          text: '—¿Cómo sabes que no funcionó?',
        },
        {
          type: 'paragraph',
          order: 16,
          text: '—Porque está vacía.',
        },
        {
          type: 'paragraph',
          order: 17,
          text: '—Eso describe lo que ves. No necesariamente lo que ocurrió.',
        },
        {
          type: 'paragraph',
          order: 18,
          text: 'El profesor le explicó que algunas semillas podían permanecer inactivas durante largos periodos y que el experimento buscaba precisamente registrar cuánto tardaban en germinar bajo ciertas condiciones.',
        },
        {
          type: 'paragraph',
          order: 19,
          text: '—Si reemplazas la tierra, ya no sabremos qué habría pasado.',
        },
        {
          type: 'paragraph',
          order: 20,
          text: 'Mara volvió a colocar la cucharada y escribió en el cuaderno:',
        },
        {
          type: 'paragraph',
          order: 21,
          text: '“Día 8. Sin brotes visibles. Casi cambié la bandeja”.',
        },
        {
          type: 'paragraph',
          order: 22,
          text: 'Después añadió, entre paréntesis:',
        },
        {
          type: 'paragraph',
          order: 23,
          text: '“Eso también cuenta como observación, supongo”.',
        },
        {
          type: 'paragraph',
          order: 24,
          text: 'Durante los siguientes días aparecieron hojas nuevas en las otras bandejas. Mara las medía y dibujaba pequeños esquemas.',
        },
        {
          type: 'paragraph',
          order: 25,
          text: 'El Lote 7 continuaba igual.',
        },
        {
          type: 'paragraph',
          order: 26,
          text: 'El último viernes antes del regreso a clases, Mara abrió el invernadero convencida de que no encontraría nada distinto. Regó primero las lechugas y luego se agachó ante el estante inferior.',
        },
        {
          type: 'paragraph',
          order: 27,
          text: 'En una esquina de la bandeja había una línea verde apenas visible.',
        },
        {
          type: 'paragraph',
          order: 28,
          text: 'Mara acercó el rostro.',
        },
        {
          type: 'paragraph',
          order: 29,
          text: 'Era un brote.',
        },
        {
          type: 'paragraph',
          order: 30,
          text: 'Buscó el cuaderno y escribió la fecha. Después se quedó mirando la planta unos segundos.',
        },
        {
          type: 'paragraph',
          order: 31,
          text: 'Pensó en arrancar una pequeña hierba que había aparecido al otro lado de la bandeja. Extendió la mano, pero se detuvo.',
        },
        {
          type: 'paragraph',
          order: 32,
          text: 'En vez de retirarla, dibujó su posición en el margen de la página.',
        },
        {
          type: 'paragraph',
          order: 33,
          text: 'Debajo escribió:',
        },
        {
          type: 'paragraph',
          order: 34,
          text: '“Planta desconocida. No intervenir todavía”.',
        },
        {
          type: 'paragraph',
          order: 35,
          text: 'Cuando el profesor Salgado regresó el lunes, encontró las bandejas regadas, las mediciones completas y una página entera dedicada a un brote que apenas medía un centímetro.',
        },
        {
          type: 'paragraph',
          order: 36,
          text: 'No comentó la longitud del informe.',
        },
        {
          type: 'paragraph',
          order: 37,
          text: 'Solo señaló la última frase.',
        },
        {
          type: 'paragraph',
          order: 38,
          text: '—Eso también es cuidar —dijo.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.LECTORA.T9',
      displayOrder: 9,
      title: 'Una biblioteca no cabe en un solo número',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cada año, muchas bibliotecas públicas deben demostrar que están siendo utilizadas. Para ello se recopilan estadísticas: préstamos, visitas, inscripciones, participación en talleres y muchas otras.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Medir es necesario. Sin información sería difícil saber si un servicio funciona, dónde faltan recursos o qué actividades deberían modificarse.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'El problema aparece cuando una cifra, por ser sencilla de contar, termina sustituyendo al objetivo completo de la institución.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Un ejemplo habitual es el número de préstamos. Si una biblioteca prestó cien mil libros durante un año y otra prestó cincuenta mil, puede resultar tentador concluir inmediatamente que la primera prestó un mejor servicio.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'Pero imaginemos que la segunda biblioteca está ubicada junto a varios establecimientos educacionales. Durante los meses de exámenes, cientos de estudiantes ocupan sus mesas para estudiar, utilizan computadores, consultan enciclopedias que no pueden llevarse a casa y reciben ayuda para buscar información. Muchos de ellos no registran ningún préstamo.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'Si solo miramos la circulación de libros, toda esa actividad desaparece de la evaluación.',
        },
        {
          type: 'paragraph',
          order: 6,
          text: 'Esto no significa que debamos abandonar el número de préstamos. Una caída sostenida puede advertir que una colección ha dejado de responder a las necesidades de sus usuarios. Lo importante es evitar que un indicador útil se convierta en la definición completa del éxito.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: 'Existe además un efecto menos evidente. Cuando una institución sabe que será evaluada casi exclusivamente por una cifra, puede comenzar a organizarse para aumentar precisamente esa cifra. Una biblioteca podría comprar más ejemplares de materiales muy demandados mientras descuida obras menos solicitadas pero necesarias para investigación, patrimonio local o acceso de grupos pequeños.',
        },
        {
          type: 'paragraph',
          order: 8,
          text: 'No habría necesariamente mala intención. Simplemente se estaría optimizando aquello que se mide.',
        },
        {
          type: 'paragraph',
          order: 9,
          text: 'Por eso una evaluación razonable debería comenzar por una pregunta previa: ¿qué esperamos que haga una biblioteca pública?',
        },
        {
          type: 'paragraph',
          order: 10,
          text: 'Si esperamos que facilite acceso a libros, apoye el estudio, ofrezca conexión digital, conserve memoria local y proporcione un espacio comunitario, entonces necesitaremos varios indicadores.',
        },
        {
          type: 'paragraph',
          order: 11,
          text: 'Algunos serán cuantitativos: préstamos, visitas, horas de uso de computadores.',
        },
        {
          type: 'paragraph',
          order: 12,
          text: 'Otros requerirán información distinta: qué grupos utilizan el espacio, qué necesidades permanecen sin respuesta o si las personas consiguen realizar aquello para lo que acudieron.',
        },
        {
          type: 'paragraph',
          order: 13,
          text: 'Un indicador no es inútil porque sea incompleto. Todos lo son.',
        },
        {
          type: 'paragraph',
          order: 14,
          text: 'El error consiste en olvidar qué parte de la realidad dejamos fuera cuando decidimos mirar solamente uno.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.LECTORA.T10',
      displayOrder: 10,
      title: '¿Por qué algunos árboles florecen antes?',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cada primavera, investigadores y voluntarios registran la fecha en que determinadas especies producen sus primeras flores. Estos datos forman parte de la fenología, disciplina que estudia la relación entre ciclos biológicos y condiciones ambientales.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'En un estudio exploratorio se observaron árboles de una misma especie en tres sectores de una región durante cuatro primaveras.',
        },
        {
          type: 'table',
          order: 2,
          headers: [
            'Sector',
            'Temperatura nocturna media previa a la floración',
            'Día promedio de primera floración*',
            'Árboles observados',
          ],
          rows: [
            ['Centro urbano', '11,8 °C', '72', '40'],
            ['Periferia', '9,9 °C', '78', '40'],
            ['Valle rural', '8,7 °C', '84', '40'],
          ],
          footnote: '*El día 1 corresponde al 1 de enero.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'En estos datos, los árboles ubicados en sectores con noches más cálidas florecieron, en promedio, antes.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'Sin embargo, esta relación no demuestra por sí sola que la temperatura sea la única causa. Los árboles de cada sector pueden diferir genéticamente; también podrían recibir distintas cantidades de agua, luz artificial o nutrientes.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'Para investigar con mayor precisión el efecto de la temperatura, otro equipo cultivó plantas genéticamente muy similares bajo condiciones controladas. Mantuvo constantes el agua, el suelo y las horas de iluminación, pero modificó la temperatura nocturna entre distintos grupos.',
        },
        {
          type: 'paragraph',
          order: 6,
          text: 'Este tipo de experimento permite aislar mejor una variable. Si los grupos sometidos a temperaturas más altas florecen consistentemente antes, aumenta la evidencia de que la temperatura participa directamente en el fenómeno.',
        },
        {
          type: 'paragraph',
          order: 7,
          text: 'Eso no vuelve innecesarias las observaciones realizadas en ciudades y campos. Los experimentos controlados permiten estudiar mecanismos, pero suelen trabajar con menos individuos y en condiciones simplificadas.',
        },
        {
          type: 'paragraph',
          order: 8,
          text: 'Las redes de voluntarios, en cambio, pueden registrar miles de plantas distribuidas en territorios extensos.',
        },
        {
          type: 'paragraph',
          order: 9,
          text: 'También poseen limitaciones. Algunas localidades cuentan con muchos observadores y otras con muy pocos. Además, distintas personas pueden interpretar de manera ligeramente diferente el momento exacto en que una flor debe considerarse abierta.',
        },
        {
          type: 'paragraph',
          order: 10,
          text: 'Por eso los proyectos de ciencia ciudadana suelen utilizar instrucciones estandarizadas, fotografías de referencia y revisiones de datos inusuales.',
        },
        {
          type: 'paragraph',
          order: 11,
          text: 'Las observaciones extensas y los experimentos controlados no compiten necesariamente entre sí. Una estrategia puede revelar dónde y cuándo aparece un patrón; la otra puede ayudar a determinar qué mecanismos podrían producirlo.',
        },
      ],
    },
  ],
  questions: [
    {
      questionKey: 'ENSAYO.LECTORA.Q1',
      displayOrder: 1,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Con qué propósito viaja inicialmente Elisa al pueblo?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Aprender a utilizar las máquinas de su abuela.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Vaciar el taller antes de entregar el local.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reabrir el taller junto con don Félix.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Buscar el cuaderno que su abuela había dejado.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto señala explícitamente que el local debía quedar vacío antes de entregar las llaves y que Elisa había viajado para separar, guardar, vender o desechar lo que había dentro.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q2',
      displayOrder: 2,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué comprende principalmente Elisa al leer el cuaderno de tapas negras?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que su abuela administraba mal económicamente el taller.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que muchos habitantes del pueblo evitaban pagar por sus arreglos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que el taller funcionaba también como un espacio de vínculos con otras personas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que su abuela planeaba transformar el taller en un centro comunitario.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las anotaciones no registran solamente prendas y pagos: incluyen conversaciones, favores, dibujos, recetas y gestos de cuidado. Esto revela que el taller tenía una función social además de comercial.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q3',
      displayOrder: 3,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué sentido adquiere en el relato la frase de la abuela:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Una costura bien hecha no hace desaparecer la rotura. Hace que la tela pueda seguir usándose”?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Sugiere que reparar algo siempre resulta inferior a reemplazarlo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Expresa que continuar después de una pérdida no exige borrar lo ocurrido.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Indica que los recuerdos pierden importancia a medida que pasa el tiempo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Explica por qué Elisa debería aprender el oficio de su abuela.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La frase comienza como una observación sobre una prenda, pero el desarrollo del relato le otorga un sentido más amplio. Elisa no puede eliminar la ausencia de su abuela, pero encuentra una forma de dar continuidad a parte de lo que ella construyó.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q4',
      displayOrder: 4,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de los siguientes elementos del texto constituye la evidencia más sólida de que Teresa entendía su trabajo como algo más que una actividad comercial?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Conservaba numerosos hilos y botones organizados en cajones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Tenía dos máquinas de coser ubicadas junto a la ventana.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Registraba como parte de su trabajo favores, conversaciones y gestos de ayuda hacia otras personas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Había instalado un banco para que los clientes esperaran mientras trabajaba.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La alternativa C reúne evidencia directa del cuaderno y muestra que las relaciones personales formaban parte habitual de la actividad de Teresa. Los demás elementos podrían existir en cualquier taller y no demuestran por sí mismos esa dimensión comunitaria.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q5',
      displayOrder: 5,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué hace Elisa finalmente con las máquinas de coser?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las vende junto con los estantes.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las conserva en el local vacío.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Se las entrega a don Félix.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las dona al centro comunitario.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto señala explícitamente que Elisa llama al centro comunitario y ofrece allí las dos máquinas para el curso de costura.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q6',
      displayOrder: 6,
      readingSkill: 'INTERPRETAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué resulta significativa la decisión de Elisa de no reabrir el taller, pero donar las máquinas y trasladar el banco?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque demuestra que decide continuar el legado de su abuela sin intentar reproducir exactamente su vida.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque revela que finalmente considera el taller un negocio poco rentable.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque permite concluir que Elisa piensa regresar posteriormente para trabajar como costurera.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque muestra que desea eliminar del local todos los objetos relacionados con su abuela.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Elisa no adopta el oficio de Teresa ni conserva el taller, pero permite que dos elementos vinculados con lo que allí ocurría —aprender y encontrarse con otros— continúen en nuevos espacios. Es una continuidad transformada, coherente con la idea del “remiendo”.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q7',
      displayOrder: 7,
      readingSkill: 'EVALUAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué el título “El banco azul” resulta pertinente para el relato?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque identifica el objeto de mayor valor económico que había en el taller.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque el banco representa un vínculo entre la memoria personal de Elisa y la dimensión comunitaria del taller.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la intención principal del relato es explicar cómo cambia de dueño ese objeto.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque el conflicto se produce cuando Elisa intenta vender el banco.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El banco aparece primero como parte del taller, luego don Félix explica su función social y finalmente continúa siendo un lugar de conversación fuera del local. Así, conecta el recuerdo de Teresa con aquello que permanece después de su ausencia.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q8',
      displayOrder: 8,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Según la tabla, ¿qué zona registró la mayor temperatura del pavimento?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Avenida Norte.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Barrio Estación.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Parque Sur.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las tres registraron la misma temperatura.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Avenida Norte registra 38,6 °C, el valor más alto de las tres zonas.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q9',
      displayOrder: 9,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué, según el texto, informar únicamente la cantidad de árboles plantados puede ser un indicador engañoso?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque todos los árboles producen exactamente la misma cantidad de sombra.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la cifra no muestra necesariamente su supervivencia, cobertura futura ni distribución territorial.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque los árboles recién plantados siempre elevan la temperatura durante los primeros años.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la cantidad de árboles no puede calcularse con precisión en una ciudad.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El argumento central distingue entre plantar ejemplares y producir efectivamente sombra útil a largo plazo. Para esto importan la supervivencia, la cobertura alcanzada y el lugar donde los árboles se encuentran.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q10',
      displayOrder: 10,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes conclusiones NO puede establecerse únicamente a partir de la tabla?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Parque Sur presenta la menor temperatura del pavimento de las tres zonas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Avenida Norte posee la menor cobertura de copas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En las tres zonas existe una asociación entre mayor cobertura y menor temperatura.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El aumento de la cobertura de copas es la causa exclusiva de la reducción de temperatura observada.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla permite observar una asociación, pero no demostrar causalidad exclusiva. El propio texto señala variables adicionales —como pavimento, edificios y tráfico— que podrían influir en las diferencias.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q11',
      displayOrder: 11,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué mecanismo de enfriamiento, además de la sombra, menciona el texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Condensación.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Evapotranspiración.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Erosión.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Fotosíntesis artificial.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto identifica explícitamente la evapotranspiración como el segundo mecanismo mediante el cual la vegetación puede contribuir al enfriamiento.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q12',
      displayOrder: 12,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué relación existe entre el título “Más que plantar: diseñar sombra” y la idea central del texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El título rechaza completamente la plantación de nuevos árboles.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El título propone sustituir árboles por estructuras artificiales que generen sombra.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El título resume la idea de que una política eficaz debe considerar supervivencia, cobertura y ubicación, no solo cantidad.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El título señala que la sombra constituye el único beneficio posible de la vegetación urbana.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '“Más que plantar” cuestiona el uso de la cantidad como único indicador y “diseñar sombra” sintetiza la necesidad de decidir especies, ubicación y supervivencia según las condiciones de cada espacio.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q13',
      displayOrder: 13,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué información adicional permitiría evaluar mejor la afirmación de que la distribución desigual de árboles puede aumentar la desigualdad frente al calor?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El precio promedio de las herramientas utilizadas para podar árboles.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad de especies de aves observadas en cada parque.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Datos de cobertura vegetal, temperatura y población expuesta desagregados por barrio.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El nombre científico de cada especie plantada durante el último año.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La afirmación relaciona tres elementos: distribución de vegetación, exposición térmica y población. Para evaluarla sería necesario comparar precisamente esas variables entre barrios.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q14',
      displayOrder: 14,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué propone concretamente el autor?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reemplazar dos clases semanales por lectura libre.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Eliminar las evaluaciones asociadas a todos los textos escolares.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reservar dos periodos semanales de quince minutos para leer sin una evaluación inmediata.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Permitir que cada estudiante lea solamente fuera del horario de clases.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La propuesta aparece explícitamente en el segundo párrafo: dos veces por semana, quince minutos de lectura elegida entre varias alternativas, sin prueba o guía inmediatamente posterior.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q15',
      displayOrder: 15,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué función cumple el párrafo que comienza con “No estoy sugiriendo reemplazar la enseñanza explícita…”?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Abandona la propuesta presentada anteriormente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Delimita la propuesta y evita que sea interpretada como un rechazo de la enseñanza guiada.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Sostiene que las estrategias lectoras son innecesarias.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Introduce evidencia estadística para demostrar la eficacia de la propuesta.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor anticipa una posible interpretación extrema y aclara lo que su propuesta no significa: no pretende eliminar la enseñanza explícita ni la intervención del profesor.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q16',
      displayOrder: 16,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes evidencias fortalecería mejor el argumento central del texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una encuesta que muestre cuál es el género literario favorito de los profesores.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un estudio que compare grupos similares y encuentre que quienes realizan periodos regulares de lectura autónoma aumentan su persistencia ante textos complejos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una lista de los libros más vendidos durante el último año.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El testimonio de un estudiante que afirma preferir las pruebas de selección múltiple.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor sostiene que estos espacios pueden favorecer comportamientos propios de un lector autónomo, especialmente sostener la atención y persistir ante dificultades. Una comparación que mida precisamente ese efecto fortalecería directamente el razonamiento.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q17',
      displayOrder: 17,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué quiere decir el autor cuando afirma que durante esos quince minutos debería desaparecer la certeza de que cada párrafo será “convertido de inmediato en una respuesta evaluada”?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que los estudiantes deberían olvidar lo que acaban de leer.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que ningún aprendizaje lector debería evaluarse en la escuela.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que la lectura puede tener temporalmente un propósito distinto de producir una respuesta para obtener una calificación.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que los profesores deberían ocultar las instrucciones de todas las actividades.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor no rechaza las evaluaciones en general. Propone crear un momento específico en que la lectura no esté inmediatamente subordinada a responder una guía o conseguir una nota.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q18',
      displayOrder: 18,
      readingSkill: 'LOCALIZAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué acciones conserva el profesor dentro de la propuesta?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Seleccionar materiales, recomendar lecturas y ayudar cuando un texto resulte demasiado difícil.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Elegir obligatoriamente un mismo libro para todos y evaluarlo al final de cada sesión.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Corregir cada interpretación antes de que el estudiante continúe leyendo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Permanecer fuera de la actividad para no afectar las decisiones de los lectores.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El cuarto párrafo menciona explícitamente esas funciones del profesor.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q19',
      displayOrder: 19,
      readingSkill: 'EVALUAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes evidencias debilitaría más directamente la defensa que hace el autor de reservar treinta minutos semanales para lectura sin una evaluación inmediata?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una encuesta muestra que algunos estudiantes prefieren textos breves antes que novelas extensas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Algunos profesores señalan que utilizan cuestionarios después de determinadas lecturas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un estudio con grupos comparables muestra que quienes realizan regularmente esos periodos de lectura no desarrollan mayor autonomía ni persistencia ante textos complejos que quienes dedican el mismo tiempo a lectura guiada.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las bibliotecas de distintos establecimientos poseen cantidades diferentes de libros disponibles.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor defiende estos periodos porque pueden permitir practicar conductas propias de la lectura autónoma, como sostener la atención y persistir ante textos sin depender inmediatamente de una evaluación.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Si un estudio con grupos comparables mostrara que quienes realizan estos periodos no desarrollan mayor autonomía ni persistencia que quienes destinan el mismo tiempo a lectura guiada, esa evidencia atacaría directamente una de las principales razones que sostienen la propuesta.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Las alternativas A, B y D no evalúan directamente el efecto central que el autor atribuye a estos espacios.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q20',
      displayOrder: 20,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes afirmaciones sintetiza mejor la conclusión del texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La lectura autónoma debería reemplazar progresivamente todas las actividades evaluadas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Leer sin una tarea inmediata garantiza que todos los estudiantes desarrollen gusto por los libros.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La enseñanza de lectura debería concentrarse únicamente en aumentar la cantidad de páginas leídas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para formar lectores autónomos, es útil ofrecer algunos espacios en que continuar leyendo dependa de la decisión del propio estudiante.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor no propone sustituir la enseñanza ni garantiza resultados automáticos. Su conclusión es más limitada: si se desea desarrollar autonomía, los estudiantes necesitan alguna oportunidad real de ejercerla.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q21',
      displayOrder: 21,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Según la entrevistada, ¿qué se busca principalmente al conservar un objeto patrimonial?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que recupere exactamente su apariencia original.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que todas las marcas visibles sean eliminadas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Evitar que su deterioro avance y permitir que siga siendo utilizado como objeto patrimonial.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Sustituir sus materiales antiguos por otros más resistentes.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Laura señala explícitamente que la finalidad no es necesariamente dejar el objeto “como nuevo”, sino impedir que el deterioro continúe y permitir su estudio, exhibición o consulta.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q22',
      displayOrder: 22,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué principio permite explicar mejor la diferencia entre tratar una mancha de humedad y conservar una anotación antigua?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Toda modificación visible debe eliminarse.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La decisión depende del efecto y del valor histórico de cada marca, no solo de su apariencia.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las anotaciones siempre son más valiosas que el objeto donde aparecen.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los daños producidos por agua son los únicos que requieren intervención.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La entrevistada muestra que dos marcas pueden parecer defectos, pero una puede seguir dañando el objeto y otra contener información histórica. La decisión depende de su naturaleza y significado.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q23',
      displayOrder: 23,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes prácticas sería más coherente con los principios defendidos por Laura?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reconstruir una parte faltante basándose en lo que probablemente existía.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Aplicar un adhesivo permanente para asegurar que una reparación nunca pueda desprenderse.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Eliminar cualquier anotación posterior a la fabricación original del objeto.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reforzar una zona dañada con un material estable que pueda retirarse posteriormente sin afectar el original.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La práctica de D respeta dos principios centrales de la entrevista: intervención mínima y, cuando sea posible, reversibilidad.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q24',
      displayOrder: 24,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué Laura afirma que una restauración no debería “engañar al observador”?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque toda zona restaurada debe pintarse de un color diferente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la intervención no debería hacer pasar una reconstrucción inventada por parte auténtica del objeto.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque los objetos restaurados no deberían volver a exhibirse.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque solo los especialistas deberían poder distinguir una reparación.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La entrevistada rechaza fabricar información inexistente. Una intervención puede integrarse visualmente, pero no debe falsificar partes del objeto sin evidencia.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q25',
      displayOrder: 25,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué materiales menciona Laura como ejemplos de reparaciones domésticas que pueden causar problemas?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Tinta y pintura al óleo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Grapas y clavos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cinta adhesiva común y pegamentos domésticos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Papel de algodón y cartón libre de ácido.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La respuesta aparece explícitamente en el penúltimo intercambio de la entrevista.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q26',
      displayOrder: 26,
      readingSkill: 'INTERPRETAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué idea expresa principalmente la frase final “Hacer menos también puede exigir conocimiento”?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un buen conservador debería evitar cualquier intervención.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad de trabajo visible no determina la calidad de una decisión de conservación.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los tratamientos más sencillos son siempre superiores a los complejos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Conservar objetos requiere menos preparación que restaurarlos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Laura explica que algunas veces la mejor decisión es estabilizar un objeto y no intervenir más. Reconocer ese límite requiere criterio profesional, aunque produzca menos cambios visibles.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q27',
      displayOrder: 27,
      readingSkill: 'EVALUAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué función cumplen las preguntas del entrevistador sobre los límites y riesgos de la restauración?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Permiten desarrollar progresivamente los criterios que orientan las decisiones de la conservadora.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Intentan demostrar que la restauración patrimonial carece de reglas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Desvían la entrevista desde la conservación hacia la historia del cine.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Buscan desacreditar las técnicas utilizadas por los especialistas.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las preguntas llevan desde la idea inicial de “dejar nuevo” hacia criterios más complejos: valor histórico, reversibilidad, documentación, autenticidad y límites de la intervención.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q28',
      displayOrder: 28,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué sector presentó la mayor cantidad de especies acústicamente identificadas?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Quebrada.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Bosque alto.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Borde agrícola.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los tres presentaron la misma cantidad.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla registra 24 especies en Bosque alto.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q29',
      displayOrder: 29,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué el Borde agrícola puede presentar más vocalizaciones registradas y, al mismo tiempo, menos especies identificadas que el Bosque alto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque necesariamente posee una población animal mayor.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque una misma especie puede producir muchos registros sonoros.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque las especies del Bosque alto no producen ningún sonido.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque en el Borde agrícola se realizaron más horas de grabación.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los tres sectores tuvieron 120 horas de grabación. Una especie muy vocal puede generar numerosos registros sin implicar mayor diversidad.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q30',
      displayOrder: 30,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un investigador afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“El Borde agrícola contiene más animales que los otros dos sectores porque allí se registraron 790 vocalizaciones”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la principal debilidad de este razonamiento?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ignora que los tres sectores fueron grabados durante tiempos distintos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Confunde la cantidad de registros sonoros con la cantidad de individuos presentes.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utiliza datos obtenidos durante demasiadas noches.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Considera únicamente las especies silenciosas del bosque.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una misma especie o incluso un mismo individuo puede vocalizar muchas veces. Los registros no permiten convertir directamente la cantidad de sonidos en cantidad de animales.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q31',
      displayOrder: 31,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué quiere decir el autor al señalar que el valor de los grabadores aparece cuando se entiende “qué pregunta pueden responder y cuáles no”?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que la utilidad de una herramienta depende de reconocer también sus limitaciones.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que los grabadores solo deberían utilizarse para estudiar aves.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que todos los métodos tradicionales deben ser sustituidos por sensores.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que los resultados acústicos no pueden utilizarse en investigaciones científicas.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El artículo defiende la tecnología, pero insiste en que sus datos deben interpretarse considerando qué mide realmente y qué información no puede proporcionar por sí sola.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q32',
      displayOrder: 32,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de los siguientes factores puede dificultar el análisis de las grabaciones?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La lluvia intensa.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La altura de los árboles exclusivamente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad de investigadores presentes en el laboratorio.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La edad de los dispositivos de observación visual.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto señala explícitamente que la lluvia intensa puede ocultar sonidos.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q33',
      displayOrder: 33,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué sería importante mantener el mismo protocolo si se comparan grabaciones realizadas durante varios años?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para garantizar que nunca cambien las poblaciones del bosque.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para reducir diferencias metodológicas que podrían confundirse con cambios reales en los sonidos registrados.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para conseguir exactamente el mismo número de vocalizaciones cada año.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para evitar que las especies modifiquen su comportamiento.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si horarios, ubicaciones o configuraciones cambian, parte de las diferencias podría deberse al método. Mantener el protocolo hace más comparable la información entre años.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q34',
      displayOrder: 34,
      readingSkill: 'INTERPRETAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes afirmaciones representa mejor la perspectiva del autor sobre la tecnología descrita?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los sensores producen datos objetivos y, por ello, eliminan la necesidad de interpretación humana.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los sensores son poco útiles porque no detectan a todos los organismos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los sensores amplían la capacidad de observación, pero sus registros adquieren significado solo cuando se interpretan dentro de sus límites.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los sensores deberían utilizarse únicamente cuando no sea posible ingresar físicamente a un bosque.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La conclusión señala que la tecnología amplía lo registrable, pero no determina automáticamente lo que esos registros significan.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q35',
      displayOrder: 35,
      readingSkill: 'LOCALIZAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿En qué situaciones reconoce el autor que guardar los teléfonos o activar un modo sin interrupciones puede ser razonable?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Únicamente durante los recreos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Durante pruebas, exposiciones o actividades que requieren concentración sostenida.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cada vez que un estudiante recibe un mensaje.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Solo cuando un profesor necesita utilizar su propio teléfono.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor menciona explícitamente esas situaciones como ejemplos en los que una restricción temporal tiene sentido.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q36',
      displayOrder: 36,
      readingSkill: 'INTERPRETAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál es la tesis principal del texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las notificaciones no producen ninguna distracción relevante.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los teléfonos deberían permanecer disponibles durante todas las clases.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las restricciones pueden ser útiles, pero la escuela también debería enseñar a gestionar la atención frente a las notificaciones.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Toda política escolar sobre teléfonos debería ser eliminada.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor no rechaza las restricciones. Su argumento es que utilizarlas como única estrategia no enseña autorregulación para situaciones futuras.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q37',
      displayOrder: 37,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué función cumple el ejemplo de configurar el teléfono antes de una actividad de treinta minutos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Mostrar una posible forma concreta de practicar la autorregulación que el autor defiende.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Demostrar que todas las notificaciones escolares son importantes.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Probar que los teléfonos mejoran automáticamente el aprendizaje.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Sustituir el argumento principal por una instrucción técnica.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El ejemplo transforma la idea general de gestionar la atención en una actividad concreta en la que el estudiante debe decidir qué interrupciones permitir.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q38',
      displayOrder: 38,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes evidencias fortalecería mejor el argumento del autor?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un estudio que muestre que todos los estudiantes prefieren utilizar teléfonos durante las clases.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una encuesta sobre las marcas de teléfono más frecuentes en un colegio.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un experimento en que estudiantes que practican estrategias de gestión de notificaciones mejoren posteriormente su capacidad de mantener la concentración cuando no existe supervisión externa.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un registro que muestre que guardar teléfonos en una caja reduce inmediatamente la cantidad de sonidos en la sala.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tesis no cuestiona que una caja reduzca interrupciones de inmediato. Su afirmación distintiva es que practicar autorregulación puede desarrollar una capacidad útil cuando no existe supervisión.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q39',
      displayOrder: 39,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué el autor concede que “la caja probablemente reduce las interrupciones de forma más inmediata”?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para reconocer una ventaja de la postura contraria antes de explicar por qué la considera insuficiente.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para abandonar su propuesta y apoyar finalmente la prohibición absoluta.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para demostrar que la autorregulación no puede aprenderse.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para afirmar que todas las clases deberían utilizar una caja.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor reconoce la fortaleza de la solución alternativa —su eficacia inmediata— y luego distingue ese objetivo de otro más amplio: aprender a proteger la atención de manera autónoma.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q40',
      displayOrder: 40,
      readingSkill: 'EVALUAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes situaciones aplicaría mejor la propuesta defendida en el texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un colegio permite utilizar cualquier aplicación durante toda la jornada.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un profesor prohíbe permanentemente todos los dispositivos sin explicar ni practicar estrategias de atención.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una escuela elimina cualquier norma sobre teléfonos porque considera que cada estudiante debe decidir por sí solo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una escuela establece momentos de restricción estricta y otros en que los estudiantes practican deliberadamente cómo configurar y gestionar interrupciones.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor rechaza tanto la disponibilidad permanente como convertir la prohibición en la única estrategia. Propone distinguir contextos y combinar restricciones con oportunidades de autorregulación.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q41',
      displayOrder: 41,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Con qué finalidad había sido elaborado originalmente el plano de 1927?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Registrar a todos los habitantes de Santa Aurelia.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Identificar los límites administrativos de la ciudad.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Documentar lugares de interés histórico.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Evaluar riesgos relacionados con incendios.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto indica que el plano fue producido para una compañía de seguros y buscaba registrar estructuras relevantes para estimar riesgos de pérdidas por incendio.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q42',
      displayOrder: 42,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué la ausencia de Los Aromos en el plano no demuestra que el pasaje no existiera?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque el propósito del mapa hacía que ciertos elementos de la ciudad fueran menos relevantes para quienes lo elaboraron.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque todos los mapas anteriores a 1930 contenían errores importantes.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque las familias del pasaje habían solicitado permanecer ocultas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque los planos de seguros registraban únicamente edificios públicos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto explica que el plano seleccionaba información según su propósito. Las pequeñas viviendas podían existir aunque no fueran consideradas suficientemente importantes para el objetivo del documento.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q43',
      displayOrder: 43,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes evidencias fortalecería más la afirmación de que Los Aromos ya existía en 1927?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un mapa turístico de 1955 que muestre un barrio llamado Los Aromos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El recuerdo de una persona nacida en 1960 que afirma haber oído hablar del pasaje.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Registros independientes de 1927 que ubiquen distintas familias y conexiones de servicios en Los Aromos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un plano moderno donde una calle distinta lleve actualmente ese mismo nombre.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La evidencia más fuerte sería contemporánea al periodo investigado e independiente del plano original. Además, varios registros coincidentes reducen la posibilidad de que se trate de un error aislado.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q44',
      displayOrder: 44,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué función cumple el caso de Los Aromos dentro del texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Demostrar que los censos son siempre más exactos que los mapas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Probar que las compañías de seguros ocultaban deliberadamente barrios pobres.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Mostrar que los mapas antiguos carecen de utilidad histórica.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ejemplificar cómo el propósito de una fuente influye en aquello que registra y aquello que omite.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El caso concreto permite desarrollar la idea general del texto: una fuente no registra todo, sino aquello que resulta relevante para el objetivo con que fue creada.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q45',
      displayOrder: 45,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué tipo de construcciones componían principalmente el pasaje Los Aromos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Pequeñas viviendas ubicadas detrás de construcciones comerciales.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Grandes edificios industriales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Bodegas pertenecientes a la compañía de seguros.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Viviendas construidas dentro de edificios públicos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Esta información aparece explícitamente cuando Irene logra reconstruir las características del pasaje.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q46',
      displayOrder: 46,
      readingSkill: 'INTERPRETAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué idea expresa mejor la afirmación de que una fuente puede “callar” algo?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que los documentos históricos contienen intencionalmente información falsa.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que los investigadores deberían completar cualquier ausencia mediante hipótesis.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que solo las fuentes escritas pueden ocultar aspectos del pasado.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que la ausencia de información puede deberse a los criterios de selección de la fuente y no necesariamente a la inexistencia de aquello omitido.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto distingue cuidadosamente entre ausencia documental e inexistencia histórica. Una fuente puede omitir información porque no era relevante para su propósito.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q47',
      displayOrder: 47,
      readingSkill: 'EVALUAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué resulta pertinente la comparación final entre una fuente y “una ventana construida para mirar en cierta dirección”?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque sostiene que una fuente permite observar todo el pasado sin distorsiones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque demuestra que las fuentes visuales son superiores a las escritas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque sintetiza la idea de que cada fuente ofrece una perspectiva parcial condicionada por la forma y finalidad con que fue producida.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque indica que los historiadores deberían utilizar únicamente documentos arquitectónicos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La metáfora resume la tesis central: una fuente permite conocer ciertos aspectos, pero su perspectiva tiene límites que deben reconocerse y complementarse con otras evidencias.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q48',
      displayOrder: 48,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué debía hacer Mara durante las vacaciones?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Trasplantar todas las semillas del invernadero.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Diseñar un nuevo experimento para el profesor.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reemplazar las plantas que no germinaran.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Revisar las bandejas dos veces por semana y registrar sus cambios.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tarea se presenta explícitamente al inicio: visitar el invernadero martes y viernes, revisar humedad y anotar cambios.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q49',
      displayOrder: 49,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué el profesor detiene a Mara cuando intenta cambiar la tierra del Lote 7?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque intervenir habría destruido parte de la información que el experimento buscaba obtener.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque las bandejas nuevas eran demasiado costosas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque solo el profesor podía regar esa parte del invernadero.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque sabía con certeza que el brote aparecería ese mismo día.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El experimento buscaba observar el tiempo de germinación. Alterar la bandeja habría impedido saber qué ocurría si se mantenían las condiciones originales.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q50',
      displayOrder: 50,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué cambio experimenta principalmente Mara a lo largo del relato?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Aprende a producir plantas más rápidamente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Decide que los experimentos escolares son demasiado lentos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Pasa de considerar la ausencia de resultados visibles como un fracaso a entenderla como información que también debe observarse.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comprende que siempre es mejor dejar las plantas completamente sin cuidado.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Al principio interpreta la bandeja vacía como un experimento fallido. Al final registra incluso aquello cuya función desconoce y evita intervenir sin evidencia.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q51',
      displayOrder: 51,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué acción final de Mara demuestra con mayor claridad que ha comprendido la enseñanza del profesor?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Regar las lechugas antes de revisar el Lote 7.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Dedicar una página completa al brote nuevo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Acercarse para observar mejor la línea verde.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Registrar la planta desconocida en vez de arrancarla inmediatamente.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La situación reproduce el conflicto inicial: Mara ve algo que podría “ordenar”, pero ahora reconoce que intervenir sin comprender puede eliminar información relevante.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q52',
      displayOrder: 52,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué significado adquiere la “bandeja vacía” dentro del relato?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Representa un error que el profesor se niega a reconocer.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Representa algo cuya falta de resultados visibles exige paciencia antes de concluir qué está ocurriendo.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Simboliza la imposibilidad de aprender mediante observación.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Demuestra que las semillas recogidas en el río eran de mala calidad.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La bandeja parece vacía durante gran parte del relato, pero esa ausencia no permite concluir que nada esté ocurriendo. De ahí surge el aprendizaje central de Mara.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q53',
      displayOrder: 53,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué quiere decir el profesor cuando afirma al final “Eso también es cuidar”?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que una planta solo necesita que alguien escriba sobre ella.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que cuidar significa impedir cualquier cambio en un experimento.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que Mara debería conservar todas las hierbas que aparezcan.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que cuidar puede implicar observar con atención y evitar intervenir antes de comprender lo que se tiene delante.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La frase conecta el cuidado con una actitud de atención y prudencia, no únicamente con actuar o modificar activamente el objeto observado.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q54',
      displayOrder: 54,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué indicador utiliza principalmente el autor para ejemplificar el problema?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El número de préstamos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad de funcionarios.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El tamaño de los edificios.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El costo anual de los libros.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto desarrolla extensamente el número de préstamos como ejemplo de un indicador útil que puede resultar insuficiente si se utiliza de manera aislada.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q55',
      displayOrder: 55,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál es la postura del autor respecto de las estadísticas de uso?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Deberían eliminarse porque no reflejan ninguna realidad.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Solo deberían emplearse indicadores cualitativos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Son necesarias, pero deben relacionarse con los diversos objetivos que se pretende evaluar.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El número de préstamos debería continuar siendo el único indicador comparable.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor afirma expresamente que medir es necesario. Su crítica se dirige a reducir una institución compleja a una sola cifra.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q56',
      displayOrder: 56,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué información permitiría comparar mejor el servicio de dos bibliotecas con funciones distintas?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Únicamente el total anual de libros prestados.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El número de metros cuadrados de cada edificio.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El presupuesto destinado exclusivamente a novelas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un conjunto de datos sobre préstamos, visitas, uso de servicios, características de los usuarios y cumplimiento de necesidades.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El argumento del texto exige una evaluación multidimensional que corresponda a las diversas funciones de una biblioteca.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q57',
      displayOrder: 57,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Para qué se incluye el ejemplo de los estudiantes durante el periodo de exámenes?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para demostrar que las bibliotecas deberían dejar de prestar libros.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para mostrar una forma importante de uso que el número de préstamos puede no registrar.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para sostener que estudiar dentro de una biblioteca es más valioso que leer en casa.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para explicar por qué los estudiantes no deberían utilizar computadores.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los estudiantes utilizan numerosos servicios aunque no retiren libros. El ejemplo evidencia justamente aquello que un indicador único deja fuera.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q58',
      displayOrder: 58,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una autoridad afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Los préstamos bajaron un 10 %, así que la biblioteca necesariamente presta un servicio 10 % peor que el año anterior”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Qué supuesto problemático contiene este razonamiento según el texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que una reducción porcentual nunca puede medirse.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que todo usuario de una biblioteca debe pedir libros prestados.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que una biblioteca con más préstamos siempre posee más presupuesto.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que el número de préstamos representa por sí solo la totalidad de la calidad del servicio.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El argumento criticado por el texto consiste precisamente en convertir un indicador parcial en una medida total del desempeño de la institución.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q59',
      displayOrder: 59,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué idea sintetiza mejor el último párrafo?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todos los indicadores deberían tener exactamente la misma importancia.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es imposible evaluar instituciones complejas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar un indicador exige recordar qué dimensiones de la realidad ese indicador no representa.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los indicadores numéricos siempre producen decisiones equivocadas.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La conclusión no rechaza los indicadores: advierte sobre el riesgo de olvidar sus límites.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q60',
      displayOrder: 60,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T10',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué sector presentó la floración promedio más temprana?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Centro urbano.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Periferia.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Valle rural.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los tres sectores florecieron el mismo día.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El Centro urbano registra el día promedio 72, anterior al 78 de Periferia y al 84 del Valle rural.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q61',
      displayOrder: 61,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T10',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué puede afirmarse correctamente a partir de la tabla?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La temperatura nocturna es la única causa de las diferencias observadas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todos los árboles urbanos florecen antes que todos los árboles rurales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El número de árboles observados aumenta cuando baja la temperatura.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En estos datos existe una asociación entre noches más cálidas y una floración promedio más temprana.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla muestra una asociación consistente en estas observaciones, pero no demuestra causalidad exclusiva ni permite afirmaciones sobre cada árbol individual.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q62',
      displayOrder: 62,
      readingSkill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.LECTORA.T10',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál sería el mejor diseño para evaluar específicamente si la temperatura nocturna influye en la floración?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Observar más árboles urbanos sin registrar ninguna otra variable.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar especies diferentes en lugares con climas distintos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cultivar plantas genéticamente similares con iguales condiciones de agua, suelo y luz, variando principalmente la temperatura nocturna.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Preguntar a voluntarios qué sector creen que florece primero.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Ese diseño reduce explicaciones alternativas y permite aislar mejor la temperatura como variable experimental.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q63',
      displayOrder: 63,
      readingSkill: 'LOCALIZAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.LECTORA.T10',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué dificultad de las redes de voluntarios menciona explícitamente el texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No pueden registrar plantas fuera de laboratorios.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad de observadores puede ser muy desigual entre localidades.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Solo pueden trabajar durante una primavera.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No pueden utilizar fotografías de referencia.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto señala que algunas localidades cuentan con muchos observadores y otras con pocos.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q64',
      displayOrder: 64,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T10',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué el experimento utiliza plantas genéticamente muy similares?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para garantizar que todas produzcan exactamente el mismo número de flores.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para estudiar únicamente diferencias entre especies.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para impedir cualquier efecto de la temperatura.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para reducir la posibilidad de que diferencias genéticas expliquen los resultados atribuidos a la temperatura.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Mantener semejante la genética permite controlar una posible explicación alternativa y concentrarse mejor en el efecto de la variable manipulada.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.LECTORA.Q65',
      displayOrder: 65,
      readingSkill: 'INTERPRETAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.LECTORA.T10',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál es la principal relación que establece el texto entre observaciones extensas y experimentos controlados?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Son estrategias complementarias: unas permiten detectar patrones amplios y otras ayudan a investigar sus posibles causas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los experimentos deberían reemplazar completamente las observaciones de terreno.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La ciencia ciudadana puede demostrar causalidad con mayor precisión que un experimento.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Solo las observaciones realizadas fuera de un laboratorio representan conocimiento científico válido.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La conclusión distingue sus fortalezas: las observaciones permiten detectar patrones en escalas amplias, mientras los experimentos ayudan a investigar mecanismos causales.',
        },
      ],
    },
  ],
};

export default module_;
