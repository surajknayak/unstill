import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  terminate,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
};

const envDatabaseId =
  typeof import.meta.env.VITE_FIREBASE_DATABASE_ID === 'string'
    ? import.meta.env.VITE_FIREBASE_DATABASE_ID.trim()
    : '';

export const databaseId =
  envDatabaseId || appletConfig.firestoreDatabaseId || '(default)';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      { experimentalAutoDetectLongPolling: true },
      databaseId
    );
  } catch {
    return getFirestore(app, databaseId);
  }
}

export let db: Firestore = createFirestoreInstance();

let resettingFirestorePromise: Promise<Firestore> | null = null;

/**
 * Terminates the current Firestore instance and recreates it with
 * experimentalAutoDetectLongPolling: true when stalled streams or consecutive
 * sync failures occur.
 */
export async function resetFirestoreConnection(): Promise<Firestore> {
  if (resettingFirestorePromise) {
    return resettingFirestorePromise;
  }
  resettingFirestorePromise = (async () => {
    try {
      if (typeof terminate === 'function') {
        await Promise.race([
          terminate(db),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    } catch (err) {
      console.warn('[UnStill Firebase] terminate(db) warning:', err);
    }
    db = createFirestoreInstance();
    return db;
  })().finally(() => {
    resettingFirestorePromise = null;
  });
  return resettingFirestorePromise;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Ensure browserLocalPersistence as required
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence setup warning:', err);
});

// Validate connection to Firestore on boot without blocking
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
