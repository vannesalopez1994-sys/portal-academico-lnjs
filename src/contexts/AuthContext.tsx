import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Usuarios } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Usuarios | null;
  userRole: string | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string, captchaValid?: boolean) => Promise<void>;
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

  const fetchProfile = async (userId: string, userEmail?: string, retries = 3, delayMs = 500): Promise<Usuarios | null> => {
    console.log(`Fetching profile for user: ${userId} (${userEmail}), retries left: ${retries}`);
    try {
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
      }

      if (data) {
        console.log('Profile fetched successfully by ID:', data);
        return data;
      }

      // Fallback por correo electrónico si el ID no coincide aún
      if (userEmail) {
        const { data: emailData } = await supabase
          .from('usuarios')
          .select('*, roles(nombre_rol)')
          .eq('correo', userEmail)
          .maybeSingle();

        if (emailData) {
          console.log('Profile found by email, syncing ID:', emailData);
          supabase.from('usuarios').update({ id: userId }).eq('correo', userEmail);
          return emailData;
        }
      }

      if (retries > 0) {
        console.warn(`Profile not found, retrying in ${delayMs}ms...`);
        await new Promise(res => setTimeout(res, delayMs));
        return fetchProfile(userId, userEmail, retries - 1, delayMs);
      }

      return null;
    } catch (err) {
      console.error('Fetch profile timed out or failed:', err);
      if (retries > 0) {
        return new Promise(res => setTimeout(res, delayMs)).then(() => fetchProfile(userId, userEmail, retries - 1, delayMs));
      }
      return null;
    }
  };

  const ensureProfileExists = async (user: User) => {
    try {
      // 1. Buscar primero por ID
      const { data: profileById } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileById) return;

      // 2. Buscar por correo para sincronizar ID si el usuario fue creado previamente
      if (user.email) {
        const { data: profileByEmail } = await supabase
          .from('usuarios')
          .select('*')
          .eq('correo', user.email)
          .maybeSingle();

        if (profileByEmail) {
          console.log('Syncing user ID in usuarios table for email:', user.email);
          await supabase
            .from('usuarios')
            .update({ id: user.id })
            .eq('correo', user.email);
          return;
        }
      }

      // 3. Crear perfil nuevo si no existe ni por ID ni por correo
      console.warn('Profile missing for user, creating default...');
      const { data: roles } = await supabase.from('roles').select('id_rol').eq('nombre_rol', 'Representante').maybeSingle();

      await supabase.from('usuarios').insert({
        id: user.id,
        nombre_completo: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
        correo: user.email!,
        id_rol: roles?.id_rol || 3,
        estado: 'activo'
      });
    } catch (err) {
      console.error('Error ensuring profile exists:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      console.log('Initializing Auth...');
      try {
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
              const profileData = await fetchProfile(session.user.id, session.user.email);
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
              const profileData = await fetchProfile(session.user.id, session.user.email);
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

  const signIn = async (email: string, password: string, captchaValid?: boolean) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password, captchaValid });
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
