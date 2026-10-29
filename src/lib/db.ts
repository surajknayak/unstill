import { openDB, deleteDB, IDBPDatabase, IDBPTransaction } from 'idb';
import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  writeBatch,
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb, auth } from './firebase';
import {
  UserProfile,
  SchedulePrefs,
  DailyPlan,
  SessionLog,
  PainLog,
  StreakData,
  CustomWorkout,
  ReportCategory,
  LastWriteResult,
  Level,
  Goal,
  CheerStyle,
} from '../types';
import { APP_VERSION } from '../config';

export const DB_NAME = 'habit-flow-db';
export const DB_VERSION = 3;

export type ObjectStoreName =
  | 'profile'
  | 'schedule'
  | 'plans'
  | 'sessions'
  | 'painLogs'
  | 'streaks'
  | 'workouts'
  | 'logs'
  | 'feedback'
  | 'reportsQueue'
  | 'syncQueue'
  | 'settings';

export interface StoreIndexDefinition {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

export interface ObjectStoreDefinition {
  name: ObjectStoreName;
  options?: IDBObjectStoreParameters;
  indexes?: StoreIndexDefinition[];
  introducedInVersion: number;
}

/**
 * Single canonical list of all IndexedDB object stores used by the application.
 */
export const OBJECT_STORE_DEFINITIONS: readonly ObjectStoreDefinition[] = [
  { name: 'profile', introducedInVersion: 1 },
  { name: 'schedule', introducedInVersion: 1 },
  {
    name: 'plans',
    options: { keyPath: 'date' },
    indexes: [{ name: 'by_date', keyPath: 'date' }],
    introducedInVersion: 1,
  },
  {
    name: 'sessions',
    options: { keyPath: 'id' },
    indexes: [{ name: 'by_date', keyPath: 'date' }],
    introducedInVersion: 1,
  },
  {
    name: 'painLogs',
    options: { keyPath: 'id' },
    indexes: [{ name: 'by_date', keyPath: 'date' }],
    introducedInVersion: 1,
  },
  { name: 'streaks', introducedInVersion: 1 },
  {
    name: 'workouts',
    options: { keyPath: 'id' },
    introducedInVersion: 1,
  },
  {
    name: 'syncQueue',
    options: { keyPath: 'id' },
    indexes: [{ name: 'by_uid', keyPath: 'uid' }],
    introducedInVersion: 2,
  },
  {
    name: 'logs',
    options: { keyPath: 'id' },
    indexes: [{ name: 'by_date', keyPath: 'date' }],
    introducedInVersion: 3,
  },
  {
    name: 'feedback',
    options: { keyPath: 'id' },
    introducedInVersion: 3,
  },
  {
    name: 'reportsQueue',
    options: { keyPath: 'id' },
    introducedInVersion: 3,
  },
  {
    name: 'settings',
    introducedInVersion: 3,
  },
] as const;

export const OBJECT_STORE_NAMES: readonly ObjectStoreName[] = OBJECT_STORE_DEFINITIONS.map(
  (d) => d.name
);

const STORE_DEF_MAP: Record<ObjectStoreName, ObjectStoreDefinition> =
  OBJECT_STORE_DEFINITIONS.reduce(
    (acc, def) => {
      acc[def.name] = def;
      return acc;
    },
    {} as Record<ObjectStoreName, ObjectStoreDefinition>
  );

// In-memory fallback store used when IndexedDB is unavailable (private mode, blocked, etc.)
const memoryFallbackStores = new Map<ObjectStoreName, Map<string, any>>();
let isUsingMemoryFallback = false;

function getMemoryStore(storeName: ObjectStoreName): Map<string, any> {
  let store = memoryFallbackStores.get(storeName);
  if (!store) {
    store = new Map<string, any>();
    memoryFallbackStores.set(storeName, store);
  }
  return store;
}

export function isIndexedDBFallbackActive(): boolean {
  return isUsingMemoryFallback;
}

function ensureStoreAndIndexes(
  db: IDBPDatabase,
  tx: IDBPTransaction<unknown, string[], 'versionchange'> | null,
  def: ObjectStoreDefinition
) {
  let store: any = null;
  if (!db.objectStoreNames.contains(def.name)) {
    store = def.options ? db.createObjectStore(def.name, def.options) : db.createObjectStore(def.name);
  } else if (tx) {
    try {
      store = tx.objectStore(def.name);
    } catch {
      store = null;
    }
  }

  if (store && def.indexes) {
    for (const idx of def.indexes) {
      try {
        if (store.indexNames && !store.indexNames.contains(idx.name)) {
          store.createIndex(idx.name, idx.keyPath, idx.options);
        }
      } catch {
        // Ignore index creation error on legacy store if keyPath differs
      }
    }
  }
}

/**
 * Versioned migration function called inside onupgradeneeded.
 * Never deletes existing stores or data; creates any missing store/index per version step.
 */
export function upgradeDatabaseSchema(
  db: IDBPDatabase,
  oldVersion: number,
  _newVersion: number | null,
  transaction: IDBPTransaction<unknown, string[], 'versionchange'> | null = null
) {
  // Step 1: v1 stores
  if (oldVersion < 1) {
    for (const def of OBJECT_STORE_DEFINITIONS.filter((d) => d.introducedInVersion === 1)) {
      ensureStoreAndIndexes(db, transaction, def);
    }
  }

  // Step 2: v2 stores
  if (oldVersion < 2) {
    for (const def of OBJECT_STORE_DEFINITIONS.filter((d) => d.introducedInVersion === 2)) {
      ensureStoreAndIndexes(db, transaction, def);
    }
  }

  // Step 3: v3 stores + full verification of all canonical stores so older partial builds self-heal
  if (oldVersion < 3) {
    for (const def of OBJECT_STORE_DEFINITIONS) {
      ensureStoreAndIndexes(db, transaction, def);
    }
  }

  // Safety net for any future version bumps: ensure every store in OBJECT_STORE_DEFINITIONS exists
  for (const def of OBJECT_STORE_DEFINITIONS) {
    ensureStoreAndIndexes(db, transaction, def);
  }
}

let dbPromise: Promise<IDBPDatabase> | null = null;
let activeDbInstance: IDBPDatabase | null = null;
let repairPromise: Promise<IDBPDatabase | null> | null = null;

function isMissingStoreOrCorruptedError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as any)?.name || '';
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    name === 'NotFoundError' ||
    name === 'InvalidStateError' ||
    name === 'VersionError' ||
    lower.includes('object stores was not found') ||
    lower.includes('object store was not found') ||
    lower.includes('not a known object store') ||
    lower.includes('corrupted') ||
    lower.includes('backing store') ||
    lower.includes('internal error')
  );
}

function closeActiveDBConnection() {
  if (activeDbInstance) {
    try {
      activeDbInstance.close();
    } catch {
      // ignore close errors
    }
    activeDbInstance = null;
  }
  dbPromise = null;
}

export function resetLocalDBConnectionForTest() {
  closeActiveDBConnection();
  repairPromise = null;
  isUsingMemoryFallback = false;
  memoryFallbackStores.clear();
  lastWriteResultState = { status: 'idle', path: '', timestamp: 0, error: null };
  lastReadWriteErrorState = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hf_last_write_result');
      localStorage.removeItem('hf_last_rw_error');
    }
  } catch {
    // ignore
  }
}

function isGuestSession(): boolean {
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    return false;
  }
  return true;
}

