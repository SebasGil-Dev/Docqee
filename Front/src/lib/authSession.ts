export type SessionUserRole = 'PATIENT' | 'PLATFORM_ADMIN' | 'STUDENT' | 'UNIVERSITY_ADMIN';

export type SessionUser = {
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  role: SessionUserRole;
  universityId?: number;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string | undefined;
  requiresPasswordChange?: boolean;
  user: SessionUser;
};

export const AUTH_SESSION_STORAGE_KEY = 'docqee.auth-session';
export const AUTH_SESSION_SYNC_EVENT = 'docqee:auth-session-sync';

function readLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function notifyAuthSessionChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_SYNC_EVENT));
}

function isValidAuthSession(session: Partial<AuthSession>): session is AuthSession {
  return (
    typeof session.accessToken === 'string' &&
    (session.refreshToken === undefined || typeof session.refreshToken === 'string') &&
    typeof session.user?.email === 'string' &&
    typeof session.user?.firstName === 'string' &&
    typeof session.user?.id === 'number' &&
    typeof session.user?.lastName === 'string' &&
    typeof session.user?.role === 'string'
  );
}

export function readAuthSession() {
  const storage = readLocalStorage();

  if (!storage) {
    return null;
  }

  const rawSession = storage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession) as Partial<AuthSession>;

    if (!isValidAuthSession(parsedSession)) {
      storage.removeItem(AUTH_SESSION_STORAGE_KEY);
      return null;
    }

    return parsedSession as AuthSession;
  } catch {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }
}

export function persistAuthSession(session: AuthSession) {
  const storage = readLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  notifyAuthSessionChange();
}

export function clearAuthSession() {
  const storage = readLocalStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(AUTH_SESSION_STORAGE_KEY);
  notifyAuthSessionChange();
}
