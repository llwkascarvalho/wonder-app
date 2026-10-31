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

Cada chamada pode repetir uma vez após 401. Refresh rejeitado ou segundo 401 encerram a sessão. Um 403 informa falta de permissão sem renovar. Falha de rede/5xx no bootstrap bloqueia a navegação, preserva credenciais recuperáveis e oferece **Tentar novamente**. Se já houver um perfil confirmado, falhas recuperáveis de refresh preservam esse perfil. A leitura de perfil usa o contexto, com recarga pelo mesmo GET. Não há chamadas aos endpoints `/auth/me` antigos. O fluxo de solicitação de prestador permanece existente.

**Editar perfil** permite atualizar telefone e/ou foto em cliente, prestador e administrador por `PUT /perfis/eu` multipart autenticado. Nome e e-mail continuam somente para leitura. O telefone aceita até 20 caracteres; deixá-lo em branco preserva o valor atual. A galeria aceita JPEG, PNG e WebP de até 5 MiB com tipo/tamanho identificados. O formulário mantém a seleção após falha para nova tentativa e salva sem carregamento global. A foto é consultada com autenticação e recarregada após substituição, mesmo com URL igual; sua ausência ou falha mostra a inicial do nome. Edição permanece indisponível em demonstração.

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

Atualização de perfil em 30/10/2026: `npm run typecheck` sem erros, `npm test` com os 20 testes existentes aprovados e exportação Expo Android/iOS/web concluída em `.expo/profile-export`. Nenhum teste novo foi criado, conforme solicitado. Revisão dos consumidores do tipo de foto preservou os uploads de prestador e categorias, sem alterações nesses serviços. Os checks locais não comprovam ausência de regressões em execução integrada.

Pendências desta atualização: validar telefone isolado, foto isolada e ambos com Core/Keycloak e dispositivo; persistência ao reabrir; nome/e-mail inalterados; troca de foto com URL igual; limite exato de 5 MiB; formatos/metadados inválidos; permissão negada e cancelamento; rede e respostas 400/401/403/413/415/503 com nova tentativa. Conferir multipart e imagem em web/Android/iOS. Executar smoke tests de login/cadastro/restauração/refresh/logout, abas cliente/prestador/admin/demo, catálogo, agendamento, notificações/chat, solicitação/gestão de prestador, administração e uploads existentes. Essas verificações dependem do ambiente integrado e não foram executadas nesta sessão.

Validação mobile com Keycloak/Core reais: **pendente**. Não foram fornecidos issuer/client/audience reais, acesso administrativo ao realm ou código/configuração do Core externo. Antes de concluir a change, validar:

- Conta existente e cadastro novo com `CUSTOMER`; repetição de `/perfis/eu` sem duplicar perfil, inclusive em chamadas concorrentes.
- UUID local diferente do `sub`, `keycloakId` correspondente, foto/telefone nulos e bloqueio por divergência.
- Tentativas de indicar outro usuário ignoradas/rejeitadas pelo Core; JWT ausente/inválido sem criar perfil.
- Restauração após reiniciar o app, expiração, rotação/rejeição do refresh, cancelamento, 401 persistente, 403 e rede/5xx seguidos de nova tentativa.
- Interfaces CUSTOMER/PROVIDER/ADMIN, múltiplas roles, aprovação administrativa, nenhum acesso antes do perfil e demonstração separada.
- Logout OIDC e novo login, inclusive falha remota e operações pendentes.

## Validação do catálogo público e disponibilidade

`npm test` inclui os cenários de contrato do catálogo, fuso de Fortaleza, falha na
consulta de horários e cancelamento de buscas antigas. Home e Busca cancelam as
consultas anteriores ao trocar filtros ou sair da tela. A Busca mantém uma única
consulta com espera de 350 ms durante a digitação.

O selo **Atende hoje** considera somente o expediente cadastrado com horário final
ainda futuro. Ele não garante vaga para um serviço: os intervalos livres vêm de
`GET /agendamentos/disponibilidade`. Falha na consulta do expediente é apresentada
como **Horários indisponíveis**, sem classificar o prestador como fechado.

Para executar também a integração HTTP com o Core Spring real, inicie uma API
local conectada a um banco de validação com as migrations e seeds do PI-Wonder e
execute no PowerShell:

```powershell
$env:WONDER_API_TEST_URL = 'http://localhost:18080'
npm test
```

O teste não envia JWT nem altera dados. Confere categorias, filtros, detalhe,
serviços, expediente, dias e intervalos livres, além dos erros 400/404. Utiliza os
agendamentos do seed em janeiro de 2030 para verificar que o confirmado bloqueia
o horário e o cancelado não bloqueia. Sem a variável, somente esse teste HTTP é
ignorado; os testes locais continuam sendo executados.

O Core precisa preservar o status dos erros durante o encaminhamento interno de
erro. A correção desse comportamento é acompanhada na issue
[PI-Wonder #94](https://github.com/JoaoManoelFontes/PI-Wonder/issues/94).

## Cadastro profissional no Core Spring

O formulário usa as etapas **Dados → Endereço → Revisão**, que compartilham um
único objeto em memória. Avançar, voltar ou selecionar uma aba preserva os campos
e não grava dados na API. O botão **Enviar cadastro** envia um único
`POST /catalogo/prestadores` com `multipart/form-data`. Os campos de texto de
`CadastroPrestadorRequest` são partes individuais: `nomeEstab`, `documento`,
`endereco`, `numero`, `bairro`, `cidade`, `estado` e `complemento`. A foto opcional
vai na parte `arquivo`, na mesma requisição. O Axios define o Content-Type com
o boundary do formulário; não há um upload anterior ou envio separado de foto.

Somente `nomeEstab` é obrigatório, conforme o DTO. Campos opcionais vazios são
omitidos do multipart; os limites de tamanho acompanham a API. A seleção da foto
usa a galeria, com prévia e opção de remover, e segue a validação do perfil:
JPEG, PNG ou WebP de até 5 MiB. Na web envia o `File`; no celular envia URI, nome
e MIME. Categorias, serviços e horários não fazem parte
deste formulário porque não são campos desse endpoint.

Na abertura, o app consulta o cadastro existente via GET. Após o POST bem-sucedido,
exibe o status devolvido pela API, sem chamar `/enviar-aprovacao`. Em caso de erro,
mantém os valores e a foto selecionada para nova tentativa. O formulário em memória não sobrevive ao
recarregamento do app. Os testes de onboarding verificam a navegação, o payload
multipart com e sem foto, permissão da galeria, cancelamento, falhas e proteção
contra envio duplicado usando API simulada.

## Rollback

Este frontend exige Core que aceite tokens Keycloak e implemente `/perfis/eu` com o DTO acima. Para rollback, restaure em conjunto a versão anterior do frontend, sua configuração Google/redirect e o backend/gateway antigo compatível com `/auth/google/login` e `/auth/me`. Não combine o frontend novo com a autenticação legada. O descarte do JWT antigo exige novo login após rollback; os tokens novos não substituem o armazenamento antigo.

Referências: [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/), [autenticação Expo](https://docs.expo.dev/guides/authentication/) e [endpoints OIDC Keycloak](https://www.keycloak.org/securing-apps/oidc-layers).