async function exportGuestBackupBeforeRepair(db: IDBPDatabase | null): Promise<void> {
  if (!isGuestSession() || !db) return;
  try {
    const backupPayload: Record<string, any> = {};
    let hasAnyData = false;
    const existingStores = Array.from(db.objectStoreNames || []);

    for (const storeName of existingStores) {
      try {
        const items = await db.getAll(storeName);
        if (Array.isArray(items) && items.length > 0) {
          backupPayload[storeName] = items;
          hasAnyData = true;
        }
      } catch {
        // Ignore unreadable store during salvage
      }
    }

    if (!hasAnyData) return;

    const exportObj = {
      app: 'UnStill',
      reason: 'local_db_schema_repair_backup',
      exportedAt: new Date().toISOString(),
      data: backupPayload,
    };
    const jsonString = JSON.stringify(exportObj, null, 2);

    try {
      localStorage.setItem('hf_guest_backup_json', jsonString);
    } catch {
      // Ignore quota errors
    }

    if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        const blob = new Blob([jsonString], { type: 'application/json' });
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `habit-flow-guest-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.style.display = 'none';
          document.body?.appendChild(a);
          a.click();
          document.body?.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch {
        // Ignore DOM download errors
      }
    }
  } catch (e) {
    console.warn('[UnStill DB] Could not salvage guest backup prior to DB repair:', e);
  }
}

async function openLocalDBInternal(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined' || !indexedDB) {
    isUsingMemoryFallback = true;
    throw new Error('IndexedDB is unavailable in this environment.');
  }

  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(upgradeDb, oldVersion, newVersion, transaction) {
      upgradeDatabaseSchema(upgradeDb, oldVersion, newVersion, transaction);
    },
    blocked(currentVersion, blockedVersion) {
      console.warn(
        `[UnStill DB] Upgrade from v${currentVersion} to v${blockedVersion} is blocked by an open connection. Closing stale connection.`
      );
      closeActiveDBConnection();
    },
    blocking(currentVersion, blockedVersion) {
      console.info(
        `[UnStill DB] Closing active v${currentVersion} connection to allow upgrade to v${blockedVersion}.`
      );
      closeActiveDBConnection();
    },
    terminated() {
      console.warn('[UnStill DB] Database connection terminated unexpectedly by browser.');
      closeActiveDBConnection();
    },
  });

  // Also ensure native onversionchange closes the connection cleanly
  db.onversionchange = () => {
    try {
      db.close();
    } catch {
      // ignore
    }
    if (activeDbInstance === db) {
      activeDbInstance = null;
      dbPromise = null;
    }
  };

  activeDbInstance = db;
  isUsingMemoryFallback = false;
  return db;
}

function getLocalDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openLocalDBInternal().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/**
 * Closes the DB, exports guest backup if applicable, deletes only the local cache DB,
 * and recreates it with the current schema (DB_VERSION).
 */
export async function repairLocalCacheDB(): Promise<IDBPDatabase | null> {
  if (repairPromise) {
    return repairPromise;
  }

  repairPromise = (async () => {
    try {
      console.warn('[UnStill DB] Repairing local IndexedDB cache schema...');
      if (activeDbInstance) {
        await exportGuestBackupBeforeRepair(activeDbInstance);
      }
      closeActiveDBConnection();

      if (typeof indexedDB !== 'undefined' && indexedDB) {
        await deleteDB(DB_NAME, {
          blocked() {
            closeActiveDBConnection();
          },
        });
      }

      const freshDb = await getLocalDB();
      return freshDb;
    } catch (err) {
      console.warn('[UnStill DB] Local DB repair failed; switching to in-memory fallback:', err);
      isUsingMemoryFallback = true;
      closeActiveDBConnection();
      return null;
    } finally {
      repairPromise = null;
    }
  })();

  return repairPromise;
}

/**
 * Checks whether all required stores exist in IndexedDB; if any are missing, repairs the local cache DB.
 */
export async function ensureLocalDBHealthy(): Promise<void> {
  if (isUsingMemoryFallback) return;
  try {
    const db = await getLocalDB();
    const missingStore = OBJECT_STORE_NAMES.some((name) => !db.objectStoreNames.contains(name));
    if (missingStore) {
      await repairLocalCacheDB();
    }
  } catch (err) {
    if (isMissingStoreOrCorruptedError(err)) {
      await repairLocalCacheDB();
    } else {
      isUsingMemoryFallback = true;
    }
  }
}

/**
 * Central transaction helper: wraps every IndexedDB operation.
 * - Verifies target objectStore exists; if missing or NotFoundError/corrupted is thrown,
 *   closes the DB, deletes only the local cache DB, recreates it with the current schema,
 *   and retries once.
 * - If IndexedDB is unavailable (private mode, blocked), seamlessly falls back to in-memory storage.
 */
async function runWithStore<T>(
  storeName: ObjectStoreName,
  idbOp: (db: IDBPDatabase) => Promise<T>,
  memOp: (store: Map<string, any>) => T
): Promise<T> {
  if (isUsingMemoryFallback) {
    return memOp(getMemoryStore(storeName));
  }

  try {
    let db = await getLocalDB();
    if (!db.objectStoreNames.contains(storeName)) {
      const repaired = await repairLocalCacheDB();
      if (!repaired) {
        return memOp(getMemoryStore(storeName));
      }
      db = repaired;
    }
    return await idbOp(db);
  } catch (err) {
    if (isMissingStoreOrCorruptedError(err)) {
      const repaired = await repairLocalCacheDB();
      if (repaired && !isUsingMemoryFallback) {
        try {
          return await idbOp(repaired);
        } catch {
          isUsingMemoryFallback = true;
          return memOp(getMemoryStore(storeName));
        }
      }
      return memOp(getMemoryStore(storeName));
    }

    // Any other IndexedDB availability error (e.g. private browsing SecurityError / QuotaExceededError)
    console.warn(`[UnStill DB] Falling back to in-memory store for "${storeName}":`, err);
    isUsingMemoryFallback = true;
    return memOp(getMemoryStore(storeName));
  }
}

function resolveMemoryKey(storeName: ObjectStoreName, value: any, explicitKey?: string): string {
  if (explicitKey !== undefined) return String(explicitKey);
  const keyPath = STORE_DEF_MAP[storeName]?.options?.keyPath;
  if (typeof keyPath === 'string' && value && typeof value === 'object' && keyPath in value) {
    return String(value[keyPath]);
  }
  return '__default__';
}

async function localGet<T = any>(storeName: ObjectStoreName, key: string): Promise<T | undefined> {
  return runWithStore<T | undefined>(
    storeName,
    (db) => db.get(storeName, key),
    (store) => store.get(key) as T | undefined
  );
}

async function localPut<T = any>(
  storeName: ObjectStoreName,
  value: T,
  explicitKey?: string
): Promise<void> {
  const memKey = resolveMemoryKey(storeName, value, explicitKey);
  getMemoryStore(storeName).set(memKey, value);

  await runWithStore<void>(
    storeName,
    async (db) => {
      if (explicitKey !== undefined) {
        await db.put(storeName, value, explicitKey);
      } else {
        await db.put(storeName, value);
      }
    },
    () => {
      // already updated in memoryFallbackStores above
    }
  );
}

async function localGetAll<T = any>(storeName: ObjectStoreName): Promise<T[]> {
  return runWithStore<T[]>(
    storeName,
    (db) => db.getAll(storeName),
    (store) => Array.from(store.values()) as T[]
  );
}

async function localDelete(storeName: ObjectStoreName, key: string): Promise<void> {
  getMemoryStore(storeName).delete(key);
  await runWithStore<void>(
    storeName,
    async (db) => {
      await db.delete(storeName, key);
    },
    () => {}
  );
}

async function localClear(storeName: ObjectStoreName): Promise<void> {
  getMemoryStore(storeName).clear();
  await runWithStore<void>(
    storeName,
    async (db) => {
      await db.clear(storeName);
    },
    () => {}
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  };
}

export function formatCloudError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes('requests-from-referer') && lower.includes('are-blocked')) {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/*`
        : 'this app URL';
    return `Google sign-in is blocked by API key referrer restrictions. Add ${origin} to your Browser API key's allowed websites in Google Cloud Console > APIs & Services > Credentials (and Firebase Console > Authentication > Settings > Authorized domains).`;
  }
  if (lower.includes('auth/unauthorized-domain')) {
    const host =
      typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : 'this domain';
    return `Domain ${host} is not authorized in Firebase Auth. Add it in Firebase Console > Authentication > Settings > Authorized domains.`;
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('offline')) {
    return 'Saved on this device, will sync later';
  }
  if (lower.includes('err_blocked_by_client')) {
    return 'Saved on this device, will sync later';
  }
  return raw;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        result[k] = stripUndefined(v);
      }
    }
    return result as T;
  }
  return value;
}

let lastWriteResultState: LastWriteResult = (() => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('hf_last_write_result');
      if (raw) {
        const parsed = JSON.parse(raw) as LastWriteResult;
        if (parsed && typeof parsed.status === 'string') {
          return parsed;
        }
      }
    }
  } catch {
    // ignore storage read error
  }
  return { status: 'idle', path: '', timestamp: 0, error: null };
})();

export interface LastReadWriteErrorInfo {
  operation: 'read' | 'write';
  path: string;
  timestamp: number;
  error: string;
}

let lastReadWriteErrorState: LastReadWriteErrorInfo | null = (() => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('hf_last_rw_error');
      if (raw) {
        const parsed = JSON.parse(raw) as LastReadWriteErrorInfo;
        if (parsed && typeof parsed.error === 'string') {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
})();

export function recordReadWriteError(
  operation: 'read' | 'write',
  path: string,
  error: string
) {
  const info: LastReadWriteErrorInfo = {
    operation,
    path,
    timestamp: Date.now(),
    error,
  };
  lastReadWriteErrorState = info;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hf_last_rw_error', JSON.stringify(info));
    }
  } catch {
    // ignore
  }
}

export function getLastReadWriteError(): LastReadWriteErrorInfo | null {
  return lastReadWriteErrorState;
}

export function clearLastReadWriteError() {
  lastReadWriteErrorState = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hf_last_rw_error');
    }
  } catch {
    // ignore
  }
}

export function recordWriteResult(result: LastWriteResult) {
  lastWriteResultState = result;
  if (result.status === 'error' && result.error) {
    recordReadWriteError(result.operation || 'write', result.path || 'unknown', result.error);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hf_last_write_result', JSON.stringify(result));
    }
  } catch {
    // ignore storage write error
  }
}

export function getLastWriteResult(): LastWriteResult {
  return lastWriteResultState;
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  onError?: (msg: string) => void
) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: rawMessage,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
  };
  console.error('[UnStill CloudSync] Firestore Error:', JSON.stringify(errInfo));
  const isRead = operationType === OperationType.GET || operationType === OperationType.LIST;
  recordReadWriteError(isRead ? 'read' : 'write', path || 'unknown', rawMessage);
  if (!isRead) {
    recordWriteResult({
      status: 'error',
      operation: 'write',
      path: path || 'unknown',
      timestamp: Date.now(),
      error: rawMessage,
    });
    if (onError) onError('Saved on this device, will sync later');
  } else if (onError) {
    onError(rawMessage);
  }
}

// --- UID-SCOPED KEYS & DRAFT HELPERS (Requirement A.1) ---

export function uidKey(uid: string, suffix: string): string {
  return `${uid}:${suffix}`;
}

