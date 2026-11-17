import type { PermissionAuditEntry, RoleDefinition } from '@/src/modules/auth/domain/identity';
import type { RoleRepository } from '@/src/modules/system/roles/ports/roleRepository';
import { MockRoleRepository } from '@/src/infrastructure/mock/mockRepositories';

const base = `${import.meta.env.BASE_URL}api`;
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, { method, credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error ?? `请求失败（${response.status}）`);
  return value as T;
}

export class ApiRoleRepository implements RoleRepository {
  private readonly mock = new MockRoleRepository();
  private get localMode() {
    if (import.meta.env.BASE_URL === '/') return true;
    try { return window.localStorage.getItem('qsl_auth_debug_mode_v1') === 'true'; } catch { return false; }
  }
  listRoles(): Promise<RoleDefinition[]> {
    return this.localMode ? this.mock.listRoles() : request<RoleDefinition[]>('/system/roles');
  }
  updateRole(role: RoleDefinition, operator: string, summary: string): Promise<RoleDefinition> {
    return this.localMode ? this.mock.updateRole(role,operator,summary)
      : request<RoleDefinition>(`/system/roles/${encodeURIComponent(role.id)}`,'PUT',{
        permissions:role.permissions,dataScope:role.dataScope,sensitiveFields:role.sensitiveFields });
  }
  listAuditEntries(): Promise<PermissionAuditEntry[]> {
    return this.localMode ? this.mock.listAuditEntries() : request<PermissionAuditEntry[]>('/system/audit');
  }
}
