const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function carregarHook() {
  const filename = path.resolve(__dirname, '../src/navigation/useResetScrollOnFocus.ts');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  let onFocus;
  loaded.require = id => {
    if (id === '@react-navigation/native') return { useFocusEffect: callback => { onFocus = callback; } };
    if (id === 'react') return { useCallback: callback => callback };
    throw new Error(`Importação inesperada: ${id}`);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return { hook: loaded.exports.useResetScrollOnFocus, focus: () => onFocus() };
}

test('ao voltar a uma página, a rolagem vertical começa no topo sem animação', () => {
  const { hook, focus } = carregarHook();
  const chamadas = [];
  hook({ current: { scrollTo: options => chamadas.push(options) } });
  focus();
  assert.deepEqual(chamadas, [{ y: 0, animated: false }]);
});

test('listas virtualizadas também voltam ao primeiro item ao ganhar foco', () => {
  const { hook, focus } = carregarHook();
  const chamadas = [];
  hook({ current: { scrollToOffset: options => chamadas.push(options) } });
  focus();
  assert.deepEqual(chamadas, [{ offset: 0, animated: false }]);
});
