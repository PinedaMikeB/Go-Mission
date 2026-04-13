const {
  FieldValue,
  SEEKER_COLLECTION,
  buildSeekerRecord,
  getDb,
  json,
  optionsResponse,
  sanitizeStatus,
  serializeSeekerDoc
} = require('./_shared/firebase-admin');

function getResponseText(response) {
  if (response.output_text) return response.output_text;
  const chunks = [];
  for (const item of response.output || []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The model response did not contain valid JSON.');
    return JSON.parse(match[0]);
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function callOpenAI({ images = [], rawText = '' }) {
  const prompt = {
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    store: false,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text:
              'You extract seeker information from screenshots and pasted text. Return only JSON. Never wrap the JSON in markdown. Leave unknown values as empty strings. Summarize all visible text into raw_pasted_text. Separate profile-image observations from general screenshot observations. Use this JSON shape: {"seeker_name":"","facebook_profile_name":"","lead_stage":"","email":"","age":"","gender":"","marital_status":"","mobile_number":"","preferred_day":"","preferred_time":"","church":"","location":"","messenger_contact":"","profile_image_notes":"","screenshot_notes":"","raw_pasted_text":"","remarks_from_model":"","summary":""}'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Read every screenshot carefully and combine it with any pasted seeker text. Extract one seeker record and normalize it into the requested JSON fields. If multiple screenshots belong to the same seeker, merge them into one record.${rawText ? `\n\nPasted seeker text:\n${rawText}` : ''}`
          },
          ...images.map((imageUrl) => ({ type: 'input_image', image_url: imageUrl }))
        ]
      }
    ]
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(prompt)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${text}`);
  }

  return extractJson(getResponseText(await response.json()));
}

async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return optionsResponse();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  try {
    const body = JSON.parse(event.body || '{}');
    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : '';

    if (!images.length && !rawText) {
      return json(400, { error: 'Add at least one screenshot or pasted seeker text.' });
    }

    const extraction = await callOpenAI({ images, rawText });
    const followUpStatus = sanitizeStatus(body.followUpStatus);
    const coordinatorNote = [body.remarks || '', extraction.remarks_from_model || '']
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' | ');
    const record = buildSeekerRecord({
      extraction,
      followUpStatus,
      coordinatorNote,
      rawText
    });
    const db = getDb();
    const seekerRef = db.collection(SEEKER_COLLECTION).doc();

    await seekerRef.set({
      ...record,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    const savedSnapshot = await seekerRef.get();

    return json(200, {
      ok: true,
      seeker: serializeSeekerDoc(savedSnapshot),
      summary: extraction.summary || '',
      statusDescription: record.statusNotes
    });
  } catch (error) {
    return json(500, { error: error.message || 'Unexpected server error.' });
  }
}

module.exports = { handler };
