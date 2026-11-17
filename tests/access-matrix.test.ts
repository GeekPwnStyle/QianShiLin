import { describe, expect, test } from 'bun:test';
import { MENU_BY_ID } from '../src/modules/navigation/domain/menuRegistry';
import { actionCodes, withAction } from '../src/modules/system/access-matrix/domain/accessMatrix';

describe('permission matrix reflects enforceable codes', () => {
  test('product read never implies cost price access', () => {
    const node = MENU_BY_ID['basic.product'];
    expect(node).toBeDefined();
    const next = withAction([], node, '查看', true);
    expect(next).toContain('basic.product.read');
    expect(next).not.toContain('basic.product.cost.read');
    expect(actionCodes(node)['查看']).not.toContain('basic.product.cost.read');
  });
  test('denying a module removes child operations', () => {
    const node = MENU_BY_ID.basic;
    const next = withAction(['basic.read', 'basic.product.read', 'basic.product.update'], node, '无权限', true);
    expect(next).not.toContain('basic.read');
    expect(next).not.toContain('basic.product.update');
  });
  test('enabling a child operation includes its parent module entry', () => {
    const next = withAction([], MENU_BY_ID['basic.product'], '编辑', true);
    expect(next).toContain('basic.read');
    expect(next).toContain('basic.product.update');
  });
});
