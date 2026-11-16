import type { DataScopeContext, PaginatedQuery, PaginatedResult } from '@/src/shared/types/common';
import type { MemberProfile, MemberTier } from '../domain/member';

export interface MemberQueryFilters extends Record<string, unknown> {
  keyword?: string;
  tier?: MemberTier | 'all';
  storeId?: string;
}

export interface MemberRepository {
  queryMembers(
    query: PaginatedQuery<MemberQueryFilters>,
    scope: DataScopeContext
  ): Promise<PaginatedResult<MemberProfile>>;

  getMemberById(id: string, scope: DataScopeContext): Promise<MemberProfile | null>;

  createMember(
    input: {
      name: string;
      gender: '男' | '女';
      age: number;
      phone: string;
      tier: MemberTier;
      storeId: string;
      storeName: string;
      guideName: string;
      tags: string[];
    },
    scope: DataScopeContext
  ): Promise<MemberProfile>;
}
