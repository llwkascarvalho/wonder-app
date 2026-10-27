const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const axios = require('axios');

const localId = '11111111-1111-1111-1111-111111111111';
const subject = '22222222-2222-2222-2222-222222222222';
const jwt = (claims = {}) => `header.${Buffer.from(JSON.stringify({
  sub: subject, exp: Math.floor(Date.now() / 1000) + 600,
  name: 'João', email: null, realm_access: { roles: ['CUSTOMER'] }, ...claims,
})).toString('base64url')}.signature`;
const profile = { id: localId, keycloakId: subject, fotoUrl: null, numeroTelefone: null };
const credentials = (extra = {}) => ({
  accessToken: jwt(), refreshToken: 'refresh-1', idToken: 'id-1', expiresAt: Date.now() + 600000, ...extra,
});
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Usa o TypeScript já instalado para executar os módulos reais com os adaptadores
// nativos substituídos, sem adicionar um runner ou carregar React Native no Node.
function setup({ platform = 'android', refresh, browser, storeWrite, storeRead } = {}) {
  const data = new Map();
  let refreshCalls = 0;
  const requests = [];
  const mocks = {
    'react-native': { Platform: { OS: platform } },
    'expo-secure-store': {
      getItemAsync: async (key) => storeRead ? storeRead(key) : data.get(key) ?? null,
      setItemAsync: async (key, value) => { if (storeWrite) await storeWrite(); data.set(key, value); },
      deleteItemAsync: async (key) => { data.delete(key); },
    },
    'expo-web-browser': {
      maybeCompleteAuthSession() {},
      openAuthSessionAsync: browser ?? (async () => ({ type: 'success', url: 'wonder://auth' })),
    },
    'expo-auth-session': {
      makeRedirectUri: () => 'wonder://auth',
      fetchDiscoveryAsync: async () => ({ tokenEndpoint: 'https://issuer/token', endSessionEndpoint: 'https://issuer/logout' }),
      ResponseType: { Code: 'code' }, CodeChallengeMethod: { S256: 'S256' },
      AuthRequest: class {
        constructor(config) { requests.push(config); this.codeVerifier = 'verifier'; }
        async makeAuthUrlAsync() {}
        async promptAsync() { return mocks.authResult ?? { type: 'success', params: { code: 'code-1' } }; }
      },
      exchangeCodeAsync: async (config) => { requests.push(config); return { accessToken: jwt(), expiresIn: 600, refreshToken: 'refresh-1', idToken: 'id-1' }; },
      refreshAsync: async () => {
        refreshCalls++;
        return refresh ? refresh() : { accessToken: jwt({ name: 'Renovado' }), expiresIn: 600, refreshToken: 'refresh-2' };
      },
    },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, '../src', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = new Module(filename, moduleParent);
    cache.set(filename, module);
    module.filename = filename;
    module.paths = Module._nodeModulePaths(path.dirname(filename));
    const nativeRequire = module.require.bind(module);
    module.require = (id) => {
      if (id in mocks) return mocks[id];
      if (id.startsWith('.')) return load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(filename), `${id}.ts`)));
      return nativeRequire(id);
    };
    module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, filename);
    return module.exports;
  }
  const moduleParent = module;
  const session = load('services/session.ts');
  return { session, load, data, mocks, requests, refreshCalls: () => refreshCalls };
}

process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER = 'https://issuer/realms/wonder';
process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID = 'wonder-mobile';
process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI = 'wonder://auth';

test('perfil preserva IDs locais, nulls, URL do Core e claims UTF-8', () => {
  const { normalizeProfile } = setup().load('services/identity.ts');
  const result = normalizeProfile(profile, jwt());
  assert.equal(result.id, localId);
  assert.equal(result.profileId, localId);
  assert.equal(result.keycloakId, subject);
  assert.equal(result.nome, 'João');
  assert.equal(result.email, null);
  assert.equal(result.foto_url, null);
  assert.equal(result.telefone, null);
  assert.equal(normalizeProfile({ ...profile, fotoUrl: '/core/photo' }, jwt()).foto_url, '/core/photo');
  assert.equal(normalizeProfile(profile, jwt({ name: null, preferred_username: 'apelido' })).nome, 'apelido');
});

