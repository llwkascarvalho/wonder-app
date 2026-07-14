import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import api from '../../services/api';
import { theme } from '../../styles/theme';

type CatalogImageKind = 'category' | 'provider' | 'service';

type CatalogImageProps = {
  fotoUrl?: string | null;
  kind: CatalogImageKind;
  style?: StyleProp<ImageStyle>;
};

const fallbackLabel: Record<CatalogImageKind, string> = {
  category: 'Categoria',
  provider: 'Loja',
  service: 'Serviço',
};

function resolveCatalogImageUrl(fotoUrl?: string | null) {
  if (!fotoUrl) {
    return undefined;
  }

  if (/^https?:\/\//i.test(fotoUrl)) {
    return fotoUrl;
  }

  const baseURL = String(api.defaults.baseURL || '').replace(/\/$/, '');
  const normalizedPath = fotoUrl.startsWith('/') ? fotoUrl : `/${fotoUrl}`;

  return `${baseURL}${normalizedPath}`;
}

export function CatalogImage({ fotoUrl, kind, style }: CatalogImageProps) {
  const source = resolveCatalogImageUrl(fotoUrl);

  if (source) {
    return <Image source={{ uri: source }} resizeMode="cover" style={[styles.base, style]} />;
  }

  return (
    <View style={[styles.base, styles.fallback, style as StyleProp<ViewStyle>]}>
      <Text style={styles.fallbackText}>{fallbackLabel[kind]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  },
});
