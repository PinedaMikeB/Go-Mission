/**
 * Go Mission - Tagalog Bible Downloader (GetBible API)
 * Downloads Ang Dating Biblia (1905) from GetBible API
 * 
 * Usage: node scripts/download-tagalog-getbible.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG = {
  apiBase: 'https://api.getbible.net/v2/tagalog',
  outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'tl')
};

// Map GetBible book numbers to our book IDs
const BOOK_MAP = {
  1: 'GEN', 2: 'EXO', 3: 'LEV', 4: 'NUM', 5: 'DEU',
  6: 'JOS', 7: 'JDG', 8: 'RUT', 9: '1SA', 10: '2SA',
  11: '1KI', 12: '2KI', 13: '1CH', 14: '2CH', 15: 'EZR',
  16: 'NEH', 17: 'EST', 18: 'JOB', 19: 'PSA', 20: 'PRO',
  21: 'ECC', 22: 'SNG', 23: 'ISA', 24: 'JER', 25: 'LAM',
  26: 'EZK', 27: 'DAN', 28: 'HOS', 29: 'JOL', 30: 'AMO',
  31: 'OBA', 32: 'JON', 33: 'MIC', 34: 'NAM', 35: 'HAB',
  36: 'ZEP', 37: 'HAG', 38: 'ZEC', 39: 'MAL',
  40: 'MAT', 41: 'MRK', 42: 'LUK', 43: 'JHN', 44: 'ACT',
  45: 'ROM', 46: '1CO', 47: '2CO', 48: 'GAL', 49: 'EPH',
  50: 'PHP', 51: 'COL', 52: '1TH', 53: '2TH', 54: '1TI',
  55: '2TI', 56: 'TIT', 57: 'PHM', 58: 'HEB', 59: 'JAS',
  60: '1PE', 61: '2PE', 62: '1JN', 63: '2JN', 64: '3JN',
  65: 'JUD', 66: 'REV'
};

/**
 * Fetch JSON from URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'GoMission/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Download a single book
 */
async function downloadBook(bookNr) {
  const bookId = BOOK_MAP[bookNr];
  const url = `${CONFIG.apiBase}/${bookNr}.json`;
  
  try {
    const data = await fetchJSON(url);
    
    // Transform to our format
    const bookData = {
      id: bookId,
      name: data.name,
      nameEn: getEnglishName(bookId),
      translation: 'ANG_DATING_BIBLIA_1905',
      language: 'tl',
      chapters: {}
    };
    
    // Process chapters (data.chapters is an ARRAY)
    for (const chapData of data.chapters) {
      const chapNr = chapData.chapter;
      bookData.chapters[chapNr] = {
        chapter: chapNr,
        verses: {}
      };
      
      // Process verses
      for (const verse of chapData.verses) {
        bookData.chapters[chapNr].verses[verse.verse] = verse.text;
      }
    }
    
    return { success: true, data: bookData, chapters: Object.keys(data.chapters).length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get English book name
 */
function getEnglishName(bookId) {
  const names = {
    'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers',
    'DEU': 'Deuteronomy', 'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth',
    '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Kings', '2KI': '2 Kings',
    '1CH': '1 Chronicles', '2CH': '2 Chronicles', 'EZR': 'Ezra', 'NEH': 'Nehemiah',
    'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms', 'PRO': 'Proverbs',
    'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'ISA': 'Isaiah', 'JER': 'Jeremiah',
    'LAM': 'Lamentations', 'EZK': 'Ezekiel', 'DAN': 'Daniel', 'HOS': 'Hosea',
    'JOL': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadiah', 'JON': 'Jonah',
    'MIC': 'Micah', 'NAM': 'Nahum', 'HAB': 'Habakkuk', 'ZEP': 'Zephaniah',
    'HAG': 'Haggai', 'ZEC': 'Zechariah', 'MAL': 'Malachi',
    'MAT': 'Matthew', 'MRK': 'Mark', 'LUK': 'Luke', 'JHN': 'John',
    'ACT': 'Acts', 'ROM': 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians',
    'GAL': 'Galatians', 'EPH': 'Ephesians', 'PHP': 'Philippians', 'COL': 'Colossians',
    '1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy',
    'TIT': 'Titus', 'PHM': 'Philemon', 'HEB': 'Hebrews', 'JAS': 'James',
    '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John',
    '3JN': '3 John', 'JUD': 'Jude', 'REV': 'Revelation'
  };
  return names[bookId] || bookId;
}

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Main download function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Go Mission - Tagalog Bible Downloader');
  console.log('Source: GetBible API (Ang Dating Biblia 1905)');
  console.log('='.repeat(60));
  
  ensureDir(CONFIG.outputDir);
  
  let successCount = 0;
  const totalBooks = Object.keys(BOOK_MAP).length;
  
  console.log(`\n📖 Downloading Tagalog Bible (${totalBooks} books)...\n`);
  
  for (let bookNr = 1; bookNr <= 66; bookNr++) {
    const bookId = BOOK_MAP[bookNr];
    process.stdout.write(`  [${bookNr}/${totalBooks}] ${bookId}... `);
    
    const result = await downloadBook(bookNr);
    
    if (result.success) {
      const outputPath = path.join(CONFIG.outputDir, `${bookId}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
      successCount++;
      console.log(`✓ (${result.chapters} chapters)`);
    } else {
      console.log(`✗ ${result.error}`);
    }
    
    // Small delay to be nice to the API
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\n  ✅ Downloaded ${successCount}/${totalBooks} books`);
  
  // Update index.json
  const index = {
    translation: 'ANG_DATING_BIBLIA_1905',
    name: 'Ang Dating Biblia (1905)',
    language: 'tl',
    languageName: 'Tagalog',
    license: 'Public Domain',
    source: 'GetBible API',
    books: Object.entries(BOOK_MAP).map(([nr, id]) => ({
      id,
      name: fs.existsSync(path.join(CONFIG.outputDir, `${id}.json`))
        ? JSON.parse(fs.readFileSync(path.join(CONFIG.outputDir, `${id}.json`))).name
        : id,
      nameEn: getEnglishName(id)
    }))
  };
  
  fs.writeFileSync(path.join(CONFIG.outputDir, 'index.json'), JSON.stringify(index, null, 2));
  console.log('  ✅ Updated index.json');
  
  console.log('\n' + '='.repeat(60));
  console.log('Download complete!');
  console.log('='.repeat(60));
}

// Run
main().catch(console.error);
