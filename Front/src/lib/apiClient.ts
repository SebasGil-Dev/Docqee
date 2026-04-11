import {
  clearAuthSession,
  persistAuthSession,
  readAuthSession,
  type AuthSession,
} from '@/lib/authSession';

type ApiRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

type PreparedRequest = {
  body: BodyInit | null;
  headers: Headers;
};

type ParsedApiResponse<T> = {
  payload: T | null;
  response: Response;
};

const REFRESH_SESSION_PATH = '/auth/refresh';

let refreshSessionPromise: Promise<AuthSession | null> | null = null;

function getEnvValue(key: string) {
  const envRecord: unknown = import.meta.env;

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

function isUnauthorizedStatus(statusCode: number) {
  return statusCode === 401 || statusCode === 403;
}

function isValidAuthSession(session: Partial<AuthSession> | null): session is AuthSession {
  return (
    session !== null &&
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.user?.email === 'string' &&
    typeof session.user?.firstName === 'string' &&
    typeof session.user?.id === 'number' &&
    typeof session.user?.lastName === 'string' &&
    typeof session.user?.role === 'string'
  );
}

function buildHeaders(
  headers?: HeadersInit,
  sessionOverride?: AuthSession | null,
  skipAuth = false,
) {
  const nextHeaders = new Headers(headers);
  const session = skipAuth ? null : sessionOverride ?? readAuthSession();

  if (!nextHeaders.has('Accept')) {
    nextHeaders.set('Accept', 'application/json');
  }

  if (session?.accessToken && !nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${session.accessToken}`);
  }

  return nextHeaders;
}

function prepareRequest(
  init?: ApiRequestInit,
  sessionOverride?: AuthSession | null,
): PreparedRequest {
  const headers = buildHeaders(init?.headers, sessionOverride, init?.skipAuth);
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

  return { body, headers };
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

async function parseResponsePayload<T>(response: Response) {
  if (response.status === 204) {
    return null as T | null;
  }

  return (await response.json().catch(() => null)) as T | null;
}

async function performFetch<T>(
  path: string,
  init?: ApiRequestInit,
  sessionOverride?: AuthSession | null,
): Promise<ParsedApiResponse<T>> {
  const { body, headers } = prepareRequest(init, sessionOverride);
  const {
    body: _rawBody,
    skipAuth: _skipAuth,
    skipRefresh: _skipRefresh,
    ...fetchInit
  } = init ?? {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchInit,
    body,
    credentials: fetchInit.credentials ?? 'include',
    headers,
  });

  return {
    payload: await parseResponsePayload<T>(response),
    response,
  };
}

async function refreshAuthSession(currentSession: AuthSession) {
  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  if (!currentSession.refreshToken) {
    clearAuthSession();
    return null;
  }

  refreshSessionPromise = (async () => {
    const { response, payload } = await performFetch<AuthSession>(REFRESH_SESSION_PATH, {
      body: { refreshToken: currentSession.refreshToken },
      method: 'POST',
    });

    if (!response.ok) {
      if (isUnauthorizedStatus(response.status)) {
        clearAuthSession();
        return null;
      }

      throw new ApiError(resolveErrorMessage(payload), response.status);
    }

    if (!isValidAuthSession(payload)) {
      throw new ApiError('No pudimos renovar la sesion.', response.status);
    }

    persistAuthSession(payload);
    return payload;
  })().finally(() => {
    refreshSessionPromise = null;
  });

  return refreshSessionPromise;
}

export async function apiRequest<T>(path: string, init?: ApiRequestInit) {
  const currentSession = init?.skipAuth ? null : readAuthSession();
  const initialResponse = await performFetch<T>(path, init);

  if (initialResponse.response.ok) {
    return initialResponse.payload as T;
  }

  if (
    isUnauthorizedStatus(initialResponse.response.status) &&
    !init?.skipRefresh &&
    currentSession?.accessToken &&
    path !== REFRESH_SESSION_PATH
  ) {
    const refreshedSession = await refreshAuthSession(currentSession);

    if (refreshedSession) {
      const retryResponse = await performFetch<T>(path, init, refreshedSession);

      if (retryResponse.response.ok) {
        return retryResponse.payload as T;
      }

      if (isUnauthorizedStatus(retryResponse.response.status)) {
        clearAuthSession();
      }

      throw new ApiError(resolveErrorMessage(retryResponse.payload), retryResponse.response.status);
    }
  }

  if (
    isUnauthorizedStatus(initialResponse.response.status) &&
    currentSession?.accessToken &&
    !currentSession.refreshToken
  ) {
    clearAuthSession();
  }

  throw new ApiError(
    resolveErrorMessage(initialResponse.payload),
    initialResponse.response.status,
  );
}
