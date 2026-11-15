import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { ProviderScheduleModal } from '../ProviderScheduleModal';
import { customerTheme } from '../../styles/customerTheme';
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
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headingGroup}>
          <View style={styles.iconBox}><MaterialIcons name="schedule" size={20} color={customerTheme.colors.brandDark} /></View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Horários de atendimento *</Text>
            <Text style={styles.text}>Cadastre ao menos um intervalo de atendimento.</Text>
          </View>
        </View>
        <Button title="Adicionar" size="sm" disabled={disabled} onPress={() => setModalVisible(true)} />
      </View>
      {schedules.length ? schedules.map((schedule) => (
        <View key={schedule.id} style={styles.item}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{dayLabels[schedule.dia_semana] || 'Dia'}</Text>
            <Text style={styles.text}>{schedule.hora_inicio} - {schedule.hora_fim}</Text>
          </View>
          <Button title="Remover" size="sm" variant="danger" disabled={disabled} onPress={() => onRemove(schedule.id)} />
        </View>
      )) : <Text style={styles.warning}>Nenhum horário cadastrado.</Text>}
      <ProviderScheduleModal visible={modalVisible} loading={saving} appearance="customer" onClose={() => setModalVisible(false)}
        onSave={async (payload) => { await onCreate(payload); setModalVisible(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card,
    gap: 14, padding: 18, ...customerTheme.shadow,
  },
  header: { alignItems: 'flex-start', gap: 12 },
  headingGroup: { alignItems: 'center', flexDirection: 'row', gap: 12, width: '100%' },
  headerText: { flex: 1, gap: 3 },
  iconBox: {
    alignItems: 'center', backgroundColor: '#EFE3FA', borderRadius: 14,
    height: 44, justifyContent: 'center', width: 44,
  },
  title: { color: customerTheme.colors.text, fontSize: 18, fontWeight: '800' },
  text: { color: customerTheme.colors.textSecondary, fontSize: 12, lineHeight: 17 },
  warning: { color: '#9A6700', fontSize: 12, fontWeight: '600' },
  item: { alignItems: 'center', backgroundColor: '#F4F1F8', borderRadius: 18, flexDirection: 'row', gap: 12, padding: 14 },
  itemInfo: { flex: 1 },
  itemTitle: { color: customerTheme.colors.text, fontSize: 14, fontWeight: '700' },
});
