import React from 'react';
import { Activity } from 'lucide-react';
import NetCasterAppMockup from './NetCasterAppMockup';

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
                  <Activity className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:w-1/2 relative">
            <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
            <NetCasterAppMockup className="max-w-lg ml-auto" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Showcase;
