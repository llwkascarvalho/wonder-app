const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Renderiza a tela e os serviços reais, controlando a ordem das respostas HTTP.
function prepararTela() {
  const estados = [];
  const efeitos = [];
  const requisicoes = [];
  let cursor = 0;
  let alterou = false;
  let desmontada = false;
  let escritasAposDesmontar = 0;
  const rota = { params: { prestadorId: 7 } };
  const navegacao = { navigate() {} };
  const iguais = (a, b) => a && b && a.length === b.length && a.every((valor, i) => Object.is(valor, b[i]));
  const react = {
    useState(inicial) {
      const indice = cursor++;
      if (!(indice in estados)) estados[indice] = typeof inicial === 'function' ? inicial() : inicial;
      return [estados[indice], valor => {
        if (desmontada) { escritasAposDesmontar++; return; }
        const proximo = typeof valor === 'function' ? valor(estados[indice]) : valor;
        if (!Object.is(proximo, estados[indice])) { estados[indice] = proximo; alterou = true; }
      }];
    },
    useRef(inicial) {
      const indice = cursor++;
      if (!(indice in estados)) estados[indice] = { current: inicial };
      return estados[indice];
    },
    useMemo(calcular, deps) {
      const indice = cursor++;
      if (!iguais(estados[indice]?.deps, deps)) estados[indice] = { deps, valor: calcular() };
      return estados[indice].valor;
    },
    useCallback(funcao, deps) { return react.useMemo(() => funcao, deps); },
    useEffect(executar, deps) {
      const indice = cursor++;
      if (!iguais(estados[indice]?.deps, deps)) {
        const anterior = estados[indice];
        const atual = { deps };
        estados[indice] = atual;
        efeitos.push(() => { anterior?.limpar?.(); atual.limpar = executar(); });
      }
    },
  };
  const api = {
    get: async (url, opcoes) => {
      if (url === '/catalogo/prestadores/7') return { data: { id: 7, nomeEstab: 'Studio teste' } };
      if (url === '/catalogo/prestadores/7/servicos') return { data: [
        { id: 1, nome: 'Corte', preco: 50, duracao_min: 45 },
        { id: 2, nome: 'Unhas', preco: 35, duracao_min: 60 },
      ] };
      return new Promise((resolve, reject) => {
        requisicoes.push({ url, ...opcoes, resolver: data => resolve({ data }), rejeitar: reject });
      });
    },
    post: (url, dados) => new Promise((resolve, reject) => {
      requisicoes.push({ url, dados, resolver: data => resolve({ data }), rejeitar: reject });
    }),
  };
  const cache = new Map();
  function carregar(arquivo) {
    if (cache.has(arquivo)) return cache.get(arquivo).exports;
    const modulo = new Module(arquivo, module);
    cache.set(arquivo, modulo);
    modulo.filename = arquivo;
    modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
    const requireOriginal = modulo.require.bind(modulo);
    modulo.require = id => {
      if (id === 'react') return react;
      if (id === '@react-navigation/native') return { useNavigation: () => navegacao, useRoute: () => rota };
      if (id === 'react-native') return {
        Alert: { alert() {} }, ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: valor => valor },
      };
      if (id === './api') return { api };
      if (id.startsWith('../components/')) {
        const nome = id.split('/').at(-1);
        return { [nome]: nome, getCurrentMonthKey: () => '2030-01' };
      }
      if (id.startsWith('.')) return carregar(path.resolve(path.dirname(arquivo), `${id}.ts`));
      return requireOriginal(id);
    };
    modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, arquivo);
    return modulo.exports;
  }
  const { AgendamentoScreen } = carregar(path.resolve(__dirname, '../src/screens/AgendamentoScreen.tsx'));
  function renderizar() {
    let raiz;
    let rodadas = 0;
    do {
      assert.ok(++rodadas < 20, 'Renderização deve estabilizar');
      alterou = false;
      cursor = 0;
      raiz = AgendamentoScreen();
      efeitos.splice(0).forEach(efeito => efeito());
    } while (alterou);
    const nos = [];
    function percorrer(no) {
      if (!no || typeof no !== 'object') return;
      if (Array.isArray(no)) return no.forEach(percorrer);
      nos.push(no);
      percorrer(no.props?.children);
    }
    percorrer(raiz);
    const buscar = tipo => nos.filter(no => no.type === tipo).map(no => no.props);
    return {
      calendario: buscar('MonthlyAvailabilityCalendar')[0],
      confirmar: buscar('Button').find(botao => botao.title === 'Confirmar agendamento'),
      servico: id => buscar('ServiceCard').find(card => card.servico.id === id),
      horarios: buscar('Card').filter(card => card.onPress),
      textos: buscar('Text').flatMap(no => no.children).filter(valor => typeof valor === 'string'),
      carregando: buscar('LoadingIndicator').map(no => no.text),
    };
  }
  const app = {
    requisicoes, renderizar,
    async estabilizar() { await new Promise(resolve => setImmediate(resolve)); return renderizar(); },
    async iniciar() { renderizar(); return app.estabilizar(); },
    async selecionarServico(id = 1) {
      renderizar().servico(id).onPress();
      return app.estabilizar();
    },
    async liberarDias(datas = ['2030-01-07', '2030-01-08']) {
      requisicoes.findLast(item => item.url.endsWith('/dias-disponiveis')).resolver({ dias: datas.map(data => ({ data, disponivel: true })) });
      return app.estabilizar();
    },
    async selecionarData(data) {
      renderizar().calendario.onSelectDate(data);
      return app.estabilizar();
    },
    ultimaConsulta: () => requisicoes.at(-1),
    desmontar() { desmontada = true; estados.forEach(estado => estado?.limpar?.()); },
    escritasAposDesmontar: () => escritasAposDesmontar,
  };
  return app;
}

