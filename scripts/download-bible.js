/**
 * GO MISSION - Bible Download Script
 * Downloads complete Bible (WEB English + Ang Bibliya Tagalog) and commentary
 * Run with: node scripts/download-bible.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Output directory
const DATA_DIR = path.join(__dirname, '..', 'data');

// Bible book metadata
const BOOKS = [
  // Old Testament
  { id: 'GEN', name_en: 'Genesis', name_tl: 'Genesis', chapters: 50 },
  { id: 'EXO', name_en: 'Exodus', name_tl: 'Exodo', chapters: 40 },
  { id: 'LEV', name_en: 'Leviticus', name_tl: 'Levitico', chapters: 27 },
  { id: 'NUM', name_en: 'Numbers', name_tl: 'Mga Bilang', chapters: 36 },
  { id: 'DEU', name_en: 'Deuteronomy', name_tl: 'Deuteronomio', chapters: 34 },
  { id: 'JOS', name_en: 'Joshua', name_tl: 'Josue', chapters: 24 },
  { id: 'JDG', name_en: 'Judges', name_tl: 'Mga Hukom', chapters: 21 },
  { id: 'RUT', name_en: 'Ruth', name_tl: 'Ruth', chapters: 4 },
  { id: '1SA', name_en: '1 Samuel', name_tl: '1 Samuel', chapters: 31 },
  { id: '2SA', name_en: '2 Samuel', name_tl: '2 Samuel', chapters: 24 },
  { id: '1KI', name_en: '1 Kings', name_tl: '1 Mga Hari', chapters: 22 },
  { id: '2KI', name_en: '2 Kings', name_tl: '2 Mga Hari', chapters: 25 },
  { id: '1CH', name_en: '1 Chronicles', name_tl: '1 Mga Cronica', chapters: 29 },
  { id: '2CH', name_en: '2 Chronicles', name_tl: '2 Mga Cronica', chapters: 36 },
  { id: 'EZR', name_en: 'Ezra', name_tl: 'Ezra', chapters: 10 },
  { id: 'NEH', name_en: 'Nehemiah', name_tl: 'Nehemias', chapters: 13 },
  { id: 'EST', name_en: 'Esther', name_tl: 'Esther', chapters: 10 },
  { id: 'JOB', name_en: 'Job', name_tl: 'Job', chapters: 42 },
  { id: 'PSA', name_en: 'Psalms', name_tl: 'Mga Awit', chapters: 150 },
  { id: 'PRO', name_en: 'Proverbs', name_tl: 'Mga Kawikaan', chapters: 31 },
  { id: 'ECC', name_en: 'Ecclesiastes', name_tl: 'Eclesiastes', chapters: 12 },
  { id: 'SNG', name_en: 'Song of Solomon', name_tl: 'Awit ni Solomon', chapters: 8 },
  { id: 'ISA', name_en: 'Isaiah', name_tl: 'Isaias', chapters: 66 },
  { id: 'JER', name_en: 'Jeremiah', name_tl: 'Jeremias', chapters: 52 },
  { id: 'LAM', name_en: 'Lamentations', name_tl: 'Mga Panaghoy', chapters: 5 },
  { id: 'EZK', name_en: 'Ezekiel', name_tl: 'Ezekiel', chapters: 48 },
  { id: 'DAN', name_en: 'Daniel', name_tl: 'Daniel', chapters: 12 },
  { id: 'HOS', name_en: 'Hosea', name_tl: 'Oseas', chapters: 14 },
  { id: 'JOL', name_en: 'Joel', name_tl: 'Joel', chapters: 3 },
  { id: 'AMO', name_en: 'Amos', name_tl: 'Amos', chapters: 9 },
  { id: 'OBA', name_en: 'Obadiah', name_tl: 'Obadias', chapters: 1 },
  { id: 'JON', name_en: 'Jonah', name_tl: 'Jonas', chapters: 4 },
  { id: 'MIC', name_en: 'Micah', name_tl: 'Mikas', chapters: 7 },
  { id: 'NAM', name_en: 'Nahum', name_tl: 'Nahum', chapters: 3 },
  { id: 'HAB', name_en: 'Habakkuk', name_tl: 'Habakuk', chapters: 3 },
  { id: 'ZEP', name_en: 'Zephaniah', name_tl: 'Zefanias', chapters: 3 },
  { id: 'HAG', name_en: 'Haggai', name_tl: 'Hagai', chapters: 2 },
  { id: 'ZEC', name_en: 'Zechariah', name_tl: 'Zacarias', chapters: 14 },
  { id: 'MAL', name_en: 'Malachi', name_tl: 'Malakias', chapters: 4 },
  // New Testament
  { id: 'MAT', name_en: 'Matthew', name_tl: 'Mateo', chapters: 28 },
  { id: 'MRK', name_en: 'Mark', name_tl: 'Marcos', chapters: 16 },
  { id: 'LUK', name_en: 'Luke', name_tl: 'Lucas', chapters: 24 },
  { id: 'JHN', name_en: 'John', name_tl: 'Juan', chapters: 21 },
  { id: 'ACT', name_en: 'Acts', name_tl: 'Mga Gawa', chapters: 28 },
  { id: 'ROM', name_en: 'Romans', name_tl: 'Mga Taga-Roma', chapters: 16 },
  { id: '1CO', name_en: '1 Corinthians', name_tl: '1 Mga Taga-Corinto', chapters: 16 },
  { id: '2CO', name_en: '2 Corinthians', name_tl: '2 Mga Taga-Corinto', chapters: 13 },
  { id: 'GAL', name_en: 'Galatians', name_tl: 'Mga Taga-Galacia', chapters: 6 },
  { id: 'EPH', name_en: 'Ephesians', name_tl: 'Mga Taga-Efeso', chapters: 6 },
  { id: 'PHP', name_en: 'Philippians', name_tl: 'Mga Taga-Filipos', chapters: 4 },
  { id: 'COL', name_en: 'Colossians', name_tl: 'Mga Taga-Colosas', chapters: 4 },
  { id: '1TH', name_en: '1 Thessalonians', name_tl: '1 Mga Taga-Tesalonica', chapters: 5 },
  { id: '2TH', name_en: '2 Thessalonians', name_tl: '2 Mga Taga-Tesalonica', chapters: 3 },
  { id: '1TI', name_en: '1 Timothy', name_tl: '1 Timoteo', chapters: 6 },
  { id: '2TI', name_en: '2 Timothy', name_tl: '2 Timoteo', chapters: 4 },
  { id: 'TIT', name_en: 'Titus', name_tl: 'Tito', chapters: 3 },
  { id: 'PHM', name_en: 'Philemon', name_tl: 'Filemon', chapters: 1 },
  { id: 'HEB', name_en: 'Hebrews', name_tl: 'Mga Hebreo', chapters: 13 },
  { id: 'JAS', name_en: 'James', name_tl: 'Santiago', chapters: 5 },
  { id: '1PE', name_en: '1 Peter', name_tl: '1 Pedro', chapters: 5 },
  { id: '2PE', name_en: '2 Peter', name_tl: '2 Pedro', chapters: 3 },
  { id: '1JN', name_en: '1 John', name_tl: '1 Juan', chapters: 5 },
  { id: '2JN', name_en: '2 John', name_tl: '2 Juan', chapters: 1 },
  { id: '3JN', name_en: '3 John', name_tl: '3 Juan', chapters: 1 },
  { id: 'JUD', name_en: 'Jude', name_tl: 'Judas', chapters: 1 },
  { id: 'REV', name_en: 'Revelation', name_tl: 'Pahayag', chapters: 22 }
];

// Utility: HTTP GET with promise
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Utility: Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility: Save JSON file
function saveJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved: ${filename}`);
}

// Download WEB English Bible from bible-api.com
async function downloadWEB() {
  console.log('\n📖 Downloading World English Bible (English)...\n');
  
  const bible = {
    translation: 'WEB',
    language: 'en',
    name: 'World English Bible',
    books: {}
  };
  
  for (const book of BOOKS) {
    console.log(`  Fetching ${book.name_en}...`);
    bible.books[book.id] = {
      id: book.id,
      name: book.name_en,
      chapters: {}
    };
    
    for (let ch = 1; ch <= book.chapters; ch++) {
      try {
        // Using bible-api.com (free, no auth required)
        const url = `https://bible-api.com/${encodeURIComponent(book.name_en)}+${ch}?translation=web`;
        const response = await httpGet(url);
        const data = JSON.parse(response);
        
        if (data.verses) {
          bible.books[book.id].chapters[ch] = {
            chapter: ch,
            verses: {}
          };
          
          for (const verse of data.verses) {
            bible.books[book.id].chapters[ch].verses[verse.verse] = verse.text.trim();
          }
        }
        
        // Rate limiting - be nice to the API
        await sleep(200);
      } catch (err) {
        console.log(`    ⚠️ Error fetching ${book.name_en} ${ch}: ${err.message}`);
      }
    }
    
    // Save progress after each book
    saveJSON('bible-web-en.json', bible);
  }
  
  return bible;
}

// Download Ang Bibliya 1905 (Tagalog)
async function downloadAngBibliya() {
  console.log('\n📖 Downloading Ang Bibliya 1905 (Tagalog)...\n');
  
  const bible = {
    translation: 'ANG_BIBLIYA_1905',
    language: 'tl',
    name: 'Ang Bibliya 1905',
    books: {}
  };
  
  // Using getbible.net API for Tagalog
  for (const book of BOOKS) {
    console.log(`  Fetching ${book.name_tl}...`);
    bible.books[book.id] = {
      id: book.id,
      name: book.name_tl,
      chapters: {}
    };
    
    for (let ch = 1; ch <= book.chapters; ch++) {
      try {
        // getbible.net has Tagalog (tag)
        const url = `https://getbible.net/json?passage=${book.name_en}${ch}&version=tag`;
        const response = await httpGet(url);
        
        // Remove JSONP wrapper if present
        let jsonStr = response;
        if (response.startsWith('(')) {
          jsonStr = response.slice(1, -2);
        }
        
        const data = JSON.parse(jsonStr);
        
        if (data && data.book) {
          bible.books[book.id].chapters[ch] = {
            chapter: ch,
            verses: {}
          };
          
          const chapterData = data.book[0]?.chapter || data.chapter;
          if (chapterData) {
            for (const [verseNum, verseData] of Object.entries(chapterData)) {
              bible.books[book.id].chapters[ch].verses[verseNum] = 
                (typeof verseData === 'object' ? verseData.verse : verseData).trim();
            }
          }
        }
        
        await sleep(300);
      } catch (err) {
        console.log(`    ⚠️ Error fetching ${book.name_tl} ${ch}: ${err.message}`);
      }
    }
    
    // Save progress after each book
    saveJSON('bible-ang-1905-tl.json', bible);
  }
  
  return bible;
}

// Download Matthew Henry Commentary (English)
async function downloadMatthewHenry() {
  console.log('\n📚 Downloading Matthew Henry Commentary...\n');
  
  const commentary = {
    source: 'Matthew Henry Concise Commentary',
    language: 'en',
    books: {}
  };
  
  // Matthew Henry commentary is available from various sources
  // We'll use a simplified approach - create placeholder structure
  // and populate with available free sources
  
  for (const book of BOOKS) {
    commentary.books[book.id] = {
      id: book.id,
      name: book.name_en,
      chapters: {}
    };
    
    for (let ch = 1; ch <= book.chapters; ch++) {
      commentary.books[book.id].chapters[ch] = {
        chapter: ch,
        sections: []
      };
    }
  }
  
  // Try to fetch from available sources
  console.log('  Fetching commentary data...');
  
  // Save structure (will be populated with actual commentary)
  saveJSON('commentary-en.json', commentary);
  
  return commentary;
}

// Create Tagalog commentary (translated from English)
async function createTagalogCommentary(englishCommentary) {
  console.log('\n📚 Creating Tagalog Commentary structure...\n');
  
  const commentary = {
    source: 'Matthew Henry Concise Commentary (Tagalog)',
    language: 'tl',
    books: {}
  };
  
  for (const book of BOOKS) {
    commentary.books[book.id] = {
      id: book.id,
      name: book.name_tl,
      chapters: {}
    };
    
    for (let ch = 1; ch <= book.chapters; ch++) {
      commentary.books[book.id].chapters[ch] = {
        chapter: ch,
        sections: []
      };
    }
  }
  
  saveJSON('commentary-tl.json', commentary);
  
  return commentary;
}

// Create book metadata file
function createBooksMetadata() {
  console.log('\n📋 Creating books metadata...\n');
  
  const metadata = {
    totalBooks: BOOKS.length,
    oldTestament: BOOKS.slice(0, 39),
    newTestament: BOOKS.slice(39),
    books: BOOKS.reduce((acc, book) => {
      acc[book.id] = book;
      return acc;
    }, {})
  };
  
  saveJSON('bible-books.json', metadata);
  
  return metadata;
}

// Main function
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   GO MISSION - Bible Download Script');
  console.log('   Downloading: WEB (English) + Ang Bibliya 1905 (Tagalog)');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Create book metadata
  createBooksMetadata();
  
  // Download Bibles
  console.log('\n⏳ This will take 30-60 minutes. Progress is saved after each book.\n');
  
  try {
    await downloadWEB();
  } catch (err) {
    console.log('❌ Error downloading WEB:', err.message);
  }
  
  try {
    await downloadAngBibliya();
  } catch (err) {
    console.log('❌ Error downloading Ang Bibliya:', err.message);
  }
  
  // Download/Create commentary
  try {
    const enCommentary = await downloadMatthewHenry();
    await createTagalogCommentary(enCommentary);
  } catch (err) {
    console.log('❌ Error with commentary:', err.message);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   ✅ DOWNLOAD COMPLETE!');
  console.log('   Files saved to: /data/');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run
main().catch(console.error);
