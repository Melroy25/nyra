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
    if (!isFirebaseConfigured) {
      // Mock local storage simulation
      const savedUser = localStorage.getItem(SIMULATED_USER_KEY);
      const user = savedUser ? JSON.parse(savedUser) : null;
      setAuthState({ user, loading: false, error: null });
      return;
    }

    // Capture the redirect sign-in result when returning to the page
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('Successfully authenticated via Google Redirect:', result.user);
        }
      })
      .catch((error) => {
        console.error('Google Redirect authentication error:', error);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
      console.error('Sign up error details:', err);
      const message = getErrorMessage(err.code);
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
      console.error('Sign in error details:', err);
      const message = getErrorMessage(err.code);
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
        console.log('Mobile browser detected. Performing Google Redirect...');
        await signInWithRedirect(auth, googleProvider);
        return new Promise<User>(() => {}); // Redirects page - resolve nothing
      }

      try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      } catch (popupErr: any) {
        console.warn('Google Popup blocked or failed. Trying Redirect fallback...', popupErr);
        await signInWithRedirect(auth, googleProvider);
        return new Promise<User>(() => {}); // Redirects page - resolve nothing
      }
    } catch (err: any) {
      console.error('Google sign in error details:', err);
      const message = getErrorMessage(err.code);
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

function getErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled';
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
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'auth/unauthorized-domain':
      return 'Domain not authorized. Please add nyra-steel.vercel.app to Authorized Domains in your Firebase Console Settings.';
    default:
      return 'Something went wrong. Please try again';
  }
}

