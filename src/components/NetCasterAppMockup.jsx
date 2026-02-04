import React from 'react';
import { Zap, MousePointer2, Anchor, CircleDot, Package, Key, Settings } from 'lucide-react';

const actions = [
  { icon: Zap, title: 'Quick DC', desc: 'Cut the line when you need to.' },
  { icon: MousePointer2, title: 'Interact', desc: 'Your in-game interact key.' },
  { icon: Anchor, title: 'Snaphook', desc: 'Quick switch with safepocket.' }
];

const dupes = [
  { icon: CircleDot, title: 'Throwable', desc: 'Loop it.' },
  { icon: Package, title: 'Deployable', desc: 'Cook and grab.' },
  { icon: Key, title: 'Keycard', desc: 'Dupe and extract.' }
];

const NetCasterAppMockup = ({ className = '' }) => {
  return (
    <div className={`rounded-2xl border border-slate-700 bg-slate-900/90 shadow-2xl overflow-hidden ${className}`}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
        <span className="text-sm font-medium text-slate-300">Net Caster v1.0</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-500" />
          <span className="w-3 h-3 rounded-full bg-slate-500" />
          <span className="w-3 h-3 rounded-full bg-slate-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-4 pb-2 border-b border-slate-700/80">
        <button type="button" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500/20 text-sky-400 text-sm font-medium border border-sky-500/30">
          <Zap className="w-4 h-4" />
          Quick Actions
        </button>
        <button type="button" className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-500 hover:text-slate-400 text-sm font-medium">
          <Settings className="w-4 h-4" />
          Appearance
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Actions */}
        <div>
          <h3 className="text-sky-400 font-semibold text-sm mb-3">Actions</h3>
          <div className="space-y-3">
            {actions.map((item, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700/80 text-sky-400">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium">{item.title}</div>
                  <div className="text-slate-400 text-xs">{item.desc}</div>
                </div>
                <span className="text-green-400 text-xs font-medium">Ready</span>
                <input type="text" readOnly value="" className="w-14 px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-500 text-sm font-mono text-center" />
                <button type="button" className="px-3 py-1.5 rounded-lg bg-sky-600/80 text-white text-sm font-medium hover:bg-sky-500/80">Keybind</button>
              </div>
            ))}
          </div>
        </div>

        {/* Dupes */}
        <div>
          <h3 className="text-sky-400 font-semibold text-sm mb-3">Dupes</h3>
          <div className="space-y-3">
            {dupes.map((item, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700/80 text-sky-400">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium">{item.title}</div>
                  <div className="text-slate-400 text-xs">{item.desc}</div>
                </div>
                <span className="text-green-400 text-xs font-medium">Ready</span>
                <input type="text" readOnly value="" className="w-14 px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-500 text-sm font-mono text-center" />
                <button type="button" className="px-3 py-1.5 rounded-lg bg-sky-600/80 text-white text-sm font-medium hover:bg-sky-500/80">Keybind</button>
                <button type="button" className="px-3 py-1.5 rounded-lg bg-sky-600/80 text-white text-sm font-medium hover:bg-sky-500/80">Action</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetCasterAppMockup;
