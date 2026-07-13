import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { ProviderScheduleModal } from '../ProviderScheduleModal';
import { theme } from '../../styles/theme';
import { ProviderOnboardingSchedule } from '../../types/providerOnboarding';

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

type ProviderSchedulesStepProps = {
  schedules: ProviderOnboardingSchedule[];
  modalVisible: boolean;
  saving: boolean;
  disabled: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onCreateSchedule: (payload: { dia_semana: number; hora_inicio: string; hora_fim: string }) => Promise<void>;
  onRemoveSchedule: (horarioId: number) => Promise<void>;
};

export function ProviderSchedulesStep({
  schedules,
  modalVisible,
  saving,
  disabled,
  onOpenModal,
  onCloseModal,
  onCreateSchedule,
  onRemoveSchedule,
}: ProviderSchedulesStepProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Horarios de funcionamento</Text>
          <Text style={styles.text}>Informe pelo menos um horario de atendimento.</Text>
        </View>
        <Button title="Adicionar" size="sm" disabled={disabled} onPress={onOpenModal} />
      </View>

      {schedules.length ? (
        <View style={styles.list}>
          {schedules.map((schedule) => (
            <View key={schedule.id} style={styles.item}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{dayLabels[schedule.dia_semana] || 'Dia'}</Text>
                <Text style={styles.text}>
                  {schedule.hora_inicio} - {schedule.hora_fim}
                </Text>
              </View>
              <Button
                title="Remover"
                size="sm"
                variant="outline"
                disabled={disabled || saving}
                onPress={() => onRemoveSchedule(schedule.id)}
              />
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.text}>Nenhum horario cadastrado.</Text>
      )}

      <ProviderScheduleModal
        visible={modalVisible}
        loading={saving}
        onClose={onCloseModal}
        onSave={onCreateSchedule}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  text: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  list: {
    gap: theme.spacing.sm,
  },
  item: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
