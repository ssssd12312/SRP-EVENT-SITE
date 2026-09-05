import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowRight, RefreshCw, ShieldAlert } from 'lucide-react';
import '@fontsource-variable/manrope';
import { AppProvider, useApp } from './lib';
import { Footer, GlobalModals, Header, Spinner, Toasts } from './components/UI';
import { Maple } from './components/Artwork';
import Registration from './pages/Registration';
import { Games, Home, Information, Leaderboard, Profile, Rewards } from './pages/Portal';
import PlayPage from './pages/Play';
import Admin from './pages/Admin';
import './styles.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
function Site() {
  const { data, loading, error, refresh } = useApp(),
    location = useLocation();
  useEffect(() => {
    const names: Record<string, string> = {
      '/games': 'Мини-игры',
      '/leaderboard': 'Лидерборд',
      '/rewards': 'Награды',
      '/profile': 'Профиль',
      '/info': 'Об ивенте',
      '/admin': 'Управление',
      '/login': 'Вход',
    };
    document.title =
      (names[location.pathname] ? names[location.pathname] + ' · ' : '') +
      (data?.event.event_name || 'SRP EVENT') +
      ' — Осень твоих побед';
  }, [location.pathname, data?.event.event_name]);
  const admitted = !!data?.user || data?.event.event_status === 'finished';
  return (
    <>
      <a className="skip-link" href="#main-content">
        К содержимому
      </a>
      <div className="ambient-leaves" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Maple key={i} size={12 + i * 3} className={`ambient-leaf ambient-leaf-${i}`} />
        ))}
      </div>
      <Header />
      <main className="site-main" id="main-content">
        {loading ? (
          <div className="loading-page">
            <span className="loading-brand">
              <Maple size={37} />
            </span>
            <Spinner size={24} />
            <p>Собираем осеннее настроение…</p>
          </div>
        ) : !data ? (
          <div className="error-page">
            <ShieldAlert size={40} />
            <h1>Кажется, листья запутали провода.</h1>
            <p>{error || 'Не удалось связаться с сервером.'}</p>
            <button className="button primary" onClick={() => void refresh()}>
              <RefreshCw size={17} />
              Попробовать ещё раз
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="connection-banner">
                Связь с сервером прервалась. Показываем последние сохранённые данные.
                <button onClick={() => void refresh()}>Повторить</button>
              </div>
            )}
            {data.user?.status === 'blocked' && (
              <div className="blocked-banner">
                <ShieldAlert size={20} />
                Профиль заблокирован. Игры и начисления недоступны. Обратись к администрации SRP.
              </div>
            )}
            {data.event.event_status === 'paused' && location.pathname !== '/admin' && (
              <div className="paused-banner">
                Ивент на небольшой паузе. Коины и результаты сохранены — скоро продолжим.
              </div>
            )}
            <Routes>
              <Route
                path="/login"
                element={data.user ? <Navigate to="/" replace /> : <Registration loginOnly />}
              />
              <Route
                path="/"
                element={
                  data.event.event_status === 'finished' ? (
                    <Leaderboard final />
                  ) : data.user ? (
                    <Home />
                  ) : (
                    <Registration />
                  )
                }
              />
              <Route path="/games" element={admitted ? <Games /> : <Navigate to="/" replace />} />
              <Route path="/leaderboard" element={admitted ? <Leaderboard /> : <Navigate to="/" replace />} />
              <Route path="/rewards" element={admitted ? <Rewards /> : <Navigate to="/" replace />} />
              <Route path="/info" element={admitted ? <Information /> : <Navigate to="/" replace />} />
              <Route path="/profile" element={data.user ? <Profile /> : <Navigate to="/" replace />} />
              <Route path="/play/:id" element={data.user ? <PlayPage /> : <Navigate to="/" replace />} />
              <Route path="/admin" element={<Admin />} />
              <Route
                path="*"
                element={
                  <div className="not-found">
                    <Maple size={50} />
                    <span className="eyebrow">404 · ЗАТЕРЯЛСЯ СРЕДИ ЛИСТЬЕВ?</span>
                    <h1>Здесь пока ничего нет.</h1>
                    <p>Но на главной тебя ждёт целый сезон приключений.</p>
                    <Link to="/" className="button primary">
                      На главную
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                }
              />
            </Routes>
          </>
        )}
      </main>
      <Footer />
      <Toasts />
      <GlobalModals />
      <ScrollToTop />
    </>
  );
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="error-page">
        <Maple size={40} />
        <h1>Небольшая заминка.</h1>
        <p>Твой профиль и баланс сохранены на сервере.</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Перезагрузить страницу
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <Site />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
