import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.email === 'admin@gmail.com';

  const menuItems = isAdmin
    ? [
        { label: 'Admin Dashboard', icon: 'admin_panel_settings', href: '/admin' },
        { label: 'Data Science Analytics', icon: 'analytics', href: '/analytics' },
        { label: 'Smart Question Importer', icon: 'auto_fix_high', href: '/question-importer' },
        { label: 'Session Logs & AI Reports', icon: 'history_edu', href: '/session-logs' },
        { label: 'Admin Profile', icon: 'person', href: '/profile' }
      ]
    : [
        { label: 'My Dashboard', icon: 'dashboard', href: '/dashboard' },
        { label: 'My Profile', icon: 'person', href: '/profile' }
      ];


  const isActive = (href) => location.pathname === href;

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
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 bg-[#10243d] text-white shadow-sm w-[280px]">
      <Link to="/" className="flex h-16 items-center gap-2 border-b border-white/20 px-6 hover:bg-white/10 transition-colors">
        <span className="material-symbols-outlined text-[28px] text-primary-fixed">security</span>
        <span className="font-headline-md text-headline-md font-bold text-white">ExamGuard</span>
      </Link>
      <div className="p-6 border-b border-white/20">
        <Link to="/profile" className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold overflow-hidden border border-primary/20 shadow-sm group-hover:scale-105 transition-transform">
            {user?.avatar && !imgError ? (
              <img
                src={user.avatar}
                alt={user?.name || 'User'}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-bold text-base">{getInitials(user?.name)}</span>
            )}
          </div>
          <div>
            <h3 className="font-label-md text-label-md font-bold text-white group-hover:text-primary-fixed transition-colors">
              {user?.name || 'Registered User'}
            </h3>
            <p className="font-label-sm text-label-sm text-slate-300 font-mono">
              {isAdmin ? "ROLE: ADMIN / INSTRUCTOR" : `ID: ${user?.id || 'EG-STUDENT'}`}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-r-full transition-all duration-200 ${
              isActive(item.href)
                ? 'bg-primary-container text-on-primary-container border-l-4 border-primary font-bold'
                : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-md text-label-md">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/20 p-4 space-y-2">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-error/10 rounded-r-full transition-all duration-200 text-left font-bold text-xs"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span className="font-label-md text-label-md">Logout</span>
        </button>
        <p className="text-center font-label-sm text-label-sm text-white/40 mt-2">ExamGuard v2.4.0</p>
      </div>
    </aside>
    <nav className="fixed left-0 right-0 top-0 z-40 grid grid-cols-2 gap-2 border-b border-white/15 bg-[#10243d] p-3 md:hidden">
      {menuItems.map((item) => (
        <Link
          key={item.label}
          to={item.href}
            className={`flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${isActive(item.href) ? 'bg-primary-container text-on-primary-container' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
        >
          <span className="material-symbols-outlined text-base">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
    </>
  );
}

export default Sidebar;
