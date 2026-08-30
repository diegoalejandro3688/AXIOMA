// ENSAYO.CIENCIAS.BIOLOGIA -- SOURCE del Ensayo PAES Ciencias, Módulo Biología ZETRYND.
//
// Contenido editorial APPROVED / EDITORIALMENTE CLOSED, version FINAL posterior
// a: escritura Q1-Q80, auditoria curricular PAES Admision 2027, patch curricular
// completo, segunda auditoria global y micro-patch mecanico de posicion de
// alternativas. Transcrito VERBATIM desde el paquete "ZETRYND — ENSAYO PAES
// CIENCIAS, MODULO BIOLOGIA / MASTER IMPLEMENTATION PROMPT".
//
// El paquete lista las alternativas en ORDEN BASE (§9). A 24 preguntas (§8.2)
// se les aplico EXACTAMENTE el permutation map indicado, reordenando SOLO
// options[] sin tocar el texto de ninguna alternativa. Las otras 56 conservan
// el orden base. La clave final resultante es la de §8.3 (compacta
// "BDCCBADAABDCABCCBADCBBCDACDBDCCDAADBCDABBDABBACCABCABADDABCDACBDCCDAABBDDCDDAABC"). Clasificacion (discipline / module / skill / difficulty) y
// clave del mismo paquete. Reutiliza la infraestructura de textos compartidos
// + tablas de ENSAYOS-F2 (commit 5baa53f).
//
// Unicas adaptaciones aplicadas -- puramente tecnicas, contenido visible
// identico (ADR-0024):
//   - Cada linea del paquete -> un bloque 'paragraph' independiente, en orden
//     (prosa, enumeraciones I/II/III/IV, listas con guion, citas, ecuaciones
//     en linea como "F=ma" / "2 H₂ + O₂ → 2 H₂O").
//   - Las 32 tablas productivas (31 textos; T6 tiene 2) -> bloque 'table'
//     estructurado de F2 (headers / rows / footnote), sin alterar ningun
//     valor, unidad, coma decimal, signo de grado, Ω, subindice ni el signo
//     menos U+2212 de "−15 °C" (T19).
//   - El titulo de cada texto se guarda en ExamPassage.title.
//   - Los "textos adicionales del mismo passage" (§9, Q9/Q12/Q28) se integran
//     como contenido del texto compartido, en su posicion de lectura.
//
// Cero cambios de prosa, stems, distractores, respuesta correcta,
// explicaciones, disciplina, modulo, habilidad, dificultad, titulos, numeros,
// unidades ni mapping texto->pregunta.
import type { ExamSourceModule } from '../schema';