export function getOnboardingDraftForUid<T = Record<string, any>>(uid?: string | null): T | null {
  if (!uid) return null;
  try {
    const raw =
      localStorage.getItem(`${uid}:onboarding_draft`) ||
      localStorage.getItem(`hf_onboarding_draft_${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveOnboardingDraftForUid(uid: string | null | undefined, draft: Record<string, any>) {
  if (!uid) return;
  try {
    const serialized = JSON.stringify(draft);
    localStorage.setItem(`${uid}:onboarding_draft`, serialized);
    localStorage.setItem(`hf_onboarding_draft_${uid}`, serialized);
  } catch {
    // ignore storage errors
  }
}

export function getOnboardingStepForUid(uid?: string | null): number | null {
  if (!uid) return null;
  try {
    const raw =
      localStorage.getItem(`${uid}:onboarding_step`) ||
      localStorage.getItem(`hf_onboarding_step_${uid}`);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 9 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOnboardingStepForUid(uid: string | null | undefined, step: number) {
  if (!uid) return;
  try {
    localStorage.setItem(`${uid}:onboarding_step`, String(step));
    localStorage.setItem(`hf_onboarding_step_${uid}`, String(step));
  } catch {
    // ignore
  }
}

export function clearOnboardingDraftForUid(uid?: string | null) {
  try {
    if (uid) {
      localStorage.removeItem(`${uid}:onboarding_draft`);
      localStorage.removeItem(`hf_onboarding_draft_${uid}`);
      localStorage.removeItem(`${uid}:onboarding_step`);
      localStorage.removeItem(`hf_onboarding_step_${uid}`);
    }
    localStorage.removeItem('hf_onboarding_draft');
    localStorage.removeItem('hf_onboarding_step');
  } catch {
    // ignore
  }
}

/**
 * Clears cached session profile & draft for a uid upon sign-out,
 * while preserving any un-flushed syncQueue items keyed under that uid.
 */
export async function clearSessionCacheOnSignOut(uid?: string | null): Promise<void> {
  clearOnboardingDraftForUid(uid);
  try {
    localStorage.removeItem('hf_guest_uid');
    if (uid) {
      localStorage.removeItem(`hf_profile_${uid}`);
      localStorage.removeItem(`${uid}:profile`);
    }
  } catch {
    // ignore
  }

  if (uid) {
    await localDelete('profile', uidKey(uid, 'profile'));
    await localDelete('profile', uid);
    await localDelete('schedule', uidKey(uid, 'schedule'));
    await localDelete('schedule', uid);
    await localDelete('settings', uidKey(uid, 'settings'));
    await localDelete('settings', uid);
  }
  await localDelete('profile', '__latest__');
  await localDelete('schedule', '__latest__');
  await localDelete('streaks', '__latest__');
}

export interface SyncTask {
  id: string;
  collectionName: string;
  docId: string;
  data: any;
  uid: string;
  updatedAt: number;
}

export async function getQueuedWritesList(uid?: string): Promise<SyncTask[]> {
  try {
    const all = await localGetAll<SyncTask>('syncQueue');
    if (!uid) return all;
    return all.filter((t) => t.uid === uid);
  } catch {
    return [];
  }
}

export async function getAllQueuedWritesDebugSummary(): Promise<{
  totalCount: number;
  uids: string[];
  tasks: SyncTask[];
}> {
  try {
    const all = await localGetAll<SyncTask>('syncQueue');
    const uids = Array.from(new Set(all.map((t) => t.uid).filter(Boolean)));
    return { totalCount: all.length, uids, tasks: all };
  } catch {
    return { totalCount: 0, uids: [], tasks: [] };
  }
}

export async function getQueuedWritesCount(uid?: string): Promise<number> {
  const list = await getQueuedWritesList(uid);
  return list.length;
}

async function enqueueSyncTask(task: SyncTask) {
  const cleanTask = stripUndefined({
    ...task,
    id: task.id.startsWith(`${task.uid}:`) ? task.id : `${task.uid}:${task.id}`,
  });
  await localPut('syncQueue', cleanTask);
  if (task.collectionName === '__top_reports__') {
    await localPut('reportsQueue', cleanTask);
  }
}

async function removeSyncTask(id: string, uid?: string) {
  await localDelete('syncQueue', id);
  await localDelete('reportsQueue', id);
  if (uid && !id.startsWith(`${uid}:`)) {
    await localDelete('syncQueue', `${uid}:${id}`);
    await localDelete('reportsQueue', `${uid}:${id}`);
  }
}

async function syncDocWithRetry(
  task: SyncTask,
  onError?: (msg: string) => void,
  maxRetries = 2
): Promise<boolean> {
  // Requirement A.3: A queued write may ONLY be replayed when its uid equals the signed-in uid
  if (!auth.currentUser || auth.currentUser.uid !== task.uid) {
    return false;
  }

  const cleanData = stripUndefined(task.data);

  // Special handling for top-level problem reports queued while offline
  if (task.collectionName === '__top_reports__') {
    const path = 'reports';
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await addDoc(collection(firestoreDb, 'reports'), {
          uid: auth.currentUser.uid,
          category: cleanData.category,
          message: String(cleanData.message || '').slice(0, 500),
          ...(cleanData.appVersion ? { appVersion: cleanData.appVersion } : {}),
          createdAt: serverTimestamp(),
        });
        await removeSyncTask(task.id, task.uid);
        return true;
      } catch (e) {
        if (attempt === maxRetries) {
          handleFirestoreError(e, OperationType.CREATE, path, onError);
          return false;
        }
        await new Promise((res) => setTimeout(res, 600 * Math.pow(2, attempt)));
      }
    }
    return false;
  }

  // Support writing directly to root users/{uid} document
  if (task.collectionName === '__root_user__') {
    const path = `users/${task.uid}`;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await setDoc(doc(firestoreDb, 'users', task.uid), cleanData, {
          merge: true,
        });
        await removeSyncTask(task.id, task.uid);
        recordWriteResult({
          status: 'success',
          operation: 'write',
          path,
          timestamp: Date.now(),
          error: null,
        });
        return true;
      } catch (e) {
        if (attempt === maxRetries) {
          handleFirestoreError(e, OperationType.WRITE, path, onError);
          return false;
        }
        await new Promise((res) => setTimeout(res, 600 * Math.pow(2, attempt)));
      }
    }
    return false;
  }

  const path = `users/${task.uid}/${task.collectionName}/${task.docId}`;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await setDoc(doc(firestoreDb, 'users', task.uid, task.collectionName, task.docId), cleanData, {
        merge: true,
      });
      await removeSyncTask(task.id, task.uid);
      recordWriteResult({
        status: 'success',
        operation: 'write',
        path,
        timestamp: Date.now(),
        error: null,
      });
      return true;
    } catch (e) {
      if (attempt === maxRetries) {
        handleFirestoreError(e, OperationType.WRITE, path, onError);
        return false;
      }
      await new Promise((res) => setTimeout(res, 600 * Math.pow(2, attempt)));
    }
  }
  return false;
}

/**
 * Replays queued writes ONLY for the specified signed-in uid.
 * Never replays or emits errors for a different account's queued writes.
 */
export async function flushPendingSyncQueue(
  uid: string,
  onError?: (msg: string) => void
): Promise<{ syncedCount: number; failedCount: number }> {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) {
    return { syncedCount: 0, failedCount: 0 };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;
  try {
    const tasks: SyncTask[] = await localGetAll<SyncTask>('syncQueue');
    const matchingTasks = tasks.filter((t) => t.uid === uid);
    for (const task of matchingTasks) {
      const ok = await syncDocWithRetry(task, onError, 1);
      if (ok) {
        syncedCount++;
      } else {
        failedCount++;
      }
    }
  } catch (e) {
    console.warn('[UnStill CloudSync] Queue flush warning:', e);
  }
  return { syncedCount, failedCount };
}

export async function scheduleBackgroundSync(
  uid: string,
  collectionName: string,
  docId: string,
  data: any,
  onError?: (msg: string) => void
): Promise<void> {
  const cleanData = stripUndefined(data);
  const task: SyncTask = {
    id: `${uid}:${collectionName}_${docId}`,
    collectionName,
    docId,
    data: cleanData,
    uid,
    updatedAt: Date.now(),
  };

  await enqueueSyncTask(task);

  Promise.resolve()
    .then(() => {
      // Never show "Saved on this device" for a different account
      if (!auth.currentUser || auth.currentUser.uid !== uid) {
        return false;
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        recordReadWriteError(
          'write',
          collectionName === '__root_user__'
            ? `users/${uid}`
            : `users/${uid}/${collectionName}/${docId}`,
          'Device is offline; queued write for sync.'
        );
        if (onError) onError('Saved on this device, will sync later');
        return false;
      }
      return syncDocWithRetry(task, onError);
    })
    .catch((e) => {
      console.error('[UnStill CloudSync] Background sync error:', e);
      recordReadWriteError(
        'write',
        collectionName === '__root_user__'
          ? `users/${uid}`
          : `users/${uid}/${collectionName}/${docId}`,
        e instanceof Error ? e.message : String(e)
      );
      if (auth.currentUser?.uid === uid && onError) {
        onError('Saved on this device, will sync later');
      }
    });
}

// --- ONBOARDING ROUTING GUARD & PROGRESSIVE PERSISTENCE ---

/**
 * Single canonical routing guard: returns true ONLY if userDoc?.onboardingComplete === true.
 */
export function isOnboardingComplete(
  userDoc: Partial<UserProfile> | Record<string, any> | null | undefined
): boolean {
  return Boolean(userDoc && userDoc.onboardingComplete === true);
}

/**
 * Checks whether an older account document (merged with meta/main if present)
 * has completion evidence (conditions answered or "None", work window, remindersPerDay,
 * and a plan/monthlyTheme) but no onboardingComplete flag.
 */
export function hasLegacyOnboardingCompletionEvidence(
  rawUserDoc: Record<string, any> | null | undefined,
  metaMainDoc?: Record<string, any> | null,
  hasSavedPlan?: boolean
): boolean {
  if (!rawUserDoc || typeof rawUserDoc !== 'object') return false;
  if (rawUserDoc.onboardingComplete === true) return true;
  if (rawUserDoc.onboardingComplete === false && typeof rawUserDoc.onboardingStep === 'number' && rawUserDoc.onboardingStep < 8) {
    return false;
  }

  const hasConditionsOrNone = Boolean(
    rawUserDoc.noneSelected === true ||
      rawUserDoc.conditions === 'None' ||
      (Array.isArray(rawUserDoc.conditions) && rawUserDoc.conditions.length > 0) ||
      (Array.isArray(metaMainDoc?.planSummary?.focusAreas) &&
        metaMainDoc!.planSummary.focusAreas.length > 0)
  );

  const hasWorkWindow = Boolean(
    (rawUserDoc.workStart && rawUserDoc.workEnd) ||
      (metaMainDoc?.weeklyRhythm?.workStart && metaMainDoc?.weeklyRhythm?.workEnd) ||
      metaMainDoc?.planSummary?.activeWindow
  );

  const hasRemindersPerDay = Boolean(
    typeof rawUserDoc.remindersPerDay === 'number' ||
      typeof metaMainDoc?.weeklyRhythm?.remindersPerDay === 'number' ||
      typeof metaMainDoc?.planSummary?.remindersPerDay === 'number'
  );

  const hasPlanOrTheme = Boolean(
    metaMainDoc?.monthlyTheme ||
      metaMainDoc?.planSummary ||
      rawUserDoc.monthlyTheme ||
      rawUserDoc.planSummary ||
      hasSavedPlan ||
      (rawUserDoc.level && rawUserDoc.goal)
  );

  return hasConditionsOrNone && hasWorkWindow && hasRemindersPerDay && hasPlanOrTheme;
}

/**
 * Determines which onboarding step (1..8) to resume at when a userDoc exists
 * but onboardingComplete is not true.
 * Never returns 1 when Step 1 or later answers exist.
 * Note: For a new Google user with only prefilled `name` (and no `ageBand` yet),
 * `step1Done` is false so onboarding starts at Step 1 with `name` prefilled.
 */
export function computeResumeOnboardingStep(
  raw: Record<string, any> | null | undefined
): number {
  if (!raw || typeof raw !== 'object') return 1;
  if (isOnboardingComplete(raw)) return 9;

  const step1Done = Boolean(raw.ageBand || raw.sex || raw.heightUnit);
  const step2Done = Boolean(
    raw.habitType &&
      typeof raw.sittingHoursPerDay === 'number' &&
      typeof raw.currentActiveDays === 'number'
  );
  const step3Done = Boolean(
    raw.noneSelected === true ||
      (Array.isArray(raw.conditions) && raw.conditions.length > 0)
  );
  const step4Done =
    typeof raw.pregnantOrPostpartum === 'boolean' &&
    typeof raw.doctorAdviceToAvoid === 'boolean' &&
    typeof raw.recentSurgery === 'boolean';
  const step5Done = Boolean(raw.workType && raw.workStart && raw.workEnd);
  const step6Done = Boolean(
    raw.location &&
      Array.isArray(raw.equipment) &&
      raw.equipment.length > 0 &&
      raw.level
  );
  const step7Done = Boolean(raw.goal && raw.cheerStyle);

  let firstUnanswered = 1;
  if (!step1Done) firstUnanswered = 1;
  else if (!step2Done) firstUnanswered = 2;
  else if (!step3Done) firstUnanswered = 3;
  else if (!step4Done) firstUnanswered = 4;
  else if (!step5Done) firstUnanswered = 5;
  else if (!step6Done) firstUnanswered = 6;
  else if (!step7Done) firstUnanswered = 7;
  else firstUnanswered = 8;

  // Also check if ANY later step has answers so we never start at step 1 when later answers exist
  let highestAnsweredNextStep = 1;
  if (step7Done) highestAnsweredNextStep = 8;
  else if (step6Done) highestAnsweredNextStep = 7;
  else if (step5Done) highestAnsweredNextStep = 6;
  else if (step4Done) highestAnsweredNextStep = 5;
  else if (step3Done) highestAnsweredNextStep = 4;
  else if (step2Done) highestAnsweredNextStep = 3;
  else if (step1Done) highestAnsweredNextStep = 2;

  const explicitStep =
    typeof raw.onboardingStep === 'number' &&
    raw.onboardingStep >= 1 &&
    raw.onboardingStep <= 8
      ? Math.floor(raw.onboardingStep)
      : null;

  if (explicitStep !== null) {
    if (explicitStep === 1 && highestAnsweredNextStep > 1) {
      return Math.max(2, firstUnanswered);
    }
    return explicitStep;
  }

  if (highestAnsweredNextStep > 1 && firstUnanswered === 1) {
    return 2;
  }

  return firstUnanswered;
}

export function extractScheduleFromUserDoc(
  raw: Record<string, any> | null | undefined,
  fallback?: SchedulePrefs | null
): SchedulePrefs | null {
  if (!raw || typeof raw !== 'object') return fallback || null;
  const hasScheduleFields = Boolean(
    raw.workStart ||
      raw.workEnd ||
      raw.workType ||
      typeof raw.remindersPerDay === 'number' ||
      Array.isArray(raw.daysOff) ||
      raw.location ||
      Array.isArray(raw.equipment)
  );
  if (!hasScheduleFields) return fallback || null;

  const base: SchedulePrefs = fallback || {
    workStart: '09:30',
    workEnd: '18:00',
    workType: 'Desk / laptop',
    breakWindows: ['10:30', '13:30', '16:00', '17:30'],
    daysOff: [0, 6],
    remindersPerDay: 4,
    quietHours: { start: '21:30', end: '08:00' },
    equipment: ['Chair / Desk'],
    location: 'At desk',
  };

  return {
    ...base,
    ...(typeof raw.workStart === 'string' && raw.workStart ? { workStart: raw.workStart } : {}),
    ...(typeof raw.workEnd === 'string' && raw.workEnd ? { workEnd: raw.workEnd } : {}),
    ...(raw.workType ? { workType: raw.workType } : {}),
    ...(Array.isArray(raw.breakWindows) && raw.breakWindows.length > 0
      ? { breakWindows: raw.breakWindows }
      : {}),
    ...(Array.isArray(raw.daysOff) ? { daysOff: raw.daysOff } : {}),
    ...(typeof raw.remindersPerDay === 'number' ? { remindersPerDay: raw.remindersPerDay } : {}),
    ...(raw.quietHours && typeof raw.quietHours === 'object'
      ? { quietHours: raw.quietHours }
      : {}),
    ...(Array.isArray(raw.equipment) && raw.equipment.length > 0
      ? { equipment: raw.equipment }
      : {}),
    ...(typeof raw.location === 'string' && raw.location ? { location: raw.location } : {}),
  };
}

// --- PROFILE ---
export interface CloudProfileLookupResult {
  status: 'found' | 'not_found' | 'error';
  profile: UserProfile | null;
  metaMain?: Record<string, any> | null;
  migratedLegacyCompletion?: boolean;
  createdNewUserDoc?: boolean;
  error?: string;
}

export async function getLocalProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  const byScopedKey = await localGet<UserProfile>('profile', uidKey(uid, 'profile'));
  if (byScopedKey && (!byScopedKey.uid || byScopedKey.uid === uid)) {
    return { ...byScopedKey, uid };
  }

  const byLegacyUid = await localGet<UserProfile>('profile', uid);
  if (byLegacyUid && (!byLegacyUid.uid || byLegacyUid.uid === uid)) {
    const clean = { ...byLegacyUid, uid };
    await localPut('profile', clean, uidKey(uid, 'profile'));
    return clean;
  }

  try {
    const rawLs =
      localStorage.getItem(`${uid}:profile`) || localStorage.getItem(`hf_profile_${uid}`);
    if (rawLs) {
      const parsed = JSON.parse(rawLs) as UserProfile;
      if (parsed && parsed.uid === uid) {
        await localPut('profile', parsed, uidKey(uid, 'profile'));
        return parsed;
      }
    }
  } catch {
    // ignore localStorage read errors
  }

  return null;
}

export function normalizeCloudProfile(raw: Record<string, any>, uid: string): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  const hasAnyData = Boolean(
    raw.onboardingComplete !== undefined ||
      raw.onboardingStep !== undefined ||
      raw.isGuest !== undefined ||
      raw.provider ||
      raw.name ||
      raw.email ||
      raw.ageBand ||
      raw.sex ||
      raw.heightUnit ||
      raw.habitType ||
      (Array.isArray(raw.conditions) && raw.conditions.length > 0) ||
      raw.noneSelected !== undefined ||
      raw.workType ||
      raw.location ||
      raw.level ||
      raw.goal ||
      raw.cheerStyle
  );

  if (!hasAnyData) {
    return null;
  }

  const completed = isOnboardingComplete(raw);
  const resumeStep = completed ? 9 : computeResumeOnboardingStep(raw);
  const now = Date.now();

  if (!completed) {
    return stripUndefined({
      uid,
      name: typeof raw.name === 'string' ? raw.name : '',
      email: typeof raw.email === 'string' ? raw.email : undefined,
      photoURL: typeof raw.photoURL === 'string' ? raw.photoURL : undefined,
      provider: typeof raw.provider === 'string' ? raw.provider : undefined,
      isGuest: typeof raw.isGuest === 'boolean' ? raw.isGuest : undefined,
      ageBand: typeof raw.ageBand === 'string' ? raw.ageBand : '',
      sex: typeof raw.sex === 'string' ? raw.sex : '',
      heightUnit: typeof raw.heightUnit === 'string' ? raw.heightUnit : undefined,
      timeZone:
        typeof raw.timeZone === 'string' && raw.timeZone
          ? raw.timeZone
          : 'Asia/Kolkata',
      habitType: raw.habitType || undefined,
      sittingHoursPerDay:
        typeof raw.sittingHoursPerDay === 'number' ? raw.sittingHoursPerDay : undefined,
      currentActiveDays:
        typeof raw.currentActiveDays === 'number' ? raw.currentActiveDays : undefined,
      level: (raw.level as Level) || (undefined as unknown as Level),
      goal: (raw.goal as Goal) || (undefined as unknown as Goal),
      conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
      noneSelected: typeof raw.noneSelected === 'boolean' ? raw.noneSelected : undefined,
      painBaseline: raw.painBaseline && typeof raw.painBaseline === 'object' ? raw.painBaseline : {},
      painDuration: raw.painDuration && typeof raw.painDuration === 'object' ? raw.painDuration : {},
      gettingWorse: raw.gettingWorse && typeof raw.gettingWorse === 'object' ? raw.gettingWorse : {},
      safetyFlags: Array.isArray(raw.safetyFlags) ? raw.safetyFlags : [],
      pregnantOrPostpartum:
        typeof raw.pregnantOrPostpartum === 'boolean' ? raw.pregnantOrPostpartum : undefined,
      doctorAdviceToAvoid:
        typeof raw.doctorAdviceToAvoid === 'boolean' ? raw.doctorAdviceToAvoid : undefined,
      recentSurgery: typeof raw.recentSurgery === 'boolean' ? raw.recentSurgery : undefined,
      cheerStyle: (raw.cheerStyle as CheerStyle) || (undefined as unknown as CheerStyle),
      theme: raw.theme || 'light',
      reducedMotion: Boolean(raw.reducedMotion),
      soundHaptics: raw.soundHaptics ?? true,
      stepSource: raw.stepSource || 'manual',
      stepGoal: typeof raw.stepGoal === 'number' ? raw.stepGoal : 4500,
      disabledMoves: Array.isArray(raw.disabledMoves) ? raw.disabledMoves : [],
      planVersion: typeof raw.planVersion === 'number' ? raw.planVersion : 1,
      gentleLoadUntilDate: raw.gentleLoadUntilDate,
      onboardingStep: resumeStep,
      onboardingComplete: false,
      onboardingCompletedAt:
        typeof raw.onboardingCompletedAt === 'number' ? raw.onboardingCompletedAt : undefined,
      consentGivenAt: typeof raw.consentGivenAt === 'number' ? raw.consentGivenAt : undefined,
      workStart: typeof raw.workStart === 'string' ? raw.workStart : undefined,
      workEnd: typeof raw.workEnd === 'string' ? raw.workEnd : undefined,
      workType: raw.workType || undefined,
      breakWindows: Array.isArray(raw.breakWindows) ? raw.breakWindows : undefined,
      daysOff: Array.isArray(raw.daysOff) ? raw.daysOff : undefined,
      remindersPerDay: typeof raw.remindersPerDay === 'number' ? raw.remindersPerDay : undefined,
      quietHours:
        raw.quietHours && typeof raw.quietHours === 'object' ? raw.quietHours : undefined,
      equipment: Array.isArray(raw.equipment) ? raw.equipment : undefined,
      location: typeof raw.location === 'string' ? raw.location : undefined,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    });
  }

  return stripUndefined({
    uid,
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'Friend',
    email: typeof raw.email === 'string' ? raw.email : undefined,
    photoURL: typeof raw.photoURL === 'string' ? raw.photoURL : undefined,
    provider: typeof raw.provider === 'string' ? raw.provider : undefined,
    isGuest: typeof raw.isGuest === 'boolean' ? raw.isGuest : undefined,
    ageBand: typeof raw.ageBand === 'string' ? raw.ageBand : '',
    sex: typeof raw.sex === 'string' ? raw.sex : '',
    heightUnit: typeof raw.heightUnit === 'string' ? raw.heightUnit : undefined,
    timeZone:
      typeof raw.timeZone === 'string' && raw.timeZone
        ? raw.timeZone
        : Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    habitType: raw.habitType || 'All of the above',
    sittingHoursPerDay: typeof raw.sittingHoursPerDay === 'number' ? raw.sittingHoursPerDay : 7,
    currentActiveDays: typeof raw.currentActiveDays === 'number' ? raw.currentActiveDays : 2,
    level: raw.level || 'Starter',
    goal: raw.goal || 'Ease stiffness',
    conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
    noneSelected: typeof raw.noneSelected === 'boolean' ? raw.noneSelected : undefined,
    painBaseline: raw.painBaseline && typeof raw.painBaseline === 'object' ? raw.painBaseline : {},
    painDuration: raw.painDuration && typeof raw.painDuration === 'object' ? raw.painDuration : {},
    gettingWorse: raw.gettingWorse && typeof raw.gettingWorse === 'object' ? raw.gettingWorse : {},
    safetyFlags: Array.isArray(raw.safetyFlags) ? raw.safetyFlags : [],
    pregnantOrPostpartum: Boolean(raw.pregnantOrPostpartum),
    doctorAdviceToAvoid: Boolean(raw.doctorAdviceToAvoid),
    recentSurgery: Boolean(raw.recentSurgery),
    cheerStyle: raw.cheerStyle || 'Warm & celebratory',
    theme: raw.theme || 'light',
    reducedMotion: Boolean(raw.reducedMotion),
    soundHaptics: raw.soundHaptics ?? true,
    stepSource: raw.stepSource || 'manual',
    stepGoal: typeof raw.stepGoal === 'number' ? raw.stepGoal : 4500,
    disabledMoves: Array.isArray(raw.disabledMoves) ? raw.disabledMoves : [],
    planVersion: typeof raw.planVersion === 'number' ? raw.planVersion : 1,
    gentleLoadUntilDate: raw.gentleLoadUntilDate,
    onboardingStep: 9,
    onboardingComplete: true,
    onboardingCompletedAt:
      typeof raw.onboardingCompletedAt === 'number' ? raw.onboardingCompletedAt : now,
    consentGivenAt: typeof raw.consentGivenAt === 'number' ? raw.consentGivenAt : now,
    workStart: typeof raw.workStart === 'string' ? raw.workStart : undefined,
    workEnd: typeof raw.workEnd === 'string' ? raw.workEnd : undefined,
    workType: raw.workType || undefined,
    breakWindows: Array.isArray(raw.breakWindows) ? raw.breakWindows : undefined,
    daysOff: Array.isArray(raw.daysOff) ? raw.daysOff : undefined,
    remindersPerDay: typeof raw.remindersPerDay === 'number' ? raw.remindersPerDay : undefined,
    quietHours:
      raw.quietHours && typeof raw.quietHours === 'object' ? raw.quietHours : undefined,
    equipment: Array.isArray(raw.equipment) ? raw.equipment : undefined,
    location: typeof raw.location === 'string' ? raw.location : undefined,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  });
}

export function extractFirstNameFromDisplayName(displayName?: string | null): string {
  if (!displayName || typeof displayName !== 'string') return '';
  const trimmed = displayName.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] || '';
}

/**
 * Loads `users/{uid}` and `users/{uid}/meta/main` (plus legacy `users/{uid}/data/profile` & `schedule`)
 * from the configured named Firestore database (`VITE_FIREBASE_DATABASE_ID`).
 * Implements Requirement B:
 * - Doc exists and `onboardingComplete === true` -> returns completed profile for Today.
 * - Migration for older accounts: if completion evidence exists without `onboardingComplete` flag,
 *   sets `onboardingComplete: true` once and persists to `users/{uid}`.
 * - Doc exists and `onboardingComplete` is not true -> returns partial profile with `onboardingStep`
 *   computed so it resumes with all saved answers prefilled.
 * - Doc missing -> returns `status: 'not_found'`.
 * - Read error -> records error and returns `status: 'error'`.
 */
export async function fetchCloudProfileDetailed(uid: string): Promise<CloudProfileLookupResult> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    const msg = 'Authentication session is not ready for this account.';
    recordReadWriteError('read', `users/${uid}`, msg);
    return {
      status: 'error',
      profile: null,
      error: msg,
    };
  }

  const cached = await getLocalProfile(uid);
  const rootRef = doc(firestoreDb, 'users', uid);
  const metaRef = doc(firestoreDb, 'users', uid, 'meta', 'main');
  const subRef = doc(firestoreDb, 'users', uid, 'data', 'profile');
  const subSchedRef = doc(firestoreDb, 'users', uid, 'data', 'schedule');

  try {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!isOnline) {
      const msg = 'You appear to be offline.';
      recordReadWriteError('read', `users/${uid}`, msg);
      return {
        status: 'error',
        profile: null,
        error: msg,
      };
    }

    const [rootSnap, metaSnap, subSnap, subSchedSnap] = await Promise.all([
      getDocFromServer(rootRef),
      getDocFromServer(metaRef),
      getDocFromServer(subRef).catch(() => null),
      getDocFromServer(subSchedRef).catch(() => null),
    ]);

    const rootRaw = rootSnap.exists() ? rootSnap.data() : null;
    const metaRaw = metaSnap.exists() ? metaSnap.data() : null;
    const subRaw = subSnap && subSnap.exists() ? subSnap.data() : null;
    const subSchedRaw = subSchedSnap && subSchedSnap.exists() ? subSchedSnap.data() : null;

    if (!rootRaw && !subRaw && !metaRaw) {
      return { status: 'not_found', profile: null, metaMain: null };
    }

    let combinedRaw: Record<string, any> = {};
    if (subSchedRaw) {
      combinedRaw = { ...combinedRaw, ...subSchedRaw };
    }
    if (metaRaw?.weeklyRhythm && typeof metaRaw.weeklyRhythm === 'object') {
      combinedRaw = { ...combinedRaw, ...metaRaw.weeklyRhythm };
    }
    if (rootRaw && subRaw) {
      const rootTime = typeof rootRaw.updatedAt === 'number' ? rootRaw.updatedAt : 0;
      const subTime = typeof subRaw.updatedAt === 'number' ? subRaw.updatedAt : 0;
      const base =
        rootTime >= subTime
          ? { ...combinedRaw, ...subRaw, ...rootRaw }
          : { ...combinedRaw, ...rootRaw, ...subRaw };
      base.onboardingComplete = isOnboardingComplete(rootRaw) || isOnboardingComplete(subRaw);
      combinedRaw = base;
    } else {
      combinedRaw = { ...combinedRaw, ...(rootRaw || subRaw || {}) };
    }

    // Check migration for older accounts (Requirement B: completion evidence without onboardingComplete flag)
    let migratedLegacyCompletion = false;
    if (
      !isOnboardingComplete(combinedRaw) &&
      hasLegacyOnboardingCompletionEvidence(combinedRaw, metaRaw)
    ) {
      combinedRaw.onboardingComplete = true;
      combinedRaw.onboardingStep = 9;
      migratedLegacyCompletion = true;
    }

    const cloudProfile = normalizeCloudProfile(combinedRaw, uid);

    if (cloudProfile) {
      let merged: UserProfile = cloudProfile;
      if (cached && cached.uid === uid && (cached.updatedAt || 0) > (cloudProfile.updatedAt || 0)) {
        const mergedRaw = {
          ...combinedRaw,
          ...cached,
          onboardingComplete: isOnboardingComplete(cloudProfile) || isOnboardingComplete(cached),
        };
        merged = normalizeCloudProfile(mergedRaw, uid) || cloudProfile;
      }

      await localPut('profile', merged, uidKey(uid, 'profile'));
      await localPut('profile', merged, uid);

      const extractedSchedule = extractScheduleFromUserDoc(
        merged as Record<string, any>,
        await getLocalSchedule(uid)
      );
      if (extractedSchedule) {
        await localPut('schedule', extractedSchedule, uidKey(uid, 'schedule'));
        await localPut('schedule', extractedSchedule, uid);
      }
      try {
        const serialized = JSON.stringify(merged);
        localStorage.setItem(`${uid}:profile`, serialized);
        localStorage.setItem(`hf_profile_${uid}`, serialized);
      } catch {
        // ignore storage quota errors
      }

      // If older account migration or subcollection completion was detected, persist onboardingComplete: true once to users/{uid}
      if (
        (migratedLegacyCompletion || !isOnboardingComplete(rootRaw)) &&
        isOnboardingComplete(merged)
      ) {
        try {
          await setDoc(
            rootRef,
            stripUndefined({
              ...merged,
              onboardingComplete: true,
              onboardingStep: 9,
              updatedAt: Date.now(),
            }),
            { merge: true }
          );
          recordWriteResult({
            status: 'success',
            operation: 'write',
            path: `users/${uid}`,
            timestamp: Date.now(),
            error: null,
          });
        } catch (writeErr) {
          scheduleBackgroundSync(uid, '__root_user__', uid, {
            ...merged,
            onboardingComplete: true,
            onboardingStep: 9,
          });
        }
      }

      return {
        status: 'found',
        profile: merged,
        metaMain: metaRaw,
        migratedLegacyCompletion,
      };
    }

    return { status: 'not_found', profile: null, metaMain: metaRaw };
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${uid}`);
    const rawMsg = e instanceof Error ? e.message : String(e);
    return {
      status: 'error',
      profile: null,
      error: rawMsg,
    };
  }
}

