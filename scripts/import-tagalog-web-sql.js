#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_SQL_PATH = '/Users/mike/Downloads/Tagalog Translation fro WEB.sql';
const TL_DIR = path.join(ROOT, 'modules', 'bible', 'data', 'tl');
const TL_BUNDLE_PATH = path.join(ROOT, 'modules', 'bible', 'data-inline', 'tl-bundle.js');

const BOOKS = [
  ['GEN', 'Genesis', 'Genesis'],
  ['EXO', 'Exodo', 'Exodus'],
  ['LEV', 'Levitico', 'Leviticus'],
  ['NUM', 'Mga Bilang', 'Numbers'],
  ['DEU', 'Deuteronomio', 'Deuteronomy'],
  ['JOS', 'Josue', 'Joshua'],
  ['JDG', 'Mga Hukom', 'Judges'],
  ['RUT', 'Ruth', 'Ruth'],
  ['1SA', '1 Samuel', '1 Samuel'],
  ['2SA', '2 Samuel', '2 Samuel'],
  ['1KI', '1 Mga Hari', '1 Kings'],
  ['2KI', '2 Mga Hari', '2 Kings'],
  ['1CH', '1 Mga Cronica', '1 Chronicles'],
  ['2CH', '2 Mga Cronica', '2 Chronicles'],
  ['EZR', 'Ezra', 'Ezra'],
  ['NEH', 'Nehemias', 'Nehemiah'],
  ['EST', 'Ester', 'Esther'],
  ['JOB', 'Job', 'Job'],
  ['PSA', 'Mga Awit', 'Psalms'],
  ['PRO', 'Mga Kawikaan', 'Proverbs'],
  ['ECC', 'Mangangaral', 'Ecclesiastes'],
  ['SNG', 'Awit ni Solomon', 'Song of Solomon'],
  ['ISA', 'Isaias', 'Isaiah'],
  ['JER', 'Jeremias', 'Jeremiah'],
  ['LAM', 'Mga Panaghoy', 'Lamentations'],
  ['EZK', 'Ezekiel', 'Ezekiel'],
  ['DAN', 'Daniel', 'Daniel'],
  ['HOS', 'Oseas', 'Hosea'],
  ['JOL', 'Joel', 'Joel'],
  ['AMO', 'Amos', 'Amos'],
  ['OBA', 'Obadias', 'Obadiah'],
  ['JON', 'Jonas', 'Jonah'],
  ['MIC', 'Mikas', 'Micah'],
  ['NAM', 'Nahum', 'Nahum'],
  ['HAB', 'Habacuc', 'Habakkuk'],
  ['ZEP', 'Zefanias', 'Zephaniah'],
  ['HAG', 'Hagai', 'Haggai'],
  ['ZEC', 'Zacarias', 'Zechariah'],
  ['MAL', 'Malachias', 'Malachi'],
  ['MAT', 'Mateo', 'Matthew'],
  ['MRK', 'Marcos', 'Mark'],
  ['LUK', 'Lucas', 'Luke'],
  ['JHN', 'Juan', 'John'],
  ['ACT', 'Mga Gawa', 'Acts'],
  ['ROM', 'Mga Romano', 'Romans'],
  ['1CO', '1 Mga Corinto', '1 Corinthians'],
  ['2CO', '2 Mga Corinto', '2 Corinthians'],
  ['GAL', 'Mga Taga-Galacia', 'Galatians'],
  ['EPH', 'Mga Efeso', 'Ephesians'],
  ['PHP', 'Mga Taga-Filipos', 'Philippians'],
  ['COL', 'Mga Taga-Colosas', 'Colossians'],
  ['1TH', '1 Mga Taga-Tesalonica', '1 Thessalonians'],
  ['2TH', '2 Mga Taga-Tesalonica', '2 Thessalonians'],
  ['1TI', '1 Timoteo', '1 Timothy'],
  ['2TI', '2 Timoteo', '2 Timothy'],
  ['TIT', 'Tito', 'Titus'],
  ['PHM', 'Filemon', 'Philemon'],
  ['HEB', 'Mga Hebreo', 'Hebrews'],
  ['JAS', 'Santiago', 'James'],
  ['1PE', '1 Pedro', '1 Peter'],
  ['2PE', '2 Pedro', '2 Peter'],
  ['1JN', '1 Juan', '1 John'],
  ['2JN', '2 Juan', '2 John'],
  ['3JN', '3 Juan', '3 John'],
  ['JUD', 'Judas', 'Jude'],
  ['REV', 'Pahayag', 'Revelation']
];

