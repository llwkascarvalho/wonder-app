import { Platform, StyleSheet, View } from 'react-native';
import { customerTheme } from '../../styles/customerTheme';

const C = customerTheme.v4;
export function HeroGlows({ desktop = false }: { desktop?: boolean }) {
  return <>
    <View pointerEvents="none" style={[styles.top, desktop && styles.topDesktop]} />
    <View pointerEvents="none" style={[styles.bottom, desktop && styles.bottomDesktop]} />
  </>;
}
const styles = StyleSheet.create({
  top: { position: 'absolute', width: 300, height: 300, borderRadius: 150, right: -110, top: -170, backgroundColor: C.violet, opacity: .55, ...(Platform.OS === 'web' ? { filter: 'blur(80px)' } as any : { shadowColor: C.violet, shadowOpacity: .55, shadowRadius: 80 }) },
  bottom: { position: 'absolute', width: 240, height: 240, borderRadius: 120, left: -100, bottom: -110, backgroundColor: C.primaryDeep, opacity: .9, ...(Platform.OS === 'web' ? { filter: 'blur(70px)' } as any : { shadowColor: C.primaryDeep, shadowOpacity: .9, shadowRadius: 70 }) },
  topDesktop: { width: 520, height: 520, borderRadius: 260, right: -120, top: -260 },
  bottomDesktop: { width: 380, height: 380, borderRadius: 190, left: -140, bottom: -200 },
});

