/**
 * Test Gemini 2.0 Flash output quality for Quick Insights
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

async function testVerse(book, chapter, verse, verseText, tyndaleNote) {
  console.log(`\n📖 Testing ${book} ${chapter}:${verse}`);
  console.log(`   Verse: "${verseText.substring(0, 80)}..."`);
  console.log(`   Tyndale: "${tyndaleNote.substring(0, 80)}..."`);
  
  const prompt = `
VERSE: ${book} ${chapter}:${verse}
"${verseText}"

TYNDALE NOTE:
${tyndaleNote}

Generate the 4-section insight in JSON format:`;

  try {
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: prompt }
    ]);
    
    const responseText = result.response.text();
    
    // Clean up response
    let cleaned = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleaned);
    
    console.log('\n✅ OUTPUT:');
    console.log('\n--- ENGLISH ---');
    console.log('Understanding:', parsed.en.understanding);
    console.log('Living It Out:', parsed.en.livingItOut);
    console.log("God's Love:", parsed.en.godsLove);
    console.log('Reflection:', parsed.en.reflection);
    
    console.log('\n--- TAGALOG ---');
    console.log('Understanding:', parsed.tl.understanding);
    console.log('Living It Out:', parsed.tl.livingItOut);
    console.log("God's Love:", parsed.tl.godsLove);
    console.log('Reflection:', parsed.tl.reflection);
    
    return parsed;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function main() {
  console.log('============================================================');
  console.log('🧪 Testing Gemini 2.0 Flash for Quick Insights');
  console.log('============================================================');
  
  // Load Matthew data
  const bibleDir = path.join(__dirname, '..', 'modules', 'bible', 'data', 'en');
  const tyndaleDir = path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'tyndale-json');
  
  const bible = JSON.parse(fs.readFileSync(path.join(bibleDir, 'MAT.json'), 'utf8'));
  const tyndale = JSON.parse(fs.readFileSync(path.join(tyndaleDir, 'MAT.json'), 'utf8'));
  
  // Test Matthew 1:1, 1:21, 5:3 (variety of verses)
  const testVerses = [
    { chapter: '1', verse: '1' },
    { chapter: '1', verse: '21' },
    { chapter: '5', verse: '3' },
  ];
  
  for (const tv of testVerses) {
    const verseText = bible.chapters[tv.chapter]?.verses[tv.verse];
    const tyndaleNote = tyndale.chapters[tv.chapter]?.verses[tv.verse];
    
    if (verseText && tyndaleNote) {
      await testVerse('Matthew', tv.chapter, tv.verse, verseText, tyndaleNote);
      await new Promise(r => setTimeout(r, 2000)); // Wait between calls
    } else {
      console.log(`\n⚠️ Missing data for Matthew ${tv.chapter}:${tv.verse}`);
    }
  }
  
  console.log('\n============================================================');
  console.log('🏁 Test complete! Review the output quality above.');
  console.log('============================================================');
}

main();
