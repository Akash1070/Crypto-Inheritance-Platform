import React from 'react';
import {
  ShieldCheck,
  Fingerprint,
  Sun,
  Moon,
  Wallet,
  Plus,
  LogOut
} from 'lucide-react';
import type { UserProfile } from '../../lib/auth';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

type Theme = 'light' | 'dark';

interface DashboardHeaderProps {
  user: UserProfile | null;
  theme: Theme;
  connectedAddress: string | null;
  onToggleTheme: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenWalletModal: () => void;
  onOpenCreateVault: () => void;
}

export function DashboardHeader({
  user,
  theme,
  connectedAddress,
  onToggleTheme,
  onLogin,
  onLogout,
  onOpenWalletModal,
  onOpenCreateVault
}: DashboardHeaderProps) {
  const shortAddress = connectedAddress
    ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-40 px-4 sm:px-6 py-3">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/85 backdrop-blur-xl shadow-sm dark:shadow-2xl flex items-center justify-between gap-4 px-4 sm:px-5 py-3 transition-colors duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black font-sans tracking-tight text-slate-950 dark:text-white truncate">
                Crypto Inheritance Platform
              </h1>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-sans font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 shadow-xs">
                NON-CUSTODIAL
              </span>
            </div>
            <p className="text-xs font-sans font-medium text-slate-600 dark:text-slate-300 truncate">
              Dead-Man's Switch & Estate Protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {user ? (
            <>
              {/* Connected Wallet Pill */}
              <button
                type="button"
                onClick={onOpenWalletModal}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 hover:border-slate-400 dark:hover:border-slate-700 text-xs font-sans transition shadow-xs"
              >
                <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {shortAddress ? (
                  <span className="text-slate-950 dark:text-slate-100 font-mono font-semibold">{shortAddress}</span>
                ) : (
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Link Wallet</span>
                )}
              </button>

              {/* Quick Create Vault CTA */}
              <Button
                variant="primary"
                size="sm"
                className="hidden md:inline-flex bg-blue-600 hover:bg-blue-500 text-white font-sans font-bold text-xs shadow-md shadow-blue-500/20"
                onClick={onOpenCreateVault}
              >
                <Plus className="w-3.5 h-3.5" /> + Protect Vault
              </Button>

              <Badge tone="info" dot={true} pulse={false} className="hidden lg:inline-flex text-[11px]">
                PASSKEY READY
              </Badge>

              {/* User Profile Pill */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 shadow-xs">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center text-xs font-bold font-sans text-white shadow">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block leading-tight text-left">
                  <p className="text-xs font-bold text-slate-950 dark:text-white font-sans">{user.username}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-sans font-medium">Vault Owner</p>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-red-300 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold font-sans transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <Button
              onClick={onLogin}
              size="md"
              className="bg-blue-600 hover:bg-blue-500 text-white font-sans font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-500/20"
            >
              <Fingerprint className="w-4 h-4" /> Sign In with Passkey
            </Button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
