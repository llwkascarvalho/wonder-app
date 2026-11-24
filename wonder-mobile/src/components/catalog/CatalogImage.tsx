import { useEffect, useState } from 'react';
import { Image, ImageStyle, Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import api from '../../services/api';
import { getProfilePhoto } from '../../services/profileService';
import { theme } from '../../styles/theme';

type CatalogImageKind = 'category' | 'provider' | 'service';

type CatalogImageProps = {
  fotoUrl?: string | null;
  kind: CatalogImageKind;
  style?: StyleProp<ImageStyle>;
  authenticated?: boolean;
  revision?: number;
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

  const baseURL = String(api.defaults.baseURL || '').replace(/\/$/, '');
  if (/^https?:\/\//i.test(fotoUrl)) {
    // As fotos do catálogo podem vir com a origem interna do backend (Docker).
    // A rota pertence à API do Wonder; use a origem configurada para este app.
    try {
      const url = new URL(fotoUrl);
      if (url.pathname.startsWith('/catalogo/')) return `${baseURL}${url.pathname}${url.search}`;
    } catch { /* URL externa inválida: a imagem exibirá o fallback. */ }
    return fotoUrl;
  }

  const normalizedPath = fotoUrl.startsWith('/') ? fotoUrl : `/${fotoUrl}`;

  return `${baseURL}${normalizedPath}`;
}

export function CatalogImage({ fotoUrl, kind, style, authenticated = false, revision }: CatalogImageProps) {
  const resolvedSource = resolveCatalogImageUrl(fotoUrl);
  const directSource = resolvedSource && revision
    ? `${resolvedSource}${resolvedSource.includes('?') ? '&' : '?'}v=${revision}`
    : resolvedSource;
  const [protectedSource, setProtectedSource] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setFailed(false);
    setProtectedSource(undefined);
    if (!authenticated || !directSource) return () => { active = false; };
    getProfilePhoto(directSource)
      .then((uri) => {
        objectUrl = uri;
        if (active) setProtectedSource(uri);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (Platform.OS === 'web' && objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    };
  }, [authenticated, directSource]);

  const source = authenticated ? protectedSource : directSource;

  if (source && !failed) {
    return <Image source={{ uri: source }} resizeMode="cover" style={[styles.base, style]}
      onError={() => setFailed(true)} />;
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
