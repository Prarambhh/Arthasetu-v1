import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatAddress } from '../utils/wallet';
import {
  LayoutDashboard, TrendingDown, TrendingUp, RotateCcw,
  Blocks, Users, LogOut, Menu, X, Landmark, Sun, Moon, Wallet
} from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/borrow',    label: 'Borrow',    icon: TrendingDown },
  { to: '/lend',      label: 'Lend',      icon: TrendingUp },
  { to: '/repay',     label: 'Repay',     icon: RotateCcw },
  { to: '/explorer',  label: 'Explorer',  icon: Blocks },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/wallet',    label: 'Wallet',    icon: Wallet },
];

export function Navbar() {
  const { user, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-light_alt/95 dark:bg-surface-dark_alt/95 backdrop-blur-md border-b border-borderc-light dark:border-borderc-dark transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-bitcoin-500 flex items-center justify-center text-white shadow-sm dark:shadow-glow-orange group-hover:bg-bitcoin-400 transition-colors">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight font-heading">Artha<span className="text-bitcoin-500">Setu</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 h-full">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`nav-item h-full border-b-2 bg-transparent ${location.pathname === to ? 'border-bitcoin-500 text-slate-900 dark:text-white bg-slate-100/50 dark:bg-surface-dark/50' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'} rounded-none flex items-center px-4 transition-colors font-medium text-sm`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </Link>
            ))}
          </div>

          {/* User & Theme Operations */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Theme Toggle Button */}
            <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-800 transition-colors" title="Toggle Theme">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <>
                <Link to={`/profile/${user.userId}`} className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-borderc-light dark:border-borderc-dark bg-white dark:bg-surface-dark hover:border-bitcoin-500/50 hover:shadow-sm dark:hover:shadow-glow-orange transition-all cursor-pointer group">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.username}</div>
                    <div className="text-xs text-slate-500 font-mono group-hover:text-bitcoin-500 transition-colors" title="Wallet Address">{formatAddress(user.walletAddress)}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-surface-800 border border-borderc-light dark:border-surface-600 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                </Link>
                <button onClick={handleLogout} className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-500 dark:hover:bg-rose-500/10 transition-colors" title="Log Out">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary py-2 px-5 text-sm">
                Connect Wallet
              </Link>
            )}
          </div>

          {/* Mobile burger */}
          <div className="md:hidden flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-800">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-800" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white dark:bg-surface-dark_alt border-t border-borderc-light dark:border-borderc-dark px-4 py-3 space-y-1 shadow-lg">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}
              className={`nav-item flex w-full px-3 py-2 rounded-md ${location.pathname === to ? 'bg-slate-100 dark:bg-surface-800 text-bitcoin-500 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </Link>
          ))}
          {user ? (
            <button onClick={handleLogout} className="nav-item flex w-full px-3 py-2 rounded-md text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 mt-2 font-semibold">
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect Session
            </button>
          ) : (
            <div className="pt-2">
              <Link to="/login" className="btn-primary w-full text-center flex justify-center" onClick={() => setOpen(false)}>
                Connect Wallet
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
