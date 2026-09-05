// Give browser tests a fresh, active season regardless of the real competition dates.
// Never reuse an existing file or the live event database.
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const testDirectory = resolve('.data/tests');
const databasePath = process.env.DATABASE_PATH && resolve(process.env.DATABASE_PATH);
if (!databasePath || !databasePath.startsWith(testDirectory + sep) || existsSync(databasePath)) {
  throw new Error(
    'Browser tests require a new database inside .data/tests. The live database is never reused.',
  );
}

const { run } = await import('../server/db.js');
const start = Date.now() - 60 * 60 * 1000;
const end = start + 14 * 24 * 60 * 60 * 1000;
run(
  "UPDATE event_settings SET start_date = ?, end_date = ?, event_status = 'active' WHERE id = 1",
  new Date(start).toISOString(),
  new Date(end).toISOString(),
);

await import('../server/index.js');
