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
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
```

O exemplo aponta para o `core` do PI-Wonder na porta `8080` quando usado no emulador Android. Em dispositivo físico, use o IP da máquina na mesma rede, por exemplo `http://192.168.0.10:8080`; no Expo Web, use `http://localhost:8080`.

## Acessar sem login para demonstração

Para navegar pelo aplicativo sem Google, defina no `.env`:

```env
EXPO_PUBLIC_DEMO_MODE=true
```

Inicie o Expo limpando o cache para carregar a variável:

```bash
npx expo start --clear
```

Na tela inicial, toque em **Continuar sem login (demonstração)**. Isso cria uma sessão local de cliente sem token; chamadas públicas da API, como as consultas de categorias e prestadores, continuam habilitadas sem autenticação. Para carregar dados, configure `EXPO_PUBLIC_API_URL` e inicie o `core` do PI-Wonder. Ações que exigem usuário autenticado não funcionarão nesse modo. Para voltar ao fluxo normal de login, defina `EXPO_PUBLIC_DEMO_MODE=false` e reinicie o Expo.

## Como rodar

```bash
cd wonder-mobile
npx expo start
```

Depois, abra no Expo Go ou no emulador.
