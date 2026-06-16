import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Check if Firebase configuration is provided
const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
export const isFirebaseConfigured = !!(apiKey && apiKey !== '');

let app: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let provider: any = null;

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
      projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
      storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
      messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
      appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim()
    };
    console.log('[Nyra Firebase] Initializing with config:', {
      apiKey: firebaseConfig.apiKey.substring(0, 10) + '...',
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId
    });
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    provider = new GoogleAuthProvider();
    console.log('[Nyra Firebase] Initialized successfully');
  } catch (error) {
    console.error('[Nyra Firebase] Initialization failed:', error);
  }
}

export const auth = authInstance || ({} as any);
export const db = dbInstance || ({} as any);
export const googleProvider = provider || ({} as any);


