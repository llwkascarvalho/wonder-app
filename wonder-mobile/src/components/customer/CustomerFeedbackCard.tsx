import { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { customerTheme } from '../../styles/customerTheme';

type Props = {
  kind: 'success' | 'danger';
  title: string;
  description: string;
  children: ReactNode;
};

const C = customerTheme.v4;

export function CustomerFeedbackCard({ kind, title, description, children }: Props) {
  return <View accessibilityRole="alert" style={styles.card}>
    <View style={[styles.iconCircle, kind === 'danger' ? styles.dangerCircle : styles.successCircle]}>
      <Image source={kind === 'danger'
        ? require('../../assets/icons/modal-cancel-v4.png')
        : require('../../assets/icons/modal-success-v4.png')} style={styles.icon} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    <View style={styles.spacer} />
    {children}
  </View>;
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center', backgroundColor: C.surface, borderRadius: 28, gap: 12,
    maxWidth: 315, paddingBottom: 24, paddingHorizontal: 24, paddingTop: 28, width: '100%',
    elevation: 10, shadowColor: C.primaryDeep, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22, shadowRadius: 16,
  },
  iconCircle: { alignItems: 'center', borderRadius: 36, height: 72, justifyContent: 'center', width: 72 },
  successCircle: { backgroundColor: '#DDF5EA' },
  dangerCircle: { backgroundColor: '#FDE7EA' },
  icon: { height: 36, width: 36 },
  title: { color: C.text, fontFamily: C.fontDisplay, fontSize: 24, lineHeight: 28, textAlign: 'center' },
  description: { color: C.textMuted, fontFamily: C.fontBody, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  spacer: { height: 6 },
});
