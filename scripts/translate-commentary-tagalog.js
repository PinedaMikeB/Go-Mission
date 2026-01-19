/**
 * Go Mission - Commentary Tagalog Translation Script
 * Translates Matthew Henry Commentary to Simple Modern Tagalog
 * 
 * Usage: ANTHROPIC_API_KEY=your_key node scripts/translate-commentary-tagalog.js
 * 
 * Translation Style:
 * - Simple, conversational Tagalog (hindi formal/literary)
 * - Modern everyday words (hindi archaic church Tagalog)
 * - Short sentences (madaling basahin sa mobile)
 * - Taglish where natural (parang normal na usapan)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG = {
  inputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'matthew-henry'),
  outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'matthew-henry-tl'),
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  batchSize: 5 // verses per API call to reduce costs
};

const SYSTEM_PROMPT = `You are a Bible commentary translator. Translate English commentary to SIMPLE, MODERN Tagalog.

RULES:
1. Use everyday conversational Tagalog - parang nagkukwento sa kaibigan
2. Avoid deep/archaic church words like "kapahayagan", "kabanalan" - use simple equivalents
3. Keep sentences SHORT - max 15-20 words each
4. Use Taglish naturally where Filipinos normally would (e.g., "important", "spiritual", "relationship")
5. Make it EASY to understand for someone new to the Bible
6. Preserve the meaning but simplify complex theological concepts
7. Use "ikaw/mo" not "kayo/ninyo" for personal feel

EXAMPLE:
English: "The evangelist begins with the divine nature of Christ, establishing that the Word was with God from eternity."
Bad: "Ang ebanghelista ay nagsimula sa banal na kalikasan ni Kristo, na itinatag na ang Salita ay sumasa Diyos mula pa sa walang hanggan."
Good: "Si Juan, ang sumulat nito, diretso agad sa pinaka-importanteng punto: si Jesus ay Diyos. Hindi lang siya propeta o guro - siya mismo ang Diyos, kasama ng Ama mula pa noong simula."

Return ONLY the Tagalog translation, no explanations.`;

async function callClaudeAPI(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Translate this Bible commentary to simple modern Tagalog:\n\n${text}` }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.content && response.content[0]) {
            resolve(response.content[0].text);
          } else if (response.error) {
            reject(new Error(response.error.message));
          } else {
            reject(new Error('Unexpected response format'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function translateBook(bookId) {
  const inputPath = path.join(CONFIG.inputDir, `${bookId}.json`);
  const outputPath = path.join(CONFIG.outputDir, `${bookId}.json`);
  
  if (!fs.existsSync(inputPath)) {
    return { success: false, error: 'Source file not found' };
  }
  
  // Check if already translated
  if (fs.existsSync(outputPath)) {
    const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    if (existing.translated) {
      return { success: true, skipped: true };
    }
  }
  
  const sourceData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  
  const translatedData = {
    id: bookId,
    name: sourceData.name,
    commentary: 'matthew-henry-tl',
    language: 'tl',
    translated: true,
    chapters: {}
  };
  
  let translatedCount = 0;
  
  for (const [chapNum, chapData] of Object.entries(sourceData.chapters)) {
    translatedData.chapters[chapNum] = { verses: {} };
    
    // Translate introduction if exists
    if (chapData.introduction && chapData.introduction.length > 0) {
      try {
        const tlIntro = await callClaudeAPI(chapData.introduction);
        translatedData.chapters[chapNum].introduction = tlIntro;
        await new Promise(r => setTimeout(r, 1000)); // Rate limiting
      } catch (e) {
        console.log(`    Warning: Could not translate intro for chapter ${chapNum}`);
      }
    }
    
    // Batch translate verses
    const verseEntries = Object.entries(chapData.verses || {});
    
    for (let i = 0; i < verseEntries.length; i += CONFIG.batchSize) {
      const batch = verseEntries.slice(i, i + CONFIG.batchSize);
      
      // Combine verses for batch translation
      const batchText = batch.map(([v, text]) => `[Verse ${v}]\n${text}`).join('\n\n---\n\n');
      
      try {
        const tlBatch = await callClaudeAPI(batchText);
        
        // Parse batch response
        const parts = tlBatch.split(/---|\[Verse \d+\]/i).filter(p => p.trim());
        
        batch.forEach(([verseNum], idx) => {
          if (parts[idx]) {
            translatedData.chapters[chapNum].verses[verseNum] = parts[idx].trim();
            translatedCount++;
          }
        });
        
        await new Promise(r => setTimeout(r, 1500)); // Rate limiting
        
      } catch (e) {
        console.log(`    Warning: Batch translation failed at verse ${batch[0][0]}: ${e.message}`);
      }
    }
    
    // Save progress after each chapter
    fs.writeFileSync(outputPath, JSON.stringify(translatedData, null, 2));
    process.stdout.write('.');
  }
  
  return { success: true, translated: translatedCount };
}

async function main() {
  if (!CONFIG.apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required');
    console.log('Usage: ANTHROPIC_API_KEY=your_key node scripts/translate-commentary-tagalog.js');
    process.exit(1);
  }
  
  console.log('='.repeat(60));
  console.log('Go Mission - Commentary Tagalog Translation');
  console.log('='.repeat(60));
  console.log('Translation style: Simple, modern, conversational Tagalog');
  console.log('');
  
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Get list of books to translate
  const books = fs.readdirSync(CONFIG.inputDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
  
  console.log(`Found ${books.length} books to translate\n`);
  
  let successCount = 0;
  let totalTranslated = 0;
  
  for (let i = 0; i < books.length; i++) {
    const bookId = books[i];
    
    process.stdout.write(`  [${i + 1}/${books.length}] ${bookId} `);
    
    const result = await translateBook(bookId);
    
    if (result.success) {
      successCount++;
      if (result.skipped) {
        console.log(' (already done)');
      } else {
        totalTranslated += result.translated || 0;
        console.log(` ✓ (${result.translated} verses)`);
      }
    } else {
      console.log(` ✗ ${result.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Translated ${successCount}/${books.length} books`);
  console.log(`📝 Total verse translations: ${totalTranslated}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
