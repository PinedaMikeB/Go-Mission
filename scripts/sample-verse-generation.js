/**
 * Sample: Generate ONE verse to test the output quality
 */

const fs = require('fs');
const path = require('path');

// Set OPENAI_API_KEY environment variable before running
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_API_KEY_HERE';
const MODEL = 'gpt-4o-mini';

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

async function generateSampleVerse() {
  // Sample: Romans 9:1
  const verseText = "I speak the truth in Christ—I am not lying, my conscience confirms it through the Holy Spirit—";
  
  const englishInsight = {
    understanding: "In Romans 9:1, the Apostle Paul is expressing a profound truth about his commitment to honesty and the weight of his message regarding the salvation of Israel. During Paul's time, many Jews were struggling to accept Jesus as the Messiah, leading to questions about God's faithfulness to His promises. Paul emphasizes that his declaration is rooted in truth, affirmed by his conscience guided by the Holy Spirit. This indicates a deep personal conviction; he is not merely stating facts but sharing a heartfelt burden for his people.",
    livingItOut: "Living out the truth of Romans 9:1 involves embracing honesty in our own lives. Just as Paul stood firm in his convictions, we too are called to speak truthfully, especially about our faith and the promises of God. This could mean having open conversations with friends or family who may not share our beliefs, sharing our experiences of God's faithfulness in our lives.",
    godsLove: "Romans 9:1 reveals the depth of God's love for His people, as seen through Paul's anguish for the Jews who have yet to accept Christ. God's heart is for His children, and His desire is for all to come to salvation—this is a fundamental aspect of His character.",
    reflection: "In what areas of your life is God inviting you to speak truthfully about your faith, even when it feels challenging?"
  };

  const systemPrompt = `You are a Filipino Christian Bible teacher and translator. Your task is to create TAGALOG Quick Insights for Bible verses. 

The insights should be:
- Written in natural, conversational Filipino (Tagalog)
- Warm, encouraging, and relatable to everyday Filipino life
- Detailed and verbose (2-3 paragraphs each section)
- Theologically accurate but accessible to new believers
- Include Filipino cultural references where appropriate

Generate ONLY the Tagalog translation. Output must be valid JSON with this exact structure:
{
  "understanding": "Detailed explanation in Tagalog...",
  "livingItOut": "Practical application in Tagalog...",
  "godsLove": "How this reveals God's love in Tagalog...",
  "reflection": "A reflection question in Tagalog..."
}`;

  const userPrompt = `Generate Tagalog Quick Insights for:

Book: Romans
Chapter: 9
Verse: 1

English Bible Text:
"${verseText}"

English Insight (for reference):
- Understanding: ${englishInsight.understanding}
- Living It Out: ${englishInsight.livingItOut}
- God's Love: ${englishInsight.godsLove}
- Reflection: ${englishInsight.reflection}

Now create the TAGALOG version. Make it detailed, warm, and culturally relevant to Filipinos. Output valid JSON only.`;

  console.log('='.repeat(70));
  console.log('SAMPLE GENERATION: Romans 9:1 Tagalog Quick Insight');
  console.log('Using GPT-4o-mini');
  console.log('='.repeat(70));
  console.log('\nVerse Text (EN):');
  console.log(`"${verseText}"\n`);
  console.log('Generating Tagalog insight...\n');

  const response = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], 2000);

  // Parse and display
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  
  const tagalogInsight = JSON.parse(cleaned.trim());

  console.log('='.repeat(70));
  console.log('GENERATED TAGALOG INSIGHT:');
  console.log('='.repeat(70));
  
  console.log('\n📖 PAG-UNAWA (Understanding):');
  console.log('-'.repeat(50));
  console.log(tagalogInsight.understanding);
  
  console.log('\n🚶 ISABUHAY (Living It Out):');
  console.log('-'.repeat(50));
  console.log(tagalogInsight.livingItOut);
  
  console.log('\n❤️ PAG-IBIG NG DIYOS (God\'s Love):');
  console.log('-'.repeat(50));
  console.log(tagalogInsight.godsLove);
  
  console.log('\n💭 PAGNINILAY (Reflection):');
  console.log('-'.repeat(50));
  console.log(tagalogInsight.reflection);
  
  console.log('\n' + '='.repeat(70));
  console.log('RAW JSON OUTPUT:');
  console.log('='.repeat(70));
  console.log(JSON.stringify(tagalogInsight, null, 2));
}

generateSampleVerse().catch(console.error);
