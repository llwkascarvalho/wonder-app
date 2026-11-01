const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function carregarModulos(api) {
  const cache = new Map();

  function carregar(arquivo) {
    const caminho = path.resolve(__dirname, '../src', arquivo);
    if (cache.has(caminho)) return cache.get(caminho).exports;

    const modulo = new Module(caminho, module);
    modulo.filename = caminho;
    modulo.paths = Module._nodeModulePaths(path.dirname(caminho));
    cache.set(caminho, modulo);

    const requireOriginal = modulo.require.bind(modulo);
    modulo.require = (id) => {
      if (path.resolve(path.dirname(caminho), id) === path.resolve(__dirname, '../src/services/api')) {
        return { __esModule: true, default: api, api };
      }
      if (id.startsWith('.')) {
        return carregar(
          path.relative(
            path.resolve(__dirname, '../src'),
            path.resolve(path.dirname(caminho), `${id}.ts`)
          )
        );
      }
      return requireOriginal(id);
    };

    modulo._compile(
      ts.transpileModule(fs.readFileSync(caminho, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      caminho
    );
    return modulo.exports;
  }

  return carregar;
}

test('administracao usa somente as rotas consolidadas de prestadores', async () => {
  const requests = [];
  const detalhe = {
    id: 7,
    usuario_id: '10000000-0000-0000-0000-000000000001',
    nome_estab: 'Studio teste',
    documento: '123',
    status: 'pendente',
    ativo: false,
    servicos: [],
    horarios: [],
  };
  const admin = carregarModulos({
    get: async (route) => {
      requests.push({ method: 'GET', route });
      return { data: route.endsWith('/pendentes') ? [detalhe] : detalhe };
    },
    patch: async (route, payload) => {
      requests.push({ method: 'PATCH', route, payload });
      return { data: { ...detalhe, status: payload.status } };
    },
  })('services/admin.ts');

  assert.deepEqual(await admin.listarPrestadoresPendentes(), [detalhe]);
  assert.deepEqual(await admin.obterPrestadorAdmin(7), detalhe);
  assert.equal(
    (await admin.atualizarStatusPrestadorAdmin(7, { status: 'ativo' })).status,
    'ativo'
  );
  assert.deepEqual(requests, [
    { method: 'GET', route: '/admin/prestadores/pendentes' },
    { method: 'GET', route: '/admin/prestadores/7' },
    {
      method: 'PATCH',
      route: '/admin/prestadores/7/status',
      payload: { status: 'ativo' },
    },
  ]);
});

test('acoes exibidas respeitam exatamente as transicoes aceitas pelo backend', () => {
  const status = carregarModulos({})('utils/adminProviderStatus.ts');
  const targets = (current) =>
    status.getAdminProviderStatusActions(current).map((action) => action.status);

  assert.deepEqual(targets('pendente'), ['ativo', 'rascunho', 'rejeitado']);
  assert.deepEqual(targets('ativo'), ['suspenso']);
  assert.deepEqual(targets('suspenso'), ['ativo']);
  assert.deepEqual(targets('rascunho'), []);
  assert.deepEqual(targets('rejeitado'), []);
});

test('correcao e rejeicao exigem motivo e suspensao exige confirmacao', () => {
  const { getAdminProviderStatusActions } = carregarModulos({})(
    'utils/adminProviderStatus.ts'
  );
  const pendingActions = getAdminProviderStatusActions('pendente');
  const activeActions = getAdminProviderStatusActions('ativo');

  assert.equal(pendingActions.find((action) => action.status === 'ativo').requiresNote, undefined);
  assert.equal(pendingActions.find((action) => action.status === 'rascunho').requiresNote, true);
  assert.equal(pendingActions.find((action) => action.status === 'rejeitado').requiresNote, true);
  assert.equal(activeActions[0].requiresConfirmation, true);
});

test('mensagem diferencia aprovacao, suspensao e reativacao', () => {
  const { getAdminProviderStatusSuccessMessage } = carregarModulos({})(
    'utils/adminProviderStatus.ts'
  );

  assert.match(getAdminProviderStatusSuccessMessage('pendente', 'ativo'), /aprovado/);
  assert.match(getAdminProviderStatusSuccessMessage('ativo', 'suspenso'), /suspenso/);
  assert.match(getAdminProviderStatusSuccessMessage('suspenso', 'ativo'), /reativado/);
});
