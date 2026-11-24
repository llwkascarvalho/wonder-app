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
  onCreate: (payload: { dia_semana: number; hora_inicio: string; hora_fim: string }[]) => Promise<void>;
  onRemove: (scheduleId: number) => Promise<void>;
};

export function ProviderSchedulesStep({ schedules, saving, disabled, onCreate, onRemove }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headingGroup}>
          <View style={styles.iconBox}><MaterialIcons name="schedule" size={26} color={customerTheme.v4.primary} /></View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Horários de atendimento *</Text>
            <Text style={styles.text}>Cadastre ao menos um intervalo de atendimento.</Text>
          </View>
        </View>
        <Button appearance="customer" title="Adicionar" size="sm" disabled={disabled} onPress={() => setModalVisible(true)} />
      </View>
      {schedules.length ? schedules.map((schedule) => (
        <View key={schedule.id} style={styles.item}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{dayLabels[schedule.dia_semana] || 'Dia'}</Text>
            <Text style={styles.text}>{schedule.hora_inicio} - {schedule.hora_fim}</Text>
          </View>
          <Button appearance="customer" title="Remover" size="sm" variant="danger" disabled={disabled} onPress={() => onRemove(schedule.id)} />
        </View>
      )) : <Text style={styles.warning}>Nenhum horário cadastrado.</Text>}
      <ProviderScheduleModal visible={modalVisible} loading={saving} appearance="customer" onClose={() => setModalVisible(false)}
        onSave={async (payload) => { await onCreate(payload); setModalVisible(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: customerTheme.v4.surface, borderRadius: 24,
    gap: 18, padding: 20, ...customerTheme.shadow,
  },
  header: { alignItems: 'flex-start', gap: 12 },
  headingGroup: { alignItems: 'center', flexDirection: 'row', gap: 12, width: '100%' },
  headerText: { flex: 1, gap: 3 },
  iconBox: {
    alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 16,
    height: 48, justifyContent: 'center', width: 48,
  },
  title: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 20, lineHeight: 24 },
  text: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15, lineHeight: 21 },
  warning: { color: '#9A6700', fontFamily: customerTheme.v4.fontBodySemi, fontSize: 15 },
  item: { alignItems: 'center', backgroundColor: customerTheme.v4.bg, borderRadius: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14 },
  itemInfo: { flex: 1 },
  itemTitle: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 18 },
});
