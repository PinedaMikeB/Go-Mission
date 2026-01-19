/**
 * Go Mission - Matthew Henry Commentary Re-Download (Fixed Parsing)
 * Downloads and correctly parses Matthew Henry Commentary
 * 
 * Usage: node scripts/redownload-matthew-henry.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG = {
  helloaoBase: 'https://bible.helloao.org/api',
  outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'matthew-henry')
};

const BOOKS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'GoMission/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Check if it's HTML (404 page)
          if (data.trim().startsWith('<!') || data.trim().startsWith('<html')) {
            reject(new Error('Not found (HTML response)'));
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function extractText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter(item => typeof item === 'string')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function downloadCommentary(bookId) {
  try {
    // Get book info
    const booksUrl = `${CONFIG.helloaoBase}/c/matthew-henry/books.json`;
    const booksData = await fetchJSON(booksUrl);
    
    const bookInfo = booksData.books.find(b => b.id === bookId);
    if (!bookInfo) {
      return { success: false, error: 'Book not in commentary' };
    }
    
    const numChapters = bookInfo.numberOfChapters;
    
    const commentaryData = {
      id: bookId,
      name: bookInfo.name,
      commentary: 'matthew-henry',
      chapters: {}
    };
    
    let verseCount = 0;
    
    for (let chap = 1; chap <= numChapters; chap++) {
      const chapUrl = `${CONFIG.helloaoBase}/c/matthew-henry/${bookId}/${chap}.json`;
      
      try {
        const chapData = await fetchJSON(chapUrl);
        
        commentaryData.chapters[chap] = { 
          introduction: '',
          verses: {} 
        };
        
        // Get chapter introduction if available
        if (chapData.chapter && chapData.chapter.introduction) {
          commentaryData.chapters[chap].introduction = chapData.chapter.introduction.trim();
        }
        
        // Extract verse commentaries - FIXED: check for type="verse" and number field
        if (chapData.chapter && chapData.chapter.content) {
          for (const item of chapData.chapter.content) {
            if (item.type === 'verse' && item.number !== undefined) {
              const text = extractText(item.content);
              if (text) {
                commentaryData.chapters[chap].verses[item.number] = text;
                verseCount++;
              }
            }
          }
        }
        
        await new Promise(r => setTimeout(r, 100)); // Rate limiting
        
      } catch (chapError) {
        // Skip chapters that don't exist
      }
    }
    
    const outputPath = path.join(CONFIG.outputDir, `${bookId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(commentaryData, null, 2));
    
    return { success: true, chapters: numChapters, verses: verseCount };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Go Mission - Matthew Henry Commentary Re-Download');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  let successCount = 0;
  let totalVerses = 0;
  
  for (let i = 0; i < BOOKS.length; i++) {
    const bookId = BOOKS[i];
    
    process.stdout.write(`  [${i + 1}/${BOOKS.length}] ${bookId}... `);
    
    const result = await downloadCommentary(bookId);
    if (result.success) {
      successCount++;
      totalVerses += result.verses;
      console.log(`✓ (${result.chapters} ch, ${result.verses} verses)`);
    } else {
      console.log(`✗ ${result.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Downloaded ${successCount}/${BOOKS.length} books`);
  console.log(`📝 Total verse commentaries: ${totalVerses}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
