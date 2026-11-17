import assert from 'node:assert/strict';
import {
  CONSOLIDATED_MENU_ROUTES, FLAT_MENU_NODES, MENU_BY_ID, MENU_BY_ROUTE, MENU_TREE,
  findFirstAccessibleLeaf, getAncestorChain,
} from '../src/modules/navigation/domain/menuRegistry.ts';

const protectedNames: Record<string,string> = {
  basic:'基本资料', purchase:'采购', system:'系统管理',
  'basic.suppliers':'供应商资料', 'basic.brands':'品牌资料',
  'purchase.orders':'采购订货单', 'purchase.manual_inbound':'手工入库',
  'system.roles':'角色权限管理', 'system.user_assignments':'用户权限分配',
  'system.parameters':'参数设置', 'system.stores':'门店资料',
  'system.processing_warehouses':'加工仓库设置', 'system.audit_logs':'操作日志',
};
for (const [id,label] of Object.entries(protectedNames)) {
  assert.equal(MENU_BY_ID[id]?.label,label,`completed menu changed: ${id}`);
}

assert.equal(MENU_TREE.length,18);
assert.equal(new Set(FLAT_MENU_NODES.map(node=>node.id)).size,FLAT_MENU_NODES.length);
assert.equal(new Set(FLAT_MENU_NODES.map(node=>node.route)).size,FLAT_MENU_NODES.length);
for (const node of FLAT_MENU_NODES) {
  assert.equal(MENU_BY_ROUTE[node.route],node);
  assert.equal(getAncestorChain(node.id).at(-1),node);
  if (node.nodeType === 'group' || node.nodeType === 'module') assert.ok(node.children?.length,`empty navigation group: ${node.id}`);
}
for (const [oldId,targetId] of Object.entries(CONSOLIDATED_MENU_ROUTES)) {
  const oldRoute=`/modules/${oldId.replaceAll('.','/').replaceAll('_','-')}`;
  assert.equal(MENU_BY_ID[oldId],undefined,`duplicate menu remains: ${oldId}`);
  assert.equal(MENU_BY_ROUTE[oldRoute],MENU_BY_ID[targetId],`old bookmark fails: ${oldId}`);
}

const coupon=MENU_BY_ID['members.marketing.coupons'];
assert.equal(findFirstAccessibleLeaf(coupon,code=>code==='members.marketing.read'),coupon);
assert.equal(findFirstAccessibleLeaf(coupon,code=>['members.marketing.read','members.analytics.read'].includes(code))?.id,'members.marketing.coupons.stats');
console.log('Navigation invariants passed');
