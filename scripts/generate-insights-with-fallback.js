/**
 * Go Mission - Quick Insights Generator (GPT-4o-mini)
 * Commentary: Tyndale (primary) -> Barnes + Matthew Henry (fallback)
 * Usage: OPENAI_API_KEY="sk-..." node scripts/generate-insights-with-fallback.js 1TH,2TH,HAG,JON
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const ALL_BOOKS = [
  'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA',
  '1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO',
  'ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO',
  'OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL',
  'MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH',
  'PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS',
  '1PE','2PE','1JN','2JN','3JN','JUD','REV'
];

const arg = process.argv[2] ? process.argv[2].toUpperCase() : null;
const booksToProcess = !arg ? ['1TH','2TH','HAG','JON']
  : arg === 'ALL' ? ALL_BOOKS
  : arg.split(',').map(b => b.trim());

const ROOT = path.join(__dirname, '..');
const CONFIG = {
  bibleDir:    path.join(ROOT, 'modules', 'bible', 'data', 'en'),
  tyndaleDir:  path.join(ROOT, 'modules', 'bible', 'data', 'commentary', 'tyndale-json'),
  outputDir:   path.join(ROOT, 'modules', 'bible', 'data', 'quick-insights'),
  logFile:     '/tmp/insights-gen.log',
  booksToProcess,
  delayMs:      700,
  retryDelayMs: 8000,
  model:       'gpt-4o-mini',
};

if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(CONFIG.logFile, line + '\n');
}

const SYSTEM_PROMPT = `You are a warm, insightful Bible teacher creating verse-by-verse insights for Filipino believers worldwide.

You will receive a Bible verse and commentary notes (Tyndale, Barnes, or Matthew Henry).

Create a 4-section insight in BOTH English and Tagalog. Each section = full paragraph (4-6 sentences).

TAGALOG RULE: The Tagalog must be a faithful translation of the English insight — same meaning, same depth, same structure — written in natural conversational Filipino. Do not add or remove meaning. Stay true to the original Bible text and commentary at all times.

FORMAT (follow exactly):

**ENGLISH:**

**1. Understanding This Verse**
[paragraph]

**2. Living It Out**
[paragraph]

**3. See God's Love**
[paragraph]

**4. Reflection Question**
[question(s)]

---

**TAGALOG:**

**1. Pag-unawa sa Talatang Ito**
[talata]

**2. Isabuhay Ito**
[talata]

**3. Makita ang Pag-ibig ng Diyos**
[talata]

**4. Pagnilayan**
[tanong]`;

async function callOpenAI(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: CONFIG.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
    const req = https.request({
      hostname: 'api.openai.com',
      path:     '/v1/chat/completions',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Authorization':  `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          if (p.error) return reject(new Error(p.error.message));
          resolve(p.choices[0].message.content);
        } catch(e) { reject(new Error('Parse error: ' + data.slice(0,200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getVerseText(bookId, chapter, verse) {
  const fp = path.join(CONFIG.bibleDir, `${bookId}.json`);
  if (!fs.existsSync(fp)) return null;
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  return { bookName: d.nameEn || d.name || bookId, text: d.chapters?.[chapter]?.verses?.[verse] || '' };
}

function getTyndaleNote(bookId, chapter, verse) {
  const fp = path.join(CONFIG.tyndaleDir, `${bookId}.json`);
  if (!fs.existsSync(fp)) return null;
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const ch = d.chapters?.[chapter];
  if (!ch) return null;
  if (ch.verses[verse]) return ch.verses[verse];
  for (const [range, note] of Object.entries(ch.verses || {})) {
    if (range.includes('-')) {
      const [s, e] = range.split('-').map(Number);
      if (parseInt(verse) >= s && parseInt(verse) <= e) return note;
    }
  }
  return null;
}

function buildCommentary(bookId, chapter, verse) {
  const t = getTyndaleNote(bookId, chapter, verse);
  if (t) return `**Commentary (Tyndale Open Study Notes):**\n${t}`;
  return `**Commentary (Barnes' Notes + Matthew Henry):**\nNo local file available. Draw from your knowledge of Barnes' Notes on the Bible and Matthew Henry's Complete Commentary for this verse.`;
}

function parseInsight(text) {
  const s = { en: { understanding:'', livingItOut:'', godsLove:'', reflection:'' }, tl: { understanding:'', livingItOut:'', godsLove:'', reflection:'' } };
  const parts = text.split(/\n{0,2}---\n{0,2}/);
  const en = parts[0] || '';
  const tl = parts[1] || '';
  const x = (block, re) => { const m = block.match(re); return m ? m[1].trim() : ''; };
  s.en.understanding = x(en, /\*\*1\.[^*]*\*\*\s*([\s\S]*?)(?=\*\*2\.|$)/i);
  s.en.livingItOut   = x(en, /\*\*2\.[^*]*\*\*\s*([\s\S]*?)(?=\*\*3\.|$)/i);
  s.en.godsLove      = x(en, /\*\*3\.[^*]*\*\*\s*([\s\S]*?)(?=\*\*4\.|$)/i);
  s.en.reflection    = x(en, /\*\*4\.[^*]*\*\*\s*([\s\S]*?)$/i);
  s.tl.understanding = x(tl, /\*\*1\.[^*]*\*\*\s*([\s\S]*?)(?=\*\*2\.|$)/i);
  s.tl.livingItOut   = x(tl, /\*\*2\.[^*]*\*\*\s*([\s\S]*?)(?=\*\*3\.|$)/i);
  s.tl.godsLove      = x(tl, /\*\*3\.[^*]*\*\*\s*([\s\S]*?)(?=\*\*4\.|$)/i);
  s.tl.reflection    = x(tl, /\*\*4\.[^*]*\*\*\s*([\s\S]*?)$/i);
  return s;
}

async function processBook(bookId) {
  const bibleFile = path.join(CONFIG.bibleDir, `${bookId}.json`);
  if (!fs.existsSync(bibleFile)) { log(`❌ No bible file for ${bookId}`); return; }

  const bibleData  = JSON.parse(fs.readFileSync(bibleFile, 'utf8'));
  const bookName   = bibleData.nameEn || bibleData.name || bookId;
  const hasTyndale = fs.existsSync(path.join(CONFIG.tyndaleDir, `${bookId}.json`));
  log(`\n📖 ${bookName} (${bookId}) — ${hasTyndale ? 'Tyndale' : 'Barnes + Matthew Henry'}`);

  const outputFile = path.join(CONFIG.outputDir, `${bookId}.json`);
  let output = { book: bookId, name: bookName, chapters: {} };
  if (fs.existsSync(outputFile)) { output = JSON.parse(fs.readFileSync(outputFile, 'utf8')); log('  📂 Resuming...'); }

  const chapters = bibleData.chapters || {};
  const total = Object.values(chapters).reduce((s,c) => s + Object.keys(c.verses||{}).length, 0);
  log(`  📊 ${total} verses`);

  let generated = 0, skipped = 0, errors = 0;

  for (const [chNum, chData] of Object.entries(chapters)) {
    if (!output.chapters[chNum]) output.chapters[chNum] = { verses: {} };
    const verses = chData.verses || {};
    process.stdout.write(`  Ch ${String(chNum).padStart(3)}: `);

    for (const verseNum of Object.keys(verses)) {
      const ex = output.chapters[chNum].verses[verseNum];
      if (ex && ex.en && ex.en.understanding) { process.stdout.write('·'); skipped++; continue; }

      const vd = getVerseText(bookId, chNum, verseNum);
      if (!vd || !vd.text) { process.stdout.write('?'); continue; }

      const prompt = `**Verse:** ${vd.bookName} ${chNum}:${verseNum}\n"${vd.text}"\n\n${buildCommentary(bookId, chNum, parseInt(verseNum))}`;

      try {
        const raw = await callOpenAI(prompt);
        output.chapters[chNum].verses[verseNum] = parseInsight(raw);
        process.stdout.write('✓');
        generated++;
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        await new Promise(r => setTimeout(r, CONFIG.delayMs));
      } catch(err) {
        process.stdout.write('✗');
        errors++;
        log(`\n  ❌ ${bookId} ${chNum}:${verseNum} — ${err.message}`);
        await new Promise(r => setTimeout(r, CONFIG.retryDelayMs));
      }
    }
    process.stdout.write(`  (${Object.keys(verses).length}v)\n`);
  }
  log(`✅ ${bookName} — Generated: ${generated} | Skipped: ${skipped} | Errors: ${errors}`);
}

async function main() {
  log('============================================================');
  log('🚀 Go Mission Quick Insights — GPT-4o-mini');
  log(`   Books: ${CONFIG.booksToProcess.join(', ')}`);
  log('============================================================');
  if (!process.env.OPENAI_API_KEY) { log('❌ OPENAI_API_KEY not set'); process.exit(1); }
  for (const b of CONFIG.booksToProcess) await processBook(b);
  log('\n🎉 All done!');
}

main().catch(err => { log(`💥 Fatal: ${err.message}`); process.exit(1); });
