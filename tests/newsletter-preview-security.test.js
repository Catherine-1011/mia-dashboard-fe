/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('newsletter preview uses a restrictive iframe instead of an HTML injection sink', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(admindashboard)/admindashboard/newsletter/page.tsx'),
    'utf8'
  );
  const preview = source.slice(source.indexOf('{/* Content preview */}'), source.indexOf('function StatItem'));

  assert.match(preview, /<iframe/);
  assert.match(preview, /sandbox=""/);
  assert.match(preview, /srcDoc=\{campaign\.content\}/);
  assert.doesNotMatch(preview, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(preview, /allow-scripts|allow-same-origin|allow-top-navigation|allow-popups|allow-forms/);
});
