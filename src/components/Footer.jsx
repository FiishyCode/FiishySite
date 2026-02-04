import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-950 py-10 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} NetCaster Software. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs text-center max-w-2xl">
            Disclaimer: NetCaster is intended for educational and testing purposes in controlled environments. 
            We do not condone or support use on commercial platforms or for unauthorized purposes.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
