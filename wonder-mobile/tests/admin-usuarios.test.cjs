const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function preparar({ ativo = true, proprio = false, falha } = {}) {
  const estados = [], efeitos = [], requisicoes = [];
  let cursor = 0, alterou, arvore;
  let pessoa = { id: 'usuario-teste', username: 'login-preservado', nome: 'Maria', sobrenome: 'Silva',
    email: 'maria@example.com', ativo };
  const iguais = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(inicial) {
      const i = cursor++;
      if (!(i in estados)) estados[i] = inicial;
      return [estados[i], valor => {
        const proximo = typeof valor === 'function' ? valor(estados[i]) : valor;
        if (!Object.is(proximo, estados[i])) { estados[i] = proximo; alterou = true; }
      }];
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!iguais(estados[i]?.deps, deps)) estados[i] = { deps, valor: fn() };
      return estados[i].valor;
    },
    useRef(valor) { return react.useMemo(() => ({ current: valor }), []); },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!iguais(estados[i], deps)) { estados[i] = deps; efeitos.push(fn); }
    },
  };
  const api = {
    async get(url, opcoes) {
      requisicoes.push({ metodo: 'GET', url, opcoes });
      return { data: url === '/admin/usuarios'
        ? { usuarios: [{ ...pessoa }], inicio: opcoes.params.inicio, limite: 20, temProxima: true } : { ...pessoa } };
    },
    async put(url, dados) {
      requisicoes.push({ metodo: 'PUT', url, dados });
      if (falha) throw { response: { status: falha } };
      pessoa = { ...pessoa, ...dados };
      return { data: { ...pessoa } };
    },
    async patch(url, dados) {
      requisicoes.push({ metodo: 'PATCH', url, dados });
      if (falha) throw { response: { status: falha } };
      pessoa = { ...pessoa, ...dados };
      return { data: { ...pessoa } };
    },
  };
  const cache = new Map();
  function carregar(arquivo) {
    if (cache.has(arquivo)) return cache.get(arquivo).exports;
    const modulo = new Module(arquivo, module);
    modulo.filename = arquivo;
    modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
    cache.set(arquivo, modulo);
    const original = modulo.require.bind(modulo);
    modulo.require = id => {
      if (id === 'react') return react;
      if (id === 'react-native') return { Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
        Platform: { OS: 'web' }, StyleSheet: { create: v => v } };
      if (id === '@react-navigation/native') return { useNavigation: () => ({ goBack() {} }) };
      if (id.endsWith('/AuthContext')) return { useAuth: () => ({ usuario: { keycloakId: proprio ? pessoa.id : 'admin' } }) };
      if (id.includes('/components/')) { const nome = id.split('/').at(-1); return { [nome]: nome }; }
      if (id === './api') return { api };
      if (id === './profileService') return { appendImageFile() {} };
      if (id.startsWith('.')) return carregar(path.resolve(path.dirname(arquivo), `${id}.ts`));
      return original(id);
    };
    modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    } }).outputText, arquivo);
    return modulo.exports;
  }
  const { AdminUsersScreen } = carregar(path.resolve(__dirname, '../src/screens/admin/AdminUsersScreen.tsx'));
  function renderizar() {
    let n = 0;
    do {
      assert.ok(++n < 20, 'Renderização estabiliza');
      cursor = 0; alterou = false; arvore = AdminUsersScreen();
      efeitos.splice(0).forEach(fn => fn());
    } while (alterou);
  }
  function nos() {
    renderizar();
    const lista = [];
    function visitar(no) {
      if (!no || typeof no !== 'object') return;
      if (Array.isArray(no)) return no.forEach(visitar);
      if (no.type === 'Modal' && !no.props.visible) return;
      if (typeof no.type === 'function') return visitar(no.type(no.props));
      lista.push(no); visitar(no.props?.children);
    }
    visitar(arvore); return lista;
  }
  const app = {
    requisicoes,
    async estabilizar() { renderizar(); await new Promise(resolve => setImmediate(resolve)); renderizar(); },
    botoes: () => nos().filter(no => no.type === 'Button').map(no => no.props),
    textos: () => nos().filter(no => no.type === 'Text').flatMap(no => no.props.children),
    campo: label => nos().find(no => no.type === 'Input' && no.props.label === label).props,
    async clicar(titulo) {
      const botao = app.botoes().find(b => b.title === titulo);
      assert.ok(botao && !botao.disabled, `Botão ${titulo} disponível`);
      await botao.onPress(); await app.estabilizar();
    },
  };
  return app;
}

