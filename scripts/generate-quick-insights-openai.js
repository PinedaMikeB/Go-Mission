/**
 * Go Mission - Quick Insights Generator (OpenAI GPT-4o-mini)
 * 
 * Uses Tyndale Open Study Notes as scholarly base
 * AI (GPT-4o-mini) transforms into warm, practical 4-section format
 * 
 * Usage: OPENAI_API_KEY="your-key" node scripts/generate-quick-insights-openai.js [BOOK]
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CONFIG = {
  bibleDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'en'),
  tyndaleDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'tyndale-json'),
  outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'quick-insights'),
  booksToProcess: process.argv[2] ? [process.argv[2].toUpperCase()] : ['MRK'],
  delayBetweenVerses: 200,
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

const SYSTEM_PROMPT = `You are a warm Bible teacher creating verse insights for Filipino believers.

You will receive:
1. A Bible verse (BSB translation)
2. Tyndale Study Notes (scholarly but accessible commentary)

Your job: Transform the Tyndale note into a simple, warm 4-section insight in BOTH English and Tagalog.

**4 SECTIONS:**

**1. Understanding This Verse** (2-3 sentences)
- Simplify the Tyndale explanation
- Make it easy to understand for regular people
- Keep the key insight but remove scholarly language

**2. Living It Out** (2-3 sentences)
- Practical application for daily life
- Specific, actionable steps
- Relevant to Filipino context

**3. See God's Love** (2-3 sentences)
- How this verse reveals God's love
- Personal and warm tone
- Help reader feel God's care

**4. Reflection Question** (1 question)
- Thought-provoking but not preachy
- Invites personal reflection
- Action-oriented

**TAGALOG STYLE:**
- Use conversational Tagalog (NOT formal)
- Mix Taglish naturally where appropriate
- Sound like a caring Filipino pastor/mentor
- Avoid overly religious/formal language

**OUTPUT FORMAT (JSON only, no markdown):**
{
  "en": {
    "understanding": "...",
    "livingItOut": "...",
    "godsLove": "...",
    "reflection": "..."
  },
  "tl": {
    "understanding": "...",
    "livingItOut": "...",
    "godsLove": "...",
    "reflection": "..."
  }
}`;

// Book name mapping
const BOOK_NAMES = {
  'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers', 'DEU': 'Deuteronomy',
  'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
  'EZR': 'Ezra', 'NEH': 'Nehemiah', 'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms',
  'PRO': 'Proverbs', 'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'ISA': 'Isaiah',
  'JER': 'Jeremiah', 'LAM': 'Lamentations', 'EZK': 'Ezekiel', 'DAN': 'Daniel',
  'HOS': 'Hosea', 'JOL': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadiah', 'JON': 'Jonah',
  'MIC': 'Micah', 'NAM': 'Nahum', 'HAB': 'Habakkuk', 'ZEP': 'Zephaniah', 'HAG': 'Haggai',
  'ZEC': 'Zechariah', 'MAL': 'Malachi', 'MAT': 'Matthew', 'MRK': 'Mark', 'LUK': 'Luke',
  'JHN': 'John', 'ACT': 'Acts', 'ROM': 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians',
  'GAL': 'Galatians', 'EPH': 'Ephesians', 'PHP': 'Philippians', 'COL': 'Colossians',
  '1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy',
  'TIT': 'Titus', 'PHM': 'Philemon', 'HEB': 'Hebrews', 'JAS': 'James', '1PE': '1 Peter',
  '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John', '3JN': '3 John', 'JUD': 'Jude', 'REV': 'Revelation'
};

async function generateInsight(bookId, chapter, verse, verseText, tyndaleNote) {
  const bookName = BOOK_NAMES[bookId] || bookId;
  
  let prompt;
  if (tyndaleNote) {
    prompt = `
VERSE: ${bookName} ${chapter}:${verse}
"${verseText}"

TYNDALE NOTE:
${tyndaleNote}

Generate the 4-section insight in JSON format:`;
  } else {
    // No Tyndale note - generate from verse text alone
    prompt = `
VERSE: ${bookName} ${chapter}:${verse}
"${verseText}"

(No scholarly commentary available - create insight based on the verse itself)

Generate the 4-section insight in JSON format:`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });
    
    const responseText = response.choices[0].message.content;
    
    // Clean up response
    let cleaned = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    return {
      insight: JSON.parse(cleaned),
      usage: response.usage
    };
  } catch (error) {
    console.error(`\n    ❌ Error on ${chapter}:${verse}: ${error.message}`);
    return null;
  }
}

// Tyndale file name mapping (some files have different naming)
const TYNDALE_FILE_MAP = {
  '1SA': 'SA1',  // 1 Samuel is SA1.json in Tyndale
};

async function processBook(bookId) {
  const bookName = BOOK_NAMES[bookId] || bookId;
  console.log(`\n📖 Processing ${bookName}...`);
  
  // Load Bible and Tyndale data
  const biblePath = path.join(CONFIG.bibleDir, `${bookId}.json`);
  const tyndaleFileId = TYNDALE_FILE_MAP[bookId] || bookId;
  const tyndalePath = path.join(CONFIG.tyndaleDir, `${tyndaleFileId}.json`);
  const outputPath = path.join(CONFIG.outputDir, `${bookId}.json`);
  
  if (!fs.existsSync(biblePath)) {
    console.log(`  ❌ Bible file not found: ${biblePath}`);
    return;
  }
  
  if (!fs.existsSync(tyndalePath)) {
    console.log(`  ❌ Tyndale file not found: ${tyndalePath}`);
    return;
  }
  
  const bible = JSON.parse(fs.readFileSync(biblePath, 'utf8'));
  const tyndale = JSON.parse(fs.readFileSync(tyndalePath, 'utf8'));
  
  // Load existing progress or create new
  let output;
  if (fs.existsSync(outputPath)) {
    output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    console.log(`  📂 Resuming from existing progress...`);
  } else {
    output = {
      id: bookId,
      name: bookName,
      type: 'quick-insights-openai-gpt4omini',
      generatedAt: new Date().toISOString(),
      chapters: {}
    };
  }
  
  // Count total verses
  let totalVerses = 0;
  for (const ch of Object.keys(bible.chapters)) {
    totalVerses += Object.keys(bible.chapters[ch].verses).length;
  }
  console.log(`  📊 Total verses: ${totalVerses}`);
  
  let generated = 0;
  let skipped = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  // Process each chapter
  for (const [chapter, chapterData] of Object.entries(bible.chapters)) {
    process.stdout.write(`\n  📖 Chapter ${chapter}:\n`);
    
    if (!output.chapters[chapter]) {
      output.chapters[chapter] = { verses: {} };
    }
    
    const tyndaleChapter = tyndale.chapters?.[chapter] || null;
    if (!tyndaleChapter) {
      process.stdout.write(`  ⚠️ No Tyndale data for chapter ${chapter} - using verse text only\n`);
    }
    
    for (const [verse, verseText] of Object.entries(chapterData.verses)) {
      // Skip if already generated
      if (output.chapters[chapter].verses[verse]) {
        process.stdout.write('·');
        continue;
      }
      
      const tyndaleNote = tyndaleChapter?.verses?.[verse] || null;
      
      const result = await generateInsight(bookId, chapter, verse, verseText, tyndaleNote);
      
      if (result) {
        output.chapters[chapter].verses[verse] = result.insight;
        totalInputTokens += result.usage.prompt_tokens;
        totalOutputTokens += result.usage.completion_tokens;
        generated++;
        process.stdout.write('✓');
        
        // Save progress every 10 verses
        if (generated % 10 === 0) {
          fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        }
      } else {
        process.stdout.write('✗');
      }
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, CONFIG.delayBetweenVerses));
    }
    
    process.stdout.write(` (${Object.keys(chapterData.verses).length} verses)`);
  }
  
  // Final save
  output.generatedAt = new Date().toISOString();
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  // Calculate cost
  const inputCost = (totalInputTokens / 1000000) * 0.15;
  const outputCost = (totalOutputTokens / 1000000) * 0.60;
  const totalCost = inputCost + outputCost;
  
  console.log(`\n\n✅ ${bookName} complete!`);
  console.log(`   📊 Generated: ${generated} verses`);
  console.log(`   ⏭️  Skipped (no Tyndale): ${skipped} verses`);
  console.log(`   📝 Tokens - Input: ${totalInputTokens}, Output: ${totalOutputTokens}`);
  console.log(`   💰 Cost: $${totalCost.toFixed(4)}`);
  console.log(`   💾 Saved to: ${outputPath}`);
}

async function main() {
  console.log('============================================================');
  console.log('🚀 Go Mission - Quick Insights Generator');
  console.log('   Style: Tyndale + AI Hybrid (4-section format)');
  console.log('   Model: GPT-4o-mini');
  console.log('============================================================');
  console.log(`\n📚 Books to process: ${CONFIG.booksToProcess.join(', ')}`);
  
  for (const bookId of CONFIG.booksToProcess) {
    await processBook(bookId);
  }
  
  console.log('\n============================================================');
  console.log('🎉 All books processed!');
  console.log('============================================================');
}

main();
