import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleHelp,
  Fingerprint,
  Gamepad2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Coin, Discord, Maple } from '../components/Artwork';
import {
  BottomSteps,
  Countdown,
  EventStatus,
  GameCard,
  Modal,
  SectionHeading,
  Spinner,
} from '../components/UI';
import { errorMessage, post, useApp } from '../lib';
import type { User } from '../lib';

export default function Registration({ loginOnly = false }: { loginOnly?: boolean }) {
  const { data, refresh, acceptAuthenticatedUser, notify, authMode, setAuthMode, setRulesOpen, setRecovery } =
      useApp(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [idHelp, setIdHelp] = useState(false);
  const register = !loginOnly && authMode === 'register';
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const result = await post<{ user: User; recovery_key?: string }>(
        register ? '/auth/register' : '/auth/login',
        register
          ? {
              nickname: f.get('nickname'),
              username: f.get('username'),
              discord_id: f.get('discord_id'),
              rules: f.get('rules') === 'on',
            }
          : { code: f.get('code'), key: f.get('key') },
      );
      acceptAuthenticatedUser(result.user);
      if (result.recovery_key) setRecovery(result.recovery_key);
      else notify('С возвращением! Новые рекорды уже ждут.', 'success');
      navigate(register ? '/profile' : '/', { replace: true });
      window.scrollTo({ top: 0 });
      void refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="registration-page page-enter">
      <div className="season-ribbon">
        <span>
          <Maple size={15} />
          <b>НОВЫЙ СЕЗОН</b>
          <i />
          Маленькие игры. Большие победы.
        </span>
        <div>
          <EventStatus />
          <Countdown compact />
        </div>
      </div>
      <section className="registration-hero">
        <div className="hero-story">
          <div className="eyebrow hero-eyebrow">
            <span className="tiny-line" />
            DISCORD-СООБЩЕСТВО SRP ПРЕДСТАВЛЯЕТ
          </div>
          <h1>
            Эта осень —<br />
            <em>твоя игра.</em>
            <Maple size={44} className="heading-leaf" />
          </h1>
          <p className="hero-description">
            Лови момент. Собирай коины. Забирай награды.
            <br />
            Твоя новая история начинается в <b>{data?.event.event_name || 'SRP EVENT'}.</b>
          </p>
          <div className="hero-perks">
            <span>
              <Gamepad2 size={17} />
              <b>{data?.games.length || 12}</b> мини-игр
            </span>
            <i />
            <span>
              <Trophy size={16} />
              <b>5</b> призовых мест
            </span>
            <i />
            <span>
              <Users size={16} />
              Свои люди
            </span>
          </div>
          <div className="hero-art-wrap">
            <div className="art-aura" />
            <img
              src="/images/autumn-world.webp"
              alt="Осенний игровой мир: парящий остров, золотые листья и игровой контроллер"
              className="hero-art"
              fetchPriority="high"
            />
            <div className="floating-coin-card">
              <span className="floating-coin-icon">
                <Coin size={30} />
              </span>
              <div>
                <strong>Каждая победа ценна.</strong>
                <span>Играй. Зарабатывай. Повторяй.</span>
              </div>
              <Sparkles size={15} />
            </div>
            <div className="floating-leaf-note">
              <Maple size={16} />
              <span>100% осенний вайб</span>
            </div>
          </div>
        </div>
        <div className="join-column">
          <div className="join-card" id="join-form">
            <div className="join-card-heading">
              <span className="join-icon">
                <Discord size={23} />
              </span>
              <span className="eyebrow">{register ? 'ТВОЙ ПЕРВЫЙ ШАГ' : 'РАДЫ ВИДЕТЬ СНОВА'}</span>
              <span className="join-step">{register ? '01 / 03' : <BadgeCheck size={20} />}</span>
            </div>
            <h2>{register ? 'Вступай в игру' : 'С возвращением'}</h2>
            <p className="join-description">
              {register
                ? 'Зарегистрируйся, чтобы принять участие в ивенте и начать зарабатывать коины.'
                : 'Твои коины и рекорды уже ждут. Войди с личным SRP-кодом и секретным ключом.'}
            </p>
            <form onSubmit={submit} key={authMode}>
              {register ? (
                <>
                  <label className="field">
                    <span>
                      Никнейм в Discord <i>*</i>
                    </span>
                    <div className="input-wrap">
                      <UserRound size={17} />
                      <input
                        name="nickname"
                        aria-label="Никнейм в Discord"
                        placeholder="Как тебя называть?"
                        minLength={2}
                        maxLength={24}
                        autoComplete="nickname"
                        required
                      />
                    </div>
                  </label>
                  <label className="field">
                    <span>
                      Username в Discord <i>*</i>
                    </span>
                    <div className="input-wrap">
                      <span className="input-at">@</span>
                      <input
                        name="username"
                        aria-label="Username в Discord"
                        placeholder="your.username"
                        minLength={2}
                        maxLength={33}
                        pattern="@?[a-zA-Z0-9_.]{2,32}"
                        autoCapitalize="none"
                        spellCheck={false}
                        autoComplete="username"
                        required
                      />
                    </div>
                  </label>
                  <label className="field">
                    <span>
                      Discord ID <i>*</i>
                      <button
                        type="button"
                        className="field-help"
                        aria-label="Где найти Discord ID?"
                        onClick={() => setIdHelp(true)}
                      >
                        <CircleHelp size={13} />
                      </button>
                    </span>
                    <div className="input-wrap">
                      <Fingerprint size={17} />
                      <input
                        name="discord_id"
                        aria-label="Discord ID"
                        placeholder="Уникальный ID твоего аккаунта"
                        inputMode="numeric"
                        minLength={17}
                        maxLength={20}
                        pattern="[0-9]{17,20}"
                        required
                      />
                    </div>
                  </label>
                  <div className="auto-code-note">
                    <Sparkles size={12} />
                    Личный SRP-код создадим автоматически
                  </div>
                  <label className="checkbox-row">
                    <input name="rules" type="checkbox" required />
                    <span>
                      Я принимаю{' '}
                      <button type="button" onClick={() => setRulesOpen(true)}>
                        правила ивента
                      </button>
                      <br className="checkbox-break" /> и подтверждаю своё участие
                    </span>
                  </label>
                </>
              ) : (
                <>
                  <label className="field">
                    <span>Личный код</span>
                    <div className="input-wrap">
                      <Fingerprint size={17} />
                      <input
                        name="code"
                        placeholder="SRP-XXX"
                        minLength={7}
                        maxLength={7}
                        pattern="[Ss][Rr][Pp]-[A-Za-z0-9]{3}"
                        required
                        autoComplete="username"
                      />
                    </div>
                  </label>
                  <label className="field">
                    <span>Ключ восстановления</span>
                    <div className="input-wrap">
                      <KeyRound size={17} />
                      <input
                        name="key"
                        type="password"
                        placeholder="Секретный ключ, выданный при регистрации"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </label>
                  <div className="notice subtle login-notice">
                    <ShieldCheck size={18} />
                    <p>Это не пароль от Discord. Используй ключ, который ты сохранил при создании профиля.</p>
                  </div>
                </>
              )}
              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}
              <button type="submit" className="button primary full register-submit" disabled={busy}>
                {busy ? (
                  <Spinner />
                ) : (
                  <>
                    {register ? 'Создать профиль' : 'Войти в профиль'}
                    <ArrowUpRight size={19} />
                  </>
                )}
              </button>
            </form>
            <div className="join-login">
              {register
                ? 'Уже участвуешь?'
                : data?.event.event_status === 'finished'
                  ? 'Сезон завершён.'
                  : 'Ещё не с нами?'}{' '}
              <button
                onClick={() => {
                  setAuthMode(register ? 'login' : 'register');
                  setError('');
                  if (loginOnly) navigate('/');
                }}
              >
                {register
                  ? 'Войти в профиль'
                  : data?.event.event_status === 'finished'
                    ? 'Итоговый рейтинг'
                    : 'Создать профиль'}
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
          <div className="join-security">
            <ShieldCheck size={13} />
            <span>Только Discord-данные. Никаких паролей.</span>
          </div>
        </div>
      </section>
      <section className="registration-games">
        <SectionHeading
          label="НАЙДИ СВОЮ ИГРУ"
          title="Разные игры. Один азарт."
          link="/games"
          labelRight={`Все ${data?.games.length || 12} игр`}
          onClick={(e) => {
            e.preventDefault();
            notify('Сначала создай профиль — это займёт всего минуту.');
            document.querySelector('#join-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
        <div className="game-grid teaser-grid">
          {data?.games.slice(0, 4).map((g) => (
            <GameCard game={g} key={g.id} />
          ))}
        </div>
      </section>
      <BottomSteps />
      {idHelp && (
        <Modal title="Где найти Discord ID?" onClose={() => setIdHelp(false)}>
          <div className="rules-content">
            <p>Discord ID — это 17–20 цифр. Это не username и не твой будущий SRP-код.</p>
            <ol>
              <li>Открой Discord → Настройки пользователя → Расширенные.</li>
              <li>Включи «Режим разработчика».</li>
              <li>Нажми правой кнопкой на свой аватар (на телефоне — открой профиль и меню ⋯).</li>
              <li>Выбери «Копировать ID пользователя» и вставь его в форму.</li>
            </ol>
          </div>
          <button className="button primary full" onClick={() => setIdHelp(false)}>
            Понятно
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
    </div>
  );
}
