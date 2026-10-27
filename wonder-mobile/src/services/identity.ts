import type { DecodedJwtPayload } from '../types/auth';
import type { PerfilUsuarioResponse, UserProfile } from '../types/profile';

// Decodificação para exibição; a validação criptográfica pertence ao Core.
export function decodeJwtPayload(token: string): DecodedJwtPayload | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return JSON.parse(decodeURIComponent(Array.from(atob(padded))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')));
  } catch {
    return null;
  }
}

export function normalizeProfile(profile: PerfilUsuarioResponse, token: string): UserProfile {
  const claims = decodeJwtPayload(token);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!profile || typeof profile.id !== 'string' || !uuid.test(profile.id) ||
      typeof profile.keycloakId !== 'string' || !uuid.test(profile.keycloakId) ||
      !(profile.fotoUrl === null || typeof profile.fotoUrl === 'string') ||
      !(profile.numeroTelefone === null || typeof profile.numeroTelefone === 'string')) {
    throw new Error('Resposta de perfil incompatível com o contrato do Core.');
  }
  if (!claims?.sub || profile.keycloakId !== claims.sub) {
    throw new Error('Inconsistência de identidade entre Keycloak e Core.');
  }
  const roles = claims.realm_access?.roles;
  if (!Array.isArray(roles) || !roles.every((role) => typeof role === 'string')) {
    throw new Error('A conta não possui papéis reconhecidos no Keycloak.');
  }
  const tipo = roles.includes('ADMIN') ? 'admin' : roles.includes('PROVIDER') ? 'prestador'
    : roles.includes('CUSTOMER') ? 'cliente' : null;
  if (!tipo) throw new Error('A conta não possui papéis reconhecidos no Keycloak.');
  return {
    id: profile.id, profileId: profile.id, keycloakId: profile.keycloakId,
    nome: claims.name || claims.preferred_username || '', email: claims.email ?? null,
    tipo_usuario: tipo, roles, foto_url: profile.fotoUrl, telefone: profile.numeroTelefone,
  };
}
