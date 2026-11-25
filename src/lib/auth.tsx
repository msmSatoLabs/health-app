import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setMyTimeZone } from './api';
import { supabase } from './supabase';

function phoneTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

type AuthState = { session: Session | null; loading: boolean };

const AuthContext = createContext<AuthState>({ session: null, loading: true });

/** Keeps track of who is signed in, for the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ session, loading: false }));
    return () => data.subscription.unsubscribe();
  }, []);

  // Tell the database which time zone this phone is in, so "today" and the
  // rest-day deadline match the person's own clock. Errors are ignored:
  // it is retried next launch, and older databases don't have the function yet.
  const userId = state.session?.user.id;
  useEffect(() => {
    if (!userId) return;
    const tz = phoneTimeZone();
    if (tz) setMyTimeZone(tz).catch(() => {});
  }, [userId]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** The signed-in user's id. Only use inside screens that require sign-in. */
export function useUserId(): string {
  const { session } = useAuth();
  return session?.user.id ?? '';
}
