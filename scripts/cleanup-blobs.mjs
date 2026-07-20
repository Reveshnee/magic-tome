/**
 * Blob cleanup script
 * Deletes blobs that are NOT referenced in the database (orphaned duplicates, old cached thumbs, etc.)
 * Safe: dry-run first, then pass --delete to actually remove.
 */
import { list, del } from '@vercel/blob';
import pg from 'pg';

const { Client } = pg;
const DRY_RUN = !process.argv.includes('--delete');

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --delete to actually remove) ===' : '=== DELETING ORPHANS ===');

  // Connect to Neon via pg
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Collect all blob pathnames referenced anywhere in the DB
  const referenced = new Set();

  // cur8_item: url column (direct blob URLs and /api/cur8/file?pathname= proxy URLs)
  const { rows: itemRows } = await client.query(`SELECT url FROM cur8_item WHERE url IS NOT NULL`);
  for (const r of itemRows) {
    extractPathname(r.url, referenced);
  }

  // cur8_item: fileText is stored in DB, but thumbnail_url may be a blob
  const { rows: thumbRows } = await client.query(`SELECT thumbnail FROM cur8_item WHERE thumbnail LIKE '%blob.vercel-storage%'`);
  for (const r of thumbRows) {
    extractPathname(r.thumbnail, referenced);
  }

  // cur8_attachment: file_url column
  try {
    const { rows: attachRows } = await client.query(`SELECT file_url FROM cur8_attachment WHERE file_url IS NOT NULL`);
    for (const r of attachRows) {
      extractPathname(r.file_url, referenced);
    }
  } catch { /* table may not exist */ }

  await client.end();
  console.log(`DB-referenced pathnames: ${referenced.size}`);

  // List all blobs in the store
  let cursor;
  const allBlobs = [];
  do {
    const res = await list({ limit: 1000, cursor });
    allBlobs.push(...res.blobs);
    cursor = res.cursor;
    if (!res.hasMore) break;
  } while (true);

  const totalMB = (allBlobs.reduce((s, b) => s + b.size, 0) / 1024 / 1024).toFixed(1);
  console.log(`Total blobs in store: ${allBlobs.length} (${totalMB} MB)`);

  // Separate orphans from referenced blobs
  const orphans = allBlobs.filter(b => !referenced.has(b.pathname));
  const kept    = allBlobs.filter(b =>  referenced.has(b.pathname));

  const orphanMB = (orphans.reduce((s, b) => s + b.size, 0) / 1024 / 1024).toFixed(1);
  const keptMB   = (kept.reduce((s, b) => s + b.size, 0) / 1024 / 1024).toFixed(1);

  console.log(`\nReferenced (keeping): ${kept.length} files = ${keptMB} MB`);
  console.log(`Orphaned  (removing): ${orphans.length} files = ${orphanMB} MB`);

  // Print orphans grouped by prefix
  const groups = {};
  for (const b of orphans) {
    const prefix = b.pathname.split('/').slice(0, 2).join('/');
    if (!groups[prefix]) groups[prefix] = { count: 0, size: 0 };
    groups[prefix].count++;
    groups[prefix].size += b.size;
  }
  console.log('\nOrphans by folder:');
  for (const [k, v] of Object.entries(groups).sort((a, b) => b[1].size - a[1].size)) {
    console.log(`  ${k.padEnd(45)} ${(v.size/1024/1024).toFixed(1).padStart(7)} MB   ${v.count} files`);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Run with --delete to remove these files.');
    return;
  }

  // Delete in batches of 50
  let deleted = 0;
  let freed = 0;
  const BATCH = 50;
  for (let i = 0; i < orphans.length; i += BATCH) {
    const batch = orphans.slice(i, i + BATCH);
    await Promise.all(batch.map(b => del(b.url).catch(e => console.warn('Failed to delete', b.pathname, e.message))));
    deleted += batch.length;
    freed   += batch.reduce((s, b) => s + b.size, 0);
    process.stdout.write(`\rDeleted ${deleted}/${orphans.length} files (${(freed/1024/1024).toFixed(1)} MB freed)...`);
  }
  console.log('\nDone.');
}

function extractPathname(url, set) {
  if (!url) return;
  try {
    if (url.includes('blob.vercel-storage.com')) {
      const u = new URL(url);
      set.add(u.pathname.replace(/^\//, ''));
    } else if (url.startsWith('/api/cur8/file')) {
      const u = new URL('https://x' + url);
      const p = u.searchParams.get('pathname');
      if (p) set.add(p);
    }
  } catch {}
}

main().catch(e => { console.error(e); process.exit(1); });
