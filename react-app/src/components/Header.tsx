import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AnimatedTextBar } from './AnimatedTextBar';

const drawerBaseClasses =
  'fixed left-0 top-0 h-full w-64 shadow-xl z-50 overflow-y-auto lg:hidden transform transition-transform duration-300';

export const Header = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { username, progress } = useAppContext();
  const location = useLocation();
  const isCelebrationRoute = location.pathname.startsWith('/complete');
  const confettiColors = useMemo(() => ['#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ffc6ff'], []);
  const [colorIndex, setColorIndex] = useState(0);
  const isComplete = progress.total > 0 && progress.processed >= progress.total;
  const shouldAnimateHeader = isComplete || isCelebrationRoute;

  useEffect(() => {
    if (!isComplete || confettiColors.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setColorIndex(current => (current + 1) % confettiColors.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [confettiColors, isComplete]);

  const nextColor = confettiColors[(colorIndex + 1) % confettiColors.length];
  const headerStyle = shouldAnimateHeader
    ? {
        background: `linear-gradient(120deg, ${confettiColors[colorIndex]}, ${nextColor})`,
        transition: 'background 0.8s ease-in-out',
      }
    : {
        background: '#1f1d2e',
        transition: 'background 0.8s ease-in-out',
      };

  // Show AnimatedTextBar on celebration page
  if (isCelebrationRoute) {
    return (
      <>
        <header
          className="sticky top-0 z-50 border-b border-[#26233a] shadow-lg"
          style={headerStyle}
        >
          <AnimatedTextBar
            text="♪ Dead or Alive - You Spin Me Round (Like a Record) ♪"
            className="h-20"
          />
        </header>

        {drawerOpen && (
          <div
            className="fixed inset-0 bg-[#191724]/70 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <div
          className={`${drawerBaseClasses} ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} bg-[#1f1d2e] text-[var(--rp-base05)]`}
        >
          <div className="flex items-center justify-between p-4 border-b border-[#26233a]">
            <h2 className="text-lg font-bold">Menu</h2>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--rp-base0D)] hover:bg-[#26233a]"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5 text-[var(--rp-base05)]" />
            </button>
          </div>

          <div className="p-4 border-b border-[#26233a] bg-[#1f1d2e]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--rp-base02)]">
                <span className="text-[var(--rp-base0D)]">👤</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--rp-base04)]">Username</p>
                <p className="font-medium text-[var(--rp-base05)]">{username || 'Not Set'}</p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-2 text-[var(--rp-base04)]">
            <Link
              to="/"
              onClick={() => setDrawerOpen(false)}
              className="block px-4 py-2 rounded-md font-medium transition-colors hover:bg-[#26233a] hover:text-[var(--rp-base0C)]"
            >
              Home
            </Link>
            <Link
              to="/stats"
              onClick={() => setDrawerOpen(false)}
              className="block px-4 py-2 rounded-md font-medium transition-colors hover:bg-[#26233a] hover:text-[var(--rp-base0C)]"
            >
              Stats
            </Link>
            <Link
              to="/help"
              onClick={() => setDrawerOpen(false)}
              className="block px-4 py-2 rounded-md font-medium transition-colors hover:bg-[#26233a] hover:text-[var(--rp-base0C)]"
            >
              Help
            </Link>
            {!username && (
              <Link
                to="/username"
                onClick={() => setDrawerOpen(false)}
                className="block px-4 py-2 rounded-md font-medium transition-colors hover:bg-[#26233a] hover:text-[var(--rp-base0C)]"
              >
                Change Username
              </Link>
            )}
          </nav>
        </div>
      </>
    );
  }

      return (
        <>
          <header
            className="sticky top-0 z-50 border-b border-[#26233a] shadow-lg"
            style={headerStyle}
          >
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16 text-[var(--rp-base05)]">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="lg:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--rp-base0D)] hover:bg-[#26233a]"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="w-6 h-6 text-[var(--rp-base05)]" />
                  </button>
    
                  <h1 className="text-lg md:text-xl font-bold text-[var(--rp-base05)]">
                    <Link to="/">Image Classifier</Link>
                  </h1>
                </div>
    
                <nav className="hidden lg:flex items-center gap-6 text-[var(--rp-base04)]">
                  <Link to="/" className="font-medium transition-colors hover:text-[var(--rp-base0C)]">
                    Home
                  </Link>
                  <Link to="/stats" className="font-medium transition-colors hover:text-[var(--rp-base0C)]">
                    Stats
                  </Link>
                  <Link to="/help" className="font-medium transition-colors hover:text-[var(--rp-base0C)]">
                    Help
                  </Link>
                </nav>
    
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-[var(--rp-base04)]">
                    <span className="text-sm font-medium">{username || 'Guest'}</span>
                  </div>
    
                  {!username && (
                    <Link
                      to="/username"
                      className="hidden sm:inline-block text-sm px-3 py-1.5 rounded-md font-medium transition-colors bg-[var(--rp-base0D)] text-[var(--rp-base00)] hover:bg-[var(--rp-base0C)]"
                    >
                      Change Username
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </header>

      {drawerOpen && (
        <div
          className="fixed inset-0 bg-[#191724]/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div
        className={`${drawerBaseClasses} ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} bg-[#1f1d2e] text-[var(--rp-base05)]`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#26233a]">
          <h2 className="text-lg font-bold">Menu</h2>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--rp-base0D)] hover:bg-[#26233a]"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5 text-[var(--rp-base05)]" />
          </button>
        </div>

        <div className="p-4 border-b border-[#26233a] bg-[#1f1d2e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--rp-base02)]">
              <span className="text-[var(--rp-base0D)]">👤</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--rp-base04)]">Username</p>
              <p className="font-medium text-[var(--rp-base05)]">{username || 'Not Set'}</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2 text-[var(--rp-base04)]">
          <Link
            to="/"
            onClick={() => setDrawerOpen(false)}
            className="block px-4 py-2 rounded-md font-medium transition-colors hover:bg-[#26233a] hover:text-[var(--rp-base0C)]"
          >
            Home
          </Link>
          <Link
            to="/stats"
            onClick={() => setDrawerOpen(false)}
            className="block px-4 py-2 rounded-md font-medium transition-colors hover:bg-[#26233a] hover:text-[var(--rp-base0C)]"
          >
            Stats
          </Link>
          <Link
            to="/help"
            onClick={() => setDrawerOpen(false)}
            className="block px-4 py-2 rounded-md font-medium transition-colors hover:bg-[#26233a] hover:text-[var(--rp-base0C)]"
          >
            Help
          </Link>
          {!username && (
            <Link
              to="/username"
              onClick={() => setDrawerOpen(false)}
              className="block px-4 py-2 rounded-md font-medium transition-colors hover:bg-[#26233a] hover:text-[var(--rp-base0C)]"
            >
              Change Username
            </Link>
          )}
        </nav>
      </div>
    </>
  );
};
