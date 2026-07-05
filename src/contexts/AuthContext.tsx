import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Usuarios } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Usuarios | null;
  userRole: string | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Usuarios | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const normalizeRole = (roleName: string | undefined): string | null => {
    if (!roleName) return null;
    const name = roleName.toLowerCase();
    if (name.includes('admin')) return 'admin';
    if (name.includes('secre')) return 'secretary';
    if (name.includes('repre') || name.includes('parent')) return 'parent';
    return name;
  };

  const fetchProfile = async (userId: string, retries = 3, delayMs = 500): Promise<Usuarios | null> => {
    console.log(`Fetching profile for user: ${userId}, retries left: ${retries}`);
    try {
      // Add a timeout to prevent hanging the whole app
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );

      const fetchPromise = supabase
        .from('usuarios')
        .select('*, roles(nombre_rol)')
        .eq('id', userId)
        .maybeSingle();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (!data && retries > 0) {
        console.warn(`Profile not found, retrying in ${delayMs}ms...`);
        await new Promise(res => setTimeout(res, delayMs));
        return fetchProfile(userId, retries - 1, delayMs);
      }

      console.log('Profile fetched successfully:', data);
      return data;
    } catch (err) {
      console.error('Fetch profile timed out or failed:', err);
      if (retries > 0) {
        return new Promise(res => setTimeout(res, delayMs)).then(() => fetchProfile(userId, retries - 1, delayMs));
      }
      return null;
    }
  };

  const ensureProfileExists = async (user: User) => {
    try {
      const { data: profile } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        console.warn('Profile missing for user, creating default...');
        const { data: roles } = await supabase.from('roles').select('id_rol').eq('nombre_rol', 'Representante').maybeSingle();

        await supabase.from('usuarios').insert({
          id: user.id,
          nombre_completo: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          correo: user.email!,
          id_rol: roles?.id_rol
        });
      }
    } catch (err) {
      console.error('Error ensuring profile exists:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      console.log('Initializing Auth...');
      try {
        // Add a general timeout for auth initialization
        const authTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth init timeout')), 15000)
        );

        const authPromise = (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('Session fetched:', session ? 'User session found' : 'No session');
          setUser(session?.user ?? null);
          if (session?.user) {
            setProfileLoading(true);
            try {
              await ensureProfileExists(session.user);
              const profileData = await fetchProfile(session.user.id);
              if (!profileData) {
                console.warn('Session user has no profile in db. Logging out...');
                await supabase.auth.signOut();
                setProfile(null);
                setUserRole(null);
                setUser(null);
              } else {
                setProfile(profileData);
                setUserRole(normalizeRole(profileData?.roles?.nombre_rol));
              }
            } finally {
              setProfileLoading(false);
            }
          }
        })();

        await Promise.race([authPromise, authTimeout]);
      } catch (error) {
        console.error('Error initializing auth or timeout:', error);
      } finally {
        console.log('Auth initialization complete, setting loading to false.');
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        try {
          setUser(session?.user ?? null);
          if (session?.user) {
            if (event === 'SIGNED_IN') {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            setProfileLoading(true);
            try {
              await ensureProfileExists(session.user);
              const profileData = await fetchProfile(session.user.id);
              if (!profileData) {
                console.warn('Session user has no profile in db. Logging out...');
                await supabase.auth.signOut();
                setProfile(null);
                setUserRole(null);
                setUser(null);
              } else {
                setProfile(profileData);
                setUserRole(normalizeRole(profileData?.roles?.nombre_rol));
              }
            } finally {
              setProfileLoading(false);
            }
          } else {
            setProfile(null);
            setUserRole(null);
            setProfileLoading(false);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (user || localStorage.getItem('local_session')) {
      console.log('User already signed in or session exists in localStorage, skipping signIn call.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          full_name: fullName,
          role: role,
        }
      }
    });

    if (error) throw error;

    // We shouldn't update the `profiles` table anymore. The `usuarios` table 
    // needs to map roles. Wait, in Supabase Auth, how do we insert the user into `usuarios` 
    // now since the Database trigger was possibly dropped?
    // We should ideally call a custom sign_up RPC or rely on a trigger.
    // If phone isn't supported in `usuarios`, we just ignore it.

    // Attempting to manually create the row doesn't hurt if RLS allows it, but 
    // for this task, the database migration handles user creation if they added a Trigger.
    // However, I didn't add a trigger to my 11-tables migration.
    // I need to insert it manually or let a trigger handle it.
    // I will insert it manually for safety if it doesn't exist, and update it.

    if (data.user) {
      // Find role ID
      const authRoleMap: Record<string, string> = {
        'admin': 'Administrador',
        'secretary': 'Secretaría',
        'representative': 'Representante',
        'parent': 'Representante'
      };

      const { data: roleData } = await supabase
        .from('roles')
        .select('id_rol')
        .eq('nombre_rol', authRoleMap[role] || 'Representante')
        .maybeSingle();

      const { error: insertError } = await supabase
        .from('usuarios')
        .upsert({
          id: data.user.id,
          id_rol: roleData?.id_rol,
          nombre_completo: fullName,
          correo: email,
        });

      if (insertError) {
        console.error('Error inserting user:', insertError);
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userRole,
        loading,
        profileLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
