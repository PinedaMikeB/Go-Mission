/**
 * Generate the 5 remaining missing Tagalog verses for Romans
 */

const fs = require('fs');
const path = require('path');

// Set OPENAI_API_KEY environment variable before running
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_API_KEY_HERE';
const MODEL = 'gpt-4o-mini';

const INSIGHTS_PATH = '/Volumes/Wotg Drive Mike/GitHub/Go-Mission/modules/bible/data/quick-insights/ROM.json';
const BIBLE_EN_PATH = '/Volumes/Wotg Drive Mike/GitHub/Go-Mission/modules/bible/data/en/ROM.json';

async function callOpenAI(messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateTagalogInsight(chapter, verseNum, verseText, englishInsight) {
  const systemPrompt = `You are a Filipino Christian Bible teacher. Create TAGALOG Quick Insights for Bible verses. 
Output valid JSON only:
{
  "understanding": "Detailed explanation in Tagalog (2-3 paragraphs)...",
  "livingItOut": "Practical application in Tagalog (2-3 paragraphs)...",
  "godsLove": "How this reveals God's love in Tagalog (2-3 paragraphs)...",
  "reflection": "A reflection question in Tagalog..."
}`;

  const userPrompt = `Generate Tagalog Quick Insights for Romans ${chapter}:${verseNum}

English verse: "${verseText}"

English insight reference:
- Understanding: ${englishInsight.understanding}
- Living It Out: ${englishInsight.livingItOut}
- God's Love: ${englishInsight.godsLove}
- Reflection: ${englishInsight.reflection}

Create warm, detailed TAGALOG version. JSON only.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  
  return JSON.parse(cleaned.trim());
}

async function main() {
  const insights = JSON.parse(fs.readFileSync(INSIGHTS_PATH, 'utf8'));
  const bibleEN = JSON.parse(fs.readFileSync(BIBLE_EN_PATH, 'utf8'));
  
  const missing = [
    { chapter: '2', verse: '29' },
    { chapter: '8', verse: '10' },
    { chapter: '8', verse: '36' },
    { chapter: '12', verse: '5' },
    { chapter: '12', verse: '7' }
  ];
  
  for (const m of missing) {
    const verseInsight = insights.chapters[m.chapter].verses[m.verse];
    const verseText = bibleEN.chapters[m.chapter].verses[m.verse];
    
    console.log(`Generating ${m.chapter}:${m.verse}...`);
    
    try {
      const tl = await generateTagalogInsight(m.chapter, m.verse, verseText, verseInsight.en);
      verseInsight.tl = tl;
      console.log(`  ✓ Done`);
    } catch (e) {
      console.log(`  ✗ Error: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  fs.writeFileSync(INSIGHTS_PATH, JSON.stringify(insights, null, 2));
  console.log('Saved!');
}

main();
