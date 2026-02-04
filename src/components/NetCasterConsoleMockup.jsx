import React from 'react';

const logLines = [
  { tag: 'SYSTEM', text: 'NetCaster initialized', color: 'text-cyan-400' },
  { tag: 'CONFIG', text: 'Loaded from: settings.json', color: 'text-cyan-400' },
  { tag: 'UI', text: 'Stay on top: True', color: 'text-cyan-400' },
  { tag: 'HOTKEY', text: 'Triggernade hotkey PRESSED!', color: 'text-green-400' },
  { tag: 'HOTKEY', text: 'Starting triggernade macro', color: 'text-green-400' },
  { tag: 'DRAG', text: 'Recorded: (892, 541) -> (1043, 612)', color: 'text-amber-400' },
  { tag: 'TRIG POS', text: 'Recorded: (956, 489)', color: 'text-fuchsia-400' },
  { tag: 'QUICKDROP', text: 'Right-click at 1120, 673', color: 'text-cyan-400' },
  { tag: 'QUICKDROP', text: 'Left-click at 1120, 673', color: 'text-cyan-400' },
  { tag: 'MACRO', text: "Exported 'key_dupe' to macros/", color: 'text-green-400' }
];

const NetCasterConsoleMockup = ({ className = '' }) => {
  return (
    <div className={`rounded-2xl border border-slate-700 bg-slate-900/90 shadow-2xl overflow-hidden ${className}`}>
      {/* Title bar with window controls */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-sm font-medium text-slate-400 tracking-wider">NETCASTER V1.0</span>
        <div className="w-16" />
      </div>

      {/* Log content */}
      <div className="p-4 bg-slate-950/90 min-h-[200px] font-mono text-sm">
        {logLines.map((line, i) => (
          <div key={i} className={`mb-1 ${line.color}`}>
            <span className="font-semibold">[{line.tag}]</span>{' '}
            {line.text}
          </div>
        ))}
        <span className="text-slate-500 animate-pulse">_</span>
      </div>
    </div>
  );
};

export default NetCasterConsoleMockup;
