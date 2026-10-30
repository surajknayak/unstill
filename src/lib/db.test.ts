import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mock state for simulating old-schema IndexedDB, NotFoundError, and Firestore
const mocks = vi.hoisted(() => {
  return {
    openDBCalls: [] as Array<{ name: string; version: number; callbacks: any }>,
    deleteDBCalls: [] as string[],
    simulateMode: 'healthy' as 'healthy' | 'old_schema_not_found' | 'idb_unavailable' | 'idb_hung',
    closedConnections: 0,
    guestExistingData: {} as Record<string, any[]>,
    firestoreProfileDoc: null as Record<string, any> | null,
    currentStores: new Set<string>(),
    storeData: new Map<string, Map<string, any>>(),
    currentUser: {
      uid: 'user_returning_123',
      email: 'returning@example.com',
      emailVerified: true,
      isAnonymous: false,
    } as any,
    setDocCalls: [] as Array<{ path: string; data: any; options: any }>,
    batchSetCalls: [] as Array<{ path: string; data: any; options: any }>,
    batchCommitCalls: 0,
    setDocError: null as Error | null,
    batchCommitError: null as Error | null,
    setDocDelayMs: 0,
    batchCommitDelayMs: 0,
    resetConnectionCalls: 0,
    firestorePainDocs: [] as Array<{ id: string; data: any }>,
  };
});

vi.mock('idb', () => {
  const createMockDB = (storeSet: Set<string>, dataMap: Map<string, Map<string, any>>) => {
    const getStoreMap = (name: string) => {
      if (!dataMap.has(name)) dataMap.set(name, new Map());
      return dataMap.get(name)!;
    };

    const db: any = {
      objectStoreNames: {
        contains: (name: string) => storeSet.has(name),
        [Symbol.iterator]: function* () {
          yield* storeSet.values();
        },
      },
      createObjectStore: vi.fn((name: string) => {
        storeSet.add(name);
        getStoreMap(name);
        const indexSet = new Set<string>();
        return {
          indexNames: {
            contains: (idx: string) => indexSet.has(idx),
          },
          createIndex: vi.fn((idx: string) => {
            indexSet.add(idx);
          }),
        };
      }),
      close: vi.fn(() => {
        mocks.closedConnections += 1;
      }),
      get: vi.fn(async (storeName: string, key: string) => {
        if (!storeSet.has(storeName)) {
          const err = new Error(
            "Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found."
          );
          err.name = 'NotFoundError';
          throw err;
        }
        return getStoreMap(storeName).get(key);
      }),
      put: vi.fn(async (storeName: string, value: any, explicitKey?: string) => {
        if (!storeSet.has(storeName)) {
          const err = new Error(
            "Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found."
          );
          err.name = 'NotFoundError';
          throw err;
        }
        const key = explicitKey || value?.id || value?.date || '__default__';
        getStoreMap(storeName).set(key, value);
      }),
      getAll: vi.fn(async (storeName: string) => {
        if (!storeSet.has(storeName)) {
          const err = new Error(
            "Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found."
          );
          err.name = 'NotFoundError';
          throw err;
        }
        return Array.from(getStoreMap(storeName).values());
      }),
      delete: vi.fn(async (storeName: string, key: string) => {
        if (!storeSet.has(storeName)) {
          const err = new Error(
            "Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found."
          );
          err.name = 'NotFoundError';
          throw err;
        }
        getStoreMap(storeName).delete(key);
      }),
      clear: vi.fn(async (storeName: string) => {
        if (!storeSet.has(storeName)) {
          const err = new Error(
            "Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found."
          );
          err.name = 'NotFoundError';
          throw err;
        }
        getStoreMap(storeName).clear();
      }),
      onversionchange: null,
    };
    return db;
  };

  return {
    openDB: vi.fn(async (name: string, version: number, callbacks?: any) => {
      mocks.openDBCalls.push({ name, version, callbacks });

      if (mocks.simulateMode === 'idb_unavailable') {
        const err = new Error('IndexedDB is disabled in private mode');
        err.name = 'SecurityError';
        throw err;
      }

      if (mocks.simulateMode === 'idb_hung') {
        return new Promise(() => {
          // Never settles
        });
      }

      if (mocks.simulateMode === 'old_schema_not_found') {
        // Simulate a corrupted or old-build DB that is missing required stores on first open
        const partialStores = new Set<string>(['plans']);
        const partialData = new Map<string, Map<string, any>>();
        for (const [k, items] of Object.entries(mocks.guestExistingData)) {
          partialStores.add(k);
          const m = new Map<string, any>();
          items.forEach((item, idx) => m.set(String(idx), item));
          partialData.set(k, m);
        }
        const brokenDb = createMockDB(partialStores, partialData);
        // After deleteDB is called during repair, subsequent openDB will run upgrade cleanly
        mocks.simulateMode = 'healthy';
        return brokenDb;
      }

      const db = createMockDB(mocks.currentStores, mocks.storeData);
      if (callbacks?.upgrade) {
        callbacks.upgrade(db, 0, version, {
          objectStore: (storeName: string) => ({
            indexNames: { contains: () => false },
            createIndex: vi.fn(),
            name: storeName,
          }),
        });
      }
      return db;
    }),
    deleteDB: vi.fn(async (name: string) => {
      mocks.deleteDBCalls.push(name);
      mocks.currentStores.clear();
      mocks.storeData.clear();
    }),
  };
});

