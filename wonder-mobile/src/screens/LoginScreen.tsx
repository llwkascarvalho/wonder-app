import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../styles/theme';

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir o login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/wonder-logo.png')} style={styles.logoMark} />
        <Logo size={38} />
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Bem-vindo ao Wonder</Text>
        <Text style={styles.subtitle}>
          Entre com sua conta Google para acessar seus agendamentos e serviços.
        </Text>

        <Button title="Entrar com Google" loading={loading} onPress={handleLogin} size="lg" />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.divider} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  logoMark: {
    height: 96,
    resizeMode: 'contain',
    width: 96,
  },
  form: {
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    bottom: theme.spacing.xl,
    left: theme.spacing.lg,
    position: 'absolute',
    right: theme.spacing.lg,
  },
  divider: {
    backgroundColor: theme.colors.border,
    height: 1,
    marginBottom: theme.spacing.md,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
});
