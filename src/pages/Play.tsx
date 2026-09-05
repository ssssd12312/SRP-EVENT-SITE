import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bomb,
  Check,
  ChevronRight,
  Clock3,
  Flag,
  Hash,
  Heart,
  Leaf,
  Lightbulb,
  MousePointer2,
  Play as PlayIcon,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Square,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { Coin, GameArt, Maple } from '../components/Artwork';
import { EmptyState, Modal, Spinner } from '../components/UI';
import { ApiError, errorMessage, number, post, useApp } from '../lib';
import type { GameSession, GameState } from '../lib';

type Action = { type: string; [key: string]: unknown };
const guides: Record<string, { title: string; description: string; rules: string[]; control: string }> = {
  mines: {
    title: 'Каждый шаг имеет значение.',
    description: 'Открой 30 безопасных клеток на поле 6 × 6. Остальные 6 скрывают мины.',
    rules: [
      'Первый ход всегда безопасен.',
      'Число — количество мин в соседних клетках.',
      'Ставь флажки правой кнопкой или включи режим флага.',
      'Награда начисляется только за полностью очищенное поле.',
    ],
    control: 'Мышь или касание · Флаг — правой кнопкой',
  },
  tetris: {
    title: 'Найди место каждой фигуре.',
    description: 'Собирай горизонтальные линии и не дай фигурам добраться до верха.',
    rules: [
      'Шесть линий — максимальная награда.',
      '↑ поворачивает фигуру, ← → перемещают.',
      '↓ ускоряет падение, пробел мгновенно сбрасывает.',
      'Награда зависит от собранных линий.',
    ],
    control: 'Стрелки + пробел или экранные кнопки',
  },
  snake: {
    title: 'Одно яблоко. Ещё один рекорд.',
    description: 'Веди змейку по полю, собирай яблоки и избегай стен и своего хвоста.',
    rules: [
      'Каждое яблоко удлиняет змейку.',
      '18 яблок — максимальная награда.',
      'Нельзя разворачиваться прямо в себя.',
      'Управление работает и с клавиатуры, и с телефона.',
    ],
    control: 'Стрелки / WASD или экранные кнопки',
  },
  memory: {
    title: 'Всё уже было перед глазами.',
    description: 'Найди восемь пар осенних символов на поле 4 × 4.',
    rules: [
      'За ход открывай две карточки.',
      'Совпавшие пары остаются открытыми.',
      'Меньше ходов и времени — больше награда.',
      'Коины начисляются, когда найдены все пары.',
    ],
    control: 'Мышь или касание карточки',
  },
  reaction: {
    title: 'Поймай то самое мгновение.',
    description: 'Дождись зелёного сигнала и нажми как можно быстрее. Впереди три попытки.',
    rules: [
      'Не нажимай, пока поле оранжевое.',
      'Раннее нажатие завершит раунд без награды.',
      'Результат — среднее время за 3 сигнала.',
      'Время измеряется сервером и включает задержку сети.',
    ],
    control: 'Пробел, клик или касание',
  },
  flappy: {
    title: 'Выше листьев. Дальше всех.',
    description: 'Помоги птичке пролететь между деревьями. Каждое касание — взмах крыльев.',
    rules: [
      'Не задевай деревья, землю и верхнюю границу.',
      'За каждую пройденную пару препятствий — коины.',
      '10 препятствий — максимальная награда.',
      'Лучше частые лёгкие взмахи, чем один большой.',
    ],
    control: 'Пробел, касание поля или кнопка взмаха',
  },
  rps: {
    title: 'Удача тоже любит смелых.',
    description: 'Камень, бумага или ножницы? Сделай свой выбор в пяти раундах.',
    rules: [
      'Камень бьёт ножницы, ножницы — бумагу.',
      'Бумага бьёт камень. Одинаковый выбор — ничья.',
      'Соперник выбирает случайно на сервере.',
      'Каждая победа приносит 1/5 максимальной награды.',
    ],
    control: 'Клик, касание или клавиши 1, 2, 3',
  },
  '2048': {
    title: 'Два плюс два. И так до победы.',
    description: 'Объединяй одинаковые плитки. Дойди до 2048 или забери текущий результат.',
    rules: [
      'Каждый ход сдвигает всё поле в одном направлении.',
      'Одинаковые плитки сливаются в одну.',
      'Награда растёт с номиналом самой большой плитки.',
      'Можно завершить раунд и получить накопленную награду.',
    ],
    control: 'Стрелки / WASD, свайпы или экранные кнопки',
  },
  whack: {
    title: 'Пора собирать урожай.',
    description: 'Лови появляющиеся тыквы! У тебя 30 секунд и девять грядок.',
    rules: [
      'Тыква появляется примерно раз в секунду.',
      'Одну тыкву можно поймать только один раз.',
      'За каждую пойманную тыкву начисляются коины.',
      '18 тыкв — максимальная награда.',
    ],
    control: 'Касание тыквы или клавиши 1–9',
  },
  quiz: {
    title: 'Немного знаний — много коинов.',
    description: 'Пять вопросов об осени, играх и нашем сообществе. Готов проверить себя?',
    rules: [
      'Выбирай один правильный ответ из четырёх.',
      'Каждый правильный ответ даёт 1/5 награды.',
      'После ответа нельзя вернуться к предыдущему вопросу.',
      'Результаты и верные ответы появятся после раунда.',
    ],
    control: 'Клик, касание или клавиши 1–4',
  },
  sequence: {
    title: 'Поймай ритм цвета.',
    description: 'Смотри на последовательность огней, а затем повторяй её в том же порядке.',
    rules: [
      'Сначала наблюдай — кнопки неактивны.',
      'После сигнала повтори показанные цвета.',
      'Каждый уровень добавляет один новый цвет.',
      'Пройди 7 уровней для максимальной награды.',
    ],
    control: 'Касание цветов или клавиши 1–4',
  },
  guess: {
    title: 'Сто вариантов. Один правильный.',
    description: 'Сервер загадал число от 1 до 100. У тебя семь попыток, чтобы найти его.',
    rules: [
      'После каждой попытки получишь подсказку.',
      'Следующее число должно быть целым: от 1 до 100.',
      'Чем меньше попыток, тем больше награда.',
      'Ответ нельзя подсмотреть в браузере.',
    ],
    control: 'Введи число и нажми Enter',
  },
};
const timedIntervals: Record<string, number> = {
  snake: 195,
  tetris: 300,
  flappy: 80,
  reaction: 80,
  whack: 180,
  sequence: 180,
  memory: 500,
};
function Dpad({
  onDirection,
  rotate,
  drop,
}: {
  onDirection: (d: string) => void;
  rotate?: () => void;
  drop?: () => void;
}) {
  return (
    <div className="dpad">
      <button
        onClick={() => (rotate ? rotate() : onDirection('up'))}
        aria-label={rotate ? 'Повернуть' : 'Вверх'}
      >
        {rotate ? <RotateCw size={21} /> : <ArrowUp size={21} />}
      </button>
      <div>
        <button onClick={() => onDirection('left')} aria-label="Влево">
          <ArrowLeft size={21} />
        </button>
        <button onClick={() => onDirection('down')} aria-label="Вниз">
          <ArrowDown size={21} />
        </button>
        <button onClick={() => onDirection('right')} aria-label="Вправо">
          <ArrowRight size={21} />
        </button>
        {drop && (
          <button onClick={drop} className="drop-button" aria-label="Сбросить фигуру">
            <ArrowDown size={18} />
            <span>Сбросить</span>
          </button>
        )}
      </div>
    </div>
  );
}
export default function PlayPage() {
  const { id } = useParams(),
    { data, refresh } = useApp(),
    game = data?.games.find((g) => g.id === id);
  const [session, setSession] = useState<GameSession | null>(null),
    [busy, setBusy] = useState(false),
    [starting, setStarting] = useState(false),
    [error, setError] = useState(''),
    [now, setNow] = useState(Date.now()),
    [flagMode, setFlagMode] = useState(false),
    [finishAsk, setFinishAsk] = useState(false);
  const queued = useRef<Action[]>([]),
    dispatchRef = useRef<(action: Action) => Promise<void>>(() => Promise.resolve());
  const current = useRef<GameSession | null>(null),
    pending = useRef(false),
    controls = useRef({ direction: 'right', flap: false }),
    errorRef = useRef(''),
    pageId = useRef(id);
  errorRef.current = error;
  pageId.current = id;
  const update = useCallback((s: GameSession) => {
    current.current = s;
    setSession(s);
  }, []);
  useEffect(() => {
    current.current = null;
    setSession(null);
    setError('');
    pending.current = false;
    queued.current = [];
    controls.current = { direction: 'right', flap: false };
    setFlagMode(false);
  }, [id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  const send = useCallback(
    async (action: Action) => {
      const s = current.current,
        requestPage = pageId.current;
      if (!s || s.state.finished) return;
      if (pending.current) {
        if (action.type !== 'tick' && queued.current.length < 4) queued.current.push(action);
        return;
      }
      pending.current = true;
      setBusy(true);
      try {
        const response = await post<GameSession>(`/sessions/${s.id}/action`, {
          version: s.state.version,
          action,
        });
        if (requestPage !== pageId.current) return;
        update(response);
        if (response.state.finished) void refresh();
      } catch (e) {
        if (e instanceof ApiError && e.state) {
          update({ ...s, state: e.state });
        } else if (e instanceof ApiError && e.status === 429) {
          /* A rapid keypress may be safely retried on the next tick. */
        } else {
          setError(errorMessage(e));
        }
      } finally {
        pending.current = false;
        setBusy(false);
        if (requestPage === pageId.current) {
          const next = queued.current.shift();
          if (next) queueMicrotask(() => void dispatchRef.current(next));
        }
      }
    },
    [update, refresh],
  );
  dispatchRef.current = send;
  const direction = useCallback(
    (d: string) => {
      if (game?.engine === 'snake') controls.current.direction = d;
      else if (game?.engine === '2048') void send({ type: 'move', direction: d });
      else if (game?.engine === 'tetris') void send({ type: d === 'up' ? 'rotate' : d });
    },
    [game?.engine, send],
  );
  useEffect(() => {
    if (!session || session.state.finished) return;
    const interval = timedIntervals[session.state.engine] || 1000;
    const timer = setInterval(() => {
      if (pending.current || errorRef.current) return;
      const action: Action = { type: 'tick' };
      if (current.current?.state.engine === 'snake') action.direction = controls.current.direction;
      if (current.current?.state.engine === 'flappy') {
        action.flap = controls.current.flap;
        controls.current.flap = false;
      }
      void send(action);
    }, interval);
    return () => clearInterval(timer);
  }, [session?.id, session?.state.finished, send]);
  useEffect(() => {
    if (!session || session.state.finished) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input,textarea,select') || finishAsk) return;
      const engine = current.current?.state.engine;
      const ds: Record<string, string> = {
        ArrowUp: 'up',
        KeyW: 'up',
        ArrowDown: 'down',
        KeyS: 'down',
        ArrowLeft: 'left',
        KeyA: 'left',
        ArrowRight: 'right',
        KeyD: 'right',
      };
      if (ds[e.code] && ['snake', 'tetris', '2048'].includes(engine || '')) {
        e.preventDefault();
        direction(ds[e.code]);
      } else if (e.code === 'Space' && ['reaction', 'flappy', 'tetris'].includes(engine || '')) {
        e.preventDefault();
        if (engine === 'flappy') controls.current.flap = true;
        else void send({ type: engine === 'reaction' ? 'react' : 'drop' });
      } else if (/^Digit[1-9]$/.test(e.code)) {
        const n = Number(e.code.slice(-1)) - 1;
        if (engine === 'rps' && n < 3) void send({ type: 'choose', choice: n });
        if (engine === 'quiz' && n < 4) void send({ type: 'answer', choice: n });
        if (engine === 'sequence' && n < 4) void send({ type: 'tap', index: n });
        if (engine === 'whack') void send({ type: 'hit', index: n });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [session?.id, session?.state.finished, direction, send, finishAsk]);
  async function start() {
    if (!game) return;
    const requestGame = game.id;
    setStarting(true);
    setError('');
    try {
      const s = await post<GameSession>(`/games/${game.id}/start`);
      if (requestGame !== pageId.current) return;
      update(s);
      controls.current = { direction: s.state.direction || 'right', flap: false };
      if (s.state.finished) void refresh();
    } catch (e) {
      setError(errorMessage(e));
      void refresh();
    } finally {
      setStarting(false);
    }
  }
  if (!game)
    return (
      <EmptyState
        title="Игра временно недоступна"
        description="Возможно, администрация обновляет её. Выбери другую игру."
        action={
          <Link className="button primary" to="/games">
            К мини-играм
          </Link>
        }
      />
    );
  const guide = guides[game.engine],
    s = session?.state,
    finished = s?.finished,
    seconds = s ? Math.max(0, Math.ceil((s.expiresAt - now) / 1000)) : 180;
  const cooling = game.cooldown_until ? Math.max(0, Math.ceil((game.cooldown_until - now) / 1000)) : 0;
  const unavailable =
    game.attempts_left <= 0 ||
    cooling > 0 ||
    data?.event.event_status !== 'active' ||
    Date.parse(data?.event.start_date || '') > now ||
    data?.user?.status === 'blocked';
  return (
    <div className="play-page page-enter">
      <div className="game-breadcrumb">
        <Link to="/games">
          <ArrowLeft size={16} />
          Все мини-игры
        </Link>
        <ChevronRight size={13} />
        <span>{game.name}</span>
        <span className="server-verified">
          <ShieldCheck size={14} />
          Серверная проверка
        </span>
      </div>
      <div className="play-title">
        <div>
          <span className="eyebrow">
            {game.category.toUpperCase()}
            <span>·</span>
            {game.difficulty.toUpperCase()}
          </span>
          <h1>{game.name}</h1>
        </div>
        <span className="max-game-reward">
          <Coin size={28} />
          <span>
            ТВОЯ НАГРАДА
            <strong>
              до {game.max_reward} <small>COINS</small>
            </strong>
          </span>
        </span>
      </div>
      <div className="play-layout">
        <section className={`game-stage stage-${game.engine}`}>
          <div className="game-stage-toolbar">
            <span>
              <i className={s && !finished ? 'live-dot' : ''} />
              {finished ? 'Раунд завершён' : s ? 'Раунд идёт' : 'Готов к новому рекорду?'}
            </span>
            <div>
              {s && (
                <>
                  <span>
                    <Trophy size={15} />
                    {number(s.score)} <small>{s.engine === 'reaction' ? 'мс' : 'очк.'}</small>
                  </span>
                  <span className={seconds < 30 ? 'time-low' : ''}>
                    <Clock3 size={15} />
                    {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                    {String(seconds % 60).padStart(2, '0')}
                  </span>
                </>
              )}
              {s && !finished && (
                <button onClick={() => setFinishAsk(true)} aria-label="Завершить раунд">
                  <Square size={14} />
                  <span>Завершить</span>
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="game-error" role="alert">
              <span>{error}</span>
              {session && !finished && <button onClick={() => setError('')}>Повторить</button>}
            </div>
          )}
          {!s ? (
            <div className="game-start-screen">
              <GameArt engine={game.engine} accent={game.accent} large />
              <span className="eyebrow">
                {game.engine === 'whack' ? '30 СЕКУНД ЧИСТОГО АЗАРТА' : 'ТВОЯ ПОБЕДА НАЧИНАЕТСЯ ЗДЕСЬ'}
              </span>
              <h2>{guide.title}</h2>
              <p>{guide.description}</p>
              <button
                className="button primary start-game-button"
                onClick={start}
                disabled={starting || unavailable}
              >
                {starting ? (
                  <Spinner />
                ) : (
                  <>
                    {cooling
                      ? `Новая попытка через ${cooling} сек.`
                      : game.attempts_left <= 0
                        ? 'Новые попытки завтра'
                        : unavailable
                          ? 'Ивент сейчас не активен'
                          : 'Начать игру'}
                    {!unavailable && <PlayIcon size={18} />}
                  </>
                )}
              </button>
              <span className="start-control-note">
                <MousePointer2 size={14} />
                {guide.control}
              </span>
            </div>
          ) : finished ? (
            <div className="game-result">
              <span className={`result-symbol ${session?.result?.coins ? 'win' : ''}`}>
                {session?.result?.coins ? <Trophy size={39} /> : <Leaf size={39} />}
              </span>
              <span className="eyebrow">{s.won ? 'КРАСИВАЯ ПОБЕДА' : 'КАЖДЫЙ РАУНД — НОВЫЙ ОПЫТ'}</span>
              <h2>{session?.result?.coins ? 'Вот это игра!' : 'Следующий будет твоим.'}</h2>
              <p>{s.message}</p>
              <div className="result-coins">
                <Coin size={33} />
                <strong>+{number(session?.result?.coins || 0)}</strong>
                <span>COINS</span>
              </div>
              {!!session?.result?.bonus && (
                <div className="bonus-reward">
                  <Sparkles size={16} />И ещё +{session.result.bonus} COINS за достижения!
                </div>
              )}
              <div className="result-stats">
                <span>
                  Результат
                  <b>
                    {number(s.score)}
                    {s.engine === 'reaction' ? ' мс' : ''}
                  </b>
                </span>
                <span>
                  Твой баланс<b>{number(data?.user?.coins || 0)} COINS</b>
                </span>
                <span>
                  Место в рейтинге<b>#{data?.user?.rank || '—'}</b>
                </span>
              </div>
              {s.engine === 'quiz' && (
                <details className="quiz-review">
                  <summary>
                    Разбор ответов
                    <ChevronRight size={15} />
                  </summary>
                  {s.answers.map((a: any, i: number) => (
                    <div key={i}>
                      {a.correct ? <Check size={16} /> : <X size={16} />}
                      <span>
                        {a.question}
                        <b>{a.correctText}</b>
                      </span>
                    </div>
                  ))}
                </details>
              )}
              <div className="result-buttons">
                <Link to="/games" className="button primary">
                  К следующей игре
                  <ArrowRight size={18} />
                </Link>
                <button
                  className="button secondary"
                  disabled={unavailable}
                  onClick={() => {
                    setSession(null);
                    current.current = null;
                  }}
                >
                  {cooling
                    ? `Ещё раз через ${cooling} сек.`
                    : game.attempts_left <= 0
                      ? 'На сегодня всё'
                      : 'Ещё один раунд'}
                </button>
              </div>
              <span className="result-saved">
                <ShieldCheck size={13} />
                Результат сохранён на сервере
              </span>
            </div>
          ) : (
            <div className={`game-live live-${game.engine}`}>
              <GameBoard
                state={s}
                send={send}
                busy={busy}
                now={now}
                direction={direction}
                flap={() => {
                  controls.current.flap = true;
                }}
                flagMode={flagMode}
                setFlagMode={setFlagMode}
              />
            </div>
          )}
        </section>
        <aside className="game-instructions">
          <div className="instruction-heading">
            <Lightbulb size={21} />
            <h2>Как играть</h2>
          </div>
          <p>{guide.description}</p>
          <ol>
            {guide.rules.map((r, i) => (
              <li key={r}>
                <span>0{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
          <div className="controls-note">
            <MousePointer2 size={19} />
            <span>{guide.control}</span>
          </div>
          <div className="game-limits">
            <span>
              <Heart size={16} />
              Попытки сегодня<b>{game.attempts_left} / 5</b>
            </span>
            <span>
              <Clock3 size={16} />
              Между раундами<b>60 сек.</b>
            </span>
            <span>
              <Coin size={16} />
              Максимум за раунд<b>{game.max_reward}</b>
            </span>
          </div>
          <div className="game-fair-note">
            <ShieldCheck size={17} />
            <p>Коины начисляются только сервером. Играй честно — и результат останется с тобой.</p>
          </div>
          <Link to="/profile" className="text-link">
            Мои результаты
            <ArrowUpRight size={17} />
          </Link>
        </aside>
      </div>
      <div className="play-bottom-note">
        <Maple size={19} />
        <span>
          Победы приятнее, когда они честные. <b>Хорошей игры!</b>
        </span>
        <Link to="/info">
          Правила ивента
          <ArrowUpRight size={15} />
        </Link>
      </div>
      {finishAsk && (
        <Modal title="Завершить этот раунд?" onClose={() => setFinishAsk(false)}>
          <p className="modal-description">
            Текущий результат сохранится. В «Сапёре» и «Памяти» награда выдаётся только за полное прохождение.
            Раунд засчитается в дневной лимит.
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setFinishAsk(false)}>
              Продолжить игру
            </button>
            <button
              className="button primary"
              onClick={() => {
                setFinishAsk(false);
                void send({ type: 'finish' });
              }}
            >
              Завершить
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function GameBoard({
  state: s,
  send,
  busy,
  now,
  direction,
  flap,
  flagMode,
  setFlagMode,
}: {
  state: GameState;
  send: (a: Action) => Promise<void>;
  busy: boolean;
  now: number;
  direction: (d: string) => void;
  flap: () => void;
  flagMode: boolean;
  setFlagMode: (v: boolean) => void;
}) {
  const [guess, setGuess] = useState(''),
    touch = useRef<{ x: number; y: number } | null>(null);
  const { notify } = useApp();
  if (s.engine === 'mines')
    return (
      <>
        <div className="board-meta">
          <span>
            <Bomb size={16} />6 мин
          </span>
          <span>
            Осталось открыть: <b>{s.remaining}</b>
          </span>
          <button
            className={flagMode ? 'active' : ''}
            onClick={() => setFlagMode(!flagMode)}
            aria-pressed={flagMode}
          >
            <Flag size={15} />
            Флажок
          </button>
        </div>
        <div className="mines-board">
          {s.cells.map((cell: number | string | null, i: number) => (
            <button
              key={i}
              className={`mine-cell ${cell !== null ? 'revealed' : ''} cell-${cell}`}
              aria-label={`Клетка ${Math.floor(i / 6) + 1}, ${(i % 6) + 1}${cell !== null ? `, открыта: ${cell}` : s.flags.includes(i) ? ', флаг' : ''}`}
              disabled={cell !== null || busy}
              onClick={() => void send({ type: flagMode ? 'flag' : 'reveal', index: i })}
              onContextMenu={(e) => {
                e.preventDefault();
                void send({ type: 'flag', index: i });
              }}
            >
              {s.flags.includes(i) ? <Flag size={22} /> : cell === 'mine' ? <Bomb size={23} /> : cell || null}
            </button>
          ))}
        </div>
        <p className="board-hint">
          <MousePointer2 size={14} />
          {flagMode
            ? 'Режим флага: отмечай предполагаемые мины'
            : 'Первый ход безопасен. Дальше — только логика.'}
        </p>
      </>
    );
  if (s.engine === 'memory') {
    const symbols = ['🍁', '🍄', '🎃', '🌰', '🍎', '🌻', '🦊', '🍂'];
    return (
      <>
        <div className="board-meta">
          <span>
            Найдено пар: <b>{s.matched.length / 2} / 8</b>
          </span>
          <span>
            Ходов: <b>{s.moves}</b>
          </span>
        </div>
        <div className="memory-board">
          {s.cards.map((v: number | null, i: number) => (
            <button
              key={i}
              className={`memory-card ${v !== null ? 'flipped' : ''} ${s.matched.includes(i) ? 'matched' : ''}`}
              aria-label={`Карточка ${i + 1}${v !== null ? `: ${symbols[v]}` : ''}`}
              disabled={busy || s.matched.includes(i) || v !== null}
              onClick={() => void send({ type: 'reveal', index: i })}
            >
              {v !== null ? <span>{symbols[v]}</span> : <Maple size={29} />}
            </button>
          ))}
        </div>
        <p className="board-hint">Смотри внимательно. Осень любит повторяться.</p>
      </>
    );
  }
  if (s.engine === 'snake')
    return (
      <>
        <div className="board-meta">
          <span>
            Яблоки: <b>{s.apples} / 18</b>
          </span>
          <span>
            Длина: <b>{s.snake.length}</b>
          </span>
        </div>
        <svg
          className="snake-board"
          viewBox="0 0 280 280"
          role="img"
          aria-label={`Змейка. Собрано яблок: ${s.apples}`}
        >
          <defs>
            <pattern id="snake-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="#18231a" />
              <path d="M20 0H0V20" stroke="#283b29" strokeWidth=".6" />
            </pattern>
          </defs>
          <rect width="280" height="280" rx="5" fill="url(#snake-grid)" />
          {s.food && (
            <g transform={`translate(${s.food[0] * 20 + 10} ${s.food[1] * 20 + 10})`}>
              <circle r="7" fill="#ed9660" />
              <path d="M0-6q-2-7 4-7" stroke="#9ab775" strokeWidth="2" />
            </g>
          )}
          {s.snake.map((b: number[], i: number) => (
            <g key={i}>
              <rect
                x={b[0] * 20 + 1}
                y={b[1] * 20 + 1}
                width="18"
                height="18"
                rx={i === 0 ? 6 : 4}
                fill={i === 0 ? '#cceaa2' : `hsl(90, ${40 - i * 0.3}%, ${Math.max(35, 64 - i)}%)`}
              />
              {i === 0 && (
                <>
                  <circle cx={b[0] * 20 + 7} cy={b[1] * 20 + 6} r="2" fill="#22321b" />
                  <circle cx={b[0] * 20 + 13} cy={b[1] * 20 + 6} r="2" fill="#22321b" />
                </>
              )}
            </g>
          ))}
        </svg>
        <Dpad onDirection={direction} />
        <p className="board-hint">Стрелки или WASD. Не врезайся в стены!</p>
      </>
    );
  if (s.engine === 'tetris') {
    const board = s.board.map((r: number[]) => [...r]);
    s.piece.matrix.forEach((r: number[], dy: number) =>
      r.forEach((v: number, dx: number) => {
        if (v && s.piece.y + dy < 16 && s.piece.x + dx >= 0 && s.piece.x + dx < 10)
          board[s.piece.y + dy][s.piece.x + dx] = s.piece.color;
      }),
    );
    return (
      <>
        <div className="tetris-layout">
          <div className="tetris-board">
            {board.flat().map((v: number, i: number) => (
              <div key={i} className={`tetris-cell tet-${v}`} />
            ))}
          </div>
          <div className="tetris-side">
            <span className="eyebrow">ДАЛЬШЕ</span>
            <div className="next-piece" style={{ gridTemplateColumns: `repeat(${s.next[0].length},19px)` }}>
              {s.next.flat().map((v: number, i: number) => (
                <i key={i} className={v ? 'filled' : ''} />
              ))}
            </div>
            <span className="eyebrow">ЛИНИИ</span>
            <strong>
              {s.lines}
              <small> / 6</small>
            </strong>
            <div className="tetris-tip">
              <Sparkles size={17} />
              <p>
                Пробел —<br />
                мгновенный сброс
              </p>
            </div>
          </div>
        </div>
        <Dpad
          onDirection={direction}
          rotate={() => void send({ type: 'rotate' })}
          drop={() => void send({ type: 'drop' })}
        />
      </>
    );
  }
  if (s.engine === 'reaction')
    return (
      <>
        <div className="reaction-rounds">
          {[0, 1, 2].map((i) => (
            <span key={i} className={s.hits.length > i ? 'complete' : ''}>
              {s.hits[i] ? (
                <>
                  <Check size={14} />
                  {s.hits[i]} мс
                </>
              ) : (
                `Сигнал ${i + 1}`
              )}
            </span>
          ))}
        </div>
        <button
          className={`reaction-target ${s.phase === 'go' ? 'go' : 'wait'}`}
          onClick={() => void send({ type: 'react' })}
          aria-label={s.phase === 'go' ? 'Нажимай сейчас!' : 'Жди зелёного сигнала'}
        >
          <Zap size={51} />
          <h2>{s.phase === 'go' ? 'СЕЙЧАС!' : 'Лови момент…'}</h2>
          <p>{s.phase === 'go' ? 'Нажми на поле или пробел' : 'Дождись, когда поле станет зелёным'}</p>
          <span>{s.phase === 'go' ? 'НЕ УПУСТИ ЕГО' : 'Не спеши. Твой сигнал уже близко.'}</span>
        </button>
        <p className="board-hint">Слишком раннее нажатие завершит раунд</p>
      </>
    );
  if (s.engine === 'flappy')
    return (
      <>
        <button
          className="flappy-touch"
          onPointerDown={(e) => {
            e.preventDefault();
            flap();
          }}
          aria-label="Махнуть крыльями"
        >
          <svg viewBox="0 0 320 400" className="flappy-board">
            <defs>
              <linearGradient id="flappy-sky" x2="0" y2="1">
                <stop stopColor="#15211f" />
                <stop offset="1" stopColor="#394235" />
              </linearGradient>
            </defs>
            <rect width="320" height="400" rx="10" fill="url(#flappy-sky)" />
            <circle cx="253" cy="62" r="30" fill="#d0aa6b" opacity=".12" />
            <path d="M0 280 62 207 128 282 213 174 320 257V400H0" fill="#243c2d" />
            <path d="M0 334 51 269 127 322 208 246 320 319V400H0" fill="#2b4930" />
            {s.pipes.map((p: any, i: number) => (
              <g key={i}>
                <rect x={p.x} y="0" width="45" height={p.top} rx="5" fill="#846038" />
                <rect x={p.x - 4} y={p.top - 18} width="53" height="18" rx="5" fill="#c1914e" />
                <rect
                  x={p.x + 8}
                  y="0"
                  width="3"
                  height={Math.max(0, p.top - 18)}
                  fill="#b18b52"
                  opacity=".5"
                />
                <rect x={p.x} y={p.top + 142} width="45" height={400 - p.top - 142} rx="5" fill="#846038" />
                <rect x={p.x - 4} y={p.top + 142} width="53" height="18" rx="5" fill="#c1914e" />
              </g>
            ))}
            <g transform={`translate(72 ${s.birdY})`}>
              <ellipse rx="14" ry="12" fill="#f5c25d" />
              <ellipse cx="-6" cy="3" rx="9" ry="5" fill="#dc8e38" />
              <circle cx="6" cy="-4" r="4" fill="#fff7db" />
              <circle cx="7" cy="-4" r="2" fill="#242418" />
              <path d="m12-2 11 4-11 4" fill="#e27844" />
            </g>
            <text x="160" y="44" textAnchor="middle" fontSize="29" fontWeight="800" fill="#ede5d0">
              {s.passed}
            </text>
            <path d="M0 392h320" stroke="#a59c5a" strokeWidth="8" />
          </svg>
        </button>
        <button
          className="button secondary flap-button"
          onPointerDown={(e) => {
            e.preventDefault();
            flap();
          }}
        >
          <ArrowUp size={17} />
          Взмах крыльев<span>ПРОБЕЛ</span>
        </button>
      </>
    );
  if (s.engine === 'rps') {
    const icons = ['✊', '✋', '✌️'],
      names = ['Камень', 'Бумага', 'Ножницы'],
      last = s.rounds.at(-1);
    return (
      <div className="rps-game">
        <span className="eyebrow">РАУНД {s.rounds.length + 1} ИЗ 5</span>
        <h2>Твой ход.</h2>
        <p>Что выберешь на этот раз?</p>
        <div className="rps-choices">
          {icons.map((icon, i) => (
            <button key={i} disabled={busy} onClick={() => void send({ type: 'choose', choice: i })}>
              <span>{icon}</span>
              <b>{names[i]}</b>
              <small>{i + 1}</small>
            </button>
          ))}
        </div>
        {last ? (
          <div className={`rps-last ${last.result}`}>
            <span>
              {icons[last.yours]}
              <small>ТЫ</small>
            </span>
            <div>
              <b>
                {last.result === 'win'
                  ? 'Твоя победа!'
                  : last.result === 'draw'
                    ? 'Ничья'
                    : 'В этот раз — соперник'}
              </b>
              <small>
                Побед: {s.wins} / {s.rounds.length}
              </small>
            </div>
            <span>
              {icons[last.opponent]}
              <small>СОПЕРНИК</small>
            </span>
          </div>
        ) : (
          <div className="rps-wait">
            <Sparkles size={20} />
            <span>Пять решений. Удача на твоей стороне?</span>
          </div>
        )}
        <div className="rps-history">
          {s.rounds.map((r: any, i: number) => (
            <span key={i} className={r.result}>
              {r.result === 'win' ? <Check size={14} /> : r.result === 'draw' ? '—' : <X size={14} />}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (s.engine === '2048')
    return (
      <>
        <div className="board-meta">
          <span>
            Лучшая плитка: <b>{s.best}</b>
          </span>
          <span>
            Ходов: <b>{s.moves}</b>
          </span>
        </div>
        <div
          className="board-2048"
          onTouchStart={(e) => {
            touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchEnd={(e) => {
            if (!touch.current) return;
            const dx = e.changedTouches[0].clientX - touch.current.x,
              dy = e.changedTouches[0].clientY - touch.current.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) > 20)
              direction(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
            touch.current = null;
          }}
        >
          {s.board.map((v: number, i: number) => (
            <div key={i} className={`number-tile tile-${v}`}>
              {v || ''}
            </div>
          ))}
        </div>
        <Dpad onDirection={direction} />
        <p className="board-hint">Свайпай по полю или используй стрелки</p>
      </>
    );
  if (s.engine === 'whack')
    return (
      <>
        <div className="board-meta">
          <span>
            Урожай: <b>{s.hits} / 18</b>
          </span>
          <span>Лови тыкву!</span>
        </div>
        <div className="whack-board">
          {Array.from({ length: 9 }, (_, i) => (
            <button
              key={i}
              onPointerDown={() => void send({ type: 'hit', index: i })}
              aria-label={`Грядка ${i + 1}${s.target === i ? ', тыква' : ''}`}
              className={s.target === i ? 'has-pumpkin' : ''}
              disabled={s.target !== i}
            >
              <span className="garden-hole" />
              {s.target === i && <span className="pumpkin">🎃</span>}
              <small>{i + 1}</small>
            </button>
          ))}
        </div>
        <p className="board-hint">Тыква не ждёт. Нажимай, пока не спряталась!</p>
      </>
    );
  if (s.engine === 'quiz')
    return (
      <div className="quiz-game">
        <div className="quiz-progress">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={
                i === s.index ? 'current' : i < s.index ? (s.answers[i]?.correct ? 'right' : 'wrong') : ''
              }
            />
          ))}
        </div>
        <span className="eyebrow">ВОПРОС {s.index + 1} ИЗ 5</span>
        <h2>{s.question.text}</h2>
        <div className="quiz-options">
          {s.question.options.map((o: string, i: number) => (
            <button
              key={`${s.index}-${i}`}
              disabled={busy}
              onClick={() => void send({ type: 'answer', choice: i })}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {o}
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
        {s.answers.length > 0 && (
          <div className={`quiz-feedback ${s.answers.at(-1).correct ? 'right' : 'wrong'}`}>
            {s.answers.at(-1).correct ? (
              <>
                <Check size={16} />
                Предыдущий ответ верный!
              </>
            ) : (
              <>
                <Lightbulb size={16} />
                Верный ответ: {s.answers.at(-1).correctText}
              </>
            )}
          </div>
        )}
      </div>
    );
  if (s.engine === 'sequence') {
    const elapsed = now - (s.showUntil - s.length * 750),
      idx = Math.floor(elapsed / 750),
      lit = s.phase === 'show' && elapsed >= 0 && elapsed % 750 < 500 ? s.sequence[idx] : -1;
    return (
      <>
        <div className="board-meta">
          <span>
            Уровень: <b>{s.completed + 1} / 7</b>
          </span>
          <span>
            {s.phase === 'show' ? 'Запоминай' : 'Повторяй'}
            <b>{s.phase === 'input' ? ` ${s.entered} / ${s.length}` : ''}</b>
          </span>
        </div>
        <h2 className="sequence-title">
          {s.phase === 'show' ? 'Смотри и запоминай.' : 'Теперь твоя очередь.'}
        </h2>
        <div className="sequence-board">
          {['Янтарь', 'Шалфей', 'Лаванда', 'Терракота'].map((c, i) => (
            <button
              key={c}
              aria-label={c}
              className={`sequence-pad pad-${i} ${lit === i ? 'lit' : ''}`}
              disabled={s.phase === 'show' || busy}
              onClick={() => void send({ type: 'tap', index: i })}
            >
              <span>{['✦', '❋', '◆', '●'][i]}</span>
              <small>{i + 1}</small>
            </button>
          ))}
        </div>
        <p className="board-hint">
          {s.phase === 'show'
            ? 'Кнопки станут активны после последовательности'
            : 'Повтори цвета в том же порядке'}
        </p>
      </>
    );
  }
  if (s.engine === 'guess')
    return (
      <div className="guess-game">
        <span className="guess-symbol">
          <Hash size={48} />
        </span>
        <span className="eyebrow">СЕКРЕТНОЕ ЧИСЛО ОТ 1 ДО 100</span>
        <h2>{s.hint}</h2>
        <p>
          Осталось попыток: <b>{7 - s.guesses.length}</b>
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(guess);
            if (s.guesses.includes(n)) {
              notify('Это число уже было. Попробуй другое.');
              return;
            }
            void send({ type: 'guess', number: n });
            setGuess('');
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="100"
            step="1"
            placeholder="?"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            aria-label="Твоя догадка от 1 до 100"
            required
            autoFocus
          />
          <button className="button primary" disabled={busy}>
            Проверить
            <ArrowRight size={18} />
          </button>
        </form>
        <div className="guess-history">
          {s.guesses.map((n: number) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <div className="guess-tip">
          <Lightbulb size={18} />
          <p>Подсказка: каждый раз дели оставшийся диапазон пополам.</p>
        </div>
      </div>
    );
  return null;
}
