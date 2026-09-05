import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import {
  all,
  one,
  run,
  transaction,
  iso,
  hash,
  uid,
  token,
  settings,
  leaderboard,
  leaderboardPage,
  tickEvent,
  isEventActive,
  newCode,
  award,
  gameAvailability,
  userView,
  grantAchievements,
  finalizeEvent,
} from './db.js';
import { newGame, applyAction, publicState, rewardFor, ENGINE_IDS } from './engines.js';

const app = express();
const httpServer = createServer(app);
app.set('trust proxy', 1);
app.disable('x-powered-by');
// The Vite preview must never expose database files, source-only server files or secrets.
app.use((req, res, next) => {
  let path;
  try {
    path = decodeURIComponent(req.path);
  } catch {
    return res.sendStatus(400);
  }
  if (
    /(^|\/)(\.data|\.git|server|tests)(\/|$)/.test(path) ||
    /\.(key|pem|sqlite|sqlite-wal|sqlite-shm)$/.test(path)
  )
    return res.sendStatus(404);
  next();
});
app.use(express.json({ limit: '16kb' }));
const fail = (status, message) => Object.assign(new Error(message), { status });
const wrap = (fn) => (req, res, next) => {
  try {
    Promise.resolve(fn(req, res)).catch(next);
  } catch (e) {
    next(e);
  }
};
const cookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((v) => v.trim().split('='))
      .filter((p) => p.length === 2),
  );
const setCookie = (req, res, name, value, maxAge) => {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(name, value, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    partitioned: secure,
    maxAge,
    path: '/',
  });
};
const session = (req, admin = false) => {
  const value = cookies(req)[admin ? 'srp_admin' : 'srp_session'];
  if (!value) return null;
  return one(
    'SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > ? AND is_admin = ?',
    hash(value),
    Date.now(),
    admin ? 1 : 0,
  );
};
const requireUser = (req) => {
  const s = session(req);
  if (!s) throw fail(401, 'Войди в профиль, чтобы продолжить.');
  const u = one('SELECT * FROM users WHERE id = ?', s.user_id);
  if (!u) throw fail(401, 'Профиль не найден.');
  if (u.status !== 'active') throw fail(403, 'Профиль заблокирован. Свяжись с администрацией SRP.');
  return u;
};
const requireAdmin = (req) => {
  if (!session(req, true)) throw fail(401, 'Требуется вход администратора.');
};
const newAuth = (req, res, userId, admin = false) => {
  const old = cookies(req)[admin ? 'srp_admin' : 'srp_session'];
  if (old) run('DELETE FROM auth_sessions WHERE token_hash = ?', hash(old));
  const value = token(),
    age = admin ? 8 * 3600000 : 30 * 86400000;
  run('INSERT INTO auth_sessions VALUES (?,?,?,?)', hash(value), userId, admin ? 1 : 0, Date.now() + age);
  setCookie(req, res, admin ? 'srp_admin' : 'srp_session', value, age);
};
const audit = (action, details) =>
  run('INSERT INTO admin_audit VALUES (?,?,?,?)', uid(), action, JSON.stringify(details), iso());
const text = (v, min, max, label) => {
  if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max)
    throw fail(400, `${label}: от ${min} до ${max} символов.`);
  return v.trim();
};
const integer = (v, min, max, label) => {
  if (!Number.isSafeInteger(v) || v < min || v > max)
    throw fail(400, `${label}: целое число от ${min} до ${max}.`);
  return v;
};

mkdirSync(resolve('.data'), { recursive: true });
if (!process.env.SRP_ADMIN_KEY && !existsSync(resolve('.data/admin.key')))
  writeFileSync(resolve('.data/admin.key'), token(), { mode: 0o600 });
const adminKey = process.env.SRP_ADMIN_KEY || readFileSync(resolve('.data/admin.key'), 'utf8').trim();