vi.mock('./firebase', () => ({
  db: { __mockFirestore: true },
  auth: {
    get currentUser() {
      return mocks.currentUser;
    },
  },
  resetFirestoreConnection: vi.fn(async () => {
    mocks.resetConnectionCalls += 1;
    return { __mockFirestore: true };
  }),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: any, ...segments: string[]) => ({ path: segments.join('/') })),
  collection: vi.fn((_db: any, ...segments: string[]) => ({ path: segments.join('/') })),
  getDoc: vi.fn(async () => ({
    exists: () => Boolean(mocks.firestoreProfileDoc),
    data: () => mocks.firestoreProfileDoc,
  })),
  getDocFromServer: vi.fn(async (ref: { path: string }) => {
    if (ref.path === `users/${mocks.currentUser?.uid}` && mocks.firestoreProfileDoc) {
      return {
        exists: () => true,
        data: () => mocks.firestoreProfileDoc,
      };
    }
    return {
      exists: () => false,
      data: () => undefined,
    };
  }),
  setDoc: vi.fn(async (ref: { path: string }, data: any, options: any) => {
    if (mocks.setDocDelayMs > 0) {
      await new Promise((r) => setTimeout(r, mocks.setDocDelayMs));
    }
    if (mocks.setDocError) {
      throw mocks.setDocError;
    }
    mocks.setDocCalls.push({ path: ref.path, data, options });
  }),
  writeBatch: vi.fn(() => {
    const staged: Array<{ path: string; data: any; options: any }> = [];
    return {
      set: vi.fn((ref: { path: string }, data: any, options: any) => {
        staged.push({ path: ref.path, data, options });
      }),
      commit: vi.fn(async () => {
        if (mocks.batchCommitDelayMs > 0) {
          await new Promise((r) => setTimeout(r, mocks.batchCommitDelayMs));
        }
        if (mocks.batchCommitError) {
          throw mocks.batchCommitError;
        }
        mocks.batchCommitCalls += 1;
        mocks.batchSetCalls.push(...staged);
      }),
    };
  }),
  getDocs: vi.fn(async (ref: any) => {
    if (ref?.path && String(ref.path).endsWith('/painLogs')) {
      return {
        docs: mocks.firestorePainDocs.map((d) => ({
          id: d.id,
          data: () => d.data,
        })),
      };
    }
    return { docs: [] };
  }),
  query: vi.fn((colRef: any) => colRef),
  orderBy: vi.fn((field: string, dir: string) => ({ field, dir })),
  deleteDoc: vi.fn(async () => {}),
  addDoc: vi.fn(async () => {}),
  serverTimestamp: vi.fn(() => Date.now()),
}));

import {
  DB_NAME,
  DB_VERSION,
  OBJECT_STORE_NAMES,
  upgradeDatabaseSchema,
  getLocalProfile,
  saveProfile,
  fetchCloudProfileDetailed,
  ensureLocalDBHealthy,
  saveSessionLog,
  savePainLog,
  getLocalPainLogs,
  fetchCloudPainLogs,
  sortPainLogsNewestFirst,
  resetLocalDBConnectionForTest,
  isOnboardingComplete,
  computeResumeOnboardingStep,
  saveOnboardingStepProgress,
  completeOnboardingBatch,
  getLastWriteResult,
  getQueuedWritesCount,
  getAllQueuedWritesDebugSummary,
  clearSessionCacheOnSignOut,
  flushPendingSyncQueue,
  createInitialUserDoc,
  hasLegacyOnboardingCompletionEvidence,
  saveOnboardingDraftForUid,
  getOnboardingDraftForUid,
  waitForSyncQueueIdle,
  getLastSyncTime,
  getLastSyncError,
  setIdbTimeoutForTest,
  setFirestoreWriteTimeoutForTest,
} from './db';
import {
  APP_VERSION,
  BUILD_ID,
  isBuildOlderThan,
  checkVersionJsonAndKillSwitch,
  isUpdateBannerDismissedForBuild,
  dismissUpdateBannerForBuild,
  hasShownUpdateBannerInSession,
} from '../config';
import {
  selectLatestPainLog,
  computeInitialPainCheckinState,
  formatTimeAgo,
  ONBOARDING_CHECKIN_NOTE,
} from '../screens/PainCheckinScreen';

