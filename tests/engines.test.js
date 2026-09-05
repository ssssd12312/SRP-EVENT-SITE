import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGINE_IDS,
  GAME_DEFINITIONS,
  newGame,
  applyAction,
  publicState,
  rewardFor,
} from '../server/engines.js';
const now = 1000000;

test('12 distinct playable engines with finite, server-owned reward caps', () => {
  assert.equal(ENGINE_IDS.length, 12);
  assert.equal(new Set(ENGINE_IDS).size, 12);
  for (const g of GAME_DEFINITIONS) {
    const s = newGame(g.engine, now);
    assert.equal(s.engine, g.engine);
    assert.equal(s.finished, false);
    assert.ok(s.expiresAt > now);
    assert.equal(rewardFor(s, g.max_reward, now), 0);
    applyAction(s, { type: 'tick', score: 999999, coins: 999999, won: true }, now + 40);
    assert.ok(rewardFor(s, g.max_reward, now + 40) <= g.max_reward);
  }
});
test('secret mine positions never leave the server and the first reveal is safe', () => {
  const s = newGame('mines', now);
  const bomb = s.bombs[0];
  assert.equal(publicState(s, now).bombs, undefined);
  assert.ok(publicState(s, now).cells.every((v) => v === null));
  applyAction(s, { type: 'reveal', index: bomb }, now + 100);
  assert.equal(s.finished, false);
  assert.ok(!s.bombs.includes(bomb));
});
test('mines: safe cells win the full reward, flags do not reveal cells', () => {
  const s = newGame('mines', now);
  s.first = false;
  const safe = Array.from({ length: 36 }, (_, i) => i).filter((i) => !s.bombs.includes(i));
  applyAction(s, { type: 'flag', index: safe[0] }, now + 100);
  applyAction(s, { type: 'reveal', index: safe[0] }, now + 200);
  assert.ok(!s.revealed.includes(safe[0]));
  applyAction(s, { type: 'flag', index: safe[0] }, now + 300);
  for (const i of safe) applyAction(s, { type: 'reveal', index: i }, now + 500);
  assert.equal(s.won, true);
  assert.equal(rewardFor(s, 250, now + 1000), 250);
});
test('memory: hidden cards remain hidden; eight matching pairs complete the game', () => {
  const s = newGame('memory', now);
  assert.ok(publicState(s, now).cards.every((v) => v === null));
  for (let symbol = 0; symbol < 8; symbol++) {
    const indices = s.cards.map((v, i) => (v === symbol ? i : -1)).filter((i) => i >= 0);
    for (const index of indices) applyAction(s, { type: 'reveal', index }, now + symbol * 500 + 50);
  }
  assert.equal(s.won, true);
  assert.equal(s.moves, 8);
  assert.equal(rewardFor(s, 150, now + 5000), 150);
});
test('memory: mismatched cards cannot be turned over before the server timeout', () => {
  const s = newGame('memory', now),
    a = 0,
    b = s.cards.findIndex((v) => v !== s.cards[a]),
    c = [...s.cards.keys()].find((i) => i !== a && i !== b);
  applyAction(s, { type: 'reveal', index: a }, now + 100);
  applyAction(s, { type: 'reveal', index: b }, now + 200);
  applyAction(s, { type: 'reveal', index: c }, now + 300);
  assert.deepEqual(s.exposed, [a, b]);
  applyAction(s, { type: 'tick' }, now + 1100);
  assert.deepEqual(s.exposed, []);
});
test('snake: throttled ticks, no instant reversal, and server-owned apple scoring', () => {
  const s = newGame('snake', now);
  s.food = [6, 7];
  applyAction(s, { type: 'tick', direction: 'left' }, now + 50);
  assert.deepEqual(s.snake[0], [5, 7]);
  applyAction(s, { type: 'tick', direction: 'left' }, now + 200);
  assert.deepEqual(s.snake[0], [6, 7]);
  assert.equal(s.apples, 1);
  assert.equal(rewardFor(s, 180), 10);
});
test('tetris: completing a line is calculated from the actual board', () => {
  const s = newGame('tetris', now);
  s.board[15] = Array(10).fill(1);
  s.board[15][3] = 0;
  s.piece = { matrix: [[1]], x: 3, y: 15, color: 1 };
  applyAction(s, { type: 'drop' }, now + 100);
  assert.equal(s.lines, 1);
  assert.equal(s.score, 100);
  assert.equal(rewardFor(s, 200), 33);
});
test('reaction: upcoming signal time is private; false starts award no coins', () => {
  const s = newGame('reaction', now);
  assert.equal(publicState(s, now).targetAt, undefined);
  assert.equal(publicState(s, now).phase, 'wait');
  applyAction(s, { type: 'react' }, s.targetAt - 1);
  assert.equal(s.finished, true);
  assert.equal(rewardFor(s, 120), 0);
});
test('reaction: the server measures three rounds instead of trusting a client time', () => {
  const s = newGame('reaction', now);
  for (let i = 0; i < 3; i++) applyAction(s, { type: 'react', milliseconds: 1, score: 1 }, s.targetAt + 300);
  assert.equal(s.won, true);
  assert.equal(s.score, 300);
  assert.equal(s.hits.length, 3);
  assert.ok(rewardFor(s, 120) < 120);
});
test('flappy: server-side elapsed time changes physics, not a supplied score', () => {
  const s = newGame('flappy', now);
  applyAction(s, { type: 'tick', flap: true, score: 1000 }, now + 80);
  assert.ok(s.birdY < 180);
  assert.equal(s.passed, 0);
  assert.equal(s.score, 0);
  s.birdY = 399;
  applyAction(s, { type: 'tick' }, now + 180);
  assert.equal(s.finished, true);
});
test('rock-paper-scissors: exactly five server-generated rounds', () => {
  const s = newGame('rps', now);
  for (let i = 0; i < 10; i++)
    applyAction(s, { type: 'choose', choice: i % 3, opponent: 2, result: 'win' }, now + i * 500);
  assert.equal(s.rounds.length, 5);
  assert.equal(s.finished, true);
  assert.equal(s.score, s.rounds.filter((r) => r.result === 'win').length);
  assert.equal(rewardFor(s, 80), s.wins * 16);
});
test('2048 merges every tile only once per move', () => {
  const s = newGame('2048', now);
  s.board = [2, 2, 2, 2, ...Array(12).fill(0)];
  applyAction(s, { type: 'move', direction: 'left' }, now + 100);
  assert.deepEqual(s.board.slice(0, 2), [4, 4]);
  assert.equal(s.score, 8);
  assert.equal(s.moves, 1);
});
test('pumpkin: one award per target and a strict 30-second round', () => {
  const s = newGame('whack', now);
  const target = s.target;
  applyAction(s, { type: 'hit', index: target }, now + 100);
  applyAction(s, { type: 'hit', index: target }, now + 200);
  assert.equal(s.hits, 1);
  assert.equal(publicState(s, now + 200).target, -1);
  applyAction(s, { type: 'tick' }, now + 30001);
  assert.equal(s.finished, true);
  assert.equal(rewardFor(s, 90), 5);
});
test('quiz: answer keys are private and only correct choices earn points', () => {
  const s = newGame('quiz', now),
    p = publicState(s, now);
  assert.equal(p.questions, undefined);
  assert.equal(p.question.answer, undefined);
  for (let i = 0; i < 5; i++)
    applyAction(s, { type: 'answer', choice: s.questions[s.index].answer }, now + 1000 + i * 1000);
  assert.equal(s.score, 5);
  assert.equal(s.won, true);
  assert.equal(rewardFor(s, 100), 100);
});
test('sequence: inputs during demonstration are ignored; seven levels win', () => {
  const s = newGame('sequence', now);
  applyAction(s, { type: 'tap', index: s.sequence[0] }, now + 100);
  assert.equal(s.entered, 0);
  while (!s.finished) {
    const pattern = [...s.sequence],
      time = s.showUntil + 1;
    assert.deepEqual(publicState(s, time).sequence, []);
    pattern.forEach((index, i) => applyAction(s, { type: 'tap', index }, time + i * 100));
  }
  assert.equal(s.completed, 7);
  assert.equal(s.won, true);
  assert.equal(rewardFor(s, 150), 150);
});
test('guess: secrets and client-requested coins cannot affect the reward', () => {
  const s = newGame('guess', now);
  assert.equal(publicState(s, now).secret, undefined);
  applyAction(s, { type: 'guess', number: '50' }, now + 100);
  assert.equal(s.guesses.length, 0);
  applyAction(s, { type: 'guess', number: s.secret, coins: 999999 }, now + 200);
  assert.equal(s.won, true);
  assert.equal(rewardFor(s, 70), 70);
});
test('expired and finished sessions never accept further actions', () => {
  const s = newGame('quiz', now);
  applyAction(s, { type: 'answer', choice: s.questions[0].answer }, s.expiresAt + 1);
  assert.equal(s.finished, true);
  assert.equal(s.score, 0);
  const before = JSON.stringify(s);
  applyAction(s, { type: 'answer', choice: 1 }, s.expiresAt + 2);
  assert.equal(JSON.stringify(s), before);
});

test('2048 is able to reach its advertised maximum reward', () => {
  const s = newGame('2048', now);
  s.best = 2048;
  s.finished = true;
  s.won = true;
  assert.equal(rewardFor(s, 200), 200);
});
