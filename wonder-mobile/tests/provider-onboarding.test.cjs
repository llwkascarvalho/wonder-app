const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const axios = require('axios');

function setup({ existing = null, initialServices = [], initialSchedules = [], picker, navigation } = {}) {
  const states = [], calls = [], effects = [];
  let cursor = 0, mounted = false, nextService = 10, nextSchedule = 20, currentProfile = existing;
  const api = {
    get: async (url) => {
      calls.push({ method: 'GET', url });
      if (url === '/catalogo/prestadores/me') {
        if (currentProfile) return { data: currentProfile };
        throw new axios.AxiosError('Não encontrado', undefined, undefined, undefined, { status: 404 });
      }
      if (url === '/catalogo/categorias') return { data: [{ id: 1, nome: 'Barba', status: 'ativa' }] };
      if (url === '/catalogo/prestadores/me/servicos') return { data: initialServices };
      if (url === '/catalogo/prestadores/me/horarios') return { data: initialSchedules };
      throw new Error(`GET inesperado: ${url}`);
    },
    post: async (url, payload) => {
      calls.push({ method: 'POST', url, payload });
      if (url === '/catalogo/prestadores') {
        currentProfile = {
        id: 7, perfilUsuarioId: 'user', status: 'pendente', ativo: false,
        fotoUrl: '/catalogo/prestadores/7/foto', enviado_em: null,
        motivo_rejeicao: null, ...Object.fromEntries(payload.entries()),
        };
        return { data: currentProfile };
      }
      if (url.endsWith('/servicos')) return { data: { id: nextService++, prestador_id: 7, ...payload } };
      if (url.endsWith('/horarios')) return { data: { id: nextSchedule++, prestador_id: 7, ...payload } };
      if (url.endsWith('/horarios/lote')) return { data: payload.map((item) => ({ id: nextSchedule++, prestador_id: 7, ...item })) };
      if (url.endsWith('/enviar-aprovacao')) {
        currentProfile = { ...currentProfile, status: 'pendente', enviado_em: '2026-11-15T12:00:00', motivo_rejeicao: null };
        return { data: currentProfile };
      }
      if (url.endsWith('/foto')) {
        currentProfile = { ...currentProfile, fotoUrl: url };
        return { data: currentProfile };
      }
      throw new Error(`POST inesperado: ${url}`);
    },
    put: async (url, payload) => {
      calls.push({ method: 'PUT', url, payload });
      if (url.includes('/servicos/')) return { data: { id: Number(url.split('/').at(-1)), prestador_id: 7, ...payload } };
      currentProfile = { ...currentProfile, ...payload, status: currentProfile?.status || 'rascunho' };
      return { data: currentProfile };
    },
    delete: async (url) => { calls.push({ method: 'DELETE', url }); return { data: null }; },
  };
  const mocks = {
    '@react-navigation/native': { useFocusEffect: () => {} },
    '@expo/vector-icons': { MaterialIcons: 'MaterialIcons' },
    react: {
      useState: (initial) => { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], (v) => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; },
      useRef: (initial) => { const i = cursor++; if (!(i in states)) states[i] = { current: initial }; return states[i]; },
      useCallback: (fn) => fn, useMemo: (fn) => fn(), useEffect: (fn) => { if (!mounted) effects.push(fn); },
    },
    'expo-image-picker': {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: picker || (async () => ({ canceled: true, assets: [] })),
    },
    'react-native': { Modal: 'Modal', Platform: { OS: 'web' }, Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View', Text: 'Text', useWindowDimensions: () => ({ width: 375, height: 812 }), StyleSheet: { create: (v) => v } },
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = new Module(filename, module); cache.set(filename, loaded);
    loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    const originalRequire = loaded.require.bind(loaded);
    loaded.require = (id) => {
      if (id in mocks) return mocks[id];
      if (id === './api') return { __esModule: true, api, default: api };
      if (id.startsWith('../components/')) { const name = id.split('/').at(-1); return { [name]: name }; }
      if (id.startsWith('.')) { const target = path.resolve(path.dirname(filename), id); return load(fs.existsSync(target) ? target : `${target}.ts`); }
      return originalRequire(id);
    };
    loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, filename);
    return loaded.exports;
  }
  const { ProviderOnboardingScreen } = load(path.resolve(__dirname, '../src/screens/ProviderOnboardingScreen.tsx'));
  function render() {
    cursor = 0; const root = ProviderOnboardingScreen({ navigation }); mounted = true; const nodes = [];
    function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); nodes.push(node); walk(node.props?.children); }
    walk(root);
    return { find: (type) => nodes.find((node) => node.type === type)?.props,
      button: (title) => nodes.find((node) =>
        (node.type === 'Button' && node.props.title === title) ||
        (node.type === 'Pressable' && node.props.accessibilityLabel === title))?.props };
  }
  return { calls, render, utils: load(path.resolve(__dirname, '../src/utils/providerRegistration.ts')),
    async init() { render(); effects.forEach((effect) => effect()); await new Promise((resolve) => setImmediate(resolve)); return render(); } };
}

