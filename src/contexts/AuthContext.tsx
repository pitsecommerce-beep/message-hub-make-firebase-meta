import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppUser, UserRole, ModuleAccess } from '@/types';

interface PendingGoogleUser {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  pendingGoogleUser: PendingGoogleUser | null;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string, role: UserRole, orgCode?: string) => Promise<void>;
  completeGoogleSignUp: (role: UserRole, orgCode?: string) => Promise<void>;
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
  const [pendingGoogleUser, setPendingGoogleUser] = useState<PendingGoogleUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initFirebase() {
      const { auth } = await import('@/services/firebase');
      const { onAuthStateChanged } = await import('firebase/auth');
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');

      onAuthStateChanged(auth, async (fbUser) => {
        if (cancelled) return;
        if (fbUser) {
          try {
            const userRef = doc(db, 'users', fbUser.uid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              // Existing user — sign in directly
              const data = userDoc.data();
              setUser({
                ...data,
                uid: fbUser.uid,
                modules: data.modules || [],
                role: data.role || 'sales_agent',
              } as AppUser);
              setPendingGoogleUser(null);
            } else {
              // New user from Google — needs role selection
              // Exception: admin email auto-creates as manager
              if (fbUser.email === ADMIN_EMAIL) {
                await createUserAndTeam(fbUser.uid, fbUser.email || '', fbUser.displayName || 'Admin', 'manager');
              } else {
                setPendingGoogleUser({
                  uid: fbUser.uid,
                  email: fbUser.email || '',
                  displayName: fbUser.displayName || fbUser.email || '',
                });
                setUser(null);
              }
            }
          } catch (err) {
            console.error('Auth state error:', err);
            setUser(null);
          }
        } else {
          setUser(null);
          setPendingGoogleUser(null);
        }
        setLoading(false);
      });
    }

    initFirebase();
    return () => { cancelled = true; };
  }, []);

  async function createUserAndTeam(uid: string, email: string, displayName: string, role: UserRole, teamId?: string) {
    const { doc, setDoc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/services/firebase');

    const now = new Date().toISOString();
    const actualTeamId = teamId || uid;
    const newUser: Omit<AppUser, 'uid'> = {
      email,
      displayName,
      role,
      modules: getRoleModules(role),
      teamId: actualTeamId,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, newUser);

    // If manager, create team
    if (role === 'manager' && !teamId) {
      const teamRef = doc(db, 'teams', uid);
      const teamDoc = await getDoc(teamRef);
      if (!teamDoc.exists()) {
        await setDoc(teamRef, {
          id: uid,
          name: `${displayName} Team`,
          ownerId: uid,
          orgCode: generateOrgCode(),
          createdAt: now,
          settings: {
            primaryColor: '#1a85e6',
            aiProviders: [],
            businessHours: {
              timezone: 'America/Mexico_City',
              schedule: Object.fromEntries(
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => [
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
    }

    const appUser: AppUser = { uid, ...newUser };
    setUser(appUser);
    setPendingGoogleUser(null);
  }

  const completeGoogleSignUp = async (role: UserRole, orgCode?: string) => {
    if (!pendingGoogleUser) throw new Error('No hay usuario pendiente');

    const { uid, email, displayName } = pendingGoogleUser;

    if (role !== 'manager') {
      // Employee — validate org code and join team
      if (!orgCode) throw new Error('Se requiere un código de organización');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');
      const teamsRef = collection(db, 'teams');
      const q = query(teamsRef, where('orgCode', '==', orgCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error('Código de organización no válido');
      const teamId = snap.docs[0].id;
      await createUserAndTeam(uid, email, displayName, role, teamId);
    } else {
      // Manager — create new team
      await createUserAndTeam(uid, email, displayName, role);
    }
  };

  const signInWithGoogle = async () => {
    const { auth } = await import('@/services/firebase');
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    // onAuthStateChanged will handle the rest
    if (result.user) {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        if (result.user.email === ADMIN_EMAIL) {
          await createUserAndTeam(result.user.uid, result.user.email || '', result.user.displayName || 'Admin', 'manager');
        } else {
          setPendingGoogleUser({
            uid: result.user.uid,
            email: result.user.email || '',
            displayName: result.user.displayName || result.user.email || '',
          });
        }
      }
    }
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole, orgCode?: string) => {
    const { auth } = await import('@/services/firebase');
    const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
    const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/services/firebase');

    let teamId: string | undefined;

    if (role !== 'manager') {
      if (!orgCode) throw new Error('Se requiere un código de organización');
      const teamsRef = collection(db, 'teams');
      const q = query(teamsRef, where('orgCode', '==', orgCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error('Código de organización no válido');
      teamId = snap.docs[0].id;
    }

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
      await createUserAndTeam(cred.user.uid, email, name, role, teamId);
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
    setPendingGoogleUser(null);
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
        pendingGoogleUser,
        signIn,
        signInWithGoogle,
        signUp,
        completeGoogleSignUp,
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
