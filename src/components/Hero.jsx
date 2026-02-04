import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Set your YouTube video ID here (e.g. from https://www.youtube.com/watch?v=VIDEO_ID)
const HERO_VIDEO_ID = import.meta.env.VITE_HERO_VIDEO_ID || '';

const Hero = () => {
  return (
    <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6">
            <Zap className="w-4 h-4 mr-2" />
            Arc Raiders: Infinite Utility & Network Dominance
          </span>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-white mb-8 tracking-tight">
            Infinite Throwables. <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Unlimited Key Dupes.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10 leading-relaxed">
            NetCaster is the ultimate network control suite for Arc Raiders. Duplicate keys, 
            get infinite ducks, throwables, and EXP with precision network manipulation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center group">
              Get Access Now
              <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#showcase" className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-lg transition-all border border-slate-700">
              View Showcase
            </a>
          </div>
        </motion.div>

        {/* Embedded video */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 relative"
        >
          <div className="relative mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-2xl aspect-video">
            {HERO_VIDEO_ID ? (
              <iframe
                title="NetCaster showcase"
                src={`https://www.youtube.com/embed/${HERO_VIDEO_ID}?rel=0`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 text-slate-500">
                <p className="text-sm">Add VITE_HERO_VIDEO_ID to .env or set HERO_VIDEO_ID in Hero.jsx to show your video.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
