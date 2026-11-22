const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const id = '11111111-1111-4111-8111-111111111111';
const localId = '22222222-2222-4222-8222-222222222222';
const identidade = { id, nome: 'Ana', sobrenome: 'Silva', email: 'ana@example.com' };
const dados = { nome: ' Ana ', sobrenome: ' Silva ', email: ' ana@example.com ' };

function preparar({ falha, trocaSessao = false } = {}) {
  const chamadas = [];
  let versao = 1;
  const api = {
    async get(url) {
      chamadas.push({ metodo: 'GET', url });
      return { data: url.endsWith('/identidade') ? identidade : {
        id: localId, keycloakId: id, numeroTelefone: '84999998888', fotoUrl: null,
      } };
    },
    async put(url, payload) {
      chamadas.push({ metodo: 'PUT', url, payload });
      if (falha === 'conflito') throw { response: { status: 409 } };
      if (falha === 'perfil' && url === '/perfis/eu') throw { response: { status: 503 } };
      if (trocaSessao) versao++;
      return { data: {} };
    },
  };
  function carregar(nome) {
    const arquivo = path.resolve(__dirname, '../src/services', `${nome}.ts`);
    const modulo = new Module(arquivo, module);
    modulo.filename = arquivo;
    modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
    const original = modulo.require.bind(modulo);
    modulo.require = nome => {
      if (nome === 'react-native') return { Platform: { OS: 'web' } };
      if (nome === './api') return { __esModule: true, default: api };
      return original(nome);
    };
    modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText, arquivo);
    return modulo.exports;
  }
  return { chamadas, servico: carregar('profileService'), normalizar: carregar('identity').normalizeProfile,
    verificarSessao() { if (versao !== 1) throw new Error('Sessão encerrada'); } };
}

test('perfil usa identidade atual mesmo com token antigo e preserva IDs e papel', async () => {
  const app = preparar();
  const perfil = await app.servico.getMyProfile();
  const token = `x.${Buffer.from(JSON.stringify({ sub: id, name: 'Nome antigo', email: 'antigo@example.com',
    realm_access: { roles: ['PROVIDER'] } })).toString('base64url')}.x`;
  const usuario = app.normalizar(perfil, token);
  assert.equal(usuario.nome, 'Ana Silva');
  assert.equal(usuario.primeiroNome, 'Ana');
  assert.equal(usuario.sobrenome, 'Silva');
  assert.equal(usuario.email, 'ana@example.com');
  assert.equal(usuario.id, localId);
  assert.equal(usuario.tipo_usuario, 'prestador');
  assert.throws(() => app.normalizar({ ...perfil, identidade: { ...identidade, id: localId } }, token), /identidade incompatível/);
});

test('edição de identidade usa rota própria e não altera foto ou telefone', async () => {
  const app = preparar();
  const perfil = await app.servico.updateMyProfile({ identidade: dados });
  assert.deepEqual(app.chamadas.filter(c => c.metodo === 'PUT'), [
    { metodo: 'PUT', url: '/perfis/eu/identidade', payload: { nome: 'Ana', sobrenome: 'Silva', email: 'ana@example.com' } },
  ]);
  assert.equal(perfil.identidade.nome, 'Ana');
  assert.equal(perfil.numeroTelefone, '84999998888');
});

test('edição só de telefone preserva a identidade sem enviar alteração a ela', async () => {
  const app = preparar();
  await app.servico.updateMyProfile({ telefone: '84999997777' });
  const puts = app.chamadas.filter(c => c.metodo === 'PUT');
  assert.equal(puts.length, 1);
  assert.equal(puts[0].url, '/perfis/eu');
  assert.equal(puts[0].payload.get('numeroTelefone'), '84999997777');
});

test('dados inválidos e foto inválida são recusados antes de salvar identidade', async () => {
  const app = preparar();
  await assert.rejects(app.servico.updateMyProfile({ identidade: { ...dados, email: 'invalido' } }), /válidos/);
  await assert.rejects(app.servico.updateMyProfile({ identidade: dados, foto: { uri: 'foto' } }), /formato/);
  assert.equal(app.chamadas.length, 0);
});

test('conflito de e-mail impede envio dos demais dados e tem mensagem compreensível', async () => {
  const app = preparar({ falha: 'conflito' });
  await assert.rejects(app.servico.updateMyProfile({ identidade: dados, telefone: '123' }), erro => {
    assert.match(app.servico.getProfileErrorMessage(erro, 'erro'), /e-mail já está em uso/);
    return true;
  });
  assert.equal(app.chamadas.length, 1);
});

