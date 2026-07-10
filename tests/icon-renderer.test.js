const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadUtils() {
  const context = {
    console,
    window: {},
    localStorage: {
      getItem() { return null; },
      setItem() {},
    },
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'utils.js'), 'utf8');
  vm.runInContext(source, context);
  return context;
}

test('renderTextWithIcons replaces known tokens with inline spans', () => {
  const context = loadUtils();
  const rendered = context.renderTextWithIcons('Зберегти :save:');

  assert.equal(
    rendered,
    'Зберегти <span class="icon-inline" aria-hidden="true">💾</span>'
  );
});

test('renderTextWithIcons leaves unknown tokens unchanged', () => {
  const context = loadUtils();
  const rendered = context.renderTextWithIcons('Текст :unknown:');

  assert.equal(rendered, 'Текст :unknown:');
});