const respostaHorario = inicio => ({ horarios: [{ inicio, fim: inicio.replace('09:00', '09:45').replace('10:00', '10:45') }] });
async function iniciarSelecao() {
  const app = prepararTela();
  await app.iniciar();
  await app.selecionarServico();
  await app.liberarDias();
  return app;
}

test('resposta da data antiga não aparece nem encerra o carregamento da data atual', async () => {
  const app = await iniciarSelecao();
  await app.selecionarData('2030-01-07');
  const antiga = app.ultimaConsulta();
  await app.selecionarData('2030-01-08');
  const atual = app.ultimaConsulta();
  assert.equal(antiga.signal.aborted, true);
  assert.equal(atual.params.data, '2030-01-08');
  antiga.resolver(respostaHorario('2030-01-07T09:00:00'));
  let tela = await app.estabilizar();
  assert.equal(tela.horarios.length, 0);
  assert.ok(tela.carregando.includes('Carregando horarios...'));
  assert.equal(tela.confirmar.disabled, true);
  atual.resolver(respostaHorario('2030-01-08T10:00:00'));
  tela = await app.estabilizar();
  assert.equal(tela.horarios.length, 1);
  tela.horarios[0].onPress();
  assert.equal(app.renderizar().confirmar.disabled, false);
});

test('erro atrasado é ignorado e a seleção do serviço anterior é descartada', async () => {
  const app = await iniciarSelecao();
  await app.selecionarData('2030-01-07');
  const antiga = app.ultimaConsulta();
  await app.selecionarServico(2);
  assert.equal(antiga.signal.aborted, true);
  assert.equal(app.ultimaConsulta().params.servico_id, 2);
  antiga.rejeitar(new Error('Resposta atrasada'));
  const tela = await app.estabilizar();
  assert.equal(tela.calendario.dataSelecionada, null);
  assert.deepEqual(tela.calendario.diasDisponiveis, []);
  assert.equal(tela.horarios.length, 0);
  assert.equal(tela.confirmar.disabled, true);
  assert.equal(tela.textos.some(texto => texto.includes('Nao foi possivel')), false);
});

test('troca de mês cancela consultas e não reutiliza dias nem horários do mês anterior', async () => {
  const app = await iniciarSelecao();
  await app.selecionarData('2030-01-07');
  const horariosAntigos = app.ultimaConsulta();
  app.renderizar().calendario.onChangeMes('2030-02');
  await app.estabilizar();
  const diasAntigos = app.ultimaConsulta();
  app.renderizar().calendario.onChangeMes('2030-03');
  await app.estabilizar();
  const diasAtuais = app.ultimaConsulta();
  assert.equal(horariosAntigos.signal.aborted, true);
  assert.equal(diasAntigos.signal.aborted, true);
  horariosAntigos.resolver(respostaHorario('2030-01-07T09:00:00'));
  diasAntigos.resolver({ dias: [{ data: '2030-02-04', disponivel: true }] });
  let tela = await app.estabilizar();
  assert.equal(tela.calendario.mes, '2030-03');
  assert.deepEqual(tela.calendario.diasDisponiveis, []);
  assert.ok(tela.carregando.includes('Carregando dias disponiveis...'));
  diasAtuais.resolver({ dias: [] });
  tela = await app.estabilizar();
  assert.deepEqual(tela.calendario.diasDisponiveis, []);
  assert.equal(tela.horarios.length, 0);
});

