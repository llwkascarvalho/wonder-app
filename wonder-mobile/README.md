# Wonder Mobile

Aplicativo mobile do Wonder criado com Expo, React Native e TypeScript.

## Escopo da Issue 34

Esta etapa entrega apenas a base visual e estrutural do app:

- Design System centralizado em `src/styles/theme.ts`
- Componentes reutilizáveis: `Button`, `Input`, `Card` e `LoadingIndicator`
- Navegação inicial com Stack Navigator e Bottom Tabs
- Telas placeholder para Início, Busca, Agendamentos e Perfil
- Cliente Axios configurado para consumir somente o Gateway
- `.env.example` com `EXPO_PUBLIC_API_URL`

Não estão implementados nesta issue:

- login real
- fluxo do cliente
- fluxo do prestador
- notificações
- chat IA

## Configuração

Crie um arquivo `.env` a partir do exemplo:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
```

Use `http://10.0.2.2:8000` no emulador Android. Em dispositivo físico, use o IP da máquina na mesma rede.

## Como rodar

```bash
cd wonder-mobile
npx expo start
```

Depois, abra no Expo Go ou no emulador.
