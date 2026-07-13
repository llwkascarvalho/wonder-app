import { ProfileScreenContent } from '../../components/profile/ProfileScreenContent';
import { useAuth } from '../../contexts/AuthContext';

export function AdminProfileScreen() {
  const { signOut } = useAuth();

  return (
    <ProfileScreenContent
      title="Perfil"
      subtitle="Sessao administrativa ativa."
      onSignOut={signOut}
    />
  );
}
