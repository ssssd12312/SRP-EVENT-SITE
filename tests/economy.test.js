import { test, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_PATH = ':memory:';
const {
  db,
  run,
  one,
  all,
  uid,
  hash,
  newCode,
  award,
  transaction,
  leaderboard,
  leaderboardPage,
  finalizeEvent,
  settings,
  gameAvailability,
  grantAchievements,
  iso,
} = await import('../server/db.js');
after(() => db.close());
const ids = [];
function participant(name) {
  const id = uid();
  run(
    'INSERT INTO users(id,discord_nickname,discord_username,discord_id,participant_code,recovery_hash,created_at) VALUES(?,?,?,?,?,?,?)',
    id,
    name,
    name,
    '123456789012345' + String(ids.length).padStart(3, '0'),
    newCode(),
    hash('test-secret-' + id),
    iso(),
  );
  ids.push(id);
  return id;
}
test('codes have the requested SRP-XXX format and are unique', () => {
  for (let i = 0; i < 150; i++) participant('tester' + i);
  const codes = all('SELECT participant_code FROM users').map((u) => u.participant_code);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(codes.every((c) => /^SRP-[A-Z0-9]{3}$/.test(c)));
});
test('an award updates the balance and ledger atomically', () => {
  const id = ids[0];
  transaction(() => award(id, 120, 'Мини-игра · Тест'));
  assert.equal(one('SELECT coins FROM users WHERE id=?', id).coins, 120);
  assert.equal(one('SELECT SUM(amount) AS n FROM coin_transactions WHERE user_id=?', id).n, 120);
});
test('negative balances and half-completed transactions roll back', () => {
  const id = ids[0];
  assert.throws(() =>
    transaction(() => {
      award(id, 50, 'Temporary');
      award(id, -1000, 'Invalid');
    }),
  );
  assert.equal(one('SELECT coins FROM users WHERE id=?', id).coins, 120);
  assert.equal(one('SELECT SUM(amount) AS n FROM coin_transactions WHERE user_id=?', id).n, 120);
});
test('public ranks exclude blocked users and do not expose private Discord IDs', () => {
  transaction(() => award(ids[1], 250, 'Test'));
  run("UPDATE users SET status='blocked' WHERE id=?", ids[1]);
  const ranks = leaderboard();
  assert.equal(ranks[0].id, ids[0]);
  assert.equal(ranks[0].rank, 1);
  assert.equal(ranks[0].discord_id, undefined);
  assert.ok(!ranks.some((p) => p.id === ids[1]));
});
test('attempt limits, cooldown and achievements use persisted results', () => {
  const id = ids[2];
  for (let i = 0; i < 5; i++) {
    const sessionId = uid();
    run(
      'INSERT INTO game_sessions(id,user_id,game_id,state,max_reward,created_at,finished_at) VALUES(?,?,?,?,?,?,?)',
      sessionId,
      id,
      'rps',
      '{}',
      80,
      iso(),
      iso(),
    );
    run('INSERT INTO game_results VALUES(?,?,?,?,?,?,?)', uid(), sessionId, id, 'rps', 1, 16, iso());
  }
  const limits = gameAvailability(id, 'rps');
  assert.equal(limits.attempts_left, 0);
  assert.equal(limits.played_today, 5);
  assert.ok(limits.cooldown_until > Date.now());
  const first = transaction(() => grantAchievements(id));
  const second = transaction(() => grantAchievements(id));
  assert.equal(first, 25);
  assert.equal(second, 0);
});
test('a result cannot be submitted twice for the same session', () => {
  const row = one('SELECT * FROM game_results LIMIT 1');
  assert.throws(() =>
    run(
      'INSERT INTO game_results VALUES(?,?,?,?,?,?,?)',
      uid(),
      row.session_id,
      row.user_id,
      row.game_id,
      99,
      100,
      iso(),
    ),
  );
});
test('paginated leaderboard retains global ranks and searches beyond the first hundred players', () => {
  const second = leaderboardPage('', 2, 25);
  assert.equal(second.players.length, 25);
  assert.equal(second.players[0].rank, 26);
  assert.equal(second.total, 149);
  const result = leaderboardPage('tester128', 99, 25);
  assert.equal(result.players.length, 1);
  assert.equal(result.players[0].discord_username, 'tester128');
  assert.equal(result.page, 1);
  assert.ok(result.players[0].rank > 1);
});
test('finalization stores immutable ranks and is idempotent', () => {
  const before = JSON.parse(JSON.stringify(leaderboard()));
  finalizeEvent();
  assert.equal(settings().event_status, 'finished');
  assert.deepEqual(leaderboard(), before);
  run('UPDATE users SET coins=999999 WHERE id=?', ids[10]);
  assert.deepEqual(leaderboard(), before);
  const first = settings().finalized_at;
  finalizeEvent();
  assert.equal(settings().finalized_at, first);
  assert.equal(one("SELECT COUNT(*) AS n FROM admin_audit WHERE action='event.finalize'").n, 1);
});
