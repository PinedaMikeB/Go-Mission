#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  BOOKS,
  BOOK_BY_NUMBER,
  DEFAULT_SQL_PATH,
  MANUAL_VERSE_OVERRIDES
} = require('./import-tagalog-web-sql');

const args = process.argv.slice(2);
const sqlPath = args[0] ? path.resolve(args[0]) : DEFAULT_SQL_PATH;

const BOOK_NAME_ALIASES = {
  gawa: 'ACT',
  'mga gawa': 'ACT',
  acts: 'ACT',
  roma: 'ROM',
  'mga romano': 'ROM',
  romans: 'ROM',
  habakuk: 'HAB',
  habacuc: 'HAB',
  hagai: 'HAG',
  haggeo: 'HAG',
  malakias: 'MAL',
  malachias: 'MAL',
  '1 corinto': '1CO',
  '2 corinto': '2CO',
  '1 tesalonica': '1TH',
  '2 tesalonica': '2TH',
  '1 pedro': '1PE',
  '2 pedro': '2PE',
};

function buildBookNameMap() {
  const map = new Map();
  for (const [id, name, nameEn] of BOOKS) {
    for (const label of [id, name, nameEn]) {
      map.set(label.toLowerCase(), id);
    }
  }
  for (const [label, id] of Object.entries(BOOK_NAME_ALIASES)) {
    map.set(label, id);
  }
  return map;
}

function parseField(raw, wasQuoted) {
  if (wasQuoted) return raw;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === 'NULL') return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : trimmed;
}

function decodeMysqlEscape(char) {
  switch (char) {
    case '0': return '\0';
    case 'b': return '\b';
    case 'n': return '\n';
    case 'r': return '\r';
    case 't': return '\t';
    case 'Z': return '\x1a';
    case '\\': return '\\';
    case '\'': return '\'';
    case '"': return '"';
    default: return char;
  }
}

function extractFilRows(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  const prefix = 'INSERT INTO `bible_verses_web` VALUES ';
  const rows = [];
  let searchIndex = 0;

  while (searchIndex < sql.length) {
    const startIndex = sql.indexOf(prefix, searchIndex);
    if (startIndex === -1) break;

    let inRow = false;
    let inString = false;
    let escapeNext = false;
    let fieldBuffer = '';
    let fieldWasQuoted = false;
    let row = [];
    let cursor = startIndex + prefix.length;

    function resetField() {
      fieldBuffer = '';
      fieldWasQuoted = false;
    }

    function pushField() {
      row.push(parseField(fieldBuffer, fieldWasQuoted));
      resetField();
    }

    for (; cursor < sql.length; cursor += 1) {
      const char = sql[cursor];

      if (!inRow) {
        if (char === '(') {
          inRow = true;
          row = [];
          resetField();
          continue;
        }
        if (char === ';') {
          cursor += 1;
          break;
        }
        continue;
      }

      if (inString) {
        if (escapeNext) {
          fieldBuffer += decodeMysqlEscape(char);
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '\'') {
          inString = false;
          continue;
        }
        fieldBuffer += char;
        continue;
      }

      if (char === '\'') {
        inString = true;
        fieldWasQuoted = true;
        continue;
      }

      if (char === ',') {
        pushField();
        continue;
      }

      if (char === ')') {
        pushField();
        inRow = false;
        if (row.length === 7 && row[5] === 'fil') {
          const [id, bookNumber, chapter, verse, text, language, commentary] = row;
          rows.push({
            id,
            bookNumber,
            chapter,
            verse,
            text,
            language,
            commentary
          });
        }
        row = [];
        continue;
      }

      fieldBuffer += char;
    }

    searchIndex = cursor;
  }

  return rows;
}

function scanRows(rows) {
  const nameMap = buildBookNameMap();
  const bookPattern = [...nameMap.keys()]
    .sort((a, b) => b.length - a.length)
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const explicitRef = new RegExp(`\\b(${bookPattern})\\s+(\\d+):(\\d+)`, 'i');
  const issues = [];
  const rowByRef = new Map();

  for (const row of rows) {
    const rowBook = BOOK_BY_NUMBER.get(Number(row.bookNumber))?.id;
    if (!rowBook) continue;
    rowByRef.set(`${rowBook} ${row.chapter}:${row.verse}`, row);
  }

  for (const row of rows) {
    if (!row.commentary) continue;
    const normalizedHead = String(row.commentary).replace(/\s+/g, ' ').trim().slice(0, 220);
    const match = normalizedHead.match(explicitRef);
    if (!match) continue;

    const refBook = nameMap.get(match[1].toLowerCase());
    const refChapter = Number(match[2]);
    const refVerse = Number(match[3]);
    const rowBook = BOOK_BY_NUMBER.get(Number(row.bookNumber))?.id;

    if (!rowBook) continue;
    if (refBook === rowBook && refChapter === Number(row.chapter) && refVerse === Number(row.verse)) {
      continue;
    }

    const commentaryRef = `${refBook} ${refChapter}:${refVerse}`;
    const referencedRow = rowByRef.get(commentaryRef);
    const normalizedText = String(row.text || '').replace(/\s+/g, ' ').trim();
    const referencedText = String(referencedRow?.text || '').replace(/\s+/g, ' ').trim();

    issues.push({
      rowId: row.id,
      rowRef: `${rowBook} ${row.chapter}:${row.verse}`,
      commentaryRef,
      textPreview: String(row.text || '').slice(0, 120),
      commentaryHead: normalizedHead.slice(0, 180),
      sameTextAsCommentaryRef: Boolean(
        referencedText &&
        normalizedText &&
        normalizedText === referencedText
      )
    });
  }

  return issues;
}

function main() {
  console.log(`Scanning ${sqlPath}`);
  const rows = extractFilRows(sqlPath);
  const issues = scanRows(rows);
  const carryOverCandidates = issues.filter((issue) => issue.sameTextAsCommentaryRef);

  console.log(`Parsed Tagalog rows: ${rows.length}`);
  console.log(`Commentary reference mismatches: ${issues.length}`);
  console.log(`Carry-over text candidates: ${carryOverCandidates.length}`);

  if (Object.keys(MANUAL_VERSE_OVERRIDES).length) {
    console.log('Manual importer overrides configured for:');
    for (const [bookId, chapters] of Object.entries(MANUAL_VERSE_OVERRIDES)) {
      for (const [chapterKey, verses] of Object.entries(chapters)) {
        console.log(`  - ${bookId} ${chapterKey}:${Object.keys(verses).join(',')}`);
      }
    }
  }

  for (const issue of carryOverCandidates.slice(0, 50)) {
    console.log(JSON.stringify(issue, null, 2));
  }

  if (!carryOverCandidates.length) {
    console.log('No carry-over candidates found where the row text exactly matches the commentary-referenced verse text.');
  }

  if (carryOverCandidates.length < 50) {
    const remaining = 50 - carryOverCandidates.length;
    for (const issue of issues.filter((item) => !item.sameTextAsCommentaryRef).slice(0, remaining)) {
      console.log(JSON.stringify(issue, null, 2));
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  extractFilRows,
  scanRows
};
