'use strict';
/* eslint-disable @typescript-eslint/no-var-requires, no-console */

const fs = require('fs');
const path = require('path');

const chunksDirectory = path.join(process.cwd(), '.next', 'static', 'chunks');
const incompatibleChunks = [];
let checkedChunks = 0;

function checkDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      checkDirectory(absolutePath);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;

    checkedChunks += 1;
    const source = fs.readFileSync(absolutePath, 'utf8');
    if (/\bcatch\s*\{/.test(source)) {
      incompatibleChunks.push(path.relative(process.cwd(), absolutePath));
    }
  }
}

checkDirectory(chunksDirectory);

if (incompatibleChunks.length > 0) {
  console.error(
    `Chrome 62-incompatible optional catch binding found in:\n${incompatibleChunks.join(
      '\n'
    )}`
  );
  process.exit(1);
}

console.log(
  `TV WebView compatibility checked in ${checkedChunks} client chunks.`
);