describe('IndexedDB schema upgrade, NotFoundError auto-repair, and Firestore profile recovery', () => {
  beforeEach(() => {
    resetLocalDBConnectionForTest();
    mocks.openDBCalls = [];
    mocks.deleteDBCalls = [];
    mocks.simulateMode = 'healthy';
    mocks.closedConnections = 0;
    mocks.guestExistingData = {};
    mocks.currentStores = new Set<string>();
    mocks.storeData = new Map();
    mocks.setDocCalls = [];
    mocks.batchSetCalls = [];
    mocks.batchCommitCalls = 0;
    mocks.setDocError = null;
    mocks.batchCommitError = null;
    mocks.setDocDelayMs = 0;
    mocks.batchCommitDelayMs = 0;
    mocks.resetConnectionCalls = 0;
    mocks.firestorePainDocs = [];
    mocks.currentUser = {
      uid: 'user_returning_123',
      email: 'returning@example.com',
      emailVerified: true,
      isAnonymous: false,
    };
    mocks.firestoreProfileDoc = {
      uid: 'user_returning_123',
      name: 'Aarav',
      level: 'Steady',
      goal: 'Ease stiffness',
      conditions: ['neck_cs'],
      onboardingComplete: true,
      updatedAt: 1700000000000,
    };

    // Provide minimal global indexedDB and localStorage for Node test environment
    Object.defineProperty(globalThis, 'indexedDB', {
      value: {},
      configurable: true,
      writable: true,
    });
    const lsMap = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => lsMap.get(k) ?? null,
        setItem: (k: string, v: string) => lsMap.set(k, v),
        removeItem: (k: string) => lsMap.delete(k),
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });
  });

  it('defines a single canonical list of all required stores and bumps DB_VERSION to 3', () => {
    expect(DB_NAME).toBe('habit-flow-db');
    expect(DB_VERSION).toBeGreaterThanOrEqual(3);
    expect(OBJECT_STORE_NAMES).toEqual(
      expect.arrayContaining([
        'profile',
        'schedule',
        'plans',
        'sessions',
        'painLogs',
        'streaks',
        'workouts',
        'logs',
        'feedback',
        'reportsQueue',
        'syncQueue',
        'settings',
      ])
    );
  });

  it('upgrades an old v1 database by creating only missing stores without deleting existing stores', () => {
    // Pre-existing v1 database that only has 'profile' and 'plans'
    const existingStores = new Set<string>(['profile', 'plans']);
    const createdStores: string[] = [];
    const deletedStores: string[] = [];

    const mockUpgradeDb: any = {
      objectStoreNames: {
        contains: (name: string) => existingStores.has(name),
      },
      createObjectStore: (name: string) => {
        existingStores.add(name);
        createdStores.push(name);
        return {
          indexNames: { contains: () => false },
          createIndex: vi.fn(),
        };
      },
      deleteObjectStore: (name: string) => {
        deletedStores.push(name);
      },
    };

    upgradeDatabaseSchema(mockUpgradeDb, 1, DB_VERSION, null);

    // Must never delete any existing store
    expect(deletedStores).toHaveLength(0);
    // Must not recreate 'profile' or 'plans'
    expect(createdStores).not.toContain('profile');
    expect(createdStores).not.toContain('plans');
    // Every canonical store must now be present
    for (const requiredStore of OBJECT_STORE_NAMES) {
      expect(existingStores.has(requiredStore)).toBe(true);
    }
  });

  it('repairs silently when an old-schema DB lacks stores (NotFoundError), loads Firestore profile, and enables direct Today routing', async () => {
    // Simulate an old-schema DB missing 'profile' and 'syncQueue'
    mocks.simulateMode = 'old_schema_not_found';

    await ensureLocalDBHealthy();

    // Verify old connection was closed, local cache DB was deleted & recreated at DB_VERSION
    expect(mocks.closedConnections).toBeGreaterThanOrEqual(1);
    expect(mocks.deleteDBCalls).toContain('habit-flow-db');
    expect(OBJECT_STORE_NAMES.every((s) => mocks.currentStores.has(s))).toBe(true);

    // Now load profile: local cache is empty after repair, so fetchCloudProfileDetailed loads from Firestore
    const cachedBeforeCloud = await getLocalProfile('user_returning_123');
    expect(cachedBeforeCloud).toBeNull();

    const cloudRes = await fetchCloudProfileDetailed('user_returning_123');
    expect(cloudRes.status).toBe('found');
    expect(cloudRes.profile?.onboardingComplete).toBe(true);
    expect(cloudRes.profile?.name).toBe('Aarav');

    // And the repaired IndexedDB now caches the Firestore profile for instant subsequent starts
    const cachedAfterCloud = await getLocalProfile('user_returning_123');
    expect(cachedAfterCloud?.onboardingComplete).toBe(true);
    expect(cachedAfterCloud?.level).toBe('Steady');
  });

  it('exports a local guest backup JSON before repairing if guest data exists in an old-schema DB', async () => {
    mocks.currentUser = null; // Guest user
    mocks.guestExistingData = {
      plans: [{ date: '2026-10-28', completedCount: 2, activeMinutes: 5 }],
    };
    mocks.simulateMode = 'old_schema_not_found';

    // Trigger an operation on a missing store ('profile') which triggers repair
    const profile = await getLocalProfile('guest_123');
    expect(profile).toBeNull();

    const backupJson = globalThis.localStorage.getItem('hf_guest_backup_json');
    expect(backupJson).toBeTruthy();
    const parsed = JSON.parse(backupJson!);
    expect(parsed.reason).toBe('local_db_schema_repair_backup');
    expect(parsed.data.plans).toHaveLength(1);
    expect(parsed.data.plans[0].completedCount).toBe(2);
  });

  it('falls back to in-memory state and Firestore without crashing when IndexedDB is unavailable', async () => {
    mocks.simulateMode = 'idb_unavailable';
    Object.defineProperty(globalThis, 'indexedDB', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    // Force operation when IndexedDB is unavailable
    await saveSessionLog('user_returning_123', {
      id: 'sess_mem_1',
      date: '2026-10-28',
      timestamp: Date.now(),
      title: 'Neck Reset',
      category: 'reset',
      durationSec: 120,
      feedback: 'good',
    });

    const cloudRes = await fetchCloudProfileDetailed('user_returning_123');
    expect(cloudRes.status).toBe('found');
    expect(cloudRes.profile?.onboardingComplete).toBe(true);
  });

  it('isOnboardingComplete returns true ONLY when userDoc.onboardingComplete === true', () => {
    expect(isOnboardingComplete(null)).toBe(false);
    expect(isOnboardingComplete(undefined)).toBe(false);
    expect(isOnboardingComplete({ level: 'Steady', conditions: ['neck_cs'] })).toBe(false);
    expect(isOnboardingComplete({ onboardingComplete: false, level: 'Steady' })).toBe(false);
    expect(isOnboardingComplete({ onboardingComplete: true })).toBe(true);
  });

  it('preserves partial Step 1 data from users/{uid} and resumes at Step 2 instead of restarting at Step 1', async () => {
    // Simulate a Google user whose Firestore users/{uid} only has step 1 data
    mocks.firestoreProfileDoc = {
      name: 'Suraj',
      ageBand: '25–34',
      sex: 'Male',
      heightUnit: 'cm',
    };

    const cloudRes = await fetchCloudProfileDetailed('user_returning_123');
    expect(cloudRes.status).toBe('found');
    expect(isOnboardingComplete(cloudRes.profile)).toBe(false);
    expect(cloudRes.profile?.name).toBe('Suraj');
    expect(cloudRes.profile?.ageBand).toBe('25–34');
    expect(cloudRes.profile?.sex).toBe('Male');
    expect(cloudRes.profile?.heightUnit).toBe('cm');
    expect(cloudRes.profile?.onboardingStep).toBe(2);
    expect(computeResumeOnboardingStep(cloudRes.profile)).toBe(2);
  });

  it('saves onboarding steps locally first (< 300 ms) without awaiting Firestore and syncs with merge:true in background', async () => {
    const start1 = Date.now();
    const step1Res = await saveOnboardingStepProgress('user_returning_123', 2, {
      name: 'Suraj',
      ageBand: '25–34',
      sex: 'Male',
      timeZone: 'Asia/Kolkata',
    });
    const elapsed1 = Date.now() - start1;

    expect(step1Res.ok).toBe(true);
    expect(elapsed1).toBeLessThan(300);
    await waitForSyncQueueIdle();

    expect(mocks.setDocCalls).toHaveLength(1);
    expect(mocks.setDocCalls[0].path).toBe('users/user_returning_123');
    expect(mocks.setDocCalls[0].options).toEqual({ merge: true });
    expect(mocks.setDocCalls[0].data.onboardingStep).toBe(2);
    expect(getLastWriteResult().status).toBe('success');
    expect(getLastSyncTime()).not.toBeNull();
    expect(getLastSyncError()).toBeNull();

    // Simulate a Firestore error on Step 2 -> 3: local save still returns { ok: true } immediately
    mocks.setDocError = new Error('PERMISSION_DENIED: Missing or insufficient permissions.');
    const start2 = Date.now();
    const step2Res = await saveOnboardingStepProgress('user_returning_123', 3, {
      habitType: 'Move more',
      sittingHoursPerDay: 8,
      currentActiveDays: 2,
    });
    expect(step2Res.ok).toBe(true);
    expect(Date.now() - start2).toBeLessThan(300);

    await waitForSyncQueueIdle();
    expect(getLastWriteResult().status).toBe('error');
    expect(getLastSyncError()).toContain('PERMISSION_DENIED');
    expect(await getQueuedWritesCount('user_returning_123')).toBeGreaterThanOrEqual(1);

    // Local profile kept the answers and updated onboardingStep to 3
    const localAfterError = await getLocalProfile('user_returning_123');
    expect(localAfterError?.habitType).toBe('Move more');
    expect(localAfterError?.sittingHoursPerDay).toBe(8);
    expect(localAfterError?.onboardingStep).toBe(3);
  });

  it('advances every onboarding step and final plan in under 500 ms when Firestore is stalled/blocked, resets connection after 2 failures, and syncs to Firestore when network returns', async () => {
    const uid = 'user_stalled_network_123';
    mocks.currentUser = { uid, isAnonymous: false };
    setFirestoreWriteTimeoutForTest(60);

    // Simulate stalled/blocked Firestore (> 5000 ms delay or network error)
    mocks.setDocDelayMs = 5000;
    mocks.batchCommitDelayMs = 5000;

    // Step 1 -> 2 advances in < 500 ms without waiting on stalled network
    const tStep1 = Date.now();
    const res1 = await saveOnboardingStepProgress(uid, 2, {
      name: 'Suraj',
      ageBand: '25–34',
      sex: 'Male',
      timeZone: 'Asia/Kolkata',
    });
    expect(res1.ok).toBe(true);
    expect(Date.now() - tStep1).toBeLessThan(500);

    // Step 2 -> 3 advances in < 500 ms and merges idempotently in syncQueue
    const tStep2 = Date.now();
    const res2 = await saveOnboardingStepProgress(uid, 3, {
      habitType: 'All of the above',
      sittingHoursPerDay: 7,
      currentActiveDays: 3,
    });
    expect(res2.ok).toBe(true);
    expect(Date.now() - tStep2).toBeLessThan(500);

    // Step 3 -> 8 answers
    const tStep3 = Date.now();
    const res3 = await saveOnboardingStepProgress(uid, 8, {
      conditions: ['neck_cs', 'lower_back'],
      painBaseline: { neck_cs: 4, lower_back: 3 },
      painDuration: { neck_cs: 'Few weeks', lower_back: 'Few days' },
      gettingWorse: { neck_cs: false, lower_back: false },
      pregnantOrPostpartum: false,
      doctorAdviceToAvoid: false,
      recentSurgery: false,
      workStart: '09:30',
      workEnd: '18:00',
      workType: 'Desk / laptop',
      remindersPerDay: 4,
      daysOff: [0, 6],
      location: 'At desk',
      equipment: ['Chair / Desk'],
      level: 'Steady',
      goal: 'Ease stiffness',
      cheerStyle: 'Warm & celebratory',
    });
    expect(res3.ok).toBe(true);
    expect(Date.now() - tStep3).toBeLessThan(500);

    const now = Date.now();
    const fullProfile: any = {
      ...res3.profile,
      uid,
      planVersion: 1,
      onboardingComplete: true,
      onboardingCompletedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const fullSchedule: any = {
      workStart: '09:30',
      workEnd: '18:00',
      workType: 'Desk / laptop',
      breakWindows: ['10:30', '13:15', '15:30', '17:30'],
      daysOff: [0, 6],
      remindersPerDay: 4,
      quietHours: { start: '21:30', end: '08:00' },
      equipment: ['Chair / Desk'],
      location: 'At desk',
    };
    const metaMain = {
      planSummary: {
        whyThisPlan: 'Tailored for neck & lower back comfort',
        level: 'Steady',
        goal: 'Ease stiffness',
        focusAreas: ['Neck', 'Lower back'],
        remindersPerDay: 4,
        activeWindow: '09:30 – 18:00',
        workType: 'Desk / laptop',
        location: 'At desk',
        equipment: ['Chair / Desk'],
      },
      monthlyTheme: 'Ease stiffness',
      weeklyRhythm: {
        workStart: '09:30',
        workEnd: '18:00',
        workType: 'Desk / laptop',
        remindersPerDay: 4,
        daysOff: [0, 6],
        breakWindows: ['10:30', '13:15', '15:30', '17:30'],
        level: 'Steady',
      },
      planVersion: 1,
      updatedAt: now,
    };
    const initialPlan: any = {
      date: '2026-10-29',
      tasks: [],
      completedCount: 0,
      totalCount: 4,
      activeMinutes: 0,
      waterCups: 0,
      waterGoal: 8,
      steps: 0,
      stepGoal: 6500,
    };
    const initialStreaks: any = {
      currentStreak: 0,
      bestStreak: 0,
      freezeTokens: 2,
      maxFreezes: 2,
      lastActiveDate: '',
      weeklyConsistency: {},
      badges: ['First Step'],
    };

    // Final plan step returns { ok: true } immediately (< 500 ms) with onboardingComplete: true locally
    const tFinal = Date.now();
    const finalRes = await completeOnboardingBatch(
      uid,
      fullProfile,
      fullSchedule,
      metaMain,
      initialPlan,
      initialStreaks,
      null,
      false
    );
    expect(finalRes.ok).toBe(true);
    expect(finalRes.profile.onboardingComplete).toBe(true);
    expect(Date.now() - tFinal).toBeLessThan(500);

    // Wait for background stalled attempts to time out and trigger resetFirestoreConnection after 2 consecutive failures
    await waitForSyncQueueIdle();
    expect(mocks.resetConnectionCalls).toBeGreaterThanOrEqual(1);
    expect(getLastSyncError()).toContain('timed out');
    expect(await getQueuedWritesCount(uid)).toBeGreaterThan(0);

    // Now network returns (fast & healthy): flushPendingSyncQueue writes users/{uid} (onboardingComplete: true + all answers) and users/{uid}/meta/main
    mocks.setDocDelayMs = 0;
    mocks.batchCommitDelayMs = 0;
    mocks.setDocError = null;
    mocks.batchCommitError = null;

    const flushRes = await flushPendingSyncQueue(uid);
    expect(flushRes.failedCount).toBe(0);
    expect(flushRes.syncedCount).toBeGreaterThan(0);
    expect(await getQueuedWritesCount(uid)).toBe(0);
    expect(getLastSyncTime()).not.toBeNull();
    expect(getLastSyncError()).toBeNull();

    const userBatchWrite = mocks.batchSetCalls.find((c) => c.path === `users/${uid}`)!;
    expect(userBatchWrite).toBeDefined();
    expect(userBatchWrite.options).toEqual({ merge: true });
    expect(userBatchWrite.data.onboardingComplete).toBe(true);
    expect(userBatchWrite.data.name).toBe('Suraj');
    expect(userBatchWrite.data.ageBand).toBe('25–34');
    expect(userBatchWrite.data.conditions).toEqual(['neck_cs', 'lower_back']);
    expect(userBatchWrite.data.workStart).toBe('09:30');
    expect(userBatchWrite.data.equipment).toEqual(['Chair / Desk']);

    const metaBatchWrite = mocks.batchSetCalls.find(
      (c) => c.path === `users/${uid}/meta/main`
    )!;
    expect(metaBatchWrite).toBeDefined();
    expect(metaBatchWrite.data.monthlyTheme).toBe('Ease stiffness');
    expect(metaBatchWrite.data.planSummary.level).toBe('Steady');
    expect(metaBatchWrite.data.weeklyRhythm.remindersPerDay).toBe(4);
  });

  it('isolates local caches by uid, clears profile/draft on sign out while preserving queued writes, and only replays writes matching signed-in uid', async () => {
    const uidA = 'uid_account_a';
    const uidB = 'uid_account_b';

    mocks.currentUser = { uid: uidA, isAnonymous: false };
    await saveProfile(uidA, {
      uid: uidA,
      name: 'Account A',
      level: 'Starter',
      goal: 'Ease stiffness',
      conditions: ['neck_cs'],
      painBaseline: {},
      safetyFlags: [],
      cheerStyle: 'Warm & celebratory',
      theme: 'light',
      reducedMotion: false,
      soundHaptics: true,
      onboardingComplete: true,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await waitForSyncQueueIdle();
    saveOnboardingDraftForUid(uidA, { name: 'Account A', ageBand: '25–34' });

    // Account B has nothing saved yet — must not see Account A's profile or draft
    expect(await getLocalProfile(uidB)).toBeNull();
    expect(getOnboardingDraftForUid(uidB)).toBeNull();

    // Queue a failed write for Account A and one for Account B
    mocks.setDocError = new Error('Simulated offline failure');
    await saveOnboardingStepProgress(uidA, 2, { name: 'Account A', ageBand: '25–34' });
    await waitForSyncQueueIdle();
    mocks.currentUser = { uid: uidB, isAnonymous: false };
    await saveOnboardingStepProgress(uidB, 2, { name: 'Account B', ageBand: '35–44' });
    await waitForSyncQueueIdle();
    mocks.setDocError = null;

    // Sign out of Account A: clears cached profile & draft of Account A, keeps queued write under uidA
    await clearSessionCacheOnSignOut(uidA);
    expect(await getLocalProfile(uidA)).toBeNull();
    expect(getOnboardingDraftForUid(uidA)).toBeNull();
    expect(await getQueuedWritesCount(uidA)).toBe(1);

    // Sign in as Account B: flushPendingSyncQueue(uidB) must ONLY replay Account B's queued write
    mocks.currentUser = { uid: uidB, isAnonymous: false };
    mocks.setDocCalls = [];
    const flushResB = await flushPendingSyncQueue(uidB);
    expect(flushResB.syncedCount).toBe(1);
    expect(await getQueuedWritesCount(uidB)).toBe(0);
    // Account A's queued write remains untouched
    expect(await getQueuedWritesCount(uidA)).toBe(1);
    const summary = await getAllQueuedWritesDebugSummary();
    expect(summary.totalCount).toBe(1);
    expect(summary.uids).toEqual([uidA]);
  });

  it('creates new Google user doc with first name prefilled and starts at Step 1 with empty health answers', async () => {
    const newGoogleUid = 'google_new_999';
    mocks.currentUser = {
      uid: newGoogleUid,
      displayName: 'Suraj Kumar Nayak',
      email: 'suraj@example.com',
      photoURL: 'https://example.com/photo.jpg',
      isAnonymous: false,
    };
    mocks.setDocCalls = [];

    const createdProfile = await createInitialUserDoc(newGoogleUid, {
      displayName: 'Suraj Kumar Nayak',
      email: 'suraj@example.com',
      photoURL: 'https://example.com/photo.jpg',
      provider: 'google',
      isGuest: false,
    });

    expect(createdProfile.name).toBe('Suraj');
    expect(createdProfile.email).toBe('suraj@example.com');
    expect(createdProfile.provider).toBe('google');
    expect(createdProfile.isGuest).toBe(false);
    expect(createdProfile.onboardingComplete).toBe(false);
    expect(createdProfile.ageBand).toBe('');
    // Because ageBand is empty, computeResumeOnboardingStep returns 1 (never skips Step 1)
    expect(computeResumeOnboardingStep(createdProfile)).toBe(1);
  });

  it('migrates legacy completed accounts once when completion evidence is present', async () => {
    const legacyUid = 'legacy_user_777';
    mocks.currentUser = { uid: legacyUid, isAnonymous: false };
    mocks.firestoreProfileDoc = {
      uid: legacyUid,
      name: 'Priya',
      ageBand: '35–44',
      conditions: ['neck_cs'],
      workStart: '09:00',
      workEnd: '17:30',
      remindersPerDay: 4,
      level: 'Steady',
      goal: 'Ease stiffness',
      // Note: onboardingComplete is missing on this legacy account
    };

    expect(
      hasLegacyOnboardingCompletionEvidence(mocks.firestoreProfileDoc, {
        monthlyTheme: 'Ease stiffness',
      })
    ).toBe(true);

    const cloudRes = await fetchCloudProfileDetailed(legacyUid);
    expect(cloudRes.status).toBe('found');
    expect(cloudRes.profile?.onboardingComplete).toBe(true);
    expect(isOnboardingComplete(cloudRes.profile)).toBe(true);
  });

  it('PainCheckinScreen: brand-new user with no logs sees Moderate and Steady, and onboarding note is ignored', () => {
    const today = '2026-10-29';
    const profile: any = {
      uid: 'u_new',
      conditions: ['neck_cs', 'lower_back'],
      painBaseline: { neck_cs: 4 },
    };

    // Brand-new user with no logs
    const latestNone = selectLatestPainLog([], today);
    expect(latestNone).toBeNull();
    const initNone = computeInitialPainCheckinState(
      ['neck_cs', 'lower_back'],
      latestNone,
      profile,
      today
    );
    expect(initNone.stiffness).toBe('Moderate');
    expect(initNone.energy).toBe('Steady');
    expect(initNone.scores).toEqual({ neck_cs: 4, lower_back: 2 });
    expect(initNone.notes).toBe('');

    // User with only the synthetic onboarding check-in log
    const onboardingLog = {
      id: 'pain-1000',
      date: today,
      timestamp: 1000,
      scores: { neck_cs: 4, lower_back: 3 },
      stiffness: 'Moderate' as const,
      energy: 'Steady' as const,
      notes: ONBOARDING_CHECKIN_NOTE,
    };
    const latestOnboarding = selectLatestPainLog([onboardingLog], today);
    const initOnboarding = computeInitialPainCheckinState(
      ['neck_cs', 'lower_back'],
      latestOnboarding,
      profile,
      today
    );
    expect(initOnboarding.stiffness).toBe('Moderate');
    expect(initOnboarding.energy).toBe('Steady');
    expect(initOnboarding.notes).toBe('');
  });

  it('PainCheckinScreen: saves Stiffness High and Energy Low, keeps same-day history sorted newest first, and persists across reload and sign-out/sign-in', async () => {
    const uid = 'user_pain_persist';
    const today = '2026-10-29';
    mocks.currentUser = { uid, isAnonymous: false };

    const log1 = {
      id: 'pain-1000',
      date: today,
      timestamp: 1000,
      scores: { neck_cs: 3, lower_back: 2 },
      stiffness: 'Moderate' as const,
      energy: 'Steady' as const,
      notes: 'Morning check',
    };
    const log2 = {
      id: 'pain-2000',
      date: today,
      timestamp: 2000,
      scores: { neck_cs: 6, lower_back: 5 },
      stiffness: 'High' as const,
      energy: 'Low' as const,
      notes: 'Afternoon tightness',
    };

    await savePainLog(uid, log1);
    await savePainLog(uid, log2);

    // 1. Local read (close & reopen or reload): both logs exist in history, newest first
    const localLogs = await getLocalPainLogs(uid);
    expect(localLogs).toHaveLength(2);
    expect(localLogs[0].id).toBe('pain-2000');
    expect(localLogs[1].id).toBe('pain-1000');

    const latestAfterSave = selectLatestPainLog(localLogs, today);
    const stateSameDay = computeInitialPainCheckinState(
      ['neck_cs', 'lower_back'],
      latestAfterSave,
      null,
      today
    );
    expect(stateSameDay.stiffness).toBe('High');
    expect(stateSameDay.energy).toBe('Low');
    expect(stateSameDay.scores).toEqual({ neck_cs: 6, lower_back: 5 });
    expect(stateSameDay.notes).toBe('Afternoon tightness');

    // 2. Next day open: keeps stiffness, energy, and scores from most recent log, but leaves notes empty
    const tomorrow = '2026-10-30';
    const latestNextDay = selectLatestPainLog(localLogs, tomorrow);
    const stateNextDay = computeInitialPainCheckinState(
      ['neck_cs', 'lower_back'],
      latestNextDay,
      null,
      tomorrow
    );
    expect(stateNextDay.stiffness).toBe('High');
    expect(stateNextDay.energy).toBe('Low');
    expect(stateNextDay.scores).toEqual({ neck_cs: 6, lower_back: 5 });
    expect(stateNextDay.notes).toBe('');

    // 3. Sign out and sign in on another device (Firestore returns logs in arbitrary order):
    // fetchCloudPainLogs must return logs sorted by timestamp desc so High & Low remain selected
    await clearSessionCacheOnSignOut(uid);
    mocks.storeData.clear(); // simulate clean device cache on sign-in
    mocks.firestorePainDocs = [
      { id: log1.id, data: log1 },
      { id: log2.id, data: log2 },
    ];

    const cloudLogs = await fetchCloudPainLogs(uid);
    expect(cloudLogs).toHaveLength(2);
    expect(cloudLogs[0].id).toBe('pain-2000');
    expect(cloudLogs[0].stiffness).toBe('High');
    expect(cloudLogs[0].energy).toBe('Low');

    const stateAfterReSignIn = computeInitialPainCheckinState(
      ['neck_cs', 'lower_back'],
      selectLatestPainLog(cloudLogs, today),
      null,
      today
    );
    expect(stateAfterReSignIn.stiffness).toBe('High');
    expect(stateAfterReSignIn.energy).toBe('Low');
    expect(formatTimeAgo(2000, 2000 + 5 * 60 * 1000)).toBe('5m ago');
  });

  it('never hangs on a never-settling IndexedDB promise during saveOnboardingStepProgress or completeOnboardingBatch, falls back to in-memory store, and always runs background Firestore sync', async () => {
    const uid = 'user_hung_idb_999';
    mocks.currentUser = { uid, isAnonymous: false };
    mocks.simulateMode = 'idb_hung';
    setIdbTimeoutForTest(40);

    const startStep = Date.now();
    const stepRes = await saveOnboardingStepProgress(uid, 2, {
      name: 'Suraj',
      ageBand: '25–34',
      sex: 'Male',
      timeZone: 'Asia/Kolkata',
    });
    const stepElapsed = Date.now() - startStep;

    expect(stepRes.ok).toBe(true);
    expect(stepElapsed).toBeLessThan(500);

    // Background sync still runs even though IndexedDB never settled
    await waitForSyncQueueIdle();
    expect(mocks.setDocCalls).toHaveLength(1);
    expect(mocks.setDocCalls[0].path).toBe(`users/${uid}`);
    expect(mocks.setDocCalls[0].data.name).toBe('Suraj');

    // Final onboarding batch also completes quickly and runs background batch commit
    const now = Date.now();
    const startFinal = Date.now();
    const finalRes = await completeOnboardingBatch(
      uid,
      {
        ...stepRes.profile,
        uid,
        level: 'Steady',
        goal: 'Ease stiffness',
        conditions: ['neck_cs'],
        painBaseline: { neck_cs: 3 },
        safetyFlags: [],
        cheerStyle: 'Warm & celebratory',
        theme: 'light',
        reducedMotion: false,
        soundHaptics: true,
        onboardingComplete: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        workStart: '09:30',
        workEnd: '18:00',
        workType: 'Desk / laptop',
        breakWindows: ['10:30', '13:15', '15:30', '17:30'],
        daysOff: [0, 6],
        remindersPerDay: 4,
        quietHours: { start: '21:30', end: '08:00' },
        equipment: ['Chair / Desk'],
        location: 'At desk',
      },
      {
        planSummary: {
          whyThisPlan: 'Neck comfort',
          level: 'Steady',
          goal: 'Ease stiffness',
          focusAreas: ['Neck'],
          remindersPerDay: 4,
          activeWindow: '09:30 – 18:00',
          workType: 'Desk / laptop',
          location: 'At desk',
          equipment: ['Chair / Desk'],
        },
        monthlyTheme: 'Ease stiffness',
        weeklyRhythm: {
          workStart: '09:30',
          workEnd: '18:00',
          workType: 'Desk / laptop',
          remindersPerDay: 4,
          daysOff: [0, 6],
          breakWindows: ['10:30', '13:15', '15:30', '17:30'],
          level: 'Steady',
        },
        planVersion: 1,
        updatedAt: now,
      },
      {
        date: '2026-10-30',
        tasks: [],
        completedCount: 0,
        totalCount: 4,
        activeMinutes: 0,
        waterCups: 0,
        waterGoal: 8,
        steps: 0,
        stepGoal: 6500,
      },
      {
        currentStreak: 0,
        bestStreak: 0,
        freezeTokens: 2,
        maxFreezes: 2,
        lastActiveDate: '',
        weeklyConsistency: {},
        badges: ['First Step'],
      },
      null,
      false
    );
    expect(finalRes.ok).toBe(true);
    expect(Date.now() - startFinal).toBeLessThan(500);

    await waitForSyncQueueIdle();
    expect(mocks.batchCommitCalls).toBeGreaterThanOrEqual(1);
    const cachedProfile = await getLocalProfile(uid);
    expect(cachedProfile?.onboardingComplete).toBe(true);
  });

  it('includes build id in APP_VERSION, triggers /version.json kill switch once when older than minBuild without clearing IndexedDB or localStorage, and remembers dismissed update banner build id', async () => {
    expect(BUILD_ID).toBeTruthy();
    expect(APP_VERSION).toContain('1.0 · build ');

    expect(isBuildOlderThan('2026-10-29-1a2b', '2026-10-30-3f2a')).toBe(true);
    expect(isBuildOlderThan('2026-10-30-3f2a', '2026-10-30-3f2a')).toBe(false);
    expect(isBuildOlderThan('2026-10-30-3f2a-r10', '2026-10-30-3f2a-r11')).toBe(true);
    expect(isBuildOlderThan('2026-10-30-3f2a-r12', '2026-10-30-3f2a-r11')).toBe(false);

    const ssMap = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: (k: string) => ssMap.get(k) ?? null,
        setItem: (k: string, v: string) => ssMap.set(k, v),
        removeItem: (k: string) => ssMap.delete(k),
      },
      configurable: true,
      writable: true,
    });

    let unregisteredCount = 0;
    const deletedCaches: string[] = [];
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        onLine: true,
        serviceWorker: {
          getRegistrations: async () => [
            {
              unregister: async () => {
                unregisteredCount += 1;
                return true;
              },
            },
          ],
        },
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'caches', {
      value: {
        keys: async () => ['workbox-precache-v2', 'unstill-html-cache'],
        delete: async (k: string) => {
          deletedCaches.push(k);
          return true;
        },
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn(async () => ({
        ok: true,
        json: async () => ({
          version: '1.0',
          buildId: '2026-10-30-9f9f',
          minBuild: '2026-10-30-9f9f',
        }),
      })),
      configurable: true,
      writable: true,
    });

    // Seed user data in localStorage to verify kill switch never deletes user data
    globalThis.localStorage.setItem('user_returning_123:profile', '{"name":"Aarav"}');

    let reloads = 0;
    const res1 = await checkVersionJsonAndKillSwitch({
      currentBuildId: '2026-10-28-aaaa',
      reloadFn: () => {
        reloads += 1;
      },
    });
    expect(res1.triggeredKillSwitch).toBe(true);
    expect(unregisteredCount).toBe(1);
    expect(deletedCaches).toEqual(['workbox-precache-v2', 'unstill-html-cache']);
    expect(reloads).toBe(1);
    expect(globalThis.localStorage.getItem('user_returning_123:profile')).toBe('{"name":"Aarav"}');
    expect(mocks.deleteDBCalls).toHaveLength(0);

    // Calling again in the same session for the same minBuild is guarded by sessionStorage (no reload loop)
    const res2 = await checkVersionJsonAndKillSwitch({
      currentBuildId: '2026-10-28-aaaa',
      reloadFn: () => {
        reloads += 1;
      },
    });
    expect(res2.triggeredKillSwitch).toBe(false);
    expect(reloads).toBe(1);

    // Update banner dismissal remembers build id in localStorage and sessionStorage
    expect(isUpdateBannerDismissedForBuild('2026-10-30-9f9f')).toBe(false);
    dismissUpdateBannerForBuild('2026-10-30-9f9f');
    expect(isUpdateBannerDismissedForBuild('2026-10-30-9f9f')).toBe(true);
    expect(hasShownUpdateBannerInSession('2026-10-30-9f9f')).toBe(true);
    expect(isUpdateBannerDismissedForBuild('2026-10-31-aaaa')).toBe(false);
  });
});


