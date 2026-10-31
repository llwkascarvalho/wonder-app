const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const axios = require('axios');

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
        return carregar(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(caminho), `${id}.ts`)));
      }
      return requireOriginal(id);
    };
    modulo._compile(ts.transpileModule(fs.readFileSync(caminho, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, caminho);
    return modulo.exports;
  }
  return carregar;
}

const prestadorApi = {
  id: 7, perfilUsuarioId: '10000000-0000-0000-0000-000000000001', nomeEstab: 'Studio teste',
  documento: '123', endereco: null, numero: null, bairro: null, cidade: 'Pau dos Ferros',
  estado: 'RN', complemento: null, status: 'ativo', ativo: true, fotoUrl: null,
};

test('catálogo adapta o contrato Spring e preserva UUID, foto nula, endereço e filtros', async () => {
  const requisicoes = [];
  const controle = new AbortController();
  const catalogo = carregarModulos({ get: async (rota, opcoes) => {
    requisicoes.push({ rota, opcoes });
    return { data: rota === '/catalogo/prestadores' ? [prestadorApi] : prestadorApi };
  } })('services/catalogo.ts');
  const [prestador] = await catalogo.listarPrestadores({ nome: 'Studio', categoria_id: 2 }, controle.signal);
  assert.equal(prestador.usuario_id, prestadorApi.perfilUsuarioId);
  assert.equal(prestador.nome_estab, 'Studio teste');
  assert.equal(prestador.foto_url, null);
  assert.equal(prestador.cidade, 'Pau dos Ferros');
  assert.equal(prestador.nomeEstab, undefined);
  assert.deepEqual(requisicoes[0].opcoes.params, { nome: 'Studio', categoria_id: 2 });
  assert.equal(requisicoes[0].opcoes.signal, controle.signal);
  assert.deepEqual(await catalogo.obterPrestador(7), prestador);
});

test('listas vazias e erros 404 não são convertidos em dados fictícios', async () => {
  const erro = new Error('Prestador não encontrado');
  const catalogo = carregarModulos({ get: async (rota) => {
    if (rota === '/catalogo/prestadores/99') throw erro;
    return { data: [] };
  } })('services/catalogo.ts');
  assert.deepEqual(await catalogo.listarPrestadores(), []);
  assert.deepEqual(await catalogo.listarServicosPrestador(7), []);
  await assert.rejects(catalogo.obterPrestador(99), (recebido) => recebido === erro);
});

test('expediente considera Fortaleza, domingo, fim do atendimento e janelas futuras do dia', () => {
  const { atendeHoje } = carregarModulos({})('utils/catalogPresentation.ts');
  const janela = (dia_semana, hora_inicio, hora_fim) => ({ id: 1, prestador_id: 7, dia_semana, hora_inicio, hora_fim });
  const segunda = new Date('2030-01-07T12:00:00Z'); // 09h em Fortaleza.
  assert.equal(atendeHoje([janela(1, '10:00:00', '12:00:00')], segunda), true);
  assert.equal(atendeHoje([janela(1, '08:00:00', '09:00:00')], segunda), false);
  assert.equal(atendeHoje([janela(2, '08:00:00', '18:00:00')], segunda), false);
  assert.equal(atendeHoje([], segunda), false);
  assert.equal(atendeHoje([janela(7, '19:00:00', '23:00:00')], new Date('2030-01-07T01:00:00Z')), true);
});

test('falha de horários fica desconhecida, sem afirmar que o prestador está fechado', async () => {
  const carregar = carregarModulos({ get: async (rota) => {
    if (rota.endsWith('/horarios')) throw new Error('Rede indisponível');
    return { data: [{ id: 1, nome: 'Cabelo' }] };
  } });
  const [card] = await carregar('utils/catalogPresentation.ts').carregarCardsPrestadores([
    { id: 7, nome_estab: 'Studio teste' },
  ]);
  assert.equal(card.atendeHoje, null);
  assert.deepEqual(card.categorias, [{ id: 1, nome: 'Cabelo' }]);
});

test('busca cancelada durante as consultas complementares não publica cards antigos', async () => {
  const controle = new AbortController();
  let concluir;
  const aguardando = new Promise((resolve) => { concluir = resolve; });
  const sinais = [];
  const carregar = carregarModulos({ get: async (_rota, opcoes) => {
    sinais.push(opcoes.signal);
    await aguardando;
    return { data: [] };
  } });
  const pendente = carregar('utils/catalogPresentation.ts').carregarCardsPrestadores([
    { id: 7, nome_estab: 'Resultado antigo' },
  ], controle.signal);
  controle.abort();
  concluir();
  await assert.rejects(pendente, /cancelada/);
  assert.deepEqual(sinais, [controle.signal, controle.signal]);
});

