import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Gamepad2,
  Info,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  X,
} from 'lucide-react';
import { Coin, GameArt, Maple } from './Artwork';
import { eventDateTime, number, post, useApp } from '../lib';
import type { Game } from '../lib';

export function Spinner({ size = 18 }: { size?: number }) {
  return <LoaderCircle size={size} className="spinner" aria-label="Загрузка" />;
}
export function Modal({
  children,
  title,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = ref.current;
    dialog?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab' && dialog) {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]',
          ),
        );
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const colors = ['moss', 'plum', 'clay', 'gold'];
  const c = colors[Array.from(name).reduce((a, b) => a + b.charCodeAt(0), 0) % colors.length];
  return (
    <span className={`avatar avatar-${c} ${large ? 'avatar-large' : ''}`}>
      {Array.from(name).slice(0, 2).join('').toUpperCase()}
    </span>
  );
}
export function Balance({ value, small = false }: { value: number; small?: boolean }) {
  return (
    <span className={`balance ${small ? 'balance-small' : ''}`}>
      <Coin size={small ? 17 : 23} />
      <strong>{number(value)}</strong>
      <span>COINS</span>
    </span>
  );
}
export function EventStatus() {
  const { data } = useApp();
  const status = data?.event.event_status,
    before = data && Date.parse(data.event.start_date) > Date.now();
  return (
    <span className={`event-status ${status === 'active' && !before ? 'live' : ''}`}>
      <i />
      {status === 'finished'
        ? 'Ивент завершён'
        : status === 'paused'
          ? 'Ивент на паузе'
          : before || status === 'scheduled'
            ? 'Скоро начало'
            : 'Ивент уже идёт'}
    </span>
  );
}
export function Countdown({ compact = false }: { compact?: boolean }) {
  const { data } = useApp(),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!data) return null;
  const seconds = Math.max(0, Math.floor((Date.parse(data.event.end_date) - now) / 1000)),
    days = Math.floor(seconds / 86400),
    hours = Math.floor(seconds / 3600) % 24,
    minutes = Math.floor(seconds / 60) % 60;
  return compact ? (
    <span className="countdown-compact">
      <Clock3 size={14} />
      До финала <b>{days} д.</b>
    </span>
  ) : (
    <div className="countdown">
      <span className="eyebrow">ДО ФИНАЛА СЕЗОНА</span>
      <div>
        {[
          [days, 'дней'],
          [hours, 'часов'],
          [minutes, 'минут'],
        ].map(([n, l], i) => (
          <div className="count-unit" key={l}>
            <strong>{String(n).padStart(2, '0')}</strong>
            <small>{l}</small>
            {i < 2 && <em>:</em>}
          </div>
        ))}
      </div>
    </div>
  );
}
export function Header() {
  const { data, notify, setAuthMode, setRulesOpen } = useApp(),
    [open, setOpen] = useState(false),
    location = useLocation(),
    navigate = useNavigate();
  const user = data?.user;
  useEffect(() => setOpen(false), [location.pathname]);
  const links = [
    ['/', 'Главная'],
    ['/games', 'Игры'],
    ['/leaderboard', 'Лидерборд'],
    ['/rewards', 'Награды'],
    ['/info', 'Информация'],
  ];
  const gate = (e: React.MouseEvent, path: string) => {
    if (!user && data?.event.event_status !== 'finished') {
      e.preventDefault();
      setOpen(false);
      if (path === '/info') setRulesOpen(true);
      else {
        notify('Создай профиль — и всё приключение откроется тебе.');
        document.querySelector('#join-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="SRP EVENT — Главная">
          <span className="brand-mark">
            <Maple size={25} />
          </span>
          <span>
            SRP<span className="brand-event">EVENT</span>
          </span>
        </Link>
        <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Основная навигация">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={(e) => gate(e, to)}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {label}
              {to === '/games' && <span className="nav-count">{data?.games.length || 12}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="header-right">
          {user ? (
            <>
              <Link to="/profile" className="header-balance" aria-label={`Баланс ${user.coins} коинов`}>
                <Coin size={20} />
                <b>{number(user.coins)}</b>
                <span className="header-rank">
                  <Trophy size={11} />#{user.rank || '—'}
                </span>
              </Link>
              <Link to="/profile" className="profile-link">
                <Avatar name={user.discord_nickname} />
                <span>Профиль</span>
                <ChevronDown size={14} />
              </Link>
            </>
          ) : (
            <>
              <span className="season-chip">
                <Leaf size={14} />
                ОСЕНЬ ’26
              </span>
              <button
                className="login-button"
                onClick={() => {
                  setAuthMode('login');
                  navigate('/login');
                  setOpen(false);
                  setTimeout(
                    () =>
                      document
                        .querySelector('#join-form')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
                    40,
                  );
                }}
              >
                <UserRound size={16} />
                Войти
                <ArrowUpRight size={15} />
              </button>
            </>
          )}
          <button
            className="mobile-toggle icon-button"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  const { setRulesOpen } = useApp();
  return (
    <footer className="site-footer">
      <Link to="/" className="footer-brand">
        <Maple size={19} />
        <b>SRP EVENT</b>
        <span>© 2026</span>
      </Link>
      <span className="footer-message">
        Эта осень запомнится. <span>Играй с нами.</span>
      </span>
      <div>
        <button onClick={() => setRulesOpen(true)}>Правила ивента</button>
        <Link to="/admin" className="footer-admin" aria-label="Администрирование">
          <LockKeyhole size={14} />
        </Link>
      </div>
    </footer>
  );
}
export function Toasts() {
  const { toasts, dismiss } = useApp();
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div className={`toast toast-${t.type}`} key={t.id}>
          {t.type === 'success' ? (
            <Check size={19} />
          ) : t.type === 'error' ? (
            <CircleHelp size={19} />
          ) : (
            <Info size={19} />
          )}
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Закрыть уведомление">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">
          <span className="tiny-line" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function SectionHeading({
  label,
  title,
  link,
  labelRight = 'Все игры',
  onClick,
}: {
  label?: string;
  title: string;
  link?: string;
  labelRight?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="section-heading">
      <div>
        {label && <span className="eyebrow">{label}</span>}
        <h2>{title}</h2>
      </div>
      {link && (
        <Link to={link} className="text-link" onClick={onClick}>
          {labelRight}
          <ArrowUpRight size={18} />
        </Link>
      )}
    </div>
  );
}
export function GameCard({ game, stats = false }: { game: Game; stats?: boolean }) {
  const { data, notify } = useApp();
  const best = data?.user?.best_results.find((r) => r.id === game.id);
  return (
    <Link
      to={`/play/${game.id}`}
      onClick={(e) => {
        if (!data?.user) {
          e.preventDefault();
          notify('Зарегистрируйся, чтобы начать игру.');
          document.querySelector('#join-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }}
      className={`game-card ${game.accent}`}
    >
      <div className="game-card-top">
        <span className="game-category">{game.category}</span>
        {game.tag && (
          <span className={`game-tag ${game.tag === 'ХИТ СЕЗОНА' ? 'hot' : ''}`}>
            {game.tag === 'ХИТ СЕЗОНА' && <Sparkles size={10} />} {game.tag}
          </span>
        )}
      </div>
      <GameArt engine={game.engine} accent={game.accent} />
      <div className="game-card-body">
        <h3>
          {game.name}
          <ArrowUpRight size={18} />
        </h3>
        <p>{game.description}</p>
        <div className="game-card-bottom">
          <span>
            <Coin size={17} />
            <small>до</small>
            <b>{game.max_reward}</b>
            <small>COINS</small>
          </span>
          <span className="play-link">
            Играть
            <ArrowRight size={14} />
          </span>
        </div>
        {stats && (
          <div className="game-player-stats">
            <span>
              {game.attempts_left === 0
                ? 'На сегодня всё'
                : game.cooldown_until && game.cooldown_until > Date.now()
                  ? 'Перерыв · 1 мин'
                  : `${game.attempts_left} из 5 попыток`}
            </span>
            <span>{best ? `Рекорд: ${number(best.best_reward)} ◉` : 'Твой рекорд впереди'}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
export function EmptyState({
  icon = 'games',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>{icon === 'trophy' ? <Trophy size={30} /> : <Gamepad2 size={30} />}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function RulesContent() {
  const { data } = useApp();
  return (
    <div className="rules-content">
      <div className="notice">
        <ShieldCheck size={20} />
        <p>Честная игра — главное правило SRP. За каждым кодом стоит один участник.</p>
      </div>
      <h3>Как это работает</h3>
      <ol>
        <li>Зарегистрируй свой Discord-аккаунт и сохрани личный SRP-код и ключ восстановления.</li>
        <li>
          Играй в мини-игры. У каждой — своя награда, до 5 попыток в сутки и перерыв 60 секунд между раундами.
        </li>
        <li>
          Баланс и результаты рассчитываются сервером. Коины не имеют денежной стоимости и не продаются.
        </li>
        <li>При равенстве коинов выше оказывается участник, зарегистрировавшийся раньше.</li>
        <li>
          Запрещены мультиаккаунты, боты, поддельные результаты, эксплуатация ошибок и вмешательство в работу
          сайта. О найденном баге сообщи администрации.
        </li>
        <li>
          После завершения ивента рейтинг фиксируется. TOP 5 получают награды; их конкретный состав и выдачу
          подтверждает администрация SRP.
        </li>
      </ol>
      <h3>Сроки и данные</h3>
      <p>
        {data
          ? `${eventDateTime(data.event.start_date)} — ${eventDateTime(data.event.end_date)}.`
          : 'Осенний сезон 2026.'}{' '}
        Время окончания и ограничения попыток определяются по UTC.
      </p>
      <p>
        Мы храним Discord-никнейм, username, ID аккаунта и игровые результаты для проведения ивента. Не вводи
        пароль от Discord. Указанные Discord-данные не проверяются через OAuth; администрация подтверждает
        победителей перед выдачей наград.
      </p>
      <p>
        Сохрани ключ восстановления: личный SRP-код публичный, а ключ — секретный. По вопросам участия и
        удаления профиля обращайся к администрации своего Discord-сервера SRP.
      </p>
    </div>
  );
}
export function GlobalModals() {
  const { rulesOpen, setRulesOpen, recovery, setRecovery, copy, data, notify } = useApp();
  const [saved, setSaved] = useState(false);
  return (
    <>
      {rulesOpen && (
        <Modal title="Правила SRP EVENT" onClose={() => setRulesOpen(false)} wide>
          <RulesContent />
          <button className="button primary full" onClick={() => setRulesOpen(false)}>
            Всё понятно
            <Check size={17} />
          </button>
        </Modal>
      )}
      {recovery && (
        <Modal
          title="Ты в игре. Добро пожаловать!"
          onClose={() => {
            if (saved) setRecovery(null);
            else notify('Сначала сохрани ключ восстановления и отметь это ниже.');
          }}
        >
          <div className="welcome-symbol">
            <Maple size={38} />
          </div>
          <p className="modal-description">
            Твой личный код — <b className="gold-text">{data?.user?.participant_code}</b>. Сохрани секретный
            ключ ниже: он понадобится для входа с другого устройства.
          </p>
          <div className="recovery-key">{recovery}</div>
          <button
            className="button secondary full"
            onClick={async () => {
              await copy(recovery, 'Ключ восстановления скопирован');
            }}
          >
            <Copy size={17} />
            Скопировать ключ
          </button>
          <label className="checkbox-row recovery-check">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            <span>Я сохранил ключ в безопасном месте</span>
          </label>
          <div className="notice subtle">
            <LockKeyhole size={18} />
            <p>Ключ показывается один раз. Не отправляй его другим участникам и не публикуй в Discord.</p>
          </div>
          <button
            className="button primary full"
            disabled={!saved}
            onClick={() => {
              setRecovery(null);
              setSaved(false);
            }}
          >
            Открыть профиль
            <ArrowRight size={18} />
          </button>
        </Modal>
      )}
    </>
  );
}
export function BottomSteps() {
  return (
    <div className="bottom-steps">
      {[
        { n: '01', icon: UserRound, title: 'Создай профиль', text: 'Твой личный код — твой пропуск' },
        { n: '02', icon: Gamepad2, title: 'Покажи, на что способен', text: '12 игр — найди свою любимую' },
        { n: '03', icon: Trophy, title: 'Забери награду', text: 'Поднимись в TOP 5 сезона' },
      ].map((s, i) => (
        <div key={s.n}>
          <span className="step-number">{s.n}</span>
          <s.icon size={21} />
          <div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
          {i < 2 && <ArrowRight size={17} className="step-arrow" />}
        </div>
      ))}
    </div>
  );
}
export function ScrollHint() {
  return (
    <span className="scroll-hint">
      <ArrowDown size={13} />
      Листай. Здесь начинается интересное.
    </span>
  );
}
export function LogoutButton() {
  const { refresh, notify } = useApp(),
    navigate = useNavigate();
  return (
    <button
      className="button ghost"
      onClick={async () => {
        try {
          await post('/auth/logout');
          await refresh();
          navigate('/');
        } catch {
          notify('Не удалось выйти. Проверь соединение.', 'error');
        }
      }}
    >
      <LogOut size={16} />
      Выйти из профиля
    </button>
  );
}
