import { randomInt } from 'node:crypto';

export const GAME_DEFINITIONS = [
  {
    id: 'mines',
    name: 'Сапёр',
    description: 'Один неверный шаг. Сотни причин рискнуть.',
    max_reward: 250,
    category: 'Логика',
    difficulty: 'Сложная',
    accent: 'orange',
    tag: 'ХИТ СЕЗОНА',
  },
  {
    id: 'tetris',
    name: 'Тетрис',
    description: 'Наведи порядок в падающем хаосе.',
    max_reward: 200,
    category: 'Аркады',
    difficulty: 'Средняя',
    accent: 'purple',
    tag: 'КЛАССИКА',
  },
  {
    id: 'snake',
    name: 'Змейка',
    description: 'Собирай яблоки. Не кусай себя.',
    max_reward: 180,
    category: 'Аркады',
    difficulty: 'Средняя',
    accent: 'green',
    tag: '',
  },
  {
    id: 'memory',
    name: 'Память',
    description: 'Найди пары и доверься своей памяти.',
    max_reward: 150,
    category: 'Логика',
    difficulty: 'Лёгкая',
    accent: 'pink',
    tag: '',
  },
  {
    id: 'reaction',
    name: 'Реакция',
    description: 'Мгновение решает всё. Ты готов?',
    max_reward: 120,
    category: 'На реакцию',
    difficulty: 'Лёгкая',
    accent: 'yellow',
    tag: 'БЫСТРАЯ ИГРА',
  },
  {
    id: 'flappy',
    name: 'Осенний полёт',
    description: 'Маленькая птичка. Большие амбиции.',
    max_reward: 100,
    category: 'Аркады',
    difficulty: 'Сложная',
    accent: 'blue',
    tag: '',
  },
  {
    id: 'rps',
    name: 'Камень, ножницы…',
    description: 'Пять раундов наедине с удачей.',
    max_reward: 80,
    category: 'Удача',
    difficulty: 'Лёгкая',
    accent: 'purple',
    tag: '',
  },
  {
    id: '2048',
    name: '2048',
    description: 'Соединяй числа. Умножай победы.',
    max_reward: 200,
    category: 'Логика',
    difficulty: 'Средняя',
    accent: 'orange',
    tag: '',
  },
  {
    id: 'whack',
    name: 'Лови тыкву',
    description: 'Осенний урожай сам себя не соберёт.',
    max_reward: 90,
    category: 'На реакцию',
    difficulty: 'Лёгкая',
    accent: 'orange',
    tag: 'ОСЕННИЙ ВАЙБ',
  },
  {
    id: 'quiz',
    name: 'Осенний квиз',
    description: 'Пять вопросов. Проверь свою эрудицию.',
    max_reward: 100,
    category: 'Логика',
    difficulty: 'Лёгкая',
    accent: 'green',
    tag: '',
  },
  {
    id: 'sequence',
    name: 'Цветовой ритм',
    description: 'Запомни мелодию цвета и повтори её.',
    max_reward: 150,
    category: 'Логика',
    difficulty: 'Средняя',
    accent: 'blue',
    tag: '',
  },
  {
    id: 'guess',
    name: 'Секретное число',
    description: 'Семь попыток, чтобы найти ответ.',
    max_reward: 70,
    category: 'Удача',
    difficulty: 'Лёгкая',
    accent: 'pink',
    tag: '',
  },
].map((g) => ({ ...g, engine: g.id, enabled: 1 }));

