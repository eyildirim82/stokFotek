import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface UserRole {
  id: string;
  role: string;
  organization_id: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  currentOrgId: string | null;
  userRole: string | null;
  userRoles: UserRole[];
  setCurrentOrgId: (orgId: string) => void;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserOrganizations(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserOrganizations(session.user.id);
        } else {
          setCurrentOrgId(null);
          setUserRole(null);
          setUserRoles([]);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentOrgId && user) {
      loadUserRole(user.id, currentOrgId);
    }
  }, [currentOrgId, user]);

  async function loadUserOrganizations(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, role, organization_id')
        .eq('user_id', userId);

      if (error) throw error;

      setUserRoles(data || []);

      if (data && data.length > 0) {
        // Find default or first available org
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('default_organization_id')
          .eq('id', userId)
          .single();

        const targetOrgId = profileData?.default_organization_id || (data[0] as any).organization_id;
        setCurrentOrgId(targetOrgId);
      }
    } catch (error) {
      console.error('Error loading user organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserRole(userId: string, orgId: string) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single();

      if (error) throw error;
      setUserRole(((data as any)?.role as string) || null);
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole(null);
    }
  }

  async function refreshUserRole() {
    if (user && currentOrgId) {
      await loadUserRole(user.id, currentOrgId);
    }
  }

  async function handleSetCurrentOrgId(orgId: string) {
    setCurrentOrgId(orgId);

    if (user) {
      await supabase
        .from('user_profiles')
        .update({ default_organization_id: orgId } as any)
        .eq('id', user.id);
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    currentOrgId,
    userRole,
    userRoles,
    setCurrentOrgId: handleSetCurrentOrgId,
    signUp,
    signIn,
    signOut,
    refreshUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
