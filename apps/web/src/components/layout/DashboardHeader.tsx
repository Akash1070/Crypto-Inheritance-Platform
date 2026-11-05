import React from 'react';
import {
  ShieldCheck,
  Fingerprint,
  Sun,
  Moon,
  Wallet,
  Plus
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
  onOpenWalletModal: () => void;
  onOpenCreateVault: () => void;
}

export function DashboardHeader({
  user,
  theme,
  connectedAddress,
  onToggleTheme,
  onLogin,
  onOpenWalletModal,
  onOpenCreateVault
}: DashboardHeaderProps) {
  const shortAddress = connectedAddress
    ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-40 px-4 sm:px-6 py-3">
      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/85 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 px-4 sm:px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                Crypto Inheritance Platform
              </h1>
              <Badge tone="success" className="hidden sm:inline-flex font-mono text-[10px]">
                ZERO-KNOWLEDGE
              </Badge>
            </div>
            <p className="text-[11px] font-mono text-slate-400 truncate">
              FIDO2 Passkey Liveness & Event Coordination
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              {/* Connected Wallet Pill */}
              <button
                type="button"
                onClick={onOpenWalletModal}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 text-xs font-mono transition"
              >
                <Wallet className="w-3.5 h-3.5 text-blue-400" />
                {shortAddress ? (
                  <span className="text-slate-200">{shortAddress}</span>
                ) : (
                  <span className="text-slate-400">Link Wallet</span>
                )}
              </button>

              {/* Quick Create Vault CTA */}
              <Button
                variant="primary"
                size="sm"
                className="hidden md:inline-flex bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs shadow-lg shadow-blue-500/20"
                onClick={onOpenCreateVault}
              >
                <Plus className="w-3.5 h-3.5" /> New Vault
              </Button>

              <Badge tone="info" dot className="hidden lg:inline-flex font-mono text-[10px]">
                FIDO2 ACTIVE
              </Badge>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-xs font-bold font-mono text-white shadow">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block leading-tight text-left">
                  <p className="text-xs font-semibold text-white font-mono">{user.username}</p>
                  <p className="text-[10px] text-slate-400">Estate Owner</p>
                </div>
              </div>
            </>
          ) : (
            <Button
              onClick={onLogin}
              size="md"
              className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs shadow-lg shadow-blue-500/20"
            >
              <Fingerprint className="w-4 h-4" /> Sign In
            </Button>
          )}

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
