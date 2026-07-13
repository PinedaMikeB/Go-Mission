(function () {
  const backendParam = new URLSearchParams(window.location.search).get('backend');
  const storedBackend = (() => {
    try {
      return window.localStorage.getItem('goMissionBackend');
    } catch (_) {
      return null;
    }
  })();
  const mode = backendParam || storedBackend || 'firebase';

  if (backendParam) {
    try {
      window.localStorage.setItem('goMissionBackend', backendParam);
    } catch (_) {}
  }

  // In production: calls go to your Mac via Cloudflare Tunnel.
  // In local dev: falls back to Netlify functions path.
  const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/.netlify/functions'
    : 'https://gomission-api.wotgonline.com/.netlify/functions';

  async function api(path, payload) {
    const response = await fetch(`${apiBase}/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Request failed (${response.status})`);
    }
    return body;
  }

  function createDocRef(pathSegments) {
    return {
      __backend: 'postgres',
      __kind: 'doc',
      pathSegments,
      id: pathSegments[pathSegments.length - 1],
    };
  }

  function createCollectionRef(pathSegments) {
    return {
      __backend: 'postgres',
      __kind: 'collection',
      pathSegments,
    };
  }

  function buildDocSnapshot(doc) {
    if (!doc) {
      return {
        id: null,
        exists() {
          return false;
        },
        data() {
          return undefined;
        },
      };
    }
    return {
      id: doc.id,
      exists() {
        return true;
      },
      data() {
        return doc.data;
      },
    };
  }

  function buildQuerySnapshot(docs) {
    const items = Array.isArray(docs) ? docs : [];
    return {
      empty: items.length === 0,
      size: items.length,
      docs: items.map((doc) => buildDocSnapshot(doc)),
      forEach(callback) {
        items.forEach((doc) => callback(buildDocSnapshot(doc)));
      },
    };
  }

  const backend = {
    mode,
    isPostgres() {
      return mode === 'postgres';
    },
    async signIn(email, password) {
      const payload = await api('local-auth', {
        action: 'login',
        email,
        password,
      });
      return payload.user || null;
    },
    async signUp({ name, email, password }) {
      const payload = await api('local-auth', {
        action: 'signup',
        name,
        email,
        password,
      });
      return payload.user || null;
    },
    async loadSessionUser() {
      const payload = await api('local-auth', { action: 'me' });
      return payload?.user || null;
    },
    async signOut() {
      await api('local-auth', { action: 'logout' });
    },
    async requestPasswordReset(email) {
      return api('local-auth', { action: 'request_reset', email });
    },
    async verifyPasswordResetCode(email, code) {
      return api('local-auth', { action: 'verify_reset', email, code });
    },
    async completePasswordReset(email, code, newPassword) {
      return api('local-auth', {
        action: 'complete_reset',
        email,
        code,
        newPassword,
      });
    },
    async readDoc(pathSegments) {
      const payload = await api('pg-read', { kind: 'doc', pathSegments });
      return buildDocSnapshot(payload?.doc || null);
    },
    async readCollection(pathSegments, clauses) {
      const payload = await api('pg-read', {
        kind: 'collection',
        pathSegments,
        clauses: clauses || [],
      });
      return buildQuerySnapshot(payload?.docs || []);
    },
    onAuthStateChanged(callback) {
      Promise.resolve()
        .then(() => backend.loadSessionUser())
        .then((user) => callback(user))
        .catch((error) => {
          console.warn('[PostgresBackend] Could not restore session:', error);
          callback(null);
        });
      return function unsubscribe() {};
    },

    // Call this once on app load when a Firebase session is still alive.
    // It exchanges the Firebase ID token for a local Postgres session cookie
    // silently — the user sees nothing, no re-login required.
    async exchangeFirebaseToken(firebaseUser) {
      if (!firebaseUser) return null;
      const EXCHANGE_DONE_KEY = 'gomission_exchange_done_' + (firebaseUser.uid || '');
      try {
        if (window.localStorage.getItem(EXCHANGE_DONE_KEY) === '1') {
          // Already exchanged in a previous session; just load from cookie.
          return backend.loadSessionUser();
        }
      } catch (_) {}

      try {
        const idToken = await firebaseUser.getIdToken(/* forceRefresh= */ false);
        const result = await api('local-auth', { action: 'firebase_token_exchange', idToken });
        // Mark exchange done so we don't repeat it every open.
        try { window.localStorage.setItem(EXCHANGE_DONE_KEY, '1'); } catch (_) {}
        console.log('[PostgresBackend] Firebase token exchanged successfully.');
        return result?.user || null;
      } catch (err) {
        console.warn('[PostgresBackend] Token exchange failed, will retry next open:', err.message);
        return null;
      }
    },
    attachFirestoreCompat() {
      window.doc = function (_db, ...segments) {
        return createDocRef(segments);
      };
      window.collection = function (_db, ...segments) {
        return createCollectionRef(segments);
      };
      window.where = function (field, op, value) {
        return { type: 'where', field, op, value };
      };
      window.orderBy = function (field, direction = 'asc') {
        return { type: 'orderBy', field, direction };
      };
      window.limit = function (value) {
        return { type: 'limit', value };
      };
      window.startAfter = function (value) {
        return { type: 'startAfter', value };
      };
      window.query = function (collectionRef, ...clauses) {
        return {
          __backend: 'postgres',
          __kind: 'collection',
          pathSegments: collectionRef.pathSegments,
          clauses,
        };
      };
      window.getDoc = function (docRef) {
        return backend.readDoc(docRef.pathSegments);
      };
      window.getDocs = function (ref) {
        if (ref?.__kind === 'collection' && Array.isArray(ref.clauses)) {
          return backend.readCollection(ref.pathSegments, ref.clauses);
        }
        return backend.readCollection(ref.pathSegments, []);
      };
      window.onSnapshot = function (ref, callback) {
        const promise = ref?.__kind === 'doc'
          ? backend.readDoc(ref.pathSegments).then((snapshot) => callback(snapshot))
          : backend.readCollection(ref.pathSegments, ref.clauses || []).then((snapshot) => callback(snapshot));
        promise.catch((error) => console.warn('[PostgresBackend] onSnapshot failed:', error));
        return function unsubscribe() {};
      };
    },
  };

  window.GoMissionBackend = backend;
})();
