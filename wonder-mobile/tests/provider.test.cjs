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
      if (id === 'react-native') return { Platform: { OS: 'web' } };
      if (id.startsWith('.')) {
        return carregar(path.relative(
          path.resolve(__dirname, '../src'),
          path.resolve(path.dirname(caminho), `${id}.ts`)
        ));
      }
      return requireOriginal(id);
    };

    modulo._compile(ts.transpileModule(fs.readFileSync(caminho, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText, caminho);
    return modulo.exports;
  }

  return carregar;
}

function arquivo(conteudo, tipo, nome) {
  const file = new Blob([conteudo], { type: tipo });
  Object.defineProperty(file, 'name', { value: nome });
  return file;
}

test('foto do servico usa a rota definitiva e o campo multipart file', async () => {
  const requests = [];
  const servico = { id: 12, prestador_id: 4, nome: 'Corte', preco: 50, duracao_min: 30 };
  const provider = carregarModulos({
    post: async (route, payload) => {
      requests.push({ route, payload });
      return { data: { ...servico, foto_url: `${route}` } };
    },
  })('services/provider.ts');
  const file = arquivo('png', 'image/png', 'corte.png');

  const result = await provider.uploadFotoServico(4, 12, { uri: 'blob:corte', file });

  assert.equal(requests[0].route, '/catalogo/prestadores/4/servicos/12/foto');
  assert.ok(requests[0].payload instanceof FormData);
  assert.equal(requests[0].payload.get('file').name, 'corte.png');
  assert.equal(requests[0].payload.get('arquivo'), null);
  assert.match(result.foto_url, /servicos\/12\/foto/);
});

test('foto invalida do servico e recusada antes da chamada ao backend', async () => {
  let uploads = 0;
  const provider = carregarModulos({
    post: async () => {
      uploads += 1;
      return { data: {} };
    },
  })('services/provider.ts');
  const file = arquivo('gif', 'image/gif', 'servico.gif');

  await assert.rejects(
    provider.uploadFotoServico(4, 12, { uri: 'blob:servico', file }),
    /JPEG, PNG ou WebP/
  );
  assert.equal(uploads, 0);
});

test('cadastro de servico permite foto e categorias seguem os servicos', () => {
  const modal = fs.readFileSync(
    path.resolve(__dirname, '../src/components/ProviderServiceModal.tsx'),
    'utf8'
  );
  const profile = fs.readFileSync(
    path.resolve(__dirname, '../src/screens/ProviderProfileScreen.tsx'),
    'utf8'
  );

  assert.match(modal, /Selecionar foto/);
  assert.match(modal, /validateProfilePhoto/);
  assert.doesNotMatch(modal, /Imagem opcional fora do escopo/);
  assert.match(profile, /categories=\{categoriasAtivas\}/);
  assert.doesNotMatch(profile, /Associar categoria ativa/);
  assert.doesNotMatch(profile, /associarMinhasCategoriasPrestador|removerMinhaCategoriaPrestador/);

  const onboarding = fs.readFileSync(
    path.resolve(__dirname, '../src/services/providerOnboarding.ts'),
    'utf8'
  );
  assert.match(onboarding, /get<ProviderOnboardingCategory\[]>\('\/catalogo\/prestadores\/me\/categorias'\)/);
  assert.doesNotMatch(onboarding, /api\.(post|delete).*\/me\/categorias/);
});
