import { readAuthSession } from '@/lib/authSession';

function getEnvValue(key: string) {
  const envRecord: unknown = Reflect.get(import.meta, 'env');

  if (typeof envRecord !== 'object' || envRecord === null) {
    return undefined;
  }

  const value = (envRecord as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

export const API_BASE_URL = (getEnvValue('VITE_API_URL') ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);
export const IS_TEST_MODE = getEnvValue('MODE') === 'test';

export class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const session = readAuthSession();

  if (!nextHeaders.has('Accept')) {
    nextHeaders.set('Accept', 'application/json');
  }

  if (session?.accessToken && !nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${session.accessToken}`);
  }

  return nextHeaders;
}

function resolveErrorMessage(payload: unknown) {
  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload !== 'object' || payload === null) {
    return 'No pudimos completar la solicitud.';
  }

  const record = payload as Record<string, unknown>;
  const message = record.message;

  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(' ');
  }

  return 'No pudimos completar la solicitud.';
}

export async function apiRequest<T>(
  path: string,
  init?: Omit<RequestInit, 'body'> & { body?: BodyInit | Record<string, unknown> | null },
) {
  const headers = buildHeaders(init?.headers);
  const rawBody = init?.body ?? null;
  let body: BodyInit | null;

  if (
    rawBody &&
    typeof rawBody === 'object' &&
    !(rawBody instanceof FormData) &&
    !(rawBody instanceof Blob) &&
    !(rawBody instanceof URLSearchParams) &&
    !(rawBody instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(rawBody)
  ) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(rawBody);
  } else {
    body = rawBody as BodyInit | null;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    body,
    headers,
  });

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(payload), response.status);
  }

  return payload as T;
}
