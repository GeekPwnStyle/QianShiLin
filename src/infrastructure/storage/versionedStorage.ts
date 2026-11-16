const STORAGE_KEY = 'qianshilink_prototype_store';
const CURRENT_SCHEMA_VERSION = 1;

export interface PersistedEnvelope<T> {
  schemaVersion: number;
  updatedAt: string;
  payload: T;
}

export interface StoragePort {
  read<T>(sliceKey: string, fallback: () => T): T;
  write<T>(sliceKey: string, value: T): void;
  resetAll(): void;
}

class LocalStorageVersionedAdapter implements StoragePort {
  private readRoot(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as PersistedEnvelope<Record<string, unknown>>;
      if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION || !parsed.payload) {
        return {};
      }
      return parsed.payload;
    } catch {
      return {};
    }
  }

  private writeRoot(payload: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    const envelope: PersistedEnvelope<Record<string, unknown>> = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      payload,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }

  read<T>(sliceKey: string, fallback: () => T): T {
    const root = this.readRoot();
    if (Object.prototype.hasOwnProperty.call(root, sliceKey)) {
      return root[sliceKey] as T;
    }
    const seed = fallback();
    this.write(sliceKey, seed);
    return seed;
  }

  write<T>(sliceKey: string, value: T): void {
    const root = this.readRoot();
    root[sliceKey] = value;
    this.writeRoot(root);
  }

  resetAll(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export const versionedStorage: StoragePort = new LocalStorageVersionedAdapter();
