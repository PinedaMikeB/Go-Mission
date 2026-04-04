#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'modules', 'bible', 'data');
const BIBLE_DIR = path.join(DATA_DIR, 'en');
const INSIGHTS_DIR = path.join(DATA_DIR, 'quick-insights');
const LOADER_FILE = path.join(ROOT, 'modules', 'bible', 'bible-loader.js');

const args = process.argv.slice(2);
const jsonFlag = args.includes('--json');
const verseArg = args.find((arg) => arg.startsWith('--verse='));
const bookArg = args.find((arg) => !arg.startsWith('--'));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getCanonicalBooks() {
  const loader = fs.readFileSync(LOADER_FILE, 'utf8');
  const match = loader.match(/bookIds:\s*\[(.*?)\]\s*,/s);
  if (!match) throw new Error('Could not parse canonical book IDs from bible-loader.js');
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function hasInsight(entry) {
  return Boolean(
    entry &&
    entry.en &&
    entry.tl &&
    typeof entry.en.understanding === 'string' && entry.en.understanding.trim() &&
    typeof entry.en.livingItOut === 'string' && entry.en.livingItOut.trim() &&
    typeof entry.en.godsLove === 'string' && entry.en.godsLove.trim() &&
    typeof entry.en.reflection === 'string' && entry.en.reflection.trim() &&
    typeof entry.tl.understanding === 'string' && entry.tl.understanding.trim() &&
    typeof entry.tl.livingItOut === 'string' && entry.tl.livingItOut.trim() &&
    typeof entry.tl.godsLove === 'string' && entry.tl.godsLove.trim() &&
    typeof entry.tl.reflection === 'string' && entry.tl.reflection.trim()
  );
}

function auditBook(bookId) {
  const biblePath = path.join(BIBLE_DIR, `${bookId}.json`);
  const insightsPath = path.join(INSIGHTS_DIR, `${bookId}.json`);
  const bible = readJson(biblePath);
  const insights = fs.existsSync(insightsPath) ? readJson(insightsPath) : { chapters: {} };
  const missing = [];

  let totalVerses = 0;
  let completeVerses = 0;

  for (const [chapterNum, chapterData] of Object.entries(bible.chapters || {})) {
    for (const [verseNum, verseText] of Object.entries(chapterData.verses || {})) {
      if (!String(verseText || '').trim()) continue;
      totalVerses += 1;
      const entry = insights?.chapters?.[chapterNum]?.verses?.[verseNum];
      if (hasInsight(entry)) {
        completeVerses += 1;
      } else {
        missing.push(`${chapterNum}:${verseNum}`);
      }
    }
  }

  return {
    bookId,
    totalVerses,
    completeVerses,
    missingCount: missing.length,
    coveragePercent: totalVerses ? Number(((completeVerses / totalVerses) * 100).toFixed(2)) : 0,
    chapterCount: Object.keys(bible.chapters || {}).length,
    insightsChapterCount: Object.keys(insights.chapters || {}).length,
    missingVerses: missing
  };
}

function selectBooks(canonicalBooks) {
  if (!bookArg) return canonicalBooks;
  if (bookArg.toUpperCase() === 'ALL') return canonicalBooks;
  return bookArg.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);
}

function formatVerseCheck(results, verseSpec) {
  const [chapter, verse] = verseSpec.split(':');
  return results.map((result) => ({
    bookId: result.bookId,
    verse: verseSpec,
    hasInsight: !result.missingVerses.includes(`${chapter}:${verse}`)
  }));
}

function main() {
  const canonicalBooks = getCanonicalBooks();
  const books = selectBooks(canonicalBooks);
  const results = books.map(auditBook);
  const booksWithGaps = results.filter((result) => result.missingCount > 0);

  if (jsonFlag) {
    const payload = {
      canonicalBooks: canonicalBooks.length,
      checkedBooks: books.length,
      booksWithGaps: booksWithGaps.length,
      results
    };

    if (verseArg) {
      payload.verseCheck = formatVerseCheck(results, verseArg.replace('--verse=', ''));
    }

    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  console.log(`Canonical books: ${canonicalBooks.length}`);
  console.log(`Checked books: ${books.length}`);
  console.log(`Books with gaps: ${booksWithGaps.length}`);

  if (verseArg) {
    const verseSpec = verseArg.replace('--verse=', '');
    console.log(`Verse check: ${verseSpec}`);
    for (const row of formatVerseCheck(results, verseSpec)) {
      console.log(`  ${row.bookId}: ${row.hasInsight ? 'present' : 'missing'}`);
    }
  }

  for (const result of booksWithGaps) {
    console.log(
      `${result.bookId}: ${result.completeVerses}/${result.totalVerses} complete ` +
      `(${result.coveragePercent}%), chapters ${result.insightsChapterCount}/${result.chapterCount}, ` +
      `sample missing: ${result.missingVerses.slice(0, 20).join(', ')}`
    );
  }
}

main();
