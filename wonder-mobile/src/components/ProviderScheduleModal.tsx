import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../styles/theme';
import { customerTheme } from '../styles/customerTheme';
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
  appearance?: 'default' | 'customer';
  onClose: () => void;
  onSave: (payload: { dia_semana: number; hora_inicio: string; hora_fim: string }) => Promise<void>;
};

export function ProviderScheduleModal({
  visible,
  loading = false,
  appearance = 'default',
  onClose,
  onSave,
}: ProviderScheduleModalProps) {
  const customer = appearance === 'customer';
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
        <View style={[styles.content, customer && styles.customerContent]}>
          <Text style={[styles.title, customer && styles.customerTitle]}>Adicionar horário</Text>
          {customer ? <Text style={styles.customerSubtitle}>Escolha o dia e informe o intervalo em que você atende.</Text> : null}

          <View style={styles.days}>
            {weekDays.map((day, index) => {
              const selected = diaSemana === day.value;
              return (
                <Pressable
                  key={`${day.label}-${index}`}
                  accessibilityRole="button"
                  onPress={() => setDiaSemana(day.value)}
                  style={[styles.dayButton, customer && styles.customerDayButton, selected && styles.dayButtonSelected]}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={styles.timeField}>
              <Input appearance={appearance} label="Horário de início" value={horaInicio} onChangeText={setHoraInicio} />
            </View>
            <View style={styles.timeField}>
              <Input appearance={appearance} label="Horário final" value={horaFim} onChangeText={setHoraFim} />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button appearance={appearance} title="Cancelar" variant="secondary" onPress={onClose} disabled={loading} />
            <Button appearance={appearance} title="Salvar" onPress={handleSave} loading={loading} />
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
  customerContent: {
    backgroundColor: customerTheme.v4.surface,
    borderRadius: 28,
    ...customerTheme.shadow,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  customerTitle: {
    color: customerTheme.v4.text,
    fontFamily: customerTheme.v4.fontDisplay,
    fontSize: 24,
    textAlign: 'left',
  },
  customerSubtitle: {
    color: customerTheme.v4.textMuted,
    fontFamily: customerTheme.v4.fontBody,
    fontSize: 15,
    lineHeight: 21,
    marginTop: -8,
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
  customerDayButton: {
    backgroundColor: customerTheme.v4.surface,
    borderColor: customerTheme.v4.border,
    height: 36,
    width: 36,
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
    width: '100%',
  },
  timeField: {
    flex: 1,
    minWidth: 0,
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
