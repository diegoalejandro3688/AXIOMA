// ENSAYO.HISTORIA -- SOURCE del Ensayo PAES Historia y Ciencias Sociales ZETRYND.
//
// Contenido editorial APPROVED / EDITORIALMENTE CLOSED, transcrito VERBATIM
// desde el paquete "ZETRYND — ENSAYO PAES HISTORIA Y CIENCIAS SOCIALES /
// MASTER IMPLEMENTATION PROMPT" (24 textos/estimulos, 65 preguntas).
// Clasificacion (axis + skill + difficulty) y clave por pregunta del mismo
// paquete. Reutiliza la infraestructura de textos compartidos + tablas
// estructuradas cerrada en ENSAYOS-F2 (commit 5baa53f).
//
// Unicas adaptaciones aplicadas -- puramente tecnicas, contenido visible
// identico (ADR-0024):
//   - Cada linea del paquete -> un bloque 'paragraph' independiente, en orden
//     (prosa, cronologias, situaciones enumeradas, citas).
//   - Las 8 tablas (T2, T4, T8, T9, T12, T15, T17, T24) -> bloque 'table'
//     estructurado de F2 (headers / rows / footnote), sin alterar ningun
//     valor, unidad ni signo.
//   - El titulo de cada texto se guarda en ExamPassage.title, no duplicado
//     dentro del contenido (arquitectura F2).
//   - Las lineas de procedencia ("Datos hipoteticos elaborados para ZETRYND",
//     "Datos seleccionados para fines educativos") se PRESERVAN como contenido
//     del texto (no existe un campo source-note).
//
// Cero cambios de prosa, stems, distractores, respuesta correcta,
// explicaciones, eje, habilidad, dificultad, titulos, fechas, valores de
// tabla ni mapping texto->pregunta.
import type { ExamSourceModule } from '../schema';

