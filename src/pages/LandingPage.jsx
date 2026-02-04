import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Showcase from '../components/Showcase';
import Footer from '../components/Footer';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const LandingPage = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      <Navbar />
      <div className="pt-20">
        <Hero />
        <Features />
        <Showcase />
      </div>
      <Footer />
    </div>
  );
};

export default LandingPage;
