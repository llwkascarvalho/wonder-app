const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Executa tela e serviço reais com hooks, componentes nativos e HTTP simulados.
function prepararAgenda(statusInicial) {
  const estados = [];
  const efeitos = [];
  const requisicoes = [];
  const alertas = [];
  const mutacoes = [];
  const usuario = { id: 'prestador-teste', email: 'teste@example.test' };
  let agendamentos = [{ id: 11, cliente_id: 'cliente-teste', prestador_id: 7,
    servico_id: 3, inicio: '2099-01-05T09:00:00', status: statusInicial }];
  let cursor = 0;
  let alterou = false;
  let arvore;
  const iguais = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(inicial) {
      const indice = cursor++;
      if (!(indice in estados)) estados[indice] = typeof inicial === 'function' ? inicial() : inicial;
      return [estados[indice], valor => {
        const proximo = typeof valor === 'function' ? valor(estados[indice]) : valor;
        if (!Object.is(proximo, estados[indice])) { estados[indice] = proximo; alterou = true; }
      }];
    },
    useMemo(calcular, deps) {
      const indice = cursor++;
      if (!iguais(estados[indice]?.deps, deps)) estados[indice] = { deps, valor: calcular() };
      return estados[indice].valor;
    },
    useCallback(funcao, deps) { return react.useMemo(() => funcao, deps); },
    useEffect(executar, deps) {
      const indice = cursor++;
      if (!iguais(estados[indice], deps)) { estados[indice] = deps; efeitos.push(executar); }
    },
  };
  const api = {
    async get(url, opcoes) {
      requisicoes.push({ metodo: 'GET', url, opcoes });
      if (url === '/agendamentos') return { data: agendamentos.map(item => ({ ...item })) };
      if (url === '/catalogo/prestadores/me') return { data: { id: 7, nomeEstab: 'Studio teste' } };
      if (url === '/catalogo/prestadores/7/servicos') return { data: [{ id: 3, nome: 'Corte' }] };
      throw new Error(`Consulta inesperada: ${url}`);
    },
    patch(url, dados) {
      requisicoes.push({ metodo: 'PATCH', url, dados });
      return new Promise((resolve, reject) => mutacoes.push({
        resolver() {
          agendamentos = agendamentos.map(item => ({ ...item, status: dados.status }));
          resolve({ data: agendamentos[0] });
        },
        rejeitar: reject,
      }));
    },
  };
  const cache = new Map();
  function carregar(arquivo) {
    if (cache.has(arquivo)) return cache.get(arquivo).exports;
    const modulo = new Module(arquivo, module);
    modulo.filename = arquivo;
    modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
    cache.set(arquivo, modulo);
    const requireOriginal = modulo.require.bind(modulo);
    modulo.require = id => {
      if (id === 'react') return react;
      if (id === 'react-native') return { Alert: { alert: (...dados) => alertas.push(dados) },
        Image: 'Image', Modal: 'Modal', Pressable: 'Pressable', RefreshControl: 'RefreshControl',
        ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View',
        StyleSheet: { create: valor => valor } };
      if (id === '../contexts/AuthContext') return { useAuth: () => ({ usuario, signOut() {} }) };
      if (id === '../services/profileService') return { resolveProfilePhotoUrl: () => null };
      if (id === './api') return { __esModule: true, default: api, api };
      if (id.startsWith('../components/')) {
        const nome = id.split('/').at(-1);
        return { [nome]: nome, getCurrentMonthKey: () => '2099-01' };
      }
      if (id.startsWith('.')) return carregar(path.resolve(path.dirname(arquivo), `${id}.ts`));
      return requireOriginal(id);
    };
    modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, arquivo);
    return modulo.exports;
  }
  const { ProviderAgendaScreen } = carregar(path.resolve(__dirname, '../src/screens/ProviderAgendaScreen.tsx'));
  function renderizar() {
    let rodadas = 0;
    do {
      assert.ok(++rodadas < 20, 'Renderização deve estabilizar');
      cursor = 0;
      alterou = false;
      arvore = ProviderAgendaScreen();
      efeitos.splice(0).forEach(efeito => efeito());
    } while (alterou);
  }
  function nos() {
    renderizar();
    const encontrados = [];
    function visitar(no) {
      if (!no || typeof no !== 'object') return;
      if (Array.isArray(no)) return no.forEach(visitar);
      if (no.type === 'Modal' && !no.props.visible) return;
      if (typeof no.type === 'function') return visitar(no.type(no.props));
      encontrados.push(no);
      visitar(no.props?.children);
    }
    visitar(arvore);
    return encontrados;
  }
  return {
    requisicoes, alertas, mutacoes,
    async iniciar() { renderizar(); await new Promise(resolve => setImmediate(resolve)); renderizar(); },
    async estabilizar() { await new Promise(resolve => setImmediate(resolve)); renderizar(); },
    botoes: () => nos().filter(no => no.type === 'Button').map(no => no.props),
    textos: () => nos().filter(no => no.type === 'Text').flatMap(no => no.props.children),
    motivo: () => nos().find(no => no.type === 'TextInput')?.props,
    aba(titulo) {
      const aba = nos().find(no => no.type === 'Pressable' && no.props.children?.props?.children === titulo);
      assert.ok(aba, `Aba ${titulo} deve existir`);
      aba.props.onPress();
    },
  };
}

