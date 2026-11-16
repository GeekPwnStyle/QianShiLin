import type { DataScopeContext } from '@/src/shared/types/common';
import type { WorkbenchSnapshot, WorkbenchTimeRange } from '../domain/workbench';

export interface WorkbenchRepository {
  getSnapshot(
    timeRange: WorkbenchTimeRange,
    storeScopeId: string,
    scope: DataScopeContext
  ): Promise<WorkbenchSnapshot>;
}