app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 1800,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Слишком много запросов. Подожди минуту.' },
  }),
);
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (!req.is('application/json')) return res.status(415).json({ error: 'Ожидается JSON.' });
    const origin = req.get('origin');
    if (origin) {
      try {
        const host = new URL(origin).host;
        if (host !== req.get('host') && host !== req.get('x-forwarded-host'))
          return res.status(403).json({ error: 'Недопустимый источник запроса.' });
      } catch {
        return res.status(403).json({ error: 'Недопустимый источник запроса.' });
      }
    }
  }
  try {
    tickEvent();
    next();
  } catch (e) {
    next(e);
  }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуй через 15 минут.' },
});
app.use('/api/auth', authLimiter);
app.post(
  '/api/admin/login',
  authLimiter,
  wrap((req, res) => {
    const provided = typeof req.body.key === 'string' ? req.body.key : '';
    if (!timingSafeEqual(Buffer.from(hash(provided)), Buffer.from(hash(adminKey))))
      throw fail(401, 'Неверный ключ администратора.');
    newAuth(req, res, null, true);
    res.json({ ok: true });
  }),
);
app.post(
  '/api/auth/register',
  wrap((req, res) => {
    if (settings().event_status === 'finished') throw fail(403, 'Ивент завершён. Регистрация закрыта.');
    const nickname = text(req.body.nickname, 2, 24, 'Никнейм');
    const rawUsername =
      typeof req.body.username === 'string' ? req.body.username.trim().replace(/^@/, '') : req.body.username;
    const username = text(rawUsername, 2, 32, 'Username').toLowerCase();
    if (!/^[a-z0-9_.]{2,32}$/.test(username) || username.includes('..'))
      throw fail(400, 'Username: латинские буквы, цифры, точка или подчёркивание.');
    const discordId = String(req.body.discord_id || '').trim();
    if (!/^\d{17,20}$/.test(discordId)) throw fail(400, 'Discord ID должен содержать от 17 до 20 цифр.');
    if (req.body.rules !== true) throw fail(400, 'Для участия нужно принять правила ивента.');
    if (one('SELECT id FROM users WHERE discord_username = ? OR discord_id = ?', username, discordId))
      throw fail(409, 'Этот Discord-аккаунт уже участвует. Войди с личным кодом и ключом восстановления.');
    const id = uid(),
      recovery = token();
    transaction(() =>
      run(
        'INSERT INTO users (id,discord_nickname,discord_username,discord_id,participant_code,recovery_hash,created_at) VALUES (?,?,?,?,?,?,?)',
        id,
        nickname,
        username,
        discordId,
        newCode(),
        hash(recovery),
        iso(),
      ),
    );
    newAuth(req, res, id);
    res.status(201).json({ user: userView(id, true), recovery_key: recovery });
  }),
);
app.post(
  '/api/auth/login',
  wrap((req, res) => {
    const code = String(req.body.code || '')
        .trim()
        .toUpperCase(),
      key = String(req.body.key || '');
    const u = one('SELECT * FROM users WHERE participant_code = ?', code);
    const targetHash = u?.recovery_hash || hash('unavailable');
    if (!timingSafeEqual(Buffer.from(hash(key)), Buffer.from(targetHash)) || !u)
      throw fail(401, 'Код или ключ восстановления не совпадают.');
    newAuth(req, res, u.id);
    res.json({ user: userView(u.id, true) });
  }),
);
app.post(
  '/api/auth/logout',
  wrap((req, res) => {
    const v = cookies(req).srp_session;
    if (v) run('DELETE FROM auth_sessions WHERE token_hash = ?', hash(v));
    setCookie(req, res, 'srp_session', '', 0);
    res.json({ ok: true });
  }),
);
app.get(
  '/api/bootstrap',
  wrap((req, res) => {
    const s = session(req),
      user = s ? userView(s.user_id, true) : null;
    const event = settings();
    res.json({
      event,
      user,
      games: all('SELECT * FROM games WHERE enabled = 1').map((g) => ({
        ...g,
        ...gameAvailability(user?.id, g.id),
      })),
      leaderboard: leaderboard().slice(0, 100),
      total_players: one("SELECT COUNT(*) as count FROM users WHERE status = 'active'").count,
      server_time: Date.now(),
    });
  }),
);
app.get(
  '/api/leaderboard',
  wrap((req, res) => res.json(leaderboardPage(req.query.q, req.query.page, req.query.limit))),
);
app.get(
  '/api/me',
  wrap((req, res) => {
    const s = session(req);
    if (!s) throw fail(401, 'Войди в профиль.');
    res.json(userView(s.user_id, true));
  }),
);

