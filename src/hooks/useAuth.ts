import { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously
} from '../firebase';

export interface LocalUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL?: string | null;
}

const LOCAL_GUEST_KEY = 'alphapulse_guest_session';

export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Trader',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        // Fallback to local guest trader if not authenticated via Firebase
        try {
          const savedGuest = localStorage.getItem(LOCAL_GUEST_KEY);
          if (savedGuest) {
            setUser(JSON.parse(savedGuest));
          } else {
            const guest: LocalUser = {
              uid: 'guest_' + Math.random().toString(36).substring(2, 7),
              displayName: 'Guest Trader',
              email: 'guest@alphapulse.com',
            };
            localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(guest));
            setUser(guest);
          }
        } catch {
          setUser({
            uid: 'guest_demo',
            displayName: 'Guest Trader',
            email: 'guest@alphapulse.com',
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const parseFirebaseError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/operation-not-allowed':
        return 'Email/Password authentication is disabled in Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method and enable "Email/Password".';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password. Please check your credentials or create a new account.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/unauthorized-domain':
        return 'Domain not authorized for Firebase Auth. Add "ais-dev-zgkh6u6fi3njlahmfweg6o-935406251629.asia-east1.run.app" to Firebase Console -> Authentication -> Settings -> Authorized Domains.';
      case 'auth/popup-closed-by-user':
        return 'Sign in popup closed before completion.';
      default:
        return err?.message || 'Authentication error occurred.';
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      return cred.user;
    } catch (err: any) {
      // If Firebase Auth fails due to disabled Email/Password provider, try local express endpoint fallback
      if (err?.code === 'auth/operation-not-allowed' || err?.code === 'auth/configuration-not-found') {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass }),
          });
          const data = await res.json();
          if (data.success) {
            const localU = {
              uid: data.user.uid,
              displayName: data.user.displayName,
              email: data.user.email,
            };
            setUser(localU);
            localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(localU));
            return localU;
          }
        } catch {
          // Ignore
        }
      }
      const msg = parseFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: name });
        setUser({
          uid: cred.user.uid,
          displayName: name,
          email: cred.user.email,
        });
      }
      return cred.user;
    } catch (err: any) {
      // Fallback to local session if Email/Password provider is not toggled in Firebase Console
      if (err?.code === 'auth/operation-not-allowed' || err?.code === 'auth/configuration-not-found') {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass, displayName: name }),
          });
          const data = await res.json();
          if (data.success) {
            const localU = {
              uid: data.user.uid,
              displayName: data.user.displayName,
              email: data.user.email,
            };
            setUser(localU);
            localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(localU));
            return localU;
          }
        } catch {
          // Ignore
        }
      }
      const msg = parseFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    } catch (err: any) {
      const msg = parseFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const loginAnonymously = async () => {
    setAuthError(null);
    try {
      const res = await signInAnonymously(auth);
      return res.user;
    } catch (err: any) {
      const msg = parseFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignore
    }
    localStorage.removeItem(LOCAL_GUEST_KEY);
    const guest: LocalUser = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 7),
      displayName: 'Guest Trader',
      email: 'guest@alphapulse.com',
    };
    localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(guest));
    setUser(guest);
  };

  const isGuest = !user || user.uid.startsWith('guest') || user.email === 'guest@alphapulse.com' || user.displayName === 'Guest Trader';

  return {
    user,
    isGuest,
    loading,
    authError,
    setAuthError,
    loginWithEmail,
    signUpWithEmail,
    loginWithGoogle,
    loginAnonymously,
    logout,
  };
}