const complete = { nomeEstab: 'Studio Wonder', documento: '', endereco: 'Rua das Flores', numero: '10', bairro: 'Centro', cidade: 'Natal', estado: 'RN', complemento: '' };

async function fillIdentity(app) {
  await app.init();
  app.render().find('ProviderDataStep').onChange({ nomeEstab: complete.nomeEstab, documento: '' });
  await app.render().button('Avançar').onPress();
  app.render().find('ProviderAddressStep').onChange({ endereco: complete.endereco, numero: complete.numero, bairro: complete.bairro, cidade: complete.cidade, estado: complete.estado, complemento: '' });
  await app.render().button('Avançar').onPress();
}

async function fillResources(app) {
  await app.render().find('ProviderServicesStep').onSave({ nome: 'Corte', preco: 30, duracao_min: 30, categoria_id: 1 });
  await app.render().button('Avançar').onPress();
  await app.render().find('ProviderSchedulesStep').onCreate([
    { dia_semana: 1, hora_inicio: '08:00', hora_fim: '12:00' },
    { dia_semana: 1, hora_inicio: '13:00', hora_fim: '17:00' },
  ]);
  await app.render().button('Avançar').onPress();
}

test('documento é opcional e endereço obrigatório é validado', () => {
  const app = setup();
  const errors = app.utils.validateProviderRegistration({ ...app.utils.emptyProviderDraft, nomeEstab: 'Studio' });
  assert.equal(errors.documento, undefined);
  for (const field of ['endereco', 'numero', 'bairro', 'cidade', 'estado']) assert.ok(errors[field]);
  assert.equal(errors.complemento, undefined);
});

test('não exibe erros da próxima etapa antes da tentativa de avançar', async () => {
  const app = setup();
  let ui = await app.init();
  assert.deepEqual(ui.find('ProviderDataStep').errors, {});

  ui.find('ProviderDataStep').onChange({ nomeEstab: complete.nomeEstab, documento: '' });
  await app.render().button('Avançar').onPress();

  ui = app.render();
  assert.deepEqual(ui.find('ProviderAddressStep').errors, {});
});

test('cadastro inicial permanece pendente e recebe serviço e horário antes da revisão', async () => {
  const app = setup(); await fillIdentity(app);
  assert.ok(app.calls.find((call) => call.url === '/catalogo/prestadores'));
  assert.ok(app.render().find('ProviderServicesStep'));
  await fillResources(app);
  assert.equal(app.calls.find((call) => call.url.endsWith('/horarios/lote')).payload.length, 2);
  const review = app.render().find('ProviderReviewStep');
  assert.deepEqual(review.validationErrors, []);
  await review.onSubmit();
  await app.render().button('Confirmar envio').onPress();
  assert.equal(app.calls.some((call) => call.url.endsWith('/enviar-aprovacao')), true);
  assert.equal(app.render().find('ProviderApplicationStatus').profile.status, 'pendente');
  assert.ok(app.render().find('ProviderApplicationStatus').profile.enviado_em);
});

test('não avança sem serviço nem horário', async () => {
  const app = setup(); await fillIdentity(app);
  await app.render().button('Avançar').onPress();
  assert.ok(app.render().find('ProviderServicesStep'));
  await app.render().find('ProviderServicesStep').onSave({ nome: 'Corte', preco: 30, duracao_min: 30, categoria_id: 1 });
  await app.render().button('Avançar').onPress();
  await app.render().button('Avançar').onPress();
  assert.ok(app.render().find('ProviderSchedulesStep'));
});

