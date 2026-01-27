/**
 * Go Mission - Quick Insights Generator (OpenAI GPT-4o-mini)
 * 
 * Uses Tyndale Open Study Notes as scholarly base
 * GPT-4o-mini transforms into warm, detailed 4-section format
 * 
 * Features:
 * - High verbosity with detailed paragraphs
 * - Resume capability (skips existing verses)
 * - Bilingual output (English + Tagalog)
 * 
 * Usage: OPENAI_API_KEY="your-key" node scripts/generate-quick-insights-openai.js LUK
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
    bibleDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'en'),
    tyndaleDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'commentary', 'tyndale-json'),
    outputDir: path.join(__dirname, '..', 'modules', 'bible', 'data', 'quick-insights'),
    booksToProcess: process.argv[2] ? process.argv[2].toUpperCase().split(',') : ['LUK'],
    delayBetweenVerses: 600,
    model: 'gpt-4o-mini',
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

const SYSTEM_PROMPT = `You are a warm, insightful Bible teacher creating detailed verse-by-verse insights for Filipino believers worldwide.

You will receive:
1. A Bible verse (BSB translation)
2. Tyndale Study Notes (scholarly commentary)

Your task: Create a comprehensive, warm 4-section insight in BOTH English and Tagalog.

**IMPORTANT: Be DETAILED and THOROUGH. Each section should be a full paragraph (4-6 sentences), not just 2-3 sentences.**

**4 SECTIONS:**

**1. Understanding This Verse** (Full paragraph - 4-6 sentences)
- Explain what this verse means in its original context
- Include historical/cultural background when relevant
- Simplify the Tyndale explanation but keep depth
- Help the reader truly grasp the meaning
- Connect to the broader passage if helpful

**2. Living It Out** (Full paragraph - 4-6 sentences)
- Provide rich, practical application for daily life
- Give specific examples of how to apply this truth
- Be a DOER of the Word, not just a hearer (James 1:22)
- Make it personal, actionable, and relevant to modern life
- Include challenges for different life situations (work, family, relationships)

**3. See God's Love** (Full paragraph - 4-6 sentences)
- Deeply explore how this verse reveals God's heart and character
- Connect to God's attributes (mercy, faithfulness, grace, power, etc.)
- Encourage the reader with the richness of God's love
- Show how God pursues, cares for, and values His children
- Make the reader feel loved and valued by God

**4. Reflection Question** (1-2 thoughtful questions)
- Deep, thoughtful question that invites genuine reflection
- Should help them personally respond to God's Word
- May include a follow-up question for deeper thinking
- Warm and inviting tone that draws them closer to God

**GUIDELINES:**
- Write warmly and conversationally, like a caring mentor
- Be DETAILED - each section should be a substantial paragraph
- Simple vocabulary but rich content (accessible to all education levels)
- Tagalog should be modern/conversational (hindi pormal, parang kausap mo kaibigan mo)
- Draw deeply from Tyndale insights but make them accessible
- Be encouraging, hopeful, and life-giving
- Show genuine care for the reader's spiritual growth
- Each insight should feel like a mini-devotional`;

async function callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: CONFIG.model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
        })
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

function getVerse(bookId, chapter, verse) {
    const filePath = path.join(CONFIG.bibleDir, `${bookId}.json`);
    if (!fs.existsSync(filePath)) return null;
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
        bookName: data.name || bookId,
        text: data.chapters?.[chapter]?.verses?.[verse] || ''
    };
}

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
    
    // Try verse ranges
    for (const [range, note] of Object.entries(chapterData.verses)) {
        if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number);
            if (verse >= start && verse <= end) {
                return note;
            }
        }
    }
    
    return null;
}

function parseInsightResponse(text) {
    const sections = {
        en: { understanding: '', livingItOut: '', godsLove: '', reflection: '' },
        tl: { understanding: '', livingItOut: '', godsLove: '', reflection: '' }
    };
    
    // Parse English sections
    const understandingMatch = text.match(/\*\*1\.\s*Understanding[^*]*\*\*\s*([\s\S]*?)(?=\*\*2\.|$)/i);
    const livingMatch = text.match(/\*\*2\.\s*Living[^*]*\*\*\s*([\s\S]*?)(?=\*\*3\.|$)/i);
    const loveMatch = text.match(/\*\*3\.\s*See God'?s Love[^*]*\*\*\s*([\s\S]*?)(?=\*\*4\.|$)/i);
    const reflectionMatch = text.match(/\*\*4\.\s*Reflection[^*]*\*\*\s*([\s\S]*?)(?=\*\*Tagalog|---|\n\n\*\*1\.|$)/i);
    
    if (understandingMatch) sections.en.understanding = understandingMatch[1].trim();
    if (livingMatch) sections.en.livingItOut = livingMatch[1].trim();
    if (loveMatch) sections.en.godsLove = loveMatch[1].trim();
    if (reflectionMatch) sections.en.reflection = reflectionMatch[1].trim();
    
    // Parse Tagalog sections (after "Tagalog" marker or second set)
    const tagalogPart = text.split(/Tagalog|---/i)[1] || text.split(/\n\n\*\*1\./)[1] || '';
    
    const tlUnderstandingMatch = tagalogPart.match(/\*\*1\.\s*[^*]*\*\*\s*([\s\S]*?)(?=\*\*2\.|$)/i);
    const tlLivingMatch = tagalogPart.match(/\*\*2\.\s*[^*]*\*\*\s*([\s\S]*?)(?=\*\*3\.|$)/i);
    const tlLoveMatch = tagalogPart.match(/\*\*3\.\s*[^*]*\*\*\s*([\s\S]*?)(?=\*\*4\.|$)/i);
    const tlReflectionMatch = tagalogPart.match(/\*\*4\.\s*[^*]*\*\*\s*([\s\S]*?)$/i);
    
    if (tlUnderstandingMatch) sections.tl.understanding = tlUnderstandingMatch[1].trim();
    if (tlLivingMatch) sections.tl.livingItOut = tlLivingMatch[1].trim();
    if (tlLoveMatch) sections.tl.godsLove = tlLoveMatch[1].trim();
    if (tlReflectionMatch) sections.tl.reflection = tlReflectionMatch[1].trim();
    
    return sections;
}

async function generateInsight(bookId, chapter, verse, verseData, tyndaleNote) {
    const prompt = `**Verse:** ${verseData.bookName} ${chapter}:${verse}
"${verseData.text}"

**Tyndale Study Note:**
${tyndaleNote || 'No specific study note available for this verse.'}

Please provide a detailed, comprehensive insight for this verse in BOTH English and Tagalog.

Format your response as:

**ENGLISH:**

**1. Understanding This Verse**
[Full paragraph here]

**2. Living It Out**
[Full paragraph here]

**3. See God's Love**
[Full paragraph here]

**4. Reflection Question**
[Question(s) here]

---

**TAGALOG:**

**1. Pag-unawa sa Talatang Ito**
[Buong talata dito]

**2. Isabuhay Ito**
[Buong talata dito]

**3. Makita ang Pag-ibig ng Diyos**
[Buong talata dito]

**4. Pagnilayan**
[Tanong dito]`;

    const response = await callOpenAI(prompt);
    return parseInsightResponse(response);
}

async function processBook(bookId) {
    const bibleFile = path.join(CONFIG.bibleDir, `${bookId}.json`);
    if (!fs.existsSync(bibleFile)) {
        console.log(`❌ Bible file not found: ${bookId}`);
        return;
    }
    
    const bibleData = JSON.parse(fs.readFileSync(bibleFile, 'utf8'));
    const bookName = bibleData.name || bookId;
    
    console.log(`\n📖 Processing ${bookName}...`);
    
    // Load existing progress
    const outputFile = path.join(CONFIG.outputDir, `${bookId}.json`);
    let output = { book: bookId, name: bookName, chapters: {} };
    
    if (fs.existsSync(outputFile)) {
        output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        console.log(`  📂 Resuming from existing progress...`);
    }
    
    const chapters = bibleData.chapters || {};
    const totalVerses = Object.values(chapters).reduce((sum, ch) => sum + Object.keys(ch.verses || {}).length, 0);
    console.log(`  📊 Total verses: ${totalVerses}`);
    
    let generated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const [chapterNum, chapterData] of Object.entries(chapters)) {
        if (!output.chapters[chapterNum]) {
            output.chapters[chapterNum] = { verses: {} };
        }
        
        const verses = chapterData.verses || {};
        process.stdout.write(`  📖 Chapter ${chapterNum}: `);
        
        for (const verseNum of Object.keys(verses)) {
            // Skip if already exists
            if (output.chapters[chapterNum].verses[verseNum]) {
                process.stdout.write('·');
                skipped++;
                continue;
            }
            
            const verseData = getVerse(bookId, chapterNum, verseNum);
            const tyndaleNote = getTyndaleNote(bookId, chapterNum, parseInt(verseNum));
            
            if (!verseData || !verseData.text) {
                process.stdout.write('?');
                continue;
            }
            
            try {
                const insight = await generateInsight(bookId, chapterNum, verseNum, verseData, tyndaleNote);
                output.chapters[chapterNum].verses[verseNum] = insight;
                process.stdout.write('✓');
                generated++;
                
                // Save after each verse
                fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
                
                // Delay to avoid rate limits
                await new Promise(r => setTimeout(r, CONFIG.delayBetweenVerses));
            } catch (error) {
                process.stdout.write('✗');
                errors++;
                console.error(`\n  ❌ Error at ${chapterNum}:${verseNum}: ${error.message}`);
                
                // Wait longer on error (might be rate limit)
                await new Promise(r => setTimeout(r, 5000));
            }
        }
        
        console.log(` (${Object.keys(verses).length} verses)`);
    }
    
    console.log(`\n✅ ${bookName} complete!`);
    console.log(`   📊 Generated: ${generated}, Skipped: ${skipped}, Errors: ${errors}`);
    console.log(`   💾 Saved to: ${outputFile}`);
}

async function main() {
    console.log('============================================================');
    console.log('🚀 Go Mission - Quick Insights Generator (GPT-4o-mini)');
    console.log('   Style: Tyndale + AI Hybrid (4-section format)');
    console.log('   Model: gpt-4o-mini (High verbosity, detailed paragraphs)');
    console.log('============================================================');
    
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY environment variable not set');
        process.exit(1);
    }
    
    console.log(`\n📚 Books to process: ${CONFIG.booksToProcess.join(', ')}`);
    
    for (const bookId of CONFIG.booksToProcess) {
        await processBook(bookId);
    }
    
    console.log('\n============================================================');
    console.log('🎉 All books processed!');
    console.log('============================================================');
}

main().catch(console.error);
