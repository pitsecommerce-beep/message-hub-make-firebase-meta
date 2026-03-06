import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppUser, UserRole, ModuleAccess } from '@/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string, role: UserRole, orgCode?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasModule: (module: ModuleAccess) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_EMAIL = 'pit.ecommerce@gmail.com';

function generateOrgCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoleModules(role: UserRole): ModuleAccess[] {
  switch (role) {
    case 'manager': return ['crm', 'wms'];
    case 'sales_agent': return ['crm'];
    case 'warehouse': return ['wms'];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function initFirebase() {
      const { auth } = await import('@/services/firebase');
      const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth');
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');

      getRedirectResult(auth).catch(() => {});

      onAuthStateChanged(auth, async (fbUser) => {
        if (cancelled) return;
        if (fbUser) {
          const userRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              ...data,
              uid: fbUser.uid,
              modules: data.modules || [],
              role: data.role || 'sales_agent',
            } as AppUser);
          } else {
            // Auto-create for Google sign-in or orphaned auth
            const isManager = fbUser.email === ADMIN_EMAIL;
            const role: UserRole = isManager ? 'manager' : 'sales_agent';
            const now = new Date().toISOString();
            const orgCode = generateOrgCode();
            const newUser: Omit<AppUser, 'uid'> = {
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email || 'Usuario',
              role,
              modules: getRoleModules(role),
              teamId: fbUser.uid,
              createdAt: now,
              updatedAt: now,
              isActive: true,
            };
            await setDoc(userRef, newUser);
            const teamRef = doc(db, 'teams', fbUser.uid);
            const teamDoc = await getDoc(teamRef);
            if (!teamDoc.exists()) {
              await setDoc(teamRef, {
                id: fbUser.uid,
                name: `${fbUser.displayName || 'Mi'} Team`,
                ownerId: fbUser.uid,
                orgCode,
                createdAt: now,
                settings: {
                  primaryColor: '#1a85e6',
                  aiProviders: [],
                  businessHours: {
                    timezone: 'America/Mexico_City',
                    schedule: Object.fromEntries(
                      ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => [
                        d,
                        { enabled: d !== 'sunday', start: '09:00', end: '18:00' },
                      ])
                    ),
                  },
                  metaConfig: {},
                  channelConnections: [],
                },
              });
            }
            setUser({ uid: fbUser.uid, ...newUser });
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    }

    initFirebase();
    return () => { cancelled = true; };
  }, []);

  const signInWithGoogle = async () => {
    const { auth } = await import('@/services/firebase');
    const { GoogleAuthProvider, signInWithRedirect } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole, orgCode?: string) => {
    const { auth } = await import('@/services/firebase');
    const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
    const { doc, setDoc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/services/firebase');

    let teamId: string;
    const now = new Date().toISOString();

    if (role === 'manager') {
      // Manager creates their own team
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      } catch (err: unknown) {
        if ((err as { code?: string }).code === 'auth/email-already-in-use') {
          cred = await signInWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }
      teamId = cred.user.uid;
      const code = generateOrgCode();

      const userRef = doc(db, 'users', cred.user.uid);
      const existingUser = await getDoc(userRef);
      if (!existingUser.exists()) {
        await setDoc(userRef, {
          email,
          displayName: name,
          role: 'manager',
          modules: ['crm', 'wms'],
          teamId,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });
        await setDoc(doc(db, 'teams', teamId), {
          id: teamId,
          name: `${name} Team`,
          ownerId: cred.user.uid,
          orgCode: code,
          createdAt: now,
          settings: {
            primaryColor: '#1a85e6',
            aiProviders: [],
            businessHours: {
              timezone: 'America/Mexico_City',
              schedule: Object.fromEntries(
                ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => [
                  d,
                  { enabled: d !== 'sunday', start: '09:00', end: '18:00' },
                ])
              ),
            },
            metaConfig: {},
            channelConnections: [],
          },
        });
      }
    } else {
      // Employee joins existing team via org code
      if (!orgCode) throw new Error('Se requiere un código de organización');

      // Find team by org code
      const teamsRef = collection(db, 'teams');
      const q = query(teamsRef, where('orgCode', '==', orgCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error('Código de organización no válido');

      const teamDoc = snap.docs[0];
      teamId = teamDoc.id;

      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      } catch (err: unknown) {
        if ((err as { code?: string }).code === 'auth/email-already-in-use') {
          cred = await signInWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }

      const userRef = doc(db, 'users', cred.user.uid);
      const existingUser = await getDoc(userRef);
      if (!existingUser.exists()) {
        await setDoc(userRef, {
          email,
          displayName: name,
          role,
          modules: getRoleModules(role),
          teamId,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { auth } = await import('@/services/firebase');
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOutFn = async () => {
    const { auth } = await import('@/services/firebase');
    const { signOut: firebaseSignOut } = await import('firebase/auth');
    await firebaseSignOut(auth);
    setUser(null);
  };

  const hasModule = (module: ModuleAccess) => {
    if (!user) return false;
    return Array.isArray(user.modules) && user.modules.includes(module);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut: signOutFn,
        hasModule,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
