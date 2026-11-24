import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { A, AdminAction, adminV4 } from './AdminV4';

export type AdminExportFeedbackState = { kind: 'success' } | { kind: 'error'; message: string } | null;

export function AdminExportFeedback({ feedback, onClose }: {
  feedback: AdminExportFeedbackState;
  onClose: () => void;
}) {
  const success = feedback?.kind === 'success';

  return <Modal visible={feedback !== null} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.dialog}>
        <View style={[styles.icon, !success && styles.errorIcon]}>
          <Ionicons name={success ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={30}
            color={success ? A.primary : A.danger} />
        </View>
        <Text style={adminV4.heading}>{success ? 'Exportação solicitada' : 'Não foi possível solicitar'}</Text>
        <Text style={styles.description}>{success
          ? 'Estamos preparando o arquivo CSV. Quando estiver pronto, enviaremos um link para o e-mail cadastrado na sua conta.'
          : feedback?.kind === 'error' ? feedback.message : ''}</Text>
        <View style={styles.action}><AdminAction label="Entendi" onPress={onClose} /></View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#2E0A579E', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 440, borderRadius: 28, backgroundColor: A.surface, padding: 24, gap: 16,
    shadowColor: A.primaryDeep, shadowOffset: { width: 0, height: 10 }, shadowOpacity: .18, shadowRadius: 28, elevation: 8 },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: A.lilac, alignItems: 'center', justifyContent: 'center' },
  errorIcon: { backgroundColor: '#FDE7EA' },
  description: { color: A.textMuted, fontFamily: A.fontBody, fontSize: 16, lineHeight: 24 },
  action: { marginTop: 4 },
});
