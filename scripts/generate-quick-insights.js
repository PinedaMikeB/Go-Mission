/**
 * Go Mission - Quick Insights Generator (Tyndale + AI Hybrid)
 * 
 * Uses Tyndale Open Study Notes as scholarly base
 * AI (Gemini 2.5 Pro) transforms into warm, practical 4-section format
 * 
 * 4 Sections:
 * 1. Understanding This Verse (from Tyndale, simplified)
 * 2. Living It Out (AI-generated application)
 * 3. See God's Love (AI-generated)
 * 4. Reflection Question (AI-generated)
 * 
 * Usage: GEMINI_API_KEY="your-key" node scripts/generate-quick-insights.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const CONFIG = {
  bibleDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'en'),
  tyndaleDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'tyndale-json'),
  outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'quick-insights'),
  // Accept book from command line argument, default to JHN
  booksToProcess: process.argv[2] ? [process.argv[2].toUpperCase()] : ['JHN'],
  delayBetweenVerses: 500,
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
- Be a DOER of the Word, not just a hearer (James 1:22)
- Make it personal and actionable

**3. See God's Love** (2-3 sentences)
- How does this verse reveal God's heart?
- Encourage the reader with God's goodness
- Connect to God's character

**4. Reflection Question** (1 question only)
- Thoughtful question that invites personal reflection
- Should help them respond to God's Word
- Warm and inviting tone

**GUIDELINES:**
- Write warmly, like talking to a friend
- Simple words (8th grade level)
- Tagalog should be modern/conversational (hindi formal na Tagalog)
- Use Tyndale insights but make them accessible
- Be encouraging, not preachy
- Each section should be 2-3 sentences max`;

// Load verse from Bible data (BSB)
function getVerse(bookId, chapter, verse) {
  const filePath = path.join(CONFIG.bibleDir, `${bookId}.json`);
  if (!fs.existsSync(filePath)) return null;
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    bookName: data.name || bookId,
    text: data.chapters?.[chapter]?.verses?.[verse] || ''
  };
}

// Load Tyndale commentary for a verse
function getTyndaleNote(bookId, chapter, verse) {
  const filePath = path.join(CONFIG.tyndaleDir, `${bookId}.json`);
  if (!fs.existsSync(filePath)) return null;
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const chapterData = data.chapters?.[chapter];
  if (!chapterData) return null;
  
  // Try exact verse first
  if (chapterData.verses[verse]) {
    return chapterData.verses[verse];
  }
  
  // Try to find verse in a range (e.g., "1-18" contains verse 5)
  for (const [range, text] of Object.entries(chapterData.verses)) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      if (Number(verse) >= start && Number(verse) <= end) {
        return text;
      }
    }
  }
  
  return null;
}

// Generate insight using Tyndale + Gemini
async function generateInsight(bookName, chapter, verse, verseText, tyndaleNote) {
  const prompt = `${SYSTEM_PROMPT}

VERSE: ${bookName} ${chapter}:${verse}
"${verseText}"

TYNDALE STUDY NOTE:
"${tyndaleNote}"

Based on the Tyndale note above, create a warm 4-section insight:

---ENGLISH---
**1. Understanding This Verse**
[Simplify Tyndale's explanation in 2-3 sentences]

**2. Living It Out**
[Practical application - be a DOER - 2-3 sentences]

**3. See God's Love**
[How this shows God's love - 2-3 sentences]

**4. Reflection Question**
[One thoughtful question]

---TAGALOG---
**1. Unawain ang Talata**
[Simple Tagalog explanation - 2-3 sentences]

**2. Isabuhay Ito**
[Tagalog application - 2-3 sentences]

**3. Makita ang Pag-ibig ng Diyos**
[Tagalog - God's love - 2-3 sentences]

**4. Pagnilayan at Gawin**
[Tagalog reflection question]`;

  const result = await model.generateContent(prompt);
  return parseInsightResponse(result.response.text());
}

// Parse AI response into structured format
function parseInsightResponse(text) {
  const result = { 
    en: {}, 
    tl: {}
  };
  
  // Parse English section
  const enMatch = text.match(/---ENGLISH---\s*([\s\S]*?)(?=---TAGALOG---|$)/i);
  if (enMatch) {
    const enText = enMatch[1];
    result.en.understanding = extractSection(enText, '1. Understanding This Verse', '2.');
    result.en.livingItOut = extractSection(enText, '2. Living It Out', '3.');
    result.en.godsLove = extractSection(enText, "3. See God's Love", '4.');
    result.en.reflection = extractSection(enText, '4. Reflection Question', null);
  }
  
  // Parse Tagalog section
  const tlMatch = text.match(/---TAGALOG---\s*([\s\S]*?)$/i);
  if (tlMatch) {
    const tlText = tlMatch[1];
    result.tl.understanding = extractSection(tlText, '1. Unawain ang Talata', '2.');
    result.tl.livingItOut = extractSection(tlText, '2. Isabuhay Ito', '3.');
    result.tl.godsLove = extractSection(tlText, '3. Makita ang Pag-ibig', '4.');
    result.tl.reflection = extractSection(tlText, '4. Pagnilayan at Gawin', null);
  }
  
  return result;
}

function extractSection(text, startMarker, endMarker) {
  const startPattern = new RegExp(`\\*\\*${startMarker}[^*]*\\*\\*\\s*`, 'i');
  const startMatch = text.match(startPattern);
  if (!startMatch) return '';
  
  const startIndex = startMatch.index + startMatch[0].length;
  let endIndex = text.length;
  
  if (endMarker) {
    const endPattern = new RegExp(`\\*\\*${endMarker}`, 'i');
    const endMatch = text.slice(startIndex).match(endPattern);
    if (endMatch) {
      endIndex = startIndex + endMatch.index;
    }
  }
  
  return text.slice(startIndex, endIndex).trim();
}

// Process a single book
async function processBook(bookId) {
  const inputFile = path.join(CONFIG.bibleDir, `${bookId}.json`);
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Book file not found: ${inputFile}`);
    return;
  }
  
  const bookData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const bookName = bookData.name || bookId;
  const chapters = bookData.chapters;
  
  console.log(`\n📖 Processing ${bookName}...`);
  
  const output = {
    id: bookId,
    name: bookName,
    type: 'quick-insights-tyndale-hybrid',
    generatedAt: new Date().toISOString(),
    chapters: {}
  };
  
  // Load existing progress if any
  const outputFile = path.join(CONFIG.outputDir, `${bookId}.json`);
  if (fs.existsSync(outputFile)) {
    const existing = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    output.chapters = existing.chapters || {};
    console.log(`  📂 Resuming from existing progress...`);
  }
  
  let totalVerses = 0;
  let processedVerses = 0;
  let skippedNoTyndale = 0;
  
  // Count total verses
  for (const [chapterNum, chapterData] of Object.entries(chapters)) {
    totalVerses += Object.keys(chapterData.verses).length;
  }
  
  console.log(`  📊 Total verses: ${totalVerses}`);

  for (const [chapterNum, chapterData] of Object.entries(chapters)) {
    console.log(`\n  📖 Chapter ${chapterNum}:`);
    
    if (!output.chapters[chapterNum]) {
      output.chapters[chapterNum] = { verses: {} };
    }
    
    const verses = chapterData.verses;
    const verseNums = Object.keys(verses).map(Number).sort((a, b) => a - b);
    
    for (const verseNum of verseNums) {
      // Skip if verse already done
      if (output.chapters[chapterNum].verses[verseNum]) {
        process.stdout.write('·');
        processedVerses++;
        continue;
      }
      
      const verseText = verses[verseNum];
      const tyndaleNote = getTyndaleNote(bookId, chapterNum, verseNum.toString());
      
      if (!tyndaleNote) {
        output.chapters[chapterNum].verses[verseNum] = { 
          skipped: true, 
          reason: 'no-tyndale-note' 
        };
        process.stdout.write('○');
        skippedNoTyndale++;
        continue;
      }
      
      try {
        const insight = await generateInsight(
          bookName, 
          chapterNum, 
          verseNum, 
          verseText, 
          tyndaleNote
        );
        output.chapters[chapterNum].verses[verseNum] = insight;
        process.stdout.write('✓');
        processedVerses++;
        
        // Save after each verse
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        
        // Delay to avoid rate limits
        await new Promise(r => setTimeout(r, CONFIG.delayBetweenVerses));
        
      } catch (error) {
        console.error(`\n    ❌ Error on ${chapterNum}:${verseNum}: ${error.message}`);
        process.stdout.write('✗');
      }
    }
    
    console.log(` (${verseNums.length} verses)`);
  }
  
  // Final save
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ ${bookName} complete!`);
  console.log(`   📊 Generated: ${processedVerses} verses`);
  console.log(`   ⏭️  Skipped (no Tyndale): ${skippedNoTyndale} verses`);
  console.log(`   💾 Saved to: ${outputFile}`);
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Go Mission - Quick Insights Generator');
  console.log('   Style: Tyndale + AI Hybrid (4-section format)');
  console.log('   Model: Gemini 2.5 Pro');
  console.log('='.repeat(60));
  
  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('\n❌ Error: GEMINI_API_KEY environment variable not set');
    console.log('\nUsage: GEMINI_API_KEY="your-key" node scripts/generate-quick-insights.js');
    process.exit(1);
  }
  
  console.log(`\n📚 Books to process: ${CONFIG.booksToProcess.join(', ')}`);
  
  for (const bookId of CONFIG.booksToProcess) {
    await processBook(bookId);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 All books processed!');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});
