import React, { useState, useEffect } from 'react';
import { CreditCard, Zap, Shield, CheckCircle, ArrowRight, Key, Clock, Download, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { auth, db, storage } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ref, getDownloadURL } from 'firebase/storage';
import { redirectToStripeCheckout } from '../services/stripeService';

const DISCORD_URL = 'https://discord.gg/G84ZRqGdxE';

const PurchasePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();

  useEffect(() => {
    let pollId = null;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const localPurchase = localStorage.getItem(`purchased_${currentUser.uid}`);
        const localKey = localStorage.getItem(`key_${currentUser.uid}`);
        if (localPurchase === 'true') {
          setHasPurchased(true);
          setPurchaseHistory([{
            productName: 'NetCaster Arc Raiders',
            key: localKey || 'NC-TEST-LOCAL-KEY',
            date: new Date().toLocaleDateString(),
            status: 'Active'
          }]);
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const buildHistory = (data) => {
            const history = [];
            if (data.purchased && data.licenseKey) {
              history.push({
                productName: 'NetCaster Arc Raiders',
                key: data.licenseKey,
                date: data.purchaseDate ? new Date(data.purchaseDate).toLocaleDateString() : new Date().toLocaleDateString(),
                status: 'Active'
              });
            }
            if (data.duckRunsLicenses && Array.isArray(data.duckRunsLicenses) && data.duckRunsLicenses.length > 0) {
              data.duckRunsLicenses.forEach((entry) => {
                history.push({
                  productName: 'Ducks $5/1m',
                  key: entry.licenseKey || '',
                  date: entry.purchaseDate ? new Date(entry.purchaseDate).toLocaleDateString() : new Date().toLocaleDateString(),
                  status: 'Active'
                });
              });
            }
            if (data.purchasedDuckRuns && data.licenseKeyDuckRuns && (!data.duckRunsLicenses || data.duckRunsLicenses.length === 0)) {
              history.push({
                productName: 'Ducks $5/1m',
                key: data.licenseKeyDuckRuns,
                date: data.purchaseDateDuckRuns ? new Date(data.purchaseDateDuckRuns).toLocaleDateString() : new Date().toLocaleDateString(),
                status: 'Active'
              });
            }
            return history;
          };

          if (userDoc.exists()) {
            const data = userDoc.data();
            const history = buildHistory(data);
            if (history.length > 0) {
              setHasPurchased(true);
              setPurchaseHistory(history);
              try {
                const fileRef = ref(storage, 'NetCaster.exe');
                setDownloadUrl(await getDownloadURL(fileRef));
              } catch (e) {
                setDownloadUrl('#');
              }
            }
          }

          if (sessionId) {
            let attempts = 0;
            pollId = setInterval(async () => {
              attempts++;
              const snap = await getDoc(doc(db, 'users', currentUser.uid));
              if (snap.exists()) {
                const d = snap.data();
                const history = buildHistory(d);
                if (history.length > 0) {
                  if (pollId) clearInterval(pollId);
                  pollId = null;
                  setHasPurchased(true);
                  setPurchaseHistory(history);
                  try {
                    const fileRef = ref(storage, 'NetCaster.exe');
                    setDownloadUrl(await getDownloadURL(fileRef));
                  } catch (e) {
                    setDownloadUrl('#');
                  }
                }
              }
              if (attempts >= 15 && pollId) {
                clearInterval(pollId);
                pollId = null;
              }
            }, 1000);
          }
        } catch (err) {
          console.warn("Firestore blocked, relying on local state");
        }
      }
    });
    return () => {
      unsubscribe();
      if (pollId) clearInterval(pollId);
    };
  }, [sessionId]);

  const resetTestAccount = async () => {
    if (!user) return;
    setLoading(true);
    try {
      localStorage.removeItem(`purchased_${user.uid}`);
      localStorage.removeItem(`key_${user.uid}`);
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const existingRole = userSnap.exists ? userSnap.data().role : null;
      const role = existingRole === 'admin' ? 'admin' : 'customer';
      await setDoc(doc(db, 'users', user.uid), {
        purchased: false,
        licenseKey: null,
        purchaseDate: null,
        purchasedDuckRuns: false,
        duckRunsLicenses: [],
        licenseKeyDuckRuns: null,
        purchaseDateDuckRuns: null,
        role
      }, { merge: true });
      setHasPurchased(false);
      setPurchaseHistory([]);
      alert("Test account reset! You can now test the purchase flow again.");
    } catch (e) {
      console.error("Reset failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStripePurchase = async (productId = 'netcaster') => {
    if (!user) {
      navigate('/login');
      return;
    }
    setCheckoutError('');
    setLoading(true);
    try {
      await redirectToStripeCheckout(productId);
    } catch (e) {
      console.error("Checkout failed:", e);
      setCheckoutError(e.message || "Could not start checkout. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedPurchase = async () => {
    if (!user) {
      alert("You must be logged in to purchase.");
      navigate('/login');
      return;
    }
    setLoading(true);
    const newKey = `NC-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const purchaseDate = new Date().toISOString();
    localStorage.setItem(`purchased_${user.uid}`, 'true');
    localStorage.setItem(`key_${user.uid}`, newKey);
    setHasPurchased(true);
    setPurchaseHistory([{
      key: newKey,
      date: new Date(purchaseDate).toLocaleDateString(),
      status: 'Active'
    }]);
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const existingRole = userSnap.exists ? userSnap.data().role : null;
      const role = existingRole === 'admin' ? 'admin' : 'holder';
      await setDoc(doc(db, 'users', user.uid), {
        purchased: true,
        purchaseDate: purchaseDate,
        licenseKey: newKey,
        email: user.email,
        role
      }, { merge: true });
    } catch (e) {
      console.error("Firestore update failed:", e);
    }
    alert("Purchase successful! Your license is now active.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      <Navbar />
      
      <main className="pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {hasPurchased ? (
            /* ACTIVE LICENSE VIEW */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center mb-12">
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Your Subscription</h1>
                <p className="text-slate-400 text-lg">Manage your license and download your software.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active License Card */}
                <div className="lg:col-span-2">
                  <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-green-500/25 h-full flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-16 -mr-16 -mt-16 bg-white/10 blur-3xl rounded-full" />
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                        <CheckCircle className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-3xl font-extrabold text-white mb-2">License Active</h2>
                      <p className="text-green-50 max-w-md mb-8 text-lg opacity-90">
                        Your Arc Raiders Lifetime access is ready for use.
                      </p>
                      
                      <div className="w-full max-w-sm bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-8">
                        <div className="text-xs text-green-200 uppercase tracking-widest font-bold mb-1">Your License Key</div>
                        <div className="text-xl font-mono text-white font-bold tracking-wider">
                          {purchaseHistory[0]?.key}
                        </div>
                      </div>

                      <a 
                        href={downloadUrl || '#'} 
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-white text-green-600 rounded-2xl font-bold text-xl hover:scale-105 transition-all shadow-xl active:scale-95 group"
                      >
                        <Download className="w-6 h-6" />
                        Download Now
                      </a>
                    </div>
                  </div>
                </div>

                {/* Status Sidebar */}
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-500" />
                      System Info
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Status</span>
                        <span className="text-green-400 font-bold px-2 py-1 bg-green-400/10 rounded-lg">Operational</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Version</span>
                        <span className="text-white font-mono">1.0</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Type</span>
                        <span className="text-white font-bold">Lifetime</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={resetTestAccount}
                      disabled={loading}
                      className="hidden w-full mt-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg border border-red-500/20 transition-all"
                    >
                      Reset License (Test Only)
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Need Help?
                    </h3>
                    <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                      Join our Discord for manual activation and setup support.
                    </p>
                    <a
                      href={DISCORD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700 flex items-center justify-center"
                    >
                      Join Discord
                    </a>
                  </div>
                </div>
              </div>

              {/* PURCHASE HISTORY */}
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Clock className="w-6 h-6 text-blue-500" />
                  Transaction History
                </h2>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800">
                        <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-500">Product</th>
                        <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-500">License Key</th>
                        <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-500">Date</th>
                        <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {purchaseHistory.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{item.productName}</div>
                            <div className="text-xs text-slate-500">{item.productName === 'Ducks $5/1m' ? 'Per 1m worth of ducks' : 'Lifetime Access'}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-blue-400">{item.productName === 'Ducks $5/1m' ? '—' : item.key}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">{item.date}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-[10px] font-bold uppercase tracking-wider">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PURCHASE MORE - show other products when they already have one */}
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-blue-500" />
                  Purchase another product
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">NetCaster Arc Raiders Lifetime</h3>
                        <p className="text-slate-400 text-sm">$40.00 · One-time</p>
                      </div>
                    </div>
                    {purchaseHistory.some((i) => i.productName === 'NetCaster Arc Raiders') ? (
                      <span className="px-3 py-2 bg-green-500/10 text-green-400 rounded-lg text-sm font-bold">Purchased</span>
                    ) : (
                      <button
                        onClick={() => handleStripePurchase('netcaster')}
                        disabled={loading}
                        className="hidden py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                      >
                        {loading ? 'Redirecting...' : 'Purchase via Stripe'}
                      </button>
                    )}
                  </div>
                  <div className="relative p-6 rounded-2xl flex items-center justify-between flex-wrap gap-4 overflow-hidden border border-slate-800">
                    <div className="absolute inset-0 bg-cover opacity-30" style={{ backgroundImage: "url('https://images.squarespace-cdn.com/content/v1/5f5a3ad1b3aa75691878d2a5/fec7d2f1-d235-48ed-95e6-8f776b9d4cb1/arc-raiders-1+%2824%29.webp?format=1500w')", backgroundPosition: 'center 15%' }} />
                    <div className="absolute inset-0 bg-slate-900/80" />
                    <div className="relative flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">Ducks $5/1m</h3>
                        <p className="text-slate-400 text-sm">1m worth of ducks per $5 (in-game currency)</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStripePurchase('duckruns')}
                      disabled={loading}
                      className="relative hidden py-3 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                    >
                      {loading ? 'Redirecting...' : 'Purchase via Stripe'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PURCHASE VIEW (Original but styled) */
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Complete Your Purchase</h1>
                <p className="text-slate-400 text-lg">Instant delivery to your email immediately after payment.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl md:col-span-2">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-blue-500" />
                    Choose a product
                  </h2>
                  
                  <div className="space-y-4 mb-8">
                    <div className="p-6 bg-slate-950 border-2 border-blue-500/50 rounded-2xl flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                          <Zap className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">NetCaster Arc Raiders Lifetime</h3>
                          <p className="text-slate-400 text-sm">Full access + All future updates</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">$40.00</div>
                          <div className="text-slate-500 text-xs">One-time payment</div>
                        </div>
                        <button 
                          onClick={() => handleStripePurchase('netcaster')}
                          disabled={loading}
                          className="hidden py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {loading ? "Redirecting..." : "Purchase via Stripe"}
                          {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="relative p-6 rounded-2xl flex items-center justify-between flex-wrap gap-4 overflow-hidden border-2 border-amber-500/50">
                      <div className="absolute inset-0 bg-cover opacity-30" style={{ backgroundImage: "url('https://images.squarespace-cdn.com/content/v1/5f5a3ad1b3aa75691878d2a5/fec7d2f1-d235-48ed-95e6-8f776b9d4cb1/arc-raiders-1+%2824%29.webp?format=1500w')", backgroundPosition: 'center 15%' }} />
                      <div className="absolute inset-0 bg-slate-950/85" />
                      <div className="relative flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center">
                          <Zap className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">Ducks $5/1m</h3>
                          <p className="text-slate-400 text-sm">1m worth of ducks per $5 · RMT for in-game currency</p>
                        </div>
                      </div>
                      <div className="relative flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">$5.00</div>
                          <div className="text-slate-500 text-xs">Per 1m worth of ducks</div>
                        </div>
                        <button 
                          onClick={() => handleStripePurchase('duckruns')}
                          disabled={loading}
                          className="hidden py-3 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {loading ? "Redirecting..." : "Purchase via Stripe"}
                          {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {checkoutError && (
                      <p className="text-red-400 text-sm text-center">{checkoutError}</p>
                    )}
                    <p className="text-center text-slate-400">
                      <a
                        href={DISCORD_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                      >
                        Join Discord
                      </a>
                      {' '}to reach out to an admin about how to purchase.
                    </p>
                    <button 
                      type="button"
                      onClick={handleSimulatedPurchase}
                      disabled={loading}
                      className="hidden w-full py-2 text-slate-500 hover:text-slate-400 text-xs font-bold border border-slate-700 rounded-lg transition-all"
                    >
                      Test purchase NetCaster (simulated, no Stripe)
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl h-fit">
                  <h2 className="text-xl font-bold text-white mb-6">Instructions</h2>
                  <ul className="space-y-4">
                    <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                      <p className="text-sm text-slate-400">Complete the payment using the secure link.</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                      <p className="text-sm text-slate-400">Check your registered email for the license key and download link.</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                      <p className="text-sm text-slate-400">Run the software and enter your key to activate.</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</div>
                      <p className="text-sm text-slate-400">
                        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Join our Discord</a>
                        {' '}for personal setup assistance and technical help.
                      </p>
                    </li>
                  </ul>

                  <div className="mt-8 pt-8 border-t border-slate-800">
                    <div className="space-y-3">
                      {[
                        "Instant Key Delivery",
                        "Lifetime Updates",
                        "Personal Setup Help",
                        "HWID Locked",
                        "Undetected Engine"
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PurchasePage;
