import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { IS_TEST_MODE } from '@/lib/apiClient';
import { readCurrentSession } from '@/lib/authApi';
import { clearAuthSession, persistAuthSession, readAuthSession, type AuthSession } from '@/lib/authSession';

type AuthContextValue = {
  isAuthenticated: boolean;
  logout: () => void;
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
};

const fallbackAuthContext: AuthContextValue = {
  isAuthenticated: false,
  logout() {
    clearAuthSession();
  },
  session: null,
  setSession() {},
};

const AuthContext = createContext<AuthContextValue>(fallbackAuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<AuthSession | null>(() => readAuthSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: session !== null,
      logout() {
        clearAuthSession();
        setSessionState(null);
      },
      session,
      setSession(nextSession) {
        if (nextSession) {
          persistAuthSession(nextSession);
        } else {
          clearAuthSession();
        }

        setSessionState(nextSession);
      },
    }),
    [session],
  );

  useEffect(() => {
    if (IS_TEST_MODE || !session?.accessToken) {
      return;
    }

    let isCancelled = false;

    void readCurrentSession()
      .then((payload) => {
        if (isCancelled) {
          return;
        }

        setSessionState((currentSession) => {
          if (!currentSession) {
            return currentSession;
          }

          const nextSession = {
            ...currentSession,
            ...(typeof payload.requiresPasswordChange === 'boolean'
              ? { requiresPasswordChange: payload.requiresPasswordChange }
              : {}),
            user: payload.user,
          };

          persistAuthSession(nextSession);
          return nextSession;
        });
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        clearAuthSession();
        setSessionState(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [session?.accessToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