test('admin edita identidade sem alterar username ou status e atualiza a tela somente após sucesso', async () => {
  const app = preparar(); await app.estabilizar(); await app.clicar('Ver e editar');
  app.campo('Nome').onChangeText(' Ana ');
  app.campo('Sobrenome').onChangeText(' Souza ');
  app.campo('E-mail').onChangeText(' ana@example.com ');
  await app.clicar('Salvar dados');
  assert.deepEqual(app.requisicoes.at(-1), { metodo: 'PUT', url: '/admin/usuarios/usuario-teste',
    dados: { nome: 'Ana', sobrenome: 'Souza', email: 'ana@example.com' } });
  assert.ok(app.textos().includes('Dados atualizados.'));
  assert.ok(app.textos().includes('login-preservado'));
});

test('desativação exige confirmação e usa status, sem exclusão física', async () => {
  const app = preparar(); await app.estabilizar(); await app.clicar('Ver e editar');
  await app.clicar('Desativar conta');
  assert.equal(app.requisicoes.some(r => r.metodo === 'PATCH'), false);
  await app.clicar('Confirmar desativação');
  assert.deepEqual(app.requisicoes.at(-1), { metodo: 'PATCH', url: '/admin/usuarios/usuario-teste/status', dados: { ativo: false } });
  assert.ok(app.textos().includes('Conta desativada e sessões encerradas.'));
  assert.ok(app.botoes().some(b => b.title === 'Reativar conta'));
});

test('reativação envia ativo true e auto desativação não é oferecida', async () => {
  const app = preparar({ ativo: false }); await app.estabilizar(); await app.clicar('Ver e editar');
  await app.clicar('Reativar conta'); await app.clicar('Confirmar reativação');
  assert.deepEqual(app.requisicoes.at(-1).dados, { ativo: true });
  const proprio = preparar({ proprio: true }); await proprio.estabilizar(); await proprio.clicar('Ver e editar');
  assert.ok(!proprio.botoes().some(b => b.title === 'Desativar conta'));
});

test('falha parcial ou Keycloak indisponível não exibe sucesso nem inativa a linha localmente', async () => {
  const app = preparar({ falha: 503 }); await app.estabilizar(); await app.clicar('Ver e editar');
  await app.clicar('Desativar conta'); await app.clicar('Confirmar desativação');
  assert.ok(app.textos().some(t => typeof t === 'string' && t.includes('antes de tentar novamente')));
  assert.ok(!app.textos().includes('Conta desativada e sessões encerradas.'));
  assert.ok(app.textos().includes('Ativo'));
});

test('nome obrigatório é validado e e-mail duplicado mantém a edição aberta', async () => {
  const app = preparar({ falha: 409 }); await app.estabilizar(); await app.clicar('Ver e editar');
  app.campo('Nome').onChangeText(' '); await app.clicar('Salvar dados');
  assert.equal(app.requisicoes.some(r => r.metodo === 'PUT'), false);
  app.campo('Nome').onChangeText('Ana'); await app.clicar('Salvar dados');
  assert.ok(app.textos().includes('Este e-mail já está em uso ou a alteração não é permitida.'));
  assert.ok(app.botoes().some(b => b.title === 'Salvar dados'));
});

test('busca e paginação são enviadas ao backend', async () => {
  const app = preparar(); await app.estabilizar(); await app.clicar('Próxima');
  assert.equal(app.requisicoes.at(-1).opcoes.params.inicio, 20);
  app.campo('Buscar por nome, usuário ou e-mail').onChangeText(' Maria '); await app.clicar('Buscar');
  assert.deepEqual(app.requisicoes.at(-1).opcoes.params, { busca: 'Maria', inicio: 0, limite: 20 });
});