export const ENGINE_IDS = GAME_DEFINITIONS.map((g) => g.id);
const rand = (n) => randomInt(n);
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const validIndex = (n, size) => Number.isInteger(n) && n >= 0 && n < size;
const end = (s, won, message) => Object.assign(s, { finished: true, won, message });
const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const questions = [
  {
    text: 'Почему осенью листья меняют цвет?',
    options: ['Им не хватает воды', 'Разрушается хлорофилл', 'Они замерзают', 'Их окрашивает дождь'],
    answer: 1,
  },
  { text: 'Сколько клеток на классической шахматной доске?', options: ['48', '100', '64', '81'], answer: 2 },
  {
    text: 'Что означает GG в игровом чате?',
    options: ['Good Game', 'Go Go', 'Great Gold', 'Game Guide'],
    answer: 0,
  },
  {
    text: 'Какое число получится при объединении двух плиток 128 в 2048?',
    options: ['128', '512', '256', '2048'],
    answer: 2,
  },
  {
    text: 'Какая птица обычно улетает на юг осенью?',
    options: ['Воробей', 'Синица', 'Дятел', 'Ласточка'],
    answer: 3,
  },
  {
    text: 'Из скольких квадратов состоит одна фигура в классическом тетрисе?',
    options: ['3', '4', '5', '6'],
    answer: 1,
  },
  {
    text: 'Что нужно сделать перед использованием найденного бага?',
    options: [
      'Заработать больше коинов',
      'Рассказать администратору',
      'Поделиться эксплойтом',
      'Создать второй аккаунт',
    ],
    answer: 1,
  },
  {
    text: 'Какое дерево сбрасывает хвою осенью?',
    options: ['Ель', 'Сосна', 'Лиственница', 'Кедр'],
    answer: 2,
  },
  {
    text: 'Что обозначает число на открытой клетке сапёра?',
    options: ['Оставшиеся ходы', 'Мины по соседству', 'Номер клетки', 'Количество флагов'],
    answer: 1,
  },
  {
    text: 'Какой месяц завершает календарную осень?',
    options: ['Декабрь', 'Октябрь', 'Ноябрь', 'Сентябрь'],
    answer: 2,
  },
];
const shapes = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
];
const piece = () => {
  const color = rand(7) + 1;
  return { matrix: shapes[color - 1].map((r) => [...r]), color, x: 3, y: 0 };
};
const fits = (s, p) =>
  p.matrix.every((row, dy) =>
    row.every(
      (cell, dx) =>
        !cell ||
        (p.x + dx >= 0 && p.x + dx < 10 && p.y + dy >= 0 && p.y + dy < 16 && !s.board[p.y + dy][p.x + dx]),
    ),
  );
const lockPiece = (s) => {
  const p = s.piece;
  p.matrix.forEach((row, dy) =>
    row.forEach((v, dx) => {
      if (v && p.y + dy < 16) s.board[p.y + dy][p.x + dx] = p.color;
    }),
  );
  const left = s.board.filter((row) => !row.every(Boolean));
  const lines = 16 - left.length;
  s.lines += lines;
  s.placed++;
  s.score += [0, 100, 300, 500, 800][lines];
  s.board = [...Array.from({ length: lines }, () => Array(10).fill(0)), ...left];
  s.piece = s.next;
  s.next = piece();
  if (s.lines >= 6) end(s, true, 'Идеальный порядок! Шесть линий собраны.');
  else if (!fits(s, s.piece)) end(s, false, 'Поле заполнено. Попробуешь побить рекорд?');
};
const dropStep = (s) => {
  const p = { ...s.piece, y: s.piece.y + 1 };
  if (fits(s, p)) s.piece = p;
  else lockPiece(s);
};
const spawnTile = (s) => {
  const empty = s.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  if (empty.length) s.board[empty[rand(empty.length)]] = rand(10) ? 2 : 4;
};
const snakeFood = (s) => {
  const empty = Array.from({ length: 196 }, (_, i) => [i % 14, Math.floor(i / 14)]).filter(
    (p) => !s.snake.some((b) => b[0] === p[0] && b[1] === p[1]),
  );
  return empty.length ? empty[rand(empty.length)] : null;
};