test('ordenação diferencia atendimento conhecido, sem expediente e informação indisponível', async (contexto) => {
  contexto.mock.timers.enable({ apis: ['Date'], now: new Date('2030-01-07T12:00:00Z') });
  const carregar = carregarModulos({ get: async (rota) => {
    if (rota.endsWith('/categorias')) return { data: [] };
    if (rota.includes('/3/')) throw new Error('Horários indisponíveis');
    return { data: rota.includes('/1/')
      ? Array.from({ length: 7 }, (_, indice) => ({ dia_semana: indice + 1, hora_inicio: '00:00', hora_fim: '23:59' }))
      : [] };
  } });
  const cards = await carregar('utils/catalogPresentation.ts').carregarCardsPrestadores([
    { id: 3, nome_estab: 'A indisponível' }, { id: 2, nome_estab: 'B sem atendimento' },
    { id: 1, nome_estab: 'C atende hoje' },
  ]);
  assert.deepEqual(cards.map((card) => card.prestador.id), [1, 2, 3]);
});

test('consultas públicas funcionam com a API Spring real e respeitam conflitos do seed', {
  skip: !process.env.WONDER_API_TEST_URL,
}, async () => {
  const api = axios.create({ baseURL: process.env.WONDER_API_TEST_URL, timeout: 15000 });
  const carregar = carregarModulos(api);
  const catalogo = carregar('services/catalogo.ts');
  const agendamentos = carregar('services/agendamentos.ts');
  const categorias = await catalogo.listarCategorias();
  assert.ok(categorias.length > 0);
  const prestadores = await catalogo.listarPrestadores();
  assert.ok(prestadores.length > 0);
  const prestador = prestadores[0];
  assert.match(prestador.usuario_id, /^[\da-f-]{36}$/i);
  assert.deepEqual(await catalogo.obterPrestador(prestador.id), prestador);
  const servicos = await catalogo.listarServicosPrestador(prestador.id);
  const servico = servicos.find((item) => item.nome === 'Corte de cabelo');
  assert.ok(servico);
  assert.equal(typeof servico.preco, 'number');
  assert.equal(typeof servico.duracao_min, 'number');
  const horarios = await catalogo.listarHorariosPrestador(prestador.id);
  assert.ok(horarios.length > 0);
  const vinculadas = await catalogo.listarCategoriasPrestador(prestador.id);
  assert.ok(vinculadas.length > 0);
  const filtrados = await catalogo.listarPrestadores({ nome: prestador.nome_estab, categoria_id: vinculadas[0].id });
  assert.ok(filtrados.some((item) => item.id === prestador.id));
  assert.deepEqual(await catalogo.listarPrestadores({ nome: 'nome-inexistente-validacao-9e2c' }), []);
  const parametros = { prestador_id: prestador.id, servico_id: servico.id };
  const dias = await agendamentos.listarDiasDisponiveis({ ...parametros, mes: '2030-01' });
  assert.ok(dias.dias.some((dia) => dia.data === '2030-01-07' && dia.disponivel));
  const disponibilidade = await agendamentos.listarDisponibilidade({ ...parametros, data: '2030-01-07' });
  assert.equal(disponibilidade.duracao_min, servico.duracao_min);
  assert.ok(disponibilidade.horarios.length > 0);
  for (const horario of disponibilidade.horarios) {
    assert.equal((new Date(horario.fim) - new Date(horario.inicio)) / 60000, servico.duracao_min);
    assert.equal(horario.inicio < '2030-01-07T10:45:00' && horario.fim > '2030-01-07T10:00:00', false);
  }
  assert.ok(disponibilidade.horarios.some((horario) => horario.inicio === '2030-01-07T11:15:00'));
  await assert.rejects(catalogo.obterPrestador(2147483647), (erro) => erro.response?.status === 404);
  await assert.rejects(agendamentos.listarDisponibilidade({ ...parametros, data: 'invalida' }), (erro) => erro.response?.status === 400);
  await assert.rejects(agendamentos.listarDiasDisponiveis({ ...parametros, mes: 'invalido' }), (erro) => erro.response?.status === 400);
});