const module_: ExamSourceModule = {
  examKey: 'ENSAYO.CIENCIAS.BIOLOGIA',
  title: 'Ensayo PAES Ciencias — Módulo Biología',
  subjectKey: 'ciencias',
  durationMinutes: 160,
  passages: [
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T1',
      displayOrder: 1,
      title: 'Especialización celular',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un equipo compara características de dos tipos de células humanas.',
        },
        {
          type: 'table',
          order: 1,
          headers: [
            'Tipo celular',
            'Retículo endoplasmático rugoso',
            'Complejo de Golgi',
            'Mitocondrias',
          ],
          rows: [
            ['Célula secretora pancreática', 'Muy abundante', 'Muy abundante', 'Abundancia media'],
            ['Célula muscular esquelética', 'Poco abundante', 'Poco abundante', 'Muy abundantes'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Las observaciones se realizaron utilizando el mismo procedimiento de preparación y análisis microscópico.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T2',
      displayOrder: 2,
      title: 'Luz y fotosíntesis',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una planta acuática fue mantenida bajo las mismas condiciones de temperatura y disponibilidad de dióxido de carbono. Se modificó únicamente la distancia entre la planta y una fuente luminosa.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Distancia a la fuente de luz', 'Burbujas de gas liberadas por minuto'],
          rows: [
            ['10 cm', '42'],
            ['20 cm', '27'],
            ['40 cm', '12'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Las burbujas se utilizaron como indicador indirecto de la tasa fotosintética.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T3',
      displayOrder: 3,
      title: 'Transmisión en una sinapsis química',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se estudia el efecto de una sustancia sobre neuronas conectadas mediante una sinapsis química.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Variable observada', 'Control', 'Con sustancia'],
          rows: [
            ['Impulso nervioso llega al terminal presináptico', 'Sí', 'Sí'],
            ['Liberación relativa de neurotransmisor', '100', '8'],
            ['Respuesta relativa de la célula postsináptica', '100', '10'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T4',
      displayOrder: 4,
      title: 'Transferencia de energía en un ecosistema',
      content: [
        {
          type: 'table',
          order: 0,
          headers: ['Nivel trófico', 'Energía disponible'],
          rows: [
            ['Productores', '20.000 kJ'],
            ['Herbívoros', '2.300 kJ'],
            ['Carnívoros', '260 kJ'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T5',
      displayOrder: 5,
      title: 'Ondas electromagnéticas',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Tres señales electromagnéticas se propagan en el mismo medio.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Señal', 'Frecuencia', 'Longitud de onda'],
          rows: [
            ['X', '100 MHz', '3,0 m'],
            ['Y', '200 MHz', '1,5 m'],
            ['Z', '300 MHz', '1,0 m'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Un segundo grupo quiere investigar cómo cambia la refracción de un haz de luz al ingresar a distintos materiales transparentes.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T6',
      displayOrder: 6,
      title: 'Fuerza, aceleración y movimiento',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un carro de masa constante se mueve sobre una superficie horizontal de baja fricción.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Fuerza neta aplicada', 'Aceleración'],
          rows: [
            ['2 N', '1 m/s²'],
            ['4 N', '2 m/s²'],
            ['6 N', '3 m/s²'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Un móvil se desplaza en línea recta y se registran los siguientes datos:',
        },
        {
          type: 'table',
          order: 3,
          headers: ['Tiempo', 'Posición'],
          rows: [
            ['0 s', '0 m'],
            ['1 s', '2 m'],
            ['2 s', '4 m'],
            ['3 s', '6 m'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T7',
      displayOrder: 7,
      title: 'Resistencia eléctrica',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una fuente mantiene una diferencia de potencial de 6 V. Se conectan individualmente distintos resistores y se mide la corriente.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Resistencia', 'Corriente'],
          rows: [
            ['2 Ω', '3,0 A'],
            ['4 Ω', '1,5 A'],
            ['6 Ω', '1,0 A'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T8',
      displayOrder: 8,
      title: 'Temperatura y solubilidad',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se determina experimentalmente la masa máxima de un sólido que puede disolverse en 100 g de agua a distintas temperaturas.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Temperatura', 'Masa máxima disuelta'],
          rows: [
            ['10 °C', '18 g'],
            ['25 °C', '26 g'],
            ['40 °C', '37 g'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T9',
      displayOrder: 9,
      title: 'Separación de una mezcla',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un laboratorio prepara una mezcla con una cantidad conocida de arena insoluble en agua y agua. Se quiere estudiar cuán eficaz resulta la filtración para recuperar la arena.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T10',
      displayOrder: 10,
      title: 'Estructura atómica',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se estudian dos átomos neutros.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Átomo', 'Protones', 'Neutrones', 'Electrones'],
          rows: [
            ['X', '17', '18', '17'],
            ['Y', '17', '20', '17'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T11',
      displayOrder: 11,
      title: 'Conservación y relaciones cuantitativas',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un equipo quiere comprobar la conservación de la masa durante una reacción que produce un gas.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Además, para analizar relaciones estequiométricas utiliza el siguiente modelo de reacción:',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '2 A + B → A₂B',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T12',
      displayOrder: 12,
      title: 'Cambios durante el ciclo ovárico y uterino',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un seguimiento educativo de un ciclo de 28 días se registran los siguientes acontecimientos generales:',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Periodo aproximado', 'Ovario', 'Útero'],
          rows: [
            [
              'Días 1–5',
              'Comienza el desarrollo de folículos',
              'Se elimina parte del revestimiento uterino',
            ],
            [
              'Días 6–13',
              'Un folículo continúa madurando',
              'El revestimiento uterino aumenta su grosor',
            ],
            [
              'Alrededor del día 14',
              'Ocurre la ovulación',
              'El revestimiento permanece desarrollado',
            ],
            [
              'Días 15–28',
              'Se desarrolla el cuerpo lúteo',
              'El revestimiento se mantiene preparado y posteriormente puede comenzar un nuevo ciclo',
            ],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T13',
      displayOrder: 13,
      title: 'Bacterias y resistencia a un antibiótico',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una población bacteriana contiene inicialmente individuos sensibles y algunos resistentes a un antibiótico. Los investigadores cultivan bacterias durante varias generaciones en presencia del antibiótico.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Al finalizar, la proporción de bacterias resistentes es mucho mayor que al comienzo.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T14',
      displayOrder: 14,
      title: 'Estructura y función de los gametos',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se comparan algunas características generales de dos gametos humanos.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Característica', 'Gameto X', 'Gameto Y'],
          rows: [
            ['Tamaño relativo', 'Grande', 'Pequeño'],
            ['Cantidad de citoplasma', 'Abundante', 'Escasa'],
            ['Flagelo', 'Ausente', 'Presente'],
            ['Capacidad de desplazamiento propio', 'Muy limitada', 'Alta'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T15',
      displayOrder: 15,
      title: 'Movimiento de un carro',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un carro de 2,0 kg se mueve en línea recta.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Tiempo', 'Velocidad'],
          rows: [
            ['0 s', '0 m/s'],
            ['1 s', '2 m/s'],
            ['2 s', '4 m/s'],
            ['3 s', '6 m/s'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Un segundo equipo quiere estudiar cómo el roce entre el carro y la superficie afecta su aceleración cuando se aplica la misma fuerza.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T16',
      displayOrder: 16,
      title: 'Formación de imágenes con una lente convergente',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un grupo utiliza siempre la misma lente convergente y modifica la distancia entre un objeto y la lente.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'La imagen real se proyecta sobre una pantalla.',
        },
        {
          type: 'table',
          order: 2,
          headers: ['Distancia objeto–lente', 'Distancia lente–imagen'],
          rows: [
            ['40 cm', '13,3 cm'],
            ['30 cm', '15,0 cm'],
            ['20 cm', '20,0 cm'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T17',
      displayOrder: 17,
      title: 'Sismos y subducción',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una zona donde una placa oceánica converge con una placa continental se registran sismos a distintas distancias desde la fosa oceánica hacia el continente.',
        },
        {
          type: 'table',
          order: 1,
          headers: [
            'Distancia aproximada desde la fosa hacia el continente',
            'Profundidad media de los sismos',
          ],
          rows: [
            ['20 km', '18 km'],
            ['100 km', '75 km'],
            ['200 km', '155 km'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T18',
      displayOrder: 18,
      title: 'Circuitos eléctricos',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante quiere investigar cómo cambia la corriente total cuando se conectan resistores idénticos de distintas maneras a una misma fuente de voltaje constante.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T19',
      displayOrder: 19,
      title: 'Propiedades físicas de sustancias puras',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Tres sustancias puras presentan las siguientes propiedades a una misma presión:',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Sustancia', 'Temperatura de fusión', 'Temperatura de ebullición'],
          rows: [
            ['X', '−15 °C', '65 °C'],
            ['Y', '12 °C', '98 °C'],
            ['Z', '78 °C', '160 °C'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T20',
      displayOrder: 20,
      title: 'Determinación experimental de densidad',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un grupo quiere investigar si distintas muestras de un mismo material presentan una densidad aproximadamente constante.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T21',
      displayOrder: 21,
      title: 'Modelo de una reacción química',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un modelo de partículas representa la reacción:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '2 H₂ + O₂ → 2 H₂O',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Antes de reaccionar hay:',
        },
        {
          type: 'paragraph',
          order: 3,
          text: '- 4 moléculas de H₂',
        },
        {
          type: 'paragraph',
          order: 4,
          text: '- 2 moléculas de O₂',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T22',
      displayOrder: 22,
      title: 'Preparación de una disolución',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un laboratorio prepara 500 mL de una disolución acuosa que contiene 0,25 mol de un soluto.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T23',
      displayOrder: 23,
      title: 'Respiración celular en semillas',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un grupo estudia el consumo de oxígeno de semillas en germinación mediante recipientes cerrados. En cada recipiente se coloca una sustancia que absorbe el dióxido de carbono producido, de modo que una disminución del volumen gaseoso permite estimar indirectamente el consumo de oxígeno.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Se obtienen los siguientes resultados durante 30 minutos:',
        },
        {
          type: 'table',
          order: 2,
          headers: ['Condición', 'Disminución del volumen gaseoso'],
          rows: [
            ['Semillas germinando', '4,8 mL'],
            ['Semillas no germinadas', '0,7 mL'],
            ['Semillas hervidas', '0,1 mL'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T24',
      displayOrder: 24,
      title: 'Respuesta del sistema nervioso a un estímulo',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un modelo experimental de arco reflejo se aplica un estímulo mecánico de distinta intensidad sobre el mismo receptor sensorial. Se mantienen constantes las demás condiciones y se mide el tiempo transcurrido hasta la aparición de una respuesta motora.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Intensidad del estímulo', 'Tiempo de respuesta'],
          rows: [
            ['Baja', '120 ms'],
            ['Media', '95 ms'],
            ['Alta', '92 ms'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T25',
      displayOrder: 25,
      title: 'Refracción de la luz',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un haz de luz pasa desde el aire hacia un material transparente.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Ángulo de incidencia', 'Ángulo de refracción'],
          rows: [
            ['20°', '13°'],
            ['40°', '25°'],
            ['60°', '35°'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T26',
      displayOrder: 26,
      title: 'Potencia y consumo de energía eléctrica',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Dos aparatos funcionan conectados a una red eléctrica.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Aparato', 'Potencia', 'Tiempo de uso'],
          rows: [
            ['X', '1.000 W', '30 min'],
            ['Y', '500 W', '2 h'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T27',
      displayOrder: 27,
      title: 'Serie de alcoholes',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se registran propiedades de tres compuestos pertenecientes a una misma familia orgánica.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Sustancia', 'Fórmula molecular', 'Temperatura de ebullición'],
          rows: [
            ['Metanol', 'CH₄O', '65 °C'],
            ['Etanol', 'C₂H₆O', '78 °C'],
            ['Propanol', 'C₃H₈O', '97 °C'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T28',
      displayOrder: 28,
      title: 'Separación de una disolución mediante destilación',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un laboratorio dispone de una disolución homogénea formada por agua y una sal no volátil. Se quiere recuperar agua a partir de la mezcla utilizando diferencias en las propiedades físicas de sus componentes.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T29',
      displayOrder: 29,
      title: 'Fórmula empírica de un compuesto',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un compuesto contiene únicamente carbono e hidrógeno.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Una muestra contiene:',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '- 24 g de carbono',
        },
        {
          type: 'paragraph',
          order: 3,
          text: '- 4 g de hidrógeno',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'Para el análisis se consideran aproximadamente:',
        },
        {
          type: 'paragraph',
          order: 5,
          text: '- masa molar del C = 12 g/mol',
        },
        {
          type: 'paragraph',
          order: 6,
          text: '- masa molar del H = 1 g/mol',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T30',
      displayOrder: 30,
      title: 'Temperatura y solubilidad',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un grupo quiere investigar si la temperatura influye en la solubilidad de un sólido en agua.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Ensayo', 'Temperatura', 'Masa de agua', 'Masa máxima de sólido disuelta'],
          rows: [
            ['I', '20 °C', '100 g', '24 g'],
            ['II', '40 °C', '200 g', '60 g'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'A partir de esos resultados, el grupo concluye:',
        },
        {
          type: 'paragraph',
          order: 3,
          text: '“Al aumentar la temperatura de 20 °C a 40 °C, la solubilidad del sólido aumentó desde 24 g hasta 60 g por cada 100 g de agua”.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T31',
      displayOrder: 31,
      title: 'Manipulación genética y producción de un fármaco',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se estudian dos cultivos de una misma especie bacteriana mantenidos bajo condiciones equivalentes.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '- Cultivo control: bacterias sin modificación.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '- Cultivo M: bacterias a las que se incorporó información genética que permite producir una proteína de interés farmacéutico.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Después del mismo tiempo de cultivo se obtiene:',
        },
        {
          type: 'table',
          order: 4,
          headers: ['Cultivo', 'Proteína de interés detectada'],
          rows: [
            ['Control', '0 unidades'],
            ['M', '85 unidades'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T32',
      displayOrder: 32,
      title: 'Anatomía comparada y evolución',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se comparan las extremidades anteriores de tres vertebrados.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Organismo', 'Organización ósea básica', 'Función principal'],
          rows: [
            ['Humano', 'Húmero, radio, cúbito y huesos de la mano', 'Manipulación'],
            ['Murciélago', 'Húmero, radio, cúbito y huesos de la mano modificados', 'Vuelo'],
            ['Ballena', 'Húmero, radio, cúbito y huesos de la mano modificados', 'Natación'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T33',
      displayOrder: 33,
      title: 'Punto de control del ciclo celular',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se estudian dos poblaciones celulares después de provocar un daño equivalente en su ADN.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '- Población X: posee un punto de control G1–S funcional.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '- Población Y: presenta una alteración que disminuye el funcionamiento de ese punto de control.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Después del tratamiento se determina qué porcentaje de células continúa hacia la fase S.',
        },
        {
          type: 'table',
          order: 4,
          headers: ['Población', 'Células que ingresan a fase S'],
          rows: [
            ['X', '12 %'],
            ['Y', '68 %'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T34',
      displayOrder: 34,
      title: 'Ciclo celular y cantidad de ADN',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un cultivo de células eucariontes es sincronizado para estudiar distintos momentos del ciclo celular.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'La cantidad de ADN por célula se expresa en unidades relativas.',
        },
        {
          type: 'table',
          order: 2,
          headers: ['Etapa observada', 'Cantidad de ADN por célula'],
          rows: [
            ['G1', '2,0'],
            ['Durante S', 'entre 2,0 y 4,0'],
            ['G2', '4,0'],
            ['Después de la división celular', '2,0 por célula hija'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T35',
      displayOrder: 35,
      title: 'Mitosis y punto de control de metafase',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se cultivan células de un mismo tejido bajo dos condiciones. Después del mismo tiempo se determina qué porcentaje de las células que se encuentran en mitosis está en cada etapa.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Etapa mitótica', 'Control', 'Tratamiento X'],
          rows: [
            ['Profase', '35 %', '15 %'],
            ['Metafase', '25 %', '65 %'],
            ['Anafase', '20 %', '10 %'],
            ['Telofase', '20 %', '10 %'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Las demás condiciones del cultivo se mantienen constantes.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T36',
      displayOrder: 36,
      title: 'Meiosis I y meiosis II',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una célula diploide se sigue el comportamiento de un par de cromosomas homólogos durante la meiosis.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Se registran estos acontecimientos:',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'I. Los cromosomas homólogos se ubican formando pares en la región ecuatorial.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'II. Los cromosomas homólogos se separan hacia polos opuestos.',
        },
        {
          type: 'paragraph',
          order: 4,
          text: 'III. En cada una de las células resultantes, las cromátidas hermanas se ubican en la región ecuatorial.',
        },
        {
          type: 'paragraph',
          order: 5,
          text: 'IV. Las cromátidas hermanas se separan hacia polos opuestos.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T37',
      displayOrder: 37,
      title: 'Resistencia y selección natural',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una población de insectos contiene individuos susceptibles y resistentes a un insecticida.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: 'Se mantienen dos poblaciones equivalentes durante varias generaciones.',
        },
        {
          type: 'table',
          order: 2,
          headers: ['Generación', 'Resistentes sin insecticida', 'Resistentes con insecticida'],
          rows: [
            ['0', '8 %', '8 %'],
            ['5', '10 %', '34 %'],
            ['10', '12 %', '71 %'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T38',
      displayOrder: 38,
      title: 'Registro fósil y cambio a través del tiempo',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una secuencia de estratos sedimentarios de una misma región se encuentran fósiles de organismos relacionados. Los estratos inferiores son más antiguos que los superiores.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Estrato', 'Antigüedad relativa', 'Característica del fósil'],
          rows: [
            ['I', 'Más antiguo', 'Estructura locomotora corta y robusta'],
            ['II', 'Intermedio', 'Estructura locomotora de longitud intermedia'],
            ['III', 'Más reciente', 'Estructura locomotora más larga y delgada'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'Los tres tipos de fósiles comparten además varias características anatómicas básicas.',
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T39',
      displayOrder: 39,
      title: 'Etapas de la fotosíntesis',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se preparan dos fracciones de cloroplastos:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '- Fracción T: rica en membranas de tilacoides.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '- Fracción E: rica en componentes del estroma.',
        },
        {
          type: 'paragraph',
          order: 3,
          text: 'Bajo condiciones experimentales controladas se obtienen estos resultados:',
        },
        {
          type: 'table',
          order: 4,
          headers: ['Fracción y condición', 'O₂ liberado', 'Producción de azúcares'],
          rows: [
            ['T iluminada', 'Sí', 'No'],
            ['T en oscuridad', 'No', 'No'],
            [
              'E con productos energéticos provenientes de la etapa dependiente de luz y CO₂',
              'No',
              'Sí',
            ],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T40',
      displayOrder: 40,
      title: 'Flujo de energía en una cadena trófica',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un ecosistema se estima la energía disponible en una cadena trófica durante un mismo periodo.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Nivel', 'Energía disponible'],
          rows: [
            ['Productores', '50.000 kJ'],
            ['Consumidores primarios', '6.000 kJ'],
            ['Consumidores secundarios', '720 kJ'],
            ['Consumidores terciarios', '90 kJ'],
          ],
        },
      ],
    },
    {
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T41',
      displayOrder: 41,
      title: 'Factores que limitan la fotosíntesis',
      content: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una especie vegetal es estudiada bajo dos intensidades luminosas y dos concentraciones de dióxido de carbono. La tasa fotosintética se expresa en unidades relativas.',
        },
        {
          type: 'table',
          order: 1,
          headers: ['Luz', 'CO₂', 'Tasa fotosintética'],
          rows: [
            ['Baja', 'Baja', '10'],
            ['Baja', 'Alta', '13'],
            ['Alta', 'Baja', '18'],
            ['Alta', 'Alta', '34'],
          ],
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'La temperatura y las demás condiciones se mantienen constantes.',
        },
      ],
    },
  ],
  questions: [
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q1',
      displayOrder: 1,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes preguntas puede investigarse directamente mediante una comparación como la presentada?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuántos tipos celulares diferentes existen en todos los organismos?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo se relaciona el tipo celular con la abundancia relativa de determinadas estructuras celulares?',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué célula apareció primero durante la evolución de los animales?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuántos genes posee cada una de las células estudiadas?',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La investigación compara tipos celulares y registra la abundancia relativa de distintas estructuras. Por ello permite estudiar directamente la relación entre especialización celular y características estructurales.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q2',
      displayOrder: 2,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué inferencia está mejor respaldada por los datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las células musculares carecen completamente de organelos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todas las células humanas contienen los organelos en la misma proporción.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una mayor cantidad de mitocondrias impide que una célula produzca proteínas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La abundancia de retículo endoplasmático rugoso y complejo de Golgi en la célula pancreática es consistente con una función intensa de síntesis y secreción de proteínas.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El retículo endoplasmático rugoso participa en la síntesis de proteínas y el complejo de Golgi en su modificación y distribución. Su elevada abundancia es coherente con una célula especializada en secreción.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q3',
      displayOrder: 3,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T1',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si se quisiera comparar con mayor confiabilidad la abundancia de mitocondrias entre ambos tipos celulares, ¿qué procedimiento sería más adecuado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar una técnica diferente para cada tipo celular.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Examinar una única célula pancreática y una única célula muscular.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Analizar varias células de cada tipo mediante el mismo método de preparación, tinción y cuantificación, y comparar los resultados obtenidos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar simultáneamente el tipo celular, la técnica microscópica y el criterio de medición.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El uso de varias observaciones y de un procedimiento estandarizado permite disminuir la influencia de variaciones particulares y hace más confiable la comparación.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q4',
      displayOrder: 4,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué tendencia muestran directamente los resultados?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La liberación de burbujas aumenta a medida que la planta se aleja de la luz.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La distancia a la luz no se relaciona con los resultados.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Dentro del rango estudiado, una menor distancia a la fuente luminosa se asocia con una mayor liberación de burbujas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La planta deja completamente de realizar fotosíntesis a 40 cm.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La frecuencia de burbujas es mayor a 10 cm y disminuye progresivamente al aumentar la distancia.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q5',
      displayOrder: 5,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T2',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante concluye:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Mientras más luz reciba una planta, mayor será siempre su tasa fotosintética, sin importar ninguna otra condición”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la principal limitación de esa conclusión?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La luz nunca influye en la fotosíntesis.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El experimento estudió un rango limitado y no permite descartar que otros factores se vuelvan limitantes a intensidades luminosas mayores.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las plantas no requieren dióxido de carbono.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La producción de oxígeno solo ocurre en ausencia de luz.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos permiten describir la relación dentro de las condiciones ensayadas, pero no justifican extenderla indefinidamente. La fotosíntesis también puede ser limitada por temperatura, dióxido de carbono u otros factores.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q6',
      displayOrder: 6,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T3',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué interpretación es más consistente con los resultados?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La sustancia interfiere con la transmisión química después de que el impulso alcanza el terminal presináptico, reduciendo la liberación de neurotransmisor.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La sustancia impide completamente que el impulso nervioso llegue al terminal presináptico.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La sustancia aumenta la liberación de neurotransmisor.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La célula postsináptica responde con mayor intensidad en presencia de la sustancia.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El impulso sigue llegando al terminal, pero disminuyen fuertemente la liberación de neurotransmisor y la respuesta postsináptica. Los datos son coherentes con una alteración de la transmisión en la sinapsis química.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q7',
      displayOrder: 7,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'COMUNICAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T4',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un grupo debe presentar estos resultados a estudiantes de otro curso con el objetivo de mostrar cómo cambia la energía disponible al avanzar entre niveles tróficos.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '¿Qué recurso sería más adecuado para comunicar esa información?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una lista alfabética de especies del ecosistema sin indicar su nivel trófico ni la energía disponible.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un texto que informe únicamente la energía disponible en los carnívoros.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una imagen del ecosistema sin valores de energía ni identificación de los niveles tróficos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico de barras con los niveles tróficos ordenados en un eje y la energía disponible, en kJ, representada en el otro.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un gráfico de barras permite comparar directamente la cantidad de energía disponible en los tres niveles y visualizar claramente su disminución.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q8',
      displayOrder: 8,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué relación muestran directamente los datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Al aumentar la frecuencia disminuye la longitud de onda, manteniéndose constante aproximadamente el producto entre ambas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La longitud de onda aumenta al aumentar la frecuencia.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Frecuencia y longitud de onda son iguales para las tres señales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las señales de mayor frecuencia necesariamente se propagan más lentamente en el mismo medio.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los productos son equivalentes: 100×3,0, 200×1,5 y 300×1,0. Dentro de un mismo medio, al aumentar la frecuencia disminuye la longitud de onda.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q9',
      displayOrder: 9,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T5',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál es el procedimiento más adecuado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar el mismo tipo de luz y el mismo ángulo de incidencia en distintos materiales, midiendo en cada caso el ángulo de refracción.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar simultáneamente el material, el color de la luz y el ángulo de incidencia.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar únicamente un material y no realizar comparaciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Usar diferentes ángulos de incidencia sin registrar qué material se utiliza.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Para estudiar el efecto del material deben mantenerse controladas las demás variables relevantes y comparar el ángulo de refracción bajo condiciones equivalentes.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q10',
      displayOrder: 10,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué relación muestran los datos para el carro estudiado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La aceleración disminuye al aumentar la fuerza neta.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La aceleración aumenta proporcionalmente con la fuerza neta cuando la masa permanece constante.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La aceleración es independiente de la fuerza neta.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La fuerza neta y la aceleración poseen siempre el mismo valor numérico.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Al duplicar o triplicar la fuerza también se duplica o triplica la aceleración, coherente con la relación F=ma para una masa constante.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q11',
      displayOrder: 11,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Si se mantiene una fuerza neta de 4 N pero se duplica la masa del carro, la aceleración seguirá siendo 2 m/s²”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cómo debe evaluarse la afirmación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque la aceleración depende únicamente de la fuerza.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque la masa no participa en la dinámica del carro.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque duplicar la masa duplica necesariamente la aceleración.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque, manteniendo la misma fuerza neta, duplicar la masa reduce la aceleración a la mitad.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Según a=F/m, con fuerza constante la aceleración es inversamente proporcional a la masa.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q12',
      displayOrder: 12,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'COMUNICAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T6',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un grupo quiere comunicar visualmente que la posición del móvil aumenta uniformemente con el tiempo durante el intervalo estudiado.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '¿Qué recurso sería más apropiado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una fotografía del móvil tomada al finalizar el recorrido, sin información temporal.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una lista con diferentes tipos de fuerzas que podrían actuar sobre un cuerpo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico de posición en función del tiempo que represente los cuatro pares de datos registrados.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un dibujo del móvil sin escala ni valores de posición.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un gráfico posición-tiempo representa simultáneamente ambas variables y permite visualizar directamente el patrón de cambio uniforme observado.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q13',
      displayOrder: 13,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes preguntas puede responderse directamente mediante estos datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo varía la corriente cuando cambia la resistencia y se mantiene constante el voltaje?',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿De qué material está fabricada cada resistencia?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo cambia la corriente cuando simultáneamente cambian resistencia y voltaje?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué temperatura alcanza cada resistor después de una hora?',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En la experiencia se mantiene constante el voltaje y se modifica la resistencia, midiendo la corriente resultante.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q14',
      displayOrder: 14,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T7',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Como el voltaje se mantiene en 6 V, la potencia eléctrica es la misma para todas las resistencias”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la evaluación correcta?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es correcta porque la potencia depende exclusivamente del voltaje.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es incorrecta: al aumentar la resistencia disminuye la corriente y, a voltaje constante, también disminuye la potencia.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es correcta porque todas las resistencias reciben la misma corriente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es incorrecta porque aumentar la resistencia necesariamente aumenta la corriente.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La potencia puede expresarse como P=VI. El voltaje permanece constante, pero la corriente disminuye al aumentar la resistencia; por ello la potencia también disminuye.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q15',
      displayOrder: 15,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T8',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué pregunta puede investigarse directamente mediante estos datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué sólido fue descubierto primero en la historia?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué cantidad de este sólido existe en todos los ambientes naturales?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo se relaciona la temperatura con la masa máxima de este sólido que puede disolverse en una cantidad fija de agua?',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál es la rapidez con que ocurre cualquier reacción química a distintas temperaturas?',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La investigación compara temperatura con la cantidad máxima de soluto que puede disolverse en una misma cantidad de solvente, por lo que estudia directamente un factor que influye en la solubilidad.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q16',
      displayOrder: 16,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T9',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de los siguientes procedimientos permite evaluar mejor la recuperación del sólido mediante filtración?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Calentar la mezcla hasta evaporar toda el agua sin registrar ninguna masa.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Agregar una cantidad desconocida de otra sustancia antes de filtrar.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Conocer la masa inicial de arena, filtrar la mezcla, secar completamente el sólido recuperado y medir su masa utilizando el mismo procedimiento en varias réplicas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Observar la mezcla antes de filtrar sin recoger ni medir el sólido posteriormente.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Comparar la masa conocida inicialmente con la masa seca recuperada permite cuantificar la eficacia de la filtración. Las réplicas aumentan además la confiabilidad del resultado.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q17',
      displayOrder: 17,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T10',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué conclusión se obtiene correctamente de los datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'X e Y pertenecen a elementos diferentes porque poseen distinto número de neutrones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'X e Y poseen el mismo número atómico, pero diferente número másico.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Y posee un número atómico mayor que X.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'X posee carga eléctrica positiva y Y carga negativa.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Ambos tienen 17 protones, por lo que su número atómico es 17. Sus números másicos son diferentes: X tiene 17+18=35 y Y 17+20=37.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q18',
      displayOrder: 18,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T11',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué diseño permite evaluar de manera más adecuada la conservación de la masa?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Realizar la reacción en un sistema cerrado y comparar la masa total del sistema antes y después.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Dejar escapar todos los productos gaseosos y pesar únicamente el recipiente vacío.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Medir solo la masa de uno de los reactantes antes de comenzar.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar recipientes diferentes sin conocer sus masas iniciales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La conservación de la masa debe evaluarse considerando todo el sistema. Un sistema cerrado evita que productos gaseosos abandonen el conjunto que se está midiendo.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q19',
      displayOrder: 19,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T11',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Según el modelo:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '2 A + B → A₂B',
        },
        {
          type: 'paragraph',
          order: 2,
          text: 'si inicialmente existen 6 mol de A y 4 mol de B, ¿qué se espera al finalizar una reacción completa?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Se producen 6 mol de A₂B y no sobra ningún reactante.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'B es el reactante limitante y sobran 2 mol de A.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Se producen 4 mol de A₂B y sobra 1 mol de A.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'A es el reactante limitante, se producen 3 mol de A₂B y sobra 1 mol de B.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cada mol de B requiere 2 mol de A. Los 6 mol de A pueden reaccionar con 3 mol de B, generando 3 mol de A₂B. Por lo tanto, A se consume completamente y queda 1 mol de B.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q20',
      displayOrder: 20,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T11',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En otro ensayo realizado en un recipiente abierto, la masa medida al terminar es menor que al inicio. Un estudiante concluye:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“La reacción destruyó parte de la materia”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación de esa conclusión?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta, porque toda reacción química destruye una fracción de los átomos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta siempre que aumente la temperatura.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No está justificada: si se produjo un gas que abandonó el recipiente, la masa medida puede disminuir aunque la masa total se conserve en un sistema cerrado.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque una reacción química nunca puede producir gases.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una disminución de la masa medida en un sistema abierto puede deberse a que materia abandonó el sistema. Ese resultado no demuestra destrucción de materia.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q21',
      displayOrder: 21,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T12',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes preguntas puede investigarse directamente mediante un seguimiento como el presentado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuántos ciclos reproductivos presentan todas las especies de mamíferos?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo se relacionan temporalmente los cambios observados en el ovario con los cambios del revestimiento uterino durante un ciclo?',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál fue el origen evolutivo del sistema reproductor humano?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué genes participan en todas las etapas del desarrollo embrionario?',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El seguimiento registra simultáneamente cambios ováricos y uterinos a lo largo del tiempo, por lo que permite estudiar la relación temporal entre ambos procesos.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q22',
      displayOrder: 22,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T12',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Según la información presentada, ¿qué acontecimiento ocurre aproximadamente hacia la mitad del ciclo?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El inicio de un nuevo periodo menstrual.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La ovulación.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La eliminación completa del revestimiento uterino.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La desaparición permanente de los folículos ováricos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla sitúa la ovulación aproximadamente alrededor del día 14, es decir, hacia la mitad del ciclo representado.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q23',
      displayOrder: 23,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T13',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué diseño permitiría estudiar mejor si la presencia del antibiótico favorece el aumento de bacterias resistentes?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cultivar únicamente bacterias resistentes sin realizar comparaciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar simultáneamente antibiótico, temperatura y nutrientes en cada cultivo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar poblaciones equivalentes cultivadas con y sin antibiótico durante el mismo número de generaciones y bajo las mismas demás condiciones.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Observar una única bacteria después de agregar el antibiótico.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un grupo sin antibiótico permite comparar qué ocurre cuando la presión selectiva está ausente, mientras las demás variables se mantienen controladas.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q24',
      displayOrder: 24,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T13',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante concluye:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“El antibiótico hizo que las bacterias sensibles desarrollaran, porque lo necesitaban, mutaciones específicas que las volvieron resistentes”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación de esta explicación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque los organismos producen siempre las mutaciones que necesitan.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta si la población aumenta de tamaño.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No puede evaluarse porque la resistencia bacteriana nunca es heredable.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No está justificada: la presencia previa de variantes resistentes es compatible con que el antibiótico favorezca diferencialmente su supervivencia y reproducción.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La selección natural no requiere que el ambiente produzca de manera dirigida la mutación necesaria. Si algunas variantes resistentes ya existen, el antibiótico puede favorecerlas al reducir la supervivencia de las sensibles.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q25',
      displayOrder: 25,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T14',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de los gametos corresponde al espermatozoide?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Y, porque presenta flagelo y capacidad de desplazamiento.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'X, porque posee mayor tamaño y abundante citoplasma.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ambos, porque los dos poseen exactamente la misma estructura.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ninguno, porque los gametos humanos no participan en la fecundación.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El espermatozoide posee una estructura especializada para el desplazamiento, incluyendo un flagelo. Las características del gameto Y son consistentes con esta función.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q26',
      displayOrder: 26,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T14',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué relación entre estructura y función está mejor respaldada por la comparación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El abundante citoplasma del gameto X permite que este se desplace mediante un flagelo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ambos gametos cumplen exactamente la misma función durante la fecundación.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La presencia de un flagelo en el gameto Y es consistente con su capacidad de desplazamiento hacia el gameto femenino.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La ausencia de flagelo en X demuestra que este no contiene información genética.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos permiten relacionar directamente la presencia del flagelo con una mayor capacidad de movimiento del gameto Y.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q27',
      displayOrder: 27,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T15',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Como la velocidad aumenta en cada segundo, la fuerza neta sobre el carro también debe estar aumentando en cada segundo”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación de su afirmación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque todo aumento de velocidad requiere una fuerza cada vez mayor.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque la masa del carro disminuye mientras se mueve.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No puede evaluarse porque la aceleración nunca puede obtenerse a partir de velocidad y tiempo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No está justificada: los datos muestran una aceleración constante y, si la masa permanece constante, son compatibles con una fuerza neta constante.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La velocidad aumenta 2 m/s cada segundo, por lo que la aceleración es constante. De acuerdo con F=ma, una masa constante con aceleración constante es compatible con una fuerza neta constante.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q28',
      displayOrder: 28,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T15',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál es el diseño más apropiado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar simultáneamente la masa del carro, la fuerza aplicada y la superficie.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar el mismo carro y la misma fuerza aplicada sobre superficies con diferentes características de roce, medir la aceleración y realizar varias réplicas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar una superficie diferente en cada prueba y aplicar una fuerza desconocida.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Mantener siempre la misma superficie y no medir la aceleración.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Para estudiar el efecto del roce se debe modificar principalmente la superficie mientras se mantienen controladas la masa y la fuerza aplicada.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q29',
      displayOrder: 29,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T16',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué pregunta puede investigarse directamente mediante esta experiencia?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál es la composición química de todas las lentes?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo funcionan todos los instrumentos ópticos existentes?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo cambia simultáneamente la imagen cuando se modifican lente, objeto y medio de propagación?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo se relaciona la distancia del objeto a una lente convergente con la posición de la imagen real formada?',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El experimento modifica la distancia objeto-lente y mide la distancia a la que se forma la imagen, por lo que permite estudiar directamente esa relación.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q30',
      displayOrder: 30,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T16',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué patrón muestran los datos dentro del intervalo estudiado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Al acercar el objeto a la lente, la imagen real también se acerca siempre a la lente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La posición de la imagen permanece constante.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Al disminuir la distancia del objeto desde 40 cm hasta 20 cm, aumenta la distancia a la que se forma la imagen real.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La lente deja de formar cualquier imagen cuando el objeto se encuentra a 20 cm.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Al disminuir la distancia objeto-lente de 40 cm a 20 cm, la distancia lente-imagen aumenta de 13,3 cm a 20,0 cm.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q31',
      displayOrder: 31,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T17',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante sostiene:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Estos datos demuestran que la placa continental está descendiendo debajo de la placa oceánica”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La conclusión es correcta porque los sismos siempre ocurren únicamente en placas continentales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La conclusión es correcta porque la profundidad de los sismos no se relaciona con la tectónica.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La interpretación no es consistente con el modelo de subducción descrito: el aumento de profundidad de los sismos hacia el continente es compatible con una placa oceánica que desciende bajo la continental.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los datos demuestran que ambas placas permanecen inmóviles.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una zona de subducción de este tipo, la placa oceánica se introduce bajo la continental. La distribución progresivamente más profunda de los sismos es consistente con la geometría de la placa que desciende.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q32',
      displayOrder: 32,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T17',
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
            text: 'Los sismos se hacen menos profundos al avanzar hacia el continente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todos los sismos ocurren exactamente a 75 km de profundidad.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La distancia a la fosa no presenta ninguna relación con la profundidad registrada.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La profundidad media de los sismos aumenta al aumentar la distancia desde la fosa hacia el continente.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La profundidad media aumenta desde 18 km hasta 155 km a medida que los registros se ubican más lejos de la fosa y hacia el continente.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q33',
      displayOrder: 33,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T18',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué aspecto debería mantenerse constante para comparar adecuadamente una conexión en serie con una en paralelo?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El voltaje de la fuente y las características de los resistores utilizados.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La corriente, obligándola a tener el mismo valor en ambos circuitos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La resistencia equivalente, aunque cambie el número de resistores.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La forma de conexión, modificando únicamente el voltaje.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Para atribuir las diferencias observadas a la configuración del circuito deben mantenerse constantes la fuente y los resistores utilizados.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q34',
      displayOrder: 34,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T19',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué pregunta puede responderse directamente utilizando estos datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo difieren las temperaturas de fusión y ebullición entre las tres sustancias estudiadas?',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál de las sustancias fue descubierta primero históricamente?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué estructura atómica poseen todas las sustancias conocidas?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo varían simultáneamente estas propiedades cuando también se modifica la presión?',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla entrega directamente las temperaturas de fusión y ebullición de cada sustancia bajo una misma condición de presión.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q35',
      displayOrder: 35,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'COMUNICAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T19',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un equipo debe presentar estos resultados con el objetivo de que el público pueda comparar simultáneamente las temperaturas de fusión y ebullición de X, Y y Z.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '¿Qué recurso sería más apropiado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico circular que muestre únicamente cuántas sustancias fueron estudiadas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una fotografía de los tres recipientes sin valores de temperatura.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico que muestre solamente la temperatura de ebullición de la sustancia Z.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico de barras agrupadas que presente, para cada sustancia, una barra de temperatura de fusión y otra de temperatura de ebullición sobre una misma escala.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El gráfico propuesto permite comparar las dos propiedades para las tres sustancias usando una escala común y responde directamente al objetivo de comunicación.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q36',
      displayOrder: 36,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T20',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál es el procedimiento más adecuado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Medir únicamente la masa de una muestra y no determinar su volumen.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Medir masa y volumen de varias muestras del mismo material, calcular m/V para cada una utilizando el mismo procedimiento y comparar los resultados.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar materiales diferentes para cada medición sin identificarlos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar el material, la balanza y el método para determinar el volumen en cada ensayo.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La densidad corresponde a la relación entre masa y volumen. Utilizar varias muestras y un procedimiento común permite evaluar si esa propiedad se mantiene aproximadamente constante para el material.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q37',
      displayOrder: 37,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T21',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si la reacción ocurre completamente según el modelo, ¿cuántas moléculas de H₂O pueden formarse?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '2',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '3',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '4',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '6',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La proporción es 2 moléculas de H₂ por cada 1 de O₂ para formar 2 de H₂O. Con 4 H₂ y 2 O₂ pueden formarse 4 moléculas de agua.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q38',
      displayOrder: 38,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T21',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Durante la reacción desaparecen los átomos de hidrógeno y oxígeno originales y aparecen átomos completamente nuevos dentro del agua”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque toda reacción transforma átomos en otros elementos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque los productos no contienen los mismos átomos que los reactantes.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque las moléculas no pueden modificarse durante una reacción.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: en una reacción química los átomos se reorganizan formando nuevas sustancias, pero se conserva el número de átomos de cada elemento.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las reacciones químicas modifican la organización y los enlaces entre los átomos, no requieren crear o destruir átomos de los elementos involucrados.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q39',
      displayOrder: 39,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'COMUNICAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T22',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante quiere presentar de forma clara el procedimiento y el resultado del cálculo de la concentración molar de esta disolución.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '¿Qué recurso sería más apropiado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una tabla que muestre: cantidad de soluto = 0,25 mol; volumen = 0,500 L; relación C=n/V; concentración obtenida = 0,50 mol/L.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una fotografía del recipiente sin indicar cantidad de soluto ni volumen.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una lista de unidades químicas sin relacionarlas con los datos del problema.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un dibujo del laboratorio que no incluya valores ni procedimiento de cálculo.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla organiza los datos relevantes, muestra la relación utilizada y presenta el resultado con sus unidades, facilitando la comprensión del procedimiento para el objetivo establecido.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q40',
      displayOrder: 40,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T22',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una segunda disolución del mismo soluto tiene una concentración de 1,0 mol/L y un volumen de 200 mL.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '¿Cuántos moles de soluto contiene esta segunda disolución?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '5,0 mol',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '0,20 mol',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '1,20 mol',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '200 mol',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '200 mL = 0,200 L. n=C×V=(1,0 mol/L)(0,200 L)=0,20 mol.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q41',
      displayOrder: 41,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T23',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué conclusión está mejor respaldada por los datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las semillas hervidas presentan la mayor tasa respiratoria.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las semillas en germinación consumen más oxígeno que las otras condiciones estudiadas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las semillas no germinadas producen más oxígeno que las germinadas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todas las condiciones presentan la misma actividad respiratoria.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La mayor disminución del volumen gaseoso ocurre con las semillas germinando. Como el dióxido de carbono es absorbido, esa disminución funciona como indicador del oxígeno consumido.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q42',
      displayOrder: 42,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T23',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“La disminución del volumen gaseoso demuestra directamente cuánto dióxido de carbono produjeron las semillas”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la principal debilidad de esta interpretación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las semillas nunca producen dióxido de carbono.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La respiración celular ocurre solamente en presencia de luz.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El experimento no permite detectar ningún intercambio gaseoso.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Como el dióxido de carbono producido es absorbido, el cambio medido se utiliza principalmente para inferir consumo de oxígeno, no para cuantificar directamente el CO₂ liberado.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La sustancia absorbente retira el dióxido de carbono del gas del recipiente. Por eso, el cambio de volumen observado refleja principalmente el oxígeno consumido.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q43',
      displayOrder: 43,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T23',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si se quisiera estudiar específicamente el efecto de la temperatura sobre la respiración de semillas germinando, ¿qué diseño sería más adecuado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar cantidades equivalentes de semillas germinando a diferentes temperaturas, manteniendo constantes las demás condiciones y comparando su consumo de oxígeno.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar simultáneamente temperatura, número de semillas y tiempo de medición.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar semillas de especies diferentes a una temperatura desconocida.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Medir una sola muestra a una única temperatura.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Para estudiar el efecto de la temperatura debe modificarse esta variable mientras se controlan las demás condiciones relevantes.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q44',
      displayOrder: 44,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T24',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes preguntas puede investigarse directamente mediante este diseño?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuántos tipos de neuronas existen en todos los animales?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo se relaciona la intensidad del estímulo aplicado con el tiempo de respuesta motora en este modelo?',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál fue el origen evolutivo del sistema nervioso?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué genes participan en el desarrollo de todo el sistema nervioso?',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El experimento modifica la intensidad del estímulo y mide el tiempo de respuesta, por lo que permite estudiar directamente la relación entre esas dos variables.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q45',
      displayOrder: 45,
      discipline: 'BIOLOGIA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T24',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué patrón describen mejor los resultados?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El tiempo de respuesta aumenta continuamente a medida que aumenta la intensidad del estímulo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El tiempo de respuesta disminuye marcadamente entre el estímulo bajo y el medio, y luego cambia poco entre el medio y el alto.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La intensidad del estímulo no presenta ninguna relación con el tiempo registrado.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El estímulo de intensidad alta genera una respuesta más lenta que el de intensidad baja.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El tiempo disminuye de 120 ms a 95 ms al pasar de intensidad baja a media, pero solo disminuye otros 3 ms al pasar de media a alta.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q46',
      displayOrder: 46,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T25',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué patrón muestran directamente los datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Al aumentar el ángulo de incidencia, también aumenta el ángulo de refracción dentro del rango medido.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El ángulo de refracción permanece siempre en 13°.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El ángulo de refracción disminuye cuando aumenta el de incidencia.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ambos ángulos son idénticos en todas las mediciones.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los valores aumentan conjuntamente: al pasar el ángulo de incidencia de 20° a 60°, el de refracción aumenta de 13° a 35°.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q47',
      displayOrder: 47,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T25',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Para comparar la refracción producida por dos materiales transparentes diferentes, ¿qué procedimiento sería más adecuado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Usar simultáneamente diferentes colores de luz y ángulos de incidencia en cada material.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Medir únicamente uno de los materiales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar el mismo medio inicial, el mismo tipo de luz y los mismos ángulos de incidencia para ambos materiales, comparando los ángulos de refracción.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar el material y también la dirección del haz de forma no controlada.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Para atribuir posibles diferencias al material, las demás condiciones relevantes deben mantenerse constantes.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q48',
      displayOrder: 48,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T26',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una persona afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Como el aparato X tiene el doble de potencia, necesariamente consume más energía que Y”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque la energía consumida depende únicamente de la potencia.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque el tiempo de funcionamiento no influye.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta, porque la energía depende tanto de la potencia como del tiempo de funcionamiento.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque un aparato de menor potencia siempre consume más energía.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La energía eléctrica consumida depende del producto entre potencia y tiempo. X funciona a mayor potencia, pero durante un tiempo considerablemente menor.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q49',
      displayOrder: 49,
      discipline: 'FISICA',
      module: 'COMUN',
      skill: 'COMUNICAR',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T26',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un grupo quiere comunicar a otros estudiantes cuánta energía consume cada aparato durante los tiempos de uso indicados y facilitar una comparación visual entre ambos.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '¿Qué recurso sería más apropiado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico de barras con los aparatos X e Y y consumos de 0,5 kWh y 1,0 kWh, respectivamente.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una fotografía de los dos aparatos sin información sobre potencia, tiempo ni consumo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una tabla que muestre únicamente la potencia de X y omita completamente el aparato Y.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un esquema de un circuito eléctrico que no incluya los datos de consumo calculados.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un gráfico de barras con el consumo de ambos aparatos permite comparar directamente la cantidad de energía utilizada durante los tiempos especificados.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q50',
      displayOrder: 50,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T27',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué pregunta puede estudiarse directamente usando estos datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál de estos compuestos fue descubierto primero?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo varía la temperatura de ebullición entre estos alcoholes a medida que aumenta el número de átomos de carbono?',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué temperatura de ebullición poseen todos los compuestos orgánicos?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo cambia la ebullición al modificar simultáneamente presión, estructura y composición?',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos comparan sustancias de una misma familia con diferente número de carbonos y sus respectivas temperaturas de ebullición.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q51',
      displayOrder: 51,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T27',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué tendencia se observa dentro de las tres sustancias estudiadas?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El aumento del número de carbonos se asocia con una disminución de la temperatura de ebullición.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los tres compuestos poseen la misma temperatura de ebullición.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Dentro de esta serie, la temperatura de ebullición aumenta al aumentar el número de carbonos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La temperatura no presenta ningún cambio entre metanol y propanol.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las temperaturas registradas aumentan de 65 °C a 78 °C y luego a 97 °C a medida que aumenta el tamaño de la cadena.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q52',
      displayOrder: 52,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T28',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué procedimiento es el más apropiado para comprobar experimentalmente que la destilación permite separar agua de esta disolución?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar un montaje de destilación que permita vaporizar el componente más volátil y condensar el vapor en otro recipiente, analizando posteriormente el líquido recuperado.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Filtrar la mezcla y asumir que toda la sal atravesará el filtro mientras el agua quedará retenida.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Tamizar la disolución utilizando mallas de distinto tamaño.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Dejar la disolución sin realizar ningún procedimiento de separación.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La destilación separa componentes aprovechando diferencias de volatilidad. El vapor del componente más volátil puede condensarse y recuperarse separadamente.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q53',
      displayOrder: 53,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T29',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál es la fórmula empírica del compuesto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'C₂H',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'CH₂',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'CH₄',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'C₂H₄',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Carbono: 24/12 = 2 mol. Hidrógeno: 4/1 = 4 mol. La relación más simple es 2:4 = 1:2. Por lo tanto, la fórmula empírica es CH₂.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q54',
      displayOrder: 54,
      discipline: 'QUIMICA',
      module: 'COMUN',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T30',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál es la mejor evaluación de esa conclusión?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No está respaldada por los datos tal como fue formulada, porque los ensayos utilizan cantidades diferentes de agua y el valor de 60 g corresponde a 200 g de agua, no a 100 g.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es válida porque para comparar solubilidades no es necesario considerar la cantidad de solvente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es válida porque cualquier aumento de temperatura duplica necesariamente la solubilidad.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'No puede estudiarse experimentalmente la relación entre temperatura y solubilidad.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos deben expresarse respecto de una misma cantidad de solvente antes de compararlos directamente. En el Ensayo II se disuelven 60 g en 200 g de agua, equivalente a 30 g por 100 g de agua, no a 60 g por 100 g.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q55',
      displayOrder: 55,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T31',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué resultado está directamente respaldado por la comparación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ambos cultivos producen exactamente la misma cantidad de proteína.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El cultivo control produce más proteína que el modificado.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La modificación elimina completamente el crecimiento bacteriano.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En las condiciones estudiadas, la proteína de interés se detecta en el cultivo modificado y no en el control.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla registra 85 unidades en el cultivo M y 0 en el control. Esa es la diferencia directamente demostrada por los datos.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q56',
      displayOrder: 56,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T31',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué diseño permitiría estudiar con mayor rigor si la modificación genética es responsable de la producción de la proteína?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar una especie bacteriana diferente para cada medición y cambiar además el medio de cultivo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Estudiar solamente el cultivo modificado y no utilizar ninguna referencia.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Modificar simultáneamente la información genética, temperatura, nutrientes y duración del cultivo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar cultivos equivalentes que difieran principalmente en la presencia o ausencia de la modificación genética, manteniendo constantes las demás condiciones relevantes y realizando réplicas.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un control comparable permite aislar la modificación genética como variable de interés. Las réplicas además permiten estimar la variabilidad de los resultados.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q57',
      displayOrder: 57,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T32',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante sostiene:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Como las extremidades cumplen funciones diferentes, no pueden considerarse estructuras homólogas ni aportar evidencia sobre relaciones evolutivas”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es incorrecta: estructuras con un patrón anatómico básico semejante pueden ser homólogas aunque actualmente desempeñen funciones diferentes.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es correcta porque las estructuras homólogas deben cumplir exactamente la misma función.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es correcta porque únicamente los fósiles pueden aportar evidencia de evolución.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es incorrecta porque estructuras homólogas nunca presentan modificaciones entre especies.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La homología se relaciona con semejanzas estructurales asociadas a un origen evolutivo común; las funciones pueden divergir entre linajes.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q58',
      displayOrder: 58,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T32',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué inferencia es más consistente con la información presentada?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las tres extremidades son idénticas en estructura y función.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La conservación de un patrón óseo básico junto con modificaciones funcionales distintas es consistente con evidencia anatómica de ascendencia común.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El murciélago y la ballena necesariamente poseen el mismo modo de desplazamiento.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las diferencias de función impiden realizar cualquier comparación evolutiva.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La existencia de una organización estructural semejante modificada para distintas funciones constituye un ejemplo de evidencia aportada por estructuras homólogas.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q59',
      displayOrder: 59,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'COMUNICAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T33',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un equipo quiere mostrar visualmente la diferencia en el porcentaje de células que continúa hacia fase S en las dos poblaciones.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '¿Qué recurso sería más apropiado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una fotografía de una única célula sin identificar su población.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una lista de las fases del ciclo celular sin incluir los resultados experimentales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico de barras que compare 12 % para X y 68 % para Y utilizando la misma escala.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un esquema de una célula que no incluya porcentajes ni información sobre el punto de control.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un gráfico de barras permite comparar directamente los porcentajes de ambas poblaciones y responde al objetivo específico de comunicación.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q60',
      displayOrder: 60,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T33',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué hipótesis comprobable es más coherente con la observación presentada?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todas las células con ADN dañado dejan obligatoriamente de dividirse, independientemente de sus puntos de control.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El punto de control G1–S no participa en la regulación del ciclo celular.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El daño en el ADN aumenta siempre y por sí solo la velocidad de división de cualquier célula.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una disminución en la función del punto de control G1–S permite que una mayor proporción de células con ADN dañado continúe hacia la fase S.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La población con el punto de control alterado presenta una proporción mucho mayor de células que entra en fase S después del daño. La alternativa D formula una hipótesis específica y comprobable compatible con esa observación.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q61',
      displayOrder: 61,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T34',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué proceso explica principalmente el aumento de la cantidad de ADN entre G1 y G2?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La replicación del ADN durante la fase S.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La separación de cromosomas durante la mitosis.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La síntesis de proteínas en el citoplasma.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La división del citoplasma en dos células hijas.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante la fase S se replica el ADN, por lo que la cantidad de material genético por célula aumenta desde el valor de G1 hasta alcanzar aproximadamente el doble en G2.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q62',
      displayOrder: 62,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T34',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se quiere determinar si una sustancia experimental inhibe la replicación del ADN. ¿Qué diseño permitiría estudiar mejor ese efecto?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Analizar únicamente células después de la división y no utilizar un grupo control.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar simultáneamente la sustancia, temperatura, nutrientes y tipo celular.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar células tratadas y controles equivalentes durante la fase S, midiendo bajo las mismas condiciones la incorporación de nucleótidos o el cambio en la cantidad de ADN.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Medir exclusivamente la cantidad de proteínas producidas después de la mitosis.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El diseño compara directamente una condición tratada con un control y mide una variable asociada a la replicación del ADN, manteniendo controlados otros factores.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q63',
      displayOrder: 63,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T34',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante observa que una célula posee 4 unidades relativas de ADN en G2 y afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Como tiene el doble de ADN que en G1, necesariamente tiene el doble de cromosomas”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque cada molécula nueva de ADN corresponde siempre a un cromosoma adicional.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: después de la replicación cada cromosoma está constituido por cromátidas hermanas, por lo que aumenta la cantidad de ADN sin duplicarse todavía el número de cromosomas de la célula.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque la mitosis ya terminó durante G2.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque durante la fase S disminuye la cantidad de ADN.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La replicación duplica el ADN de cada cromosoma. Antes de la separación de las cromátidas hermanas, esto no implica que la célula posea el doble de cromosomas.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q64',
      displayOrder: 64,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T35',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Cuál de las siguientes preguntas puede investigarse directamente mediante este diseño?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuántos tipos celulares existen en todos los organismos multicelulares?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué genes controlan cada proceso de división celular?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál fue el origen evolutivo de la mitosis?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo se relaciona el tratamiento X con la distribución de células entre las distintas etapas de la mitosis?',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El experimento compara células control y tratadas y determina en qué etapas mitóticas se encuentran, por lo que permite estudiar directamente esa relación.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q65',
      displayOrder: 65,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T35',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué interpretación está mejor respaldada por los resultados?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El tratamiento X elimina completamente la mitosis.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las células tratadas completan la mitosis más rápidamente porque aumenta la proporción en metafase.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El tratamiento X se asocia con una mayor proporción de células detenidas o acumuladas en metafase.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El tratamiento X provoca que la mayoría de las células permanezca en telofase.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En el control, 25 % de las células mitóticas está en metafase, mientras que bajo el tratamiento la proporción alcanza 65 %. Esto es consistente con una acumulación de células en esa etapa, aunque por sí solo no establece el mecanismo molecular responsable.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q66',
      displayOrder: 66,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T36',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué acontecimiento corresponde a la separación característica de la anafase I?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'I',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'III',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'II',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'IV',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante la anafase I se separan los cromosomas homólogos. Las cromátidas hermanas permanecen unidas hasta la meiosis II.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q67',
      displayOrder: 67,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T36',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“La meiosis I y la meiosis II son equivalentes porque en ambas se separan cromátidas hermanas”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque ambas divisiones separan exactamente las mismas estructuras.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque los cromosomas homólogos permanecen siempre unidos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque durante ninguna división meiótica se separa material cromosómico.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: en meiosis I se separan principalmente cromosomas homólogos, mientras que en meiosis II se separan cromátidas hermanas.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La primera y la segunda división meiótica no son equivalentes en este aspecto. La meiosis I separa homólogos y la meiosis II separa cromátidas hermanas.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q68',
      displayOrder: 68,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T37',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué aspecto del diseño permite evaluar específicamente el efecto del insecticida sobre la frecuencia de individuos resistentes?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Mantener una población comparable sin insecticida como referencia y controlar las demás condiciones relevantes.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar únicamente la población expuesta.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar simultáneamente insecticida, alimento y temperatura entre generaciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Medir solamente la generación final.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La población no expuesta funciona como referencia para comparar la evolución de la frecuencia de resistencia cuando el insecticida está presente.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q69',
      displayOrder: 69,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T37',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué patrón muestran los resultados?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La frecuencia de individuos resistentes aumenta mucho más en la población sometida al insecticida.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La resistencia desaparece completamente en ambas poblaciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La población no expuesta alcanza una frecuencia de resistencia superior a la expuesta.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ambas poblaciones presentan exactamente la misma evolución.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La frecuencia de resistencia pasa de 8 % a 71 % bajo exposición, mientras que en el grupo sin insecticida aumenta solo hasta 12 %.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q70',
      displayOrder: 70,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'COMUNICAR',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T37',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un equipo quiere mostrar a otro curso cómo cambió la frecuencia de individuos resistentes a lo largo de las generaciones en las poblaciones con y sin insecticida.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '¿Qué recurso sería más adecuado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una fotografía de un insecto resistente sin información sobre generaciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico de líneas con la generación en el eje horizontal y el porcentaje de resistentes en el vertical, utilizando una serie para cada condición experimental.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un dibujo del recipiente utilizado en el experimento sin incluir los resultados.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una tabla que muestre únicamente el valor de 71 % de la generación final.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un gráfico de líneas con ambas series permite visualizar y comparar cómo cambia la frecuencia de resistencia a través del tiempo en las dos condiciones.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q71',
      displayOrder: 71,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T38',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué pregunta puede estudiarse directamente mediante esta evidencia?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál fue el primer organismo vivo que existió en la Tierra?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo varía la característica locomotora observada entre fósiles presentes en estratos de distinta antigüedad de esta región?',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Qué cambios evolutivos ocurrieron en todas las especies que han existido?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál era la secuencia completa de ADN de los organismos fosilizados?',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La evidencia permite comparar una característica anatómica de fósiles encontrados en estratos ordenados temporalmente.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q72',
      displayOrder: 72,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T38',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué patrón muestran los datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los fósiles más antiguos y recientes no presentan ninguna característica comparable.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los tres estratos poseen exactamente la misma antigüedad.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La estructura locomotora disminuye continuamente de longitud desde los estratos antiguos hacia los recientes.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En la secuencia estudiada se observa un cambio de la característica locomotora entre los estratos más antiguos y los más recientes, manteniéndose otras semejanzas anatómicas.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los fósiles comparten una organización anatómica general, pero la característica descrita cambia siguiendo el orden temporal de los estratos.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q73',
      displayOrder: 73,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T38',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante concluye:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“Estos tres fósiles demuestran por sí solos y de manera definitiva que el organismo del estrato I fue el antepasado directo del organismo del estrato III”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la principal limitación de esa conclusión?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los fósiles no pueden utilizarse como evidencia evolutiva.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los estratos más profundos son siempre más recientes.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las semejanzas anatómicas impiden establecer cualquier relación evolutiva.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La secuencia es evidencia compatible con cambio evolutivo, pero por sí sola no demuestra una relación directa de ancestro y descendiente entre esos individuos; debe integrarse con más evidencia.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El registro fósil constituye evidencia de evolución, pero una serie limitada de fósiles no basta para demostrar que un espécimen concreto sea antepasado directo de otro. Se requiere integrar información estratigráfica y otras líneas de evidencia.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q74',
      displayOrder: 74,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T39',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué conclusión es más consistente con los resultados?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La liberación de O₂ ocurre únicamente en el estroma y no depende de la luz.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los azúcares se producen directamente en los tilacoides iluminados del experimento.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los resultados son consistentes con que procesos dependientes de la luz ocurran asociados a los tilacoides y que la síntesis de azúcares utilice procesos localizados en el estroma.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La fotosíntesis completa ocurre exclusivamente en oscuridad.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fracción de tilacoides libera oxígeno cuando está iluminada, mientras que la fracción de estroma puede generar azúcares cuando dispone de CO₂ y de los productos energéticos necesarios.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q75',
      displayOrder: 75,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T39',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si se quisiera estudiar específicamente si la liberación de O₂ de la fracción T depende de la luz, ¿qué diseño sería el más adecuado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar fracciones diferentes sometidas además a distintas temperaturas y concentraciones de CO₂.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Analizar únicamente una preparación iluminada.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambiar simultáneamente intensidad luminosa, tipo de fracción y composición química del medio.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar preparaciones equivalentes de la fracción T, mantener constantes las demás condiciones y comparar la liberación de O₂ con luz y en oscuridad, realizando réplicas.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La comparación debe aislar la presencia de luz como variable independiente, usando preparaciones equivalentes y controlando las demás condiciones.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q76',
      displayOrder: 76,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PROCESAR_Y_ANALIZAR_LA_EVIDENCIA',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T40',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué interpretación es más consistente con los datos?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La energía disponible aumenta hacia los consumidores de niveles superiores.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todos los niveles contienen exactamente la misma cantidad de energía.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los consumidores terciarios poseen más energía disponible que los productores.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad de energía disponible disminuye considerablemente a medida que se avanza hacia niveles tróficos superiores.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La energía disminuye de 50.000 kJ en productores a 90 kJ en consumidores terciarios.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q77',
      displayOrder: 77,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'EVALUAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T40',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un estudiante afirma:',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '“La energía que llega a los consumidores terciarios vuelve posteriormente a los productores, por lo que la misma energía circula indefinidamente por la cadena”.',
        },
        {
          type: 'paragraph',
          order: 2,
          text: '¿Cuál es la mejor evaluación?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: la energía fluye a través de los niveles tróficos y parte se disipa en los procesos biológicos, por lo que no se recicla de la misma manera que la materia.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque materia y energía se comportan exactamente de la misma manera en los ecosistemas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque los productores recuperan toda la energía utilizada por los consumidores.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque los productores no incorporan ninguna forma de energía al ecosistema.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La energía ingresa al ecosistema y se transfiere entre niveles, pero una parte se disipa en cada transferencia. Por ello el flujo de energía no constituye un ciclo cerrado.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q78',
      displayOrder: 78,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'OBSERVAR_Y_PLANTEAR_PREGUNTAS',
      difficulty: 'FACIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T41',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué pregunta puede investigarse directamente con este diseño?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo se relacionan la intensidad luminosa y la concentración de CO₂ con la tasa fotosintética bajo las condiciones estudiadas?',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuál será la tasa fotosintética de todas las especies vegetales existentes?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cuántos genes controlan toda la fotosíntesis?',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: '¿Cómo era la fotosíntesis de las primeras plantas terrestres?',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El diseño manipula luz y concentración de CO₂ y mide la tasa fotosintética, permitiendo estudiar cómo se relacionan estas variables.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q79',
      displayOrder: 79,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION',
      difficulty: 'MEDIA',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T41',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '¿Qué modificación aumentaría principalmente la confiabilidad del estudio sin cambiar la pregunta investigada?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utilizar una especie diferente para cada combinación de luz y CO₂.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Realizar varias réplicas independientes de cada combinación, manteniendo constantes temperatura, especie y demás condiciones, y comparar los resultados obtenidos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Modificar también la temperatura de manera diferente en cada grupo.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Eliminar una de las cuatro combinaciones experimentales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las réplicas permiten estimar la variabilidad experimental y aumentar la confianza en el patrón observado sin introducir nuevas variables independientes.',
        },
      ],
    },
    {
      questionKey: 'ENSAYO.CIENCIAS.BIOLOGIA.Q80',
      displayOrder: 80,
      discipline: 'BIOLOGIA',
      module: 'ELECTIVO_BIOLOGIA',
      skill: 'COMUNICAR',
      difficulty: 'DIFICIL',
      passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T41',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un equipo quiere presentar los resultados con el objetivo de que el público pueda comparar simultáneamente el efecto de la intensidad luminosa y de la concentración de CO₂ sobre la tasa fotosintética.',
        },
        {
          type: 'paragraph',
          order: 1,
          text: '¿Qué recurso sería más adecuado?',
        },
      ],
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una fotografía de una planta iluminada sin identificar las condiciones experimentales.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico que muestre únicamente el valor 34 y omita las demás combinaciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un gráfico de barras agrupadas que presente las tasas fotosintéticas para las cuatro combinaciones de luz baja/alta y CO₂ bajo/alto, manteniendo una escala común.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una lista que señale que existen luz y CO₂, pero no incluya los valores de tasa fotosintética.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El gráfico propuesto permite comparar las cuatro condiciones y observar simultáneamente cómo cambia la tasa en función de los dos factores estudiados.',
        },
      ],
    },
  ],
};

export default module_;
