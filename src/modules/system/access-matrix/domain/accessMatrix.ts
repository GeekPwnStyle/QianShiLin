import { ALL_MODULE_BASE_PERMISSIONS } from '@/src/modules/auth/domain/identity';
import { MENU_TREE, WORKBENCH_NODE, type NavNode } from '@/src/modules/navigation/domain/menuRegistry';

export const ACCESS_ACTIONS = ['无权限', '查看', '新增', '编辑', '删除', '导出', '审核'] as const;
export type AccessAction = typeof ACCESS_ACTIONS[number];

const actionSuffix: Record<string, AccessAction> = {
  read: '查看', create: '新增', update: '编辑', manage: '编辑',
  delete: '删除', export: '导出', approve: '审核', audit: '审核',
  execute: '审核', import: '新增', send: '新增', publish: '新增',
};

export const ACCESS_TREE: NavNode[] = [WORKBENCH_NODE, ...MENU_TREE];
export const ALL_ACCESS_CODES = new Set(ALL_MODULE_BASE_PERMISSIONS);

function baseCode(node: NavNode): string {
  return node.permission.replace(/\.(read|create|update|manage|delete|export|approve|audit|execute|import|send|publish)$/, '');
}

/** A menu row only exposes permissions implemented by the current API/permission catalog. */
export function actionCodes(node: NavNode): Partial<Record<AccessAction, string[]>> {
  const root = baseCode(node);
  const result: Partial<Record<AccessAction, string[]>> = {};
  for (const code of ALL_ACCESS_CODES) {
    if (code !== node.permission && (!code.startsWith(`${root}.`) || code.slice(root.length + 1).includes('.'))) continue;
    // Module rows represent entry into the module. Child operations belong to their page rows.
    if (node.nodeType === 'module' && code !== node.permission) continue;
    const suffix = code.split('.').at(-1) ?? '';
    const action = actionSuffix[suffix];
    if (!action) continue;
    (result[action] ??= []).push(code);
  }
  if (!Object.keys(result).length && ALL_ACCESS_CODES.has(node.permission)) {
    result['查看'] = [node.permission];
  }
  return result;
}

export function nodePermitted(node: NavNode, codes: readonly string[]): boolean {
  const relevant = Object.values(actionCodes(node)).flat();
  return relevant.some(code => codes.includes(code));
}

export function flattenAccessTree(nodes: NavNode[] = ACCESS_TREE): NavNode[] {
  return nodes.flatMap(node => [node, ...flattenAccessTree(node.children ?? [])]);
}

export function withAction(codes: readonly string[], node: NavNode, action: AccessAction, enabled: boolean): string[] {
  const mapped = actionCodes(node);
  const changes = action === '无权限' ? Object.values(mapped).flat() : (mapped[action] ?? []);
  const next = new Set(codes);
  for (const code of changes) (action === '无权限' ? !enabled : enabled) ? next.add(code) : next.delete(code);
  if (enabled && action !== '无权限') {
    if (ALL_ACCESS_CODES.has(node.permission)) next.add(node.permission);
    const parent = node.parentId ? flattenAccessTree().find(item => item.id === node.parentId) : undefined;
    if (parent && ALL_ACCESS_CODES.has(parent.permission)) next.add(parent.permission);
    const module = ACCESS_TREE.find(item => item.id === node.moduleId);
    if (module && ALL_ACCESS_CODES.has(module.permission)) next.add(module.permission);
  }
  if (enabled && action === '无权限') {
    for (const child of flattenAccessTree(node.children ?? [])) for (const code of Object.values(actionCodes(child)).flat()) next.delete(code);
  }
  return [...next];
}
