import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { validateSource, importSource } from '../../../tools/supplier-import/import.mjs';

const data = JSON.parse(await fs.readFile(new URL('../../../tools/supplier-import/legacy-suppliers.json', import.meta.url), 'utf8'));
test('overlapping screenshots resolve to independent account grants', () => {
  assert.equal(validateSource(data).length, 88);
  assert.equal(data.accounts.length, 11);
  const zyy = data.accounts.find(a => a.username === 'ZYY');
  const msmx = data.accounts.find(a => a.username === 'msmx');
  assert.ok(zyy.suppliers.includes('超任眼镜(富丽城店)'));
  assert.ok(!msmx.suppliers.includes('超任眼镜(富丽城店)'));
  assert.ok(msmx.suppliers.includes('精诚眼镜(月结镜片)'));
  assert.ok(!zyy.suppliers.includes('精诚眼镜(月结镜片)'));
  assert.deepEqual(data.accounts.find(a => a.username === 'tailong').suppliers, ['泰龙(富丽城)']);
});
test('invalid source is rejected before opening a database connection', async () => {
  const invalid = structuredClone(data);
  invalid.accounts.push(invalid.accounts[0]);
  await assert.rejects(importSource({ connect() { throw new Error('Should not connect'); } }, invalid), /Duplicate/);
});
test('ambiguous existing names abort and roll back rather than selecting an arbitrary supplier', async () => {
  const commands = [];
  const c = { query: async (sql) => {
    commands.push(sql);
    return { rows: sql.startsWith('SELECT id') ? [{id:'a'}, {id:'b'}] : [] };
  }, release() { commands.push('released'); } };
  await assert.rejects(importSource({connect: async () => c}, data, true), /Ambiguous existing supplier/);
  assert.ok(commands.includes('ROLLBACK'));
  assert.ok(!commands.includes('COMMIT'));
  assert.equal(commands.at(-1), 'released');
});