test('falha após salvar identidade informa atualização parcial', async () => {
  const app = preparar({ falha: 'perfil' });
  await assert.rejects(app.servico.updateMyProfile({ identidade: dados, telefone: '123' }), /Nome e e-mail foram salvos/);
  assert.equal(app.chamadas.filter(c => c.metodo === 'PUT').length, 2);
});

test('troca de sessão durante salvamento impede escrever o restante em outra conta', async () => {
  const app = preparar({ trocaSessao: true });
  await assert.rejects(app.servico.updateMyProfile({ identidade: dados, telefone: '123' }, app.verificarSessao));
  assert.equal(app.chamadas.length, 1);
});

function prepararFormulario(appearance, falha) {
  const estados = [], efeitos = [], salvos = [];
  let cursor = 0;
  const react = {
    useState(inicial) { const i = cursor++; if (!(i in estados)) estados[i] = inicial;
      return [estados[i], valor => { estados[i] = valor; }]; },
    useRef(inicial) { const i = cursor++; if (!(i in estados)) estados[i] = { current: inicial }; return estados[i]; },
    useEffect(fn, deps) { const i = cursor++;
      if (!estados[i] || deps.some((d, j) => d !== estados[i][j])) { estados[i] = deps; efeitos.push(fn); } },
  };
  const arquivo = path.resolve(__dirname, '../src/components/profile/ProfileEditModal.tsx');
  const modulo = new Module(arquivo, module);
  modulo.filename = arquivo; modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
  const original = modulo.require.bind(modulo);
  modulo.require = nome => {
    if (nome === 'react') return react;
    if (nome === 'react-native') return { Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
      Platform: { OS: 'web' }, StyleSheet: { create: v => v }, useWindowDimensions: () => ({ width: 375, height: 812 }) };
    if (nome === 'expo-image-picker') return {};
    if (nome === '../Button') return { Button: 'Button' };
    if (nome === '../Input') return { Input: 'Input' };
    if (nome.includes('profileService')) return preparar().servico;
    if (nome.includes('/styles/')) {
      const fonte = path.resolve(path.dirname(arquivo), nome + '.ts');
      const estilo = new Module(fonte, modulo); estilo.filename = fonte;
      estilo.require = modulo.require;
      estilo._compile(ts.transpileModule(fs.readFileSync(fonte, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, fonte);
      return estilo.exports;
    }
    return original(nome);
  };
  modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, arquivo);
  function nos() {
    cursor = 0;
    const arvore = modulo.exports.ProfileEditModal({ visible: true, appearance,
      profile: { primeiroNome: 'Ana', sobrenome: 'Silva', email: 'ana@example.com', telefone: '123' },
      onClose() {}, async onSave(payload) { if (falha) throw { response: { status: falha } }; salvos.push(payload); },
    });
    efeitos.splice(0).forEach(fn => fn());
    const lista = [];
    function visitar(no) { if (!no || typeof no !== 'object') return;
      if (Array.isArray(no)) return no.forEach(visitar);
      lista.push(no); visitar(no.props?.children); }
    visitar(arvore); return lista;
  }
  nos();
  return { salvos, campo: label => nos().find(n => n.type === 'Input' && n.props.label === label).props,
    salvar: () => nos().find(n => n.type === 'Button' && n.props.title === 'Salvar').props.onPress(),
    textos: () => nos().filter(n => n.type === 'Text').flatMap(n => n.props.children) };
}

for (const appearance of ['default', 'customer']) {
  test(`formulário ${appearance} permite editar identidade no layout existente`, async () => {
    const app = prepararFormulario(appearance);
    app.campo('Nome').onChangeText(' Maria ');
    app.campo('Sobrenome').onChangeText(' Souza ');
    app.campo('E-mail').onChangeText(' maria@example.com ');
    await app.salvar();
    assert.deepEqual(app.salvos[0].identidade, { nome: 'Maria', sobrenome: 'Souza', email: 'maria@example.com' });
    assert.equal(app.salvos[0].telefone, undefined);
  });
}

test('formulário mantém edição aberta e explica conflito de e-mail', async () => {
  const app = prepararFormulario('customer', 409);
  app.campo('E-mail').onChangeText('outro@example.com');
  await app.salvar();
  assert.equal(app.salvos.length, 0);
  assert.ok(app.textos().includes('Este e-mail já está em uso. Escolha outro e tente novamente.'));
});
