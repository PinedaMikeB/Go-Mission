#!/usr/bin/env node

/**
 * Go Mission - Missing Quick Insights Generator (GPT-5 mini)
 *
 * Fills only missing quick-insights entries and writes progress after every verse.
 * Commentary grounding priority:
 *   1. Tyndale
 *   2. Matthew Henry
 *   3. Barnes
 *
 * Usage:
 *   OPENAI_API_KEY="sk-..." node scripts/generate-missing-insights-gpt5-mini.js
 *   OPENAI_API_KEY="sk-..." node scripts/generate-missing-insights-gpt5-mini.js NUM,PSA --limit=25
 *   OPENAI_API_KEY="sk-..." node scripts/generate-missing-insights-gpt5-mini.js JON,HAG,1TH,2TH --force
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const DATA_ROOT = path.join(ROOT, 'modules', 'bible', 'data');
const WORKER_TAG = process.env.INSIGHTS_WORKER_TAG || 'default';
const CONFIG = {
  bibleDir: path.join(DATA_ROOT, 'en'),
  outputDir: path.join(DATA_ROOT, 'quick-insights'),
  commentaryDirs: {
    tyndale: path.join(DATA_ROOT, 'commentary', 'tyndale-json'),
    matthewHenry: path.join(DATA_ROOT, 'commentary', 'matthew-henry'),
    barnes: path.join(DATA_ROOT, 'commentary', 'barnes'),
  },
  stateDir: path.join(ROOT, 'tmp'),
  logFile: process.env.INSIGHTS_LOG_FILE || `/tmp/gm-insights-gpt5-mini-${WORKER_TAG}.log`,
  stateFile: process.env.INSIGHTS_STATE_FILE || path.join(ROOT, 'tmp', `insight-generation-state-${WORKER_TAG}.json`),
  model: 'gpt-5-mini',
  delayMs: 900,
  retryDelayMs: 10000,
  maxRetries: 3,
};

const ALL_BOOKS = [
  'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA',
  '1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO',
  'ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO',
  'OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL',
  'MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH',
  'PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS',
  '1PE','2PE','1JN','2JN','3JN','JUD','REV'
];

if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });
if (!fs.existsSync(CONFIG.stateDir)) fs.mkdirSync(CONFIG.stateDir, { recursive: true });

const args = process.argv.slice(2);
const positional = args.find((arg) => !arg.startsWith('--'));
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const forceRegenerate = args.includes('--force');
const booksToProcess = positional
  ? positional.toUpperCase() === 'ALL'
    ? ALL_BOOKS
    : positional.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)
  : ALL_BOOKS;
const verseLimit = limitArg ? Number(limitArg.split('=')[1]) : null;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  fs.appendFileSync(CONFIG.logFile, line + '\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function getBookFile(bookId) {
  return path.join(CONFIG.bibleDir, `${bookId}.json`);
}

function getOutputFile(bookId) {
  return path.join(CONFIG.outputDir, `${bookId}.json`);
}

function getStateFile() {
  return CONFIG.stateFile;
}

function ensureOutputShape(bookId, bibleData, outputData) {
  const current = outputData || {};
  if (!current.id) current.id = bookId;
  if (!current.book) current.book = bookId;
  if (!current.name) current.name = bibleData.nameEn || bibleData.name || bookId;
  current.type = 'quick-insights-gpt5-mini-commentary-hybrid';
  if (!current.chapters || typeof current.chapters !== 'object') current.chapters = {};
  return current;
}

function hasInsight(verseInsight) {
  return Boolean(
    verseInsight &&
    verseInsight.en &&
    verseInsight.tl &&
    typeof verseInsight.en.understanding === 'string' &&
    verseInsight.en.understanding.trim() &&
    typeof verseInsight.en.livingItOut === 'string' &&
    verseInsight.en.livingItOut.trim() &&
    typeof verseInsight.en.godsLove === 'string' &&
    verseInsight.en.godsLove.trim() &&
    typeof verseInsight.en.reflection === 'string' &&
    verseInsight.en.reflection.trim() &&
    typeof verseInsight.tl.understanding === 'string' &&
    verseInsight.tl.understanding.trim() &&
    typeof verseInsight.tl.livingItOut === 'string' &&
    verseInsight.tl.livingItOut.trim() &&
    typeof verseInsight.tl.godsLove === 'string' &&
    verseInsight.tl.godsLove.trim() &&
    typeof verseInsight.tl.reflection === 'string' &&
    verseInsight.tl.reflection.trim()
  );
}

function getCommentaryNoteFromBook(commentaryBook, chapter, verse) {
  const chapterData = commentaryBook?.chapters?.[String(chapter)];
  if (!chapterData?.verses) return null;

  const exact = chapterData.verses[String(verse)];
  if (typeof exact === 'string' && exact.trim()) return exact.trim();

  for (const [key, value] of Object.entries(chapterData.verses)) {
    if (!key.includes('-') || typeof value !== 'string' || !value.trim()) continue;
    const [start, end] = key.split('-').map((item) => Number(item.trim()));
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (Number(verse) >= start && Number(verse) <= end) return value.trim();
  }

  return null;
}

function loadCommentaryBook(sourceName, bookId) {
  const dir = CONFIG.commentaryDirs[sourceName];
  if (!dir) return null;
  return readJson(path.join(dir, `${bookId}.json`), null);
}

function getCommentaryPayload(bookId, chapter, verse) {
  const sourceOrder = [
    { key: 'tyndale', label: 'Tyndale Open Study Notes' },
    { key: 'matthewHenry', label: 'Matthew Henry' },
    { key: 'barnes', label: "Barnes' Notes" },
  ];

  for (const source of sourceOrder) {
    const book = loadCommentaryBook(source.key, bookId);
    if (!book) continue;
    const note = getCommentaryNoteFromBook(book, chapter, verse);
    if (!note) continue;
    return {
      source: source.label,
      text: note,
    };
  }

  return null;
}

function buildPrompt({ bookName, chapter, verse, verseText, commentary }) {
  return [
    `Verse: ${bookName} ${chapter}:${verse}`,
    `Bible text: ${verseText}`,
    '',
    commentary
      ? `Commentary source: ${commentary.source}\nCommentary note:\n${commentary.text}`
      : 'Commentary source: None locally available for this verse.\nCommentary note:\nNo local commentary note was found. Stay grounded in the verse text itself and do not invent historical details.',
    '',
    'Write detailed, pastoral quick insights in BOTH English and Tagalog for Filipino believers.',
    'The output must be faithful to the verse text and any commentary provided.',
    'The reflection question must be complete and not truncated.',
  ].join('\n');
}

function callResponsesApi(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: CONFIG.model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                'You are a warm, thoughtful Bible teacher creating detailed verse-by-verse insights for Filipino believers.',
                'Return JSON only.',
                'Create two parallel insight sets: one in English and one in Tagalog.',
                'Use a high level of detail and warmth, but remain faithful to the provided verse and commentary.',
                'Do not truncate the reflection question.',
                'Tagalog should sound natural, modern, and conversational, not stiff or overly formal.',
                'Each language must include these fields: understanding, livingItOut, godsLove, reflection.',
                'Each of the first three fields should be one substantial paragraph. Reflection should be one complete reflective question, optionally followed by a second short follow-up question.',
                'If commentary is sparse, stay anchored to the verse text and avoid speculative claims.',
              ].join(' ')
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt
            }
          ]
        }
      ],
      text: {
        verbosity: 'high',
        format: {
          type: 'json_schema',
          name: 'bible_quick_insight',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['en', 'tl'],
            properties: {
              en: {
                type: 'object',
                additionalProperties: false,
                required: ['understanding', 'livingItOut', 'godsLove', 'reflection'],
                properties: {
                  understanding: { type: 'string' },
                  livingItOut: { type: 'string' },
                  godsLove: { type: 'string' },
                  reflection: { type: 'string' },
                }
              },
              tl: {
                type: 'object',
                additionalProperties: false,
                required: ['understanding', 'livingItOut', 'godsLove', 'reflection'],
                properties: {
                  understanding: { type: 'string' },
                  livingItOut: { type: 'string' },
                  godsLove: { type: 'string' },
                  reflection: { type: 'string' },
                }
              }
            }
          }
        }
      }
    });

    const request = https.request({
      hostname: 'api.openai.com',
      path: '/v1/responses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (!response.statusCode || response.statusCode >= 400 || parsed.error) {
            reject(new Error(parsed?.error?.message || `HTTP ${response.statusCode}: ${body.slice(0, 300)}`));
            return;
          }
          let jsonText = parsed.output_text || null;
          if (!jsonText && Array.isArray(parsed.output)) {
            for (const item of parsed.output) {
              if (!Array.isArray(item?.content)) continue;
              for (const contentItem of item.content) {
                if (contentItem?.type === 'output_text' && typeof contentItem.text === 'string' && contentItem.text.trim()) {
                  jsonText = contentItem.text;
                  break;
                }
              }
              if (jsonText) break;
            }
          }
          if (!jsonText) {
            reject(new Error(`No output_text returned: ${body.slice(0, 300)}`));
            return;
          }
          const data = JSON.parse(jsonText);
          resolve(data);
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function normalizeInsight(raw) {
  const trimmed = {
    en: {
      understanding: String(raw?.en?.understanding || '').trim(),
      livingItOut: String(raw?.en?.livingItOut || '').trim(),
      godsLove: String(raw?.en?.godsLove || '').trim(),
      reflection: String(raw?.en?.reflection || '').trim(),
    },
    tl: {
      understanding: String(raw?.tl?.understanding || '').trim(),
      livingItOut: String(raw?.tl?.livingItOut || '').trim(),
      godsLove: String(raw?.tl?.godsLove || '').trim(),
      reflection: String(raw?.tl?.reflection || '').trim(),
    }
  };

  if (!hasInsight(trimmed)) {
    throw new Error('Model returned incomplete insight payload');
  }

  return trimmed;
}

function collectTasks(bookId, bibleData, outputData) {
  const tasks = [];
  for (const [chapterNum, chapterData] of Object.entries(bibleData.chapters || {})) {
    const outputChapter = outputData.chapters[chapterNum] || (outputData.chapters[chapterNum] = { verses: {} });
    for (const [verseNum, verseText] of Object.entries(chapterData.verses || {})) {
      if (!String(verseText || '').trim()) continue;
      if (!forceRegenerate && hasInsight(outputChapter.verses?.[verseNum])) continue;
      tasks.push({
        bookId,
        bookName: bibleData.nameEn || bibleData.name || bookId,
        chapter: chapterNum,
        verse: verseNum,
        verseText: String(verseText).trim(),
      });
    }
  }
  return tasks;
}

function updateState(state) {
  writeJson(getStateFile(), state);
}

async function generateVerse(task, outputData, outputFile, counters) {
  const commentary = getCommentaryPayload(task.bookId, task.chapter, task.verse);
  const prompt = buildPrompt({
    bookName: task.bookName,
    chapter: task.chapter,
    verse: task.verse,
    verseText: task.verseText,
    commentary,
  });

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt += 1) {
    try {
      const insight = normalizeInsight(await callResponsesApi(prompt));
      if (!outputData.chapters[task.chapter]) outputData.chapters[task.chapter] = { verses: {} };
      outputData.chapters[task.chapter].verses[task.verse] = insight;
      outputData.generatedAt = new Date().toISOString();
      writeJson(outputFile, outputData);
      counters.generated += 1;
      counters.byCommentary[commentary?.source || 'None'] = (counters.byCommentary[commentary?.source || 'None'] || 0) + 1;
      updateState({
        status: 'running',
        updatedAt: new Date().toISOString(),
        current: {
          bookId: task.bookId,
          chapter: task.chapter,
          verse: task.verse,
          commentary: commentary?.source || null,
        },
        totals: counters,
      });
      log(`✓ ${task.bookId} ${task.chapter}:${task.verse} (${commentary?.source || 'No local commentary'})`);
      await sleep(CONFIG.delayMs);
      return;
    } catch (error) {
      if (attempt === CONFIG.maxRetries) {
        counters.errors += 1;
        log(`✗ ${task.bookId} ${task.chapter}:${task.verse} failed after ${attempt} attempts: ${error.message}`);
        updateState({
          status: 'running',
          updatedAt: new Date().toISOString(),
          current: {
            bookId: task.bookId,
            chapter: task.chapter,
            verse: task.verse,
            commentary: commentary?.source || null,
          },
          totals: counters,
          lastError: {
            bookId: task.bookId,
            chapter: task.chapter,
            verse: task.verse,
            message: error.message,
          }
        });
        return;
      }
      log(`… retry ${attempt}/${CONFIG.maxRetries - 1} for ${task.bookId} ${task.chapter}:${task.verse}: ${error.message}`);
      await sleep(CONFIG.retryDelayMs);
    }
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const counters = {
    generated: 0,
    skippedExisting: 0,
    errors: 0,
    queued: 0,
    processedBooks: 0,
    byCommentary: {},
  };

  log('============================================================');
  log('Go Mission Missing Insights Generator - GPT-5 mini');
  log(`Worker: ${WORKER_TAG}`);
  log(`Books: ${booksToProcess.join(', ')}`);
  log(`Limit: ${Number.isFinite(verseLimit) ? verseLimit : 'none'}`);
  log(`Force regenerate: ${forceRegenerate ? 'yes' : 'no'}`);
  log('============================================================');

  const allTasks = [];
  for (const bookId of booksToProcess) {
    const bibleFile = getBookFile(bookId);
    if (!fs.existsSync(bibleFile)) {
      log(`! Skipping ${bookId}: Bible file not found`);
      continue;
    }
    const bibleData = readJson(bibleFile);
    const outputFile = getOutputFile(bookId);
    const outputData = ensureOutputShape(bookId, bibleData, readJson(outputFile, null));
    writeJson(outputFile, outputData);

    let totalVerses = 0;
    for (const chapterData of Object.values(bibleData.chapters || {})) {
      totalVerses += Object.keys(chapterData.verses || {}).length;
    }

    const missingTasks = collectTasks(bookId, bibleData, outputData);
    counters.skippedExisting += (totalVerses - missingTasks.length);
    counters.queued += missingTasks.length;
    counters.processedBooks += 1;
    log(`${bookId}: queued ${missingTasks.length}, existing ${totalVerses - missingTasks.length}`);
    allTasks.push({
      bookId,
      bookName: bibleData.nameEn || bibleData.name || bookId,
      outputFile,
      outputData,
      tasks: missingTasks,
    });
  }

  updateState({
    status: 'running',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      books: booksToProcess,
      limit: Number.isFinite(verseLimit) ? verseLimit : null,
      model: CONFIG.model,
    },
    totals: counters,
  });

  let remaining = Number.isFinite(verseLimit) ? verseLimit : Infinity;
  for (const book of allTasks) {
    if (remaining <= 0) break;
    for (const task of book.tasks) {
      if (remaining <= 0) break;
      await generateVerse(task, book.outputData, book.outputFile, counters);
      remaining -= 1;
    }
  }

  updateState({
    status: 'completed',
    startedAt: readJson(getStateFile(), {})?.startedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    config: {
      books: booksToProcess,
      limit: Number.isFinite(verseLimit) ? verseLimit : null,
      model: CONFIG.model,
    },
    totals: counters,
  });

  log(`Done. Generated ${counters.generated}, errors ${counters.errors}.`);
}

main().catch((error) => {
  updateState({
    status: 'failed',
    updatedAt: new Date().toISOString(),
    error: error.message,
  });
  log(`Fatal: ${error.message}`);
  process.exit(1);
});
