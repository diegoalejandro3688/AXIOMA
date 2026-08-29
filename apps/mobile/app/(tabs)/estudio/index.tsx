import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';
import type { SubjectResponse } from '@axioma/contracts';
import type { IconName } from '../../../theme';
import { listSubjects } from '../../../lib/api/education';
import { subjectIcon, subjectToneColor, subjectToneBackground } from '../../../lib/academic/subject-icon';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { Text, Card, Icon } from '../../../components/ui';
import { useTheme, useThemedStyles, spacing, radii } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; subjects: SubjectResponse[] };

/**
 * Grilla de materias -- ver aprobación de alcance de Bloque IV. Renderiza
 * únicamente lo que devuelve `GET /education/subjects`: si solo existe
 * Matemática, se muestra solo Matemática; nunca se hardcodea una materia
 * inexistente. Recorrido: materia -> `estudio/[subjectId]` (detalle) ->
 * `estudio/[subjectId]/unidades` -> `estudio/topic/[topicId]/...`.
 */
export default function EstudioIndexScreen() {
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listSubjects();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    // Diagnóstico de desarrollo -- ver UI-3 Implementation Report ("Materia
    // no mapeada"): nunca decide un color/icono nuevo por su cuenta, solo
    // reporta qué materias cayeron en el fallback neutro.
    const known = new Set(['Matemática', 'Matemática M1', 'Matemática M2', 'Ciencias', 'Historia', 'Lenguaje']);
    const unmapped = Array.from(new Set(result.data.filter((s) => !known.has(s.name)).map((s) => s.name)));
    if (unmapped.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('[UI-3] Materias no mapeadas a las 4 familias académicas (icono/color neutro aplicado):', unmapped);
    }
    setState({ status: 'ready', subjects: result.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando materias…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.subjects.length === 0) return <EmptyState message="Todavía no hay materias disponibles." />;

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text variant="heading1" accessibilityRole="header">
          Estudiar
        </Text>
        <Text variant="body" color="secondary">
          Elige una materia para empezar a estudiar
        </Text>
      </View>
      <FlatList
        data={state.subjects}
        keyExtractor={(subject) => subject.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const { icon, tone } = subjectIcon(item.name);
          const toneBackground = subjectToneBackground(tokens, tone);
          const toneColor = subjectToneColor(tokens, tone);
          return (
            <Card
              variant="outlined"
              accessibilityLabel={`Abrir materia ${item.name}`}
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/(tabs)/estudio/[subjectId]', params: { subjectId: item.id, name: item.name } })
              }
            >
              {/*
                STUDY-1C -- misma veladura de STUDY-1B, pero MÁS diluida
                (0.45 -> 0.2) sobre `variant="outlined"` en vez de
                `"interactive"`: sin elevación/sombra, con el borde fino de
                `border.default` que ya usan las cards editoriales de Perfil
                (p. ej. `CosmeticSlotCard`) -- esto, junto al radio reducido
                (`radii.medium` en vez de `radii.large`), es lo que quita la
                sensación de "botón grande" sin tocar ningún token nuevo.
              */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: toneBackground, opacity: 0.2 }]} pointerEvents="none" />
              {/*
                STUDY-1C -- misma decoración conceptual de STUDY-1B
                (geometría/molécula/páginas/columnas), pero tratada como
                marca de agua técnica: trazo más fino (3 -> 1.5), opacidad
                menor (0.12 -> 0.07), composición más grande y desplazada
                para sangrar fuera del borde -- se lee como "blueprint" de
                fondo, no como un dibujo infantil en una esquina.
              */}
              <View
                style={styles.decoration}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <SubjectDecoration icon={icon} color={toneColor} />
              </View>
              {/*
                STUDY-1C -- el badge deja de ser un cuadrado relleno de
                color (la pieza que más contribuía a "cuadrado pastel
                dentro de card pastel"). Pasa a ser un anillo delgado
                (`borderWidth`, sin relleno) del tono real de la materia --
                el ícono sigue siendo el ancla visual, pero integrado como
                una marca editorial, no como un botón dentro del botón.
              */}
              <View style={[styles.badge, { borderColor: toneColor }]}>
                <Icon name={icon} size={18} color={toneColor} />
              </View>
              <Text variant="titleMedium" style={styles.subjectName}>
                {item.name}
              </Text>
              <Icon name="chevron-right" size={16} color="muted" />
            </Card>
          );
        }}
      />
    </View>
  );
}

