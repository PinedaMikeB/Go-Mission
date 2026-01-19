/**
 * Go Mission - Tagalog Bible Downloader
 * Downloads Ang Bibliya 1905 from CrossWire SWORD module
 * 
 * Usage: node scripts/download-tagalog.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const CONFIG = {
  swordModuleUrl: 'https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/TagAngBiblia.zip',
  outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'tl'),
  tempDir: path.join(__dirname, '..', 'temp')
};

// Book mappings: SWORD name -> Our ID
const BOOK_MAP = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM',
  'Deuteronomy': 'DEU', 'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT',
  '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
  '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH',
  'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Proverbs': 'PRO',
  'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA', 'Jeremiah': 'JER',
  'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS',
  'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON',
  'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP',
  'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL',
  'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN',
  'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO',
  'Galatians': 'GAL', 'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL',
  '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI',
  'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS',
  '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN',
  '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV'
};

// Tagalog book names
const TAGALOG_NAMES = {
  'GEN': 'Genesis', 'EXO': 'Exodo', 'LEV': 'Levitico', 'NUM': 'Mga Bilang',
  'DEU': 'Deuteronomio', 'JOS': 'Josue', 'JDG': 'Mga Hukom', 'RUT': 'Ruth',
  '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Mga Hari', '2KI': '2 Mga Hari',
  '1CH': '1 Mga Cronica', '2CH': '2 Mga Cronica', 'EZR': 'Ezra', 'NEH': 'Nehemias',
  'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Mga Awit', 'PRO': 'Mga Kawikaan',
  'ECC': 'Mangangaral', 'SNG': 'Awit ni Solomon', 'ISA': 'Isaias', 'JER': 'Jeremias',
  'LAM': 'Mga Panaghoy', 'EZK': 'Ezekiel', 'DAN': 'Daniel', 'HOS': 'Hosea',
  'JOL': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadias', 'JON': 'Jonas',
  'MIC': 'Mikas', 'NAM': 'Nahum', 'HAB': 'Habakkuk', 'ZEP': 'Zefanias',
  'HAG': 'Hagai', 'ZEC': 'Zacarias', 'MAL': 'Malakias',
  'MAT': 'Mateo', 'MRK': 'Marcos', 'LUK': 'Lucas', 'JHN': 'Juan',
  'ACT': 'Mga Gawa', 'ROM': 'Mga Taga-Roma', '1CO': '1 Mga Taga-Corinto', '2CO': '2 Mga Taga-Corinto',
  'GAL': 'Mga Taga-Galacia', 'EPH': 'Mga Taga-Efeso', 'PHP': 'Mga Taga-Filipos', 'COL': 'Mga Taga-Colosas',
  '1TH': '1 Mga Taga-Tesalonica', '2TH': '2 Mga Taga-Tesalonica', '1TI': '1 Timoteo', '2TI': '2 Timoteo',
  'TIT': 'Tito', 'PHM': 'Filemon', 'HEB': 'Mga Hebreo', 'JAS': 'Santiago',
  '1PE': '1 Pedro', '2PE': '2 Pedro', '1JN': '1 Juan', '2JN': '2 Juan',
  '3JN': '3 Juan', 'JUD': 'Judas', 'REV': 'Pahayag'
};

/**
 * Download file from URL
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
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
 * Parse SWORD module text files
 * Note: This is a simplified parser - SWORD modules have complex compression
 * We'll use a different approach - fetch from WordProject which has the same text
 */
async function fetchFromWordProject() {
  const http = require('http');
  const baseUrl = 'http://wordproject.org/bibles/tl';
  
  const books = Object.keys(TAGALOG_NAMES);
  
  for (const bookId of books) {
    const bookData = {
      id: bookId,
      name: TAGALOG_NAMES[bookId],
      nameEn: Object.keys(BOOK_MAP).find(k => BOOK_MAP[k] === bookId),
      translation: 'ANG_BIBLIYA_1905',
      chapters: {}
    };
    
    // TODO: Implement chapter fetching from WordProject
    // This requires HTML parsing which is complex
    
    const outputPath = path.join(CONFIG.outputDir, `${bookId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(bookData, null, 2));
  }
}

/**
 * Alternative: Create book structures with metadata
 * Actual verse data will be fetched from BibleHub or similar API
 */
function createBookStructures() {
  ensureDir(CONFIG.outputDir);
  
  const books = Object.keys(TAGALOG_NAMES);
  
  for (const bookId of books) {
    const bookData = {
      id: bookId,
      name: TAGALOG_NAMES[bookId],
      nameEn: Object.keys(BOOK_MAP).find(k => BOOK_MAP[k] === bookId),
      translation: 'ANG_BIBLIYA_1905',
      language: 'tl',
      chapters: {}
    };
    
    const outputPath = path.join(CONFIG.outputDir, `${bookId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(bookData, null, 2));
    console.log(`Created structure: ${bookId} (${TAGALOG_NAMES[bookId]})`);
  }
  
  console.log(`\nCreated ${books.length} book structure files`);
  console.log('Note: These are empty structures. Use download-from-api.js to fill them.');
}

/**
 * Create index file with all book metadata
 */
function createIndex() {
  const index = {
    translation: 'ANG_BIBLIYA_1905',
    name: 'Ang Bibliya 1905',
    language: 'tl',
    languageName: 'Tagalog',
    license: 'Public Domain',
    books: Object.keys(TAGALOG_NAMES).map(id => ({
      id,
      name: TAGALOG_NAMES[id],
      nameEn: Object.keys(BOOK_MAP).find(k => BOOK_MAP[k] === id)
    }))
  };
  
  const indexPath = path.join(CONFIG.outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log('Created index.json');
}

// Run
console.log('='.repeat(50));
console.log('Go Mission - Tagalog Bible Structure Creator');
console.log('='.repeat(50));

createBookStructures();
createIndex();

console.log('\n' + '='.repeat(50));
console.log('Structure creation complete!');
console.log('='.repeat(50));
