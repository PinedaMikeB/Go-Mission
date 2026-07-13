const bcrypt = require('bcryptjs');
// Lazy-load firebase-admin only when the token exchange action is used.
let _firebaseAdmin = null;
function getFirebaseAdmin() {
  if (_firebaseAdmin) return _firebaseAdmin;
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    // Supports two credential modes:
    // 1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON file
    // 2. FIREBASE_SERVICE_ACCOUNT env var containing the service account JSON as a string
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } else {
      credential = admin.credential.applicationDefault();
    }
    admin.initializeApp({ credential, projectId: 'shaped-by-grace' });
  }
  _firebaseAdmin = admin;
  return _firebaseAdmin;
}

const crypto = require('crypto');
const { json, noContent, parseJsonBody, parseCookies } = require('./_lib/http');
const { query } = require('./_lib/postgres');
const {
  SESSION_COOKIE_NAME,
  createSessionToken,
  createSessionCookie,
  loadSessionMember,
  toFrontendUser,
} = require('./_lib/session');

function isSecureRequest(event) {
  return String(event?.headers?.['x-forwarded-proto'] || '').toLowerCase() === 'https';
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function randomResetCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

async function findMemberByEmail(email) {
  const result = await query(
    `
      SELECT id, firebase_uid, email, password_hash, full_name, display_name, photo_url, stage, status, roles, training, profile
      FROM app.members
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [email]
  );
  return result.rows[0] || null;
}

async function handleLogin(event, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!email || !password) {
    return json(400, { error: 'Email and password are required.' });
  }

  const member = await findMemberByEmail(email);
  if (!member) {
    return json(401, { error: 'Invalid email or password.' });
  }
  if (!member.password_hash) {
    return json(409, { error: 'This account needs a local password reset before it can sign in.' });
  }
  const matches = await bcrypt.compare(password, member.password_hash);
  if (!matches) {
    return json(401, { error: 'Invalid email or password.' });
  }

  const token = createSessionToken(member);
  return json(
    200,
    {
      ok: true,
      user: toFrontendUser(member),
    },
    {
      'Set-Cookie': createSessionCookie(token, { secure: isSecureRequest(event) }),
    }
  );
}

async function handleSignup(event, body) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!name || !email || password.length < 6) {
    return json(400, { error: 'Name, valid email, and a password of at least 6 characters are required.' });
  }

  const existing = await findMemberByEmail(email);
  if (existing) {
    return json(409, { error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `
      INSERT INTO app.members (
        email,
        password_hash,
        auth_provider,
        full_name,
        display_name,
        stage,
        status,
        source,
        roles,
        training,
        profile
      )
      VALUES ($1, $2, 'local', $3, $3, 'seeker', 'active', 'local_signup', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
      RETURNING id, firebase_uid, email, full_name, display_name, photo_url, stage, status, roles, training, profile
    `,
    [email, passwordHash, name]
  );
  const member = result.rows[0];
  const token = createSessionToken(member);

  return json(
    200,
    {
      ok: true,
      user: toFrontendUser(member),
    },
    {
      'Set-Cookie': createSessionCookie(token, { secure: isSecureRequest(event) }),
    }
  );
}

async function handleMe(event) {
  const cookies = parseCookies(event);
  const token = cookies[SESSION_COOKIE_NAME];
  const member = await loadSessionMember(token);
  if (!member) {
    return json(200, { user: null });
  }
  return json(200, { user: toFrontendUser(member) });
}

async function handleLogout(event) {
  return noContent({
    'Set-Cookie': createSessionCookie('', { secure: isSecureRequest(event), clear: true }),
  });
}

async function handleRequestReset(body) {
  const email = normalizeEmail(body.email);
  if (!email) {
    return json(400, { error: 'Email is required.' });
  }

  const member = await findMemberByEmail(email);
  if (!member) {
    return json(200, { ok: true, emailSent: true });
  }

  const resetCode = randomResetCode();
  await query(
    `
      INSERT INTO app.password_resets (email, reset_code, attempts, expires_at, verified_at)
      VALUES ($1, $2, 0, now() + interval '15 minutes', null)
      ON CONFLICT (email) DO UPDATE
      SET
        reset_code = EXCLUDED.reset_code,
        attempts = 0,
        verified_at = null,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `,
    [email, resetCode]
  );

  const response = { ok: true, emailSent: true, message: 'Verification code created.' };
  if (process.env.ALLOW_DEBUG_PASSWORD_RESETS === 'true') {
    response.debugCode = resetCode;
  }
  return json(200, response);
}

async function handleVerifyReset(body) {
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').trim();
  if (!email || !code) {
    return json(400, { error: 'Email and code are required.' });
  }

  const result = await query(
    `
      UPDATE app.password_resets
      SET verified_at = now(), updated_at = now()
      WHERE email = $1
        AND reset_code = $2
        AND expires_at > now()
      RETURNING id
    `,
    [email, code]
  );
  if (!result.rows[0]) {
    return json(400, { error: 'Invalid or expired verification code.' });
  }
  return json(200, { ok: true, message: 'Code verified.' });
}

async function handleCompleteReset(event, body) {
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').trim();
  const newPassword = String(body.newPassword || '');
  if (!email || !code || newPassword.length < 6) {
    return json(400, { error: 'Email, code, and a password of at least 6 characters are required.' });
  }

  const resetResult = await query(
    `
      SELECT id
      FROM app.password_resets
      WHERE email = $1
        AND reset_code = $2
        AND expires_at > now()
        AND verified_at IS NOT NULL
      LIMIT 1
    `,
    [email, code]
  );
  if (!resetResult.rows[0]) {
    return json(400, { error: 'Verification code is invalid or has not been verified.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const memberResult = await query(
    `
      UPDATE app.members
      SET
        password_hash = $2,
        auth_provider = 'local',
        updated_at = now()
      WHERE lower(email) = lower($1)
      RETURNING id, firebase_uid, email, full_name, display_name, photo_url, stage, status, roles, training, profile
    `,
    [email, passwordHash]
  );
  const member = memberResult.rows[0];
  if (!member) {
    return json(404, { error: 'Member account not found.' });
  }

  await query('DELETE FROM app.password_resets WHERE email = $1', [email]);

  const token = createSessionToken(member);
  return json(
    200,
    {
      ok: true,
      user: toFrontendUser(member),
      message: 'Password updated successfully.',
    },
    {
      'Set-Cookie': createSessionCookie(token, { secure: isSecureRequest(event) }),
    }
  );
}

// ---------------------------------------------------------------------------
// Firebase ID token exchange — silent migration for remembered sessions
// ---------------------------------------------------------------------------
// The client calls this with the Firebase ID token from their remembered
// session. We verify it server-side, find or create the member row in
// Postgres, and return a local session cookie. From this point on the app
// uses Postgres exclusively. The user never sees a login screen.
async function handleFirebaseTokenExchange(event, body) {
  const idToken = String(body.idToken || '').trim();
  if (!idToken) {
    return json(400, { error: 'idToken is required.' });
  }

  // 1. Verify the Firebase ID token using firebase-admin
  let decoded;
  try {
    const admin = getFirebaseAdmin();
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    console.warn('[firebase_token_exchange] Invalid Firebase token:', err.message);
    return json(401, { error: 'Firebase token verification failed.' });
  }

  const firebaseUid = decoded.uid;
  const email = (decoded.email || '').toLowerCase().trim() || null;
  const displayName = decoded.name || decoded.display_name || null;
  const photoUrl = decoded.picture || null;

  // 2. Find the member row by firebase_uid first, then fall back to email
  let member = null;
  const byUid = await query(
    `SELECT id, firebase_uid, email, password_hash, full_name, display_name, photo_url, stage, status, roles, training, profile
     FROM gomission.members WHERE firebase_uid = $1 LIMIT 1`,
    [firebaseUid]
  );
  member = byUid.rows[0] || null;

  if (!member && email) {
    const byEmail = await query(
      `SELECT id, firebase_uid, email, password_hash, full_name, display_name, photo_url, stage, status, roles, training, profile
       FROM gomission.members WHERE lower(email) = $1 LIMIT 1`,
      [email]
    );
    member = byEmail.rows[0] || null;
    // If found by email but firebase_uid not yet set, stamp it now
    if (member && !member.firebase_uid) {
      await query(
        `UPDATE gomission.members SET firebase_uid = $1, updated_at = now() WHERE id = $2`,
        [firebaseUid, member.id]
      );
      member.firebase_uid = firebaseUid;
    }
  }

  // 3. If no row exists at all, create one from the Firebase token claims
  if (!member) {
    const insertResult = await query(
      `INSERT INTO gomission.members
         (firebase_uid, email, auth_provider, full_name, display_name, photo_url,
          stage, status, source, roles, training, profile)
       VALUES ($1, $2, 'firebase', $3, $4, $5, 'seeker', 'active', 'firebase_token_exchange',
               '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (firebase_uid) DO UPDATE
         SET email        = COALESCE(EXCLUDED.email, gomission.members.email),
             display_name = COALESCE(EXCLUDED.display_name, gomission.members.display_name),
             photo_url    = COALESCE(EXCLUDED.photo_url, gomission.members.photo_url),
             updated_at   = now()
       RETURNING id, firebase_uid, email, full_name, display_name, photo_url, stage, status, roles, training, profile`,
      [firebaseUid, email, displayName, displayName, photoUrl]
    );
    member = insertResult.rows[0];
  }

  // 4. Issue a local session cookie — Postgres takes over from here
  const token = createSessionToken(member);
  return json(
    200,
    { ok: true, user: toFrontendUser(member), migrated: true },
    { 'Set-Cookie': createSessionCookie(token, { secure: isSecureRequest(event) }) }
  );
}

exports.handler = async (event) => {
  try {
    const body = event.httpMethod === 'POST' ? parseJsonBody(event) : {};
    const action = String(body.action || event.queryStringParameters?.action || '').trim().toLowerCase();

    switch (action) {
      case 'login':
        return await handleLogin(event, body);
      case 'signup':
        return await handleSignup(event, body);
      case 'me':
        return await handleMe(event);
      case 'logout':
        return await handleLogout(event);
      case 'request_reset':
        return await handleRequestReset(body);
      case 'verify_reset':
        return await handleVerifyReset(body);
      case 'complete_reset':
        return await handleCompleteReset(event, body);
      case 'firebase_token_exchange':
        return await handleFirebaseTokenExchange(event, body);
      default:
        return json(400, { error: 'Unsupported auth action.' });
    }
  } catch (error) {
    console.error('[local-auth] request failed', error);
    return json(500, { error: error.message || 'Auth request failed.' });
  }
};
