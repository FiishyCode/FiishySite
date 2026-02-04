import { Link, useNavigate } from 'react-router-dom';
import { Zap, CreditCard, ExternalLink } from 'lucide-react';

const PurchaseSection = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-blue-500/25">
        <div className="absolute top-0 right-0 p-16 -mr-16 -mt-16 bg-white/10 blur-3xl rounded-full" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4">Unlock NetCaster</h2>
          <p className="text-blue-50 max-w-md mb-10 text-lg leading-relaxed">
            Experience absolute network dominance. Get your license key immediately after purchase.
          </p>
            <Link to="/purchase" className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-white text-blue-600 rounded-2xl font-bold text-xl hover:scale-105 transition-all shadow-xl active:scale-95 group">
              <CreditCard className="w-6 h-6" />
              Purchase License
              <ExternalLink className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
          <p className="mt-6 text-blue-100/60 text-sm font-medium">
            Instant delivery • Undetected • Lifetime updates
          </p>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSection;
