import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_PATH = ':memory:';
const {
  db,
  run,
  one,
  all,
  uid,
  hash,
  iso,
  award,
  transaction,
  settings,
  tickEvent,
  isEventActive,
  migrateEventSchedule,
  DEFAULT_EVENT_SCHEDULE,
  SCHEDULE_MIGRATION_ID,
} = await import('../server/db.js');
const initialSettings = settings();
const legacyStart = '2026-09-01T00:00:00.000Z';
const legacyEnd = '2026-11-30T23:59:59.000Z';

beforeEach(() => {
  run('DELETE FROM schema_migrations WHERE id = ?', SCHEDULE_MIGRATION_ID);
  run('DELETE FROM admin_audit');
  run(
    "UPDATE event_settings SET start_date = ?, end_date = ?, event_status = 'scheduled', final_results = NULL, finalized_at = NULL WHERE id = 1",
    DEFAULT_EVENT_SCHEDULE.start_date,
    DEFAULT_EVENT_SCHEDULE.end_date,
  );
});
after(() => db.close());

function legacyEvent(status = 'active') {
  run(
    'UPDATE event_settings SET start_date = ?, end_date = ?, event_status = ? WHERE id = 1',
    legacyStart,
    legacyEnd,
    status,
  );
}

test('a new event starts September 6 and lasts exactly fourteen full UTC days', () => {
  assert.equal(initialSettings.start_date, '2026-09-06T00:00:00.000Z');
  assert.equal(initialSettings.end_date, '2026-09-20T00:00:00.000Z');
  assert.equal(Date.parse(initialSettings.end_date) - Date.parse(initialSettings.start_date), 14 * 86400000);
});

test('the legacy calendar upgrades without changing participants, balances or coin history', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-05T12:00:00.000Z') });
  legacyEvent();
  const id = uid();
  run(
    'INSERT INTO users (id,discord_nickname,discord_username,discord_id,participant_code,recovery_hash,created_at) VALUES (?,?,?,?,?,?,?)',
    id,
    'Проверка календаря',
    'calendar_test',
    '123456789012345678',
    'SRP-T01',
    hash('unit-test-recovery-key'),
    iso(),
  );
  transaction(() => award(id, 75, 'Сохранённая награда'));
  const usersBefore = all('SELECT * FROM users');
  const ledgerBefore = all('SELECT * FROM coin_transactions');
  const rewardsBefore = settings().rewards;
  assert.equal(migrateEventSchedule(), true);
  assert.equal(settings().start_date, DEFAULT_EVENT_SCHEDULE.start_date);
  assert.equal(settings().end_date, DEFAULT_EVENT_SCHEDULE.end_date);
  assert.equal(settings().event_status, 'scheduled');
  assert.deepEqual(all('SELECT * FROM users'), usersBefore);
  assert.deepEqual(all('SELECT * FROM coin_transactions'), ledgerBefore);
  assert.deepEqual(settings().rewards, rewardsBefore);
  assert.equal(
    one("SELECT COUNT(*) AS count FROM admin_audit WHERE action = 'event.schedule_update'").count,
    1,
  );
});

test('a deliberate pause survives the calendar upgrade', () => {
  legacyEvent('paused');
  assert.equal(migrateEventSchedule(), true);
  assert.equal(settings().event_status, 'paused');
});

test('dates already customized by the administrator are not overwritten', () => {
  run(
    'UPDATE event_settings SET start_date = ?, end_date = ? WHERE id = 1',
    '2026-10-02T15:00:00.000Z',
    '2026-10-16T15:00:00.000Z',
  );
  const before = settings();
  assert.equal(migrateEventSchedule(), false);
  assert.deepEqual(settings(), before);
});

test('a completed season and its final ranking are never reopened by the migration', () => {
  legacyEvent('finished');
  run(
    'UPDATE event_settings SET final_results = ?, finalized_at = ? WHERE id = 1',
    JSON.stringify([{ id: 'winner', rank: 1, coins: 100 }]),
    '2026-09-05T10:00:00.000Z',
  );
  const before = settings();
  assert.equal(migrateEventSchedule(), false);
  assert.deepEqual(settings(), before);
});

test('the migration runs only once, including after later manual date changes', () => {
  legacyEvent();
  assert.equal(migrateEventSchedule(), true);
  assert.equal(migrateEventSchedule(), false);
  assert.equal(
    one('SELECT COUNT(*) AS count FROM schema_migrations WHERE id = ?', SCHEDULE_MIGRATION_ID).count,
    1,
  );
  legacyEvent();
  assert.equal(migrateEventSchedule(), false);
  assert.equal(settings().start_date, legacyStart);
  assert.equal(settings().end_date, legacyEnd);
  assert.equal(
    one("SELECT COUNT(*) AS count FROM admin_audit WHERE action = 'event.schedule_update'").count,
    1,
  );
});

test('coins unlock at the start instant and stop exactly at the exclusive end boundary', (t) => {
  const start = Date.parse(DEFAULT_EVENT_SCHEDULE.start_date);
  const end = Date.parse(DEFAULT_EVENT_SCHEDULE.end_date);
  t.mock.timers.enable({ apis: ['Date'], now: start - 1 });
  tickEvent();
  assert.equal(settings().event_status, 'scheduled');
  assert.equal(isEventActive(), false);
  t.mock.timers.setTime(start);
  tickEvent();
  assert.equal(settings().event_status, 'active');
  assert.equal(isEventActive(), true);
  t.mock.timers.setTime(end - 1);
  assert.equal(isEventActive(), true);
  t.mock.timers.setTime(end);
  tickEvent();
  assert.equal(settings().event_status, 'finished');
  assert.equal(isEventActive(), false);
  const final = settings().final_results;
  t.mock.timers.setTime(end + 86400000);
  tickEvent();
  assert.deepEqual(settings().final_results, final);
  assert.equal(one("SELECT COUNT(*) AS count FROM admin_audit WHERE action = 'event.finalize'").count, 1);
});