test('agenda confirma pendente antes de oferecer conclusão e envia os status corretos', async () => {
  const app = prepararAgenda('pendente');
  await app.iniciar();
  assert.ok(app.textos().includes('Pendente'));
  assert.ok(!app.botoes().some(botao => botao.title === 'Concluir'));
  const confirmacao = app.botoes().find(botao => botao.title === 'Confirmar').onPress();
  assert.equal(app.botoes().find(botao => botao.title === 'Confirmar').loading, true);
  assert.equal(app.botoes().find(botao => botao.title === 'Cancelar').disabled, true);
  assert.deepEqual(app.requisicoes.at(-1), { metodo: 'PATCH', url: '/agendamentos/11/status',
    dados: { status: 'confirmado', motivo: undefined } });
  app.mutacoes.at(-1).resolver();
  await confirmacao;
  await app.estabilizar();
  assert.ok(app.textos().includes('Confirmado'));
  assert.ok(!app.botoes().some(botao => botao.title === 'Confirmar'));
  const conclusao = app.botoes().find(botao => botao.title === 'Concluir').onPress();
  assert.equal(app.requisicoes.at(-1).dados.status, 'concluido');
  app.mutacoes.at(-1).resolver();
  await conclusao;
  await app.estabilizar();
  assert.ok(!app.botoes().some(botao => ['Confirmar', 'Concluir', 'Cancelar'].includes(botao.title)));
  app.aba('Finalizados');
  assert.ok(app.textos().includes('Concluido'));
});

test('falha ao confirmar mantém pendente e informa o erro sem oferecer conclusão', async () => {
  const app = prepararAgenda('pendente');
  await app.iniciar();
  const envio = app.botoes().find(botao => botao.title === 'Confirmar').onPress();
  app.mutacoes.at(-1).rejeitar({ response: { status: 409, data: { detail: 'Transição não permitida' } } });
  await envio;
  await app.estabilizar();
  assert.ok(app.botoes().some(botao => botao.title === 'Confirmar' && !botao.loading));
  assert.ok(!app.botoes().some(botao => botao.title === 'Concluir'));
  assert.deepEqual(app.alertas.at(-1), ['Nao foi possivel atualizar', 'Transição não permitida']);
});

for (const status of ['pendente', 'confirmado']) {
  test(`cancelamento de ${status} preserva motivo obrigatório e payload`, async () => {
    const app = prepararAgenda(status);
    await app.iniciar();
    app.botoes().find(botao => botao.title === 'Cancelar').onPress();
    await app.botoes().find(botao => botao.title === 'Confirmar' && botao.variant === 'danger').onPress();
    assert.equal(app.mutacoes.length, 0);
    assert.equal(app.alertas.at(-1)[0], 'Motivo obrigatorio');
    app.motivo().onChangeText('  Não poderei atender  ');
    const envio = app.botoes().find(botao => botao.title === 'Confirmar' && botao.variant === 'danger').onPress();
    assert.deepEqual(app.requisicoes.at(-1).dados, { status: 'cancelado', motivo: 'Não poderei atender' });
    app.mutacoes.at(-1).resolver();
    await envio;
    await app.estabilizar();
    app.aba('Cancelados');
    assert.ok(app.textos().includes('Cancelado'));
    assert.ok(!app.botoes().some(botao => ['Confirmar', 'Concluir', 'Cancelar'].includes(botao.title)));
  });
}

for (const status of ['concluido', 'finalizado', 'cancelado']) {
  test(`estado final ${status} não oferece alterações`, async () => {
    const app = prepararAgenda(status);
    await app.iniciar();
    app.aba(status === 'cancelado' ? 'Cancelados' : 'Finalizados');
    assert.ok(!app.botoes().some(botao => ['Confirmar', 'Concluir', 'Cancelar'].includes(botao.title)));
    assert.equal(app.mutacoes.length, 0);
  });
}