const BOOK_BY_NUMBER = new Map(
  BOOKS.map(([id, name, nameEn], index) => [index + 1, { id, name, nameEn }])
);

const args = process.argv.slice(2);
const sqlPath = args[0] ? path.resolve(args[0]) : DEFAULT_SQL_PATH;

const MANUAL_VERSE_OVERRIDES = {
  ACT: {
    '8': {
      // The SQL dump shifts Acts 8 here:
      // - row 8:37 contains the text for 8:38
      // - row 8:38 contains unrelated text from Acts 24:7
      // This restores the correct verse flow for the module.
      '37': 'Sinabi ni Felipe, "Kung sumasampalataya ka nang buong puso, maaari kang mabautismuhan." Sumagot siya, "Sumasampalataya ako na si Jesucristo ang Anak ng Diyos."',
      '38': 'Iniutos niya na huminto ang karwahe, at silang dalawa ay bumaba sa tubig, kapwa si Felipe at ang eunuko, at binautismuhan niya siya.'
    }
  }
};

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

function parseField(raw, wasQuoted) {
  if (wasQuoted) return raw;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === 'NULL') return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : trimmed;
}

function createBookShell(meta) {
  return {
    id: meta.id,
    name: meta.name,
    nameEn: meta.nameEn,
    translation: 'TAGALOG_WEB',
    language: 'tl',
    chapters: {}
  };
}

function sortNestedObject(input) {
  const ordered = {};
  for (const key of Object.keys(input).sort((a, b) => Number(a) - Number(b))) {
    ordered[key] = input[key];
  }
  return ordered;
}

function applyManualCorrections(books) {
  for (const [bookId, chapterOverrides] of Object.entries(MANUAL_VERSE_OVERRIDES)) {
    const book = books.get(bookId);
    if (!book) continue;

    for (const [chapterKey, verseOverrides] of Object.entries(chapterOverrides)) {
      if (!book.chapters[chapterKey]) {
        book.chapters[chapterKey] = { chapter: Number(chapterKey), verses: {} };
      }

      for (const [verseKey, verseText] of Object.entries(verseOverrides)) {
        book.chapters[chapterKey].verses[verseKey] = verseText;
      }

      book.chapters[chapterKey].verses = sortNestedObject(book.chapters[chapterKey].verses);
    }
  }
}

function extractFilVerses(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }

  const prefix = 'INSERT INTO `bible_verses_web` VALUES ';
  const books = new Map(BOOKS.map(([id, name, nameEn]) => [id, createBookShell({ id, name, nameEn })]));
  const stats = { totalRows: 0, filRows: 0, engRows: 0, otherRows: 0 };

  function processRow(values) {
    stats.totalRows += 1;
    if (values.length !== 7) {
      throw new Error(`Unexpected bible_verses_web column count: ${values.length}`);
    }

    const [, bookNumber, chapterNumber, verseNumber, verseText, language] = values;
    if (language === 'eng') {
      stats.engRows += 1;
      return;
    }
    if (language !== 'fil') {
      stats.otherRows += 1;
      return;
    }

    stats.filRows += 1;

    const meta = BOOK_BY_NUMBER.get(Number(bookNumber));
    if (!meta) {
      throw new Error(`Unknown book number: ${bookNumber}`);
    }

    const book = books.get(meta.id);
    const chapterKey = String(chapterNumber);
    const verseKey = String(verseNumber);

    if (!book.chapters[chapterKey]) {
      book.chapters[chapterKey] = { chapter: Number(chapterNumber), verses: {} };
    }

    book.chapters[chapterKey].verses[verseKey] = typeof verseText === 'string' ? verseText : '';
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  let searchIndex = 0;
  let foundAnyInsert = false;

  while (searchIndex < sql.length) {
    const startIndex = sql.indexOf(prefix, searchIndex);
    if (startIndex === -1) break;
    foundAnyInsert = true;

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
        processRow(row);
        row = [];
        continue;
      }

      fieldBuffer += char;
    }

    searchIndex = cursor;
  }

  if (!foundAnyInsert) {
    throw new Error('Could not locate bible_verses_web insert block in SQL file.');
  }

  const preparedBooks = new Map();
  for (const [bookId, book] of books.entries()) {
    const sortedChapters = {};
    for (const chapterKey of Object.keys(book.chapters).sort((a, b) => Number(a) - Number(b))) {
      const chapter = book.chapters[chapterKey];
      sortedChapters[chapterKey] = {
        chapter: chapter.chapter,
        verses: sortNestedObject(chapter.verses)
      };
    }
    preparedBooks.set(bookId, { ...book, chapters: sortedChapters });
  }

  applyManualCorrections(preparedBooks);

  return { books: preparedBooks, stats };
}