test('papéis respeitam ADMIN > PROVIDER > CUSTOMER e preservam papéis adicionais', () => {
  const { normalizeProfile } = setup().load('services/identity.ts');
  for (const [roles, expected] of [
    [['CUSTOMER'], 'cliente'], [['CUSTOMER', 'PROVIDER'], 'prestador'],
    [['CUSTOMER', 'ADMIN', 'PROVIDER', 'offline_access'], 'admin'],
  ]) {
    const result = normalizeProfile(profile, jwt({ realm_access: { roles } }));
    assert.equal(result.tipo_usuario, expected);
    assert.deepEqual(result.roles, roles);
  }
  assert.throws(() => normalizeProfile(profile, jwt({ realm_access: { roles: ['unknown'] } })), /papéis/);
  assert.throws(() => normalizeProfile({ ...profile, keycloakId: localId }, jwt()), /identidade/);
  assert.throws(() => normalizeProfile({ ...profile, id: 1 }, jwt()), /incompatível/);
  assert.throws(() => normalizeProfile(profile, 'invalid'), /identidade/);
});

test('login usa código, PKCE S256 e verifier; cancelamento não produz sessão', async () => {
  const env = setup();
  const auth = env.load('services/auth.ts');
  assert.ok((await auth.loginKeycloak()).accessToken);
  assert.equal(env.requests[0].usePKCE, true);
  assert.equal(env.requests[0].codeChallengeMethod, 'S256');
  assert.equal(env.requests[0].responseType, 'code');
  assert.equal(env.requests[1].extraParams.code_verifier, 'verifier');
  assert.equal(env.requests[1].code, 'code-1');
  env.mocks.authResult = { type: 'cancel' };
  assert.equal(await auth.loginKeycloak(), null);
});

test('20 chamadas simultâneas compartilham refresh e persistem refresh rotacionado', async () => {
  const pending = deferred();
  const env = setup({ refresh: () => pending.promise });
  await env.session.saveSession(credentials({ expiresAt: 0 }), 0);
  const calls = Array.from({ length: 20 }, () => env.session.getAccessToken());
  pending.resolve({ accessToken: jwt({ name: 'Novo' }), expiresIn: 600, refreshToken: 'rotacionado' });
  const tokens = await Promise.all(calls);
  assert.equal(env.refreshCalls(), 1);
  assert.ok(tokens.every((token) => token === tokens[0]));
  assert.equal(JSON.parse(env.data.get('keycloak-session')).refreshToken, 'rotacionado');
  assert.equal(env.session.getSession().idToken, 'id-1');
});

test('restauração descarta JWT antigo e renova tokens expirados', async () => {
  const env = setup();
  env.data.set('jwt', 'legacy');
  env.data.set('keycloak-session', JSON.stringify(credentials({ expiresAt: 0 })));
  await env.session.restoreSession();
  assert.equal(env.data.has('jwt'), false);
  assert.ok(await env.session.getAccessToken());
  assert.equal(env.refreshCalls(), 1);
});

test('refresh rejeitado encerra sessão; rede e 5xx preservam credenciais', async () => {
  for (const code of ['invalid_grant', 'invalid_client', 'unauthorized_client', 'server_error', undefined]) {
    const env = setup({ refresh: async () => { throw Object.assign(new Error('falha'), { code }); } });
    await env.session.saveSession(credentials({ expiresAt: 0 }), 0);
    await assert.rejects(env.session.getAccessToken());
    const rejected = ['invalid_grant', 'invalid_client', 'unauthorized_client'].includes(code);
    assert.equal(env.session.getSession() === null, rejected);
    assert.equal(env.data.has('keycloak-session'), !rejected);
  }
});

