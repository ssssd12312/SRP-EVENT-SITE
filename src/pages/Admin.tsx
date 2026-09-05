import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  ChevronRight,
  Coins,
  Download,
  Eye,
  Gamepad2,
  Gift,
  History,
  KeyRound,
  LockKeyhole,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { Avatar, Balance, EmptyState, Modal, PageTitle, Spinner } from '../components/UI';
import { Coin, Maple } from '../components/Artwork';
import { api, ApiError, date, errorMessage, number, patch, post, useApp } from '../lib';
import type { Game, Reward, User } from '../lib';

type AdminData = {
  users: User[];
  games: Game[];
  event: any;
  transactions: any[];
  results: any[];
  audit: any[];
};
export default function Admin() {
  const { notify, refresh } = useApp(),
    [data, setData] = useState<AdminData | null>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState('users'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState('');
  const [adjust, setAdjust] = useState<User | null>(null),
    [detail, setDetail] = useState<User | null>(null),
    [block, setBlock] = useState<User | null>(null),
    [editGame, setEditGame] = useState<Game | 'new' | null>(null),
    [finish, setFinish] = useState(false),
    [rewards, setRewards] = useState<Reward[]>([]);
  async function load() {
    try {
      const d = await api<AdminData>('/admin/data');
      setData(d);
      setRewards(d.event.rewards);
      setError('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setData(null);
      else setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function execute(fn: () => Promise<unknown>, success = 'Изменения сохранены') {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      await refresh();
      notify(success, 'success');
      return true;
    } catch (e) {
      const m = errorMessage(e);
      setError(m);
      notify(m, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const key = new FormData(e.currentTarget).get('key');
    await execute(() => post('/admin/login', { key }), 'Вход администратора выполнен');
  }
  if (loading)
    return (
      <div className="loading-page">
        <Spinner size={28} />
        <p>Проверяем доступ…</p>
      </div>
    );
  if (!data)
    return (
      <div className="admin-login-page page-enter">
        <Link to="/" className="text-link">
          <ArrowLeft size={16} />
          На сайт ивента
        </Link>
        <div className="admin-login-card">
          <span className="admin-lock">
            <LockKeyhole size={31} />
          </span>
          <span className="eyebrow">SRP EVENT · УПРАВЛЕНИЕ</span>
          <h1>По ту сторону игры.</h1>
          <p>Закрытая панель администрации. Войди с секретным ключом сервера.</p>
          <form onSubmit={login}>
            <label className="field">
              <span>Ключ администратора</span>
              <div className="input-wrap">
                <KeyRound size={18} />
                <input
                  type="password"
                  name="key"
                  placeholder="Введи секретный ключ"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : (
                <>
                  Войти в панель
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="notice subtle">
            <ShieldCheck size={20} />
            <p>
              Чтобы получить ключ, открой терминал сервера в папке проекта и выполни{' '}
              <code>cat .data/admin.key</code>. Вставь полученную строку в поле выше. Если на хостинге задан{' '}
              <code>SRP_ADMIN_KEY</code>, используй его значение. Ключ восстановления участника здесь не
              подходит. Не публикуй ключ администратора.
            </p>
          </div>
        </div>
        <span className="admin-security">Все действия администратора записываются в журнал.</span>
      </div>
    );
  const tabs = [
    { id: 'users', label: 'Участники', icon: Users },
    { id: 'games', label: 'Игры', icon: Gamepad2 },
    { id: 'transactions', label: 'Начисления', icon: History },
    { id: 'results', label: 'Результаты', icon: Trophy },
    { id: 'rewards', label: 'Награды', icon: Gift },
    { id: 'settings', label: 'Настройки', icon: Settings2 },
  ];
  const filtered = data.users.filter((u) =>
      `${u.discord_nickname} ${u.discord_username} ${u.participant_code} ${u.discord_id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
    frozen = data.event.event_status === 'finished';
  function exportResults() {
    const rows = [
      ['Место', 'Игрок', 'Код', 'COINS'],
      ...(data?.event.final_results || []).map((u: any) => [
        u.rank,
        u.discord_nickname,
        u.participant_code,
        u.coins,
      ]),
    ];
    const csv =
      '\uFEFF' +
      rows.map((r) => r.map((v: any) => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SRP-EVENT-final-results.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="admin-page page-enter">
      <PageTitle
        eyebrow="ЗА КАЖДОЙ ХОРОШЕЙ ИГРОЙ — ХОРОШАЯ КОМАНДА"
        title={
          <>
            Управление <em>ивентом.</em>
          </>
        }
        description="Участники, экономика и всё, что делает этот сезон особенным."
      >
        <button
          className="button secondary"
          onClick={async () => {
            await post('/admin/logout');
            setData(null);
          }}
        >
          <LogOut size={16} />
          Выйти
        </button>
      </PageTitle>
      <div className="admin-summary">
        {[
          { icon: Users, value: data.users.length, label: 'участников' },
          { icon: Coins, value: data.users.reduce((n, u) => n + u.coins, 0), label: 'коинов в экономике' },
          { icon: Gamepad2, value: data.games.filter((g) => g.enabled).length, label: 'активных игр' },
          {
            icon: ShieldCheck,
            value:
              data.event.event_status === 'active'
                ? 'Идёт'
                : frozen
                  ? 'Завершён'
                  : data.event.event_status === 'paused'
                    ? 'На паузе'
                    : 'Запланирован',
            label: 'статус ивента',
          },
        ].map((s) => (
          <div key={s.label}>
            <s.icon size={23} />
            <strong>{typeof s.value === 'number' ? number(s.value) : s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => {
              setTab(t.id);
              setError('');
            }}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {tab === 'users' && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>
              Участники <small>{data.users.length}</small>
            </h2>
            <div className="search-field">
              <Search size={16} />
              <input
                placeholder="Никнейм, код или Discord ID"
                aria-label="Поиск участников"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>УЧАСТНИК</th>
                  <th>DISCORD ID</th>
                  <th>SRP-КОД</th>
                  <th>COINS</th>
                  <th>СТАТУС</th>
                  <th>ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table-player">
                        <Avatar name={u.discord_nickname} />
                        <span>
                          <b>{u.discord_nickname}</b>
                          <small>@{u.discord_username}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <code>{u.discord_id}</code>
                    </td>
                    <td>
                      <code>{u.participant_code}</code>
                    </td>
                    <td>
                      <Balance value={u.coins} small />
                    </td>
                    <td>
                      <span className={`status-badge ${u.status}`}>
                        {u.status === 'active' ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          aria-label={`Просмотреть ${u.discord_nickname}`}
                          title="Профиль и история"
                          onClick={async () => {
                            try {
                              setDetail(await api<User>(`/admin/users/${u.id}`));
                            } catch (e) {
                              notify(errorMessage(e), 'error');
                            }
                          }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          aria-label={`Изменить коины ${u.discord_nickname}`}
                          title="Корректировка коинов"
                          disabled={busy || frozen}
                          onClick={() => setAdjust(u)}
                        >
                          <Coins size={16} />
                        </button>
                        <button
                          aria-label={`${u.status === 'active' ? 'Заблокировать' : 'Разблокировать'} ${u.discord_nickname}`}
                          title={u.status === 'active' ? 'Заблокировать' : 'Разблокировать'}
                          disabled={busy || frozen}
                          onClick={() => setBlock(u)}
                        >
                          {u.status === 'active' ? <Ban size={16} /> : <Check size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <EmptyState
              title="Участников пока нет"
              description="Здесь появятся зарегистрировавшиеся пользователи."
            />
          )}
          <div className="admin-table-note">
            <ShieldCheck size={15} />
            Discord-данные указаны участниками. Подтверди аккаунты победителей перед выдачей наград.
          </div>
        </section>
      )}
      {tab === 'games' && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Библиотека мини-игр</h2>
            <button className="button primary small" onClick={() => setEditGame('new')}>
              <Plus size={16} />
              Добавить игру
            </button>
          </div>
          <div className="admin-game-list">
            {data.games.map((g) => (
              <div key={g.id}>
                <span className={`admin-game-icon accent-${g.accent}`}>
                  <Gamepad2 size={23} />
                </span>
                <div>
                  <h3>{g.name}</h3>
                  <p>{g.description}</p>
                  <small>
                    Движок: {g.engine} · {g.category}
                  </small>
                </div>
                <Balance value={g.max_reward} small />
                <button
                  className={`switch ${g.enabled ? 'enabled' : ''}`}
                  role="switch"
                  aria-checked={!!g.enabled}
                  aria-label={`Включить ${g.name}`}
                  disabled={busy}
                  onClick={() =>
                    execute(
                      () => patch(`/admin/games/${g.id}`, { enabled: !g.enabled }),
                      g.enabled ? 'Игра отключена' : 'Игра включена',
                    )
                  }
                >
                  <i />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Редактировать ${g.name}`}
                  onClick={() => setEditGame(g)}
                >
                  <Pencil size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {(tab === 'transactions' || tab === 'results') && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>{tab === 'transactions' ? 'История всех начислений' : 'Результаты игровых раундов'}</h2>
            <span className="muted">Последние 200 записей</span>
          </div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ВРЕМЯ</th>
                  <th>УЧАСТНИК</th>
                  <th>{tab === 'transactions' ? 'ПРИЧИНА' : 'ИГРА'}</th>
                  {tab === 'results' && <th>СЧЁТ</th>}
                  <th>COINS</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'transactions' ? data.transactions : data.results).map((r) => (
                  <tr key={r.id}>
                    <td>
                      {date(r.created_at, true)}
                      <small className="cell-subtitle">
                        {new Date(r.created_at).toLocaleTimeString('ru-RU')}
                      </small>
                    </td>
                    <td>{r.discord_nickname}</td>
                    <td>
                      {r.reason || r.game_name}
                      {r.admin_id && <small className="cell-subtitle">Изменено администратором</small>}
                    </td>
                    {tab === 'results' && <td>{number(r.score)}</td>}
                    <td className="gold-text">
                      {(r.amount ?? r.coins_earned) > 0 ? '+' : ''}
                      {number(r.amount ?? r.coins_earned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!(tab === 'transactions' ? data.transactions : data.results).length && (
            <EmptyState
              title="История пока пуста"
              description="Все игровые результаты и изменения баланса сохраняются автоматически."
            />
          )}
        </section>
      )}
      {tab === 'rewards' && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Награды TOP 5</h2>
            <span className="muted">Изменения видны всем участникам</span>
          </div>
          <form
            className="admin-rewards-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await execute(() => patch('/admin/settings', { rewards }));
            }}
          >
            {rewards.map((r, i) => (
              <div key={r.place}>
                <span className="reward-edit-place">
                  <Trophy size={23} />
                  {r.place} МЕСТО
                </span>
                <label className="field">
                  <span>Название</span>
                  <input
                    value={r.title}
                    disabled={busy || frozen}
                    required
                    minLength={2}
                    maxLength={60}
                    onChange={(e) =>
                      setRewards((v) => v.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                    }
                  />
                </label>
                <label className="field">
                  <span>Награды — по одной на строку</span>
                  <textarea
                    value={r.items.join('\n')}
                    disabled={busy || frozen}
                    required
                    rows={3}
                    onChange={(e) =>
                      setRewards((v) =>
                        v.map((x, j) => (j === i ? { ...x, items: e.target.value.split('\n') } : x)),
                      )
                    }
                  />
                </label>
              </div>
            ))}
            <button className="button primary" disabled={busy || frozen}>
              {busy ? (
                <Spinner />
              ) : (
                <>
                  <Check size={17} />
                  Сохранить награды
                </>
              )}
            </button>
          </form>
        </section>
      )}
      {tab === 'settings' && (
        <div className="admin-settings-grid">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Настройки сезона</h2>
              <Settings2 size={19} />
            </div>
            <form
              key={`${data.event.event_status}-${data.event.start_date}-${data.event.end_date}`}
              className="admin-settings-form"
              aria-busy={busy}
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await execute(() =>
                  patch('/admin/settings', {
                    event_name: f.get('event_name'),
                    start_date: String(f.get('start_date')) + 'Z',
                    end_date: String(f.get('end_date')) + 'Z',
                    event_status: f.get('event_status'),
                  }),
                );
              }}
            >
              <label className="field">
                <span>Название ивента</span>
                <input
                  name="event_name"
                  defaultValue={data.event.event_name}
                  required
                  minLength={3}
                  maxLength={50}
                  disabled={busy || frozen}
                />
              </label>
              <label className="field">
                <span>Начало · UTC</span>
                <input
                  type="datetime-local"
                  name="start_date"
                  defaultValue={data.event.start_date.slice(0, 16)}
                  required
                  disabled={busy || frozen}
                />
              </label>
              <label className="field">
                <span>Окончание · UTC</span>
                <input
                  type="datetime-local"
                  name="end_date"
                  defaultValue={data.event.end_date.slice(0, 16)}
                  required
                  disabled={busy || frozen}
                />
              </label>
              <label className="field">
                <span>Статус</span>
                <select name="event_status" defaultValue={data.event.event_status} disabled={busy || frozen}>
                  <option value="active">Активен</option>
                  <option value="paused">На паузе</option>
                  <option value="scheduled">Запланирован</option>
                  {frozen && <option value="finished">Завершён</option>}
                </select>
              </label>
              <button className="button primary full" disabled={busy || frozen}>
                {busy ? <Spinner /> : 'Сохранить настройки'}
              </button>
            </form>
          </section>
          <div>
            <section className="admin-finish-panel">
              <Trophy size={33} />
              <h2>{frozen ? 'История сезона сохранена' : 'Финальная точка сезона'}</h2>
              <p>
                {frozen
                  ? 'Баланс и рейтинг участников больше не изменяются. Итоги можно скачать для выдачи наград.'
                  : 'Заверши ивент, останови начисления и зафиксируй итоговый TOP 5. Это действие необратимо.'}
              </p>
              {frozen ? (
                <>
                  <Link className="button primary full" to="/leaderboard">
                    Итоговый рейтинг
                    <ArrowRight size={17} />
                  </Link>
                  <button className="button secondary full" onClick={exportResults}>
                    <Download size={17} />
                    Скачать итоговый CSV
                  </button>
                </>
              ) : (
                <button className="button danger full" onClick={() => setFinish(true)}>
                  Завершить ивент
                  <Trophy size={17} />
                </button>
              )}
            </section>
            <section className="admin-audit">
              <h3>
                <ShieldCheck size={18} />
                Журнал действий
              </h3>
              {data.audit.length ? (
                data.audit.slice(0, 8).map((a) => (
                  <div key={a.id}>
                    <b>{a.action}</b>
                    <small>
                      {date(a.created_at, true)} · {new Date(a.created_at).toLocaleTimeString('ru-RU')}
                    </small>
                    <code>{a.details}</code>
                  </div>
                ))
              ) : (
                <p>Здесь появятся действия администрации.</p>
              )}
            </section>
          </div>
        </div>
      )}
      <div className="admin-footer">
        <Maple size={17} />
        <span>С большой властью приходит большая ответственность.</span>
        <Link to="/">
          Вернуться к ивенту
          <ChevronRight size={15} />
        </Link>
      </div>
      {adjust && (
        <Modal title={`Коины · ${adjust.discord_nickname}`} onClose={() => setAdjust(null)}>
          <p className="modal-description">
            Текущий баланс: <b className="gold-text">{number(adjust.coins)} COINS</b>. Укажи положительное
            число для начисления или отрицательное для списания.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await execute(() =>
                post(`/admin/users/${adjust.id}/coins`, {
                  amount: Number(f.get('amount')),
                  reason: f.get('reason'),
                }),
              );
              if (ok) setAdjust(null);
            }}
          >
            <label className="field">
              <span>Корректировка COINS</span>
              <input
                name="amount"
                type="number"
                step="1"
                min={-adjust.coins}
                max="1000000"
                placeholder="Например, 100 или -50"
                required
              />
            </label>
            <label className="field">
              <span>Причина — попадёт в историю участника</span>
              <input
                name="reason"
                minLength={3}
                maxLength={160}
                placeholder="Награда за специальное задание"
                required
              />
            </label>
            <button className="button primary full" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : (
                <>
                  <Coins size={17} />
                  Сохранить корректировку
                </>
              )}
            </button>
          </form>
        </Modal>
      )}
      {block && (
        <Modal
          title={block.status === 'active' ? 'Заблокировать участника?' : 'Восстановить участника?'}
          onClose={() => setBlock(null)}
        >
          <p className="modal-description">
            {block.discord_nickname} · {block.participant_code}.{' '}
            {block.status === 'active'
              ? 'Участник не сможет играть и исчезнет из текущего рейтинга. Баланс и история сохранятся.'
              : 'Участник снова сможет играть и появится в рейтинге.'}
          </p>
          <button
            className="button primary full"
            disabled={busy}
            onClick={async () => {
              const ok = await execute(() =>
                patch(`/admin/users/${block.id}/status`, {
                  status: block.status === 'active' ? 'blocked' : 'active',
                }),
              );
              if (ok) setBlock(null);
            }}
          >
            {busy ? <Spinner /> : 'Подтвердить'}
          </button>
        </Modal>
      )}
      {detail && (
        <Modal title={detail.discord_nickname} onClose={() => setDetail(null)} wide>
          <div className="admin-user-detail">
            <Avatar name={detail.discord_nickname} large />
            <div>
              <b>@{detail.discord_username}</b>
              <p>
                {detail.participant_code} · {detail.discord_id}
              </p>
            </div>
            <Balance value={detail.coins} />
          </div>
          <h3>Игровые результаты</h3>
          {detail.best_results.length ? (
            <div className="admin-detail-results">
              {detail.best_results.map((r) => (
                <div key={r.id}>
                  <b>{r.name}</b>
                  <span>Счёт: {r.best_score}</span>
                  <span>{r.games_played} раундов</span>
                  <Balance value={r.best_reward} small />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Участник ещё не играл.</p>
          )}
          <h3>История коинов</h3>
          <div className="transactions">
            {detail.transactions.length ? (
              detail.transactions.map((t) => (
                <div key={t.id} className="transaction-row">
                  <Coin size={19} />
                  <div>
                    <b>{t.reason}</b>
                    <span>{date(t.created_at, true)}</span>
                  </div>
                  <strong className="gold-text">
                    {t.amount > 0 ? '+' : ''}
                    {t.amount}
                  </strong>
                </div>
              ))
            ) : (
              <p className="muted">Начислений ещё нет.</p>
            )}
          </div>
        </Modal>
      )}
      {editGame && (
        <Modal
          title={editGame === 'new' ? 'Добавить мини-игру' : 'Настройки мини-игры'}
          onClose={() => setEditGame(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                body = {
                  name: f.get('name'),
                  description: f.get('description'),
                  max_reward: Number(f.get('max_reward')),
                  engine: f.get('engine'),
                };
              const ok = await execute(() =>
                editGame === 'new' ? post('/admin/games', body) : patch(`/admin/games/${editGame.id}`, body),
              );
              if (ok) setEditGame(null);
            }}
          >
            {editGame === 'new' && (
              <>
                <div className="notice subtle">
                  <Gamepad2 size={20} />
                  <p>
                    Создай вариацию на одном из 12 серверных движков. Для совершенно новой механики
                    потребуется добавить её код на сервере.
                  </p>
                </div>
                <label className="field">
                  <span>Игровой движок</span>
                  <select name="engine">
                    {data.games
                      .filter((g) => !g.id.startsWith('custom-'))
                      .map((g) => (
                        <option key={g.id} value={g.engine}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            )}
            <label className="field">
              <span>Название</span>
              <input
                name="name"
                defaultValue={editGame === 'new' ? '' : editGame.name}
                required
                minLength={2}
                maxLength={40}
              />
            </label>
            <label className="field">
              <span>Описание</span>
              <textarea
                name="description"
                defaultValue={editGame === 'new' ? '' : editGame.description}
                required
                minLength={4}
                maxLength={150}
                rows={3}
              />
            </label>
            <label className="field">
              <span>Максимальная награда</span>
              <input
                name="max_reward"
                type="number"
                defaultValue={editGame === 'new' ? 100 : editGame.max_reward}
                min="1"
                max="1000"
                step="1"
                required
              />
            </label>
            <button className="button primary full" disabled={busy}>
              {busy ? <Spinner /> : 'Сохранить игру'}
            </button>
          </form>
        </Modal>
      )}
      {finish && (
        <Modal title="Завершить SRP EVENT?" onClose={() => setFinish(false)}>
          <div className="notice danger-notice">
            <ShieldCheck size={24} />
            <p>
              Начисления остановятся. Рейтинг будет сохранён навсегда. Изменить балансы или открыть этот сезон
              повторно нельзя.
            </p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const confirm = new FormData(e.currentTarget).get('confirm');
              const ok = await execute(
                () => post('/admin/finalize', { confirm }),
                'Ивент завершён. Итоговый рейтинг сохранён.',
              );
              if (ok) setFinish(false);
            }}
          >
            <label className="field">
              <span>Введи FINISH для подтверждения</span>
              <input name="confirm" pattern="FINISH" placeholder="FINISH" required autoComplete="off" />
            </label>
            <button className="button danger full" disabled={busy}>
              {busy ? <Spinner /> : 'Зафиксировать итоги'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