/**
 * Creates the initial `users/{uid}` document for a new Google user (Flow B / D.c)
 * or a new Anonymous Guest user (Flow D.a).
 */
export async function createInitialUserDoc(
  uid: string,
  opts: {
    isGuest: boolean;
    provider: 'google' | 'anonymous';
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  }
): Promise<UserProfile> {
  const now = Date.now();
  const firstName = opts.isGuest ? '' : extractFirstNameFromDisplayName(opts.displayName);

  const initialRaw: Record<string, any> = stripUndefined({
    uid,
    name: firstName,
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.photoURL ? { photoURL: opts.photoURL } : {}),
    provider: opts.provider,
    isGuest: opts.isGuest,
    onboardingStep: 1,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  });

  const normalized =
    normalizeCloudProfile(initialRaw, uid) ||
    ({
      uid,
      name: firstName,
      email: opts.email || undefined,
      photoURL: opts.photoURL || undefined,
      provider: opts.provider,
      isGuest: opts.isGuest,
      ageBand: '',
      sex: '',
      timeZone: 'Asia/Kolkata',
      level: undefined as unknown as Level,
      goal: undefined as unknown as Goal,
      conditions: [],
      painBaseline: {},
      safetyFlags: [],
      cheerStyle: undefined as unknown as CheerStyle,
      theme: 'light',
      reducedMotion: false,
      soundHaptics: true,
      onboardingStep: 1,
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
    } as UserProfile);

  await localPut('profile', normalized, uidKey(uid, 'profile'));
  await localPut('profile', normalized, uid);
  saveOnboardingStepForUid(uid, 1);
  saveOnboardingDraftForUid(uid, {
    name: firstName,
    ageBand: '',
    sex: '',
    timeZone: 'Asia/Kolkata',
  });
  try {
    const serialized = JSON.stringify(normalized);
    localStorage.setItem(`${uid}:profile`, serialized);
    localStorage.setItem(`hf_profile_${uid}`, serialized);
  } catch {
    // ignore
  }

  const path = `users/${uid}`;
  if (auth.currentUser && auth.currentUser.uid === uid) {
    try {
      await setDoc(doc(firestoreDb, 'users', uid), initialRaw, { merge: true });
      recordWriteResult({
        status: 'success',
        operation: 'write',
        path,
        timestamp: Date.now(),
        error: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      recordWriteResult({
        status: 'error',
        operation: 'write',
        path,
        timestamp: Date.now(),
        error: msg,
      });
      await enqueueSyncTask({
        id: `${uid}:__root_user___${uid}`,
        collectionName: '__root_user__',
        docId: uid,
        data: initialRaw,
        uid,
        updatedAt: now,
      });
    }
  } else {
    await enqueueSyncTask({
      id: `${uid}:__root_user___${uid}`,
      collectionName: '__root_user__',
      docId: uid,
      data: initialRaw,
      uid,
      updatedAt: now,
    });
  }

  return normalized;
}

export async function fetchCloudProfile(
  uid: string,
  onError?: (msg: string) => void
): Promise<UserProfile | null> {
  const res = await fetchCloudProfileDetailed(uid);
  if (res.status === 'found' && res.profile) {
    return res.profile;
  }
  if (res.status === 'error' && onError && res.error) {
    onError(formatCloudError(res.error));
  }
  return getLocalProfile(uid);
}

export async function getProfile(
  uid: string,
  onError?: (msg: string) => void
): Promise<UserProfile | null> {
  const cached = await getLocalProfile(uid);
  if (cached) return cached;
  return fetchCloudProfile(uid, onError);
}

/**
 * Progressive onboarding step save (Requirement C.1):
 * - Writes step answers + onboardingStep (nextStep) + updatedAt to IndexedDB under `${uid}:profile`
 * - Awaits setDoc(doc(firestoreDb, 'users', uid), payload, { merge: true }) for both Google and anonymous auth users
 * - Records lastWriteResult & lastReadWriteError
 * - If Firestore write fails, keeps answers locally, queues retry in syncQueue under `uid`, and returns the REAL error text
 */
export async function saveOnboardingStepProgress(
  uid: string,
  nextStep: number,
  stepAnswers: Record<string, any>,
  isGuest: boolean = false
): Promise<{ ok: boolean; profile: UserProfile; error?: string }> {
  const now = Date.now();
  const existingLocal = await getLocalProfile(uid);
  const existingSchedule = await getLocalSchedule(uid);
  const provider = isGuest ? 'anonymous' : existingLocal?.provider || 'google';

  const mergedRaw: Record<string, any> = stripUndefined({
    ...(existingLocal || {}),
    ...stepAnswers,
    uid,
    isGuest,
    provider,
    onboardingStep: nextStep,
    onboardingComplete:
      stepAnswers.onboardingComplete !== undefined
        ? Boolean(stepAnswers.onboardingComplete)
        : Boolean(existingLocal?.onboardingComplete),
    createdAt: existingLocal?.createdAt || now,
    updatedAt: now,
  });

  const normalized =
    normalizeCloudProfile(mergedRaw, uid) ||
    ({
      ...mergedRaw,
      uid,
      isGuest,
      provider,
      onboardingStep: nextStep,
      onboardingComplete: Boolean(mergedRaw.onboardingComplete),
      createdAt: mergedRaw.createdAt || now,
      updatedAt: now,
    } as UserProfile);

  await localPut('profile', normalized, uidKey(uid, 'profile'));
  await localPut('profile', normalized, uid);
  saveOnboardingStepForUid(uid, nextStep);

  const updatedSchedule = extractScheduleFromUserDoc(mergedRaw, existingSchedule);
  if (updatedSchedule) {
    await localPut('schedule', updatedSchedule, uidKey(uid, 'schedule'));
    await localPut('schedule', updatedSchedule, uid);
  }

  try {
    const serialized = JSON.stringify(normalized);
    localStorage.setItem(`${uid}:profile`, serialized);
    localStorage.setItem(`hf_profile_${uid}`, serialized);
  } catch {
    // ignore storage quota errors
  }

  const firestorePayload = stripUndefined({
    ...stepAnswers,
    uid,
    isGuest,
    provider,
    onboardingStep: nextStep,
    onboardingComplete: Boolean(mergedRaw.onboardingComplete),
    createdAt: existingLocal?.createdAt || now,
    updatedAt: now,
  });

  const path = `users/${uid}`;
  const syncTaskId = `${uid}:__root_user___${uid}`;

  // If no Firebase Auth session is active (e.g. pure local offline fallback in tests when auth is null)
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    if (isGuest && !auth.currentUser) {
      recordWriteResult({
        status: 'success',
        operation: 'write',
        path: `indexeddb:users/${uid}`,
        timestamp: now,
        error: null,
      });
      await enqueueSyncTask({
        id: syncTaskId,
        collectionName: '__root_user__',
        docId: uid,
        data: firestorePayload,
        uid,
        updatedAt: now,
      });
      return { ok: true, profile: normalized };
    }

    const errMsg = 'Authentication session not found for current user. Queued for retry.';
    await enqueueSyncTask({
      id: syncTaskId,
      collectionName: '__root_user__',
      docId: uid,
      data: firestorePayload,
      uid,
      updatedAt: now,
    });
    recordWriteResult({
      status: 'error',
      operation: 'write',
      path,
      timestamp: now,
      error: errMsg,
    });
    return { ok: false, profile: normalized, error: errMsg };
  }

  try {
    await setDoc(doc(firestoreDb, 'users', uid), firestorePayload, { merge: true });
    await removeSyncTask(syncTaskId, uid);
    recordWriteResult({
      status: 'success',
      operation: 'write',
      path,
      timestamp: Date.now(),
      error: null,
    });
    return { ok: true, profile: normalized };
  } catch (e) {
    const realError = e instanceof Error ? e.message : String(e);
    console.error(`[UnStill Onboarding] Failed saving step to ${path}:`, e);
    await enqueueSyncTask({
      id: syncTaskId,
      collectionName: '__root_user__',
      docId: uid,
      data: firestorePayload,
      uid,
      updatedAt: now,
    });
    recordWriteResult({
      status: 'error',
      operation: 'write',
      path,
      timestamp: Date.now(),
      error: realError,
    });
    return { ok: false, profile: normalized, error: realError };
  }
}

