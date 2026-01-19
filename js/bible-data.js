/**
 * Go Mission - Bible Data & Reading Plan
 * 
 * This file provides:
 * 1. Reading plan for daily devotions
 * 2. Reflection questions (rotating weekly)
 * 3. Helper functions for devotion system
 * 
 * Bible text is loaded from JSON files via BibleLoader module
 * 
 * Data locations:
 * - Bible EN: /modules/bible/data/en/{BOOK}.json
 * - Bible TL: /modules/bible/data/tl/{BOOK}.json  
 * - Commentary EN: /modules/bible/data/commentary/matthew-henry/{BOOK}.json
 * - Commentary TL: /modules/bible/data/commentary/matthew-henry-tl/{BOOK}.json
 */

// ============================================
// READING PLAN - Sequential through Scripture
// ============================================

const readingPlan = {
  // Week 1: Gospel of John - The Word Becomes Flesh
  1: { book: "JHN", chapter: 1, verses: "1-14", title: { en: "The Word Became Flesh", tl: "Ang Salita ay Nagkatawang-Tao" } },
  2: { book: "JHN", chapter: 1, verses: "15-28", title: { en: "John's Testimony", tl: "Ang Patotoo ni Juan Bautista" } },
  3: { book: "JHN", chapter: 1, verses: "29-42", title: { en: "The Lamb of God", tl: "Ang Cordero ng Dios" } },
  4: { book: "JHN", chapter: 1, verses: "43-51", title: { en: "Jesus Calls Disciples", tl: "Tinawag ni Jesus ang mga Alagad" } },
  5: { book: "JHN", chapter: 2, verses: "1-12", title: { en: "Water to Wine", tl: "Tubig na Naging Alak" } },
  6: { book: "JHN", chapter: 2, verses: "13-25", title: { en: "Cleansing the Temple", tl: "Nilinis ni Jesus ang Templo" } },
  7: { book: "JHN", chapter: 3, verses: "1-15", title: { en: "Born Again", tl: "Ipanganak na Muli" } },
  
  // Week 2: John - God's Love & Light
  8: { book: "JHN", chapter: 3, verses: "16-21", title: { en: "God So Loved the World", tl: "Gayon na Lamang ang Pag-ibig ng Dios" } },
  9: { book: "JHN", chapter: 3, verses: "22-36", title: { en: "John's Final Testimony", tl: "Huling Patotoo ni Juan" } },
  10: { book: "JHN", chapter: 4, verses: "1-15", title: { en: "Woman at the Well", tl: "Ang Babae sa Balon" } },
  11: { book: "JHN", chapter: 4, verses: "16-30", title: { en: "True Worship", tl: "Tunay na Pagsamba" } },
  12: { book: "JHN", chapter: 4, verses: "31-42", title: { en: "Fields Ready for Harvest", tl: "Bukid na Handa sa Ani" } },
  13: { book: "JHN", chapter: 4, verses: "43-54", title: { en: "Healing the Official's Son", tl: "Pagpapagaling sa Anak ng Opisyal" } },
  14: { book: "JHN", chapter: 5, verses: "1-15", title: { en: "Healing at Bethesda", tl: "Pagpapagaling sa Bethesda" } },
  
  // Week 3: John - Jesus the Life-Giver
  15: { book: "JHN", chapter: 5, verses: "16-30", title: { en: "The Authority of the Son", tl: "Ang Kapangyarihan ng Anak" } },
  16: { book: "JHN", chapter: 5, verses: "31-47", title: { en: "Witnesses to Jesus", tl: "Mga Saksi kay Jesus" } },
  17: { book: "JHN", chapter: 6, verses: "1-15", title: { en: "Feeding the 5000", tl: "Pagpapakain sa 5000" } },
  18: { book: "JHN", chapter: 6, verses: "16-29", title: { en: "Walking on Water", tl: "Paglakad sa Tubig" } },
  19: { book: "JHN", chapter: 6, verses: "30-40", title: { en: "Bread of Life", tl: "Tinapay ng Buhay" } },
  20: { book: "JHN", chapter: 6, verses: "41-59", title: { en: "Living Bread", tl: "Buhay na Tinapay" } },
  21: { book: "JHN", chapter: 6, verses: "60-71", title: { en: "Words of Eternal Life", tl: "Mga Salita ng Buhay na Walang Hanggan" } },
  
  // Week 4: John - Jesus Revealed
  22: { book: "JHN", chapter: 7, verses: "1-24", title: { en: "Jesus at the Festival", tl: "Si Jesus sa Pista" } },
  23: { book: "JHN", chapter: 7, verses: "25-52", title: { en: "Division Over Jesus", tl: "Pagkakahati Tungkol kay Jesus" } },
  24: { book: "JHN", chapter: 8, verses: "1-11", title: { en: "The Woman Caught", tl: "Ang Babaeng Nahuli" } },
  25: { book: "JHN", chapter: 8, verses: "12-30", title: { en: "Light of the World", tl: "Ilaw ng Sanlibutan" } },
  26: { book: "JHN", chapter: 8, verses: "31-47", title: { en: "The Truth Sets Free", tl: "Ang Katotohanan ay Nagpapalaya" } },
  27: { book: "JHN", chapter: 8, verses: "48-59", title: { en: "Before Abraham Was, I Am", tl: "Bago Pa Si Abraham, Ako Nga" } },
  28: { book: "JHN", chapter: 9, verses: "1-23", title: { en: "Healing the Blind Man", tl: "Pagpapagaling sa Bulag" } }
  
  // Continue expanding as needed...
};

