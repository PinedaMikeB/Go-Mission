#!/usr/bin/env node
/*
 * Convert a .docx facilitator guide into a simple meeting slide deck JSON.
 * MVP converter:
 * - extracts text via macOS `textutil`
 * - splits by headings and paragraph size
 * - outputs a lightweight deck for the in-meeting local slides panel
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function usage() {
  console.error('Usage: node scripts/convert-docx-to-meeting-slides.js <input.docx> <output.json> [--lang tl|en] [--id deck-id]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();

const inputPath = args[0];
const outputPath = args[1];
let lang = 'tl';
let deckId = path.basename(outputPath, path.extname(outputPath));

for (let i = 2; i < args.length; i += 1) {
  const key = args[i];
  const value = args[i + 1];
  if (key === '--lang' && value) {
    lang = value.toLowerCase() === 'en' ? 'en' : 'tl';
    i += 1;
  } else if (key === '--id' && value) {
    deckId = value;
    i += 1;
  }
}

function decodeXml(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2019;/gi, '’')
    .replace(/&#x201C;/gi, '“')
    .replace(/&#x201D;/gi, '”')
    .replace(/&#xA;/gi, ' ');
}

function extractStructuredParagraphs(docxPath) {
  let xml = '';
  try {
    xml = execFileSync('unzip', ['-p', docxPath, 'word/document.xml'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (_) {
    // Fallback to textutil if unzip is unavailable.
    const raw = execFileSync('textutil', ['-convert', 'txt', '-stdout', docxPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u2028/g, '\n')
      .split('\n')
      .map((line) => ({ style: '', text: line.trim() }))
      .filter((p) => p.text);
  }

  const paragraphs = [];
  const pMatches = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];

  for (const pXml of pMatches) {
    const styleMatch = pXml.match(/<w:pStyle[^>]*w:val="([^"]+)"/);
    const style = styleMatch ? styleMatch[1] : '';
    const brCount = (pXml.match(/<w:br\b/g) || []).length;
    const textRuns = [...pXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => decodeXml(m[1]));
    const text = textRuns.join('');
    const normalized = text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

    if (normalized) {
      paragraphs.push({ style, text: normalized });
    } else if (brCount > 0) {
      paragraphs.push({ style, text: '' });
    }
  }

  return paragraphs;
}

function isMainHeading(text, style = '') {
  return (
    /^Heading1$/i.test(style) ||
    /^Title$/i.test(style) ||
    /^[IVXLCDM]+\.\s+/.test(text) ||
    /^\d+\.\s+/.test(text) ||
    /^Summary:/i.test(text) ||
    /^I Will Commitments/i.test(text) ||
    /^"I Will"/i.test(text)
  );
}

function isSubHeading(text, style = '') {
  return (
    /^Heading2$/i.test(style) ||
    /^Tanong\s*\d+/i.test(text) ||
    /^Sagot/i.test(text) ||
    /^Important Note:/i.test(text) ||
    /^Segue to the Topic:?/i.test(text) ||
    /^Ice Breaker Question:/i.test(text)
  );
}

function splitLongParagraph(text, maxChars = 700) {
  if (text.length <= maxChars) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out = [];
  let chunk = '';
  for (const s of sentences) {
    if (!s) continue;
    if (!chunk) {
      chunk = s;
      continue;
    }
    if ((chunk + ' ' + s).length <= maxChars) {
      chunk += ' ' + s;
    } else {
      out.push(chunk.trim());
      chunk = s;
    }
  }
  if (chunk.trim()) out.push(chunk.trim());
  return out.length ? out : [text];
}

function splitLabelAndContent(text) {
  const m = String(text || '').match(/^([^:]{2,80}):\s*(.+)$/);
  if (!m) return null;
  return {
    label: m[1].trim() + ':',
    content: m[2].trim()
  };
}

function createDeck(paragraphs) {
  const slides = [];

  const title = paragraphs[0]?.text || 'Meeting Guide';
  const meta = [];
  let idx = 1;
  while (idx < paragraphs.length && !isMainHeading(paragraphs[idx].text, paragraphs[idx].style)) {
    meta.push(paragraphs[idx]);
    idx += 1;
  }

  slides.push({
    id: 'slide-1',
    type: 'title',
    kicker: 'Facilitator Guide',
    title,
    subtitle: (meta.find((p) => /^Title:/i.test(p.text)) || {}).text || '',
    paragraphs: meta.filter((p) => !/^Title:/i.test(p.text)).map((p) => p.text)
  });

  let currentSection = null;
  let currentSlideParagraphs = [];
  let currentSlideTitle = null;
  let slideCount = 1;
  const MAX_PARAS = 4;
  const MAX_CHARS = 1200;

  function normalizeHeadingParts(rawTitle, rawKicker) {
    let title = rawTitle || '';
    let kicker = rawKicker || '';

    if (/^Tanong/i.test(title)) {
      kicker = kicker || (currentSection || '');
      if (title.length > 90) {
        title = 'Tanong';
      }
    }

    if (/^Sagot/i.test(title)) {
      kicker = kicker || (currentSection || '');
      title = 'Facilitator Guide';
    }

    if (title.length > 120 && !/^Summary:/i.test(title)) {
      kicker = kicker || (currentSection || '');
      title = currentSection || 'Guide';
    }

    return { title, kicker };
  }

  function pushSlide({ kicker = '', title: slideTitle = '', paragraphs: paras = [] } = {}) {
    const cleaned = paras.filter(Boolean);
    if (!slideTitle && !cleaned.length) return;
    const parts = normalizeHeadingParts(slideTitle, kicker);
    slideCount += 1;
    slides.push({
      id: `slide-${slideCount}`,
      type: 'content',
      kicker: parts.kicker,
      title: parts.title || currentSection || 'Guide',
      subtitle: '',
      paragraphs: cleaned
    });
  }

  function flushCurrent() {
    if (!currentSlideParagraphs.length) return;
    pushSlide({
      kicker: currentSection && currentSlideTitle && currentSlideTitle !== currentSection ? currentSection : '',
      title: currentSlideTitle || currentSection || 'Guide',
      paragraphs: currentSlideParagraphs
    });
    currentSlideParagraphs = [];
    currentSlideTitle = null;
  }

  for (; idx < paragraphs.length; idx += 1) {
    const para = paragraphs[idx];
    const p = para?.text || '';
    const style = para?.style || '';
    if (!p) continue;

    if (isMainHeading(p, style)) {
      flushCurrent();
      currentSection = p;
      currentSlideTitle = p;
      continue;
    }

    if (isSubHeading(p, style)) {
      flushCurrent();
      const labeled = splitLabelAndContent(p);
      if (labeled && labeled.content) {
        // Preserve inline-content headings (e.g., Ice Breaker Question / Sagot).
        currentSlideTitle = labeled.label;
        currentSlideParagraphs.push(labeled.content);
      } else {
        currentSlideTitle = p;
      }
      continue;
    }

    for (const splitPart of splitLongParagraph(p)) {
      const projectedChars = currentSlideParagraphs.join(' ').length + splitPart.length;
      if (currentSlideParagraphs.length >= MAX_PARAS || projectedChars > MAX_CHARS) {
        flushCurrent();
      }
      currentSlideParagraphs.push(splitPart);
    }
  }

  flushCurrent();

  return {
    version: 1,
    id: deckId,
    title: 'Idol of Comfort',
    language: lang,
    source: {
      type: 'docx',
      filename: path.basename(inputPath)
    },
    generatedAt: new Date().toISOString(),
    slides
  };
}

try {
  const paragraphs = extractStructuredParagraphs(inputPath);
  const deck = createDeck(paragraphs);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(deck, null, 2));

  console.log(`Generated ${deck.slides.length} slides -> ${outputPath}`);
} catch (error) {
  console.error('Conversion failed:', error.message || error);
  process.exit(1);
}
