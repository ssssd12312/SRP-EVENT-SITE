import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Crown,
  Flame,
  Gamepad2,
  Gift,
  Info,
  Leaf,
  Medal,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Coin, Maple, TrophyArt } from '../components/Artwork';
import {
  Avatar,
  Balance,
  Countdown,
  EmptyState,
  EventStatus,
  GameCard,
  LogoutButton,
  PageTitle,
  RulesContent,
  SectionHeading,
  Spinner,
} from '../components/UI';
import { api, date, errorMessage, eventDateTime, number, useApp } from '../lib';
import type { Player } from '../lib';

export function Home() {
  const { data, copy } = useApp();
  if (!data?.user) return null;
  const { user, games, leaderboard, event } = data;
  return (
    <div className="page-enter">
      <div className="welcome-line">
        <span>
          ПРИВЕТ, <b>{user.discord_nickname.toUpperCase()}</b>
          <Maple size={16} />
        </span>
        <EventStatus />
      </div>
      <section className="dashboard-hero">
        <div className="dashboard-hero-content">
          <span className="outline-tag">
            <Flame size={13} />
            {event.event_name} · ОСЕННИЙ СЕЗОН
          </span>
          <h1>
            Осень — время
            <br />
            <em>новых рекордов.</em>
          </h1>
          <p>
            Играй в мини-игры, зарабатывай коины
            <br />и поднимайся в общем рейтинге.
          </p>
          <Link to="/games" className="button primary">
            Выбрать игру
            <Gamepad2 size={19} />
          </Link>
          <span className="dashboard-hero-note">
            {event.event_status === 'paused'
              ? 'Ивент на паузе. Скоро продолжим.'
              : event.event_status === 'scheduled' || Date.parse(event.start_date) > Date.now()
                ? `Старт — ${eventDateTime(event.start_date)}`
                : 'Осенний ивент уже начался.'}
          </span>
        </div>
        <img src="/images/autumn-world.webp" alt="Осенний остров SRP EVENT" className="dashboard-art" />
        <Countdown />
      </section>
      <div className="user-overview">
        <Link to="/profile" className="overview-item overview-balance">
          <span className="overview-icon">
            <Coin size={28} />
          </span>
          <div>
            <span className="eyebrow">ТВОЙ БАЛАНС</span>
            <Balance value={user.coins} />
          </div>
          <ArrowUpRight size={18} />
        </Link>
        <Link to="/leaderboard" className="overview-item">
          <span className="overview-icon">
            <Trophy size={23} />
          </span>
          <div>
            <span className="eyebrow">МЕСТО В РЕЙТИНГЕ</span>
            <strong>
              {user.rank ? `#${user.rank}` : '—'}
              <small>из {number(data.total_players)} участников</small>
            </strong>
          </div>
          <ArrowUpRight size={18} />
        </Link>
        <button
          className="overview-item code-overview"
          onClick={() => copy(user.participant_code, 'Твой SRP-код скопирован')}
        >
          <span className="overview-icon">
            <UserRound size={22} />
          </span>
          <div>
            <span className="eyebrow">ЛИЧНЫЙ КОД</span>
            <strong>
              {user.participant_code}
              <small>твой пропуск в ивент</small>
            </strong>
          </div>
          <Copy size={17} />
        </button>
      </div>
      <div className="dashboard-layout">
        <section>
          <SectionHeading label="ВРЕМЯ ПОКАЗАТЬ СЕБЯ" title="Во что сыграем?" link="/games" />
          <div className="game-grid dashboard-game-grid">
            {games.slice(0, 6).map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
        <aside className="dashboard-sidebar">
          <div className="daily-card">
            <div className="side-card-title">
              <span className="mini-icon">
                <Target size={19} />
              </span>
              <span className="eyebrow">ПЛАН НА СЕГОДНЯ</span>
              <Sparkles size={16} />
            </div>
            <h3>{user.daily_complete ? 'Отличный день для побед!' : 'Не останавливайся на одной'}</h3>
            <p>Заработай коины в 3 разных играх и получи дополнительную награду.</p>
            <div className="daily-progress-label">
              <span>Твой прогресс</span>
              <b>{Math.min(user.daily_games, 3)} / 3</b>
            </div>
            <div className="progress-track">
              <i style={{ width: `${Math.min(user.daily_games / 3, 1) * 100}%` }} />
            </div>
            <div className="daily-reward">
              <span>
                <Coin size={19} />
                <b>+50 COINS</b>
              </span>
              {user.daily_complete ? (
                <span className="completed">
                  <Check size={15} />
                  Получено
                </span>
              ) : (
                <Link to="/games">
                  За дело
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
            <small className="daily-reset">
              <Clock3 size={12} />
              Обновление каждый день в 00:00 UTC
            </small>
          </div>
          <div className="side-leaders">
            <div className="side-card-title">
              <Trophy size={18} />
              <h3>Лидеры сезона</h3>
              <span className="live-dot" />
            </div>
            {leaderboard.slice(0, 3).map((p, i) => (
              <div className="mini-player" key={p.id}>
                <span className={`mini-rank rank-${i + 1}`}>{i === 0 ? <Crown size={15} /> : i + 1}</span>
                <Avatar name={p.discord_nickname} />
                <div>
                  <b>
                    {p.discord_nickname}
                    {p.id === user.id && <small>это ты</small>}
                  </b>
                  <span>{p.participant_code}</span>
                </div>
                <span className="mini-player-coins">
                  {number(p.coins)}
                  <Coin size={13} />
                </span>
              </div>
            ))}
            {leaderboard.length < 3 && (
              <p className="leaders-empty">
                История сезона только начинается.
                <br />
                Твоё имя может стать первым.
              </p>
            )}
            <Link to="/leaderboard" className="side-card-link">
              Полный рейтинг
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link to="/rewards" className="prize-promo">
            <span className="eyebrow">ЕСТЬ ЗА ЧТО ИГРАТЬ</span>
            <h3>
              Твоё место
              <br />
              среди лучших.
            </h3>
            <p>Посмотри, что ждёт TOP 5</p>
            <span className="round-arrow">
              <ArrowUpRight size={20} />
            </span>
            <TrophyArt />
          </Link>
        </aside>
      </div>
      <div className="event-bottom-note">
        <Leaf size={20} />
        <p>
          Не упусти свою осень. <span>Сезон продлится до {eventDateTime(event.end_date)}.</span>
        </p>
        <Link to="/info">
          Об ивенте
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export function Games() {
  const { data } = useApp();
  const [category, setCategory] = useState('Все игры'),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState('popular');
  if (!data) return null;
  const filtered = data.games
    .filter(
      (g) =>
        (category === 'Все игры' || g.category === category) &&
        g.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'reward'
        ? b.max_reward - a.max_reward
        : sort === 'easy'
          ? a.difficulty.localeCompare(b.difficulty, 'ru')
          : 0,
    );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="ТВОЙ СЛЕДУЮЩИЙ РЕКОРД"
        title={
          <>
            Маленькие игры.
            <br className="mobile-only" /> <em>Большой азарт.</em>
          </>
        }
        description="Выбирай по настроению. Играй по своим правилам. Побеждай по-честному."
      >
        <span className="page-count">
          <Gamepad2 size={22} />
          <b>{data.games.length}</b>мини-игр
        </span>
      </PageTitle>
      <div className="catalog-toolbar">
        <div className="filter-tabs" aria-label="Категории игр">
          {['Все игры', 'Аркады', 'Логика', 'На реакцию', 'Удача'].map((c, i) => (
            <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>
              {i === 0 && <Gamepad2 size={15} />} {c}
              {c === 'Все игры' && <small>{data.games.length}</small>}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={17} />
          <input
            placeholder="Найти свою игру"
            aria-label="Поиск игр"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Очистить поиск">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="catalog-meta">
        <span>
          Найдено игр: <b>{filtered.length}</b>
        </span>
        <label>
          Сначала{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортировать игры">
            <option value="popular">рекомендуемые</option>
            <option value="reward">больше коинов</option>
            <option value="easy">по сложности</option>
          </select>
        </label>
      </div>
      <div className="game-grid catalog-grid">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} stats />
        ))}
      </div>
      {!filtered.length && (
        <EmptyState
          title="Эта игра пока прячется"
          description="Попробуй другое название или выбери другую категорию."
          action={
            <button
              className="button secondary"
              onClick={() => {
                setSearch('');
                setCategory('Все игры');
              }}
            >
              Показать все игры
            </button>
          }
        />
      )}
      <div className="economy-note">
        <ShieldCheck size={22} />
        <div>
          <b>Честная игра. Настоящие победы.</b>
          <p>До 5 попыток в каждой игре в сутки · Перерыв 60 секунд · Результаты проверяются сервером</p>
        </div>
        <Link to="/info">
          Как начисляются коины
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function Podium({ player, place }: { player?: Player; place: number }) {
  const { data } = useApp();
  return (
    <div className={`podium-card podium-${place} ${player?.id === data?.user?.id ? 'is-you' : ''}`}>
      <div className="podium-decoration">{place === 1 ? <Crown size={25} /> : <Medal size={23} />}</div>
      {player ? (
        <>
          <Avatar name={player.discord_nickname} large />
          <h3>
            {player.discord_nickname}
            {player.id === data?.user?.id && <span className="you-badge">ТЫ</span>}
          </h3>
          <p>{player.participant_code}</p>
          <Balance value={player.coins} small />
        </>
      ) : (
        <>
          <div className="podium-placeholder">
            <UserRound size={27} />
          </div>
          <h3>Будущий победитель</h3>
          <p>Это место ждёт своего игрока</p>
          <span className="empty-podium-coins">— COINS</span>
        </>
      )}
      <span className="podium-place">
        <span>{String(place).padStart(2, '0')}</span>МЕСТО
      </span>
    </div>
  );
}
export function Leaderboard({ final = false }: { final?: boolean }) {
  const { data, refresh } = useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [board, setBoard] = useState<{
    players: Player[];
    total: number;
    filtered_total: number;
    page: number;
    total_pages: number;
    limit: number;
  } | null>(null);
  const [boardError, setBoardError] = useState('');
  const [boardLoading, setBoardLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(
      async () => {
        setBoardLoading(true);
        try {
          const result = await api(`/leaderboard?q=${encodeURIComponent(search)}&page=${page}&limit=25`, {
            signal: controller.signal,
          });
          if (active) {
            setBoard(result);
            setBoardError('');
          }
        } catch (error) {
          if (active) setBoardError(errorMessage(error));
        } finally {
          if (active) setBoardLoading(false);
        }
      },
      search ? 200 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, page, data?.server_time]);
  if (!data) return null;
  const players = data.leaderboard;
  const filtered =
    board?.players ??
    players
      .filter((p) =>
        `${p.discord_nickname} ${p.participant_code}`.toLowerCase().includes(search.toLowerCase()),
      )
      .slice(0, 25);
  const done = final || data.event.event_status === 'finished';
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow={done ? 'СЕЗОН ОКОНЧЕН. ИСТОРИЯ НАПИСАНА.' : 'КАЖДАЯ ПОБЕДА ПОДНИМАЕТ ВЫШЕ'}
        title={
          done ? (
            <>
              SRP EVENT <em>завершён.</em>
            </>
          ) : (
            <>
              Лидеры <em>этой осени.</em>
            </>
          )
        }
        description={
          done
            ? 'Итоговый рейтинг зафиксирован. Спасибо каждому, кто стал частью этой истории.'
            : 'Один сезон. Общий рейтинг. И твоё имя — среди лучших.'
        }
      >
        <span className="auto-refresh">
          <i className={done ? '' : 'live-dot'} />
          {done ? (
            <>
              <ShieldCheck size={15} />
              Итоги зафиксированы
            </>
          ) : (
            <>Обновляется каждые 15 сек.</>
          )}
        </span>
      </PageTitle>
      <div className="podium-grid">
        <Podium player={players[1]} place={2} />
        <Podium player={players[0]} place={1} />
        <Podium player={players[2]} place={3} />
      </div>
      {data.user && (
        <div className="your-position">
          <span className="position-label">
            <Target size={20} />
            Твоя позиция
          </span>
          <strong>{data.user.rank ? `#${data.user.rank}` : '—'}</strong>
          <Avatar name={data.user.discord_nickname} />
          <span className="your-position-name">
            {data.user.discord_nickname}
            <small>{data.user.participant_code}</small>
          </span>
          <Balance value={data.user.coins} />
          <Link className="text-link" to={done ? '/rewards' : '/games'}>
            {done ? 'Твои награды' : 'Выше — только вперёд'}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
      <div className="leaderboard-panel">
        <div className="leaderboard-heading">
          <h2>
            {done ? 'Итоговый рейтинг' : 'Общий рейтинг'} <span>{board?.total ?? data.total_players}</span>
          </h2>
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Найти участника"
              placeholder="Имя или SRP-код"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                aria-label="Очистить поиск"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="table-scroll" aria-busy={boardLoading}>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>МЕСТО</th>
                <th>ИГРОК</th>
                <th>ЛИЧНЫЙ КОД</th>
                <th>
                  COINS
                  <ArrowDown size={12} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr className={p.id === data.user?.id ? 'current-player' : ''} key={p.id}>
                  <td>
                    <span className={`table-rank rank-${p.rank}`}>
                      {p.rank === 1 ? (
                        <Crown size={18} />
                      ) : p.rank && p.rank <= 3 ? (
                        <Medal size={18} />
                      ) : null}
                      #{p.rank}
                    </span>
                  </td>
                  <td>
                    <div className="table-player">
                      <Avatar name={p.discord_nickname} />
                      <span>
                        <b>{p.discord_nickname}</b>
                        <small>@{p.discord_username}</small>
                      </span>
                      {p.id === data.user?.id && <span className="you-badge">ВЫ</span>}
                    </div>
                  </td>
                  <td>
                    <code>{p.participant_code}</code>
                  </td>
                  <td>
                    <Balance value={p.coins} small />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {boardError && (
          <div className="leaderboard-error" role="status">
            {boardError}
            <button onClick={() => void refresh()}>Повторить</button>
          </div>
        )}
        {!filtered.length && !boardLoading && (
          <EmptyState
            icon="trophy"
            title={search ? 'Участник не найден' : 'Первая глава — за тобой'}
            description={
              search
                ? 'Проверь никнейм или личный SRP-код.'
                : 'В рейтинге пока нет участников. Первое место ждёт своего героя.'
            }
          />
        )}
        {board && board.total_pages > 1 && (
          <div className="leaderboard-pagination">
            <span>
              {(board.page - 1) * board.limit + 1}–{Math.min(board.page * board.limit, board.filtered_total)}{' '}
              из {number(board.filtered_total)} участников
            </span>
            <div>
              {boardLoading && <Spinner size={13} />}
              <button
                aria-label="Предыдущая страница рейтинга"
                disabled={board.page <= 1 || boardLoading}
                onClick={() => setPage(board.page - 1)}
              >
                <ArrowLeft size={15} />
              </button>
              <b>
                {board.page} / {board.total_pages}
              </b>
              <button
                aria-label="Следующая страница рейтинга"
                disabled={board.page >= board.total_pages || boardLoading}
                onClick={() => setPage(board.page + 1)}
              >
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
        <div className="table-footnote">
          <ShieldCheck size={14} />
          При равном балансе выше участник, зарегистрировавшийся раньше.<span>Без ботов. Без накруток.</span>
        </div>
      </div>
      {done && (
        <div className="final-prizes">
          <SectionHeading
            label="ГЕРОИ СЕЗОНА"
            title="Награды финального TOP 5"
            link="/rewards"
            labelRight="Все награды"
          />
          {data.event.rewards.map((r) => {
            const p = players[r.place - 1];
            return (
              <div key={r.place}>
                <span className={`final-place rank-${r.place}`}>
                  <Trophy size={20} />
                  {r.place}
                </span>
                <b>{p?.discord_nickname || 'Место не занято'}</b>
                <span>{r.items.join(' · ')}</span>
                {p && <Balance value={p.coins} small />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Rewards() {
  const { data } = useApp();
  if (!data) return null;
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="ПОБЕЖДАТЬ ПРИЯТНО. С НАГРАДОЙ — ЕЩЁ ЛУЧШЕ."
        title={
          <>
            Игра <em>стоит свеч.</em>
          </>
        }
        description="Пять призовых мест. Особенные награды. И немного здорового соперничества."
      >
        <span className="outline-tag">
          <Gift size={16} />
          НАГРАДЫ СЕЗОНА
        </span>
      </PageTitle>
      <div className="rewards-grid">
        {[2, 1, 3].map((place) => {
          const r = data.event.rewards[place - 1];
          return (
            <div key={place} className={`reward-card reward-${place}`}>
              <div className="reward-card-top">
                <span>
                  {place === 1 ? <Crown size={17} /> : <Medal size={17} />} {place} МЕСТО
                </span>
                {place === 1 && <span className="reward-best">ГЛАВНЫЙ ПРИЗ</span>}
              </div>
              <TrophyArt place={place} />
              <h2>{r.title}</h2>
              <p>
                {place === 1
                  ? 'Для того, кто оказался на вершине.'
                  : place === 2
                    ? 'Всего один шаг до легенды.'
                    : 'Твоя победа в числе лучших.'}
              </p>
              <ul>
                {r.items.map((item, i) => (
                  <li key={i}>
                    <span>
                      {i === 0 ? <Sparkles size={16} /> : i === 1 ? <Gift size={16} /> : <Trophy size={16} />}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              {data.event.event_status === 'finished' && (
                <div className="reward-winner">
                  <Crown size={16} />
                  {data.leaderboard[place - 1]?.discord_nickname || 'Место не занято'}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="compact-rewards">
        {data.event.rewards.slice(3).map((r) => (
          <div key={r.place}>
            <span className="compact-medal">
              <Medal size={29} />
              <b>{r.place}</b>
            </span>
            <div>
              <span className="eyebrow">{r.place} МЕСТО</span>
              <h3>{r.title}</h3>
              <p>{r.items.join(' · ')}</p>
            </div>
            <Gift size={29} />
            {data.event.event_status === 'finished' && (
              <b>{data.leaderboard[r.place - 1]?.discord_nickname || 'Место не занято'}</b>
            )}
          </div>
        ))}
      </div>
      <div className="rewards-cta">
        <span>
          <Maple size={31} />
        </span>
        <div>
          <h2>Твой следующий раунд может изменить всё.</h2>
          <p>Награды получают участники с наибольшим количеством COINS на момент завершения ивента.</p>
        </div>
        <Link
          to={data.event.event_status === 'finished' ? '/leaderboard' : '/games'}
          className="button primary"
        >
          {data.event.event_status === 'finished' ? 'Итоги сезона' : 'Иду за победой'}
          <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="rewards-disclaimer">
        <Info size={16} />
        <p>
          Конкретные скины и специальные награды объявляет администрация SRP. Выдача — после проверки
          финальных результатов и Discord-аккаунтов победителей. Коины не обмениваются на деньги.
        </p>
      </div>
    </div>
  );
}

export function Profile() {
  const { data, copy } = useApp(),
    [tab, setTab] = useState('history'),
    [filter, setFilter] = useState('all');
  if (!data?.user) return null;
  const u = data.user;
  const transactions = (u.transactions || []).filter(
    (t) =>
      filter === 'all' ||
      (filter === 'games' && t.reason.startsWith('Мини-игра')) ||
      (filter === 'bonuses' && !t.reason.startsWith('Мини-игра')),
  );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="ТВОЯ ИСТОРИЯ ЭТОГО СЕЗОНА"
        title={
          <>
            Личное <em>пространство.</em>
          </>
        }
        description="Все победы, достижения и коины — в одном месте."
      >
        <LogoutButton />
      </PageTitle>
      <div className="profile-top">
        <section className="profile-identity">
          <div className="profile-avatar-wrap">
            <Avatar name={u.discord_nickname} large />
            <span>
              <Maple size={15} />
            </span>
          </div>
          <div className="profile-name">
            <span className="outline-tag">УЧАСТНИК СЕЗОНА</span>
            <h2>{u.discord_nickname}</h2>
            <p>@{u.discord_username}</p>
          </div>
          <div className="profile-meta">
            <div>
              <span>Личный код</span>
              <button
                aria-label="Скопировать код"
                title="Скопировать код"
                onClick={() => copy(u.participant_code, 'Личный код скопирован')}
              >
                <b>{u.participant_code}</b>
                <Copy size={14} />
                <span>Скопировать код</span>
              </button>
            </div>
            <div>
              <span>Discord ID</span>
              <code>{u.discord_id}</code>
            </div>
            <div>
              <span>С нами с</span>
              <b>{date(u.created_at, true)}</b>
            </div>
          </div>
        </section>
        <section className="profile-balance">
          <div>
            <span className="eyebrow">ВАШ БАЛАНС</span>
            <Coin size={33} />
          </div>
          <h2>
            {number(u.coins)} <small>COINS</small>
          </h2>
          <div className="profile-balance-bottom">
            <span>
              <Trophy size={17} />
              Место: <b>{u.rank ? `#${u.rank}` : '—'}</b>
            </span>
            <Link to="/leaderboard">
              В рейтинг
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      </div>
      <div className="profile-stat-grid">
        <div>
          <Gamepad2 size={22} />
          <strong>{number(u.games_played)}</strong>
          <span>сыграно игр</span>
        </div>
        <div>
          <Target size={22} />
          <strong>
            {u.best_results?.length || 0}
            <small> / {data.games.length}</small>
          </strong>
          <span>игр открыто</span>
        </div>
        <div>
          <Sparkles size={22} />
          <strong>{u.achievements?.length || 0}</strong>
          <span>наград и достижений</span>
        </div>
        <div>
          <Coin size={23} />
          <strong>{number(Math.max(0, ...(u.best_results || []).map((r) => r.best_reward)))}</strong>
          <span>лучший выигрыш</span>
        </div>
      </div>
      <SectionHeading label="МАЛЕНЬКИЕ ШАГИ К БОЛЬШОЙ ЦЕЛИ" title="Твоя коллекция достижений" />
      <div className="achievements-grid">
        {[
          {
            key: 'first-win',
            title: 'Первые коины',
            text: 'Получи первую награду в игре',
            reward: 25,
            icon: Flame,
            done: u.achievements?.some((a) => a.achievement_key === 'first-win'),
          },
          {
            key: 'daily',
            title: 'Всё и сразу',
            text: '3 разные игры с наградой за день',
            reward: 50,
            icon: Target,
            done: u.daily_complete,
          },
          {
            key: '500-coins',
            title: 'Коллекционер',
            text: 'Заработай 500 коинов в мини-играх',
            reward: 100,
            icon: Medal,
            done: u.achievements?.some((a) => a.achievement_key === '500-coins'),
          },
        ].map((a) => (
          <div className={`achievement-card ${a.done ? 'unlocked' : ''}`} key={a.key}>
            <span className="achievement-icon">
              <a.icon size={26} />
            </span>
            <div>
              <h3>{a.title}</h3>
              <p>{a.text}</p>
              <span>
                <Coin size={14} />+{a.reward} COINS
              </span>
            </div>
            {a.done ? <Check size={18} /> : <span className="achievement-lock">ЕЩЁ ВПЕРЕДИ</span>}
          </div>
        ))}
      </div>
      <div className="profile-activity">
        <div className="profile-tabs">
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            <Clock3 size={17} />
            История коинов
          </button>
          <button className={tab === 'records' ? 'active' : ''} onClick={() => setTab('records')}>
            <Trophy size={17} />
            Лучшие результаты
          </button>
          {tab === 'history' && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Фильтр истории коинов"
            >
              <option value="all">Все начисления</option>
              <option value="games">Мини-игры</option>
              <option value="bonuses">Бонусы и корректировки</option>
            </select>
          )}
        </div>
        {tab === 'history' ? (
          transactions.length ? (
            <div className="transactions">
              {transactions.map((t) => (
                <div className="transaction-row" key={t.id}>
                  <span className={`transaction-icon ${t.amount < 0 ? 'negative' : ''}`}>
                    {t.reason.startsWith('Мини-игра') ? (
                      <Gamepad2 size={18} />
                    ) : t.admin_id ? (
                      <ShieldCheck size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </span>
                  <div>
                    <b>{t.reason}</b>
                    <span>
                      {date(t.created_at, true)} ·{' '}
                      {new Date(t.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <strong className={t.amount < 0 ? 'negative-text' : 'gold-text'}>
                    {t.amount > 0 ? '+' : ''}
                    {number(t.amount)} <small>COINS</small>
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Твоя копилка ждёт первую победу"
              description="Начни с любой игры. Все начисления и бонусы появятся здесь."
              action={
                <Link to="/games" className="button primary">
                  Выбрать игру
                  <ArrowRight size={16} />
                </Link>
              }
            />
          )
        ) : u.best_results?.length ? (
          <div className="table-scroll">
            <table className="records-table">
              <thead>
                <tr>
                  <th>ИГРА</th>
                  <th>ЛУЧШИЙ СЧЁТ</th>
                  <th>МАКС. НАГРАДА</th>
                  <th>РАУНДЫ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {u.best_results.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{number(r.best_score)}</td>
                    <td>
                      <Balance value={r.best_reward} small />
                    </td>
                    <td>{r.games_played}</td>
                    <td>
                      <Link to={`/play/${r.id}`} className="text-link">
                        Побить рекорд
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="trophy"
            title="Рекорды не появляются сами"
            description="Сыграй свой первый раунд — и начни личную историю побед."
            action={
              <Link to="/games" className="button primary">
                К мини-играм
                <ArrowRight size={16} />
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
export function Information() {
  const { data } = useApp();
  const [open, setOpen] = useState<number | null>(0);
  if (!data) return null;
  const faq = [
    {
      q: 'Как начисляются COINS?',
      a: 'Награда зависит от результата и сложности игры. Максимальная сумма указана на карточке. Сервер рассчитывает результат по действиям в раунде — браузер не может отправить произвольное количество коинов. Первый выигрыш приносит ещё 25 COINS, три разные игры с наградой за день — 50 COINS, а первые 500 игровых коинов — бонус 100 COINS.',
    },
    {
      q: 'Почему нельзя бесконечно играть в одну игру?',
      a: 'На каждую игру доступно 5 раундов в сутки, включая неудачные. Между раундами одной игры действует перерыв 60 секунд. Пока ждёшь — попробуй другую! Попытки обновляются в 00:00 UTC. Начатый раунд длится до 3 минут, «Лови тыкву» — 30 секунд. Переход в другую игру завершает предыдущий раунд.',
    },
    {
      q: 'Как определяется место в лидерборде?',
      a: 'Участники сортируются по общему балансу COINS. При равенстве коинов выше тот, кто зарегистрировался раньше. Заблокированные участники не участвуют в рейтинге. Список обновляется автоматически каждые 15 секунд.',
    },
    {
      q: 'Что будет, когда ивент закончится?',
      a: 'Новые коины перестанут начисляться, даже если раунд начался до окончания сезона. Сервер сохранит неизменяемый итоговый рейтинг и определит TOP 5. На сайте появятся финальные результаты и награды победителей.',
    },
    {
      q: 'Можно ли использовать ботов и баги?',
      a: 'Нет. Мультиаккаунты, автоматизация игр, подделка запросов, использование багов и эксплойтов запрещены. Администрация может заблокировать участника и скорректировать нечестно полученные коины. Каждая корректировка записывается в историю.',
    },
    {
      q: 'Как войти с другого устройства?',
      a: 'Нажми «Войти» и введи публичный SRP-код и секретный ключ восстановления, который был выдан один раз при регистрации. Не используй пароль от Discord. При потере ключа свяжись с администрацией SRP для проверки аккаунта.',
    },
  ];
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="ВСЁ, ЧТО НУЖНО ЗНАТЬ"
        title={
          <>
            Одна осень. <em>Одно комьюнити.</em>
          </>
        }
        description="SRP EVENT — повод собраться, посоревноваться и сделать этот сезон особенным."
      >
        <EventStatus />
      </PageTitle>
      <div className="info-intro">
        <div>
          <span className="eyebrow">
            <Maple size={15} />
            ОСЕННИЙ СЕЗОН 2026
          </span>
          <h2>
            Не просто игры.
            <br />
            Общие воспоминания.
          </h2>
          <p>
            Мы собрали любимые мини-игры в одном месте, добавили немного азарта и настоящие награды. Осталось
            только самое важное — ты.
          </p>
          <div className="info-stats">
            <span>
              <Gamepad2 size={20} />
              <b>{data.games.length}</b> игр
            </span>
            <span>
              <Trophy size={20} />
              <b>5</b> победителей
            </span>
            <span>
              <Users size={20} />
              <b>1</b> сообщество
            </span>
          </div>
        </div>
        <div className="event-calendar">
          <CalendarDays size={27} />
          <span className="eyebrow">СОХРАНИ ЭТИ ДАТЫ</span>
          <div>
            <span>Начало ивента</span>
            <strong>{eventDateTime(data.event.start_date)}</strong>
          </div>
          <div>
            <span>Завершение ивента</span>
            <strong>{eventDateTime(data.event.end_date)}</strong>
          </div>
          <small>Все даты указаны по UTC. В момент завершения начисления прекращаются.</small>
        </div>
      </div>
      <div className="how-to-win">
        <span className="eyebrow">ПЛАН ПРОСТОЙ</span>
        <h2>Как занять первое место?</h2>
        <div>
          {[
            { icon: Gamepad2, title: 'Играй', text: 'Найди любимые мини-игры' },
            { icon: Coin, title: 'Зарабатывай COINS', text: 'Покажи свой лучший результат' },
            { icon: Trophy, title: 'Поднимайся в рейтинге', text: 'Каждая победа имеет значение' },
            { icon: Gift, title: 'Забирай награду', text: 'Окажись в финальном TOP 5' },
          ].map((s, i) => (
            <div key={s.title}>
              <span>
                <s.icon size={27} />
              </span>
              <b>{s.title}</b>
              <p>{s.text}</p>
              {i < 3 && <ArrowRight className="how-arrow" size={20} />}
            </div>
          ))}
        </div>
      </div>
      <div className="info-columns">
        <section>
          <SectionHeading label="НИКАКИХ СЮРПРИЗОВ" title="Вопросы и ответы" />
          <div className="faq-list">
            {faq.map((f, i) => (
              <div className={`faq-item ${open === i ? 'open' : ''}`} key={f.q}>
                <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  <span>
                    <small>0{i + 1}</small>
                    {f.q}
                  </span>
                  <ChevronDown size={18} />
                </button>
                {open === i && <p>{f.a}</p>}
              </div>
            ))}
          </div>
        </section>
        <aside className="fair-play-card">
          <ShieldCheck size={35} />
          <span className="eyebrow">ИГРАЕМ ПО-ЧЕСТНОМУ</span>
          <h2>
            Уважай игру.
            <br />
            Уважай других.
          </h2>
          <p>За каждым профилем — человек из нашего сообщества. Честная победа всегда приятнее.</p>
          <ul>
            <li>
              <Check size={15} />
              Один участник — один аккаунт
            </li>
            <li>
              <Check size={15} />
              Без ботов и эксплойтов
            </li>
            <li>
              <Check size={15} />
              Серверный учёт результатов
            </li>
          </ul>
          <span className="fair-play-sign">
            ТВОЯ КОМАНДА SRP
            <Maple size={19} />
          </span>
        </aside>
      </div>
      <details className="full-rules">
        <summary>
          <ShieldCheck size={18} />
          Полные правила и обработка данных
          <ChevronDown size={18} />
        </summary>
        <RulesContent />
      </details>
    </div>
  );
}
