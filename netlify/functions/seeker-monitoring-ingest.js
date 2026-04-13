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

const DAY_PATTERN = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+to\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))?\b/i;
const TIME_LINE_PATTERN = /(\d{1,2}(?::\d{2})?\s*(?:am|pm|nn))|(\d{1,2}\s*(?:am|pm))/i;
const PHONE_PATTERN = /(?:\+?63|0)\d{10}\b/;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const GENDER_PATTERN = /\b(male|female)\b/i;
const MARITAL_PATTERN = /\b(single|married|marriage|widowed|separated)\b/i;
const AGE_PATTERN = /\b(?:age[:\s]*)?(\d{1,2})\b/i;

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

function cleanLine(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function looksLikeName(line = '') {
  if (!line) return false;
  if (EMAIL_PATTERN.test(line) || PHONE_PATTERN.test(line) || DAY_PATTERN.test(line) || TIME_LINE_PATTERN.test(line)) return false;
  if (/\bchurch\b/i.test(line) || GENDER_PATTERN.test(line) || MARITAL_PATTERN.test(line)) return false;
  return /^[A-Za-z][A-Za-z.' -]{1,}$/.test(line) && line.split(' ').length >= 2;
}

function normalizeMaritalStatus(value = '') {
  const normalized = value.toLowerCase();
  if (normalized === 'marriage') return 'Married';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function extractPreferredTime(lines) {
  const timeLines = lines.filter((line) => TIME_LINE_PATTERN.test(line));
  return timeLines.join(' | ');
}

function parseRawText(rawText = '') {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const joined = lines.join(' | ');
  const genderLine = lines.find((line) => GENDER_PATTERN.test(line)) || '';
  const maritalLine = lines.find((line) => MARITAL_PATTERN.test(line)) || '';
  const phoneLine = lines.find((line) => PHONE_PATTERN.test(line)) || '';
  const emailLine = lines.find((line) => EMAIL_PATTERN.test(line)) || '';
  const dayLine = lines.find((line) => DAY_PATTERN.test(line)) || '';
  const churchLine = lines.find((line) => /\bchurch\b/i.test(line)) || '';
  const ageLine = lines.find((line) => AGE_PATTERN.test(line) && !TIME_LINE_PATTERN.test(line) && !PHONE_PATTERN.test(line)) || '';
  const nameLine = lines.find(looksLikeName) || '';

  return {
    seeker_name: nameLine,
    facebook_profile_name: nameLine,
    lead_stage: '',
    email: (emailLine.match(EMAIL_PATTERN) || [''])[0],
    age: (ageLine.match(AGE_PATTERN) || [,''])[1] || '',
    gender: (genderLine.match(GENDER_PATTERN) || [,''])[1] ? (genderLine.match(GENDER_PATTERN)[1].charAt(0).toUpperCase() + genderLine.match(GENDER_PATTERN)[1].slice(1).toLowerCase()) : '',
    marital_status: (maritalLine.match(MARITAL_PATTERN) || [,''])[1] ? normalizeMaritalStatus(maritalLine.match(MARITAL_PATTERN)[1]) : '',
    mobile_number: (phoneLine.match(PHONE_PATTERN) || [''])[0],
    preferred_day: dayLine,
    preferred_time: extractPreferredTime(lines),
    church: churchLine,
    location: '',
    messenger_contact: '',
    profile_image_notes: '',
    screenshot_notes: '',
    raw_pasted_text: rawText,
    remarks_from_model: '',
    summary: joined ? 'Created from pasted seeker text.' : ''
  };
}

function buildManualRecord(manualEntry = {}) {
  const status = sanitizeStatus(manualEntry.status);
  return {
    recordType: 'seeker_monitoring',
    sourceChannel: 'vlogs_engagement',
    isAppUser: false,
    dateRecorded: manualEntry.dateRecorded || new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: '2-digit',
      month: 'numeric',
      day: 'numeric'
    }).format(new Date()),
    name: manualEntry.name || '',
    email: manualEntry.email || '',
    age: manualEntry.age || '',
    gender: manualEntry.gender || '',
    maritalStatus: manualEntry.maritalStatus || '',
    mobileNo: manualEntry.mobileNo || '',
    preferredDay: manualEntry.preferredDay || '',
    preferredTime: manualEntry.preferredTime || '',
    church: manualEntry.church || '',
    profile: manualEntry.profile || '',
    status,
    statusNotes: '',
    coordinatorNote: '',
    leaderName: manualEntry.leaderName || '',
    mGroupGc: manualEntry.mGroupGc || '',
    summary: 'Created from manual seeker entry.',
    rawPastedText: '',
    extraction: {}
  };
}

async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return optionsResponse();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  try {
    const body = JSON.parse(event.body || '{}');
    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : '';
    const manualEntry = body.manualEntry && typeof body.manualEntry === 'object' ? body.manualEntry : null;

    if (!images.length && !rawText && !manualEntry) {
      return json(400, { error: 'Add seeker text, a screenshot, or a manual entry.' });
    }

    let extraction = null;
    let record = null;

    if (manualEntry) {
      record = buildManualRecord(manualEntry);
    } else if (rawText) {
      extraction = parseRawText(rawText);
      record = buildSeekerRecord({
        extraction,
        followUpStatus: 'Processing',
        coordinatorNote: '',
        rawText
      });
    } else {
      extraction = await callOpenAI({ images, rawText: '' });
      record = buildSeekerRecord({
        extraction,
        followUpStatus: 'Processing',
        coordinatorNote: '',
        rawText: ''
      });
    }

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
      summary: extraction?.summary || record.summary || '',
      statusDescription: record.statusNotes
    });
  } catch (error) {
    return json(500, { error: error.message || 'Unexpected server error.' });
  }
}

module.exports = { handler };
