import React from 'react';
import { Activity, Shield, Download } from 'lucide-react';

const Showcase = () => {
  return (
    <section id="showcase" className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex items-center gap-16">
          <div className="lg:w-1/2 mb-12 lg:mb-0">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Dominate <br />
              <span className="text-blue-500">Arc Raiders</span>
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Experience the seamless integration of our network control engine. 
              Built specifically for the high-stakes environment of Arc Raiders, 
              giving you real-time authority over every packet.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                'Infinite Throwable & Deployable loops',
                'Guaranteed safe extractions via hatch key dupe',
                'Infinite vault keys for maximum loot',
                'Precision network state manipulation'
              ].map((item, i) => (
                <li key={i} className="flex items-center text-slate-300">
                  <Activity className="w-5 h-5 text-blue-500 mr-3" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:w-1/2 relative">
            <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <div className="ml-2 text-xs font-mono text-slate-500 uppercase tracking-widest">NetCaster v1.0</div>
              </div>
              <div className="aspect-video bg-slate-950 rounded-xl flex items-center justify-center overflow-hidden border border-slate-800">
                <div className="font-mono text-xs text-blue-400/80 p-6 w-full h-full overflow-hidden">
                  <div className="mb-1 text-cyan-400">[SYSTEM] NetCaster initialized</div>
                  <div className="mb-1">[CONFIG] Loaded from: settings.json</div>
                  <div className="mb-1">[UI] Stay on top: True</div>
                  <div className="mb-1 text-green-400">[HOTKEY] Triggernade hotkey PRESSED!</div>
                  <div className="mb-1">[HOTKEY] Starting triggernade macro</div>
                  <div className="mb-1 text-yellow-400">[DRAG] Recorded: (892, 541) → (1043, 612)</div>
                  <div className="mb-1 text-yellow-400">[TRIG POS] Recorded: (956, 489)</div>
                  <div className="mb-1">[QUICKDROP] Right-click at 1120, 673</div>
                  <div className="mb-1">[QUICKDROP] Left-click at 1120, 673</div>
                  <div className="mb-1 text-green-400">[MACRO] Exported 'key_dupe' to macros/</div>
                  <div className="text-slate-600 animate-pulse">_</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Showcase;
