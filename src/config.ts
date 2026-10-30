declare const __BUILD_ID__: string | undefined;

export const SPLASH_MIN_MS = 2500;
export const SPLASH_READY_HOLD_MS = 700;
export const SPLASH_FADE_MS = 400;
export const SPLASH_SLOW_MS = 5000;

export const BASE_APP_VERSION = '1.0';

export const BUILD_ID: string =
  typeof __BUILD_ID__ !== 'undefined' && __BUILD_ID__
    ? __BUILD_ID__
    : '2026-10-30-dev';

export const APP_VERSION = `${BASE_APP_VERSION} · build ${BUILD_ID}`;
export const APP_NAME = 'UnStill';
export const APP_TAGLINE = 'Everyday movement that fits real life.';

export const DISMISSED_UPDATE_BUILD_KEY = 'unstill_dismissed_update_build_id';
export const SESSION_SHOWN_UPDATE_BUILD_KEY = 'unstill_shown_update_build_id';
export const RELOADED_FOR_BUILD_PREFIX = 'unstill_reloaded_for_';
export const UPDATED_TOAST_SESSION_KEY = 'unstill_updated_toast';

export interface VersionJsonPayload {
  version?: string;
  buildId?: string;
  minBuild?: string;
}

/**
 * Compares two build IDs (e.g. "2026-10-29-1a2b" vs "2026-10-30-3f2a" or "2026-10-30-3f2a-r12").
 * Returns true if `currentBuildId` is older than `minBuild`.
 */
export function isBuildOlderThan(currentBuildId: string, minBuild: string): boolean {
  const cur = (currentBuildId || '').trim();
  const min = (minBuild || '').trim();
  if (!cur || !min || cur === min) return false;

  const dateRegex = /^(\d{4}-\d{2}-\d{2})(?:-(.+))?$/;
  const curMatch = cur.match(dateRegex);
  const minMatch = min.match(dateRegex);

  if (curMatch && minMatch) {
    const curDate = curMatch[1];
    const minDate = minMatch[1];
    if (curDate < minDate) return true;
    if (curDate > minDate) return false;

    const curRunMatch = (curMatch[2] || '').match(/(?:^|-)r(\d+)$/);
    const minRunMatch = (minMatch[2] || '').match(/(?:^|-)r(\d+)$/);
    if (curRunMatch && minRunMatch) {
      return Number(curRunMatch[1]) < Number(minRunMatch[1]);
    }
    return cur !== min;
  }

  return cur < min;
}

export async function fetchRemoteVersionJson(timeoutMs = 3000): Promise<VersionJsonPayload | null> {
  if (typeof fetch !== 'function') return null;

  const baseUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = `${normalizedBase}version.json?t=${Date.now()}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const fetchPromise = fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      ...(controller ? { signal: controller.signal } : {}),
    });

    const timeoutPromise = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        try {
          controller?.abort();
        } catch {
          // ignore
        }
        resolve(null);
      }, timeoutMs);
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    if (!response || !response.ok) return null;
    const data = (await response.json()) as VersionJsonPayload;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Startup kill switch for stuck clients (Requirement 4):
 * Fetches `/version.json` (cache: 'no-store', 3 s timeout, ignores failures).
 * If the running build is older than `minBuild`, unregisters service workers,
 * clears Cache Storage only (never IndexedDB or localStorage user data), and reloads once
 * guarded by `sessionStorage`.
 */
export async function checkVersionJsonAndKillSwitch(options?: {
  currentBuildId?: string;
  reloadFn?: () => void;
  timeoutMs?: number;
}): Promise<{
  remoteBuildId: string | null;
  minBuild: string | null;
  triggeredKillSwitch: boolean;
}> {
  const currentBuildId = options?.currentBuildId || BUILD_ID;
  const reloadFn =
    options?.reloadFn ||
    (() => {
      if (typeof window !== 'undefined' && window.location?.reload) {
        window.location.reload();
      }
    });

  const payload = await fetchRemoteVersionJson(options?.timeoutMs ?? 3000);
  if (!payload) {
    return { remoteBuildId: null, minBuild: null, triggeredKillSwitch: false };
  }

  const remoteBuildId = typeof payload.buildId === 'string' ? payload.buildId.trim() : null;
  const minBuild = typeof payload.minBuild === 'string' ? payload.minBuild.trim() : null;

  if (minBuild && isBuildOlderThan(currentBuildId, minBuild)) {
    const guardKey = `unstill_killswitch_${minBuild}`;
    let alreadyTriggered = false;
    try {
      if (typeof sessionStorage !== 'undefined') {
        alreadyTriggered = sessionStorage.getItem(guardKey) === '1';
      }
    } catch {
      // ignore storage errors
    }

    if (!alreadyTriggered) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(guardKey, '1');
          sessionStorage.setItem(UPDATED_TOAST_SESSION_KEY, remoteBuildId || minBuild);
        }
      } catch {
        // ignore storage errors
      }

      try {
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
        }
      } catch {
        // ignore SW unregister errors
      }

      try {
        if (typeof caches !== 'undefined' && typeof caches.keys === 'function') {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key).catch(() => false)));
        }
      } catch {
        // ignore Cache Storage errors
      }

      reloadFn();
      return { remoteBuildId, minBuild, triggeredKillSwitch: true };
    }
  }

  return { remoteBuildId, minBuild, triggeredKillSwitch: false };
}

export function isUpdateBannerDismissedForBuild(buildId: string): boolean {
  if (!buildId) return false;
  try {
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem(DISMISSED_UPDATE_BUILD_KEY) === buildId) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export function dismissUpdateBannerForBuild(buildId: string): void {
  if (!buildId) return;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISMISSED_UPDATE_BUILD_KEY, buildId);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_SHOWN_UPDATE_BUILD_KEY, buildId);
    }
  } catch {
    // ignore
  }
}

export function hasShownUpdateBannerInSession(buildId: string): boolean {
  if (!buildId) return false;
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(SESSION_SHOWN_UPDATE_BUILD_KEY) === buildId;
    }
  } catch {
    // ignore
  }
  return false;
}

export function markUpdateBannerShownInSession(buildId: string): void {
  if (!buildId) return;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_SHOWN_UPDATE_BUILD_KEY, buildId);
    }
  } catch {
    // ignore
  }
}

