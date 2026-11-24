import { createElement, Fragment, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AdminDashboardAgendamentos } from '../../types/admin';
import { A } from './AdminV4';

type Day = AdminDashboardAgendamentos['dias'][number];
type Point = { x: number; y: number };

const WIDTH = 600;
const HEIGHT = 230;
const LEFT = 42;
const RIGHT = 10;
const TOP = 16;
const BOTTOM = 28;
const BASELINE = HEIGHT - BOTTOM;
const PLOT_HEIGHT = BASELINE - TOP;
const TIP_WIDTH = 154;

function smoothPath(points: Point[]) {
  if (!points.length) return '';
  let path = `M${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[index - 1] || points[index];
    const start = points[index];
    const end = points[index + 1];
    const after = points[index + 2] || end;
    path += ` C${start.x + (end.x - before.x) / 6},${start.y + (end.y - before.y) / 6}` +
      ` ${end.x - (after.x - start.x) / 6},${end.y - (after.y - start.y) / 6} ${end.x},${end.y}`;
  }
  return path;
}

function sampledCurve(points: Point[]): Point[] {
  if (points.length < 2) return points;
  const sampled = [points[0]];
  const value = (a: number, b: number, c: number, d: number, t: number) =>
    .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[index - 1] || points[index];
    const start = points[index];
    const end = points[index + 1];
    const after = points[index + 2] || end;
    for (let step = 1; step <= 3; step += 1) {
      const t = step / 3;
      sampled.push({ x: start.x + (end.x - start.x) * t,
        y: Math.max(TOP, Math.min(BASELINE, value(before.y, start.y, end.y, after.y, t))) });
    }
  }
  return sampled;
}

export function AdminBookingsChart({ dias, selecionado, onSelect }: {
  dias: Day[]; selecionado: string | null; onSelect: (data: string) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const nativeWidth = measuredWidth || Math.max(260, screenWidth - 72);
  const factor = nativeWidth / WIDTH;
  const plotWidth = Platform.OS === 'web' ? (measuredWidth || Math.max(200, screenWidth - 72)) : WIDTH;
  const highest = Math.max(0, ...dias.map(day => day.total_agendamentos));
  const max = Math.max(5, Math.ceil(highest / 5) * 5);
  const labelStep = Math.max(1, Math.ceil(dias.length / 6));
  const points = useMemo(() => dias.map((day, index) => ({
    x: LEFT + (dias.length <= 1 ? 0 : index * (plotWidth - LEFT - RIGHT) / (dias.length - 1)),
    y: BASELINE - day.total_agendamentos / max * PLOT_HEIGHT,
  })), [dias, max, plotWidth]);
  const path = useMemo(() => smoothPath(points), [points]);
  const sampled = useMemo(() => sampledCurve(points), [points]);
  const selectedIndex = dias.findIndex(day => day.data === selecionado);
  const selected = selectedIndex >= 0 ? points[selectedIndex] : null;

  if (!dias.length) return <Text style={styles.empty}>Nenhum agendamento neste período.</Text>;

  if (Platform.OS === 'web') {
    const h = createElement;
    const ticks = [0, 1, 2, 3, 4].map(index => Math.round(max / 4 * index));
    const tipX = selected ? Math.max(4, Math.min(plotWidth - TIP_WIDTH - 4, selected.x - TIP_WIDTH / 2)) : 0;
    const tipY = selected ? Math.max(3, selected.y - 65) : 0;
    return <View style={styles.webChart} onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)}>
      {h('svg', { viewBox: `0 0 ${plotWidth} ${HEIGHT}`, role: 'img', 'aria-label': 'Gráfico de agendamentos por dia',
        style: { display: 'block', width: '100%', height: HEIGHT, cursor: 'crosshair' } },
      h('defs', null, h('linearGradient', { id: 'admin-bookings-fill', x1: '0', y1: '0', x2: '0', y2: '1' },
        h('stop', { offset: '0', stopColor: A.violet, stopOpacity: .28 }),
        h('stop', { offset: '1', stopColor: A.violet, stopOpacity: 0 }))),
      ...ticks.flatMap(tick => {
        const y = BASELINE - tick / max * PLOT_HEIGHT;
        return [h('line', { key: `grid-${tick}`, x1: LEFT, y1: y, x2: plotWidth - RIGHT, y2: y, stroke: A.border }),
          h('text', { key: `tick-${tick}`, x: LEFT - 8, y: y + 5, textAnchor: 'end', fontSize: 14,
            fill: A.textMuted, fontFamily: A.fontBody }, String(tick))];
      }),
      points.length > 1 ? h('path', { d: `${path} L${points[points.length - 1].x},${BASELINE} L${points[0].x},${BASELINE} Z`,
        fill: 'url(#admin-bookings-fill)' }) : null,
      h('path', { d: path, fill: 'none', stroke: A.primary, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      ...dias.flatMap((day, index) => index % labelStep === 0 ? [h('text', { key: `day-${day.data}`, x: points[index].x,
        y: HEIGHT - 6, textAnchor: 'middle', fontSize: 13, fill: A.textMuted, fontFamily: A.fontBody }, day.data.slice(-2))] : []),
      selected ? h('line', { x1: selected.x, y1: selected.y, x2: selected.x, y2: BASELINE,
        stroke: A.primary, strokeWidth: 1.5, strokeDasharray: '4 4' }) : null,
      selected ? h('circle', { cx: selected.x, cy: selected.y, r: 6, fill: '#fff', stroke: A.primary, strokeWidth: 3 }) : null,
      selected ? h('g', { transform: `translate(${tipX} ${tipY})`, pointerEvents: 'none' },
        h('rect', { width: TIP_WIDTH, height: 52, rx: 12, fill: A.primary }),
        h('text', { x: TIP_WIDTH / 2, y: 20, textAnchor: 'middle', fill: '#FFFFFFD9', fontSize: 13,
          fontFamily: A.fontBody }, new Date(`${dias[selectedIndex].data}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })),
        h('text', { x: TIP_WIDTH / 2, y: 40, textAnchor: 'middle', fill: '#fff', fontSize: 15,
          fontFamily: A.fontBodyBold }, `${dias[selectedIndex].total_agendamentos} agendamentos`)) : null,
      ...dias.map((day, index) => h('rect', { key: `hit-${day.data}`,
        x: points[index].x - (plotWidth - LEFT - RIGHT) / Math.max(1, dias.length - 1) / 2,
        y: TOP, width: (plotWidth - LEFT - RIGHT) / Math.max(1, dias.length - 1), height: BASELINE - TOP,
        fill: 'transparent', onClick: () => onSelect(day.data) })))}
    </View>;
  }

  return <View style={styles.nativeChart} onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)}>
    <View style={{ width: nativeWidth, height: HEIGHT * factor }}>
      {[0, 1, 2, 3, 4].map(index => {
        const tick = Math.round(max / 4 * index);
        const y = (BASELINE - tick / max * PLOT_HEIGHT) * factor;
        return <Fragment key={index}>
          <View style={[styles.gridLine, { left: LEFT * factor, right: RIGHT * factor, top: y }]} />
          <Text style={[styles.axisLabel, { top: y - 8, width: (LEFT - 4) * factor }]}>{tick}</Text>
        </Fragment>;
      })}
      {sampled.slice(1).map((point, index) => {
        const previous = sampled[index];
        const x = previous.x * factor;
        const y = point.y * factor;
        const areaHeight = Math.max(0, (BASELINE - point.y) * factor);
        const columnWidth = Math.max(2, (point.x - previous.x) * factor + 1);
        const length = Math.hypot(point.x - previous.x, point.y - previous.y) * factor;
        const angle = Math.atan2(point.y - previous.y, point.x - previous.x) * 180 / Math.PI;
        return <Fragment key={index}>
          <View style={[styles.area, { left: x, top: y, width: columnWidth, height: areaHeight / 3, backgroundColor: '#8100FF3D' }]} />
          <View style={[styles.area, { left: x, top: y + areaHeight / 3, width: columnWidth, height: areaHeight / 3, backgroundColor: '#8100FF20' }]} />
          <View style={[styles.area, { left: x, top: y + areaHeight * 2 / 3, width: columnWidth, height: areaHeight / 3, backgroundColor: '#8100FF0A' }]} />
          <View style={[styles.line, { left: (point.x + previous.x) * factor / 2 - length / 2,
            top: (point.y + previous.y) * factor / 2 - 1.5, width: length, transform: [{ rotate: `${angle}deg` }] }]} />
        </Fragment>;
      })}
      {dias.map((day, index) => index % labelStep === 0 ? <Text key={day.data} style={[styles.day,
        { left: points[index].x * factor - 17, top: (HEIGHT - 23) * factor }]}>{day.data.slice(-2)}</Text> : null)}
      {selected ? <Fragment>
        <View style={[styles.selectedLine, { left: selected.x * factor, top: selected.y * factor,
          height: (BASELINE - selected.y) * factor }]} />
        <View style={[styles.dot, { left: selected.x * factor - 6, top: selected.y * factor - 6 }]} />
        <View style={[styles.tip, { left: Math.max(0, Math.min(nativeWidth - TIP_WIDTH, selected.x * factor - TIP_WIDTH / 2)),
          top: Math.max(0, selected.y * factor - 65) }]}>
          <Text style={styles.tipDate}>{new Date(`${dias[selectedIndex].data}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</Text>
          <Text style={styles.tipValue}>{dias[selectedIndex].total_agendamentos} agendamentos</Text>
        </View>
      </Fragment> : null}
      {dias.map((day, index) => <Pressable key={day.data} accessibilityRole="button"
        accessibilityLabel={`${day.data}: ${day.total_agendamentos} agendamentos`}
        accessibilityState={{ selected: index === selectedIndex }} onPress={() => onSelect(day.data)}
        style={[styles.hitArea, { left: (points[index].x - (WIDTH - LEFT - RIGHT) / Math.max(1, dias.length - 1) / 2) * factor,
          top: TOP * factor, width: Math.max(12, (WIDTH - LEFT - RIGHT) / Math.max(1, dias.length - 1) * factor),
          height: (BASELINE - TOP) * factor }]} />)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  webChart: { width: '100%', minWidth: 0 },
  nativeChart: { width: '100%', minWidth: 0 },
  gridLine: { position: 'absolute', height: 1, backgroundColor: A.border },
  axisLabel: { position: 'absolute', textAlign: 'right', color: A.textMuted, fontFamily: A.fontBody, fontSize: 14 },
  area: { position: 'absolute' },
  line: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: A.primary },
  selectedLine: { position: 'absolute', borderLeftWidth: 1.5, borderLeftColor: A.primary, borderStyle: 'dashed' },
  dot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 3, borderColor: A.primary },
  day: { position: 'absolute', width: 34, textAlign: 'center', color: A.textMuted, fontFamily: A.fontBody, fontSize: 13 },
  hitArea: { position: 'absolute' },
  tip: { position: 'absolute', width: TIP_WIDTH, height: 52, borderRadius: 12, backgroundColor: A.primary,
    alignItems: 'center', justifyContent: 'center' },
  tipDate: { color: '#FFFFFFD9', fontFamily: A.fontBody, fontSize: 13 },
  tipValue: { color: '#fff', fontFamily: A.fontBodyBold, fontSize: 15 },
  empty: { color: A.textMuted, fontFamily: A.fontBody, fontSize: 15, paddingVertical: 32, textAlign: 'center' },
});
