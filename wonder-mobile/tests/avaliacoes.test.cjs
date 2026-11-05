const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function carregarModulo(arquivo, api = {}) {
  const caminho = path.resolve(__dirname, '../src', arquivo);
  const modulo = new Module(caminho, module);
  modulo.filename = caminho;
  modulo.paths = Module._nodeModulePaths(path.dirname(caminho));
  const requireOriginal = modulo.require.bind(modulo);
  modulo.require = (id) => {
    if (id === './api') return { __esModule: true, default: api, api };
    if (id.startsWith('.')) return {};
    return requireOriginal(id);
  };
  modulo._compile(ts.transpileModule(fs.readFileSync(caminho, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, caminho);
  return modulo.exports;
}

test('serviço de avaliações respeita as rotas e o contrato do backend', async () => {
  const requisicoes = [];
  const api = {
    async get(url) {
      requisicoes.push({ metodo: 'GET', url });
      return { data: [{ id: 1, agendamento_id: 9, prestador_id: 7, nota: 5 }] };
    },
    async post(url, dados) {
      requisicoes.push({ metodo: 'POST', url, dados });
      return { data: { id: 2, prestador_id: 7, ...dados } };
    },
  };
  const avaliacoes = carregarModulo('services/avaliacoes.ts', api);

  assert.equal((await avaliacoes.listarAvaliacoesPrestador(7))[0].nota, 5);
  assert.deepEqual(await avaliacoes.criarAvaliacaoPrestador(7, { agendamento_id: 11, nota: 4 }), {
    id: 2, prestador_id: 7, agendamento_id: 11, nota: 4,
  });
  assert.deepEqual(requisicoes, [
    { metodo: 'GET', url: '/catalogo/prestadores/7/avaliacoes' },
    { metodo: 'POST', url: '/catalogo/prestadores/7/avaliacoes', dados: { agendamento_id: 11, nota: 4 } },
  ]);
});

test('somente atendimento concluído e ainda não avaliado oferece avaliação', () => {
  const { podeAvaliarAgendamento } = carregarModulo('utils/avaliacoes.ts');
  const avaliacao = { id: 1, agendamento_id: 9, prestador_id: 7, nota: 5 };

  assert.equal(podeAvaliarAgendamento('concluido', true), true);
  assert.equal(podeAvaliarAgendamento('concluido', true, avaliacao), false);
  assert.equal(podeAvaliarAgendamento('concluido', false), false);
  assert.equal(podeAvaliarAgendamento('confirmado', true), false);
  assert.equal(podeAvaliarAgendamento('cancelado', true), false);
});

test('média pública considera todas as avaliações e trata lista vazia', () => {
  const { calcularMediaAvaliacoes } = carregarModulo('utils/avaliacoes.ts');
  assert.equal(calcularMediaAvaliacoes([]), 0);
  assert.equal(calcularMediaAvaliacoes([
    { nota: 5 }, { nota: 4 }, { nota: 3 },
  ]), 4);
});
