/**
 * Convert Tyndale Open Study Notes XML to JSON
 * Then test AI enhancement with 4-section format
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'tyndale', 'Tyndale Open Study Notes', 'StudyNotes.xml');
const outputDir = path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'tyndale-json');

// Book reference mapping
const BOOK_MAP = {
  'Gen': 'GEN', 'Exod': 'EXO', 'Lev': 'LEV', 'Num': 'NUM', 'Deut': 'DEU',
  'Josh': 'JOS', 'Judg': 'JDG', 'Ruth': 'RUT', '1Sam': 'SA1', '2Sam': '2SA',
  '1Kgs': '1KI', '2Kgs': '2KI', '1Chr': '1CH', '2Chr': '2CH', 'Ezra': 'EZR',
  'Neh': 'NEH', 'Esth': 'EST', 'Job': 'JOB', 'Ps': 'PSA', 'Prov': 'PRO',
  'Eccl': 'ECC', 'Song': 'SNG', 'Isa': 'ISA', 'Jer': 'JER', 'Lam': 'LAM',
  'Ezek': 'EZK', 'Dan': 'DAN', 'Hos': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO',
  'Obad': 'OBA', 'Jonah': 'JON', 'Mic': 'MIC', 'Nah': 'NAH', 'Hab': 'HAB',
  'Zeph': 'ZEP', 'Hag': 'HAG', 'Zech': 'ZEC', 'Mal': 'MAL',
  'Matt': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT',
  'Rom': 'ROM', '1Cor': '1CO', '2Cor': '2CO', 'Gal': 'GAL', 'Eph': 'EPH',
  'Phil': 'PHP', 'Col': 'COL', '1Thess': '1TH', '2Thess': '2TH',
  '1Tim': '1TI', '2Tim': '2TI', 'Titus': 'TIT', 'Phlm': 'PHM', 'Heb': 'HEB',
  'Jas': 'JAS', '1Pet': '1PE', '2Pet': '2PE', '1John': '1JN', '2John': '2JN',
  '3John': '3JN', 'Jude': 'JUD', 'Rev': 'REV',
  // Alternative mappings
  'Pr': 'PRO', '1Jn': '1JN', '2Jn': '2JN', '3Jn': '3JN'
};

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function cleanText(text) {
  // Remove HTML tags but keep content
  return text
    .replace(/<span class="sn-ref">.*?<\/span>/g, '')
    .replace(/<span class="sn-excerpt">(.*?)<\/span>/g, '"$1"')
    .replace(/<span class="hebrew">(.*?)<\/span>/g, '$1')
    .replace(/<span class="ital">(.*?)<\/span>/g, '$1')
    .replace(/<a[^>]*>(.*?)<\/a>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseReference(refStr) {
  // Parse "John.3.16" or "Gen.1.1-2.3" format
  const match = refStr.match(/^(\w+)\.(\d+)\.(\d+)(?:-(\d+)(?:\.(\d+))?)?$/);
  if (!match) return null;
  
  const [, book, chapter, verseStart, verseEndOrChapter, verseEnd] = match;
  const bookId = BOOK_MAP[book];
  
  if (!bookId) return null;
  
  return {
    bookId,
    chapter: parseInt(chapter),
    verseStart: parseInt(verseStart),
    verseEnd: verseEnd ? parseInt(verseEnd) : (verseEndOrChapter ? parseInt(verseEndOrChapter) : parseInt(verseStart))
  };
}

function convertToJSON() {
  console.log('Reading Tyndale Study Notes XML...');
  const xml = fs.readFileSync(inputFile, 'utf8');
  
  // Parse items using regex (simple approach for this XML structure)
  const itemRegex = /<item name="([^"]+)"[^>]*>[\s\S]*?<refs>([^<]+)<\/refs>[\s\S]*?<body>([\s\S]*?)<\/body>[\s\S]*?<\/item>/g;
  
  const books = {};
  let match;
  let count = 0;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const [, name, refs, body] = match;
    const ref = parseReference(refs);
    
    if (!ref) continue;
    
    const text = cleanText(body);
    if (!text) continue;
    
    const { bookId, chapter, verseStart, verseEnd } = ref;
    
    if (!books[bookId]) {
      books[bookId] = { chapters: {} };
    }
    
    if (!books[bookId].chapters[chapter]) {
      books[bookId].chapters[chapter] = { verses: {} };
    }
    
    // Store note - use verse range as key if needed
    const verseKey = verseStart === verseEnd ? String(verseStart) : `${verseStart}-${verseEnd}`;
    books[bookId].chapters[chapter].verses[verseKey] = text;
    count++;
  }
  
  console.log(`Parsed ${count} study notes`);
  
  // Save each book as separate JSON file
  for (const [bookId, data] of Object.entries(books)) {
    const outputFile = path.join(outputDir, `${bookId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    const chapterCount = Object.keys(data.chapters).length;
    console.log(`  ${bookId}: ${chapterCount} chapters`);
  }
  
  console.log(`\nSaved to: ${outputDir}`);
  return books;
}

// Run conversion
const books = convertToJSON();

// Show sample
console.log('\n--- SAMPLE: John 3:16 ---');
if (books.JHN && books.JHN.chapters[3] && books.JHN.chapters[3].verses[16]) {
  console.log(books.JHN.chapters[3].verses[16]);
} else {
  console.log('John 3:16 not found - checking available verses in John 3...');
  if (books.JHN && books.JHN.chapters[3]) {
    console.log('Available verse keys:', Object.keys(books.JHN.chapters[3].verses));
  }
}
