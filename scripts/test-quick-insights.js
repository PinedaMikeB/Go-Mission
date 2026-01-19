/**
 * Quick Insights - HYBRID TEST
 * Uses Tyndale Study Notes as base + AI enhances to 4-section format
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic();

// Load verse from our Bible data (BSB)
function getVerse(bookId, chapter, verse) {
  const filePath = path.join(__dirname, '..', 'modules', 'bible', 'data', 'en', `${bookId}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    bookName: data.name,
    text: data.chapters[chapter]?.verses[verse] || ''
  };
}

// Load Tyndale commentary
function getTyndaleNote(bookId, chapter, verse) {
  const filePath = path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'tyndale-json', `${bookId}.json`);
  
  if (!fs.existsSync(filePath)) return null;
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const chapterData = data.chapters?.[chapter];
  if (!chapterData) return null;
  
  // Try exact verse first
  if (chapterData.verses[verse]) {
    return chapterData.verses[verse];
  }
  
  // Try to find verse in a range
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

const SYSTEM_PROMPT = `You are a warm Bible teacher creating verse insights for Filipino believers.

You will receive:
1. A Bible verse (BSB translation)
2. Tyndale Study Notes (scholarly but accessible commentary)

Your job: Transform the Tyndale note into a simple, warm 4-section insight in BOTH English and Tagalog.

**4 SECTIONS:**

**1. Understanding This Verse** (2-3 sentences)
- Simplify the Tyndale explanation
- Make it easy to understand for regular people

**2. Living It Out** (2-3 sentences)
- Practical application for daily life
- Be a DOER of the Word, not just a hearer (James 1:22)

**3. See God's Love** (2-3 sentences)
- How does this verse reveal God's heart?
- Encourage the reader with God's goodness

**4. Reflection Question** (1 question only)
- Thoughtful question that invites personal reflection
- Should help them respond to God's Word
- Warm and inviting tone

**GUIDELINES:**
- Write warmly, like talking to a friend
- Simple words (8th grade level)
- Tagalog should be modern/conversational (hindi formal)
- Use Tyndale insights but make them accessible
- Be encouraging, not preachy`;

async function generateInsight(bookName, chapter, verse, verseText, tyndaleNote) {
  const prompt = `VERSE: ${bookName} ${chapter}:${verse}
"${verseText}"

TYNDALE STUDY NOTE:
"${tyndaleNote}"

Based on the Tyndale note above, create a warm 4-section insight:

---ENGLISH---
**1. Understanding This Verse**
[Simplify Tyndale's explanation]

**2. Living It Out**
[Practical application - be a DOER]

**3. See God's Love**
[How this shows God's love]

**4. Reflection Question**
[One thoughtful question]

---TAGALOG---
**1. Unawain ang Talata**
[Simple Tagalog explanation]

**2. Isabuhay Ito**
[Tagalog application]

**3. Makita ang Pag-ibig ng Diyos**
[Tagalog - God's love]

**4. Pagnilayan at Gawin**
[Tagalog reflection question]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

async function runTest() {
  const testVerses = [
    { bookId: 'JHN', chapter: '3', verse: '16' },
    { bookId: 'MAT', chapter: '28', verse: '19' },
    { bookId: 'JHN', chapter: '1', verse: '1' }
  ];

  console.log('='.repeat(60));
  console.log('QUICK INSIGHTS - HYBRID (Tyndale + AI Enhancement)');
  console.log('='.repeat(60));

  for (const v of testVerses) {
    const { bookName, text } = getVerse(v.bookId, v.chapter, v.verse);
    const tyndaleNote = getTyndaleNote(v.bookId, v.chapter, v.verse);
    
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`📖 ${bookName.toUpperCase()} ${v.chapter}:${v.verse}`);
    console.log(`"${text}"`);
    console.log('-'.repeat(60));
    
    if (!tyndaleNote) {
      console.log(`❌ NO TYNDALE NOTE FOUND`);
      console.log(`⛔ SKIPPING - No base commentary available`);
      continue;
    }
    
    console.log(`📚 TYNDALE NOTE (${tyndaleNote.length} chars):`);
    console.log(`"${tyndaleNote.substring(0, 200)}..."`);
    console.log('='.repeat(60));

    try {
      const insight = await generateInsight(bookName, v.chapter, v.verse, text, tyndaleNote);
      console.log('\n' + insight);
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE - Review samples above');
  console.log('='.repeat(60));
}

runTest().catch(console.error);
