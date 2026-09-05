import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID, randomBytes, createHash, randomInt } from 'node:crypto';
import { GAME_DEFINITIONS } from './engines.js';

// The event uses an exclusive end boundary: September 6–19 inclusive, exactly 14 days in UTC.
export const DEFAULT_EVENT_SCHEDULE = Object.freeze({
  start_date: '2026-09-06T00:00:00.000Z',
  end_date: '2026-09-20T00:00:00.000Z',
});
export const SCHEDULE_MIGRATION_ID = '2026-09-06-fourteen-day-event';
const legacySchedule = {
  start_date: '2026-09-01T00:00:00.000Z',
  end_date: '2026-11-30T23:59:59.000Z',
};

const dbPath = process.env.DATABASE_PATH || resolve('.data/event.sqlite');
if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
export const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, discord_nickname TEXT NOT NULL,
    discord_username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    discord_id TEXT NOT NULL UNIQUE, participant_code TEXT NOT NULL UNIQUE,
    recovery_hash TEXT NOT NULL, coins INTEGER NOT NULL DEFAULT 0 CHECK(coins >= 0),
    created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked'))
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), is_admin INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, engine TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, max_reward INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, category TEXT NOT NULL, difficulty TEXT NOT NULL, accent TEXT NOT NULL, tag TEXT NOT NULL DEFAULT '');
  CREATE TABLE IF NOT EXISTS game_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), game_id TEXT NOT NULL REFERENCES games(id), state TEXT NOT NULL, max_reward INTEGER NOT NULL, created_at TEXT NOT NULL, finished_at TEXT);
  CREATE TABLE IF NOT EXISTS game_results (id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE REFERENCES game_sessions(id), user_id TEXT NOT NULL REFERENCES users(id), game_id TEXT NOT NULL REFERENCES games(id), score INTEGER NOT NULL, coins_earned INTEGER NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS coin_transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, admin_id TEXT);
  CREATE TABLE IF NOT EXISTS achievements (user_id TEXT NOT NULL REFERENCES users(id), achievement_key TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id, achievement_key));
  CREATE TABLE IF NOT EXISTS event_settings (id INTEGER PRIMARY KEY CHECK(id = 1), event_name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, event_status TEXT NOT NULL, rewards TEXT NOT NULL, final_results TEXT, finalized_at TEXT);
  CREATE TABLE IF NOT EXISTS admin_audit (id TEXT PRIMARY KEY, action TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS results_user_date ON game_results(user_id, created_at);
  CREATE INDEX IF NOT EXISTS transactions_user_date ON coin_transactions(user_id, created_at);
  CREATE INDEX IF NOT EXISTS session_user ON game_sessions(user_id, finished_at);
  CREATE INDEX IF NOT EXISTS leaderboard_coins ON users(coins DESC, created_at ASC);
`);
export const iso = () => new Date().toISOString();
export const hash = (s) => createHash('sha256').update(s).digest('hex');
export const uid = () => randomUUID();
export const token = () => randomBytes(32).toString('base64url');
export const one = (sql, ...args) => db.prepare(sql).get(...args);
export const all = (sql, ...args) => db.prepare(sql).all(...args);
export const run = (sql, ...args) => db.prepare(sql).run(...args);
export function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = fn();
    db.exec('COMMIT');
    return value;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
for (const g of GAME_DEFINITIONS)
  run(
    'INSERT OR IGNORE INTO games (id,engine,name,description,max_reward,enabled,category,difficulty,accent,tag) VALUES (?,?,?,?,?,?,?,?,?,?)',
    g.id,
    g.engine,
    g.name,
    g.description,
    g.max_reward,
    1,
    g.category,
    g.difficulty,
    g.accent,
    g.tag,
  );
const defaultRewards = [
  {
    place: 1,
    title: 'Главная награда ивента',
    items: ['Кастомная Discord-роль', 'Скин', 'Главная награда ивента'],
  },
  { place: 2, title: 'Серебряная победа', items: ['Кастомная Discord-роль', 'Скин', 'Награда за 2 место'] },
  { place: 3, title: 'Бронзовый триумф', items: ['Кастомная Discord-роль', 'Скин', 'Награда за 3 место'] },
  { place: 4, title: 'Великолепная пятёрка', items: ['Скин'] },
  { place: 5, title: 'Великолепная пятёрка', items: ['Скин'] },
];
run(
  'INSERT OR IGNORE INTO event_settings (id,event_name,start_date,end_date,event_status,rewards) VALUES (1,?,?,?,?,?)',
  'SRP EVENT',
  DEFAULT_EVENT_SCHEDULE.start_date,
  DEFAULT_EVENT_SCHEDULE.end_date,
  Date.now() < Date.parse(DEFAULT_EVENT_SCHEDULE.start_date) ? 'scheduled' : 'active',
  JSON.stringify(defaultRewards),
);

// Upgrade the original seeded calendar once, without replacing custom settings or final results.
// Neither balances nor participant/game records are touched by this migration.
export function migrateEventSchedule() {
  return transaction(() => {
    if (one('SELECT 1 FROM schema_migrations WHERE id = ?', SCHEDULE_MIGRATION_ID)) return false;
    const previous = one('SELECT * FROM event_settings WHERE id = 1');
    const shouldUpdate =
      previous.event_status !== 'finished' &&
      !previous.final_results &&
      !previous.finalized_at &&
      previous.start_date === legacySchedule.start_date &&
      previous.end_date === legacySchedule.end_date;
    if (shouldUpdate) {
      const status =
        previous.event_status === 'paused'
          ? 'paused'
          : Date.now() < Date.parse(DEFAULT_EVENT_SCHEDULE.start_date)
            ? 'scheduled'
            : 'active';
      run(
        'UPDATE event_settings SET start_date = ?, end_date = ?, event_status = ? WHERE id = 1',
        DEFAULT_EVENT_SCHEDULE.start_date,
        DEFAULT_EVENT_SCHEDULE.end_date,
        status,
      );
      run(
        'INSERT INTO admin_audit VALUES (?,?,?,?)',
        uid(),
        'event.schedule_update',
        JSON.stringify({
          from: { start_date: previous.start_date, end_date: previous.end_date },
          to: { ...DEFAULT_EVENT_SCHEDULE, event_status: status },
          duration_days: 14,
          time_zone: 'UTC',
        }),
        iso(),
      );
    }
    run('INSERT INTO schema_migrations VALUES (?,?)', SCHEDULE_MIGRATION_ID, iso());
    return shouldUpdate;
  });
}
migrateEventSchedule();

export function settings() {
  const s = one('SELECT * FROM event_settings WHERE id = 1');
  return {
    ...s,
    rewards: JSON.parse(s.rewards),
    final_results: s.final_results ? JSON.parse(s.final_results) : null,
  };
}
export function liveLeaderboard() {
  return all(
    "SELECT id,discord_nickname,discord_username,participant_code,coins,created_at, ROW_NUMBER() OVER (ORDER BY coins DESC,created_at ASC,id ASC) as rank FROM users WHERE status = 'active' ORDER BY rank",
  );
}
export function leaderboard() {
  return settings().final_results || liveLeaderboard();
}
export function leaderboardPage(query = '', page = 1, limit = 25) {
  const ranked = leaderboard();
  const needle = String(query).trim().slice(0, 64).toLowerCase();
  const filtered = needle
    ? ranked.filter((p) =>
        `${p.discord_nickname} ${p.discord_username} ${p.participant_code}`.toLowerCase().includes(needle),
      )
    : ranked;
  const size = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25));
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(totalPages, Math.max(1, Number.parseInt(page, 10) || 1));
  return {
    players: filtered.slice((currentPage - 1) * size, currentPage * size),
    total: ranked.length,
    filtered_total: filtered.length,
    page: currentPage,
    total_pages: totalPages,
    limit: size,
    finalized: settings().event_status === 'finished',
  };
}
export function finalizeEvent() {
  return transaction(() => {
    const s = settings();
    if (s.event_status === 'finished') return s;
    run(
      "UPDATE event_settings SET event_status = 'finished', final_results = ?, finalized_at = ? WHERE id = 1",
      JSON.stringify(liveLeaderboard()),
      iso(),
    );
    run(
      'INSERT INTO admin_audit VALUES (?,?,?,?)',
      uid(),
      'event.finalize',
      'Итоговый рейтинг зафиксирован',
      iso(),
    );
    return settings();
  });
}
export function tickEvent() {
  const s = settings();
  if (s.event_status !== 'finished' && Date.now() >= Date.parse(s.end_date)) finalizeEvent();
  else if (s.event_status === 'scheduled' && Date.now() >= Date.parse(s.start_date))
    run("UPDATE event_settings SET event_status = 'active' WHERE id = 1");
}
export function isEventActive() {
  const s = settings();
  return (
    s.event_status === 'active' &&
    Date.now() >= Date.parse(s.start_date) &&
    Date.now() < Date.parse(s.end_date)
  );
}
export function newCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 100; i++) {
    const code = 'SRP-' + Array.from({ length: 3 }, () => chars[randomInt(chars.length)]).join('');
    if (!one('SELECT id FROM users WHERE participant_code = ?', code)) return code;
  }
  throw new Error('Не удалось выдать код. Обратитесь к администратору.');
}
export function award(userId, amount, reason, adminId = null) {
  if (!Number.isInteger(amount) || !amount) return;
  run('UPDATE users SET coins = coins + ? WHERE id = ?', amount, userId);
  run('INSERT INTO coin_transactions VALUES (?,?,?,?,?,?)', uid(), userId, amount, reason, iso(), adminId);
}
export function gameAvailability(userId, gameId) {
  if (!userId) return { played_today: 0, attempts_left: 5, cooldown_until: null };
  const start = iso().slice(0, 10) + 'T00:00:00.000Z';
  const count = one(
    'SELECT COUNT(*) AS count FROM game_results WHERE user_id = ? AND game_id = ? AND created_at >= ?',
    userId,
    gameId,
    start,
  ).count;
  const latest = one(
    'SELECT created_at FROM game_results WHERE user_id = ? AND game_id = ? ORDER BY created_at DESC LIMIT 1',
    userId,
    gameId,
  );
  const cooldown = latest ? Date.parse(latest.created_at) + 60000 : 0;
  return {
    played_today: count,
    attempts_left: Math.max(0, 5 - count),
    cooldown_until: cooldown > Date.now() ? cooldown : null,
  };
}
export function userView(userId, details = false) {
  const u = one(
    'SELECT id,discord_nickname,discord_username,discord_id,participant_code,coins,created_at,status FROM users WHERE id = ?',
    userId,
  );
  if (!u) return null;
  u.rank = leaderboard().find((x) => x.id === userId)?.rank || null;
  u.games_played = one('SELECT COUNT(*) as count FROM game_results WHERE user_id = ?', userId).count;
  const start = iso().slice(0, 10) + 'T00:00:00.000Z';
  u.daily_games = one(
    'SELECT COUNT(DISTINCT game_id) as count FROM game_results WHERE user_id = ? AND created_at >= ? AND coins_earned > 0',
    userId,
    start,
  ).count;
  u.daily_complete = !!one(
    'SELECT 1 FROM achievements WHERE user_id = ? AND achievement_key = ?',
    userId,
    `daily:${iso().slice(0, 10)}`,
  );
  if (details) {
    u.transactions = all(
      'SELECT * FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      userId,
    );
    u.best_results = all(
      "SELECT g.name,g.id,CASE WHEN g.engine = 'reaction' THEN COALESCE(MIN(NULLIF(r.score,0)),0) ELSE MAX(r.score) END as best_score,MAX(r.coins_earned) as best_reward,COUNT(*) as games_played FROM game_results r JOIN games g ON g.id = r.game_id WHERE r.user_id = ? GROUP BY g.id ORDER BY best_reward DESC",
      userId,
    );
    u.achievements = all('SELECT achievement_key,created_at FROM achievements WHERE user_id = ?', userId);
  }
  return u;
}
export function grantAchievements(userId) {
  let bonus = 0;
  const grant = (key, amount, reason) => {
    if (one('SELECT 1 FROM achievements WHERE user_id = ? AND achievement_key = ?', userId, key)) return;
    run('INSERT INTO achievements VALUES (?,?,?)', userId, key, iso());
    award(userId, amount, reason);
    bonus += amount;
  };
  if (one('SELECT 1 FROM game_results WHERE user_id = ? AND coins_earned > 0', userId))
    grant('first-win', 25, 'Достижение · Первые коины');
  const start = iso().slice(0, 10) + 'T00:00:00.000Z';
  if (
    one(
      'SELECT COUNT(DISTINCT game_id) as n FROM game_results WHERE user_id = ? AND created_at >= ? AND coins_earned > 0',
      userId,
      start,
    ).n >= 3
  )
    grant(`daily:${iso().slice(0, 10)}`, 50, 'Задание дня · Три разные игры');
  if (
    one('SELECT COALESCE(SUM(coins_earned),0) as total FROM game_results WHERE user_id = ?', userId).total >=
    500
  )
    grant('500-coins', 100, 'Достижение · Коллекционер');
  return bonus;
}
