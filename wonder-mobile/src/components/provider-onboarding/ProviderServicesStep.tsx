import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { CatalogImage } from '../catalog/CatalogImage';
import { ProviderServiceModal } from '../ProviderServiceModal';
import { theme } from '../../styles/theme';
import { ProfilePhotoAsset } from '../../types/profile';
import { ProviderOnboardingCategory, ProviderOnboardingService } from '../../types/providerOnboarding';

type ServicePayload = { nome: string; preco: number; duracao_min: number; categoria_id?: number };

type Props = {
  categories: ProviderOnboardingCategory[];
  services: ProviderOnboardingService[];
  saving: boolean;
  disabled: boolean;
  onSave: (payload: ServicePayload, photo?: ProfilePhotoAsset, service?: ProviderOnboardingService) => Promise<void>;
  onRemove: (serviceId: number) => Promise<void>;
};

export function ProviderServicesStep({ categories, services, saving, disabled, onSave, onRemove }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ProviderOnboardingService | null>(null);
  const categoriesById = new Map(categories.map((category) => [category.id, category.nome]));

  function open(service?: ProviderOnboardingService) {
    setEditing(service || null);
    setModalVisible(true);
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Serviços *</Text>
          <Text style={styles.text}>Cadastre ao menos um serviço e selecione sua categoria.</Text>
        </View>
        <Button title="Adicionar" size="sm" disabled={disabled || !categories.length} onPress={() => open()} />
      </View>
      {services.length ? services.map((service) => (
        <View key={service.id} style={styles.item}>
          <View style={styles.itemSummary}>
            <CatalogImage authenticated fotoUrl={service.foto_url} kind="service" style={styles.servicePhoto} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{service.nome}</Text>
              <Text style={styles.text}>R$ {Number(service.preco).toFixed(2)} · {service.duracao_min} min</Text>
              <Text style={styles.text}>Categoria: {service.categoria_id ? categoriesById.get(service.categoria_id) || 'Categoria ativa' : 'Não informada'}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button title="Editar" size="sm" variant="outline" disabled={disabled} onPress={() => open(service)} />
            <Button title="Remover" size="sm" variant="outline" disabled={disabled} onPress={() => onRemove(service.id)} />
          </View>
        </View>
      )) : <Text style={styles.warning}>Nenhum serviço cadastrado.</Text>}
      {!categories.length ? <Text style={styles.warning}>Não há categorias ativas disponíveis.</Text> : null}
      <ProviderServiceModal visible={modalVisible} loading={saving} categories={categories}
        initialService={editing} onClose={() => setModalVisible(false)}
        onSave={async (payload, photo) => { await onSave(payload, photo, editing || undefined); setModalVisible(false); }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  headerText: { flex: 1, gap: theme.spacing.xs },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold },
  text: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, lineHeight: 20 },
  warning: { color: theme.colors.warning, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold },
  item: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.borderRadius.sm, gap: theme.spacing.sm, padding: theme.spacing.sm },
  itemSummary: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  itemInfo: { flex: 1, gap: theme.spacing.xs },
  itemTitle: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
  servicePhoto: { borderRadius: theme.borderRadius.sm, height: 76, width: 76 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
