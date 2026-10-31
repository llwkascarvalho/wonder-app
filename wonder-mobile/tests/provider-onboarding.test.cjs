const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const axios = require('axios');

// Executa tela, validação, montagem do payload e serviço reais com UI e HTTP substituídos.
function setup({ existing = null, post, failLoad = false, platform = 'web', picker, permission = true } = {}) {
  const states = [];
  const calls = [];
  const effects = [];
  let cursor = 0;
  let mounted = false;
  const api = {
    get: async url => {
      calls.push({ method: 'GET', url });
      if (failLoad) throw new Error('Sem conexão');
      if (existing) return { data: existing };
      throw new axios.AxiosError('Não encontrado', undefined, undefined, undefined, { status: 404 });
    },
    post: async (url, payload) => {
      calls.push({ method: 'POST', url, payload });
      if (post) return post(url, payload);
      return { data: { id: 7, perfilUsuarioId: 'user', status: 'pendente', ativo: false, ...Object.fromEntries(payload.entries()) } };
    },
    put: async (url, payload) => {
      calls.push({ method: 'PUT', url, payload });
      return { data: { id: 'user', numeroTelefone: payload.get('numeroTelefone') } };
    },
  };
  const mocks = {
    react: {
      useState: initial => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
      useRef: initial => {
        const index = cursor++;
        if (!(index in states)) states[index] = { current: initial };
        return states[index];
      },
      useCallback: fn => fn,
      useMemo: fn => fn(),
      useEffect: fn => { if (!mounted) effects.push(fn); },
    },
    'expo-image-picker': {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: permission }),
      launchImageLibraryAsync: picker || (async () => ({ canceled: true, assets: [] })),
    },
    'react-native': {
      Platform: { OS: platform },
      ScrollView: 'ScrollView', View: 'View', Text: 'Text', StyleSheet: { create: value => value },
    },
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = new Module(filename, module);
    cache.set(filename, loaded);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    const originalRequire = loaded.require.bind(loaded);
    loaded.require = id => {
      if (id in mocks) return mocks[id];
      if (id === './api') return { __esModule: true, api, default: api };
      if (id.startsWith('../components/')) {
        const name = id.split('/').at(-1);
        return { [name]: name };
      }
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), `${id}.ts`));
      return originalRequire(id);
    };
    loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, filename);
    return loaded.exports;
  }
  const { ProviderOnboardingScreen } = load(path.resolve(__dirname, '../src/screens/ProviderOnboardingScreen.tsx'));
  const utils = load(path.resolve(__dirname, '../src/utils/providerRegistration.ts'));
  function render() {
    cursor = 0;
    const root = ProviderOnboardingScreen();
    mounted = true;
    const nodes = [];
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      nodes.push(node);
      walk(node.props?.children);
    }
    walk(root);
    return {
      find: type => nodes.find(node => node.type === type)?.props,
      button: title => nodes.find(node => node.type === 'Button' && node.props.title === title)?.props,
    };
  }
  return {
    calls, render, utils,
    service: load(path.resolve(__dirname, '../src/services/providerOnboarding.ts')),
    profileService: load(path.resolve(__dirname, '../src/services/profileService.ts')),
    writes: () => calls.filter(call => call.method !== 'GET'),
    async init() {
      render();
      effects.forEach(effect => effect());
      await new Promise(resolve => setImmediate(resolve));
      return render();
    },
  };
}

const complete = {
  nomeEstab: ' Studio Wonder ', documento: '12345678900',
  endereco: 'Rua das Flores', numero: '10', bairro: 'Centro', cidade: 'Natal', estado: 'rn', complemento: 'Sala 1',
};
const expected = { ...complete, nomeEstab: 'Studio Wonder', estado: 'RN' };

async function fill(app) {
  const ui = await app.init();
  ui.find('ProviderDataStep').onChange({ nomeEstab: complete.nomeEstab, documento: complete.documento });
  app.render().button('Avançar').onPress();
  app.render().find('ProviderAddressStep').onChange({
    endereco: complete.endereco, numero: complete.numero, bairro: complete.bairro,
    cidade: complete.cidade, estado: complete.estado, complemento: complete.complemento,
  });
  app.render().button('Avançar').onPress();
  return app.render();
}

