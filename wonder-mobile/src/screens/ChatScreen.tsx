import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { extrairMensagemErro } from '../services/agendamentos';
import { buscarSugestoesIA, enviarMensagemChat } from '../services/ai';
import { theme } from '../styles/theme';
import { ChatMensagem } from '../types/chat';

const MENSAGEM_BOAS_VINDAS: ChatMensagem = {
  id: 'boas-vindas',
  autor: 'assistente',
  texto:
    'Olá! Sou o assistente do Wonder. Posso te ajudar a escolher serviços de beleza ou tirar dúvidas. Como posso ajudar?',
};

const ERRO_INDISPONIVEL =
  'O assistente está indisponível no momento. Tente novamente em instantes.';

function novoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatScreen() {
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([MENSAGEM_BOAS_VINDAS]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef<FlatList<ChatMensagem>>(null);

  function adicionarMensagem(mensagem: ChatMensagem) {
    setMensagens((atual) => [...atual, mensagem]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleEnviar() {
    const mensagemTexto = texto.trim();
    if (!mensagemTexto || enviando) return;

    adicionarMensagem({ id: novoId(), autor: 'usuario', texto: mensagemTexto });
    setTexto('');
    setEnviando(true);

    try {
      const resposta = await enviarMensagemChat(mensagemTexto);
      adicionarMensagem({ id: novoId(), autor: 'assistente', texto: resposta });
    } catch (error) {
      adicionarMensagem({
        id: novoId(),
        autor: 'assistente',
        texto: extrairMensagemErro(error, ERRO_INDISPONIVEL),
      });
    } finally {
      setEnviando(false);
    }
  }

  async function handleSugestaoRapida() {
    if (enviando) return;

    adicionarMensagem({
      id: novoId(),
      autor: 'usuario',
      texto: 'Pode me sugerir alguns serviços?',
    });
    setEnviando(true);

    try {
      const sugestoes = await buscarSugestoesIA();
      const texto =
        sugestoes.length > 0
          ? `Aqui vão algumas sugestões para você:\n${sugestoes.map((s) => `• ${s}`).join('\n')}`
          : 'No momento não encontrei sugestões personalizadas. Que tal explorar o catálogo?';
      adicionarMensagem({ id: novoId(), autor: 'assistente', texto });
    } catch (error) {
      adicionarMensagem({
        id: novoId(),
        autor: 'assistente',
        texto: extrairMensagemErro(error, ERRO_INDISPONIVEL),
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Text style={styles.title}>Assistente Wonder</Text>

      <FlatList
        ref={listRef}
        data={mensagens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.mensagensList}
        renderItem={({ item }) => (
          <View
            style={[
              styles.balao,
              item.autor === 'usuario' ? styles.balaoUsuario : styles.balaoAssistente,
            ]}
          >
            <Text
              style={
                item.autor === 'usuario' ? styles.balaoTextoUsuario : styles.balaoTextoAssistente
              }
            >
              {item.texto}
            </Text>
          </View>
        )}
      />

      {enviando ? <Text style={styles.digitando}>Assistente está digitando...</Text> : null}

      <View style={styles.acoesRapidas}>
        <Button
          title="Sugestão rápida"
          variant="secondary"
          size="sm"
          onPress={handleSugestaoRapida}
          disabled={enviando}
        />
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <Input
            placeholder="Pergunte algo sobre beleza..."
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={handleEnviar}
            editable={!enviando}
          />
        </View>
        <Button title="Enviar" onPress={handleEnviar} disabled={enviando || !texto.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  mensagensList: {
    flexGrow: 1,
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  balao: {
    borderRadius: 16,
    maxWidth: '80%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  balaoUsuario: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  balaoAssistente: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  balaoTextoUsuario: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
  },
  balaoTextoAssistente: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  digitando: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontStyle: 'italic',
  },
  acoesRapidas: {
    flexDirection: 'row',
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  inputWrapper: {
    flex: 1,
  },
});
