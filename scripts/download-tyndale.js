/**
 * Download Tyndale Open Study Notes from HelloAO API
 * Free, no rate limits, modern accessible commentary
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG = {
  outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'tyndale'),
  baseUrl: 'https://api.helloao.org/api/c/Tyndale'
};

// Book IDs mapping
const BOOKS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAH', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
];

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}`));
        }
      });
    }).on('error', reject);
  });
}

async function downloadBook(bookId) {
  const url = `${CONFIG.baseUrl}/${bookId}`;
  console.log(`  Fetching ${bookId}...`);
  
  try {
    const data = await fetch(url);
    
    if (!data || !data.chapters) {
      console.log(`    ⚠️ No data for ${bookId}`);
      return null;
    }
    
    const outputFile = path.join(CONFIG.outputDir, `${bookId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    
    const chapterCount = Object.keys(data.chapters).length;
    console.log(`    ✓ ${bookId}: ${chapterCount} chapters`);
    
    return data;
  } catch (error) {
    console.log(`    ✗ ${bookId}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('DOWNLOADING TYNDALE OPEN STUDY NOTES');
  console.log('Source: HelloAO API (free, no rate limits)');
  console.log('='.repeat(60));
  console.log('');
  
  let successCount = 0;
  let failCount = 0;
  
  // Start with John (priority for your app)
  const priorityBooks = ['JHN', 'MAT', 'MRK', 'LUK', 'ACT', 'ROM', 'GEN', 'PSA'];
  const otherBooks = BOOKS.filter(b => !priorityBooks.includes(b));
  const orderedBooks = [...priorityBooks, ...otherBooks];
  
  for (const bookId of orderedBooks) {
    const result = await downloadBook(bookId);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay to be nice to the API
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`✅ DOWNLOAD COMPLETE`);
  console.log(`   Success: ${successCount}/${BOOKS.length}`);
  console.log(`   Failed: ${failCount}/${BOOKS.length}`);
  console.log(`   Output: ${CONFIG.outputDir}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
