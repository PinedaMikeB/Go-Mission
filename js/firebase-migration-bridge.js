/**
 * firebase-migration-bridge.js
 *
 * Silent Firebase → Postgres migration for existing remembered sessions.
 * Import and call GoMissionMigrationBridge.init(auth, onAuthStateChanged)
 * once during app startup after Firebase Auth is initialized.
 *
 * The user sees nothing — no login prompt, no interruption.
 */

export const GoMissionMigrationBridge = {
  async init(firebaseAuth, onAuthStateChanged) {
    const backend = window.GoMissionBackend;
    if (!backend) {
      console.error('[MigrationBridge] GoMissionBackend not loaded.');
      return null;
    }

    // Step 1: Already have a local Postgres session? Done.
    try {
      const existingUser = await backend.loadSessionUser();
      if (existingUser) {
        console.log('[MigrationBridge] Local session found — already migrated.');
        _setPostgresMode();
        return existingUser;
      }
    } catch (_) {}

    // Step 2: Wait for Firebase to restore remembered session (max 3s)
    const firebaseUser = await _waitForFirebaseAuth(firebaseAuth, onAuthStateChanged);
    if (!firebaseUser) {
      console.log('[MigrationBridge] No Firebase session — user needs to log in.');
      return null;
    }

    // Step 3: Exchange Firebase ID token for local Postgres session
    console.log('[MigrationBridge] Firebase session found — exchanging silently...');
    const localUser = await backend.exchangeFirebaseToken(firebaseUser);
    if (localUser) {
      _setPostgresMode();
      console.log('[MigrationBridge] Done — now on Postgres.');
    } else {
      console.warn('[MigrationBridge] Exchange failed — will retry next open.');
    }
    return localUser;
  },
};

function _setPostgresMode() {
  try { window.localStorage.setItem('goMissionBackend', 'postgres'); } catch (_) {}
}

function _waitForFirebaseAuth(firebaseAuth, onAuthStateChanged) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(null); }
    }, 3000);
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        resolve(user || null);
      }
    });
  });
}