test('logout descarta refresh pendente e não sobrescreve novo login', async () => {
  const pending = deferred();
  const env = setup({ refresh: () => pending.promise });
  await env.session.saveSession(credentials({ expiresAt: 0 }), 0);
  const refresh = env.session.getAccessToken();
  await env.session.clearSession();
  const newSession = credentials({ accessToken: jwt({ name: 'Outra conta' }) });
  await env.session.saveSession(newSession, env.session.getSessionVersion());
  pending.resolve({ accessToken: jwt(), expiresIn: 600, refreshToken: 'stale' });
  await assert.rejects(refresh, /encerrada/);
  assert.equal(env.session.getSession().accessToken, newSession.accessToken);
  assert.equal(JSON.parse(env.data.get('keycloak-session')).refreshToken, newSession.refreshToken);
});

test('logout remove gravação de SecureStore que já estava em andamento', async () => {
  const started = deferred();
  const pending = deferred();
  const env = setup({ storeWrite: () => { started.resolve(); return pending.promise; } });
  const save = env.session.saveSession(credentials(), 0);
  await started.promise;
  const logout = env.session.clearSession();
  pending.resolve();
  await assert.rejects(save, /encerrada/);
  await logout;
  assert.equal(env.session.getSession(), null);
  assert.equal(env.data.has('keycloak-session'), false);
});

function rejectHttp(config, status) {
  throw new axios.AxiosError('HTTP error', 'ERR_BAD_RESPONSE', config, null, { status, config, data: {}, headers: {} });
}

test('401 concorrentes renovam uma vez e repetem com Bearer vigente', async () => {
  const env = setup();
  const { api } = env.load('services/api.ts');
  await env.session.saveSession(credentials(), 0);
  let calls = 0;
  api.defaults.adapter = async (config) => {
    calls++;
    if (!config._retry) rejectHttp(config, 401);
    assert.equal(config.headers.Authorization, `Bearer ${env.session.getSession().accessToken}`);
    return { config, status: 200, data: profile, headers: {} };
  };
  await Promise.all([api.get('/perfis/eu'), api.get('/perfis/eu')]);
  assert.equal(env.refreshCalls(), 1);
  assert.equal(calls, 4);
});

test('401 persistente encerra sessão após uma repetição; 403 não renova', async () => {
  for (const status of [401, 403]) {
    const env = setup();
    const { api } = env.load('services/api.ts');
    await env.session.saveSession(credentials(), 0);
    let calls = 0;
    api.defaults.adapter = async (config) => { calls++; rejectHttp(config, status); };
    await assert.rejects(api.get('/perfis/eu'));
    assert.equal(calls, status === 401 ? 2 : 1);
    assert.equal(env.refreshCalls(), status === 401 ? 1 : 0);
    assert.equal(env.session.getSession() === null, status === 401);
  }
});

test('resposta HTTP após logout não publica perfil nem encerra novo login', async () => {
  for (const status of [200, 401]) {
    const pending = deferred();
    const started = deferred();
    const env = setup();
    const { api } = env.load('services/api.ts');
    await env.session.saveSession(credentials(), 0);
    api.defaults.adapter = async (config) => {
      started.resolve(); await pending.promise;
      if (status === 401) rejectHttp(config, status);
      return { config, status, data: profile, headers: {} };
    };
    const request = api.get('/perfis/eu');
    await started.promise;
    await env.session.clearSession();
    await env.session.saveSession(credentials(), env.session.getSessionVersion());
    pending.resolve();
    await assert.rejects(request, /encerrada/);
    assert.ok(env.session.getSession());
    assert.equal(env.refreshCalls(), 0);
  }
});

test('GET de perfil não envia identidade escolhida pelo cliente', async () => {
  const env = setup();
  const { api } = env.load('services/api.ts');
  await env.session.saveSession(credentials(), 0);
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/perfis/eu');
    assert.equal(config.method, 'get');
    assert.equal(config.params, undefined);
    assert.equal(config.data, undefined);
    assert.equal(config.headers.Authorization, `Bearer ${env.session.getSession().accessToken}`);
    return { config, status: 200, data: profile, headers: {} };
  };
  assert.deepEqual(await env.load('services/profileService.ts').getMyProfile(), profile);
});

