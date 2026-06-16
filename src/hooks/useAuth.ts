import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  type User
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const SIMULATED_USER_KEY = 'nyra_simulated_user';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    console.log('[Nyra Auth] isFirebaseConfigured:', isFirebaseConfigured);

    if (!isFirebaseConfigured) {
      console.log('[Nyra Auth] Running in SIMULATION mode (no Firebase keys detected)');
      // Mock local storage simulation
      const savedUser = localStorage.getItem(SIMULATED_USER_KEY);
      const user = savedUser ? JSON.parse(savedUser) : null;
      setAuthState({ user, loading: false, error: null });
      return;
    }

    console.log('[Nyra Auth] Firebase is configured. Setting up auth listener...');

    // Capture the redirect sign-in result when returning to the page
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('[Nyra Auth] Successfully authenticated via Google Redirect:', result.user.email);
        }
      })
      .catch((error) => {
        console.error('[Nyra Auth] Google Redirect error:', error.code, error.message);
        setAuthState(prev => ({ ...prev, error: getErrorMessage(error.code, error.message), loading: false }));
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[Nyra Auth] Auth state changed:', user ? user.email : 'signed out');
      setAuthState({ user, loading: false, error: null });
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!isFirebaseConfigured) {
      const mockUser = {
        uid: 'mock-user-123',
        email,
        displayName,
        photoURL: null,
        emailVerified: true
      } as unknown as User;
      localStorage.setItem(SIMULATED_USER_KEY, JSON.stringify(mockUser));
      setAuthState({ user: mockUser, loading: false, error: null });
      return mockUser;
    }

    try {
      setAuthState(prev => ({ ...prev, error: null, loading: true }));
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await firebaseUpdateProfile(result.user, { displayName });
      return result.user;
    } catch (err: any) {
      console.error('[Nyra Auth] Sign up error:', err.code, err.message);
      const message = getErrorMessage(err.code, err.message);
      setAuthState(prev => ({ ...prev, error: message, loading: false }));
      throw new Error(message);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      const mockUser = {
        uid: 'mock-user-123',
        email,
        displayName: email.split('@')[0],
        photoURL: null,
        emailVerified: true
      } as unknown as User;
      localStorage.setItem(SIMULATED_USER_KEY, JSON.stringify(mockUser));
      setAuthState({ user: mockUser, loading: false, error: null });
      return mockUser;
    }

    try {
      setAuthState(prev => ({ ...prev, error: null, loading: true }));
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err: any) {
      console.error('[Nyra Auth] Sign in error:', err.code, err.message);
      const message = getErrorMessage(err.code, err.message);
      setAuthState(prev => ({ ...prev, error: message, loading: false }));
      throw new Error(message);
    }
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      const mockUser = {
        uid: 'mock-user-123',
        email: 'aria.google@example.com',
        displayName: 'Aria',
        photoURL: null,
        emailVerified: true
      } as unknown as User;
      localStorage.setItem(SIMULATED_USER_KEY, JSON.stringify(mockUser));
      setAuthState({ user: mockUser, loading: false, error: null });
      return mockUser;
    }

    try {
      setAuthState(prev => ({ ...prev, error: null, loading: true }));

      // Auto-detect mobile devices for redirect flow (since mobile blocks popups)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        console.log('[Nyra Auth] Mobile detected — using signInWithRedirect');
        await signInWithRedirect(auth, googleProvider);
        return new Promise<User>(() => {}); // Redirects page - resolve nothing
      }

      // Desktop: try popup first
      console.log('[Nyra Auth] Desktop detected — trying signInWithPopup');
      try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('[Nyra Auth] Popup sign-in succeeded:', result.user.email);
        return result.user;
      } catch (popupErr: any) {
        // Only fallback to redirect for popup-blocked errors, not for config errors
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
          console.warn('[Nyra Auth] Popup blocked/closed. Falling back to redirect...', popupErr.code);
          await signInWithRedirect(auth, googleProvider);
          return new Promise<User>(() => {}); // Redirects page - resolve nothing
        }
        // For all other errors (unauthorized-domain, etc.), throw immediately
        throw popupErr;
      }
    } catch (err: any) {
      console.error('[Nyra Auth] Google sign-in error:', err.code, err.message);
      const message = getErrorMessage(err.code, err.message);
      setAuthState(prev => ({ ...prev, error: message, loading: false }));
      throw new Error(message);
    }
  };

  const signOut = async () => {
    if (!isFirebaseConfigured) {
      localStorage.removeItem(SIMULATED_USER_KEY);
      setAuthState({ user: null, loading: false, error: null });
      return;
    }

    try {
      await firebaseSignOut(auth);
    } catch (err: any) {
      setAuthState(prev => ({ ...prev, error: err.message }));
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    clearError
  };
};

function getErrorMessage(code: string, rawMessage?: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Please enable Email/Password and Google in your Firebase Console → Authentication → Sign-in method.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by browser';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Firebase Auth. Go to Firebase Console → Authentication → Settings → Authorized domains and add: ' + window.location.hostname;
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API key. Check your environment variables.';
    default:
      return `Auth error (${code || 'unknown'}): ${rawMessage || 'Please try again'}`;
  }
}