export interface OnboardingMetaMain {
  planSummary: {
    whyThisPlan: string;
    level: string;
    goal: string;
    focusAreas: string[];
    remindersPerDay: number;
    activeWindow: string;
    workType: string;
    location: string;
    equipment: string[];
  };
  monthlyTheme: string;
  weeklyRhythm: {
    workStart: string;
    workEnd: string;
    workType: string;
    remindersPerDay: number;
    daysOff: number[];
    breakWindows: string[];
    level: string;
  };
  planVersion: number;
  updatedAt: number;
}

/**
 * Final step atomic batch write (Requirement C.3):
 * Writes in one Firestore writeBatch:
 * 1) users/{uid} { onboardingComplete: true, onboardingCompletedAt, planVersion, ...all answers }
 * 2) users/{uid}/meta/main { planSummary, monthlyTheme, weeklyRhythm, planVersion, updatedAt }
 * Only if the batch succeeds does it return { ok: true }.
 * If it fails, keeps answers locally, queues retry, and returns the actual error text.
 */
export async function completeOnboardingBatch(
  uid: string,
  fullProfile: UserProfile,
  fullSchedule: SchedulePrefs,
  metaMain: OnboardingMetaMain,
  initialPlan: DailyPlan,
  nextStreaks: StreakData,
  initialPainLog: PainLog | null,
  isGuest: boolean = false
): Promise<{ ok: boolean; profile: UserProfile; error?: string }> {
  const now = Date.now();
  const completedAt = fullProfile.onboardingCompletedAt || now;
  const planVersion = fullProfile.planVersion || 1;
  const provider = isGuest ? 'anonymous' : fullProfile.provider || 'google';

  const userDocPayload: UserProfile = stripUndefined({
    ...fullProfile,
    ...fullSchedule,
    uid,
    isGuest,
    provider,
    onboardingStep: 9,
    onboardingComplete: true,
    onboardingCompletedAt: completedAt,
    planVersion,
    updatedAt: now,
  });

  const metaDocPayload = stripUndefined({
    ...metaMain,
    planVersion,
    updatedAt: now,
  });

  // Always save schedule, plan, streaks, and painLog to IndexedDB under uid-scoped keys first
  await localPut('schedule', stripUndefined(fullSchedule), uidKey(uid, 'schedule'));
  await localPut('schedule', stripUndefined(fullSchedule), uid);
  await saveLocalPlanForUid(uid, initialPlan);
  await localPut('streaks', stripUndefined(nextStreaks), uidKey(uid, 'streaks'));
  await localPut('streaks', stripUndefined(nextStreaks), uid);
  if (initialPainLog) {
    await saveLocalPainLogForUid(uid, initialPainLog);
  }
  await localPut(
    'settings',
    {
      uid,
      theme: userDocPayload.theme,
      reducedMotion: userDocPayload.reducedMotion,
      soundHaptics: userDocPayload.soundHaptics,
      updatedAt: now,
    },
    uidKey(uid, 'settings')
  );

  const batchPath = `users/${uid} + users/${uid}/meta/main`;
  const userSyncId = `${uid}:__root_user___${uid}`;
  const metaSyncId = `${uid}:meta_main`;

  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    if (isGuest && !auth.currentUser) {
      await localPut('profile', userDocPayload, uidKey(uid, 'profile'));
      await localPut('profile', userDocPayload, uid);
      try {
        const serialized = JSON.stringify(userDocPayload);
        localStorage.setItem(`${uid}:profile`, serialized);
        localStorage.setItem(`hf_profile_${uid}`, serialized);
      } catch {
        // ignore
      }
      await enqueueSyncTask({
        id: userSyncId,
        collectionName: '__root_user__',
        docId: uid,
        data: userDocPayload,
        uid,
        updatedAt: now,
      });
      await enqueueSyncTask({
        id: metaSyncId,
        collectionName: 'meta',
        docId: 'main',
        data: metaDocPayload,
        uid,
        updatedAt: now,
      });
      recordWriteResult({
        status: 'success',
        operation: 'write',
        path: `indexeddb:users/${uid}+meta/main`,
        timestamp: now,
        error: null,
      });
      return { ok: true, profile: userDocPayload };
    }

    const errMsg = 'Authentication session not active for this account.';
    const uncompletedLocal: UserProfile = {
      ...userDocPayload,
      onboardingStep: 8,
      onboardingComplete: false,
    };
    await localPut('profile', uncompletedLocal, uidKey(uid, 'profile'));
    await localPut('profile', uncompletedLocal, uid);
    await enqueueSyncTask({
      id: userSyncId,
      collectionName: '__root_user__',
      docId: uid,
      data: userDocPayload,
      uid,
      updatedAt: now,
    });
    await enqueueSyncTask({
      id: metaSyncId,
      collectionName: 'meta',
      docId: 'main',
      data: metaDocPayload,
      uid,
      updatedAt: now,
    });
    recordWriteResult({
      status: 'error',
      operation: 'write',
      path: batchPath,
      timestamp: now,
      error: errMsg,
    });
    return { ok: false, profile: uncompletedLocal, error: errMsg };
  }

  try {
    const batch = writeBatch(firestoreDb);
    batch.set(doc(firestoreDb, 'users', uid), userDocPayload, { merge: true });
    batch.set(doc(firestoreDb, 'users', uid, 'meta', 'main'), metaDocPayload, { merge: true });
    await batch.commit();

    // Batch succeeded: persist completed profile locally and clean up any queued onboarding tasks
    await localPut('profile', userDocPayload, uidKey(uid, 'profile'));
    await localPut('profile', userDocPayload, uid);
    try {
      const serialized = JSON.stringify(userDocPayload);
      localStorage.setItem(`${uid}:profile`, serialized);
      localStorage.setItem(`hf_profile_${uid}`, serialized);
    } catch {
      // ignore storage quota errors
    }
    await removeSyncTask(userSyncId, uid);
    await removeSyncTask(metaSyncId, uid);

    recordWriteResult({
      status: 'success',
      operation: 'write',
      path: batchPath,
      timestamp: Date.now(),
      error: null,
    });

    // Also mirror subcollection docs in background without blocking
    scheduleBackgroundSync(uid, 'data', 'profile', userDocPayload);
    scheduleBackgroundSync(uid, 'data', 'schedule', fullSchedule);
    scheduleBackgroundSync(uid, 'plans', initialPlan.date, initialPlan);
    scheduleBackgroundSync(uid, 'data', 'streaks', nextStreaks);
    if (initialPainLog) {
      scheduleBackgroundSync(uid, 'painLogs', initialPainLog.id, initialPainLog);
    }

    return { ok: true, profile: userDocPayload };
  } catch (e) {
    const realError = e instanceof Error ? e.message : String(e);
    console.error(`[UnStill Onboarding] Final batch write failed (${batchPath}):`, e);

    // Keep all answers locally at step 8 without marking onboardingComplete true yet
    const uncompletedLocal: UserProfile = {
      ...userDocPayload,
      onboardingStep: 8,
      onboardingComplete: false,
    };
    await localPut('profile', uncompletedLocal, uidKey(uid, 'profile'));
    await localPut('profile', uncompletedLocal, uid);
    try {
      const serialized = JSON.stringify(uncompletedLocal);
      localStorage.setItem(`${uid}:profile`, serialized);
      localStorage.setItem(`hf_profile_${uid}`, serialized);
    } catch {
      // ignore
    }

    await enqueueSyncTask({
      id: userSyncId,
      collectionName: '__root_user__',
      docId: uid,
      data: userDocPayload,
      uid,
      updatedAt: now,
    });
    await enqueueSyncTask({
      id: metaSyncId,
      collectionName: 'meta',
      docId: 'main',
      data: metaDocPayload,
      uid,
      updatedAt: now,
    });

    recordWriteResult({
      status: 'error',
      operation: 'write',
      path: batchPath,
      timestamp: Date.now(),
      error: realError,
    });

    return { ok: false, profile: uncompletedLocal, error: realError };
  }
}

