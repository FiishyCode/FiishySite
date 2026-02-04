import React from 'react';
import { Shield, Zap, Cpu, Lock, Sliders, Activity } from 'lucide-react';

const features = [
  {
    name: 'Infinite Utility',
    description: 'Dictate the flow of every combat encounter. Use precision network stalling to achieve infinite deployables and throwables in the heat of battle.',
    icon: Zap,
    color: 'text-yellow-400'
  },
  {
    name: 'Vault Key Duper',
    description: 'Access the best loot Arc Raiders has to offer. Duplicate hatch keys to guarantee safe extractions and ensure you never leave a vault empty-handed.',
    icon: Lock,
    color: 'text-blue-400'
  },
  {
    name: 'Precision Stalling',
    description: 'Master the art of the freeze. Precisely stall your outgoing packets to manipulate game state without losing your connection to the server.',
    icon: Sliders,
    color: 'text-purple-400'
  },
  {
    name: 'Zero Footprint Engine',
    description: 'Built specifically to bypass Arc Raiders server-side checks. Fully external, driver-level implementation with no in-game memory modification.',
    icon: Cpu,
    color: 'text-cyan-400'
  },
  {
    name: 'HWID Protection',
    description: 'Your license is securely bound to your hardware. This ensures your account remains private and protected from unauthorized access.',
    icon: Shield,
    color: 'text-green-400'
  },
  {
    name: 'Setup Help Included',
    description: 'New to network tools? We provide personal setup assistance and technical support through our Discord to get you running in minutes.',
    icon: Activity,
    color: 'text-red-400'
  }
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-slate-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Unmatched Power & Control</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Everything you need to dominate the wasteland with clinical precision.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">{feature.name}</h3>
              </div>
              <p className="text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
