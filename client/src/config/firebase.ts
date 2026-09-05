import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signOut,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';

export interface FirebaseConfigObject {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// Check env vars first, then check localStorage
const getInitialFirebaseConfig = (): FirebaseConfigObject => {
  const envConfig: FirebaseConfigObject = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };

  if (envConfig.apiKey && envConfig.authDomain && envConfig.projectId) {
    return envConfig;
  }

  try {
    const saved = localStorage.getItem('medlens_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.authDomain && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }

  return envConfig;
};

export const currentFirebaseConfig = getInitialFirebaseConfig();

export const isFirebaseConfigured = Boolean(
  currentFirebaseConfig.apiKey && 
  currentFirebaseConfig.authDomain && 
  currentFirebaseConfig.projectId
);

export const missingFirebaseEnvVars: string[] = [];
if (!currentFirebaseConfig.apiKey) missingFirebaseEnvVars.push('VITE_FIREBASE_API_KEY');
if (!currentFirebaseConfig.authDomain) missingFirebaseEnvVars.push('VITE_FIREBASE_AUTH_DOMAIN');
if (!currentFirebaseConfig.projectId) missingFirebaseEnvVars.push('VITE_FIREBASE_PROJECT_ID');
if (!currentFirebaseConfig.storageBucket) missingFirebaseEnvVars.push('VITE_FIREBASE_STORAGE_BUCKET');
if (!currentFirebaseConfig.messagingSenderId) missingFirebaseEnvVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
if (!currentFirebaseConfig.appId) missingFirebaseEnvVars.push('VITE_FIREBASE_APP_ID');

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export const initFirebase = (config: FirebaseConfigObject): boolean => {
  try {
    if (!config.apiKey || !config.authDomain || !config.projectId) return false;
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    return true;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return false;
  }
};

if (isFirebaseConfigured) {
  initFirebase(currentFirebaseConfig);
}

export const saveFirebaseConfig = (config: FirebaseConfigObject): boolean => {
  try {
    localStorage.setItem('medlens_firebase_config', JSON.stringify(config));
    return initFirebase(config);
  } catch (e) {
    return false;
  }
};

export { 
  app, 
  auth, 
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
};
export type { ConfirmationResult, FirebaseUser };
