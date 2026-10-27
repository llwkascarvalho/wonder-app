# Wonder Mobile

Aplicativo React Native/Expo com login e cadastro hospedados no Keycloak. O app só libera a área autenticada após obter o perfil local em `GET /perfis/eu`.

## Configuração

Copie `.env.example` para `.env` e preencha os valores do ambiente:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
EXPO_PUBLIC_KEYCLOAK_ISSUER=https://SEU_HOST/realms/SEU_REALM
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=wonder-mobile
EXPO_PUBLIC_AUTH_REDIRECT_URI=wonder://auth
EXPO_PUBLIC_DEMO_MODE=false
```

O issuer é a URL do realm, sem `/.well-known/openid-configuration`. Client ID e issuer reais ainda precisam ser informados; `wonder-mobile` é um exemplo. Nenhuma variável pública deve conter segredo. `EXPO_PUBLIC_AUTH_LOGIN_PATH` não é mais usado. Se o `.env` existente tiver um redirect `exp://...`, substitua-o pelo redirect exato registrado para o novo build. Quando omitido, o redirect é gerado com scheme `wonder` e path `auth`.

`10.0.2.2` alcança o computador pelo emulador Android. No aparelho físico, use um host acessível na rede. O issuer deve ser o mesmo no navegador, no app e na validação do Core; não troque seu hostname por plataforma. Use HTTPS no ambiente de integração. Reinicie o Expo após alterar o `.env`.

## Keycloak e Core

Configure no Keycloak, antes do teste integrado:

1. Client OIDC público (Client authentication desativado), Standard Flow habilitado e PKCE obrigatório com método `S256`. Sem client secret no app.
2. Registre `wonder://auth` exatamente em Valid Redirect URIs e Valid Post Logout Redirect URIs, quando usar o exemplo nativo acima. Se usar outra URI, registre o valor exato de `EXPO_PUBLIC_AUTH_REDIRECT_URI` em ambos os campos; não use curingas.
3. Habilite User Registration no realm. O cadastro fica no link da própria página Keycloak.
4. Configure `CUSTOMER` como role padrão. Conceda `PROVIDER` somente após aprovação administrativa no fluxo de solicitação existente. O frontend não concede roles.
5. Disponibilize `realm_access.roles` no access token, e as claims `name`, `preferred_username` e `email` via scopes `openid profile email`. O e-mail pode ser null. A interface usa precedência `ADMIN > PROVIDER > CUSTOMER`, preservando todas as roles da conta. Papel desconhecido bloqueia o acesso.
6. Configure a audience exigida pelo Core no access token. A audience depende do ambiente e não foi fornecida neste repositório.

O Core Spring é externo a este repositório. Ele deve validar assinatura, issuer, expiração e audience do JWT antes do controller e resolver o perfil exclusivamente pelo `sub` validado. IDs enviados em body, query ou headers de identidade não podem selecionar o perfil. JWT ausente/inválido deve retornar 401 sem consultar/criar perfil. A busca/criação deve ser idempotente, com um perfil por identidade Keycloak, inclusive sob concorrência.

O contrato de `GET /perfis/eu`, sem body nem parâmetros de identidade, é:

```ts
type PerfilUsuarioResponse = {
  id: string;             // UUID local do Core
  keycloakId: string;     // UUID igual ao sub do token
  fotoUrl: string | null;
  numeroTelefone: string | null;
};
```

`usuario.id` e `usuario.profileId` recebem o UUID local, usado nas relações como `prestador.usuario_id`. `keycloakId` fica separado e precisa coincidir com `sub`. Foto e telefone vêm do Core; a URL de foto é exibida como recebida. Nome (`name`, fallback `preferred_username`), e-mail e roles vêm do Keycloak. A assinatura do JWT não é validada pelo frontend; a decodificação serve apenas à apresentação após a consulta protegida ao Core.

## Execução nativa

```bash
npm install
npx expo run:android
```

No macOS com Xcode, use `npx expo run:ios`. Use um build nativo de desenvolvimento com scheme `wonder`; Expo Go não suporta este fluxo com scheme personalizado. O `run` gera/compila o projeto nativo e inicia o Metro. Recompile o app após adicionar módulos nativos ou alterar o scheme. `expo-auth-session`, `expo-web-browser` e `expo-secure-store` já existiam; somente `expo-crypto` foi acrescentado para PKCE.

## Sessão, falhas e perfil