export function newGame(engine, now = Date.now()) {
  const s = {
    engine,
    startedAt: now,
    lastTick: now,
    expiresAt: now + 180000,
    score: 0,
    finished: false,
    version: 0,
    actions: 0,
  };
  if (engine === 'mines')
    Object.assign(s, {
      bombs: shuffle(Array.from({ length: 36 }, (_, i) => i)).slice(0, 6),
      revealed: [],
      flags: [],
      first: true,
    });
  if (engine === 'memory')
    Object.assign(s, {
      cards: shuffle(Array.from({ length: 16 }, (_, i) => i % 8)),
      matched: [],
      exposed: [],
      moves: 0,
      hideAt: 0,
    });
  if (engine === 'snake') {
    Object.assign(s, {
      snake: [
        [5, 7],
        [4, 7],
        [3, 7],
      ],
      direction: 'right',
      food: null,
      apples: 0,
    });
    s.food = snakeFood(s);
  }
  if (engine === 'tetris')
    Object.assign(s, {
      board: Array.from({ length: 16 }, () => Array(10).fill(0)),
      piece: piece(),
      next: piece(),
      lines: 0,
      placed: 0,
    });
  if (engine === 'reaction') Object.assign(s, { targetAt: now + 1800 + rand(2800), hits: [], phase: 'wait' });
  if (engine === 'flappy')
    Object.assign(s, { birdY: 180, velocity: 0, pipes: [], nextPipe: now + 1000, passed: 0 });
  if (engine === 'rps') Object.assign(s, { rounds: [], wins: 0 });
  if (engine === '2048') {
    Object.assign(s, { board: Array(16).fill(0), moves: 0, best: 2 });
    spawnTile(s);
    spawnTile(s);
  }
  if (engine === 'whack')
    Object.assign(s, {
      target: rand(9),
      targetUntil: now + 1000,
      hit: false,
      hits: 0,
      expiresAt: now + 30000,
    });
  if (engine === 'quiz')
    Object.assign(s, {
      questions: shuffle([...questions]).slice(0, 5),
      index: 0,
      answers: [],
      lastAnswer: 0,
    });
  if (engine === 'sequence')
    Object.assign(s, { sequence: [rand(4)], entered: 0, completed: 0, phase: 'show', showUntil: now + 1750 });
  if (engine === 'guess')
    Object.assign(s, { secret: rand(100) + 1, guesses: [], hint: 'Я загадал число от 1 до 100.' });
  return s;
}

