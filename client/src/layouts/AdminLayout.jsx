import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../services/authSession';

export default function AdminLayout() {
  const { user, isDevMode, switchDevRole, logout } = useAuthSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { to: '/admin/teams', label: 'Team Management', icon: '👥' },
    { to: '/admin/projects', label: 'Project Management', icon: '📁' },
  ];

  const handleRoleSwitch = (targetRole) => {
    switchDevRole(targetRole);
    if (targetRole === 'admin') {
      navigate('/admin');
    } else if (targetRole === 'guide') {
      navigate('/guide');
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Brand Logo & Portal Name */}
            <div className="flex items-center gap-3">
              <Link to="/admin" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  PX
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-slate-800 tracking-tight text-base block">
                    PROJEXA
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">
                    Academic Project Portal
                  </span>
                </div>
              </Link>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700 ml-2">
                Admin Portal
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* User Session & Role Display */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-semibold text-slate-800">{user?.fullName || 'Administrator'}</div>
                <div className="text-[11px] text-slate-500">{user?.department || 'Department Admin'}</div>
              </div>

              {/* Dev QA Role Switcher */}
              {isDevMode && (
                <div className="hidden sm:flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5">Dev:</span>
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('admin')}
                    className="px-2 py-0.5 rounded bg-white text-indigo-700 font-medium shadow-xs"
                    title="Switch to Admin persona"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('guide')}
                    className="px-2 py-0.5 rounded text-slate-600 hover:text-slate-900"
                    title="Switch to Guide persona and open Guide portal"
                  >
                    Guide
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                Sign Out
              </button>

              {/* Mobile hamburger menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            {isDevMode && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs">
                <span className="text-slate-400">Dev Persona:</span>
                <button
                  type="button"
                  onClick={() => {
                    handleRoleSwitch('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleRoleSwitch('guide');
                    setMobileMenuOpen(false);
                  }}
                  className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-medium"
                >
                  Guide
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
          <span>PROJEXA Academic Project Management Platform &bull; Phase 1 Build</span>
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Role: Administrator (FE-B)
          </span>
        </div>
      </footer>
    </div>
  );
}
