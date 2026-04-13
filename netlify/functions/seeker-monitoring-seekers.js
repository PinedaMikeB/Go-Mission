const {
  SEEKER_COLLECTION,
  buildUpdatePatch,
  getDb,
  json,
  optionsResponse,
  serializeSeekerDoc
} = require('./_shared/firebase-admin');

async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return optionsResponse();

  try {
    const db = getDb();

    if (event.httpMethod === 'GET') {
      const snapshot = await db.collection(SEEKER_COLLECTION).orderBy('createdAt', 'desc').limit(200).get();

      return json(200, {
        ok: true,
        seekers: snapshot.docs.map(serializeSeekerDoc)
      });
    }

    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const seekerId = typeof body.id === 'string' ? body.id.trim() : '';

      if (!seekerId) {
        return json(400, { error: 'A seeker id is required.' });
      }

      const seekerRef = db.collection(SEEKER_COLLECTION).doc(seekerId);
      await seekerRef.set(buildUpdatePatch(body.updates || {}), { merge: true });
      const updatedSnapshot = await seekerRef.get();

      return json(200, {
        ok: true,
        seeker: serializeSeekerDoc(updatedSnapshot)
      });
    }

    return json(405, { error: 'Method not allowed.' });
  } catch (error) {
    return json(500, { error: error.message || 'Unexpected server error.' });
  }
}

module.exports = { handler };