export function applyAction(s, a, now = Date.now()) {
  if (s.finished) return s;
  if (now >= s.expiresAt) {
    end(
      s,
      false,
      s.engine === 'whack' ? 'Урожай собран! Отличная работа.' : 'Время вышло. Твой результат сохранён.',
    );
    return s;
  }
  if (!a || typeof a.type !== 'string') throw new Error('Неизвестное действие');
  if (a.type === 'finish') {
    end(s, false, 'Раунд завершён. Твой результат сохранён.');
    return s;
  }
  s.actions++;
  const e = s.engine;
  if (e === 'mines' && ['reveal', 'flag'].includes(a.type) && validIndex(a.index, 36)) {
    if (s.revealed.includes(a.index)) return s;
    if (a.type === 'flag') {
      s.flags = s.flags.includes(a.index) ? s.flags.filter((i) => i !== a.index) : [...s.flags, a.index];
      return s;
    }
    if (s.flags.includes(a.index)) return s;
    // The first reveal is always safe, without exposing any mine locations to the client.
    if (s.first) {
      while (s.bombs.includes(a.index))
        s.bombs = shuffle(Array.from({ length: 36 }, (_, i) => i)).slice(0, 6);
      s.first = false;
    }
    if (s.bombs.includes(a.index)) {
      end(s, false, 'Ой, мина! В следующий раз повезёт.');
      return s;
    }
    const reveal = (i) => {
      if (s.revealed.includes(i) || s.bombs.includes(i)) return;
      s.revealed.push(i);
      s.flags = s.flags.filter((f) => f !== i);
      if (!mineCount(s, i)) neighbors(i).forEach(reveal);
    };
    reveal(a.index);
    s.score = s.revealed.length;
    if (s.revealed.length === 30) end(s, true, 'Ни одной ошибки. Минное поле обезврежено!');
  }
  if (e === 'memory') {
    if (s.hideAt && now >= s.hideAt) {
      s.exposed = [];
      s.hideAt = 0;
    }
    if (
      a.type === 'reveal' &&
      validIndex(a.index, 16) &&
      !s.hideAt &&
      !s.matched.includes(a.index) &&
      !s.exposed.includes(a.index)
    ) {
      s.exposed.push(a.index);
      if (s.exposed.length === 2) {
        s.moves++;
        const [x, y] = s.exposed;
        if (s.cards[x] === s.cards[y]) {
          s.matched.push(x, y);
          s.exposed = [];
          s.score = s.matched.length / 2;
          if (s.matched.length === 16) end(s, true, 'Все пары найдены. Вот это память!');
        } else s.hideAt = now + 850;
      }
    }
  }
  if (e === 'snake' && a.type === 'tick' && now - s.lastTick >= 145) {
    s.lastTick = now;
    if (directions[a.direction]) {
      const old = directions[s.direction],
        next = directions[a.direction];
      if (old[0] !== -next[0] || old[1] !== -next[1]) s.direction = a.direction;
    }
    const d = directions[s.direction],
      head = [s.snake[0][0] + d[0], s.snake[0][1] + d[1]];
    const eat = s.food && head[0] === s.food[0] && head[1] === s.food[1];
    const body = eat ? s.snake : s.snake.slice(0, -1);
    if (head.some((n) => n < 0 || n >= 14) || body.some((b) => b[0] === head[0] && b[1] === head[1]))
      end(s, false, 'Змейка запуталась. Яблоки уже в копилке!');
    else {
      s.snake.unshift(head);
      if (eat) {
        s.apples++;
        s.score = s.apples * 10;
        s.food = snakeFood(s);
        if (s.apples >= 18 || !s.food) end(s, true, 'Настоящий повелитель змейки!');
      } else s.snake.pop();
    }
  }
  if (e === 'tetris') {
    let steps = Math.min(12, Math.floor((now - s.lastTick) / 600));
    while (steps-- > 0 && !s.finished) {
      dropStep(s);
      s.lastTick += 600;
    }
    if (s.finished) return s;
    if (['left', 'right'].includes(a.type)) {
      const p = { ...s.piece, x: s.piece.x + (a.type === 'left' ? -1 : 1) };
      if (fits(s, p)) s.piece = p;
    }
    if (a.type === 'rotate') {
      const matrix = s.piece.matrix[0].map((_, i) => s.piece.matrix.map((row) => row[i]).reverse());
      const p = { ...s.piece, matrix };
      if (fits(s, p)) s.piece = p;
    }
    if (a.type === 'down') dropStep(s);
    if (a.type === 'drop') {
      while (fits(s, { ...s.piece, y: s.piece.y + 1 })) s.piece.y++;
      lockPiece(s);
      s.lastTick = now;
    }
  }
  if (e === 'reaction') {
    s.phase = now >= s.targetAt ? 'go' : 'wait';
    if (a.type === 'react') {
      if (now < s.targetAt) end(s, false, 'Слишком рано! Дождись зелёного сигнала.');
      else {
        s.hits.push(now - s.targetAt);
        s.score = Math.round(s.hits.reduce((a, b) => a + b, 0) / s.hits.length);
        if (s.hits.length === 3) end(s, true, 'Три сигнала пойманы. Молниеносно!');
        else {
          s.targetAt = now + 1600 + rand(2800);
          s.phase = 'wait';
        }
      }
    }
  }
  if (e === 'flappy' && a.type === 'tick') {
    const dt = Math.min((now - s.lastTick) / 1000, 0.15);
    if (dt < 0.04) return s;
    s.lastTick = now;
    if (a.flap === true) s.velocity = -160;
    s.velocity += 390 * dt;
    s.birdY += s.velocity * dt;
    if (now >= s.nextPipe) {
      s.pipes.push({ x: 340, top: 45 + rand(155), passed: false });
      s.nextPipe = now + 2100;
    }
    for (const p of s.pipes) {
      p.x -= 85 * dt;
      if (!p.passed && p.x + 45 < 60) {
        p.passed = true;
        s.passed++;
        s.score = s.passed;
      }
      if (p.x < 84 && p.x + 45 > 60 && (s.birdY - 11 < p.top || s.birdY + 11 > p.top + 142))
        end(s, false, 'Полёт окончен. В следующий раз — ещё дальше!');
    }
    s.pipes = s.pipes.filter((p) => p.x > -50);
    if (s.birdY < 10 || s.birdY > 390) end(s, false, 'Полёт окончен. Не забывай махать крыльями!');
    if (s.passed >= 10) end(s, true, 'Десять препятствий. Чистое небо!');
  }
  if (e === 'rps' && a.type === 'choose' && validIndex(a.choice, 3)) {
    const opponent = rand(3),
      result = a.choice === opponent ? 'draw' : (a.choice - opponent + 3) % 3 === 1 ? 'win' : 'lose';
    s.rounds.push({ yours: a.choice, opponent, result });
    if (result === 'win') s.wins++;
    s.score = s.wins;
    if (s.rounds.length === 5) end(s, s.wins >= 3, `${s.wins} побед из 5. Удача любит смелых!`);
  }
  if (e === '2048' && a.type === 'move' && directions[a.direction]) {
    const before = [...s.board];
    for (let line = 0; line < 4; line++) {
      const indices = Array.from({ length: 4 }, (_, i) =>
        a.direction === 'left'
          ? line * 4 + i
          : a.direction === 'right'
            ? line * 4 + 3 - i
            : a.direction === 'up'
              ? i * 4 + line
              : (3 - i) * 4 + line,
      );
      const values = indices.map((i) => s.board[i]).filter(Boolean),
        merged = [];
      for (let i = 0; i < values.length; i++) {
        if (values[i] === values[i + 1]) {
          merged.push(values[i] * 2);
          s.score += values[i] * 2;
          i++;
        } else merged.push(values[i]);
      }
      indices.forEach((idx, i) => (s.board[idx] = merged[i] || 0));
    }
    if (before.some((v, i) => v !== s.board[i])) {
      s.moves++;
      spawnTile(s);
    }
    s.best = Math.max(...s.board);
    if (s.best >= 2048) end(s, true, '2048! Легендарное объединение.');
    else if (
      !s.board.includes(0) &&
      !s.board.some((v, i) => (i % 4 < 3 && v === s.board[i + 1]) || (i < 12 && v === s.board[i + 4]))
    )
      end(s, false, 'Больше нет ходов. Рекорд сохранён!');
  }
  if (e === 'whack') {
    if (now >= s.targetUntil) {
      s.target = rand(9);
      s.targetUntil = now + 900;
      s.hit = false;
    }
    if (a.type === 'hit' && a.index === s.target && !s.hit) {
      s.hit = true;
      s.hits++;
      s.score = s.hits;
      if (s.hits >= 18) end(s, true, 'Богатый урожай! Все тыквы собраны.');
    }
  }
  if (e === 'quiz' && a.type === 'answer' && validIndex(a.choice, 4) && now - s.lastAnswer >= 500) {
    const q = s.questions[s.index];
    s.lastAnswer = now;
    s.answers.push({ question: q.text, correct: a.choice === q.answer, correctText: q.options[q.answer] });
    if (a.choice === q.answer) s.score++;
    s.index++;
    if (s.index >= 5) end(s, s.score >= 3, `${s.score} из 5 правильных ответов. Каждый вопрос — новый опыт!`);
  }
  if (e === 'sequence') {
    if (s.phase === 'show' && now >= s.showUntil) s.phase = 'input';
    if (a.type === 'tap' && s.phase === 'input' && validIndex(a.index, 4)) {
      if (a.index !== s.sequence[s.entered]) end(s, false, 'Ритм сбился. Но ты уже стал внимательнее!');
      else {
        s.entered++;
        if (s.entered === s.sequence.length) {
          s.completed++;
          s.score = s.completed;
          if (s.completed >= 7) end(s, true, 'Семь уровней! Феноменальная память.');
          else {
            s.sequence.push(rand(4));
            s.entered = 0;
            s.phase = 'show';
            s.showUntil = now + 1000 + s.sequence.length * 750;
          }
        }
      }
    }
  }
  if (
    e === 'guess' &&
    a.type === 'guess' &&
    Number.isInteger(a.number) &&
    a.number >= 1 &&
    a.number <= 100 &&
    !s.guesses.includes(a.number)
  ) {
    s.guesses.push(a.number);
    if (a.number === s.secret) {
      s.score = 8 - s.guesses.length;
      end(s, true, `Это ${s.secret}! Секрет раскрыт за ${s.guesses.length} попыток.`);
    } else {
      s.hint = a.number < s.secret ? `Моё число больше ${a.number}` : `Моё число меньше ${a.number}`;
      if (s.guesses.length >= 7) end(s, false, `Попытки закончились. Я загадал ${s.secret}.`);
    }
  }
  return s;
}
function neighbors(i) {
  const cells = [];
  const x = i % 6,
    y = Math.floor(i / 6);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if ((dx || dy) && x + dx >= 0 && x + dx < 6 && y + dy >= 0 && y + dy < 6)
        cells.push((y + dy) * 6 + x + dx);
  return cells;
}
function mineCount(s, i) {
  return neighbors(i).filter((n) => s.bombs.includes(n)).length;
}