// ============================================
// REFLECTION QUESTIONS - Rotating Weekly
// ============================================

const reflectionQuestions = {
  primary: {
    en: [
      "What is one thing God is inviting you to live out today?",
      "Because of what you read, what will you do differently today?",
      "How is God asking you to respond to His Word today?",
      "What step of faith or obedience did God impress on your heart today?"
    ],
    tl: [
      "Ano ang isang bagay na inaanyayahan ka ng Dios na isabuhay ngayon?",
      "Dahil sa nabasa mo, ano ang gagawin mong kakaiba ngayon?",
      "Paano ka hinihiling ng Dios na tumugon sa Kanyang Salita ngayon?",
      "Anong hakbang ng pananampalataya o pagsunod ang idiniin ng Dios sa puso mo ngayon?"
    ]
  },
  love: {
    en: [
      "How did God's Word shape how you chose to love today?",
      "How did today's conversation with God change your attitude or actions?",
      "What response would honor God in your situation today?"
    ],
    tl: [
      "Paano hinubog ng Salita ng Dios ang pagpili mong magmahal ngayon?",
      "Paano binago ng usapan mo sa Dios ngayon ang iyong saloobin o gawa?",
      "Anong tugon ang magpaparangal sa Dios sa sitwasyon mo ngayon?"
    ]
  },
  mission: {
    en: [
      "Who is God leading you to serve or encourage because of His Word today?",
      "Is there someone God wants you to walk with or invest in today?",
      "How might your obedience today help someone else follow Jesus?"
    ],
    tl: [
      "Sino ang pinapangunahan ng Dios na paglingkuran o hikayatin dahil sa Salita Niya ngayon?",
      "May taong gusto ng Dios na samahan o pag-ukulan mo ng panahon ngayon?",
      "Paano makakatulong ang pagsunod mo ngayon sa iba na sumunod kay Jesus?"
    ]
  },
  simple: {
    en: [
      "What will you carry with you from God's Word today?",
      "What is one small response you sensed from God today?"
    ],
    tl: [
      "Ano ang dadalhin mo mula sa Salita ng Dios ngayon?",
      "Ano ang isang maliit na tugon na naramdaman mo mula sa Dios ngayon?"
    ]
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get question category for current week
 * Rotates through: primary, love, mission, simple
 */
function getWeekCategory() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  const categories = ['primary', 'love', 'mission', 'simple'];
  return categories[(weekNumber - 1) % 4];
}

/**
 * Get today's reflection question
 * @param {string} lang - 'en' or 'tl' (optional, uses i18n.currentLang)
 * @returns {string}
 */
function getTodaysQuestion(lang = null) {
  const l = lang || (typeof i18n !== 'undefined' ? i18n.getLang() : 'en');
  const category = getWeekCategory();
  const questions = reflectionQuestions[category][l] || reflectionQuestions[category].en;
  const dayOfWeek = new Date().getDay();
  return questions[dayOfWeek % questions.length];
}

/**
 * Get today's reading from the plan
 * @returns {object} { book, chapter, verses, title }
 */
function getTodaysReading() {
  const now = new Date();
  const startDate = new Date('2026-01-19'); // Start date of reading plan
  const daysSinceStart = Math.floor((now - startDate) / 86400000) + 1;
  const totalDays = Object.keys(readingPlan).length;
  const dayIndex = ((daysSinceStart - 1) % totalDays) + 1;
  return readingPlan[dayIndex];
}

/**
 * Get reading title in specified language
 * @param {object} reading - Reading from plan
 * @param {string} lang - 'en' or 'tl'
 * @returns {string}
 */
function getReadingTitle(reading, lang = null) {
  const l = lang || (typeof i18n !== 'undefined' ? i18n.getLang() : 'en');
  if (typeof reading.title === 'object') {
    return reading.title[l] || reading.title.en;
  }
  return reading.title;
}

/**
 * Parse verse range string
 * @param {string} verses - e.g., "1-14" or "16"
 * @returns {object} { start, end }
 */
function parseVerseRange(verses) {
  if (verses.includes('-')) {
    const [start, end] = verses.split('-').map(Number);
    return { start, end };
  }
  const v = parseInt(verses);
  return { start: v, end: v };
}

/**
 * Load Bible passage for devotion using BibleLoader
 * @param {object} reading - Reading from plan
 * @param {string} lang - 'en' or 'tl'
 * @returns {Promise<object>}
 */
async function loadDevotionPassage(reading, lang = null) {
  const l = lang || (typeof i18n !== 'undefined' ? i18n.getLang() : 'en');
  const { start, end } = parseVerseRange(reading.verses);
  
  // Use BibleLoader if available
  if (typeof BibleLoader !== 'undefined') {
    return BibleLoader.getVerses(reading.book, reading.chapter, start, end, l);
  }
  
  // Fallback to inline data (legacy support)
  console.warn('[BibleData] BibleLoader not available, using fallback');
  return null;
}

/**
 * Load commentary for devotion using BibleLoader
 * @param {object} reading - Reading from plan
 * @param {string} lang - 'en' or 'tl'
 * @returns {Promise<object>}
 */
async function loadDevotionCommentary(reading, lang = null) {
  const l = lang || (typeof i18n !== 'undefined' ? i18n.getLang() : 'en');
  const { start, end } = parseVerseRange(reading.verses);
  
  // Use BibleLoader if available
  if (typeof BibleLoader !== 'undefined') {
    return BibleLoader.getCommentary(reading.book, reading.chapter, start, end, l);
  }
  
  // Fallback
  console.warn('[BibleData] BibleLoader not available, using fallback');
  return null;
}

// ============================================
// EXPORTS
// ============================================

window.readingPlan = readingPlan;
window.reflectionQuestions = reflectionQuestions;
window.getWeekCategory = getWeekCategory;
window.getTodaysQuestion = getTodaysQuestion;
window.getTodaysReading = getTodaysReading;
window.getReadingTitle = getReadingTitle;
window.parseVerseRange = parseVerseRange;
window.loadDevotionPassage = loadDevotionPassage;
window.loadDevotionCommentary = loadDevotionCommentary;
