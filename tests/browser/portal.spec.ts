import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const key = process.env.SRP_TEST_ADMIN_KEY || 'browser-test-key-not-for-production-7f963aac';
async function capture(page: Page, path: string) {
  if (process.env.CAPTURE_SCREENSHOTS)
    await page.screenshot({ path, fullPage: true, animations: 'disabled', timeout: 15000 });
}
const unique = () => `${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
async function register(page: Page, nickname = 'Осенний игрок', beforeSubmit?: () => Promise<void>) {
  const suffix = unique();
  await page.goto('/');
  await page.getByLabel('Никнейм в Discord', { exact: true }).fill(nickname);
  await page.getByLabel('Username в Discord', { exact: true }).fill('autumn_' + suffix);
  await page.getByRole('textbox', { name: 'Discord ID', exact: true }).fill(('123' + suffix).slice(0, 19));
  await page.locator('input[name=rules]').check();
  await beforeSubmit?.();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/auth/register')),
    page.getByRole('button', { name: 'Создать профиль', exact: true }).click(),
  ]);
  expect(response.status()).toBe(201);
  const result = await response.json();
  await expect(page.getByRole('dialog', { name: 'Ты в игре. Добро пожаловать!' })).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('button', { name: 'Открыть профиль' })).toBeDisabled();
  await page.getByLabel('Я сохранил ключ в безопасном месте').check();
  await page.getByRole('button', { name: 'Открыть профиль' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.locator('.profile-name h2')).toHaveText(nickname);
  await expect(page.locator('.profile-name p')).toHaveText('@' + result.user.discord_username);
  await expect(page.locator('.profile-meta')).toContainText(result.user.participant_code);
  await expect(page.locator('.profile-meta code')).toHaveText(result.user.discord_id);
  await expect(page.locator('.profile-balance h2')).toHaveText('0 COINS');
  await expect(page.locator('.profile-balance-bottom')).toContainText('#' + result.user.rank);
  await expect(page.locator('.profile-stat-grid > div')).toHaveCount(4);
  await expect(page.locator('.achievements-grid .achievement-card')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'История коинов', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Лучшие результаты', exact: true })).toBeVisible();
  return result;
}
const answers: Record<string, string> = {
  'Почему осенью листья меняют цвет?': 'Разрушается хлорофилл',
  'Сколько клеток на классической шахматной доске?': '64',
  'Что означает GG в игровом чате?': 'Good Game',
  'Какое число получится при объединении двух плиток 128 в 2048?': '256',
  'Какая птица обычно улетает на юг осенью?': 'Ласточка',
  'Из скольких квадратов состоит одна фигура в классическом тетрисе?': '4',
  'Что нужно сделать перед использованием найденного бага?': 'Рассказать администратору',
  'Какое дерево сбрасывает хвою осенью?': 'Лиственница',
  'Что обозначает число на открытой клетке сапёра?': 'Мины по соседству',
  'Какой месяц завершает календарную осень?': 'Ноябрь',
};

test('registration opens the complete profile even when refresh fails and an old guest response arrives', async ({
  page,
}) => {
  let holdGuest = false;
  let authenticated = false;
  let guestReady!: () => void;
  let releaseGuest!: () => void;
  const guestIsReady = new Promise<void>((resolve) => {
    guestReady = resolve;
  });
  const guestReleased = new Promise<void>((resolve) => {
    releaseGuest = resolve;
  });
  await page.route('**/api/bootstrap', async (route) => {
    if (authenticated) {
      await route.fulfill({ status: 503, json: { error: 'Обновление статистики временно недоступно.' } });
    } else if (holdGuest) {
      const response = await route.fetch();
      guestReady();
      await guestReleased;
      await route.fulfill({ response });
    } else {
      await route.continue();
    }
  });
  await page.route('**/api/auth/register', async (route) => {
    const response = await route.fetch();
    authenticated = true;
    await route.fulfill({ response });
  });
  try {
    const account = await register(page, 'Мой полный профиль', async () => {
      holdGuest = true;
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await guestIsReady;
    });
    await expect(page.locator('.connection-banner')).toBeVisible();
    const delayed = page.waitForResponse((r) => r.url().endsWith('/api/bootstrap') && r.status() === 200);
    releaseGuest();
    await (await delayed).finished();
    // A later failed refresh must not erase the authenticated profile or resurrect the guest response.
    const retried = page.waitForResponse((r) => r.url().endsWith('/api/bootstrap') && r.status() === 503);
    await page.locator('.connection-banner').getByRole('button', { name: 'Повторить' }).click();
    await (await retried).finished();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('.profile-name h2')).toHaveText('Мой полный профиль');
    await expect(page.locator('.profile-meta')).toContainText(account.user.participant_code);
    await expect(page.locator('.profile-balance h2')).toHaveText('0 COINS');
    expect((await (await page.request.get('/api/me')).json()).id).toBe(account.user.id);
  } finally {
    releaseGuest();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('registration gate, real coin award, profile history, persistent login and anti-forgery', async ({
  page,
  context,
}) => {
  await page.goto('/games');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#join-form')).toBeVisible();
  const account = await register(page, 'Листопад');
  expect(account.user.participant_code).toMatch(/^SRP-[0-9A-Z]{3}$/);
  const cookie = (await context.cookies()).find((c) => c.name === 'srp_session');
  expect(cookie?.httpOnly).toBeTruthy();
  await page.goto('/games');
  await page.getByLabel('Поиск игр').fill('Реакция');
  await expect(page.locator('.game-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Очистить поиск' }).click();
  await page.getByRole('button', { name: 'Аркады', exact: true }).click();
  await expect(page.locator('.game-card')).toHaveCount(3);
  await page.goto('/play/quiz');
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  let final: any;
  for (let i = 0; i < 5; i++) {
    const question = await page.locator('.quiz-game>h2').innerText();
    const answer = answers[question];
    expect(answer).toBeTruthy();
    await page.waitForTimeout(550);
    const [response] = await Promise.all([
      page.waitForResponse(async (r) => {
        if (!r.url().includes('/action') || r.request().method() !== 'POST') return false;
        return (await r.json()).state?.index === i + 1;
      }),
      page.locator('.quiz-options button').filter({ hasText: answer }).click(),
    ]);
    final = await response.json();
  }
  await expect(page.locator('.game-result')).toBeVisible();
  expect(final.result.coins).toBe(100);
  expect(final.result.bonus).toBe(25);
  await expect(page.locator('.result-coins')).toContainText('+100');
  await capture(page, '.data/screenshots/result-desktop.png');
  expect((await page.request.post('/api/games/quiz/start', { data: {} })).status()).toBe(429);
  const me = await (await page.request.get('/api/me')).json();
  expect(me.coins).toBe(125);
  expect(me.transactions).toHaveLength(2);
  const replay = await page.request.post(`/api/sessions/${final.id}/action`, {
    data: { version: 0, action: { type: 'finish', coins: 999999, score: 999999 } },
  });
  expect(replay.ok()).toBeTruthy();
  expect((await (await page.request.get('/api/me')).json()).coins).toBe(125);
  await page.goto('/profile');
  await expect(page.locator('.profile-balance h2')).toContainText('125');
  await expect(page.locator('.transactions')).toContainText('Мини-игра · Осенний квиз');
  await page.evaluate(() => localStorage.setItem('coins', '999999'));
  await page.reload();
  await expect(page.locator('.profile-balance h2')).toContainText('125');
  await capture(page, '.data/screenshots/profile-desktop.png');
  expect((await page.request.get('/api/admin/data')).status()).toBe(401);
  expect(
    (
      await page.request.post('/api/games/mines/start', {
        headers: { origin: 'https://untrusted.invalid' },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const wrong = await page.request.post('/api/auth/login', {
    data: { code: account.user.participant_code, key: 'not-the-secret' },
  });
  expect(wrong.status()).toBe(401);
  await page.getByRole('button', { name: 'Выйти из профиля' }).click();
  await expect(page.locator('#join-form')).toBeVisible();
  await page.getByRole('button', { name: 'Войти в профиль', exact: true }).click();
  await page.getByLabel('Личный код', { exact: true }).fill(account.user.participant_code);
  await page.getByLabel('Ключ восстановления', { exact: true }).fill(account.recovery_key);
  await page.getByRole('button', { name: 'Войти в профиль', exact: true }).click();
  await expect(page.locator('.overview-balance')).toContainText('125');
  await page.goto('/leaderboard');
  await expect(page.locator('tr.current-player')).toContainText('Листопад');
  await capture(page, '.data/screenshots/leaderboard-desktop.png');
  for (const path of [
    '/.data/admin.key',
    '/.data/event.sqlite',
    '/@fs/home/user/SRP-EVENT-SITE/.data/admin.key',
  ])
    expect((await page.request.get(path)).status()).toBe(404);
});

test('all twelve game interfaces work, including touch controls', async ({ page }) => {
  test.setTimeout(120000);
  await register(page, 'Тест мини-игр');
  const ids = [
    'mines',
    'memory',
    'tetris',
    'snake',
    'reaction',
    'flappy',
    'rps',
    '2048',
    'whack',
    'sequence',
    'guess',
  ];
  for (const id of ids) {
    await page.goto(`/play/${id}`);
    await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
    await expect(page.locator('.game-live')).toBeVisible();
    if (id === 'mines') {
      await expect(page.locator('.mine-cell')).toHaveCount(36);
      await page.locator('.mine-cell').first().click();
      await expect(page.locator('.mine-cell.revealed').first()).toBeVisible();
      await capture(page, '.data/screenshots/mines-desktop.png');
    }
    if (id === 'memory') {
      await expect(page.locator('.memory-card')).toHaveCount(16);
      await page.locator('.memory-card').first().click();
      await expect(page.locator('.memory-card.flipped')).toHaveCount(1);
    }
    if (id === 'tetris') {
      await expect(page.locator('.tetris-cell')).toHaveCount(160);
      await page.getByRole('button', { name: 'Повернуть', exact: true }).click();
      await page.keyboard.press('Space');
    }
    if (id === 'snake') {
      await expect(page.locator('.snake-board')).toBeVisible();
      await page.getByRole('button', { name: 'Вверх', exact: true }).click();
    }
    if (id === 'reaction') {
      await page.getByRole('button', { name: 'Жди зелёного сигнала' }).click();
      await expect(page.locator('.game-result')).toContainText('Слишком рано');
    }
    if (id === 'flappy') {
      await expect(page.locator('.flappy-board')).toBeVisible();
      await page.getByRole('button', { name: 'Махнуть крыльями' }).click();
    }
    if (id === 'rps') {
      await page.locator('.rps-choices button').first().click();
      await expect(page.locator('.rps-last')).toBeVisible();
    }
    if (id === '2048') {
      await expect(page.locator('.number-tile')).toHaveCount(16);
      await page.keyboard.press('ArrowLeft');
      await capture(page, '.data/screenshots/2048-desktop.png');
    }
    if (id === 'whack') {
      await page.locator('.has-pumpkin').click();
      await expect(page.locator('.board-meta')).toContainText('1 / 18');
    }
    if (id === 'sequence') {
      await expect(page.locator('.sequence-title')).toHaveText('Теперь твоя очередь.');
      await page.getByRole('button', { name: 'Янтарь', exact: true }).click();
    }
    if (id === 'guess') {
      await page.getByLabel('Твоя догадка от 1 до 100').fill('50');
      await page.getByRole('button', { name: 'Проверить', exact: true }).click();
      await expect(page.locator('.guess-history,.game-result')).toContainText(/50|раунд/);
    }
  }
  await page.goto('/');
  await capture(page, '.data/screenshots/dashboard-desktop.png');
  await page.goto('/games');
  await expect(page.locator('.game-card')).toHaveCount(12);
  await capture(page, '.data/screenshots/games-desktop.png');
});

test('mobile registration, menus, profile, game controls and every page fit the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await capture(page, '.data/screenshots/registration-mobile-final.png');
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await expect(page.locator('.main-nav')).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть меню' }).click();
  await register(page, 'Осень в кармане');
  for (const path of ['/', '/games', '/leaderboard', '/rewards', '/info', '/profile', '/play/mines']) {
    await page.goto(path);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await expect(page.locator('h1')).toBeVisible();
    await capture(page, `.data/screenshots/mobile-${path.replaceAll('/', '_') || 'home'}.png`);
  }
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  await page.getByRole('button', { name: 'Флажок', exact: true }).click();
  await page.locator('.mine-cell').first().click();
  await expect(page.locator('.mine-cell').first()).toHaveAccessibleName(/флаг/);
  await capture(page, '.data/screenshots/mines-mobile.png');
});

test('a scheduled season opens the new profile, displays UTC dates and refuses early earnings', async ({
  browser,
  request,
}) => {
  const original = (await (await request.get('/api/bootstrap')).json()).event;
  expect((await request.post('/api/admin/login', { data: { key } })).ok()).toBeTruthy();
  const start = new Date(Date.now() + 2 * 86400000);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 14 * 86400000);
  const page = await browser.newPage({
    baseURL: 'http://127.0.0.1:3001',
    timezoneId: 'America/Los_Angeles',
  });
  try {
    expect(
      (
        await request.patch('/api/admin/settings', {
          data: { start_date: start.toISOString(), end_date: end.toISOString(), event_status: 'scheduled' },
        })
      ).ok(),
    ).toBeTruthy();
    await register(page, 'Участник до старта');
    await page.goto('/');
    await expect(page.locator('.dashboard-hero-note')).toContainText('Старт —');
    await page.goto('/info');
    await expect(page.locator('.event-calendar')).toContainText('Завершение ивента');
    await expect(page.locator('.event-calendar strong')).toHaveCount(2);
    for (const boundary of await page.locator('.event-calendar strong').all()) {
      await expect(boundary).toContainText('00:00 UTC');
    }
    await page.goto('/play/guess');
    await expect(page.getByRole('button', { name: 'Ивент сейчас не активен' })).toBeDisabled();
    expect((await page.request.post('/api/games/guess/start', { data: {} })).status()).toBe(403);
    const participant = await (await page.request.get('/api/me')).json();
    expect(participant.coins).toBe(0);
    expect(participant.transactions).toHaveLength(0);
  } finally {
    expect(
      (
        await request.patch('/api/admin/settings', {
          data: {
            start_date: original.start_date,
            end_date: original.end_date,
            event_status: original.event_status,
          },
        })
      ).ok(),
    ).toBeTruthy();
    await page.close();
  }
});

test('admin controls, audit trail, blocking, rewards, pause and immutable final results', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const user = await register(page, 'Победитель теста');
  const admin = await browser.newPage({ baseURL: 'http://127.0.0.1:3001' });
  await admin.goto('/admin');
  await admin.getByLabel('Ключ администратора', { exact: true }).fill(key);
  await admin.getByRole('button', { name: 'Войти в панель' }).click();
  await expect(admin.getByRole('heading', { name: 'Управление ивентом.' })).toBeVisible();
  await admin.getByRole('button', { name: 'Изменить коины Победитель теста', exact: true }).click();
  await admin.getByLabel('Корректировка COINS').fill('500');
  await admin.getByLabel('Причина — попадёт в историю участника').fill('Специальное задание');
  await admin.getByRole('button', { name: 'Сохранить корректировку' }).click();
  await expect(admin.getByRole('dialog')).toHaveCount(0);
  expect((await (await page.request.get('/api/me')).json()).coins).toBe(500);
  await admin.getByRole('button', { name: 'Заблокировать Победитель теста', exact: true }).click();
  await admin.getByRole('button', { name: 'Подтвердить', exact: true }).click();
  await expect(admin.getByRole('dialog')).toHaveCount(0);
  expect((await page.request.post('/api/games/guess/start', { data: {} })).status()).toBe(403);
  await admin.getByRole('button', { name: 'Разблокировать Победитель теста', exact: true }).click();
  await admin.getByRole('button', { name: 'Подтвердить', exact: true }).click();
  await expect(admin.getByRole('dialog')).toHaveCount(0);
  await admin.getByRole('button', { name: 'Игры', exact: true }).click();
  await admin.getByRole('button', { name: 'Добавить игру', exact: true }).click();
  await admin.getByLabel('Игровой движок').selectOption('guess');
  await admin.getByLabel('Название', { exact: true }).fill('Секретный урожай');
  await admin.getByLabel('Описание', { exact: true }).fill('Дополнительная игра осеннего сезона');
  await admin.getByLabel('Максимальная награда').fill('60');
  await admin.getByRole('button', { name: 'Сохранить игру' }).click();
  await expect(admin.getByRole('dialog')).toHaveCount(0);
  await expect(admin.locator('.admin-game-list>div')).toHaveCount(13);
  await admin.getByRole('switch', { name: 'Включить Секретный урожай' }).click();
  await expect(admin.getByRole('switch', { name: 'Включить Секретный урожай' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await admin.getByRole('button', { name: 'Награды', exact: true }).click();
  await admin.getByLabel('Название', { exact: true }).first().fill('Осенний чемпион');
  await admin.getByRole('button', { name: 'Сохранить награды' }).click();
  await page.goto('/rewards');
  await expect(page.locator('.reward-1 h2')).toHaveText('Осенний чемпион');
  await admin.getByRole('button', { name: 'Настройки', exact: true }).click();
  await admin.getByRole('combobox', { name: 'Статус', exact: true }).selectOption('paused');
  await admin.getByRole('button', { name: 'Сохранить настройки' }).click();
  await expect
    .poll(async () => (await (await page.request.get('/api/bootstrap')).json()).event.event_status)
    .toBe('paused');
  expect((await page.request.post('/api/games/guess/start', { data: {} })).status()).toBe(403);
  await admin.getByRole('combobox', { name: 'Статус', exact: true }).selectOption('active');
  await admin.getByRole('button', { name: 'Сохранить настройки' }).click();
  await expect
    .poll(async () => (await (await page.request.get('/api/bootstrap')).json()).event.event_status)
    .toBe('active');
  await admin.getByRole('button', { name: 'Участники', exact: true }).click();
  await capture(admin, '.data/screenshots/admin-desktop.png');
  await admin.getByRole('button', { name: 'Настройки', exact: true }).click();
  await admin.getByRole('button', { name: 'Завершить ивент', exact: true }).click();
  await admin.getByLabel('Введи FINISH для подтверждения').fill('FINISH');
  await admin.getByRole('button', { name: 'Зафиксировать итоги' }).click();
  await expect(admin.getByRole('dialog')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SRP EVENT завершён.' })).toBeVisible();
  const snapshot = await (await page.request.get('/api/leaderboard')).json();
  expect(snapshot.finalized).toBeTruthy();
  expect(snapshot.players[0].id).toBe(user.user.id);
  expect((await page.request.post('/api/games/guess/start', { data: {} })).status()).toBe(403);
  expect(
    (
      await admin.request.post(`/api/admin/users/${user.user.id}/coins`, {
        data: { amount: 10, reason: 'Too late' },
      })
    ).status(),
  ).toBe(403);
  expect(await (await page.request.get('/api/leaderboard')).json()).toEqual(snapshot);
  await capture(page, '.data/screenshots/final-desktop.png');
  await page.request.post('/api/auth/logout', { data: {} });
  await page.goto('/');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Личный код', { exact: true }).fill(user.user.participant_code);
  await page.getByLabel('Ключ восстановления', { exact: true }).fill(user.recovery_key);
  await page.getByRole('button', { name: 'Войти в профиль', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'SRP EVENT завершён.' })).toBeVisible();
  expect((await (await page.request.get('/api/me')).json()).id).toBe(user.user.id);
  await admin.close();
});
