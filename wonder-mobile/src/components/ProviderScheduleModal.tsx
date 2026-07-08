import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../styles/theme';
import { Button } from './Button';
import { Input } from './Input';

const weekDays = [
  { label: 'D', value: 0 },
  { label: 'S', value: 1 },
  { label: 'T', value: 2 },
  { label: 'Q', value: 3 },
  { label: 'Q', value: 4 },
  { label: 'S', value: 5 },
  { label: 'S', value: 6 },
];

type ProviderScheduleModalProps = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSave: (payload: { dia_semana: number; hora_inicio: string; hora_fim: string }) => Promise<void>;
};

export function ProviderScheduleModal({
  visible,
  loading = false,
  onClose,
  onSave,
}: ProviderScheduleModalProps) {
  const [diaSemana, setDiaSemana] = useState(1);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('18:00');
  const [error, setError] = useState('');

  async function handleSave() {
    if (!/^\d{2}:\d{2}$/.test(horaInicio) || !/^\d{2}:\d{2}$/.test(horaFim)) {
      setError('Use horarios no formato HH:MM.');
      return;
    }

    await onSave({
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
    });
    setError('');
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Selecionar dias e horarios</Text>

          <View style={styles.days}>
            {weekDays.map((day, index) => {
              const selected = diaSemana === day.value;
              return (
                <Pressable
                  key={`${day.label}-${index}`}
                  accessibilityRole="button"
                  onPress={() => setDiaSemana(day.value)}
                  style={[styles.dayButton, selected && styles.dayButtonSelected]}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.row}>
            <Input label="Horario de inicio" value={horaInicio} onChangeText={setHoraInicio} />
            <Input label="Horario final" value={horaFim} onChangeText={setHoraFim} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={loading} />
            <Button title="Salvar" onPress={handleSave} loading={loading} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
    maxWidth: 420,
    padding: theme.spacing.lg,
    width: '100%',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    alignItems: 'center',
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  dayButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  dayTextSelected: {
    color: theme.colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
});