test('repetir o serviço selecionado preserva a consulta e o calendário', async () => {
  const app = await iniciarSelecao();
  const quantidade = app.requisicoes.length;
  await app.selecionarServico();
  assert.equal(app.requisicoes.length, quantidade);
  assert.deepEqual(app.renderizar().calendario.diasDisponiveis, ['2030-01-07', '2030-01-08']);
});

test('lista vazia e falha de rede são diferenciadas e não habilitam confirmação', async () => {
  const app = await iniciarSelecao();
  await app.selecionarData('2030-01-07');
  app.ultimaConsulta().resolver({ horarios: [] });
  let tela = await app.estabilizar();
  assert.ok(tela.textos.includes('Nenhum horario disponivel para esta data.'));
  assert.equal(tela.confirmar.disabled, true);
  await app.selecionarData('2030-01-08');
  app.ultimaConsulta().rejeitar(new Error('Sem conexão'));
  tela = await app.estabilizar();
  assert.ok(tela.textos.includes('Nao foi possivel carregar os horarios disponiveis.'));
  assert.equal(tela.confirmar.disabled, true);
});

test('conflito 409 recarrega a seleção atual, mantém o aviso e descarta o horário ocupado', async () => {
  const app = await iniciarSelecao();
  await app.selecionarData('2030-01-07');
  app.ultimaConsulta().resolver(respostaHorario('2030-01-07T09:00:00'));
  (await app.estabilizar()).horarios[0].onPress();
  const confirmacao = app.renderizar().confirmar.onPress();
  const envio = app.ultimaConsulta();
  assert.equal(envio.dados.inicio, '2030-01-07T09:00:00');
  envio.rejeitar({ response: { status: 409 } });
  let tela = await app.estabilizar();
  assert.ok(tela.textos.includes('Este horario foi ocupado. Escolha outro horario disponivel.'));
  assert.equal(tela.confirmar.disabled, true);
  assert.equal(app.ultimaConsulta().params.data, '2030-01-07');
  app.ultimaConsulta().resolver(respostaHorario('2030-01-07T10:00:00'));
  await confirmacao;
  tela = await app.estabilizar();
  assert.ok(tela.textos.includes('Este horario foi ocupado. Escolha outro horario disponivel.'));
  assert.equal(tela.confirmar.disabled, true);
  assert.equal(tela.horarios.length, 1);
});

test('conflito de um envio antigo não dispara consulta para a nova data', async () => {
  const app = await iniciarSelecao();
  await app.selecionarData('2030-01-07');
  app.ultimaConsulta().resolver(respostaHorario('2030-01-07T09:00:00'));
  (await app.estabilizar()).horarios[0].onPress();
  const confirmacao = app.renderizar().confirmar.onPress();
  const envio = app.ultimaConsulta();
  await app.selecionarData('2030-01-08');
  const consultaAtual = app.ultimaConsulta();
  envio.rejeitar({ response: { status: 409 } });
  await confirmacao;
  await app.estabilizar();
  assert.equal(app.ultimaConsulta(), consultaAtual);
  assert.equal(consultaAtual.signal.aborted, false);
});

test('desmontar a tela aborta as consultas e ignora respostas e erros pendentes', async () => {
  const app = await iniciarSelecao();
  await app.selecionarData('2030-01-07');
  const horario = app.ultimaConsulta();
  app.renderizar().calendario.onChangeMes('2030-02');
  await app.estabilizar();
  const dias = app.ultimaConsulta();
  app.desmontar();
  assert.equal(horario.signal.aborted, true);
  assert.equal(dias.signal.aborted, true);
  horario.resolver(respostaHorario('2030-01-07T09:00:00'));
  dias.rejeitar(new Error('Sem conexão'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.escritasAposDesmontar(), 0);
});
