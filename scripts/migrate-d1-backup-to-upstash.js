/* eslint-disable no-console, @typescript-eslint/no-var-requires */
const fs = require('node:fs');

const { Redis } = require('@upstash/redis');

function readBackup(path) {
  const csv = fs.readFileSync(path, 'utf8').trim();
  const newline = csv.indexOf('\n');
  if (newline < 0 || csv.slice(0, newline).trim() !== 'backup') {
    throw new Error('Expected a D1 Studio CSV export with one backup column');
  }

  let value = csv.slice(newline + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).replace(/""/g, '"');
  }

  const backup = JSON.parse(value);
  for (const table of [
    'users',
    'favorites',
    'play_records',
    'search_history',
  ]) {
    if (!Array.isArray(backup[table])) {
      throw new Error(`Missing ${table} rows in backup`);
    }
  }
  if (typeof backup.admin_config !== 'string') {
    throw new Error('Missing admin_config in backup');
  }
  return backup;
}

function buildEntries(backup) {
  const entries = new Map();
  const add = (key, value) => {
    if (entries.has(key)) throw new Error(`Duplicate destination key: ${key}`);
    entries.set(key, value);
  };

  for (const row of backup.users) {
    add(`u:${row.username}:pwd`, row.password);
  }
  for (const row of backup.favorites) {
    add(`u:${row.username}:fav:${row.key}`, {
      title: row.title,
      source_name: row.source_name,
      cover: row.cover,
      year: row.year,
      total_episodes: row.total_episodes,
      save_time: row.save_time,
    });
  }
  for (const row of backup.play_records) {
    const record = {
      title: row.title,
      source_name: row.source_name,
      cover: row.cover,
      year: row.year,
      index: row.index_episode,
      total_episodes: row.total_episodes,
      play_time: row.play_time,
      total_time: row.total_time,
      save_time: row.save_time,
    };
    if (row.search_title) record.search_title = row.search_title;
    add(`u:${row.username}:pr:${row.key}`, record);
  }

  const histories = new Map();
  for (const row of backup.search_history) {
    if (!histories.has(row.username)) histories.set(row.username, []);
    histories.get(row.username).push(row);
  }
  for (const [username, rows] of histories) {
    rows.sort((a, b) => b.created_at - a.created_at);
    if (rows.length > 20) {
      throw new Error(
        `Search history exceeds the app's 20-item limit: ${username}`
      );
    }
    add(
      `u:${username}:sh`,
      rows.map((row) => row.keyword)
    );
  }

  add('admin:config', JSON.parse(backup.admin_config));
  return entries;
}

function equal(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function migrate(redis, entries) {
  // Preflight every key before writing anything to avoid replacing live data.
  for (const [key, expected] of entries) {
    const existing = key.endsWith(':sh')
      ? await redis.lrange(key, 0, -1)
      : await redis.get(key);
    if (
      key.endsWith(':sh')
        ? existing.length > 0 && !equal(existing, expected)
        : existing !== null && !equal(existing, expected)
    ) {
      throw new Error(`Destination already contains different data at ${key}`);
    }
  }

  for (const [key, value] of entries) {
    if (key.endsWith(':sh')) {
      if ((await redis.lrange(key, 0, -1)).length === 0) {
        await redis.rpush(key, ...value);
      }
    } else if ((await redis.get(key)) === null) {
      await redis.set(key, value);
    }
  }

  for (const [key, expected] of entries) {
    const actual = key.endsWith(':sh')
      ? await redis.lrange(key, 0, -1)
      : await redis.get(key);
    if (!equal(actual, expected))
      throw new Error(`Verification failed at ${key}`);
  }
}

async function main() {
  const [, , path, flag] = process.argv;
  if (!path || (flag && flag !== '--apply')) {
    throw new Error(
      'Usage: node scripts/migrate-d1-backup-to-upstash.js BACKUP.csv [--apply]'
    );
  }

  const backup = readBackup(path);
  const entries = buildEntries(backup);
  console.log(
    JSON.stringify({
      users: backup.users.length,
      favorites: backup.favorites.length,
      play_records: backup.play_records.length,
      search_history: backup.search_history.length,
      admin_config: 1,
      destination_keys: entries.size,
      mode: flag === '--apply' ? 'apply' : 'dry-run',
    })
  );
  if (flag !== '--apply') return;

  const url =
    process.env.UPSTASH_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;
  if (!url || !token)
    throw new Error('Upstash REST URL and token are required');
  await migrate(new Redis({ url, token }), entries);
  console.log(`Verified ${entries.size} destination keys`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { readBackup, buildEntries, migrate };
