#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'modules', 'bible', 'data', 'quick-insights');
const TARGET_DIR = path.join(ROOT, 'modules', 'bible', 'data-inline', 'quick-insights');

const args = process.argv.slice(2);
const positional = args.find((arg) => !arg.startsWith('--'));

function getBooks() {
  if (positional && positional.toUpperCase() !== 'ALL') {
    return positional.split(',').map((book) => book.trim().toUpperCase()).filter(Boolean);
  }

  return fs.readdirSync(SOURCE_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.basename(file, '.json'))
    .sort();
}

function buildInlineSource(bookId, payload) {
  return [
    `/* Auto-generated inline Quick Insights (${bookId}) */`,
    '(function(){',
    '  window.GoMissionQuickInsightsInline = window.GoMissionQuickInsightsInline || {};',
    `  window.GoMissionQuickInsightsInline['${bookId}'] = ${JSON.stringify(payload, null, 2)};`,
    '})();',
    ''
  ].join('\n');
}

function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  const books = getBooks();
  if (!books.length) {
    throw new Error('No books selected');
  }

  for (const bookId of books) {
    const inputPath = path.join(SOURCE_DIR, `${bookId}.json`);
    if (!fs.existsSync(inputPath)) {
      console.warn(`Skipping ${bookId}: source JSON not found`);
      continue;
    }

    const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const outputPath = path.join(TARGET_DIR, `${bookId}.js`);
    fs.writeFileSync(outputPath, buildInlineSource(bookId, payload));
    console.log(`Built inline quick insights for ${bookId}`);
  }
}

main();
