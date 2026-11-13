const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function preparar() {
  const cache = new Map();
  const handlers = {};
  let renovacoes = 0;
  const api = { interceptors: {
    request: { use: fn => { handlers.pedido = fn; } },
    response: { use: (ok, erro) => { handlers.resposta = ok; handlers.erro = erro; } },
  }, request() { throw new Error('Não pode reenviar pedido após refresh revogado'); } };
  function carregar(nome) {
    const arquivo = path.resolve(__dirname, '../src/services', `${nome}.ts`);
    if (cache.has(arquivo)) return cache.get(arquivo).exports;
    const modulo = new Module(arquivo, module);
    modulo.filename = arquivo;
    modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
    cache.set(arquivo, modulo);
    const original = modulo.require.bind(modulo);
    modulo.require = id => {
      if (id === 'react-native') return { Platform: { OS: 'web' } };
      if (id === 'expo-secure-store') return {};
      if (id === './auth') return { refreshKeycloak: async () => {
        renovacoes++; throw Object.assign(new Error('Sessão revogada'), { code: 'invalid_grant' });
      } };
      if (id === 'axios') return { __esModule: true, default: { create: () => api } };
      if (id === './session') return carregar('session');
      return original(id);
    };
    modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText, arquivo);
    return modulo.exports;
  }
  const sessao = carregar('session'); carregar('api');
  return { sessao, handlers, renovacoes: () => renovacoes,
    async entrar() {
      await sessao.saveSession({ accessToken: 'ainda-nao-expirou', refreshToken: 'refresh-revogado',
        idToken: null, expiresAt: Date.now() + 300000 }, sessao.getSessionVersion());
      return handlers.pedido({ headers: { delete() {} } });
    } };
}

test('401 com sessão revogada limpa tokens e notifica a interface, mesmo antes da expiração local', async () => {
  const app = preparar();
  const pedido = await app.entrar();
  let notificado = false;
  app.sessao.subscribeSession(tokens => { if (tokens === null) notificado = true; });
  await assert.rejects(app.handlers.erro({ config: pedido, response: { status: 401 } }), /Sessão expirada/);
  assert.equal(app.renovacoes(), 1);
  assert.equal(app.sessao.getSession(), null);
  assert.equal(notificado, true);
});

for (const status of [403, 503]) {
  test(`${status} preserva a sessão e não tenta renovar o token`, async () => {
    const app = preparar(); const pedido = await app.entrar();
    const erro = { config: pedido, response: { status } };
    await assert.rejects(app.handlers.erro(erro), error => error === erro);
    assert.equal(app.renovacoes(), 0);
    assert.equal(app.sessao.getSession().accessToken, 'ainda-nao-expirou');
  });
}
