import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import { extrairMensagemErro, criarAgendamento } from '../services/agendamentos';
import { listarHorariosPrestador, listarServicosPrestador } from '../services/catalogo';
import { theme } from '../styles/theme';
import { DIAS_SEMANA, Horario, Servico } from '../types/catalogo';

type AgendamentoRouteProp = {
  key: string;
  name: 'Agendamento';
  params: SearchStackParamList['Agendamento'];
};

type AgendamentoNavigationProp = NativeStackNavigationProp<SearchStackParamList, 'Agendamento'>;

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function AgendamentoScreen() {
  const navigation = useNavigation<AgendamentoNavigationProp>();
  const route = useRoute<AgendamentoRouteProp>();
  const { prestadorId, servicoId } = route.params;

  const [servico, setServico] = useState<Servico | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErroCarregamento(null);

      try {
        const [servicos, horariosData] = await Promise.all([
          listarServicosPrestador(prestadorId),
          listarHorariosPrestador(prestadorId),
        ]);

        if (!ativo) return;

        const encontrado = servicos.find((item) => item.id === servicoId) ?? null;
        setServico(encontrado);
        setHorarios(horariosData);
      } catch {
        if (ativo) setErroCarregamento('Não foi possível carregar os dados do agendamento.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [prestadorId, servicoId]);

  async function confirmarAgendamento() {
    setErroFormulario(null);

    if (!DATA_REGEX.test(data)) {
      setErroFormulario('Informe a data no formato AAAA-MM-DD (ex.: 2026-07-20).');
      return;
    }

    if (!HORA_REGEX.test(hora)) {
      setErroFormulario('Informe o horário no formato HH:MM (ex.: 14:30).');
      return;
    }

    const inicio = `${data}T${hora}:00`;

    setEnviando(true);

    try {
      await criarAgendamento({ prestador_id: prestadorId, servico_id: servicoId, inicio });

      Alert.alert('Agendamento confirmado!', 'Você pode acompanhá-lo na aba Agenda.', [
        { text: 'OK', onPress: () => navigation.navigate('SearchHome') },
      ]);
    } catch (error) {
      setErroFormulario(
        extrairMensagemErro(error, 'Não foi possível confirmar o agendamento. Tente novamente.')
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return <LoadingIndicator text="Carregando serviço..." />;
  }

  if (erroCarregamento || !servico) {
    return (
      <View style={styles.container}>
        <Card>
          <Text style={styles.cardText}>{erroCarregamento || 'Serviço não encontrado.'}</Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.servicoCard}>
        <Text style={styles.cardTitle}>{servico.nome}</Text>
        <Text style={styles.cardText}>
          R$ {servico.preco.toFixed(2)} · {servico.duracao_min} min
        </Text>
      </Card>

      {horarios.length > 0 ? (
        <Card style={styles.horariosCard}>
          <Text style={styles.sectionTitle}>Horários de funcionamento</Text>
          {horarios.map((horario) => (
            <Text key={horario.id} style={styles.cardText}>
              {DIAS_SEMANA[horario.dia_semana] ?? `Dia ${horario.dia_semana}`}:{' '}
              {horario.hora_inicio.slice(0, 5)} às {horario.hora_fim.slice(0, 5)}
            </Text>
          ))}
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Escolha data e horário</Text>

      <Input
        label="Data (AAAA-MM-DD)"
        placeholder="2026-07-20"
        value={data}
        onChangeText={setData}
        keyboardType="numbers-and-punctuation"
      />

      <Input
        label="Horário (HH:MM)"
        placeholder="14:30"
        value={hora}
        onChangeText={setHora}
        keyboardType="numbers-and-punctuation"
      />

      {erroFormulario ? (
        <Card style={styles.erroCard}>
          <Text style={styles.erroText}>{erroFormulario}</Text>
        </Card>
      ) : null}

      <Button
        title="Confirmar agendamento"
        onPress={confirmarAgendamento}
        loading={enviando}
        disabled={enviando}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  servicoCard: {
    gap: theme.spacing.xs,
  },
  horariosCard: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  erroCard: {
    backgroundColor: '#FEF2F2',
    borderColor: theme.colors.error,
  },
  erroText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
  },
});
