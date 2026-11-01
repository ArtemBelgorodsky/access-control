import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadCsv } from '../src/format.js';

test('CSV exports UTF-8, quotes and semicolons correctly and neutralizes formulas', async t => {
  let blob, filename, clicked = false;
  const previous = globalThis.document;
  globalThis.document = { body: { appendChild() {} }, createElement() { return { set download(value) { filename = value; }, set href(value) {}, click() { clicked = true; }, remove() {} }; } };
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  t.mock.method(URL, 'createObjectURL', value => { blob = value; return 'blob:example'; });
  t.mock.method(URL, 'revokeObjectURL', () => {});
  downloadCsv('report.csv', [['Сотрудник', 'Примечание'], ['=1+1', 'A;"B"']]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
  assert.match(await blob.text(), /"'=1\+1";"A;""B"""/);
  assert.equal(filename, 'report.csv');
  assert.equal(clicked, true);
});