test('web mantém sessão em memória sem gravar tokens em armazenamento', async () => {
  const env = setup({ platform: 'web' });
  await env.session.saveSession(credentials(), 0);
  assert.ok(env.session.getSession());
  assert.equal(env.data.size, 0);
  await env.session.clearSession();
  assert.equal(env.session.getSession(), null);
});

test('logout OIDC usa redirect registrado e ID token hint', async () => {
  let url;
  const env = setup({ browser: async (value) => { url = new URL(value); return { type: 'success', url: 'wonder://auth' }; } });
  await env.load('services/auth.ts').logoutKeycloak(credentials());
  assert.equal(url.searchParams.get('id_token_hint'), 'id-1');
  assert.equal(url.searchParams.get('post_logout_redirect_uri'), 'wonder://auth');
  assert.equal(url.searchParams.get('client_id'), 'wonder-mobile');
});

test('nova tentativa após indisponibilidade recupera a sessão sem novo login', async () => {
  let unavailable = true;
  const env = setup({ refresh: async () => {
    if (unavailable) throw new Error('Network request failed');
    return { accessToken: jwt({ name: 'Recuperado' }), expiresIn: 600, refreshToken: 'refresh-2' };
  } });
  await env.session.saveSession(credentials({ expiresAt: 0 }), 0);
  await assert.rejects(env.session.getAccessToken(), /conexão/);
  unavailable = false;
  assert.ok(await env.session.getAccessToken());
  assert.equal(env.refreshCalls(), 2);
  assert.equal(env.session.getSession().refreshToken, 'refresh-2');
});

test('claims e roles renovados são publicados para atualizar o usuário', async () => {
  const env = setup({ refresh: async () => ({
    accessToken: jwt({ name: 'Aprovado', realm_access: { roles: ['CUSTOMER', 'PROVIDER'] } }), expiresIn: 600,
  }) });
  const { normalizeProfile } = env.load('services/identity.ts');
  await env.session.saveSession(credentials({ expiresAt: 0 }), 0);
  let updated;
  const unsubscribe = env.session.subscribeSession((tokens) => { updated = normalizeProfile(profile, tokens.accessToken); });
  await env.session.getAccessToken();
  assert.equal(updated.nome, 'Aprovado');
  assert.equal(updated.tipo_usuario, 'prestador');
  unsubscribe();
});

test('restauração iniciada antes do logout não ressuscita credenciais', async () => {
  const pending = deferred();
  const started = deferred();
  const env = setup({ storeRead: () => { started.resolve(); return pending.promise; } });
  const restoring = env.session.restoreSession();
  await started.promise;
  await env.session.clearSession();
  pending.resolve(JSON.stringify(credentials()));
  await restoring;
  assert.equal(env.session.getSession(), null);
});

test('sessão armazenada incompatível é removida', async () => {
  const env = setup();
  env.data.set('keycloak-session', JSON.stringify({ accessToken: 'legacy' }));
  await env.session.restoreSession();
  assert.equal(env.session.getSession(), null);
  assert.equal(env.data.has('keycloak-session'), false);
});

test('logout remoto cancelado falha sem recriar sessão local', async () => {
  const env = setup({ browser: async () => ({ type: 'cancel' }) });
  await env.session.saveSession(credentials(), 0);
  const previous = env.session.getSession();
  await env.session.clearSession();
  await assert.rejects(env.load('services/auth.ts').logoutKeycloak(previous), /não confirmado/);
  assert.equal(env.session.getSession(), null);
});

test('issuer/client ausentes geram erro de configuração', async () => {
  const original = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID;
  try {
    delete process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID;
    await assert.rejects(setup().load('services/auth.ts').loginKeycloak(), /Configure/);
  } finally {
    process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID = original;
  }
});
