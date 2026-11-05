import React from 'react';

export function App() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Crypto Inheritance Platform</h1>
      <p className="mt-2 text-slate-400">
        Open-source zero-knowledge non-custodial crypto inheritance coordination.
      </p>
      <div className="mt-6 p-4 rounded-lg border border-slate-800 bg-slate-900/50">
        <h2 className="text-lg font-semibold text-emerald-400">Tier-1 Coordination Safe Zone</h2>
        <p className="text-sm text-slate-300 mt-1">
          This web application coordinates planning, liveness heartbeats, and heir notification. 
          It never asks for or stores unencrypted private keys or seed phrases.
        </p>
      </div>
    </main>
  );
}

