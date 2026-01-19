/**
 * Go Mission - Quick Insights Generator
 * Creates verse-by-verse insights in VideoBible style
 * 
 * Format for each verse:
 * 1. Extended Explanation (what the verse means in context)
 * 2. What This Verse Means for Today's Christian (practical application)
 * 3. How This Verse Relates to a Loving God (theological connection)
 * 
 * Usage: ANTHROPIC_API_KEY="your-key" node scripts/generate-quick-insights.js
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic();

const CONFIG = {
  inputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'en'),
  outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'quick-insights'),
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1000,
  // Start with John (your reading plan focus)
  booksToProcess: ['JHN']
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

const SYSTEM_PROMPT = `You are a warm, encouraging Bible teacher creating verse-by-verse insights for Filipino believers. Your style is like VideoBible.com - clear, accessible, and connecting each verse to God's love.

For each verse, provide insights in BOTH English and Tagalog with these 3 sections:

**1. Understanding This Verse** (2-3 sentences)
- What does this verse actually mean?
- Historical/cultural context if relevant
- How does it fit in the larger passage?

**2. Living It Out** (2-3 sentences)
- Practical application for daily life
- How can believers apply this today?
- Make it personal and actionable

**3. See God's Love** (2-3 sentences)
- Connect to God's character and love
- Show how this reveals God's heart
- Encourage the reader with God's goodness

GUIDELINES:
- Write warmly, like talking to a friend
- Simple words (8th grade reading level)
- Tagalog should be modern/conversational (not formal church language)
- Each section should be 2-3 sentences, not more
- Be encouraging, not preachy
- Focus on God's love and grace`;

async function generateInsight(bookName, chapter, verse, verseText, prevVerseContext = '') {
  const prompt = `BOOK: ${bookName}
CHAPTER: ${chapter}
VERSE: ${verse}
TEXT: "${verseText}"
${prevVerseContext ? `CONTEXT (previous verses): ${prevVerseContext}` : ''}

Generate the 3-section insight in this EXACT format:

---ENGLISH---
**1. Understanding This Verse**
[Your explanation here]

**2. Living It Out**
[Your application here]

**3. See God's Love**
[Your connection to God's love here]

---TAGALOG---
**1. Unawain ang Talata**
[Tagalog explanation here]

**2. Isabuhay Ito**
[Tagalog application here]

**3. Makita ang Pag-ibig ng Diyos**
[Tagalog connection to God's love here]`;

  const response = await anthropic.messages.create({
    model: CONFIG.model,
    max_tokens: CONFIG.maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  return parseInsightResponse(response.content[0].text);
}

function parseInsightResponse(text) {
  const result = { en: {}, tl: {} };
  
  // Parse English section
  const enMatch = text.match(/---ENGLISH---\s*([\s\S]*?)(?=---TAGALOG---|$)/i);
  if (enMatch) {
    const enText = enMatch[1];
    result.en.understanding = extractSection(enText, '1. Understanding This Verse', '2.');
    result.en.livingItOut = extractSection(enText, '2. Living It Out', '3.');
    result.en.godsLove = extractSection(enText, '3. See God\'s Love', null);
  }
  
  // Parse Tagalog section
  const tlMatch = text.match(/---TAGALOG---\s*([\s\S]*?)$/i);
  if (tlMatch) {
    const tlText = tlMatch[1];
    result.tl.understanding = extractSection(tlText, '1. Unawain ang Talata', '2.');
    result.tl.livingItOut = extractSection(tlText, '2. Isabuhay Ito', '3.');
    result.tl.godsLove = extractSection(tlText, '3. Makita ang Pag-ibig', null);
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

async function processBook(bookId) {
  const inputFile = path.join(CONFIG.inputDir, `${bookId}.json`);
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Book file not found: ${inputFile}`);
    return;
  }
  
  const bookData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const bookName = bookData.name || bookId;
  const chapters = bookData.chapters;
  
  console.log(`\n📖 Processing ${bookName}...`);
  
  const output = {
    id: bookId,
    name: bookName,
    type: 'quick-insights',
    chapters: {}
  };
  
  // Load existing progress if any
  const outputFile = path.join(CONFIG.outputDir, `${bookId}.json`);
  if (fs.existsSync(outputFile)) {
    const existing = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    output.chapters = existing.chapters || {};
    console.log(`  Resuming from existing progress...`);
  }
  
  for (const [chapterNum, chapterData] of Object.entries(chapters)) {
    // Skip if chapter already done
    if (output.chapters[chapterNum] && Object.keys(output.chapters[chapterNum].verses || {}).length > 0) {
      const doneCount = Object.keys(output.chapters[chapterNum].verses).length;
      const totalCount = Object.keys(chapterData.verses).length;
      if (doneCount >= totalCount) {
        console.log(`  Chapter ${chapterNum}: Already complete (${doneCount} verses)`);
        continue;
      }
    }
    
    console.log(`\n  Chapter ${chapterNum}:`);
    
    if (!output.chapters[chapterNum]) {
      output.chapters[chapterNum] = { verses: {} };
    }
    
    const verses = chapterData.verses;
    const verseNums = Object.keys(verses).map(Number).sort((a, b) => a - b);
    
    let prevContext = '';
    
    for (const verseNum of verseNums) {
      // Skip if verse already done
      if (output.chapters[chapterNum].verses[verseNum]) {
        process.stdout.write('·');
        prevContext = verses[verseNum].substring(0, 100);
        continue;
      }
      
      const verseText = verses[verseNum];
      
      try {
        const insight = await generateInsight(bookName, chapterNum, verseNum, verseText, prevContext);
        output.chapters[chapterNum].verses[verseNum] = insight;
        process.stdout.write('✓');
        
        // Save after each verse (in case of interruption)
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        
        // Update context for next verse
        prevContext = verseText.substring(0, 100);
        
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 300));
        
      } catch (error) {
        console.error(`\n    Error on ${chapterNum}:${verseNum}: ${error.message}`);
        process.stdout.write('✗');
      }
    }
    
    console.log(` (${verseNums.length} verses)`);
  }
  
  // Final save
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`\n✅ ${bookName} complete! Saved to ${outputFile}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Go Mission - Quick Insights Generator');
  console.log('Style: VideoBible.com (3 sections per verse)');
  console.log('Model: Claude Sonnet');
  console.log('='.repeat(60));
  
  for (const bookId of CONFIG.booksToProcess) {
    await processBook(bookId);
  }
  
  console.log('\n🎉 All books processed!');
}

main().catch(console.error);