app.post(
  '/api/games/:id/start',
  wrap((req, res) => {
    const u = requireUser(req);
    if (!isEventActive()) throw fail(403, 'Сейчас ивент не активен. Новые награды недоступны.');
    const g = one('SELECT * FROM games WHERE id = ? AND enabled = 1', req.params.id);
    if (!g) throw fail(404, 'Игра временно недоступна.');
    const availability = gameAvailability(u.id, g.id);
    if (!availability.attempts_left)
      throw fail(429, 'На сегодня все 5 попыток использованы. Выбери другую игру!');
    if (availability.cooldown_until)
      throw fail(
        429,
        `Следующая попытка через ${Math.ceil((availability.cooldown_until - Date.now()) / 1000)} сек.`,
      );
    // Resume an existing round, including after refreshing or switching between tabs.
    const existing = one(
      'SELECT * FROM game_sessions WHERE user_id = ? AND finished_at IS NULL ORDER BY created_at DESC LIMIT 1',
      u.id,
    );
    if (existing && existing.game_id === g.id) {
      const state = JSON.parse(existing.state);
      if (state.expiresAt > Date.now()) return res.json({ id: existing.id, state: publicState(state) });
      // An expired round must be finalized instead of silently dropping an earned result.
      applyAction(state, { type: 'tick' });
      state.version++;
      const result = finishRound(existing, state);
      return res.json({ id: existing.id, state: publicState(state), result });
    }
    if (existing) {
      const previous = JSON.parse(existing.state);
      applyAction(previous, { type: 'finish' });
      previous.version++;
      finishRound(existing, previous);
    }
    const id = uid(),
      state = newGame(g.engine);
    run(
      'INSERT INTO game_sessions (id,user_id,game_id,state,max_reward,created_at) VALUES (?,?,?,?,?,?)',
      id,
      u.id,
      g.id,
      JSON.stringify(state),
      g.max_reward,
      iso(),
    );
    res.status(201).json({ id, state: publicState(state) });
  }),
);
function finishRound(row, state) {
  return transaction(() => {
    const existing = one('SELECT * FROM game_results WHERE session_id = ?', row.id);
    if (existing) return { coins: existing.coins_earned, bonus: 0, score: existing.score };
    const g = one('SELECT * FROM games WHERE id = ?', row.game_id);
    const available = gameAvailability(row.user_id, row.game_id);
    const amount =
      isEventActive() && g.enabled && available.attempts_left > 0 ? rewardFor(state, row.max_reward) : 0;
    run(
      'INSERT INTO game_results VALUES (?,?,?,?,?,?,?)',
      uid(),
      row.id,
      row.user_id,
      row.game_id,
      Math.round(state.score || 0),
      amount,
      iso(),
    );
    if (amount) award(row.user_id, amount, `Мини-игра · ${g.name}`);
    const bonus = isEventActive() ? grantAchievements(row.user_id) : 0;
    run(
      'UPDATE game_sessions SET state = ?, finished_at = ? WHERE id = ?',
      JSON.stringify(state),
      iso(),
      row.id,
    );
    return { coins: amount, bonus, score: state.score };
  });
}
app.post(
  '/api/sessions/:id/action',
  wrap((req, res) => {
    const u = requireUser(req);
    const row = one('SELECT * FROM game_sessions WHERE id = ? AND user_id = ?', req.params.id, u.id);
    if (!row) throw fail(404, 'Раунд не найден.');
    const state = JSON.parse(row.state);
    if (row.finished_at) {
      const result = one('SELECT coins_earned,score FROM game_results WHERE session_id = ?', row.id);
      return res.json({
        id: row.id,
        state: publicState(state),
        result: result ? { coins: result.coins_earned, score: result.score, bonus: 0 } : null,
      });
    }
    if (req.body.version !== state.version)
      return res.status(409).json({ error: 'Раунд обновлён в другой вкладке.', state: publicState(state) });
    if (req.body.action?.type === 'tick' && state.lastAction && Date.now() - state.lastAction < 25)
      throw fail(429, 'Действия слишком частые.');
    if (!isEventActive()) applyAction(state, { type: 'finish' });
    else applyAction(state, req.body.action);
    state.version++;
    state.lastAction = Date.now();
    let result = null;
    if (state.finished) result = finishRound(row, state);
    else run('UPDATE game_sessions SET state = ? WHERE id = ?', JSON.stringify(state), row.id);
    res.json({ id: row.id, state: publicState(state), result });
  }),
);

