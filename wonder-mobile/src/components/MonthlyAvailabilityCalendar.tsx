import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../styles/theme';

type MonthlyAvailabilityCalendarProps = {
  mes: string;
  diasDisponiveis: string[];
  dataSelecionada: string | null;
  allowUnavailableSelection?: boolean;
  onChangeMes: (mes: string) => void;
  onSelectDate: (data: string) => void;
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function parseMonth(mes: string) {
  const [year, month] = mes.split('-').map(Number);
  return { year, month };
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function shiftMonth(mes: string, amount: number) {
  const { year, month } = parseMonth(mes);
  const next = new Date(year, month - 1 + amount, 1);
  return formatMonth(next.getFullYear(), next.getMonth() + 1);
}

function monthLabel(mes: string) {
  const { year, month } = parseMonth(mes);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  );
}

function todayKey() {
  const today = new Date();
  return formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

export function getCurrentMonthKey() {
  const today = new Date();
  return formatMonth(today.getFullYear(), today.getMonth() + 1);
}

export function MonthlyAvailabilityCalendar({
  mes,
  diasDisponiveis,
  dataSelecionada,
  allowUnavailableSelection = false,
  onChangeMes,
  onSelectDate,
}: MonthlyAvailabilityCalendarProps) {
  const { year, month } = parseMonth(mes);
  const availableSet = new Set(diasDisponiveis);
  const today = todayKey();
  const firstWeekDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeMes(shiftMonth(mes, -1))}
          style={styles.monthButton}
        >
          <Text style={styles.monthButtonText}>{'<'}</Text>
        </Pressable>

        <Text style={styles.monthTitle}>{monthLabel(mes)}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeMes(shiftMonth(mes, 1))}
          style={styles.monthButton}
        >
          <Text style={styles.monthButtonText}>{'>'}</Text>
        </Pressable>
      </View>

      <View style={styles.weekGrid}>
        {WEEK_DAYS.map((day) => (
          <Text key={day} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateKey = formatDate(year, month, day);
          const isPast = dateKey < today;
          const isAvailable = allowUnavailableSelection || (availableSet.has(dateKey) && !isPast);
          const isSelected = dataSelecionada === dateKey;
          const disabled = !allowUnavailableSelection && !isAvailable;

          return (
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              key={dateKey}
              onPress={() => onSelectDate(dateKey)}
              style={[
                styles.dayCell,
                styles.dayButton,
                isAvailable && styles.dayAvailable,
                disabled && styles.dayDisabled,
                isSelected && styles.daySelected,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  isAvailable && styles.dayAvailableText,
                  disabled && styles.dayDisabledText,
                  isSelected && styles.daySelectedText,
                ]}
              >
                {day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  monthButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  monthTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  weekGrid: {
    flexDirection: 'row',
  },
  weekDay: {
    color: theme.colors.textSecondary,
    flex: 1,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: theme.spacing.sm,
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  dayButton: {
    borderRadius: theme.borderRadius.pill,
  },
  dayAvailable: {
    backgroundColor: '#F3E8FF',
  },
  dayDisabled: {
    backgroundColor: theme.colors.surfaceMuted,
    opacity: 0.58,
  },
  daySelected: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },
  dayAvailableText: {
    color: theme.colors.primary,
  },
  dayDisabledText: {
    color: theme.colors.textMuted,
  },
  daySelectedText: {
    color: theme.colors.white,
  },
});
