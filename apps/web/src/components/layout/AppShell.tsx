import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-slate-100 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-slate-100 dark:bg-[#090D16] transition-colors duration-200" />
        {/* Subtle 1px Blueprint Grid (Light & Dark) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#33415518_1px,transparent_1px),linear-gradient(to_bottom,#33415518_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,#000_60%,transparent_100%)]" />
        {/* Ambient Radial Lighting */}
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-blue-500/[0.08] dark:bg-blue-600/[0.12] blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full bg-emerald-500/[0.06] dark:bg-emerald-500/[0.10] blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-[36rem] h-[36rem] rounded-full bg-purple-500/[0.05] dark:bg-purple-600/[0.08] blur-[160px] pointer-events-none" />
      </div>
      <div className="relative z-10 flex flex-col min-h-screen">{children}</div>
    </div>
  );
}