const module_: ExamSourceModule = {
  examKey: 'ENSAYO.HISTORIA',
  title: 'Ensayo PAES Historia y Ciencias Sociales',
  subjectKey: 'historia',
  durationMinutes: 120,
  passages: [
    {
      passageKey: 'ENSAYO.HISTORIA.T1',
      displayOrder: 1,
      title: 'República y ciudadanía en el siglo XIX',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: '"La autoridad no debe pertenecer a una familia por derecho de nacimiento. Las leyes deben ser conocidas por todos y quienes gobiernan deben ejercer funciones limitadas por ellas. Sin embargo, para conservar el orden político, el derecho a intervenir directamente en las elecciones corresponde a quienes reúnen determinadas condiciones establecidas por la ley".',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'El fragmento representa ideas presentes en distintos debates políticos americanos durante el siglo XIX.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T2',
      displayOrder: 2,
      title: 'Industrialización y urbanización',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Datos hipotéticos elaborados para ZETRYND.',
        },
        {
          type: 'table',
          order: 1,
          headers: [
            'Año',
            'Población urbana',
            'Trabajadores en manufactura',
            'Producción industrial (índice, 1850=100)',
          ],
          rows: [
            ['1850', '31 %', '420.000', '100'],
            ['1875', '44 %', '690.000', '175'],
            ['1900', '58 %', '1.080.000', '290'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T3',
      displayOrder: 3,
      title: 'Chile y los mercados internacionales',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante parte del siglo XIX, comerciantes chilenos enviaban minerales y productos agrícolas hacia mercados externos. Al mismo tiempo, ingresaban al país maquinarias, herramientas y manufacturas procedentes de economías que avanzaban en su industrialización. Los ingresos generados por las exportaciones favorecieron algunas obras de infraestructura y ampliaron los vínculos comerciales con otras regiones del mundo.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T4',
      displayOrder: 4,
      title: 'Una ciudad chilena en transformación',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Datos hipotéticos elaborados para ZETRYND.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Indicador', '1930', '1960'],
          rows: [
            ['Habitantes de la ciudad', '180.000', '410.000'],
            ['Población nacida en zonas rurales', '21 %', '37 %'],
            ['Viviendas con acceso a agua potable', '68 %', '61 %'],
            ['Personas por vivienda, promedio', '4,7', '6,1'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Durante el mismo periodo aumentó la instalación de industrias y servicios en la ciudad.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T5',
      displayOrder: 5,
      title: 'Crisis de la democracia liberal en el periodo de entreguerras',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un país europeo de la década de 1930, un movimiento político afirmaba que los desacuerdos entre partidos debilitaban a la nación. Una vez en el gobierno, suprimió organizaciones opositoras, restringió la prensa, concentró atribuciones en el líder y utilizó organizaciones estatales para movilizar políticamente a la población.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T6',
      displayOrder: 6,
      title: 'Instituciones y Estado de derecho',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una democracia ficticia se presentan tres situaciones:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Situación I: una autoridad pública dicta una medida que afecta a un ciudadano. Este recurre ante un tribunal, argumentando que la autoridad actuó fuera de las facultades que le concede la ley.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Situación II: el Congreso debate públicamente una propuesta presentada por el Ejecutivo y puede modificarla o rechazarla siguiendo el procedimiento establecido.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Situación III: una organización social critica una política estatal y difunde públicamente sus argumentos sin ser sancionada por expresar esa opinión.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T7',
      displayOrder: 7,
      title: 'Información y democracia',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante una elección circula en redes sociales una imagen que atribuye una frase polémica a una candidata. La publicación ha sido compartida miles de veces.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Una estudiante decide:',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '1. buscar la entrevista completa donde supuestamente se pronunció la frase;',
        },
        {
          type: 'paragraph',
          order: 3,
          text: '2. verificar la fecha de la publicación original;',
        },
        {
          type: 'paragraph',
          order: 4,
          text: '3. comparar la información con distintos medios;',
        },
        {
          type: 'paragraph',
          order: 5,
          text: '4. identificar quién difundió inicialmente la imagen.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T8',
      displayOrder: 8,
      title: 'Mercado de tomates',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una ciudad, la cantidad de tomates disponibles normalmente es de 10.000 kg semanales.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Después de fuertes lluvias que dañaron parte de las cosechas cercanas, se registró:',
        },
        {
          type: 'table',
          order: 2,
          headers: ['Semana', 'Cantidad ofrecida', 'Precio promedio por kg'],
          rows: [
            ['Antes de las lluvias', '10.000 kg', '$1.200'],
            ['Después de las lluvias', '6.000 kg', '$1.750'],
          ],
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'La cantidad de consumidores y sus preferencias se mantuvieron relativamente estables durante ese periodo.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T9',
      displayOrder: 9,
      title: 'Crisis económica y dependencia externa',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una economía latinoamericana dependía fuertemente de la exportación de minerales y productos agrícolas. Después del inicio de una crisis económica internacional se registraron los siguientes cambios:',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Indicador', '1928', '1932'],
          rows: [
            ['Valor de las exportaciones', '100', '38'],
            ['Empleo en sectores exportadores', '100', '61'],
            ['Ingresos fiscales provenientes del comercio exterior', '100', '47'],
            ['Producción destinada al mercado interno', '100', '92'],
          ],
          footnote: 'Índice 1928 = 100.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T10',
      displayOrder: 10,
      title: 'Industrialización y acción estatal',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante las décadas centrales del siglo XX, varios países latinoamericanos impulsaron políticas destinadas a producir dentro de sus fronteras una parte mayor de los bienes que antes importaban. En Chile, el Estado amplió su participación en proyectos energéticos e industriales, creó instituciones de fomento y buscó estimular nuevas actividades productivas.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Estas políticas no eliminaron el comercio exterior, pero pretendían disminuir ciertas dependencias y diversificar la estructura económica.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T11',
      displayOrder: 11,
      title: 'Un mundo dividido',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un discurso pronunciado pocos años después del término de la Segunda Guerra Mundial, un dirigente sostuvo:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"La cooperación entre quienes derrotaron a un enemigo común ha dado paso a una profunda desconfianza. Dos proyectos políticos y económicos buscan ampliar su influencia. Los conflictos regionales son observados ahora también por lo que pueden significar para el equilibrio internacional".',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T12',
      displayOrder: 12,
      title: 'Transformaciones y tensiones en Chile durante la década de 1960',
      content: [
        {
          type: 'table',
          order: 0,
          headers: ['Indicador', '1960', '1970'],
          rows: [
            ['Población urbana', '68 %', '76 %'],
            ['Inscripción electoral', '1,8 millones', '3,5 millones'],
            ['Trabajadores sindicalizados', '290.000', '560.000'],
            ['Propiedades agrícolas incluidas en procesos de reforma', '100', '2.900'],
          ],
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Durante este periodo distintos sectores políticos presentaron proyectos divergentes sobre la velocidad y profundidad de las transformaciones sociales y económicas.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T13',
      displayOrder: 13,
      title: 'Dictadura y transición política en Chile',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: '1973: quiebre del orden democrático e instalación de una dictadura militar.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '1980: aprobación de una nueva Constitución en un plebiscito realizado bajo el régimen.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '1988: plebiscito determina que el gobernante no continúe por un nuevo periodo.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: '1989: elecciones presidenciales y parlamentarias.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: '1990: asume un gobierno elegido mediante sufragio y se inicia una nueva etapa democrática.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T14',
      displayOrder: 14,
      title: 'Municipio, ciudadanía y control institucional',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una comuna ficticia ocurren las siguientes situaciones:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'I. Un grupo de vecinos solicita conocer los contratos utilizados para ejecutar una obra financiada con recursos municipales.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'II. Una organización ambiental participa en una audiencia pública y entrega observaciones respecto de un proyecto urbano.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'III. Un medio de comunicación descubre que una autoridad podría haber utilizado recursos públicos para fines privados e investiga los antecedentes.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'IV. Un tribunal ordena a una institución pública corregir una actuación que vulneró un derecho reconocido por la legislación.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T15',
      displayOrder: 15,
      title: 'Inflación y poder adquisitivo',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una familia registra los siguientes datos de su presupuesto mensual:',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Indicador', 'Año 1', 'Año 2'],
          rows: [
            ['Ingreso familiar', '$600.000', '$630.000'],
            ['Costo de una canasta habitual de bienes y servicios', '$500.000', '$550.000'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Entre ambos años no se produjeron cambios importantes en la composición de esa canasta.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T16',
      displayOrder: 16,
      title: 'Después de la Segunda Guerra Mundial',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: '1939: comienza la Segunda Guerra Mundial en Europa.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '1945: termina la guerra. Ese mismo año entra en vigor la Carta de las Naciones Unidas.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '1948: la Asamblea General de las Naciones Unidas adopta la Declaración Universal de Derechos Humanos.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'En los años posteriores a la guerra, distintos Estados buscaron establecer mecanismos de cooperación internacional capaces de disminuir el riesgo de nuevos conflictos y promover principios comunes sobre derechos fundamentales.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T17',
      displayOrder: 17,
      title: 'La descolonización',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Datos seleccionados para fines educativos.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Territorio', 'Potencia colonial previa', 'Independencia'],
          rows: [
            ['India', 'Reino Unido', '1947'],
            ['Ghana', 'Reino Unido', '1957'],
            ['Argelia', 'Francia', '1962'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Durante las décadas posteriores a la Segunda Guerra Mundial numerosos movimientos políticos de Asia y África cuestionaron el dominio colonial europeo y exigieron autonomía o independencia.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T18',
      displayOrder: 18,
      title: 'América Latina en la Guerra Fría',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante la segunda mitad del siglo XX, diversos conflictos latinoamericanos combinaron problemas internos con la competencia internacional de la Guerra Fría.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'En algunos países existían demandas por reforma agraria, mejores salarios, mayor participación política o transformaciones económicas. Al mismo tiempo, Estados Unidos, la Unión Soviética y otros actores internacionales observaban estos procesos considerando su posible impacto sobre el equilibrio político mundial.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Como resultado, acontecimientos originados en sociedades latinoamericanas podían adquirir también una dimensión internacional.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T19',
      displayOrder: 19,
      title: 'Dictadura militar y derechos humanos en Chile',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Tras el golpe de Estado de 1973 se instaló en Chile una dictadura militar. El Congreso fue disuelto, se restringió la actividad de los partidos políticos y existieron limitaciones a distintas libertades públicas.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Durante el periodo, organismos nacionales e internacionales reunieron antecedentes sobre graves violaciones a los derechos humanos. El régimen, por su parte, justificó diversas medidas utilizando argumentos vinculados con la seguridad nacional y la situación política del país.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'El estudio histórico del periodo utiliza, entre otras fuentes, documentos oficiales, expedientes judiciales, informes de organismos de derechos humanos, prensa y testimonios de personas que vivieron los acontecimientos.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T20',
      displayOrder: 20,
      title: 'El fin de la Guerra Fría y un mundo más interconectado',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: '1989: cae el Muro de Berlín.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '1991: se disuelve la Unión Soviética.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '1995: comienza a funcionar la Organización Mundial del Comercio.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Durante las décadas siguientes aumentaron los flujos internacionales de bienes, capitales, información y comunicaciones digitales.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T21',
      displayOrder: 21,
      title: 'Representación y participación ciudadana',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una comuna se realizaron elecciones municipales. Meses después ocurrieron las siguientes situaciones:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'I. Las autoridades elegidas votaron el presupuesto municipal.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'II. Una organización vecinal reunió firmas para solicitar modificaciones a un proyecto vial.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'III. El municipio realizó una audiencia pública en la que habitantes de la comuna expusieron observaciones sobre un nuevo plan urbano.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'IV. En la elección siguiente, la ciudadanía pudo volver a escoger entre diferentes candidaturas.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T22',
      displayOrder: 22,
      title: 'Igualdad y no discriminación',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una comuna se ofrece un taller deportivo financiado con recursos públicos. Una persona con discapacidad solicita participar y señala que podría hacerlo si se realiza una adaptación sencilla del acceso al recinto.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'La administración rechaza la solicitud sin estudiar la adaptación y responde únicamente:',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '"El programa siempre ha funcionado de esta manera".',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T23',
      displayOrder: 23,
      title: 'Poder público y controles institucionales',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un sistema democrático ficticio:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '- el Ejecutivo presenta un proyecto de presupuesto;',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '- el Legislativo lo discute, modifica y aprueba;',
        },
        {
          type: 'paragraph',
          order: 3,
          text: '- una institución fiscalizadora revisa la legalidad del uso de los recursos;',
        },
        {
          type: 'paragraph',
          order: 4,
          text: '- los tribunales pueden resolver controversias cuando corresponda.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.HISTORIA.T24',
      displayOrder: 24,
      title: 'Producción, empleo y poder adquisitivo',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una economía registra los siguientes indicadores:',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Indicador', 'Año 1', 'Año 2'],
          rows: [
            ['Crecimiento de la producción', '+4 %', '−1 %'],
            ['Desempleo', '6 %', '9 %'],
            ['Índice de precios', '100', '108'],
            ['Índice de salario nominal promedio', '100', '105'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Durante el Año 2, el Estado aumentó temporalmente el gasto en programas de apoyo a personas desempleadas y en algunas obras públicas.',
        },
      ],
    },
  ],
  questions: [
    {
      questionKey: 'ENSAYO.HISTORIA.Q1',
      displayOrder: 1,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué combinación de ideas políticas se observa principalmente en la fuente?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Defensa de la monarquía absoluta y de la igualdad política universal.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Rechazo de las leyes escritas y defensa de la autoridad religiosa.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Principios republicanos junto con una concepción restringida de la ciudadanía política.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Sufragio universal acompañado por concentración del poder ejecutivo.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fuente cuestiona la autoridad hereditaria y establece límites legales al gobierno, elementos vinculados al republicanismo. Sin embargo, también restringe la participación electoral según requisitos legales, característica frecuente de la ciudadanía política censitaria del siglo XIX.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q2',
      displayOrder: 2,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Con qué proceso histórico se relaciona mejor el tipo de ideas expresadas en la fuente?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La construcción de repúblicas y Estados nacionales en América durante el siglo XIX.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La expansión del Estado de bienestar europeo posterior a 1945.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La formación de bloques políticos durante la Guerra Fría.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La instauración de regímenes totalitarios en Europa durante el siglo XX.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Después de las independencias americanas, uno de los principales desafíos fue organizar nuevas repúblicas, definir instituciones y determinar quiénes integrarían políticamente la nación.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q3',
      displayOrder: 3,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante sostiene:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"Como estos nuevos Estados rechazaron la monarquía, desde su nacimiento establecieron una participación política igualitaria para toda la población".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Qué elemento de la propia fuente permite cuestionar mejor esa conclusión?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La existencia de leyes conocidas públicamente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La oposición a que el poder fuese hereditario.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La presencia de autoridades con funciones limitadas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La existencia de requisitos para ejercer derechos electorales.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La adopción de instituciones republicanas no significó automáticamente participación política universal. La fuente establece explícitamente restricciones para intervenir en elecciones, lo que contradice la afirmación del estudiante.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q4',
      displayOrder: 4,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué tendencia muestran directamente los datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Disminución simultánea de población urbana y producción industrial.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Aumento de urbanización, empleo manufacturero y producción industrial.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Estancamiento de la producción acompañado por mayor ruralización.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reducción del trabajo manufacturero pese al crecimiento industrial.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los tres indicadores aumentan de manera sostenida entre 1850 y 1900.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q5',
      displayOrder: 5,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué transformación social del siglo XIX se relaciona mejor con la tendencia presentada?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Desaparición de las ciudades como centros productivos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Sustitución del trabajo asalariado por relaciones feudales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Expansión de centros urbanos vinculada al crecimiento de actividades industriales.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reducción permanente de la movilidad de población desde áreas rurales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La industrialización favoreció el crecimiento de centros productivos urbanos y estuvo asociada a importantes movimientos de población hacia las ciudades.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q6',
      displayOrder: 6,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué característica de la economía chilena del siglo XIX ejemplifica principalmente la fuente?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Su inserción en mercados internacionales mediante exportaciones de materias primas y productos agrícolas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Su aislamiento respecto del comercio atlántico.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El abandono de las exportaciones en favor de una economía exclusivamente industrial.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La prohibición de importar bienes manufacturados.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El fragmento describe una economía conectada con mercados externos mediante exportaciones y, simultáneamente, importaciones de bienes manufacturados y maquinaria.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q7',
      displayOrder: 7,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes informaciones permitiría evaluar mejor hasta qué punto este modelo exportador benefició a distintos grupos de la sociedad chilena?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Únicamente el nombre de los principales puertos utilizados.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Datos sobre distribución de ingresos, salarios, propiedad y condiciones de vida de diferentes sectores sociales.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una lista de todos los barcos que ingresaron al país.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La distancia entre Chile y los principales mercados europeos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El aumento del comercio o de los ingresos nacionales no permite determinar por sí mismo cómo se distribuyeron sus beneficios. Para evaluar ese aspecto se requiere información social y económica desagregada.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q8',
      displayOrder: 8,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué proceso demográfico permite reconocer principalmente la tabla?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Despoblamiento urbano.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Migración masiva desde Chile hacia otros países.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reducción del tamaño de las ciudades.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Crecimiento urbano acompañado por migración desde sectores rurales.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La población urbana aumenta considerablemente y también crece la proporción de habitantes nacidos en zonas rurales.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q9',
      displayOrder: 9,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué problema urbano sugieren conjuntamente los datos sobre agua potable y personas por vivienda?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una expansión de infraestructura más rápida que el crecimiento de la población.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La desaparición de los problemas habitacionales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Dificultades de infraestructura y vivienda para responder al rápido crecimiento urbano.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una reducción significativa de la presión sobre los servicios públicos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Aunque la ciudad crece, disminuye proporcionalmente el acceso al agua potable y aumenta el número medio de personas por vivienda. Esto sugiere que vivienda e infraestructura no crecieron al mismo ritmo.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q10',
      displayOrder: 10,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un investigador concluye:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"La instalación de industrias fue la única causa del aumento de población de esta ciudad".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Por qué la evidencia presentada no basta para sostener esa afirmación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque los datos muestran simultaneidad entre varios procesos, pero no permiten demostrar una causalidad única.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la tabla demuestra que la industrialización redujo la población.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque ningún proceso económico puede influir en movimientos migratorios.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque las ciudades chilenas no experimentaron crecimiento durante el siglo XX.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La información permite relacionar temporalmente industrialización, migración y crecimiento urbano, pero no aislar la industria como única causa. Podrían intervenir otros factores económicos, sociales y políticos.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q11',
      displayOrder: 11,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿En qué contexto histórico se inserta mejor el fenómeno descrito?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La consolidación de las monarquías absolutas del siglo XVII.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La crisis de las democracias liberales y el ascenso de regímenes totalitarios en la primera mitad del siglo XX.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La descolonización de África posterior a 1945.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La expansión inicial de las repúblicas latinoamericanas durante las independencias.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante el periodo de entreguerras se desarrollaron en Europa regímenes que cuestionaron el pluralismo liberal, concentraron el poder y restringieron derechos políticos.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q12',
      displayOrder: 12,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de los siguientes elementos del fragmento contradice más directamente el principio de pluralismo político?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La existencia de organizaciones estatales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La movilización política de parte de la población.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La presencia de un liderazgo político visible.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La supresión de organizaciones opositoras.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El pluralismo requiere la posibilidad de existencia y competencia de distintas posiciones políticas. Eliminar a la oposición restringe directamente ese principio.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q13',
      displayOrder: 13,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué principio democrático se observa con mayor claridad en la Situación I?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las autoridades están sometidas al orden jurídico y sus actuaciones pueden ser revisadas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los gobernantes pueden actuar sin límites durante su mandato.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los tribunales dependen de las decisiones particulares de cada ciudadano.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las autoridades administrativas poseen mayor poder que las leyes.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El Estado de derecho supone que también las autoridades deben actuar conforme a las normas y que existen mecanismos institucionales para controlar sus actuaciones.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q14',
      displayOrder: 14,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué característica de una democracia representativa refleja principalmente la Situación II?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La eliminación de los contrapesos institucionales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La subordinación del Congreso a toda decisión del Ejecutivo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La existencia de instituciones con funciones diferenciadas que participan en la formación de las leyes.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La sustitución de las normas por decisiones directas de los jueces.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La situación muestra poderes e instituciones con atribuciones distintas que intervienen en un procedimiento regulado, generando deliberación y contrapesos.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q15',
      displayOrder: 15,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué derecho resulta especialmente importante para que pueda producirse la Situación III?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El derecho exclusivo de las autoridades a comunicar opiniones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La obligación de apoyar públicamente las decisiones gubernamentales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El derecho a impedir que otras personas expresen críticas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La libertad de expresión.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La posibilidad de expresar y difundir críticas hacia las políticas públicas es una manifestación fundamental de la libertad de expresión dentro de una sociedad democrática.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q16',
      displayOrder: 16,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué práctica ciudadana representa mejor el procedimiento de la estudiante?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Aceptar como verdadera una información cuando ha sido compartida muchas veces.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Evaluar críticamente la procedencia y el contexto de la información antes de utilizarla.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Evitar cualquier información relacionada con procesos electorales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Considerar confiables únicamente las publicaciones que coinciden con sus opiniones.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La estudiante verifica fuente, contexto, fecha y otras referencias antes de aceptar la afirmación, práctica especialmente relevante en una sociedad democrática y altamente conectada.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q17',
      displayOrder: 17,
      axis: 'FORMACION_CIUDADANA',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué la difusión masiva de información falsa puede constituir un problema para la democracia?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque una democracia exige que exista una única fuente autorizada de información.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque impide necesariamente que puedan celebrarse elecciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque puede afectar la deliberación y las decisiones ciudadanas al introducir información incorrecta en el debate público.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la ciudadanía no debería discutir asuntos políticos mediante medios digitales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una deliberación democrática informada requiere que las personas puedan evaluar argumentos y antecedentes. La circulación de información falsa puede distorsionar ese proceso, aunque no elimine automáticamente las instituciones democráticas.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q18',
      displayOrder: 18,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué cambio económico se observa entre ambos momentos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una disminución de la oferta acompañada por un aumento del precio.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un aumento de la oferta acompañado por una disminución del precio.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una disminución simultánea de oferta y precio.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un aumento simultáneo de oferta y precio.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Después de las lluvias se ofrecen menos tomates y el precio promedio aumenta, manteniéndose relativamente constantes las demás condiciones descritas.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q19',
      displayOrder: 19,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué información de la fuente permite relacionar las lluvias con el cambio en la oferta?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La existencia de consumidores en la ciudad.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El precio inicial de $1.200 por kilogramo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La estabilidad de las preferencias de los consumidores.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El daño sufrido por parte de las cosechas productoras.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El daño a las cosechas reduce la cantidad de producto que los productores pueden llevar al mercado, proporcionando una explicación directa para la menor oferta observada.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q20',
      displayOrder: 20,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un comerciante afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"El precio aumentó exclusivamente porque los consumidores comenzaron a querer más tomates".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la principal debilidad de su explicación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El precio de un producto nunca puede variar por cambios en la demanda.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La fuente indica que las preferencias de los consumidores permanecieron relativamente estables y entrega evidencia de una reducción de la oferta.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las lluvias siempre reducen la demanda de todos los alimentos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad ofrecida aumentó después de las lluvias.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La evidencia disponible apunta principalmente a un shock de oferta: disminuyó la producción disponible después del daño a las cosechas, mientras la información proporcionada no muestra un aumento significativo de la demanda.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q21',
      displayOrder: 21,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué característica estructural de esta economía ayuda a explicar la magnitud del impacto observado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Su elevada dependencia de las exportaciones y del comercio internacional.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La ausencia total de actividades destinadas al mercado interno.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Su independencia respecto de los ingresos obtenidos en mercados extranjeros.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La predominancia de una economía industrial orientada exclusivamente al consumo local.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La caída simultánea de exportaciones, empleo exportador e ingresos fiscales muestra la vulnerabilidad de una economía cuyos principales ingresos dependían fuertemente de la demanda externa.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q22',
      displayOrder: 22,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Con qué proceso histórico se relaciona mejor la situación presentada?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La expansión económica europea de mediados del siglo XIX.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El crecimiento económico mundial inmediatamente posterior a 1945.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La Gran Depresión iniciada a fines de la década de 1920.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La crisis petrolera de la década de 1970.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las fechas y la fuerte contracción del comercio internacional corresponden al contexto de la Gran Depresión, iniciada en 1929 y extendida durante los primeros años de la década de 1930.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q23',
      displayOrder: 23,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un investigador afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"La caída del comercio exterior explica por sí sola todo el aumento del desempleo ocurrido durante la crisis".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Qué información permitiría evaluar mejor esa afirmación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El nombre de las empresas que exportaban cada producto antes de 1929.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Datos sobre empleo y producción en distintos sectores internos, junto con otras transformaciones económicas ocurridas durante el mismo periodo.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La ubicación geográfica de los principales puertos del país.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El volumen de exportaciones registrado varias décadas después.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La caída exportadora pudo ser muy importante, pero para atribuirle por sí sola todo el desempleo sería necesario estudiar también la evolución de otros sectores y posibles causas internas.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q24',
      displayOrder: 24,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T10',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué característica del periodo aparece explícitamente en el texto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La desaparición completa de las importaciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El retiro del Estado de todas las actividades económicas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El abandono de la producción industrial.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una mayor participación estatal en el fomento de la industrialización.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fuente menciona directamente instituciones de fomento, proyectos industriales y energéticos promovidos mediante una participación más activa del Estado.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q25',
      displayOrder: 25,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T10',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Con qué estrategia de desarrollo se relacionan principalmente las políticas descritas?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La industrialización orientada a sustituir parte de las importaciones.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La restauración del modelo económico colonial.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La eliminación de toda producción manufacturera nacional.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La sustitución del mercado interno por una economía exclusivamente agrícola.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La estrategia buscaba desarrollar capacidades productivas nacionales para fabricar bienes que previamente se adquirían en el extranjero, característica central de la industrialización por sustitución de importaciones.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q26',
      displayOrder: 26,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T11',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué característica del orden mundial posterior a 1945 representa principalmente el fragmento?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La desaparición de las rivalidades internacionales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La formación de un único sistema político mundial.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La consolidación de una rivalidad bipolar con dimensiones ideológicas y geopolíticas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El retorno de las monarquías absolutas como principales potencias.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La descripción de dos proyectos rivales que compiten por influencia corresponde al escenario bipolar de la Guerra Fría, encabezado por Estados Unidos y la Unión Soviética.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q27',
      displayOrder: 27,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T11',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante sostiene:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"Como existía una rivalidad entre las superpotencias, todos los conflictos políticos latinoamericanos de la Guerra Fría fueron causados exclusivamente desde el exterior".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Qué evidencia sería más útil para evaluar críticamente esa afirmación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La distancia entre cada país latinoamericano y Washington.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El número total de países existentes en el mundo durante 1960.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las fechas en que Estados Unidos y la Unión Soviética establecieron relaciones diplomáticas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Información sobre conflictos sociales, actores políticos y condiciones económicas internas de los distintos países, además de las intervenciones extranjeras.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La Guerra Fría influyó sobre América Latina, pero para afirmar causalidad exclusiva habría que descartar factores internos. Una explicación rigurosa debe considerar ambos niveles.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q28',
      displayOrder: 28,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T12',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué proceso general muestran los indicadores entre 1960 y 1970?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una disminución sostenida de la participación social.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una ampliación de la participación política y social acompañada por importantes transformaciones estructurales.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El retorno de la mayoría de la población hacia zonas rurales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La desaparición de las organizaciones sindicales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Aumentan la inscripción electoral y la sindicalización, mientras se intensifican procesos de reforma y urbanización.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q29',
      displayOrder: 29,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T12',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué indicador permite observar más directamente una ampliación de la participación política institucional?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El aumento de la inscripción electoral.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El crecimiento de la población urbana.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad de propiedades agrícolas afectadas por reformas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El crecimiento de la sindicalización.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La inscripción electoral se relaciona directamente con la incorporación de personas a los mecanismos institucionales de participación política mediante elecciones.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q30',
      displayOrder: 30,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T12',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'A partir de los datos, una persona concluye:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"El aumento de la participación política produjo necesariamente la totalidad de las transformaciones sociales ocurridas durante la década".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la principal debilidad de esa conclusión?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La participación electoral siempre disminuye cuando existen reformas sociales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La tabla demuestra que ningún cambio social ocurrió durante esos años.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los datos muestran procesos simultáneos, pero no permiten establecer que uno de ellos haya causado por sí solo todos los demás.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las cifras de población urbana impiden estudiar fenómenos políticos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fuente permite identificar transformaciones concurrentes, pero no demuestra una relación causal única entre la ampliación electoral y todos los demás cambios.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q31',
      displayOrder: 31,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T13',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué secuencia describe correctamente el proceso presentado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Elecciones democráticas → golpe de Estado → plebiscito de 1988 → Constitución de 1980.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Constitución de 1980 → gobierno democrático → quiebre institucional → elecciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Plebiscito de 1988 → quiebre de 1973 → Constitución de 1980 → elecciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Quiebre democrático → Constitución de 1980 → plebiscito de 1988 → elecciones → cambio de gobierno en 1990.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La alternativa D reproduce correctamente la secuencia cronológica proporcionada por la fuente.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q32',
      displayOrder: 32,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T13',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué característica de la transición chilena puede inferirse de la cronología?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La democracia fue restablecida inmediatamente después de 1973.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El cambio de régimen involucró un proceso gradual que incluyó mecanismos plebiscitarios y electorales.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El plebiscito de 1988 eliminó inmediatamente todas las instituciones anteriores.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No existió participación electoral antes de 1990.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La secuencia muestra varios hitos entre el régimen dictatorial y la instalación de un gobierno democrático, incluyendo plebiscito y elecciones.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q33',
      displayOrder: 33,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T14',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué principio democrático está más directamente relacionado con la Situación I?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El secreto obligatorio de todas las actuaciones estatales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La imposibilidad de fiscalizar el uso de recursos públicos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La transparencia y el acceso a información pública.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La subordinación de los ciudadanos a las autoridades municipales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Acceder a información sobre contratos y uso de fondos públicos permite fiscalizar la actuación estatal y se vincula con el principio de transparencia.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q34',
      displayOrder: 34,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T14',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué dimensión de la democracia representa principalmente la Situación II?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La participación de la sociedad civil en asuntos públicos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La concentración de las decisiones en una sola autoridad.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La eliminación de organizaciones ciudadanas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La sustitución de representantes electos por tribunales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La organización interviene mediante un mecanismo institucional para expresar observaciones sobre una decisión que afecta a la comunidad.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q35',
      displayOrder: 35,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T14',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué función democrática puede cumplir el medio de comunicación en la Situación III?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Reemplazar formalmente a los tribunales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Determinar por sí mismo la culpabilidad jurídica de una autoridad.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Impedir que las autoridades ejerzan cualquier función.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Contribuir al escrutinio público mediante la investigación y difusión de información relevante.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los medios pueden contribuir al control social de las autoridades mediante investigaciones y difusión de antecedentes, aunque no sustituyen las competencias judiciales.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q36',
      displayOrder: 36,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T14',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué principio se observa especialmente en la Situación IV?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La autoridad estatal está por encima de los derechos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Existen mecanismos jurisdiccionales para proteger derechos frente a actuaciones del poder público.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los tribunales pueden crear cualquier derecho sin base normativa.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las instituciones públicas no están sometidas a control.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La intervención del tribunal muestra la existencia de mecanismos institucionales destinados a controlar actuaciones estatales y proteger derechos.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q37',
      displayOrder: 37,
      axis: 'FORMACION_CIUDADANA',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T14',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un alcalde afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"Como fui elegido democráticamente, las decisiones de mi administración no deberían ser cuestionadas por ciudadanos, medios ni tribunales hasta la próxima elección".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Qué principio permite refutar mejor esa afirmación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una autoridad electa obtiene poder ilimitado durante todo su mandato.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las elecciones eliminan la necesidad de controles institucionales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La legitimidad electoral coexiste con transparencia, participación, rendición de cuentas y límites jurídicos al poder.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los tribunales deben reemplazar a las autoridades elegidas en todas sus funciones.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una democracia, la elección otorga legitimidad para ejercer determinadas funciones, pero no elimina los límites legales ni los mecanismos de fiscalización y participación existentes entre elecciones.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q38',
      displayOrder: 38,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T15',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué ocurrió con el poder adquisitivo de esta familia entre ambos años, considerando únicamente los datos entregados?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Tendió a disminuir, porque el costo de la canasta aumentó proporcionalmente más que el ingreso familiar.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Aumentó necesariamente, porque el ingreso nominal creció.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Permaneció exactamente igual, porque tanto ingreso como precios aumentaron.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No puede existir pérdida de poder adquisitivo cuando el ingreso nominal sube.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El ingreso aumenta un 5 %, mientras la canasta pasa de $500.000 a $550.000, un aumento del 10 %. Por lo tanto, el ingreso compra proporcionalmente menos que antes.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q39',
      displayOrder: 39,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T15',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué dato permite observar más directamente que el nivel de precios enfrentado por la familia aumentó?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El ingreso pasó de $600.000 a $630.000.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La composición de la familia no aparece indicada.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El ingreso familiar continúa siendo superior al costo de la canasta.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La misma canasta pasó de costar $500.000 a $550.000.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Al mantenerse la composición de la canasta, su mayor costo refleja directamente un aumento de los precios de los bienes y servicios considerados.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q40',
      displayOrder: 40,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T15',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una persona concluye:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"La familia está necesariamente mejor económicamente en el Año 2 porque ahora recibe $30.000 más al mes".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es el principal problema de ese razonamiento?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un aumento de ingresos siempre empeora la situación económica.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Considera solo el ingreso nominal e ignora que el costo de los bienes y servicios aumentó en una proporción mayor.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La inflación solo afecta a empresas y no a las familias.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El precio de una canasta de consumo nunca sirve para analizar poder adquisitivo.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Comparar únicamente cantidades nominales de dinero ignora cuánto puede comprarse con ellas. En este caso, los precios considerados aumentan más rápidamente que el ingreso.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q41',
      displayOrder: 41,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T16',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿En qué contexto histórico surgieron las instituciones y declaraciones mencionadas?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Durante la expansión imperial europea del siglo XIX.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En la reorganización internacional posterior a la Segunda Guerra Mundial.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Durante las revoluciones liberales de comienzos del siglo XIX.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Después de la desaparición de todos los conflictos internacionales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La ONU y la Declaración Universal de Derechos Humanos surgieron en el contexto inmediatamente posterior a la Segunda Guerra Mundial, cuando se impulsaron nuevas formas de cooperación internacional.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q42',
      displayOrder: 42,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T16',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué objetivo común se puede reconocer en los procesos mencionados en la fuente?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Restablecer los imperios coloniales europeos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Sustituir completamente a los Estados nacionales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Crear una autoridad mundial encargada de gobernar directamente todos los países.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Favorecer la cooperación internacional y establecer principios destinados a proteger la paz y los derechos.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Tanto la creación de Naciones Unidas como la formulación de principios internacionales de derechos humanos respondieron, entre otros propósitos, a la búsqueda de cooperación y de mecanismos que evitaran repetir las consecuencias de la guerra.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q43',
      displayOrder: 43,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T16',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"La creación de organismos internacionales en 1945 eliminó los conflictos armados entre los Estados".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Qué evidencia permitiría evaluar mejor esa afirmación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Registros sobre conflictos internacionales posteriores a 1945 y sobre las actuaciones de los organismos creados para enfrentarlos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una lista de los países que participaron en la Primera Guerra Mundial.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El número de habitantes de Europa antes de 1939.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los nombres de quienes redactaron la Carta de Naciones Unidas.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Para determinar si los organismos internacionales eliminaron efectivamente los conflictos sería necesario estudiar qué ocurrió después de su creación y cómo actuaron ante las crisis posteriores.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q44',
      displayOrder: 44,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T17',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿A qué proceso histórico corresponden principalmente los casos presentados?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'A la expansión colonial europea del siglo XIX.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'A la formación de monarquías absolutas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'A la descolonización desarrollada especialmente después de la Segunda Guerra Mundial.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'A la unificación política de Europa.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'India, Ghana y Argelia son ejemplos del proceso mediante el cual numerosos territorios coloniales alcanzaron su independencia durante las décadas posteriores a 1945.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q45',
      displayOrder: 45,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T17',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué característica del proceso puede observarse directamente en la tabla?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todas las independencias ocurrieron durante el mismo año.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El proceso involucró territorios bajo distintas potencias coloniales y se desarrolló en diferentes momentos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Francia controlaba los tres territorios.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La independencia de los territorios africanos ocurrió antes que la de India.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla presenta territorios asociados a diferentes potencias coloniales y fechas de independencia entre 1947 y 1962.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q46',
      displayOrder: 46,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T18',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué interpretación de los procesos latinoamericanos plantea principalmente la fuente?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las tensiones podían combinar causas y actores internos con influencias propias del contexto internacional.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todos los conflictos fueron creados exclusivamente por las superpotencias.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las sociedades latinoamericanas estuvieron completamente aisladas de la Guerra Fría.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los problemas sociales internos dejaron de influir en la política regional.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto enfatiza precisamente la coexistencia de condiciones locales y de la competencia internacional propia de la Guerra Fría.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q47',
      displayOrder: 47,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T18',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿En qué contexto mundial deben situarse principalmente los procesos descritos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En las independencias latinoamericanas de comienzos del siglo XIX.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En la expansión del absolutismo europeo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En el periodo anterior a la Primera Guerra Mundial.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En la rivalidad bipolar que caracterizó gran parte de la segunda mitad del siglo XX.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La competencia entre Estados Unidos y la Unión Soviética caracterizó el escenario internacional de la Guerra Fría, aproximadamente desde el periodo posterior a 1945 hasta comienzos de la década de 1990.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q48',
      displayOrder: 48,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T18',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué estrategia permitiría explicar con mayor rigor un conflicto latinoamericano ocurrido durante la Guerra Fría?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Examinar únicamente documentos producidos por Estados Unidos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Analizar solo las declaraciones de los gobiernos locales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar condiciones sociales internas, acciones de los distintos actores nacionales y evidencia sobre intervenciones o influencias internacionales.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Suponer que todo conflicto que ocurriera durante la Guerra Fría tenía necesariamente la misma causa.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una explicación histórica rigurosa debe considerar la interacción entre factores internos y externos y contrastar diferentes tipos de evidencia.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q49',
      displayOrder: 49,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T19',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué característica política del régimen aparece directamente en la fuente?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La concentración del poder acompañada por restricciones al pluralismo y a libertades públicas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La ampliación permanente de las facultades del Congreso.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La competencia electoral regular entre distintos partidos durante todo el periodo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La inexistencia de autoridades militares en el gobierno.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La disolución del Congreso y las restricciones impuestas a partidos y libertades públicas son características incompatibles con un sistema democrático pluralista.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q50',
      displayOrder: 50,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T19',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿A qué etapa de la historia chilena corresponde principalmente la situación descrita?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Al proceso de independencia iniciado en 1810.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'A la dictadura militar iniciada en 1973.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'A la República Parlamentaria del siglo XIX.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Al periodo de organización de la República durante la década de 1830.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fuente identifica explícitamente el golpe de Estado de 1973 y el establecimiento posterior de la dictadura militar.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q51',
      displayOrder: 51,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T19',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Por qué resulta importante contrastar documentos oficiales con expedientes judiciales, informes, prensa y testimonios para estudiar este periodo?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque los documentos oficiales carecen siempre de cualquier valor histórico.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque un testimonio individual permite reconstruir por sí solo todo un periodo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque todas las fuentes necesariamente describen los hechos de manera idéntica.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque fuentes producidas desde distintas posiciones permiten comparar información, detectar omisiones y construir interpretaciones mejor fundamentadas.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las fuentes históricas poseen propósitos y perspectivas diferentes. Contrastarlas permite corroborar información y comprender un proceso complejo sin depender de una sola voz.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q52',
      displayOrder: 52,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T20',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué transformación histórica representan principalmente los dos primeros acontecimientos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El comienzo de la expansión colonial europea.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La consolidación inicial de la Guerra Fría.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El debilitamiento y término del orden bipolar característico de la Guerra Fría.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La desaparición de los Estados nacionales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La caída del Muro de Berlín y la disolución de la Unión Soviética constituyen hitos fundamentales del término de la Guerra Fría.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q53',
      displayOrder: 53,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T20',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué fenómeno de fines del siglo XX y comienzos del XXI se vincula mejor con el aumento de los flujos descritos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La desaparición del comercio mundial.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La profundización de procesos de globalización e interdependencia.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El retorno generalizado al aislamiento económico.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La eliminación de las nuevas tecnologías de comunicación.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El aumento de intercambios económicos, financieros, informativos y tecnológicos entre distintas regiones constituye una característica de la profundización de la globalización.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q54',
      displayOrder: 54,
      axis: 'HISTORIA_MUNDO_AMERICA_CHILE',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T20',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes secuencias respeta el orden cronológico presentado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Caída del Muro de Berlín → disolución de la Unión Soviética → funcionamiento de la OMC.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Disolución de la Unión Soviética → funcionamiento de la OMC → caída del Muro.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Funcionamiento de la OMC → caída del Muro → disolución soviética.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Disolución soviética → caída del Muro → funcionamiento de la OMC.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los acontecimientos corresponden respectivamente a 1989, 1991 y 1995.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q55',
      displayOrder: 55,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T21',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué característica de una democracia puede observarse en conjunto en las situaciones?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La eliminación de toda representación política.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La concentración permanente de las decisiones en organizaciones sociales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La combinación de representación electoral con diferentes mecanismos de participación ciudadana.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La prohibición de participar entre una elección y otra.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las situaciones incluyen representantes electos y, al mismo tiempo, acciones ciudadanas desarrolladas durante el periodo entre elecciones.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q56',
      displayOrder: 56,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T21',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué diferencia principal existe entre las situaciones I y III?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En la Situación III no existe ninguna participación política.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En la Situación I los ciudadanos ejercen directamente funciones judiciales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En ambas situaciones la decisión final corresponde necesariamente a la organización vecinal.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La primera muestra una decisión ejercida por representantes electos, mientras la segunda incorpora participación directa de ciudadanos en la deliberación pública.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La Situación I corresponde al ejercicio de atribuciones por autoridades representativas, mientras que la audiencia permite la intervención directa de habitantes en la discusión de un asunto público.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q57',
      displayOrder: 57,
      axis: 'FORMACION_CIUDADANA',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T21',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una persona afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"En una democracia representativa, después de votar la ciudadanía no necesita ninguna otra posibilidad de participar hasta la siguiente elección".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la principal debilidad de esta afirmación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una democracia representativa no utiliza elecciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La representación electoral puede coexistir con mecanismos de participación, deliberación y fiscalización ciudadana entre elecciones.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todas las decisiones públicas deberían resolverse mediante votación directa.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las organizaciones sociales deben reemplazar a las autoridades elegidas.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La representación política no excluye otras formas de participación democrática. Audiencias, organizaciones, peticiones y mecanismos de fiscalización pueden funcionar junto con las elecciones.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q58',
      displayOrder: 58,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T22',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué principio debería considerarse especialmente al analizar esta situación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La igualdad y la prohibición de discriminaciones arbitrarias.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El derecho de toda institución pública a excluir personas sin justificación.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La imposibilidad de modificar programas públicos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La superioridad de las costumbres administrativas respecto de los derechos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El hecho de que una práctica sea habitual no basta para justificar un trato que pueda excluir injustificadamente a una persona del acceso a un servicio público.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q59',
      displayOrder: 59,
      axis: 'FORMACION_CIUDADANA',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T22',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué información sería más relevante para evaluar si el rechazo de la administración posee una justificación razonable?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El nombre del funcionario que diseñó originalmente el programa.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad de años que lleva funcionando el taller.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La factibilidad, costo y efecto de la adaptación solicitada, junto con las obligaciones de igualdad y accesibilidad aplicables.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La popularidad del deporte en otras comunas.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Evaluar la decisión requiere determinar si existe una razón objetiva para negar la adaptación y considerar los derechos y obligaciones involucrados, no limitarse a la existencia de una costumbre anterior.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q60',
      displayOrder: 60,
      axis: 'FORMACION_CIUDADANA',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T23',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué principio refleja principalmente la existencia de distintas instituciones con funciones de decisión y control?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La concentración de todo el poder en el Ejecutivo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La inexistencia de límites al uso de recursos estatales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La eliminación de responsabilidades entre autoridades.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La distribución del poder y la existencia de controles institucionales.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Distintas instituciones ejercen funciones diferenciadas y pueden controlar determinados aspectos de la actuación de otras, limitando la concentración de poder.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q61',
      displayOrder: 61,
      axis: 'FORMACION_CIUDADANA',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T23',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante sostiene:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"Separar funciones entre instituciones significa que estas nunca deben relacionarse entre sí".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Por qué esa interpretación es incorrecta?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque todas las instituciones deberían realizar exactamente las mismas tareas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la diferenciación de funciones puede coexistir con procedimientos de coordinación y control recíproco.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque únicamente el Ejecutivo debería tomar decisiones públicas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque los controles institucionales eliminan la autonomía de todos los poderes.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La separación o distribución de funciones no implica aislamiento absoluto. En una democracia existen procedimientos mediante los cuales las instituciones interactúan y se controlan dentro de sus competencias.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q62',
      displayOrder: 62,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.HISTORIA.T24',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué cambio se observa directamente entre ambos años?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La producción creció más rápidamente y disminuyó el desempleo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los precios disminuyeron mientras aumentó el empleo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La producción pasó de crecer a contraerse y el desempleo aumentó.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todos los indicadores permanecieron constantes.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El crecimiento pasa de +4 % a −1 %, mientras el desempleo aumenta de 6 % a 9 %.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q63',
      displayOrder: 63,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'ANALISIS_FUENTES',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T24',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué función económica del Estado ejemplifican principalmente las medidas adoptadas durante el Año 2?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Prohibir permanentemente toda actividad privada.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Eliminar el uso del dinero en la economía.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Sustituir a todos los trabajadores desempleados por funcionarios públicos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Intervenir mediante políticas públicas para enfrentar efectos sociales y económicos de una desaceleración.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los programas de apoyo y la inversión pública constituyen formas de intervención estatal orientadas a responder a los efectos de una situación económica desfavorable.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q64',
      displayOrder: 64,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'PENSAMIENTO_TEMPORAL_ESPACIAL',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.HISTORIA.T24',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Considerando los índices presentados, ¿qué ocurrió con el poder adquisitivo asociado al salario promedio?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Tendió a disminuir, porque los precios aumentaron más que el salario nominal promedio.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Aumentó necesariamente, porque el salario nominal subió.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Permaneció exactamente igual, porque ambos índices parten de 100.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No puede relacionarse el nivel de precios con el poder adquisitivo.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El índice salarial aumenta 5 %, mientras que el nivel de precios aumenta 8 %. En términos generales, el salario promedio permite adquirir relativamente menos bienes y servicios.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.HISTORIA.Q65',
      displayOrder: 65,
      axis: 'SISTEMA_ECONOMICO',
      skill: 'PENSAMIENTO_CRITICO',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.HISTORIA.T24',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una analista sostiene:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '"Como conocemos el crecimiento de la producción, el desempleo y los promedios de precios y salarios, podemos afirmar que todas las familias experimentaron exactamente el mismo cambio económico".',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la principal debilidad de esa conclusión?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los indicadores económicos agregados nunca sirven para estudiar una economía.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El desempleo no tiene relación alguna con las condiciones económicas de las familias.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los precios y salarios nominales siempre varían exactamente en la misma proporción.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los promedios agregados no muestran por sí solos cómo los cambios se distribuyen entre hogares con ingresos, empleos y patrones de consumo diferentes.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los indicadores agregados permiten observar tendencias generales, pero no demuestran que todas las personas experimenten sus efectos de igual manera. Para eso se necesitan datos desagregados.',
        },
      ],
    },
  ],
};

export default module_;