export async function saveProfile(
  uid: string,
  profile: UserProfile,
  onError?: (msg: string) => void
): Promise<void> {
  const clean = stripUndefined({
    ...profile,
    uid,
    onboardingComplete: profile.onboardingComplete ?? true,
  });
  await localPut('profile', clean, uidKey(uid, 'profile'));
  await localPut('profile', clean, uid);
  await localPut(
    'settings',
    {
      uid,
      theme: clean.theme,
      reducedMotion: clean.reducedMotion,
      soundHaptics: clean.soundHaptics,
      updatedAt: Date.now(),
    },
    uidKey(uid, 'settings')
  );
  try {
    const serialized = JSON.stringify(clean);
    localStorage.setItem(`${uid}:profile`, serialized);
    localStorage.setItem(`hf_profile_${uid}`, serialized);
  } catch {
    // ignore storage quota errors
  }
  // Write to both users/{uid} (root user doc) and users/{uid}/data/profile
  scheduleBackgroundSync(uid, '__root_user__', uid, clean, onError);
  scheduleBackgroundSync(uid, 'data', 'profile', clean, onError);
}

// --- SCHEDULE ---
export async function getLocalSchedule(uid: string): Promise<SchedulePrefs | null> {
  if (!uid) return null;
  const cached =
    (await localGet<SchedulePrefs>('schedule', uidKey(uid, 'schedule'))) ||
    (await localGet<SchedulePrefs>('schedule', uid));
  return cached || null;
}

