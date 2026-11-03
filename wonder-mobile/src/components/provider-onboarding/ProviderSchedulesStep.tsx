import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { ProviderScheduleModal } from '../ProviderScheduleModal';
import { theme } from '../../styles/theme';
import { ProviderOnboardingSchedule } from '../../types/providerOnboarding';

const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type Props = {
  schedules: ProviderOnboardingSchedule[];
  saving: boolean;
  disabled: boolean;
  onCreate: (payload: { dia_semana: number; hora_inicio: string; hora_fim: string }) => Promise<void>;
  onRemove: (scheduleId: number) => Promise<void>;
};

export function ProviderSchedulesStep({ schedules, saving, disabled, onCreate, onRemove }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Horários de atendimento *</Text>
          <Text style={styles.text}>Cadastre ao menos um intervalo de atendimento.</Text>
        </View>
        <Button title="Adicionar" size="sm" disabled={disabled} onPress={() => setModalVisible(true)} />
      </View>
      {schedules.length ? schedules.map((schedule) => (
        <View key={schedule.id} style={styles.item}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{dayLabels[schedule.dia_semana] || 'Dia'}</Text>
            <Text style={styles.text}>{schedule.hora_inicio} - {schedule.hora_fim}</Text>
          </View>
          <Button title="Remover" size="sm" variant="outline" disabled={disabled} onPress={() => onRemove(schedule.id)} />
        </View>
      )) : <Text style={styles.warning}>Nenhum horário cadastrado.</Text>}
      <ProviderScheduleModal visible={modalVisible} loading={saving} onClose={() => setModalVisible(false)}
        onSave={async (payload) => { await onCreate(payload); setModalVisible(false); }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  headerText: { flex: 1, gap: theme.spacing.xs },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold },
  text: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, lineHeight: 20 },
  warning: { color: theme.colors.warning, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold },
  item: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.borderRadius.sm, flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.sm },
  itemInfo: { flex: 1 },
  itemTitle: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
});