No nativo, access token, refresh token, expiração e ID token são armazenados no SecureStore. O JWT legado (`jwt`) é descartado na restauração. A abertura do app restaura tokens, renova se necessário e consulta novamente o Core. Pedidos simultâneos compartilham a renovação e persistem o refresh token rotacionado.

Cada chamada pode repetir uma vez após 401. Refresh rejeitado ou segundo 401 encerram a sessão. Um 403 informa falta de permissão sem renovar. Falha de rede/5xx no bootstrap ou refresh bloqueia a navegação, preserva credenciais recuperáveis e oferece **Tentar novamente**. A leitura de perfil usa o contexto, com recarga pelo mesmo GET. Edição e upload de foto pessoal ficam indisponíveis até existirem contratos confirmados; não há chamadas aos endpoints `/auth/me` antigos. O fluxo de solicitação de prestador permanece existente.

**Sair** limpa a sessão local e tenta encerrar o SSO via logout OIDC com retorno registrado e ID token hint. Caso o logout remoto falhe ou seja cancelado, o app informa que a sessão remota pode continuar ativa. Operações de login, restauração, perfil e refresh iniciadas antes do logout não podem recriar a sessão.

## Demonstração e web

Com `EXPO_PUBLIC_DEMO_MODE=true`, aparece **Continuar sem login (demonstração)**, além do login normal. A demonstração usa uma identidade local separada, sem JWT e sem bootstrap em `/perfis/eu`; ações protegidas continuam indisponíveis.

Para web, use `npm run web`. Defina um redirect web exato (por exemplo, `http://localhost:8081/auth`) em `EXPO_PUBLIC_AUTH_REDIRECT_URI` e registre-o no login/logout do client. Configure a origem exata em Web Origins do Keycloak e no CORS do Core. Confira a porta efetiva exibida pelo Expo. Em produção, use HTTPS e a URL real da aplicação.

O suporte web mantém tokens apenas em memória: recarregar a página exige novo login. Não há paridade de persistência com o mobile nem gravação de novos tokens em localStorage. O JWT legado web é removido na abertura. Popups e redirects web ainda exigem validação no navegador do ambiente real.

## Verificação e validação integrada

```bash
npm run typecheck
npm test
npx expo export --platform all --output-dir .expo/keycloak-export
```

Os testes usam `node:test`, o TypeScript já instalado e adaptadores simulados para Expo/SecureStore. Exercitam normalização e precedência de roles, PKCE/troca de código, cancelamento, restauração, refresh concorrente e rotacionado, rejeição versus indisponibilidade, repetição limitada após 401, 403 e invalidação de respostas/escritas após logout. Não substituem validação em aparelho e serviços reais.

Resultados locais em 23/10/2026: TypeScript sem erros; 20 testes aprovados; exportação Expo dos bundles Android, iOS e web concluída. A exportação comprova compatibilidade de empacotamento, sem comprovar login em navegador ou execução nativa no aparelho.

Validação mobile com Keycloak/Core reais: **pendente**. Não foram fornecidos issuer/client/audience reais, acesso administrativo ao realm ou código/configuração do Core externo. Antes de concluir a change, validar:

- Conta existente e cadastro novo com `CUSTOMER`; repetição de `/perfis/eu` sem duplicar perfil, inclusive em chamadas concorrentes.
- UUID local diferente do `sub`, `keycloakId` correspondente, foto/telefone nulos e bloqueio por divergência.
- Tentativas de indicar outro usuário ignoradas/rejeitadas pelo Core; JWT ausente/inválido sem criar perfil.
- Restauração após reiniciar o app, expiração, rotação/rejeição do refresh, cancelamento, 401 persistente, 403 e rede/5xx seguidos de nova tentativa.
- Interfaces CUSTOMER/PROVIDER/ADMIN, múltiplas roles, aprovação administrativa, nenhum acesso antes do perfil e demonstração separada.
- Logout OIDC e novo login, inclusive falha remota e operações pendentes.

## Rollback

Este frontend exige Core que aceite tokens Keycloak e implemente `/perfis/eu` com o DTO acima. Para rollback, restaure em conjunto a versão anterior do frontend, sua configuração Google/redirect e o backend/gateway antigo compatível com `/auth/google/login` e `/auth/me`. Não combine o frontend novo com a autenticação legada. O descarte do JWT antigo exige novo login após rollback; os tokens novos não substituem o armazenamento antigo.

Referências: [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/), [autenticação Expo](https://docs.expo.dev/guides/authentication/) e [endpoints OIDC Keycloak](https://www.keycloak.org/securing-apps/oidc-layers).
