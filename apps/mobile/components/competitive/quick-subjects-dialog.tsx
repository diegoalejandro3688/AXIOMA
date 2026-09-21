import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { QuickQuestionSubjectKey } from '@axioma/contracts';
import { Dialog, Text, Icon } from '../ui';
import { QUICK_QUESTION_SUBJECT_OPTIONS, QUICK_QUESTION_SUBJECT_MIN_SELECTED } from '../../lib/quick-question/subjects';
import { useTheme, spacing, radii } from '../../theme';

export interface QuickSubjectsDialogProps {
  visible: boolean;
  /** Selección ACTUAL persistida -- baseline al abrir el editor. */
  selectedKeys: readonly QuickQuestionSubjectKey[];
  onRequestClose: () => void;
  /** Sólo se invoca con una selección YA válida (>= 2 materias). */
  onSave: (keys: QuickQuestionSubjectKey[]) => void;
}

/**
 * vc3 (F03, Quick Subject Selector) -- editor compacto de materias de
 * Pregunta Rápida. Reutiliza el `Dialog` compartido (mismo shell que
 * Ajustes/Liga -- PROFILE-5B) con `children`, sin crear un primitivo de
 * modal nuevo ni una pantalla completa. Mínimo obligatorio de 2 materias:
 * un intento de bajar de 2 se bloquea in-place, con el mismo copy
 * aprobado ("Selecciona al menos 2 materias"), sin cerrar el diálogo.
 */
export function QuickSubjectsDialog({ visible, selectedKeys, onRequestClose, onSave }: QuickSubjectsDialogProps) {
  const tokens = useTheme();
  const [draft, setDraft] = useState<QuickQuestionSubjectKey[]>([...selectedKeys]);
  const [showMinWarning, setShowMinWarning] = useState(false);

  // Re-sincroniza el borrador con la selección persistida cada vez que se
  // ABRE el editor -- un cierre sin guardar (o guardar) no debe arrastrar
  // un borrador estancado a la próxima apertura.
  useEffect(() => {
    if (visible) {
      setDraft([...selectedKeys]);
      setShowMinWarning(false);
    }
  }, [visible, selectedKeys]);

  function toggle(key: QuickQuestionSubjectKey) {
    setDraft((prev) => {
      const isSelected = prev.includes(key);
      if (isSelected) {
        if (prev.length <= QUICK_QUESTION_SUBJECT_MIN_SELECTED) {
          setShowMinWarning(true);
          return prev;
        }
        setShowMinWarning(false);
        return prev.filter((k) => k !== key);
      }
      setShowMinWarning(false);
      return [...prev, key];
    });
  }

  function handleSave() {
    if (draft.length < QUICK_QUESTION_SUBJECT_MIN_SELECTED) {
      setShowMinWarning(true);
      return;
    }
    onSave(draft);
  }

  return (
    <Dialog
      visible={visible}
      title="Materias de Pregunta rápida"
      onRequestClose={onRequestClose}
      primaryAction={{ label: 'Guardar', onPress: handleSave }}
      secondaryAction={{ label: 'Cancelar', onPress: onRequestClose, variant: 'tertiary' }}
    >
      <View style={{ gap: spacing.space2 }}>
        {QUICK_QUESTION_SUBJECT_OPTIONS.map((option) => {
          const isSelected = draft.includes(option.key);
          return (
            <Pressable
              key={option.key}
              onPress={() => toggle(option.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing.space3,
                paddingHorizontal: spacing.space3,
                borderRadius: radii.medium,
                borderWidth: 1,
                borderColor: isSelected ? tokens.color.accent.default : tokens.color.border.default,
                backgroundColor: isSelected ? tokens.color.accent.subtleBg : tokens.color.background.default,
              }}
            >
              <Text variant="body" weight={isSelected ? 'semibold' : 'regular'}>
                {option.label}
              </Text>
              {isSelected ? <Icon name="check" size={18} color={tokens.color.accent.strong} /> : null}
            </Pressable>
          );
        })}
      </View>
      {showMinWarning ? (
        <Text variant="bodySmall" color="error" style={{ marginTop: spacing.space2 }}>
          Selecciona al menos 2 materias
        </Text>
      ) : null}
    </Dialog>
  );
}
