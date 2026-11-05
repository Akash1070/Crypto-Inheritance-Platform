import React, { useState } from 'react';
import { Wallet, AlertTriangle, Zap } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface EstateAsset {
  id: string;
  name: string;
  type: 'btc' | 'eth' | 'hardware' | 'notes';
  addressOrIdentifier: string;
  balanceLabel: string;
  usdValue: number;
  custodyNote: string;
}

export const DEFAULT_DEMO_ESTATE: EstateAsset[] = [
  {
    id: 'asset-1',
    name: 'Bitcoin Sovereign Cold Storage',
    type: 'btc',
    addressOrIdentifier: 'bc1q9x0z2y8m7c4v3a2k1l8j7h6g5f4d3s2a1',
    balanceLabel: '12.50 BTC',
    usdValue: 1187500,
    custodyNote: 'Air-gapped Coldcard Mk4 · 24-word seed'
  },
  {
    id: 'asset-2',
    name: 'Family Estate Multi-Sig Safe',
    type: 'eth',
    addressOrIdentifier: '0x71C5681A7b93910398F78627b0f6D472eC7F49A2',
    balanceLabel: '75.00 ETH + 120,000 USDC',
    usdValue: 330000,
    custodyNote: 'Gnosis Safe 2-of-3 with hardware signers'
  },
  {
    id: 'asset-3',
    name: 'Trezor Model T Hardware Seed',
    type: 'hardware',
    addressOrIdentifier: 'Trezor-SecureElement-Offline',
    balanceLabel: 'Primary Estate Keys',
    usdValue: 85000,
    custodyNote: 'Encrypted via CIP CLI · Enclave Sealed'
  },
  {
    id: 'asset-4',
    name: 'Exchange Accounts & Bitwarden Kit',
    type: 'notes',
    addressOrIdentifier: 'Estate-Emergency-Master-Index',
    balanceLabel: 'Recovery Documents',
    usdValue: 25000,
    custodyNote: 'Argon2id derived master recovery instructions'
  }
];

interface WalletConnectModalProps {
  open: boolean;
  connectedAddress?: string | null;
  onConnect: (address: string, assets: EstateAsset[]) => void;
  onClose: () => void;
}