// Only this projection crosses the network. Hidden boards, answers and targets remain server-side.
export function publicState(s, now = Date.now()) {
  const p = {
    engine: s.engine,
    startedAt: s.startedAt,
    expiresAt: s.expiresAt,
    score: s.score,
    finished: s.finished,
    version: s.version,
    won: s.won,
    message: s.message,
  };
  if (s.engine === 'mines')
    Object.assign(p, {
      cells: Array.from({ length: 36 }, (_, i) =>
        s.revealed.includes(i) ? mineCount(s, i) : s.finished && s.bombs.includes(i) ? 'mine' : null,
      ),
      flags: s.flags,
      remaining: 30 - s.revealed.length,
    });
  if (s.engine === 'memory')
    Object.assign(p, {
      cards: s.cards.map((v, i) => (s.matched.includes(i) || s.exposed.includes(i) || s.finished ? v : null)),
      matched: s.matched,
      moves: s.moves,
      hideAt: s.hideAt,
    });
  if (s.engine === 'snake')
    Object.assign(p, { snake: s.snake, food: s.food, apples: s.apples, direction: s.direction });
  if (s.engine === 'tetris')
    Object.assign(p, { board: s.board, piece: s.piece, next: s.next.matrix, lines: s.lines });
  if (s.engine === 'reaction') Object.assign(p, { phase: now >= s.targetAt ? 'go' : 'wait', hits: s.hits });
  if (s.engine === 'flappy') Object.assign(p, { birdY: s.birdY, pipes: s.pipes, passed: s.passed });
  if (s.engine === 'rps') Object.assign(p, { rounds: s.rounds, wins: s.wins });
  if (s.engine === '2048') Object.assign(p, { board: s.board, best: s.best, moves: s.moves });
  if (s.engine === 'whack') Object.assign(p, { target: s.hit ? -1 : s.target, hits: s.hits });
  if (s.engine === 'quiz') {
    const q = s.questions[s.index];
    Object.assign(p, {
      question: q ? { text: q.text, options: q.options } : null,
      index: s.index,
      answers: s.answers,
    });
  }
  if (s.engine === 'sequence')
    Object.assign(p, {
      sequence: now < s.showUntil ? s.sequence : [],
      phase: now < s.showUntil ? 'show' : 'input',
      showUntil: s.showUntil,
      entered: s.entered,
      completed: s.completed,
      length: s.sequence.length,
    });
  if (s.engine === 'guess') Object.assign(p, { guesses: s.guesses, hint: s.hint });
  return p;
}
export function rewardFor(s, maxReward, now = Date.now()) {
  let fraction = 0;
  switch (s.engine) {
    case 'mines':
      fraction = s.won ? 1 : 0;
      break;
    case 'memory':
      fraction = s.won
        ? Math.max(
            0.2,
            1 - Math.max(0, s.moves - 8) * 0.035 - Math.max(0, now - s.startedAt - 25000) / 300000,
          )
        : 0;
      break;
    case 'snake':
      fraction = s.apples / 18;
      break;
    case 'tetris':
      fraction = s.lines / 6;
      break;
    case 'reaction':
      fraction = s.hits.length === 3 ? Math.max(0.05, 1 - Math.max(0, s.score - 220) / 1100) : 0;
      break;
    case 'flappy':
      fraction = s.passed / 10;
      break;
    case 'rps':
      fraction = s.wins / 5;
      break;
    case '2048':
      fraction = s.best >= 16 ? Math.min(1, (Math.log2(s.best) - 3) / 8) : 0;
      break;
    case 'whack':
      fraction = s.hits / 18;
      break;
    case 'quiz':
      fraction = s.score / 5;
      break;
    case 'sequence':
      fraction = s.completed / 7;
      break;
    case 'guess':
      fraction = s.won ? (70 - (s.guesses.length - 1) * 8) / 70 : 0;
      break;
  }
  return Math.max(0, Math.min(maxReward, Math.floor(maxReward * fraction)));
}
