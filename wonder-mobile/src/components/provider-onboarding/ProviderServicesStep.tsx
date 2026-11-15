import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { CatalogImage } from '../catalog/CatalogImage';
import { ProviderServiceModal } from '../ProviderServiceModal';
import { customerTheme } from '../../styles/customerTheme';
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
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headingGroup}>
          <View style={styles.iconBox}><MaterialIcons name="content-cut" size={20} color={customerTheme.colors.brandDark} /></View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Serviços *</Text>
            <Text style={styles.text}>Cadastre ao menos um serviço e selecione sua categoria.</Text>
          </View>
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
            <Button title="Editar" size="sm" variant="secondary" disabled={disabled} onPress={() => open(service)} />
            <Button title="Remover" size="sm" variant="danger" disabled={disabled} onPress={() => onRemove(service.id)} />
          </View>
        </View>
      )) : <Text style={styles.warning}>Nenhum serviço cadastrado.</Text>}
      {!categories.length ? <Text style={styles.warning}>Não há categorias ativas disponíveis.</Text> : null}
      <ProviderServiceModal visible={modalVisible} loading={saving} categories={categories}
        appearance="customer"
        initialService={editing} onClose={() => setModalVisible(false)}
        onSave={async (payload, photo) => { await onSave(payload, photo, editing || undefined); setModalVisible(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card,
    gap: 14, padding: 18, ...customerTheme.shadow,
  },
  header: { alignItems: 'flex-start', gap: 12 },
  headingGroup: { alignItems: 'center', flexDirection: 'row', gap: 12, width: '100%' },
  headerText: { flex: 1, gap: 3 },
  iconBox: {
    alignItems: 'center', backgroundColor: '#EFE3FA', borderRadius: 14,
    height: 44, justifyContent: 'center', width: 44,
  },
  title: { color: customerTheme.colors.text, fontSize: 18, fontWeight: '800' },
  text: { color: customerTheme.colors.textSecondary, fontSize: 12, lineHeight: 17 },
  warning: { color: '#9A6700', fontSize: 12, fontWeight: '600' },
  item: { backgroundColor: '#F4F1F8', borderRadius: 18, gap: 12, padding: 12 },
  itemSummary: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  itemInfo: { flex: 1, gap: 3 },
  itemTitle: { color: customerTheme.colors.text, fontSize: 14, fontWeight: '700' },
  servicePhoto: { borderRadius: 14, height: 72, width: 72 },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
});
