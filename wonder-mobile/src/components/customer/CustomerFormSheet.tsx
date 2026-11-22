import { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { customerTheme } from '../../styles/customerTheme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  disabled?: boolean;
  children: ReactNode;
};

const C = customerTheme.v4;

export function CustomerFormSheet({ visible, title, onClose, disabled = false, children }: Props) {
  const insets = useSafeAreaInsets();
  return <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.sheet} contentContainerStyle={[styles.content, { paddingBottom: Math.max(28, insets.bottom + 12) }]}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.handleRow}><View style={styles.handle} /></View>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" disabled={disabled}
            onPress={onClose} style={styles.closeButton}>
            <Image source={require('../../assets/icons/modal-close-v4.png')} style={styles.closeIcon} />
          </Pressable>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(46,10,87,0.62)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', maxWidth: 560, width: '100%' },
  content: { gap: 16, paddingHorizontal: 20, paddingTop: 12 },
  handleRow: { alignItems: 'center' },
  handle: { backgroundColor: C.border, borderRadius: 3, height: 5, width: 44 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: C.text, flex: 1, fontFamily: C.fontDisplay, fontSize: 24, lineHeight: 28 },
  closeButton: { alignItems: 'center', backgroundColor: C.field, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  closeIcon: { height: 20, width: 20 },
});