export async function fetchCloudSchedule(
  uid: string,
  onError?: (msg: string) => void
): Promise<SchedulePrefs | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return null;
  try {
    const snap = await getDoc(doc(firestoreDb, 'users', uid, 'data', 'schedule'));
    if (snap.exists()) {
      const data = snap.data() as SchedulePrefs;
      await localPut('schedule', data, uidKey(uid, 'schedule'));
      await localPut('schedule', data, uid);
      return data;
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${uid}/data/schedule`, onError);
  }
  return (await getLocalSchedule(uid)) || null;
}

export async function getSchedule(
  uid: string,
  onError?: (msg: string) => void
): Promise<SchedulePrefs | null> {
  const cached = await getLocalSchedule(uid);
  if (cached) return cached;
  return fetchCloudSchedule(uid, onError);
}

export async function saveSchedule(
  uid: string,
  schedule: SchedulePrefs,
  onError?: (msg: string) => void
): Promise<void> {
  const clean = stripUndefined(schedule);
  await localPut('schedule', clean, uidKey(uid, 'schedule'));
  await localPut('schedule', clean, uid);
  scheduleBackgroundSync(uid, 'data', 'schedule', clean, onError);
}

// --- DAILY PLAN (UID-KEYED) ---
async function saveLocalPlanForUid(uid: string, plan: DailyPlan): Promise<void> {
  const clean = stripUndefined(plan);
  const scopedRecord = {
    ...clean,
    uid,
    originalDate: clean.date,
    date: `${uid}:${clean.date}`,
  };
  await localPut('plans', scopedRecord);
}

export async function getLocalDailyPlan(date: string, uid?: string): Promise<DailyPlan | null> {
  if (uid) {
    const scoped = await localGet<DailyPlan & { uid?: string; originalDate?: string }>(
      'plans',
      `${uid}:${date}`
    );
    if (scoped) {
      const { originalDate, ...rest } = scoped;
      return { ...rest, date: originalDate || date };
    }
  }

  const legacy = await localGet<DailyPlan & { uid?: string; originalDate?: string }>('plans', date);
  if (legacy) {
    if (uid && legacy.uid && legacy.uid !== uid) {
      return null;
    }
    const { originalDate, ...rest } = legacy;
    return { ...rest, date: originalDate || date };
  }
  return null;
}

export async function fetchCloudDailyPlan(
  uid: string,
  date: string,
  onError?: (msg: string) => void
): Promise<DailyPlan | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return null;
  const cached = await getLocalDailyPlan(date, uid);
  try {
    const snap = await getDoc(doc(firestoreDb, 'users', uid, 'plans', date));
    if (snap.exists()) {
      const data = snap.data() as DailyPlan;
      if (
        cached &&
        ((cached.completedCount || 0) > (data.completedCount || 0) ||
          (cached.activeMinutes || 0) > (data.activeMinutes || 0))
      ) {
        scheduleBackgroundSync(uid, 'plans', date, cached);
        return cached;
      }
      await saveLocalPlanForUid(uid, data);
      return data;
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${uid}/plans/${date}`, onError);
  }
  return cached || null;
}

export async function getDailyPlan(
  uid: string,
  date: string,
  onError?: (msg: string) => void
): Promise<DailyPlan | null> {
  const cached = await getLocalDailyPlan(date, uid);
  if (cached) return cached;
  return fetchCloudDailyPlan(uid, date, onError);
}

export async function saveDailyPlan(
  uid: string,
  plan: DailyPlan,
  onError?: (msg: string) => void
): Promise<void> {
  const clean = stripUndefined(plan);
  await saveLocalPlanForUid(uid, clean);
  scheduleBackgroundSync(uid, 'plans', clean.date, clean, onError);
}

export async function getAllPlans(uid?: string): Promise<DailyPlan[]> {
  const raw = await localGetAll<DailyPlan & { uid?: string; originalDate?: string }>('plans');
  return raw
    .filter((p) => {
      if (!uid) return true;
      if (p.uid) return p.uid === uid;
      return String(p.date).startsWith(`${uid}:`);
    })
    .map((p) => {
      const { originalDate, ...rest } = p;
      const cleanDate =
        originalDate || (uid ? String(p.date).replace(new RegExp(`^${uid}:`), '') : p.date);
      return { ...rest, date: cleanDate };
    });
}

// --- SESSIONS & FEEDBACK LOGS (UID-KEYED) ---
async function saveLocalSessionForUid(uid: string, log: SessionLog): Promise<void> {
  const clean = stripUndefined(log);
  const rawId = clean.id.startsWith(`${uid}:`) ? clean.id.slice(uid.length + 1) : clean.id;
  const scoped = {
    ...clean,
    uid,
    rawId,
    id: `${uid}:${rawId}`,
  };
  await localPut('sessions', scoped);
  await localPut('logs', scoped);
  if (clean.feedback) {
    await localPut('feedback', {
      id: `${uid}:${rawId}`,
      rawId,
      uid,
      date: clean.date,
      timestamp: clean.timestamp,
      feedback: clean.feedback,
      hurtArea: clean.hurtArea,
      hurtMoveId: clean.hurtMoveId,
    });
  }
}

