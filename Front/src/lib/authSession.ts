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
  requiresPasswordChange?: boolean;
  user: SessionUser;
};

export const AUTH_SESSION_STORAGE_KEY = 'docqee.auth-session';

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

    if (
      typeof parsedSession.accessToken !== 'string' ||
      typeof parsedSession.user?.email !== 'string' ||
      typeof parsedSession.user?.firstName !== 'string' ||
      typeof parsedSession.user?.id !== 'number' ||
      typeof parsedSession.user?.lastName !== 'string' ||
      typeof parsedSession.user?.role !== 'string'
    ) {
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
}

export function clearAuthSession() {
  const storage = readLocalStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(AUTH_SESSION_STORAGE_KEY);
}