test('campos de todas as etapas são acumulados e enviados em um único POST apenas na revisão', async () => {
  const app = setup();
  let ui = await fill(app);
  assert.deepEqual(ui.find('ProviderReviewStep').values, complete);
  assert.deepEqual(app.writes(), []);
  ui.button('Dados').onPress();
  assert.deepEqual(app.render().find('ProviderDataStep').values, complete);
  app.render().button('Endereço').onPress();
  assert.equal(app.render().find('ProviderAddressStep').values.nomeEstab, complete.nomeEstab);
  app.render().button('Revisão').onPress();
  await app.render().find('ProviderReviewStep').onSubmit();
  assert.equal(app.writes().length, 1);
  assert.equal(app.writes()[0].url, '/catalogo/prestadores');
  assert.ok(app.writes()[0].payload instanceof FormData);
  assert.deepEqual(Object.fromEntries(app.writes()[0].payload.entries()), expected);
  assert.deepEqual(app.calls.filter(call => call.method === 'GET'), [{ method: 'GET', url: '/catalogo/prestadores/me' }]);
  assert.equal(app.render().find('ProviderApplicationStatus').profile.status, 'pendente');
});

test('nome é obrigatório, opcionais vazios são omitidos do multipart e limites acompanham o DTO', async () => {
  const app = setup();
  let ui = await app.init();
  ui.button('Avançar').onPress();
  assert.ok(app.render().find('ProviderDataStep').errors.nomeEstab);
  ui = app.render();
  ui.button('Revisão').onPress();
  await app.render().find('ProviderReviewStep').onSubmit();
  assert.deepEqual(app.writes(), []);
  app.render().button('Dados').onPress();
  app.render().find('ProviderDataStep').onChange({ nomeEstab: ' Studio ' });
  app.render().button('Revisão').onPress();
  await app.render().find('ProviderReviewStep').onSubmit();
  assert.deepEqual(Object.fromEntries(app.writes()[0].payload.entries()), { nomeEstab: 'Studio' });
  for (const [key, field] of Object.entries(app.utils.registrationFields)) {
    const valid = { ...app.utils.emptyProviderDraft, nomeEstab: 'Studio', [key]: 'a'.repeat(field.maxLength) };
    assert.equal(app.utils.validateProviderRegistration(valid)[key], undefined);
    assert.ok(app.utils.validateProviderRegistration({ ...valid, [key]: valid[key] + 'a' })[key]);
  }
});

test('falha no POST preserva os campos completos e permite nova tentativa', async () => {
  let attempts = 0;
  const app = setup({ post: async (_url, payload) => {
    if (++attempts === 1) throw new Error('Falha de rede');
    return { data: { id: 7, perfilUsuarioId: 'user', status: 'pendente', ...Object.fromEntries(payload.entries()) } };
  } });
  let ui = await fill(app);
  await ui.find('ProviderReviewStep').onSubmit();
  ui = app.render();
  assert.deepEqual(ui.find('ProviderReviewStep').values, complete);
  assert.equal(ui.find('ProviderReviewStep').saving, false);
  await ui.find('ProviderReviewStep').onSubmit();
  assert.equal(app.writes().length, 2);
  assert.deepEqual(Object.fromEntries(app.writes()[0].payload.entries()), Object.fromEntries(app.writes()[1].payload.entries()));
  assert.ok(app.render().find('ProviderApplicationStatus'));
});

test('cliques concorrentes no envio produzem apenas um POST', async () => {
  let finish;
  const app = setup({ post: () => new Promise(resolve => { finish = resolve; }) });
  const ui = await fill(app);
  const first = ui.find('ProviderReviewStep').onSubmit();
  await ui.find('ProviderReviewStep').onSubmit();
  assert.equal(app.writes().length, 1);
  assert.equal(app.render().find('ProviderReviewStep').saving, true);
  finish({ data: { id: 7, perfilUsuarioId: 'user', status: 'pendente', ...expected } });
  await first;
  assert.ok(app.render().find('ProviderApplicationStatus'));
});

test('cadastro existente e falha na consulta inicial não permitem criar duplicata', async () => {
  const existing = setup({ existing: { id: 7, perfilUsuarioId: 'user', status: 'pendente', ...expected } });
  assert.ok((await existing.init()).find('ProviderApplicationStatus'));
  assert.equal(existing.render().find('ProviderDataStep'), undefined);
  assert.deepEqual(existing.writes(), []);
  const failed = setup({ failLoad: true });
  assert.ok((await failed.init()).button('Tentar novamente'));
  assert.equal(failed.render().find('ProviderReviewStep'), undefined);
  assert.deepEqual(failed.writes(), []);
});

const webPhoto = () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'estabelecimento.png', { type: 'image/png' });
  return { uri: 'blob:foto', file, fileName: file.name, mimeType: file.type, fileSize: file.size };
};

