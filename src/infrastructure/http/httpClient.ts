import type { ApiEnvelope } from '@/src/shared/types/common';

export interface HttpClientConfig {
  baseUrl: string;
  getToken: () => string | null;
}

/**
 * Reserved HTTP client contract for future NestJS + PostgreSQL + Redis backend.
 * In the current frontend prototype phase, composition switches to Mock adapters.
 */
export class NestApiHttpClient {
  constructor(private readonly config: HttpClientConfig) {}

  async request<TResponse>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<ApiEnvelope<TResponse>> {
    const token = this.config.getToken();
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return (await response.json()) as ApiEnvelope<TResponse>;
  }
}
