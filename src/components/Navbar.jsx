import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navbar({ showUserProfile = true, showLinks = true, dark = false, forceLight = false, showBrand = true, showThemeToggle = true }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('examguard-theme');
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('examguard-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0].toUpperCase();
  };

  return (
    <>
      <div className="h-3 w-full bg-white" aria-hidden="true" />
      <header className={`fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between px-margin-mobile md:px-margin-desktop ${dark ? 'bg-[#10243d] text-white border-b border-white/15' : forceLight ? 'bg-surface text-on-surface border-b border-outline-variant' : 'bg-surface text-on-surface border-b border-outline-variant dark:bg-inverse-surface dark:text-white dark:border-outline'} shadow-sm dark:shadow-none`}>
        {showBrand && <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span className={`material-symbols-outlined text-[32px] ${dark ? 'text-primary-fixed' : 'text-primary dark:text-inverse-primary'}`}>
          security
        </span>
        <span className={`font-headline-md text-headline-md font-bold ${dark ? 'text-white' : 'text-primary dark:text-inverse-primary'}`}>
          ExamGuard
        </span>
        </Link>}

      {showLinks && (
        <nav className="hidden md:flex gap-8">
          <Link
            className={`${dark ? 'text-primary-fixed border-primary-fixed' : 'text-primary dark:text-inverse-primary border-primary dark:border-inverse-primary'} font-bold border-b-2 pb-1 font-label-md text-label-md`}
            to="/"
          >
            Home
          </Link>
          <a
            className={`${dark ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant'} transition-colors font-label-md text-label-md px-2 py-1 rounded`}
            href="#features"
          >
            Features
          </a>
          <a
            className={`${dark ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant'} transition-colors font-label-md text-label-md px-2 py-1 rounded`}
            href="#proctoring"
          >
            How it Works
          </a>
        </nav>
      )}

      <div className="flex items-center gap-4">
        {showThemeToggle && <button
          type="button"
          onClick={() => setIsDark((current) => !current)}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${dark ? 'text-white/80 hover:bg-white/10' : 'text-on-surface-variant hover:bg-surface-container-high dark:text-surface-variant dark:hover:bg-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>}
        {isAuthenticated && showUserProfile ? (
          <>
            <div className="hidden sm:block text-right">
              <p className={`font-label-md text-label-md font-bold ${dark ? 'text-white' : 'text-on-surface'}`}>{user?.name || 'Registered Candidate'}</p>
              <p className={`font-label-sm text-label-sm font-mono ${dark ? 'text-white/60' : 'text-on-surface-variant'}`}>ID: {user?.id || 'EG-CANDIDATE'}</p>
            </div>
            <Link to="/profile" className="w-10 h-10 rounded-full bg-[#10243d] text-white flex items-center justify-center font-bold overflow-hidden border border-[#10243d] shadow-sm hover:scale-105 transition-transform">
              {user?.avatar && !imgError ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'Candidate'}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-sm">{getInitials(user?.name)}</span>
              )}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className={`hidden sm:block font-bold hover:underline transition-all px-3 py-1.5 text-xs ${dark ? 'text-primary-fixed' : 'text-[#10243d]'}`}
            >
              Logout
            </button>
          </>
        ) : showBrand ? (
          <>
            <Link to="/login" className={`hidden sm:block font-bold hover:underline transition-all px-4 py-2 ${dark ? 'text-primary-fixed' : 'text-[#10243d]'}`}>
              Login
            </Link>
            <Link
              to="/register"
              className="bg-primary-container text-on-primary-container px-6 py-2 rounded-full font-bold hover:shadow-lg active:scale-95 transition-all"
            >
              Get Started
            </Link>
          </>
        ) : null}
        </div>
      </header>
    </>
  );
}

export default Navbar;
