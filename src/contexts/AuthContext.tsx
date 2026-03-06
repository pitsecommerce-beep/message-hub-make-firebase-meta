import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppUser, UserRole, ModuleAccess } from '@/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasModule: (module: ModuleAccess) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const IS_DEMO = !import.meta.env.VITE_FIREBASE_API_KEY;

const demoUser: AppUser = {
  uid: 'demo-admin',
  email: 'admin@demo.com',
  displayName: 'Admin Demo',
  role: 'admin',
  modules: ['crm', 'wms'],
  teamId: 'demo-team',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-03-06T00:00:00Z',
  isActive: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(IS_DEMO ? demoUser : null);
  const [loading, setLoading] = useState(!IS_DEMO);

  useEffect(() => {
    if (IS_DEMO) return;

    let cancelled = false;

    async function initFirebase() {
      const { auth } = await import('@/services/firebase');
      const { onAuthStateChanged } = await import('firebase/auth');
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');

      onAuthStateChanged(auth, async (fbUser) => {
        if (cancelled) return;
        if (fbUser) {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: fbUser.uid, ...userDoc.data() } as AppUser);
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

  const signIn = async (email: string, password: string) => {
    if (IS_DEMO) {
      setUser(demoUser);
      return;
    }
    const { auth } = await import('@/services/firebase');
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    if (IS_DEMO) {
      setUser(demoUser);
      return;
    }
    const { auth, db } = await import('@/services/firebase');
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const { doc, getDoc, setDoc } = await import('firebase/firestore');

    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const fbUser = cred.user;

    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
    if (!userDoc.exists()) {
      const now = new Date().toISOString();
      const newUser: Omit<AppUser, 'uid'> = {
        email: fbUser.email || '',
        displayName: fbUser.displayName || 'Usuario',
        role: 'admin',
        modules: ['crm', 'wms'],
        teamId: fbUser.uid,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      };
      await setDoc(doc(db, 'users', fbUser.uid), newUser);
      await setDoc(doc(db, 'teams', fbUser.uid), {
        id: fbUser.uid,
        name: `${fbUser.displayName || 'Mi'} Team`,
        ownerId: fbUser.uid,
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
        },
      });
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (IS_DEMO) {
      setUser({ ...demoUser, displayName: name, email });
      return;
    }
    const { auth, db } = await import('@/services/firebase');
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const { doc, setDoc } = await import('firebase/firestore');

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const now = new Date().toISOString();
    const newUser: Omit<AppUser, 'uid'> = {
      email,
      displayName: name,
      role: 'admin',
      modules: ['crm', 'wms'],
      teamId: cred.user.uid,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await setDoc(doc(db, 'users', cred.user.uid), newUser);
    await setDoc(doc(db, 'teams', cred.user.uid), {
      id: cred.user.uid,
      name: `${name}'s Team`,
      ownerId: cred.user.uid,
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
      },
    });
    setUser({ uid: cred.user.uid, ...newUser });
  };

  const signOutFn = async () => {
    if (!IS_DEMO) {
      const { auth } = await import('@/services/firebase');
      const { signOut: firebaseSignOut } = await import('firebase/auth');
      await firebaseSignOut(auth);
    }
    setUser(null);
  };

  const hasModule = (module: ModuleAccess) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.modules.includes(module);
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