function ensureOutputDirs() {
  fs.mkdirSync(TL_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(TL_BUNDLE_PATH), { recursive: true });
}

function buildIndex() {
  return {
    translation: 'TAGALOG_WEB',
    name: 'Tagalog WEB',
    language: 'tl',
    languageName: 'Tagalog',
    license: 'Unspecified',
    source: 'bible_verses_web SQL import',
    books: BOOKS.map(([id, name, nameEn]) => ({ id, name, nameEn }))
  };
}

function writeBookFiles(books) {
  for (const [id] of BOOKS) {
    const book = books.get(id);
    if (!book) {
      throw new Error(`Missing generated payload for ${id}`);
    }

    const outputPath = path.join(TL_DIR, `${id}.json`);
    fs.writeFileSync(outputPath, `${JSON.stringify(book, null, 2)}\n`);
  }

  const index = buildIndex();
  fs.writeFileSync(path.join(TL_DIR, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

function writeInlineBundle(books, index) {
  const payload = {};
  for (const [id] of BOOKS) {
    payload[id] = books.get(id);
  }
  payload.index = index;

  const source = [
    '/* Auto-generated inline Bible bundle (TL) */',
    '(function(){',
    '  window.GoMissionBibleInline = window.GoMissionBibleInline || {};',
    `  window.GoMissionBibleInline['tl'] = ${JSON.stringify(payload)};`,
    '})();',
    ''
  ].join('\n');

  fs.writeFileSync(TL_BUNDLE_PATH, source);
}

function verifyAgainstEnglish(books) {
  const enDir = path.join(ROOT, 'modules', 'bible', 'data', 'en');
  const mismatches = [];

  for (const [id] of BOOKS) {
    const enPath = path.join(enDir, `${id}.json`);
    const enBook = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const tlBook = books.get(id);
    const enChapterKeys = Object.keys(enBook.chapters || {});
    const tlChapterKeys = Object.keys(tlBook.chapters || {});

    if (enChapterKeys.length !== tlChapterKeys.length) {
      mismatches.push(`${id}: chapter count ${tlChapterKeys.length} != ${enChapterKeys.length}`);
      continue;
    }

    for (const chapterKey of enChapterKeys) {
      const enVerses = Object.keys(enBook.chapters[chapterKey]?.verses || {});
      const tlVerses = Object.keys(tlBook.chapters[chapterKey]?.verses || {});
      if (enVerses.length !== tlVerses.length) {
        mismatches.push(`${id} ${chapterKey}: verse count ${tlVerses.length} != ${enVerses.length}`);
      }
    }
  }

  return mismatches;
}

async function main() {
  console.log(`Importing Tagalog WEB from ${sqlPath}`);
  ensureOutputDirs();

  const { books, stats } = await extractFilVerses(sqlPath);
  const mismatches = verifyAgainstEnglish(books);
  const index = writeBookFiles(books);
  writeInlineBundle(books, index);

  console.log(`Parsed rows: total=${stats.totalRows}, fil=${stats.filRows}, eng=${stats.engRows}, other=${stats.otherRows}`);
  console.log(`Wrote ${BOOKS.length} Tagalog book files, index.json, and tl-bundle.js`);

  if (mismatches.length) {
    console.warn(`Verse-count differences vs English BSB detected in ${mismatches.length} chapter(s):`);
    for (const line of mismatches.slice(0, 20)) {
      console.warn(`  - ${line}`);
    }
  }

  const john = books.get('JHN');
  console.log(`Sample JHN 3:16 => ${john.chapters['3'].verses['16']}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  BOOKS,
  BOOK_BY_NUMBER,
  DEFAULT_SQL_PATH,
  MANUAL_VERSE_OVERRIDES,
  extractFilVerses
};
