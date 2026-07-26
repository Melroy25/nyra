import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Calendar, Sparkles, Heart, User, Bell, Settings, LogOut, Moon, Sun, Leaf, MessageCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { user, setUser, darkMode, toggleDarkMode } = useStore();

  const noNavPaths = ['/', '/login', '/onboarding'];
  const showNav = !noNavPaths.includes(router.pathname);

  const isPartnerMode = user?.role === 'partner';

  // Strict route protection: Partners cannot access private user pages
  useEffect(() => {
    if (isPartnerMode) {
      const allowedPaths = ['/partner', '/settings'];
      if (!allowedPaths.includes(router.pathname) && !noNavPaths.includes(router.pathname)) {
        router.replace('/partner');
      }
    }
    // If user has already completed onboarding and lands on /onboarding, redirect to dashboard
    if (user && user.onboardingCompleted && router.pathname === '/onboarding') {
      router.replace('/dashboard');
    }
    // If no token and user is null, and accessing protected page, redirect to login
    if (!user && typeof window !== 'undefined' && !localStorage.getItem('nyra_token')) {
      const protectedPaths = ['/dashboard', '/cycle', '/ai', '/selfcare', '/partner', '/profile', '/settings', '/mood', '/nutrition', '/symptoms', '/onboarding'];
      if (protectedPaths.includes(router.pathname)) {
        router.replace('/login');
      }
    }
  }, [isPartnerMode, user, router.pathname, router]);

  // Navigation Items adapt if logged in as Partner vs User
  const navItems = isPartnerMode
    ? [
        { label: 'Partner View', path: '/partner',          icon: Heart },
        { label: 'Partner Chat', path: '/partner?tab=chat', icon: MessageCircle },
        { label: 'Partner AI',   path: '/partner?tab=ai',   icon: Sparkles },
        { label: 'Settings',     path: '/settings',         icon: Settings },
      ]
    : [
        { label: 'Home',      path: '/dashboard', icon: Home },
        { label: 'Cycle',     path: '/cycle',     icon: Calendar },
        { label: 'Nyra AI',   path: '/ai',        icon: Sparkles },
        { label: 'Self Care', path: '/selfcare',  icon: Leaf },
        { label: 'Partner',   path: '/partner',   icon: Heart },
        { label: 'Profile',   path: '/profile',   icon: User },
      ];

  const isItemActive = (itemPath: string) => {
    if (itemPath.includes('?tab=')) {
      const tabName = itemPath.split('?tab=')[1];
      return router.pathname === '/partner' && router.query.tab === tabName;
    }
    if (itemPath === '/partner') {
      return router.pathname === '/partner' && (!router.query.tab || router.query.tab === 'dashboard');
    }
    return router.pathname === itemPath;
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nyra_token');
    }
    setUser(null);
    router.push('/login');
  };

  const avatarSrc = user?.avatarUrl || null;

  return (
    <div className="bg-nebula text-on-surface min-h-screen pb-24 md:pb-6 relative flex flex-col font-sans transition-colors duration-300">

      {/* ── Sticky Header ── */}
      {showNav && (
        <header className="flex justify-between items-center w-full px-container-padding-mobile md:px-container-padding-desktop h-16 sticky top-0 z-50 backdrop-blur-xl border-b shadow-sm transition-colors duration-300
          bg-white/80 border-purple-100/60
          dark:bg-[#0d0818]/80 dark:border-[#3a2d58]/40">

          {/* Brand */}
          <Link href={isPartnerMode ? '/partner' : '/dashboard'} className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Nyra Logo"
              className="w-9 h-9 rounded-2xl object-cover shadow-sm border-2 border-primary/20"
            />
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl tracking-tight text-primary dark:text-[#d4b8ff] leading-none">Nyra</span>
              {isPartnerMode && (
                <span className="text-[9px] font-bold text-tertiary uppercase tracking-wider">Partner View</span>
              )}
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-1 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`font-semibold text-xs transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-xl ${
                    active
                      ? 'text-primary bg-primary/10 shadow-sm border border-primary/20'
                      : 'text-on-surface/65 dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff] hover:bg-primary/8 dark:hover:bg-primary/15'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex gap-0.5 items-center">

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
              className="p-2 rounded-xl transition-colors
                text-on-surface/60 hover:text-primary hover:bg-primary/10
                dark:text-[#c8bedd] dark:hover:text-[#d4b8ff] dark:hover:bg-primary/20"
            >
              {darkMode
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings */}
            <button
              onClick={() => router.push('/settings')}
              title="Settings"
              className="p-2 rounded-xl transition-colors
                text-on-surface/60 hover:text-primary hover:bg-primary/10
                dark:text-[#c8bedd] dark:hover:text-[#d4b8ff] dark:hover:bg-primary/20"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-xl transition-colors
                text-on-surface/60 hover:text-error hover:bg-error/10
                dark:text-[#c8bedd] dark:hover:text-red-400 dark:hover:bg-red-400/15"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-xl overflow-hidden border-2 border-primary/25 shadow-sm shrink-0 ml-1 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center" title={user?.name || (isPartnerMode ? 'Partner' : 'User')}>
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user?.name ? `${user.name} Avatar` : 'User Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-bold text-primary dark:text-[#d4b8ff]">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── Main Content ── */}
      <AnimatePresence mode="wait">
        <motion.main
          key={router.asPath}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="flex-1"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* ── Floating Bottom Navigation (Mobile) ── */}
      {showNav && (
        <nav className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md rounded-2xl backdrop-blur-2xl shadow-xl z-50 flex justify-around items-center px-3 py-2 transition-all
          bg-white/90 border border-purple-200/60
          dark:bg-[#100c20]/95 dark:border-[#3a2d58]/70">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center justify-center rounded-xl w-11 h-11 transition-all duration-300 ${
                  active
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-on-surface/55 dark:text-[#c8bedd] hover:bg-primary/10 hover:text-primary dark:hover:text-[#d4b8ff]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
