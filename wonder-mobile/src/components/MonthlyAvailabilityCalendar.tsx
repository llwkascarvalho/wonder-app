import { Pressable, StyleSheet, Text, View } from 'react-native';

import { customerTheme } from '../styles/customerTheme';
import { theme } from '../styles/theme';

type MonthlyAvailabilityCalendarProps = {
  mes: string;
  diasDisponiveis: string[];
  dataSelecionada: string | null;
  allowUnavailableSelection?: boolean;
  variant?: 'default' | 'customer';
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
  variant = 'default',
  onChangeMes,
  onSelectDate,
}: MonthlyAvailabilityCalendarProps) {
  const customer = variant === 'customer';
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
    <View style={[styles.container, customer && styles.customerContainer]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeMes(shiftMonth(mes, -1))}
          style={[styles.monthButton, customer && styles.customerMonthButton]}
        >
          <Text style={[styles.monthButtonText, customer && styles.customerMonthButtonText]}>{'‹'}</Text>
        </Pressable>

        <Text style={[styles.monthTitle, customer && styles.customerMonthTitle]}>{monthLabel(mes)}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeMes(shiftMonth(mes, 1))}
          style={[styles.monthButton, customer && styles.customerMonthButton]}
        >
          <Text style={[styles.monthButtonText, customer && styles.customerMonthButtonText]}>{'›'}</Text>
        </Pressable>
      </View>

      <View style={styles.weekGrid}>
        {WEEK_DAYS.map((day) => (
          <Text key={day} style={[styles.weekDay, customer && styles.customerWeekDay]}>
            {customer ? day.slice(0, 1) : day}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={[styles.dayCell, customer && styles.customerDayCell]} />;
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
                customer && styles.customerDayCell,
                styles.dayButton,
                customer && styles.customerDayButton,
                isAvailable && styles.dayAvailable,
                customer && isAvailable && styles.customerDayAvailable,
                disabled && styles.dayDisabled,
                customer && disabled && styles.customerDayDisabled,
                isSelected && styles.daySelected,
                customer && isSelected && styles.customerDaySelected,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  customer && styles.customerDayText,
                  isAvailable && styles.dayAvailableText,
                  customer && isAvailable && styles.customerDayAvailableText,
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
  customerContainer: {
    alignSelf: 'center',
    backgroundColor: customerTheme.v4.surface,
    borderRadius: 24,
    gap: 14,
    maxWidth: 560,
    padding: 16,
    width: '100%',
    ...customerTheme.shadow,
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
  customerMonthButton: {
    backgroundColor: customerTheme.v4.lilac,
    height: 40,
    width: 40,
  },
  customerMonthButtonText: {
    color: customerTheme.v4.primary,
    fontSize: 24,
  },
  monthTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  customerMonthTitle: {
    color: customerTheme.v4.text,
    fontFamily: customerTheme.v4.fontDisplay, fontSize: 20,
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
  customerWeekDay: {
    color: customerTheme.v4.textMuted,
    fontFamily: customerTheme.v4.fontBodySemi, fontSize: 14,
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
  customerDayCell: {
    aspectRatio: undefined,
    height: 44,
  },
  dayButton: {
    borderRadius: theme.borderRadius.pill,
  },
  customerDayButton: {
    borderRadius: customerTheme.radius.pill,
  },
  dayAvailable: {
    backgroundColor: '#F3E8FF',
  },
  customerDayAvailable: {
    backgroundColor: 'transparent',
  },
  dayDisabled: {
    backgroundColor: theme.colors.surfaceMuted,
    opacity: 0.58,
  },
  customerDayDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.3,
  },
  daySelected: {
    backgroundColor: theme.colors.primary,
  },
  customerDaySelected: {
    backgroundColor: customerTheme.v4.primary,
  },
  dayText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },
  customerDayText: {
    color: customerTheme.v4.text,
    fontFamily: customerTheme.v4.fontBodySemi, fontSize: 16,
  },
  dayAvailableText: {
    color: theme.colors.primary,
  },
  customerDayAvailableText: {
    color: customerTheme.colors.text,
  },
  dayDisabledText: {
    color: theme.colors.textMuted,
  },
  daySelectedText: {
    color: theme.colors.white,
  },
});
