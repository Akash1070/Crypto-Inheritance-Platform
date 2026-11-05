import React from 'react';
import {
  Coins,
  Wallet,
  HardDrive,
  FileText,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { Button } from '../ui/Button';
import type { EstateAsset } from '../ui/WalletConnectModal';

interface EstateAssetsCardProps {
  assets: EstateAsset[];
  connectedAddress?: string | null;
  onOpenWalletModal: () => void;
}

export function EstateAssetsCard({
  assets,
  connectedAddress: _connectedAddress,
  onOpenWalletModal
}: EstateAssetsCardProps) {
  const totalUsd = assets.reduce((sum, a) => sum + a.usdValue, 0);

  function getIcon(type: EstateAsset['type']) {
    switch (type) {
      case 'btc':
        return <Coins className="w-4 h-4 text-amber-500" />;
      case 'eth':
        return <Wallet className="w-4 h-4 text-blue-500" />;
      case 'hardware':
        return <HardDrive className="w-4 h-4 text-emerald-500" />;
      case 'notes':
        return <FileText className="w-4 h-4 text-purple-500" />;
    }
  }

  function getBadgeColor(type: EstateAsset['type']) {
    switch (type) {
      case 'btc':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 border-amber-300 dark:border-amber-400/20';
      case 'eth':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-300 border-blue-300 dark:border-blue-400/20';
      case 'hardware':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/20';
      case 'notes':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-400/10 dark:text-purple-300 border-purple-300 dark:border-purple-400/20';
    }
  }

  return (
    <SpotlightCard
      spotlightColor="rgba(59, 130, 246, 0.12)"
      className="p-6 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 shadow-sm dark:shadow-2xl relative space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Protected Estate Assets & Wallets
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20">
              {assets.length} ASSETS MONITORED
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Wallets and accounts linked to your dead-man's switch protection schedule.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Estimated Value
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              ${totalUsd.toLocaleString()} <span className="text-xs text-slate-400 font-normal">USD</span>
            </span>
          </div>

          <Button
            size="sm"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs shadow-md shadow-blue-500/20"
            onClick={onOpenWalletModal}
          >
            <Plus className="w-3.5 h-3.5" /> Link Asset
          </Button>
        </div>
      </div>

      {assets.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Portfolio Allocation Breakdown</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">100% Monitored</span>
          </div>
          {/* Segmented Progress Bar */}
          <div className="h-3.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex shadow-inner">
            {assets.map((asset) => {
              const pct = totalUsd > 0 ? (asset.usdValue / totalUsd) * 100 : 0;
              const bgMap = {
                btc: 'bg-amber-500',
                eth: 'bg-blue-500',
                hardware: 'bg-emerald-500',
                notes: 'bg-purple-500'
              };
              return (
                <div
                  key={asset.id}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                  className={`${bgMap[asset.type]} h-full transition-all duration-500`}
                  title={`${asset.name}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>
          {/* Legend Badges */}
          <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono">
            {assets.map((asset) => {
              const pct = totalUsd > 0 ? ((asset.usdValue / totalUsd) * 100).toFixed(0) : '0';
              const dotMap = {
                btc: 'bg-amber-500',
                eth: 'bg-blue-500',
                hardware: 'bg-emerald-500',
                notes: 'bg-purple-500'
              };
              return (
                <div key={asset.id} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotMap[asset.type]} shadow-sm`} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{asset.name.split(' ')[0]}</span>
                  <span className="text-slate-500 dark:text-slate-400">({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {assets.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">No Assets Linked Yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Connect your Web3 wallet, watch cold Bitcoin storage, or load the sample whale portfolio.
            </p>
          </div>
          <Button
            size="md"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs"
            onClick={onOpenWalletModal}
          >
            <Wallet className="w-4 h-4" /> Connect Wallet or Watch Address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700/80 transition flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  {getIcon(asset.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{asset.name}</p>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${getBadgeColor(asset.type)}`}>
                      {asset.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate mt-0.5">
                    {asset.addressOrIdentifier}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    {asset.custodyNote}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">{asset.balanceLabel}</p>
                <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  ${asset.usdValue.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SpotlightCard>
  );
}
