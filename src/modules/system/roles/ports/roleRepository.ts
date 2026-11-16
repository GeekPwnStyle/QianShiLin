import type { PermissionAuditEntry, RoleDefinition } from '@/src/modules/auth/domain/identity';

export interface RoleRepository {
  listRoles(): Promise<RoleDefinition[]>;
  updateRole(role: RoleDefinition, operator: string, summary: string): Promise<RoleDefinition>;
  listAuditEntries(): Promise<PermissionAuditEntry[]>;
}