export function WalletConnectModal({
  open,
  connectedAddress: _connectedAddress,
  onConnect,
  onClose
}: WalletConnectModalProps) {
  const [tab, setTab] = useState<'browser' | 'manual' | 'demo'>('browser');
  const [customAddress, setCustomAddress] = useState('');
  const [customChain, setCustomChain] = useState<'BTC' | 'ETH' | 'SOL'>('ETH');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBrowserConnect() {
    setConnecting(true);
    setError(null);
    try {
      const eth = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
      if (eth && typeof eth.request === 'function') {
        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          const addr = accounts[0];
          const dynamicAssets: EstateAsset[] = [
            {
              id: 'asset-browser-1',
              name: 'Connected Web3 Wallet',
              type: 'eth',
              addressOrIdentifier: addr,
              balanceLabel: 'Active Web3 Address',
              usdValue: 145000,
              custodyNote: 'Monitored address · Estate beneficiary linked'
            },
            ...DEFAULT_DEMO_ESTATE.slice(0, 2)
          ];
          onConnect(addr, dynamicAssets);
          onClose();
          return;
        }
      }

      setError('No browser Web3 extension (MetaMask/Rabby) detected. You can paste an address below or load the sample portfolio.');
      setTab('manual');
    } catch (err: unknown) {
      const errorObj = err as { code?: number; message?: string };
      if (errorObj?.code === 4001 || errorObj?.message?.toLowerCase().includes('reject')) {
        setError('Wallet connection prompt was cancelled or rejected in your browser extension.');
      } else if (errorObj?.code === -32002 || errorObj?.message?.toLowerCase().includes('pending')) {
        setError('A connection request is already pending in MetaMask/Brave. Check the extension icon in your browser toolbar to approve.');
      } else {
        setError(err instanceof Error ? err.message : 'Wallet connection was not completed.');
      }
    } finally {
      setConnecting(false);
    }
  }

  function handleManualConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!customAddress.trim()) return;
    const addr = customAddress.trim();
    const dynamicAssets: EstateAsset[] = [
      {
        id: `asset-${Date.now()}`,
        name: `${customChain} Monitored Cold Wallet`,
        type: customChain === 'BTC' ? 'btc' : 'eth',
        addressOrIdentifier: addr,
        balanceLabel: `Monitored ${customChain} Address`,
        usdValue: customChain === 'BTC' ? 475000 : 185000,
        custodyNote: 'Watched public address · Protected by CIP liveness switch'
      },
      ...DEFAULT_DEMO_ESTATE.slice(1, 3)
    ];
    onConnect(addr, dynamicAssets);
    onClose();
  }

  function handleLoadDemo() {
    onConnect('0x71C5681A7b93910398F78627b0f6D472eC7F49A2', DEFAULT_DEMO_ESTATE);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link Wallet or Watch Address"
      description="Connect a Web3 wallet, watch cold storage, or load a sample portfolio."
      size="lg"
    >
      <div className="space-y-5">
        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-1">
          <button
            type="button"
            onClick={() => setTab('browser')}
            className={`py-2 rounded-lg text-xs font-mono font-medium transition ${
              tab === 'browser'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            WEB3 WALLET
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`py-2 rounded-lg text-xs font-mono font-medium transition ${
              tab === 'manual'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            WATCH ADDRESS
          </button>
          <button
            type="button"
            onClick={() => setTab('demo')}
            className={`py-2 rounded-lg text-xs font-mono font-medium transition ${
              tab === 'demo'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            SAMPLE ESTATE ($1.6M)
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/40 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setTab('manual')}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Paste Public Address (No Extension) →
              </button>
              <span className="text-amber-400 dark:text-amber-600">·</span>
              <button
                type="button"
                onClick={handleLoadDemo}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Zap className="w-3 h-3" /> Load 1-Click Demo Estate ($1.6M) →
              </button>
            </div>
          </div>
        )}

        {tab === 'browser' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Browser Extension (EVM)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">MetaMask, Rabby, Coinbase Wallet, Brave</p>
                </div>
              </div>
              <Button
                variant="primary"
                size="md"
                className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs"
                onClick={handleBrowserConnect}
                loading={connecting}
              >
                Connect Extension
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Connecting your browser wallet strictly grants public address viewing permissions. We never
              ask for, see, or touch your private keys.
            </p>
          </div>
        )}

        {tab === 'manual' && (
          <form onSubmit={handleManualConnect} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Blockchain
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['BTC', 'ETH', 'SOL'] as const).map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    onClick={() => setCustomChain(chain)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition ${
                      customChain === chain
                        ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {chain === 'BTC' ? 'Bitcoin (Cold)' : chain === 'ETH' ? 'Ethereum / Safe' : 'Solana'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Public Watch Address
              </label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder={customChain === 'BTC' ? 'bc1q9x0z2y8m7c4v3a2k1l8j7h6g5f4d3s2a1...' : '0x71C5681A7b93910398F78627b0f6D472eC7F49A2'}
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              Monitor Address in Estate
            </Button>
          </form>
        )}

        {tab === 'demo' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  Sample Estate Portfolio
                </span>
                <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">$1,627,500 USD</span>
              </div>
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>12.50 BTC (Coldcard Mk4 Air-Gapped)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">$1,187,500</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>75.00 ETH + USDC (Gnosis Safe 2-of-3)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">$330,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hardware Seeds + Secret Notes</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">$110,000</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 shadow-md shadow-emerald-500/20"
              onClick={handleLoadDemo}
            >
              Load Sample Estate Portfolio
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
