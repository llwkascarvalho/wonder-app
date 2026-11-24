import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { theme } from '../styles/theme';
import { customerTheme } from '../styles/customerTheme';
import { Button } from './Button';
import { Input } from './Input';
import type { Horario } from '../types/provider';
import { ProviderIcon } from './provider/ProviderIcon';

const weekDays = [
  { label: 'D', value: 7 },
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
  existingHorarios?: Horario[];
  onClose: () => void;
  onSave: (payload: { dia_semana: number; hora_inicio: string; hora_fim: string }[]) => Promise<void>;
};

type Intervalo = { inicio: string; fim: string };
const EMPTY_HORARIOS: Horario[] = [];

function horaCurta(value: string) {
  return value.slice(0, 5);
}

function minutos(value: string) {
  const [horas, minutosHora] = value.split(':').map(Number);
  return horas * 60 + minutosHora;
}

function formatarMinutos(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function sugerirIntervalo(ocupados: Intervalo[]): Intervalo | null {
  const faixas = ocupados.map((item) => ({ inicio: minutos(item.inicio), fim: minutos(item.fim) }));
  for (const inicio of [...Array(30)].map((_, index) => 8 * 60 + index * 30)
    .concat([...Array(16)].map((_, index) => index * 30))) {
    const fim = inicio + 60;
    if (fim > 24 * 60) continue;
    if (faixas.every((faixa) => fim <= faixa.inicio || inicio >= faixa.fim)) {
      return { inicio: formatarMinutos(inicio), fim: formatarMinutos(fim) };
    }
  }
  return null;
}

export function ProviderScheduleModal({
  visible,
  loading = false,
  appearance = 'default',
  existingHorarios = EMPTY_HORARIOS,
  onClose,
  onSave,
}: ProviderScheduleModalProps) {
  const customer = appearance === 'customer';
  const { width } = useWindowDimensions();
  const [diaSemana, setDiaSemana] = useState(1);
  const [intervalos, setIntervalos] = useState<Intervalo[]>([{ inicio: '08:00', fim: '17:00' }]);
  const [error, setError] = useState('');
  const cadastrados = existingHorarios
    .filter((horario) => horario.dia_semana === diaSemana)
    .map((horario) => ({ inicio: horaCurta(horario.hora_inicio), fim: horaCurta(horario.hora_fim) }));

  useEffect(() => {
    if (visible) {
      setDiaSemana(1);
      setIntervalos([sugerirIntervalo(existingHorarios.filter((horario) => horario.dia_semana === 1)
        .map((horario) => ({ inicio: horaCurta(horario.hora_inicio), fim: horaCurta(horario.hora_fim) })))
        || { inicio: '08:00', fim: '09:00' }]);
      setError('');
    }
  }, [visible, existingHorarios]);

  function close() {
    setError('');
    onClose();
  }

  function selectDay(day: number) {
    const horariosDia = existingHorarios.filter((horario) => horario.dia_semana === day)
      .map((horario) => ({ inicio: horaCurta(horario.hora_inicio), fim: horaCurta(horario.hora_fim) }));
    setDiaSemana(day);
    setIntervalos([sugerirIntervalo(horariosDia) || { inicio: '08:00', fim: '09:00' }]);
    setError('');
  }

  function addIntervalo() {
    const suggestion = sugerirIntervalo([...cadastrados, ...intervalos]);
    if (!suggestion) {
      setError('Não há outro intervalo livre de uma hora neste dia. Escolha outro dia ou ajuste os horários.');
      return;
    }
    setIntervalos((current) => [...current, suggestion]);
    setError('');
  }

  function updateIntervalo(index: number, field: keyof Intervalo, value: string) {
    setIntervalos((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item));
    setError('');
  }

  async function handleSave() {
    const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (intervalos.some((item) => !validTime(item.inicio) || !validTime(item.fim))) {
      setError('Use horários válidos no formato HH:MM.');
      return;
    }
    if (intervalos.some((item) => item.inicio >= item.fim)) {
      setError('O horário de início deve ser anterior ao horário final.');
      return;
    }
    const ordenados = [...intervalos].sort((left, right) => left.inicio.localeCompare(right.inicio));
    if (ordenados.some((item, index) => index > 0 && item.inicio < ordenados[index - 1].fim)) {
      setError('Os horários do mesmo dia não podem se sobrepor.');
      return;
    }
    if (intervalos.some((item) => cadastrados.some((existente) =>
      item.inicio < existente.fim && item.fim > existente.inicio))) {
      setError('Este intervalo se sobrepõe a um horário já cadastrado.');
      return;
    }
    try {
      await onSave(intervalos.map((item) => ({
        dia_semana: diaSemana,
        hora_inicio: item.inicio,
        hora_fim: item.fim,
      })));
      close();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível cadastrar o horário.');
    }
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <View style={[styles.overlay, width >= 640 && styles.overlayWide]}>
        <ScrollView style={[styles.content, customer && styles.customerContent, width < 640 && styles.sheetMobile]}
          contentContainerStyle={styles.contentInner} keyboardShouldPersistTaps="handled">
          {customer ? <View style={styles.handle} /> : null}
          <View style={styles.titleRow}>
            <Text style={[styles.title, customer && styles.customerTitle]}>Selecionar dia e horário</Text>
            {customer ? <Pressable accessibilityRole="button" accessibilityLabel="Fechar horários"
              style={styles.closeButton} onPress={close} disabled={loading}>
              <ProviderIcon name="close" color={customerTheme.v4.text} size={22} />
            </Pressable> : null}
          </View>
          <Text style={styles.customerSubtitle}>Dia da semana *</Text>

          <View style={styles.days}>
            {weekDays.map((day, index) => {
              const selected = diaSemana === day.value;
              return (
                <Pressable
                  key={`${day.label}-${index}`}
                  accessibilityRole="button"
                  onPress={() => selectDay(day.value)}
                  style={[styles.dayButton, customer && styles.customerDayButton, selected && styles.dayButtonSelected]}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day.label}</Text>
                  {existingHorarios.some((horario) => horario.dia_semana === day.value) ? <View style={styles.dayMark} /> : null}
                </Pressable>
              );
            })}
          </View>

          {cadastrados.length ? (
            <View style={styles.registeredBox}>
              <Text style={styles.registeredTitle}>Já cadastrado neste dia</Text>
              <Text style={styles.registeredText}>{cadastrados.map((item) => `${item.inicio}–${item.fim}`).join('  ·  ')}</Text>
            </View>
          ) : null}

          {intervalos.map((item, index) => (
            <View key={index} style={styles.intervalRow}>
              <View style={styles.timeField}>
                <Input appearance={appearance} label="Horário de início *" value={item.inicio}
                  style={customer && styles.customerTimeInput}
                  onChangeText={(value) => updateIntervalo(index, 'inicio', value)} />
              </View>
              <View style={styles.timeField}>
                <Input appearance={appearance} label="Horário de término *" value={item.fim}
                  style={customer && styles.customerTimeInput}
                  onChangeText={(value) => updateIntervalo(index, 'fim', value)} />
              </View>
              {intervalos.length > 1 ? <Pressable accessibilityRole="button"
                accessibilityLabel={`Remover horário ${index + 1}`} style={styles.removeButton}
                onPress={() => setIntervalos((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                <Text style={styles.removeText}>×</Text>
              </Pressable> : null}
            </View>
          ))}
          {intervalos.length < 8 ? <Pressable accessibilityRole="button" style={styles.addButton}
            onPress={addIntervalo}>
            <Text style={styles.addText}>＋  Adicionar novo horário</Text>
          </Pressable> : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button appearance={appearance} title="Cancelar" variant="secondary" onPress={close} disabled={loading} style={styles.actionButton} />
            <Button appearance={appearance} title="Salvar" onPress={handleSave} loading={loading} style={styles.actionButton} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayWide: {
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    maxHeight: '85%',
    maxWidth: 480,
    width: '100%',
  },
  contentInner: { gap: 16, padding: 20, paddingBottom: 28 },
  sheetMobile: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  customerContent: {
    backgroundColor: customerTheme.v4.surface,
    borderRadius: 28,
    ...customerTheme.shadow,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: customerTheme.v4.border,
    borderRadius: 3,
    height: 5,
    width: 44,
  },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: customerTheme.v4.field, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  customerTitle: {
    color: customerTheme.v4.text,
    flexShrink: 1,
    fontFamily: customerTheme.v4.fontDisplay,
    fontSize: 24,
    textAlign: 'left',
  },
  customerSubtitle: {
    color: customerTheme.v4.text,
    fontFamily: customerTheme.v4.fontBodySemi,
    fontSize: 15,
    lineHeight: 21,
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
  dayMark: {
    backgroundColor: customerTheme.v4.violet,
    borderRadius: 3,
    height: 5,
    position: 'absolute',
    right: 1,
    top: 1,
    width: 5,
  },
  customerDayButton: {
    backgroundColor: customerTheme.v4.field,
    borderColor: customerTheme.v4.field,
    height: 40,
    width: 40,
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
  registeredBox: {
    backgroundColor: customerTheme.v4.lilac,
    borderRadius: 16,
    gap: 4,
    padding: 12,
  },
  registeredTitle: { color: customerTheme.v4.primaryDeep, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 14 },
  registeredText: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBody, fontSize: 15 },
  intervalRow: {
    alignItems: 'flex-end',
    backgroundColor: customerTheme.v4.field,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    width: '100%',
  },
  customerTimeInput: { backgroundColor: customerTheme.v4.surface, minHeight: 52 },
  timeField: {
    flex: 1,
    minWidth: 0,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#FDE3E5',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 40,
  },
  removeText: { color: customerTheme.v4.danger, fontSize: 24 },
  addButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  addText: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 15 },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
  },
  actionButton: { flex: 1 },
});
