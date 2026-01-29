/**
 * Generate Missing Tagalog Quick Insights for Romans 3-16
 * Uses OpenAI GPT-4o-mini for high-quality bilingual content
 * 
 * Usage: node generate-missing-insights.js
 */

const fs = require('fs');
const path = require('path');

// OpenAI API Configuration
const OPENAI_API_KEY = 'YOUR_API_KEY_HERE';
const MODEL = 'gpt-4o-mini';

// Paths
const INSIGHTS_PATH = path.join(__dirname, '../modules/bible/data/quick-insights/ROM.json');
const BIBLE_EN_PATH = path.join(__dirname, '../modules/bible/data/en/ROM.json');

// Rate limiting
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second between API calls

/**
 * Call OpenAI API
 */
async function callOpenAI(messages, maxTokens = 2000) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Generate Tagalog Quick Insights for a single verse
 */
async function generateTagalogInsight(bookName, chapter, verseNum, verseText, englishInsight) {
  const systemPrompt = `You are a Filipino Christian Bible teacher and translator. Your task is to create TAGALOG Quick Insights for Bible verses. 

The insights should be:
- Written in natural, conversational Filipino (Tagalog)
- Warm, encouraging, and relatable to everyday Filipino life
- Detailed and verbose (2-3 paragraphs each section)
- Theologically accurate but accessible to new believers
- Include Filipino cultural references where appropriate

You will receive:
1. The Bible verse in English
2. The existing English insight as reference

Generate ONLY the Tagalog translation. Output must be valid JSON with this exact structure:
{
  "understanding": "Detailed explanation in Tagalog...",
  "livingItOut": "Practical application in Tagalog...",
  "godsLove": "How this reveals God's love in Tagalog...",
  "reflection": "A reflection question in Tagalog..."
}`;

  const userPrompt = `Generate Tagalog Quick Insights for:

Book: ${bookName}
Chapter: ${chapter}
Verse: ${verseNum}

English Bible Text:
"${verseText}"

English Insight (for reference):
- Understanding: ${englishInsight.understanding}
- Living It Out: ${englishInsight.livingItOut}
- God's Love: ${englishInsight.godsLove}
- Reflection: ${englishInsight.reflection}

Now create the TAGALOG version. Make it detailed, warm, and culturally relevant to Filipinos. Output valid JSON only.`;

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], 2000);

  // Parse JSON from response
  try {
    // Clean up response - remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    
    return JSON.parse(cleaned.trim());
  } catch (e) {
    console.error(`Failed to parse response for ${chapter}:${verseNum}:`, response);
    throw e;
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function - Generate missing Tagalog insights
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Generate Missing Tagalog Quick Insights for Romans 3-16');
  console.log('Using GPT-4o-mini');
  console.log('='.repeat(60));
  
  // Load existing insights
  const insights = JSON.parse(fs.readFileSync(INSIGHTS_PATH, 'utf8'));
  const bibleEN = JSON.parse(fs.readFileSync(BIBLE_EN_PATH, 'utf8'));
  
  // Chapters to process (3-16 have missing TL)
  const chaptersToProcess = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  
  let totalProcessed = 0;
  let totalErrors = 0;
  
  for (const chapter of chaptersToProcess) {
    const chapterData = insights.chapters[chapter.toString()];
    const bibleChapter = bibleEN.chapters[chapter.toString()];
    
    if (!chapterData || !bibleChapter) {
      console.log(`Skipping chapter ${chapter} - not found`);
      continue;
    }
    
    console.log(`\n--- Processing Chapter ${chapter} ---`);
    
    const verseNums = Object.keys(chapterData.verses);
    
    for (const verseNum of verseNums) {
      const verseInsight = chapterData.verses[verseNum];
      const verseText = bibleChapter.verses[verseNum];
      
      // Check if TL is missing or empty
      if (!verseInsight.tl || !verseInsight.tl.understanding || verseInsight.tl.understanding === '') {
        console.log(`  Generating TL for ${chapter}:${verseNum}...`);
        
        try {
          const tagalogInsight = await generateTagalogInsight(
            'Romans',
            chapter,
            verseNum,
            verseText,
            verseInsight.en
          );
          
          // Update the insight
          verseInsight.tl = tagalogInsight;
          totalProcessed++;
          
          console.log(`    ✓ Generated TL for ${chapter}:${verseNum}`);
          
          // Rate limiting
          await sleep(DELAY_BETWEEN_REQUESTS);
          
          // Save progress every 10 verses
          if (totalProcessed % 10 === 0) {
            fs.writeFileSync(INSIGHTS_PATH, JSON.stringify(insights, null, 2));
            console.log(`    [Saved progress: ${totalProcessed} verses]`);
          }
          
        } catch (error) {
          console.error(`    ✗ Error for ${chapter}:${verseNum}:`, error.message);
          totalErrors++;
        }
      }
    }
  }
  
  // Final save
  fs.writeFileSync(INSIGHTS_PATH, JSON.stringify(insights, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log(`COMPLETE!`);
  console.log(`  Total processed: ${totalProcessed}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log('='.repeat(60));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateTagalogInsight, callOpenAI };
