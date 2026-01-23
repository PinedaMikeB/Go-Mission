/**
 * Test Script - Generate 2 Sample Verses from Exodus
 * Uses GPT-4o-mini to show format before full generation
 */

const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;

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

// Sample verses to test
const SAMPLE_VERSES = [
  {
    book: 'Exodus',
    chapter: 1,
    verse: 17,
    text: 'The midwives, however, feared God and did not do as the king of Egypt had instructed; they let the boys live.',
    tyndale: 'The "midwives . . . refused to obey" the mighty Egyptian king because they feared God more than they feared Pharaoh (1:21). Fear of the Lord (reverent awe of him as the almighty Creator and Judge) is the foundation of true knowledge and of wisdom (Prov 1:7; 9:10). The Lord is a friend to those who fear him (Ps 25:14). The midwives understood that the Lord has more power than any human being.'
  },
  {
    book: 'Exodus',
    chapter: 3,
    verse: 4,
    text: 'When the LORD saw that he had gone over to look, God called out to him from within the bush, "Moses! Moses!" And Moses said, "Here I am."',
    tyndale: '"Moses! Moses!" God knows his people by name, and individuals are important to him.'
  }
];

async function callOpenAI(verse) {
  const prompt = `
VERSE: ${verse.book} ${verse.chapter}:${verse.verse}
"${verse.text}"

TYNDALE NOTE:
${verse.tyndale}

Generate the 4-section insight in JSON format:`;

  const requestBody = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

async function main() {
  console.log('============================================================');
  console.log('🧪 Sample Verse Generation Test (GPT-4o-mini)');
  console.log('============================================================\n');

  for (const verse of SAMPLE_VERSES) {
    console.log(`\n📖 ${verse.book} ${verse.chapter}:${verse.verse}`);
    console.log(`   "${verse.text}"\n`);
    console.log('   Generating insight...\n');

    try {
      const response = await callOpenAI(verse);
      const content = response.choices[0].message.content;
      
      // Clean up response
      let cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const insight = JSON.parse(cleaned);
      
      console.log('   ✅ GENERATED INSIGHT:');
      console.log('   ─────────────────────────────────────────────────────');
      console.log('\n   📚 ENGLISH:');
      console.log(`   Understanding: ${insight.en.understanding}`);
      console.log(`   Living It Out: ${insight.en.livingItOut}`);
      console.log(`   God's Love: ${insight.en.godsLove}`);
      console.log(`   Reflection: ${insight.en.reflection}`);
      
      console.log('\n   🇵🇭 TAGALOG:');
      console.log(`   Understanding: ${insight.tl.understanding}`);
      console.log(`   Living It Out: ${insight.tl.livingItOut}`);
      console.log(`   God's Love: ${insight.tl.godsLove}`);
      console.log(`   Reflection: ${insight.tl.reflection}`);
      
      console.log('\n   📊 Tokens - Input:', response.usage.prompt_tokens, 
                  '| Output:', response.usage.completion_tokens,
                  '| Total:', response.usage.total_tokens);
      
      // Calculate cost
      const inputCost = (response.usage.prompt_tokens / 1000000) * 0.15;
      const outputCost = (response.usage.completion_tokens / 1000000) * 0.60;
      console.log(`   💰 Cost: $${(inputCost + outputCost).toFixed(6)}`);
      
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
    
    console.log('\n   ─────────────────────────────────────────────────────\n');
  }
  
  console.log('============================================================');
  console.log('✅ Sample generation complete!');
  console.log('============================================================');
}

main();