export async function getLocalSessionLogs(uid?: string): Promise<SessionLog[]> {
  const logs = await localGetAll<SessionLog & { uid?: string; rawId?: string }>('sessions');
  return logs
    .filter((l) => {
      if (!uid) return true;
      if (l.uid) return l.uid === uid;
      if (String(l.id).includes(':')) return String(l.id).startsWith(`${uid}:`);
      return false;
    })
    .map((l) => {
      const { rawId, ...rest } = l;
      const cleanId = rawId || (uid ? String(l.id).replace(new RegExp(`^${uid}:`), '') : l.id);
      return { ...rest, id: cleanId };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchCloudSessionLogs(
  uid: string,
  onError?: (msg: string) => void
): Promise<SessionLog[]> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return getLocalSessionLogs(uid);
  try {
    const snap = await getDocs(collection(firestoreDb, 'users', uid, 'sessions'));
    for (const d of snap.docs) {
      const cloudLog = d.data() as SessionLog;
      const existing = await localGet<SessionLog>('sessions', `${uid}:${cloudLog.id}`);
      if (!existing || (!existing.feedback && cloudLog.feedback)) {
        await saveLocalSessionForUid(uid, cloudLog);
      }
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, `users/${uid}/sessions`, onError);
  }
  return getLocalSessionLogs(uid);
}

export async function saveSessionLog(
  uid: string,
  log: SessionLog,
  onError?: (msg: string) => void
): Promise<void> {
  const clean = stripUndefined(log);
  await saveLocalSessionForUid(uid, clean);
  scheduleBackgroundSync(uid, 'sessions', clean.id, clean, onError);
}

export async function getSessionLogs(
  uid: string,
  onError?: (msg: string) => void
): Promise<SessionLog[]> {
  const localLogs = await getLocalSessionLogs(uid);
  if (localLogs.length > 0) return localLogs;
  return fetchCloudSessionLogs(uid, onError);
}

// --- PAIN LOGS (UID-KEYED) ---
export function sortPainLogsNewestFirst(logs: PainLog[]): PainLog[] {
  return [...logs].sort((a, b) => {
    const timeDiff = (b.timestamp || 0) - (a.timestamp || 0);
    if (timeDiff !== 0) return timeDiff;
    const aIsOnboarding = a.notes === 'Initial onboarding check-in' ? 1 : 0;
    const bIsOnboarding = b.notes === 'Initial onboarding check-in' ? 1 : 0;
    if (aIsOnboarding !== bIsOnboarding) return aIsOnboarding - bIsOnboarding;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

async function saveLocalPainLogForUid(uid: string, log: PainLog): Promise<void> {
  const clean = stripUndefined(log);
  const rawId = clean.id.startsWith(`${uid}:`) ? clean.id.slice(uid.length + 1) : clean.id;
  await localPut('painLogs', {
    ...clean,
    uid,
    rawId,
    id: `${uid}:${rawId}`,
  });
}

export async function getLocalPainLogs(uid?: string): Promise<PainLog[]> {
  const logs = await localGetAll<PainLog & { uid?: string; rawId?: string }>('painLogs');
  const mapped = logs
    .filter((l) => {
      if (!uid) return true;
      if (l.uid) return l.uid === uid;
      if (String(l.id).includes(':')) return String(l.id).startsWith(`${uid}:`);
      return false;
    })
    .map((l) => {
      const { rawId, ...rest } = l;
      const cleanId = rawId || (uid ? String(l.id).replace(new RegExp(`^${uid}:`), '') : l.id);
      return { ...rest, id: cleanId };
    });
  return sortPainLogsNewestFirst(mapped);
}

export async function fetchCloudPainLogs(
  uid: string,
  onError?: (msg: string) => void
): Promise<PainLog[]> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return getLocalPainLogs(uid);
  try {
    const colRef = collection(firestoreDb, 'users', uid, 'painLogs');
    let snap;
    try {
      const q =
        typeof query === 'function' && typeof orderBy === 'function'
          ? query(colRef, orderBy('timestamp', 'desc'))
          : colRef;
      snap = await getDocs(q);
    } catch {
      snap = await getDocs(colRef);
    }
    const cloudLogs: PainLog[] = [];
    for (const d of snap.docs) {
      const raw = d.data() as PainLog;
      if (!raw || typeof raw !== 'object') continue;
      const normalized: PainLog = {
        ...raw,
        id: raw.id || d.id,
        timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : 0,
      };
      cloudLogs.push(normalized);
    }
    const sortedCloud = sortPainLogsNewestFirst(cloudLogs);
    for (const log of sortedCloud) {
      await saveLocalPainLogForUid(uid, log);
    }
    const localMerged = await getLocalPainLogs(uid);
    // Merge sortedCloud + localMerged by id and sort newest first so even if IndexedDB is in fallback mode, all logs are preserved
    const byId = new Map<string, PainLog>();
    for (const l of localMerged) {
      if (l.id) byId.set(l.id, l);
    }
    for (const l of sortedCloud) {
      if (l.id && !byId.has(l.id)) byId.set(l.id, l);
    }
    return sortPainLogsNewestFirst(Array.from(byId.values()));
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, `users/${uid}/painLogs`, onError);
  }
  return getLocalPainLogs(uid);
}

export async function savePainLog(
  uid: string,
  log: PainLog,
  onError?: (msg: string) => void
): Promise<void> {
  const clean = stripUndefined(log);
  await saveLocalPainLogForUid(uid, clean);
  await scheduleBackgroundSync(uid, 'painLogs', clean.id, clean, onError);
}

export async function getPainLogs(
  uid: string,
  onError?: (msg: string) => void
): Promise<PainLog[]> {
  const localLogs = await getLocalPainLogs(uid);
  if (localLogs.length > 0) return localLogs;
  return fetchCloudPainLogs(uid, onError);
}

// --- STREAKS (UID-KEYED) ---
export async function getLocalStreaks(uid: string): Promise<StreakData | null> {
  if (!uid) return null;
  const cached =
    (await localGet<StreakData>('streaks', uidKey(uid, 'streaks'))) ||
    (await localGet<StreakData>('streaks', uid));
  return cached || null;
}

export async function fetchCloudStreaks(
  uid: string,
  onError?: (msg: string) => void
): Promise<StreakData | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return null;
  const cached = await getLocalStreaks(uid);
  try {
    const snap = await getDoc(doc(firestoreDb, 'users', uid, 'data', 'streaks'));
    if (snap.exists()) {
      const data = snap.data() as StreakData;
      if (
        cached &&
        ((cached.lastActiveDate || '') > (data.lastActiveDate || '') ||
          ((cached.lastActiveDate || '') === (data.lastActiveDate || '') &&
            (cached.currentStreak || 0) >= (data.currentStreak || 0)))
      ) {
        const merged: StreakData = {
          ...data,
          ...cached,
          currentStreak: Math.max(
            cached.currentStreak || 0,
            (cached.lastActiveDate || '') === (data.lastActiveDate || '')
              ? data.currentStreak || 0
              : 0
          ),
          bestStreak: Math.max(cached.bestStreak || 0, data.bestStreak || 0),
          weeklyConsistency: {
            ...(data.weeklyConsistency || {}),
            ...(cached.weeklyConsistency || {}),
          },
          badges: Array.from(new Set([...(data.badges || []), ...(cached.badges || [])])),
        };
        await localPut('streaks', merged, uidKey(uid, 'streaks'));
        await localPut('streaks', merged, uid);
        scheduleBackgroundSync(uid, 'data', 'streaks', merged);
        return merged;
      }
      await localPut('streaks', data, uidKey(uid, 'streaks'));
      await localPut('streaks', data, uid);
      return data;
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${uid}/data/streaks`, onError);
  }
  return cached || null;
}

export async function getStreaks(
  uid: string,
  onError?: (msg: string) => void
): Promise<StreakData | null> {
  const cached = await getLocalStreaks(uid);
  if (cached) return cached;
  return fetchCloudStreaks(uid, onError);
}

export async function saveStreaks(
  uid: string,
  streaks: StreakData,
  onError?: (msg: string) => void
): Promise<void> {
  const clean = stripUndefined(streaks);
  await localPut('streaks', clean, uidKey(uid, 'streaks'));
  await localPut('streaks', clean, uid);
  scheduleBackgroundSync(uid, 'data', 'streaks', clean, onError);
}

// --- CUSTOM WORKOUTS (UID-KEYED) ---
async function saveLocalWorkoutForUid(uid: string, workout: CustomWorkout): Promise<void> {
  const clean = stripUndefined(workout);
  const rawId = clean.id.startsWith(`${uid}:`) ? clean.id.slice(uid.length + 1) : clean.id;
  await localPut('workouts', {
    ...clean,
    uid,
    rawId,
    id: `${uid}:${rawId}`,
  });
}

export async function getLocalWorkouts(uid?: string): Promise<CustomWorkout[]> {
  const workouts = await localGetAll<CustomWorkout & { uid?: string; rawId?: string }>('workouts');
  return workouts
    .filter((w) => {
      if (!uid) return true;
      if (w.uid) return w.uid === uid;
      if (String(w.id).includes(':')) return String(w.id).startsWith(`${uid}:`);
      return false;
    })
    .map((w) => {
      const { rawId, ...rest } = w;
      const cleanId = rawId || (uid ? String(w.id).replace(new RegExp(`^${uid}:`), '') : w.id);
      return { ...rest, id: cleanId };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchCloudWorkouts(
  uid: string,
  onError?: (msg: string) => void
): Promise<CustomWorkout[]> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return getLocalWorkouts(uid);
  try {
    const snap = await getDocs(collection(firestoreDb, 'users', uid, 'workouts'));
    for (const d of snap.docs) {
      await saveLocalWorkoutForUid(uid, d.data() as CustomWorkout);
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, `users/${uid}/workouts`, onError);
  }
  return getLocalWorkouts(uid);
}

export async function saveCustomWorkout(
  uid: string,
  workout: CustomWorkout,
  onError?: (msg: string) => void
): Promise<void> {
  await saveLocalWorkoutForUid(uid, workout);
  scheduleBackgroundSync(uid, 'workouts', workout.id, workout, onError);
}

export async function getCustomWorkouts(
  uid: string,
  onError?: (msg: string) => void
): Promise<CustomWorkout[]> {
  const localW = await getLocalWorkouts(uid);
  if (localW.length > 0) return localW;
  return fetchCloudWorkouts(uid, onError);
}

export async function deleteCustomWorkout(
  uid: string,
  workoutId: string,
  onError?: (msg: string) => void
): Promise<void> {
  await localDelete('workouts', `${uid}:${workoutId}`);
  await localDelete('workouts', workoutId);
  if (auth.currentUser && auth.currentUser.uid === uid) {
    deleteDoc(doc(firestoreDb, 'users', uid, 'workouts', workoutId)).catch((e) => {
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/workouts/${workoutId}`, onError);
    });
  }
}

// --- PROBLEM REPORTS (Section 10.2) ---
export async function submitProblemReport(
  uid: string,
  category: ReportCategory,
  message: string,
  onError?: (msg: string) => void
): Promise<{ syncedNow: boolean }> {
  const cleanMessage = message.trim().slice(0, 500);
  if (!cleanMessage) {
    throw new Error('Please enter a short description.');
  }

  const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    uid,
    category,
    message: cleanMessage,
    appVersion: APP_VERSION,
  };

  // Always queue locally first so offline or guest reports are never lost
  const task: SyncTask = {
    id: `${uid}:${reportId}`,
    collectionName: '__top_reports__',
    docId: reportId,
    data: payload,
    uid,
    updatedAt: Date.now(),
  };
  await enqueueSyncTask(task);

  if (auth.currentUser && auth.currentUser.uid === uid && navigator.onLine) {
    const ok = await syncDocWithRetry(task, onError, 1);
    return { syncedNow: ok };
  }
  return { syncedNow: false };
}

export async function clearAllUserData(uid: string): Promise<void> {
  await clearSessionCacheOnSignOut(uid);
  // Delete only items belonging to this uid across stores
  const plans = await getAllPlans(uid);
  for (const p of plans) {
    await localDelete('plans', `${uid}:${p.date}`);
    await localDelete('plans', p.date);
  }
  const sessions = await getLocalSessionLogs(uid);
  for (const s of sessions) {
    await localDelete('sessions', `${uid}:${s.id}`);
    await localDelete('logs', `${uid}:${s.id}`);
    await localDelete('feedback', `${uid}:${s.id}`);
  }
  const pains = await getLocalPainLogs(uid);
  for (const p of pains) {
    await localDelete('painLogs', `${uid}:${p.id}`);
  }
  const workouts = await getLocalWorkouts(uid);
  for (const w of workouts) {
    await localDelete('workouts', `${uid}:${w.id}`);
  }
  const queued = await getQueuedWritesList(uid);
  for (const q of queued) {
    await removeSyncTask(q.id, uid);
  }

  if (auth.currentUser && auth.currentUser.uid === uid) {
    try {
      await deleteDoc(doc(firestoreDb, 'users', uid));
      await deleteDoc(doc(firestoreDb, 'users', uid, 'meta', 'main'));
      await deleteDoc(doc(firestoreDb, 'users', uid, 'data', 'profile'));
      await deleteDoc(doc(firestoreDb, 'users', uid, 'data', 'schedule'));
      await deleteDoc(doc(firestoreDb, 'users', uid, 'data', 'streaks'));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/data/*`);
    }
  }
}

export async function exportAllData(uid: string) {
  const profile = await getLocalProfile(uid) || (await getProfile(uid));
  const schedule = await getLocalSchedule(uid) || (await getSchedule(uid));
  const plans = await getAllPlans(uid);
  const sessions = await getLocalSessionLogs(uid);
  const painLogs = await getLocalPainLogs(uid);
  const streaks = await getLocalStreaks(uid);
  const workouts = await getLocalWorkouts(uid);
  return {
    app: 'UnStill',
    uid,
    exportedAt: new Date().toISOString(),
    profile,
    schedule,
    plans,
    sessions,
    painLogs,
    streaks,
    workouts,
  };
}

export async function downloadUserDataAsJsonFile(
  uid: string,
  filenamePrefix: string = 'unstill-guest-progress'
): Promise<void> {
  const data = await exportAllData(uid);
  const jsonString = JSON.stringify(data, null, 2);
  try {
    localStorage.setItem(`hf_exported_backup_${uid}`, jsonString);
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
        a.style.display = 'none';
        document.body?.appendChild(a);
        a.click();
        document.body?.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore DOM download errors in headless environments
    }
  }
}