app.use('/api/admin', (req, _res, next) => {
  try {
    requireAdmin(req);
    next();
  } catch (e) {
    next(e);
  }
});
app.get(
  '/api/admin/data',
  wrap((_req, res) =>
    res.json({
      users: all(
        'SELECT id,discord_nickname,discord_username,discord_id,participant_code,coins,created_at,status FROM users ORDER BY created_at DESC',
      ),
      games: all('SELECT * FROM games'),
      event: settings(),
      results: all(
        'SELECT r.*,u.discord_nickname,g.name as game_name FROM game_results r JOIN users u ON u.id = r.user_id JOIN games g ON g.id = r.game_id ORDER BY r.created_at DESC LIMIT 200',
      ),
      transactions: all(
        'SELECT t.*,u.discord_nickname FROM coin_transactions t JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 200',
      ),
      audit: all('SELECT * FROM admin_audit ORDER BY created_at DESC LIMIT 100'),
    }),
  ),
);
app.post(
  '/api/admin/logout',
  wrap((req, res) => {
    const v = cookies(req).srp_admin;
    if (v) run('DELETE FROM auth_sessions WHERE token_hash = ?', hash(v));
    setCookie(req, res, 'srp_admin', '', 0);
    res.json({ ok: true });
  }),
);
app.post(
  '/api/admin/users/:id/coins',
  wrap((req, res) => {
    if (settings().event_status === 'finished')
      throw fail(403, 'Итоговый рейтинг зафиксирован. Балансы больше не изменяются.');
    const u = one('SELECT * FROM users WHERE id = ?', req.params.id);
    if (!u) throw fail(404, 'Участник не найден.');
    const amount = integer(req.body.amount, -1000000, 1000000, 'Корректировка');
    const reason = text(req.body.reason, 3, 160, 'Причина');
    if (!amount || u.coins + amount < 0 || u.coins + amount > 100000000)
      throw fail(400, 'Недопустимый итоговый баланс.');
    transaction(() => {
      award(u.id, amount, `Администратор · ${reason}`, 'administrator');
      audit('coins.adjust', { user_id: u.id, amount, reason });
    });
    res.json({ user: userView(u.id, true) });
  }),
);
app.patch(
  '/api/admin/users/:id/status',
  wrap((req, res) => {
    if (!['active', 'blocked'].includes(req.body.status)) throw fail(400, 'Недопустимый статус.');
    if (!one('SELECT id FROM users WHERE id = ?', req.params.id)) throw fail(404, 'Участник не найден.');
    if (settings().event_status === 'finished') throw fail(403, 'Итоговый рейтинг зафиксирован.');
    transaction(() => {
      run('UPDATE users SET status = ? WHERE id = ?', req.body.status, req.params.id);
      audit('user.status', { id: req.params.id, status: req.body.status });
    });
    res.json({ ok: true });
  }),
);
app.get(
  '/api/admin/users/:id',
  wrap((req, res) => {
    const user = userView(req.params.id, true);
    if (!user) throw fail(404, 'Участник не найден.');
    res.json(user);
  }),
);
app.patch(
  '/api/admin/games/:id',
  wrap((req, res) => {
    const g = one('SELECT * FROM games WHERE id = ?', req.params.id);
    if (!g) throw fail(404, 'Игра не найдена.');
    const name = req.body.name !== undefined ? text(req.body.name, 2, 40, 'Название') : g.name;
    const description =
      req.body.description !== undefined ? text(req.body.description, 4, 150, 'Описание') : g.description;
    const max =
      req.body.max_reward !== undefined
        ? integer(req.body.max_reward, 1, 1000, 'Максимальная награда')
        : g.max_reward;
    const enabled = req.body.enabled !== undefined ? (req.body.enabled ? 1 : 0) : g.enabled;
    transaction(() => {
      run(
        'UPDATE games SET name = ?, description = ?, max_reward = ?, enabled = ? WHERE id = ?',
        name,
        description,
        max,
        enabled,
        g.id,
      );
      audit('game.update', { id: g.id, name, max, enabled });
    });
    res.json({ ok: true });
  }),
);
app.post(
  '/api/admin/games',
  wrap((req, res) => {
    const engine = req.body.engine;
    if (!ENGINE_IDS.includes(engine)) throw fail(400, 'Выбери поддерживаемый игровой движок.');
    const base = one('SELECT * FROM games WHERE id = ?', engine);
    const name = text(req.body.name, 2, 40, 'Название'),
      description = text(req.body.description, 4, 150, 'Описание');
    const max = integer(req.body.max_reward, 1, 1000, 'Максимальная награда'),
      id = 'custom-' + uid().slice(0, 8);
    transaction(() => {
      run(
        'INSERT INTO games VALUES (?,?,?,?,?,?,?,?,?,?)',
        id,
        engine,
        name,
        description,
        max,
        1,
        base.category,
        base.difficulty,
        base.accent,
        'НОВИНКА',
      );
      audit('game.create', { id, engine, name });
    });
    res.status(201).json({ id });
  }),
);
app.patch(
  '/api/admin/settings',
  wrap((req, res) => {
    const s = settings();
    if (s.event_status === 'finished') throw fail(403, 'Завершённый ивент нельзя редактировать.');
    const name = text(req.body.event_name ?? s.event_name, 3, 50, 'Название');
    const start = req.body.start_date ?? s.start_date,
      end = req.body.end_date ?? s.end_date;
    if (
      !Number.isFinite(Date.parse(start)) ||
      !Number.isFinite(Date.parse(end)) ||
      Date.parse(end) <= Date.parse(start)
    )
      throw fail(400, 'Проверь даты начала и окончания.');
    const status = req.body.event_status ?? s.event_status;
    if (!['active', 'paused', 'scheduled'].includes(status))
      throw fail(400, 'Для завершения используй отдельную кнопку фиксации рейтинга.');
    const rewards = req.body.rewards ?? s.rewards;
    if (!Array.isArray(rewards) || rewards.length !== 5) throw fail(400, 'Укажи награды для пяти мест.');
    const cleaned = rewards.map((r, i) => ({
      place: i + 1,
      title: text(r.title, 2, 60, 'Название награды'),
      items:
        Array.isArray(r.items) && r.items.length > 0 && r.items.length <= 5
          ? r.items.map((x) => text(x, 2, 100, 'Награда'))
          : (() => {
              throw fail(400, 'Укажи от 1 до 5 наград.');
            })(),
    }));
    transaction(() => {
      run(
        'UPDATE event_settings SET event_name = ?,start_date = ?,end_date = ?,event_status = ?,rewards = ? WHERE id = 1',
        name,
        new Date(start).toISOString(),
        new Date(end).toISOString(),
        status,
        JSON.stringify(cleaned),
      );
      audit('event.update', { name, start, end, status });
    });
    tickEvent();
    res.json({ event: settings() });
  }),
);
app.post(
  '/api/admin/finalize',
  wrap((req, res) => {
    if (req.body.confirm !== 'FINISH') throw fail(400, 'Подтверди необратимое завершение ивента.');
    res.json({ event: finalizeEvent() });
  }),
);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Запрос не найден.' }));
app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  res
    .status(status)
    .json({ error: status >= 500 ? 'Не удалось выполнить запрос. Попробуй ещё раз.' : err.message });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', allowedHosts: true, hmr: { server: httpServer } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
httpServer.listen(port, '0.0.0.0', () =>
  console.log(
    `SRP EVENT is ready on http://0.0.0.0:${port}\nAdmin access: /admin (key in .data/admin.key, or SRP_ADMIN_KEY environment variable)`,
  ),
);
setInterval(() => {
  try {
    tickEvent();
    run('DELETE FROM auth_sessions WHERE expires_at < ?', Date.now());
  } catch (e) {
    console.error('Event lifecycle:', e.message);
  }
}, 30000).unref();