test('correção preserva foto e dados, carrega recursos e reenvia sem novo cadastro', async () => {
  const existing = { id: 7, perfilUsuarioId: 'user', nomeEstab: 'Studio', documento: null, endereco: 'Rua', numero: '1', bairro: 'Centro', cidade: 'Natal', estado: 'RN', complemento: null, status: 'rascunho', motivo_rejeicao: 'Ajuste o horário', fotoUrl: '/catalogo/prestadores/7/foto' };
  const app = setup({ existing,
    initialServices: [{ id: 10, prestador_id: 7, nome: 'Corte', preco: 30, duracao_min: 30, categoria_id: 1 }],
    initialSchedules: [{ id: 20, prestador_id: 7, dia_semana: 1, hora_inicio: '08:00', hora_fim: '12:00' }] });
  let ui = await app.init(); await ui.find('ProviderApplicationStatus').onContinue(); ui = app.render();
  assert.equal(ui.find('ProviderDataStep').existingPhotoUrl, '/catalogo/prestadores/7/foto');
  assert.equal(ui.find('ProviderDataStep').values.endereco, 'Rua');
  ui.find('ProviderDataStep').onChange({ nomeEstab: 'Studio corrigido' });
  for (let i = 0; i < 4; i++) await app.render().button('Avançar').onPress();
  await app.render().find('ProviderReviewStep').onSubmit();
  await app.render().button('Reenviar').onPress();
  assert.deepEqual(app.calls.filter((call) => call.method !== 'GET').map((call) => call.url), ['/catalogo/prestadores/7', '/catalogo/prestadores/7/enviar-aprovacao']);
});

test('foto selecionada é enviada junto ao cadastro pendente', async () => {
  const file = new File([new Uint8Array([1, 2])], 'studio.png', { type: 'image/png' });
  const photo = { uri: 'blob:foto', file, fileName: file.name, mimeType: file.type, fileSize: file.size };
  const app = setup({ picker: async () => ({ canceled: false, assets: [photo] }) });
  await app.init(); await app.render().find('ProviderDataStep').onSelectPhoto();
  app.render().find('ProviderDataStep').onChange({ nomeEstab: complete.nomeEstab });
  await app.render().button('Avançar').onPress(); app.render().find('ProviderAddressStep').onChange(complete);
  await app.render().button('Avançar').onPress();
  assert.equal(app.calls.find((call) => call.url === '/catalogo/prestadores').payload.get('arquivo').name, 'studio.png');
});

test('é possível voltar ao perfil', async () => {
  let returns = 0; const app = setup({ navigation: { goBack: () => { returns += 1; } } });
  (await app.init()).button('Voltar').onPress(); assert.equal(returns, 1);
});

test('cadastro pendente ainda não enviado retoma serviços e horários', async () => {
  const existing = { id: 7, perfilUsuarioId: 'user', nomeEstab: 'Studio', documento: null,
    endereco: 'Rua', numero: '1', bairro: 'Centro', cidade: 'Natal', estado: 'RN',
    status: 'pendente', fotoUrl: '/catalogo/prestadores/7/foto' };
  const app = setup({ existing });
  let ui = await app.init();
  assert.ok(ui.find('ProviderServicesStep'));
  assert.equal(ui.find('ProviderDataStep'), undefined);
});

test('cadastro pendente enviado permite somente visualizar a solicitação', async () => {
  const existing = { id: 7, perfilUsuarioId: 'user', nomeEstab: 'Studio', documento: null,
    endereco: 'Rua', numero: '1', bairro: 'Centro', cidade: 'Natal', estado: 'RN',
    status: 'pendente', enviado_em: '2026-11-15T12:00:00', fotoUrl: '/catalogo/prestadores/7/foto' };
  const app = setup({ existing,
    initialServices: [{ id: 10, prestador_id: 7, nome: 'Corte', preco: 30, duracao_min: 30, categoria_id: 1 }],
    initialSchedules: [{ id: 20, prestador_id: 7, dia_semana: 1, hora_inicio: '08:00', hora_fim: '12:00' }] });

  let ui = await app.init();
  assert.equal(ui.find('ProviderApplicationStatus').profile.enviado_em, '2026-11-15T12:00:00');
  await ui.find('ProviderApplicationStatus').onContinue();
  ui = app.render();
  assert.equal(ui.find('ProviderReviewStep').readOnly, true);
  assert.equal(ui.find('ProviderServicesStep'), undefined);
  assert.equal(ui.find('ProviderSchedulesStep'), undefined);
});