/**
 * STUDY-1B -- decoración académica abstracta por materia, presentación
 * pura: recibe el `icon`/`color` YA resueltos por `subjectIcon()`/
 * `subjectToneColor()` (nunca reinterpreta el nombre de la materia, no es
 * lógica de dominio nueva). Cada composición evoca el "universo" de la
 * materia con 2-3 formas mínimas (círculos/líneas), sin dibujar el ícono
 * principal de nuevo: geometría para Matemática, molécula para Ciencias,
 * páginas de libro para Lenguaje, columnas clásicas para Historia. Local a
 * esta pantalla -- sin consumidores fuera de aquí todavía, no se extrae a
 * `theme/icons/` (esa carpeta es para íconos funcionales de 24x24
 * registrados en `Icon`, no para ilustraciones decorativas).
 */
function SubjectDecoration({ icon, color }: { icon: IconName; color: string }) {
  switch (icon) {
    case 'subject-math':
      return (
        <Svg width={132} height={132} viewBox="0 0 132 132" fill="none">
          <Circle cx="48" cy="66" r="40" stroke={color} strokeWidth={1.5} />
          <Circle cx="94" cy="42" r="21" stroke={color} strokeWidth={1.5} />
          <Line x1="24" y1="108" x2="114" y2="18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    case 'subject-science':
      return (
        <Svg width={132} height={132} viewBox="0 0 132 132" fill="none">
          <Line x1="36" y1="96" x2="90" y2="36" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="36" y1="96" x2="102" y2="90" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Circle cx="36" cy="96" r="6" fill={color} />
          <Circle cx="90" cy="36" r="5" fill={color} />
          <Circle cx="102" cy="90" r="5" fill={color} />
        </Svg>
      );
    case 'subject-language':
      return (
        <Svg width={132} height={132} viewBox="0 0 132 132" fill="none">
          <Line x1="24" y1="36" x2="108" y2="36" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="24" y1="62" x2="96" y2="62" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="24" y1="88" x2="102" y2="88" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="24" y1="114" x2="78" y2="114" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    case 'subject-history':
      return (
        <Svg width={132} height={132} viewBox="0 0 132 132" fill="none">
          <Line x1="18" y1="30" x2="114" y2="30" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="34" y1="30" x2="34" y2="114" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="66" y1="30" x2="66" y2="114" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="98" y1="30" x2="98" y2="114" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    headerBlock: { gap: spacing.space1, marginBottom: spacing.space2 },
    // STUDY-1C -- `space2` (antes `space3`) entre cards: lista más densa y
    // "editorial", menos "botones apilados". El target táctil de CADA card
    // no cambia (sigue midiendo lo mismo verticalmente); solo se acerca su
    // separación.
    list: { gap: spacing.space2 },
    card: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space3,
      paddingVertical: spacing.space3,
      // STUDY-1C -- `radii.medium` (12) en vez del `radii.large` (16) que
      // traía `variant="interactive"` -- mismo radio que usan las cards
      // editoriales de Perfil (outlined), menos "burbuja".
      borderRadius: radii.medium,
      overflow: 'hidden' as const,
    },
    decoration: {
      position: 'absolute' as const,
      right: -30,
      bottom: -34,
      opacity: 0.07,
    },
    // STUDY-1C -- anillo delgado (sin relleno) en vez del cuadrado pastel
    // de STUDY-1B; `radii.full` para que se lea como una marca, no como un
    // segundo botón.
    badge: {
      width: 38,
      height: 38,
      borderRadius: radii.full,
      borderWidth: 1.5,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    subjectName: { flex: 1 },
  };
}