test('foto web persiste entre etapas e vai no mesmo multipart como arquivo', async () => {
  const photo = webPhoto();
  const app = setup({ picker: async () => ({ canceled: false, assets: [photo] }) });
  const ui = await app.init();
  await ui.find('ProviderDataStep').onSelectPhoto();
  assert.equal(app.render().find('ProviderDataStep').photo, photo);
  app.render().find('ProviderDataStep').onChange({ nomeEstab: 'Studio' });
  app.render().button('Revisão').onPress();
  assert.equal(app.render().find('ProviderReviewStep').photo, photo);
  assert.deepEqual(app.writes(), []);
  await app.render().find('ProviderReviewStep').onSubmit();
  const form = app.writes()[0].payload;
  assert.equal(app.writes().length, 1);
  assert.deepEqual([...form.keys()], ['nomeEstab', 'arquivo']);
  assert.equal(form.get('nomeEstab'), 'Studio');
  assert.equal(form.get('arquivo').name, 'estabelecimento.png');
  assert.equal(form.get('arquivo').type, 'image/png');
  assert.equal(form.get('arquivo').size, photo.file.size);
  assert.equal(form.has('fotoUrl'), false);
});

test('cancelar mantém foto anterior, remover exclui a foto e arquivo inválido não é selecionado', async () => {
  const photo = webPhoto();
  let selection = { canceled: false, assets: [photo] };
  const app = setup({ picker: async () => selection });
  await app.init();
  await app.render().find('ProviderDataStep').onSelectPhoto();
  selection = { canceled: true, assets: [] };
  await app.render().find('ProviderDataStep').onSelectPhoto();
  assert.equal(app.render().find('ProviderDataStep').photo, photo);
  selection = { canceled: false, assets: [{ ...photo, file: new File(['bad'], 'bad.gif', { type: 'image/gif' }) }] };
  await app.render().find('ProviderDataStep').onSelectPhoto();
  assert.equal(app.render().find('ProviderDataStep').photo, photo);
  app.render().find('ProviderDataStep').onRemovePhoto();
  assert.equal(app.render().find('ProviderDataStep').photo, undefined);
  assert.deepEqual(app.writes(), []);
});

test('foto nativa usa uri, nome e MIME no campo arquivo; permissão negada não abre galeria', async () => {
  let opened = false;
  const denied = setup({ platform: 'android', permission: false, picker: async () => { opened = true; } });
  await denied.init();
  await denied.render().find('ProviderDataStep').onSelectPhoto();
  assert.equal(opened, false);
  const app = setup({ platform: 'android' });
  const original = globalThis.FormData;
  class NativeFormData {
    constructor() { this.parts = []; }
    append(key, value) { this.parts.push([key, value]); }
    entries() { return this.parts.values(); }
  }
  try {
    globalThis.FormData = NativeFormData;
    await app.service.criarPerfilPrestador({ nomeEstab: 'Studio' }, {
      uri: 'file:///foto.webp', mimeType: 'image/webp', fileSize: 100,
    });
    assert.deepEqual(app.writes()[0].payload.parts, [
      ['nomeEstab', 'Studio'],
      ['arquivo', { uri: 'file:///foto.webp', name: 'perfil.webp', type: 'image/webp' }],
    ]);
  } finally {
    globalThis.FormData = original;
  }
});

test('arquivo acima de 5 MiB é recusado antes do POST e foto permanece após falha de rede', async () => {
  const oversized = { ...webPhoto(), file: new File([new Uint8Array(5242881)], 'grande.png', { type: 'image/png' }) };
  const invalid = setup();
  await assert.rejects(invalid.service.criarPerfilPrestador({ nomeEstab: 'Studio' }, oversized), /5 MiB/);
  assert.deepEqual(invalid.writes(), []);
  const photo = webPhoto();
  const app = setup({ picker: async () => ({ canceled: false, assets: [photo] }), post: async () => { throw new Error('Falha de rede'); } });
  await app.init();
  await app.render().find('ProviderDataStep').onSelectPhoto();
  app.render().find('ProviderDataStep').onChange({ nomeEstab: 'Studio' });
  app.render().button('Revisão').onPress();
  await app.render().find('ProviderReviewStep').onSubmit();
  assert.equal(app.render().find('ProviderReviewStep').photo, photo);
  assert.equal(app.render().find('ProviderReviewStep').saving, false);
});

test('atualização de perfil mantém o envio multipart existente com o helper compartilhado', async () => {
  const app = setup();
  const photo = webPhoto();
  await app.profileService.updateMyProfile({ telefone: '84999999999', foto: photo });
  assert.equal(app.writes().length, 1);
  assert.equal(app.writes()[0].method, 'PUT');
  assert.equal(app.writes()[0].url, '/perfis/eu');
  const form = app.writes()[0].payload;
  assert.equal(form.get('numeroTelefone'), '84999999999');
  assert.equal(form.get('arquivo').name, photo.file.name);
  assert.equal(form.get('arquivo').size, photo.file.size);
});
