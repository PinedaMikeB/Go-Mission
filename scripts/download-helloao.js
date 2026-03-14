/**
 * Go Mission - Bible Data Downloader (Fixed)
 * Downloads complete Bible from HelloAO API
 * 
 * Usage: node scripts/download-helloao.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  helloaoBase: 'https://bible.helloao.org/api',
  outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data'),
  
  // Use BSB (Berean Standard Bible) - Public Domain, high quality
  translation: 'BSB',
  translationName: 'Berean Standard Bible'
};

// Book IDs in order
const BOOKS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
];

/**
 * Fetch JSON from URL with proper headers
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GoMission/1.0'
      }
    };
    
    https.get(url, options, (res) => {
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
 * Ensure directory exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Extract verse text from HelloAO content array
 */
function extractVerseText(content) {
  function flattenContent(node) {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) {
      return node
        .map(flattenContent)
        .filter(Boolean)
        .join(' ');
    }
    if (typeof node === 'object') {
      if (typeof node.text === 'string') {
        return node.text;
      }
      if (node.lineBreak) {
        return '\n';
      }
      if (Array.isArray(node.content)) {
        return flattenContent(node.content);
      }
    }
    return '';
  }

  return flattenContent(content)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Download all chapters for a book
 */
async function downloadBook(bookId, outputPath) {
  try {
    // First get book info to know number of chapters
    const booksUrl = `${CONFIG.helloaoBase}/${CONFIG.translation}/books.json`;
    const booksData = await fetchJSON(booksUrl);
    
    const bookInfo = booksData.books.find(b => b.id === bookId);
    if (!bookInfo) {
      throw new Error(`Book ${bookId} not found`);
    }
    
    const numChapters = bookInfo.numberOfChapters;
    
    // Create book structure
    const bookData = {
      id: bookId,
      name: bookInfo.name,
      translation: CONFIG.translation,
      translationName: CONFIG.translationName,
      chapters: {}
    };
    
    // Download each chapter
    for (let chap = 1; chap <= numChapters; chap++) {
      const chapUrl = `${CONFIG.helloaoBase}/${CONFIG.translation}/${bookId}/${chap}.json`;
      
      try {
        const chapData = await fetchJSON(chapUrl);
        
        bookData.chapters[chap] = {
          chapter: chap,
          verses: {}
        };
        
        // Extract verses from content
        if (chapData.chapter && chapData.chapter.content) {
          for (const item of chapData.chapter.content) {
            if (item.type === 'verse' && item.number) {
              const verseText = extractVerseText(item.content);
              bookData.chapters[chap].verses[item.number] = verseText;
            }
          }
        }
        
        // Small delay to be nice to the API
        await new Promise(r => setTimeout(r, 50));
        
      } catch (chapError) {
        console.error(`    Error on chapter ${chap}: ${chapError.message}`);
      }
    }
    
    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(bookData, null, 2));
    return { success: true, chapters: numChapters };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Download commentary for a book
 */
async function downloadCommentary(commentaryId, bookId, outputPath) {
  try {
    // Get book info first
    const booksUrl = `${CONFIG.helloaoBase}/c/${commentaryId}/books.json`;
    const booksData = await fetchJSON(booksUrl);
    
    const bookInfo = booksData.books.find(b => b.id === bookId);
    if (!bookInfo) {
      return { success: false, error: 'Book not in commentary' };
    }
    
    const numChapters = bookInfo.numberOfChapters;
    
    // Create commentary structure
    const commentaryData = {
      id: bookId,
      commentary: commentaryId,
      chapters: {}
    };
    
    // Download each chapter
    for (let chap = 1; chap <= numChapters; chap++) {
      const chapUrl = `${CONFIG.helloaoBase}/c/${commentaryId}/${bookId}/${chap}.json`;
      
      try {
        const chapData = await fetchJSON(chapUrl);
        
        commentaryData.chapters[chap] = { verses: {} };
        
        // Extract verse commentaries
        if (chapData.chapter && chapData.chapter.content) {
          for (const item of chapData.chapter.content) {
            if (item.verseNumber !== undefined) {
              const verseKey = item.verseEnd 
                ? `${item.verseNumber}-${item.verseEnd}` 
                : String(item.verseNumber);
              
              const commentText = extractVerseText(item.content);
              commentaryData.chapters[chap].verses[verseKey] = { en: commentText };
            }
          }
        }
        
        await new Promise(r => setTimeout(r, 50));
        
      } catch (chapError) {
        // Commentary might not have all chapters
      }
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(commentaryData, null, 2));
    return { success: true, chapters: numChapters };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main download function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Go Mission - Bible Data Downloader');
  console.log('='.repeat(60));
  console.log(`Translation: ${CONFIG.translation} (${CONFIG.translationName})`);
  
  // Ensure output directories
  ensureDir(path.join(CONFIG.outputDir, 'en'));
  ensureDir(path.join(CONFIG.outputDir, 'commentary', 'matthew-henry'));
  ensureDir(path.join(CONFIG.outputDir, 'commentary', 'john-gill'));
  
  // Download English Bible
  console.log('\n📖 Downloading English Bible...');
  let successCount = 0;
  
  for (let i = 0; i < BOOKS.length; i++) {
    const bookId = BOOKS[i];
    const outputPath = path.join(CONFIG.outputDir, 'en', `${bookId}.json`);
    
    process.stdout.write(`  [${i + 1}/${BOOKS.length}] ${bookId}... `);
    
    const result = await downloadBook(bookId, outputPath);
    if (result.success) {
      successCount++;
      console.log(`✓ (${result.chapters} chapters)`);
    } else {
      console.log(`✗ ${result.error}`);
    }
  }
  
  console.log(`\n  ✅ Downloaded ${successCount}/${BOOKS.length} books`);
  
  // Download Matthew Henry Commentary
  console.log('\n📚 Downloading Matthew Henry Commentary...');
  successCount = 0;
  
  for (let i = 0; i < BOOKS.length; i++) {
    const bookId = BOOKS[i];
    const outputPath = path.join(CONFIG.outputDir, 'commentary', 'matthew-henry', `${bookId}.json`);
    
    process.stdout.write(`  [${i + 1}/${BOOKS.length}] ${bookId}... `);
    
    const result = await downloadCommentary('matthew-henry', bookId, outputPath);
    if (result.success) {
      successCount++;
      console.log(`✓`);
    } else {
      console.log(`✗`);
    }
  }
  
  console.log(`\n  ✅ Downloaded ${successCount}/${BOOKS.length} books`);
  
  // Download John Gill Commentary
  console.log('\n📚 Downloading John Gill Commentary...');
  successCount = 0;
  
  for (let i = 0; i < BOOKS.length; i++) {
    const bookId = BOOKS[i];
    const outputPath = path.join(CONFIG.outputDir, 'commentary', 'john-gill', `${bookId}.json`);
    
    process.stdout.write(`  [${i + 1}/${BOOKS.length}] ${bookId}... `);
    
    const result = await downloadCommentary('john-gill', bookId, outputPath);
    if (result.success) {
      successCount++;
      console.log(`✓`);
    } else {
      console.log(`✗`);
    }
  }
  
  console.log(`\n  ✅ Downloaded ${successCount}/${BOOKS.length} books`);
  
  console.log('\n' + '='.repeat(60));
  console.log('Download complete!');
  console.log('='.repeat(60));
}

// Run
main().catch(console.error);
