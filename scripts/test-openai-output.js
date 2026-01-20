/**
 * Test GPT-4o-mini output quality for Quick Insights
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });
    
    const elapsed = Date.now() - startTime;
    const responseText = response.choices[0].message.content;
    
    // Show token usage
    console.log(`\n⏱️  Time: ${elapsed}ms`);
    console.log(`📊 Tokens - Input: ${response.usage.prompt_tokens}, Output: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`);
    
    // Calculate cost
    const inputCost = (response.usage.prompt_tokens / 1000000) * 0.15;
    const outputCost = (response.usage.completion_tokens / 1000000) * 0.60;
    console.log(`💰 Cost: $${(inputCost + outputCost).toFixed(6)}`);
    
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
    
    return { parsed, usage: response.usage };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function main() {
  console.log('============================================================');
  console.log('🧪 Testing GPT-4o-mini for Quick Insights');
  console.log('============================================================');
  
  // Load Mark data (shorter book for testing)
  const bibleDir = path.join(__dirname, '..', 'modules', 'bible', 'data', 'en');
  const tyndaleDir = path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'tyndale-json');
  
  const bible = JSON.parse(fs.readFileSync(path.join(bibleDir, 'MRK.json'), 'utf8'));
  const tyndale = JSON.parse(fs.readFileSync(path.join(tyndaleDir, 'MRK.json'), 'utf8'));
  
  // Test Mark 1:1, 1:15, 10:45 (variety of verses)
  const testVerses = [
    { chapter: '1', verse: '1' },
    { chapter: '1', verse: '15' },
    { chapter: '10', verse: '45' },
  ];
  
  let totalInput = 0;
  let totalOutput = 0;
  
  for (const tv of testVerses) {
    const verseText = bible.chapters[tv.chapter]?.verses[tv.verse];
    const tyndaleNote = tyndale.chapters[tv.chapter]?.verses[tv.verse];
    
    if (verseText && tyndaleNote) {
      const result = await testVerse('Mark', tv.chapter, tv.verse, verseText, tyndaleNote);
      if (result) {
        totalInput += result.usage.prompt_tokens;
        totalOutput += result.usage.completion_tokens;
      }
      await new Promise(r => setTimeout(r, 1000)); // Wait between calls
    } else {
      console.log(`\n⚠️ Missing data for Mark ${tv.chapter}:${tv.verse}`);
    }
  }
  
  console.log('\n============================================================');
  console.log('📊 TOTAL USAGE FOR 3 VERSES:');
  console.log(`   Input tokens: ${totalInput}`);
  console.log(`   Output tokens: ${totalOutput}`);
  const totalCost = (totalInput / 1000000 * 0.15) + (totalOutput / 1000000 * 0.60);
  console.log(`   Total cost: $${totalCost.toFixed(6)}`);
  console.log(`\n📈 ESTIMATED FOR MARK (678 verses):`);
  console.log(`   Cost: ~$${(totalCost / 3 * 678).toFixed(2)}`);
  console.log('============================================================');
}

main();
