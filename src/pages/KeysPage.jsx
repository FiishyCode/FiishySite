import React, { useState, useEffect } from 'react';
import { Key, Clock, Download } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { auth, db, storage } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

const KeysPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        setLoading(false);
        return;
      }
      setUser(currentUser);
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        const buildKeys = (data) => {
          const list = [];
          if (data?.purchased && data?.licenseKey) {
            const licenseActive = data.licenseActive !== false && String(data.licenseActive) !== 'false';
            list.push({
              productName: 'NetCaster Arc Raiders',
              key: data.licenseKey,
              date: data.purchaseDate ? new Date(data.purchaseDate).toLocaleDateString() : '',
              status: licenseActive ? 'Active' : 'Inactive',
              type: 'Lifetime',
            });
          }
          if (data?.duckRunsLicenses && Array.isArray(data.duckRunsLicenses)) {
            data.duckRunsLicenses.forEach((entry) => {
              list.push({
                productName: 'Ducks $5/1m',
                key: entry.licenseKey || '',
                date: entry.purchaseDate ? new Date(entry.purchaseDate).toLocaleDateString() : '',
                status: 'Active',
                type: 'Single use',
              });
            });
          }
          if (data?.purchasedDuckRuns && data?.licenseKeyDuckRuns && (!data.duckRunsLicenses || data.duckRunsLicenses.length === 0)) {
            list.push({
              productName: 'Ducks $5/1m',
              key: data.licenseKeyDuckRuns,
              date: data.purchaseDateDuckRuns ? new Date(data.purchaseDateDuckRuns).toLocaleDateString() : '',
              status: 'Active',
              type: 'Single use',
            });
          }
          return list;
        };
        if (snap.exists()) {
          const k = buildKeys(snap.data());
          setKeys(k);
          if (k.some((i) => i.productName === 'NetCaster Arc Raiders')) {
            try {
              setDownloadUrl(await getDownloadURL(ref(storage, 'NetCaster.exe')));
            } catch {
              setDownloadUrl('#');
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load keys:', err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Key className="w-8 h-8 text-blue-500" />
            My License Keys
          </h1>
          <p className="text-slate-400 mb-8">Your active licenses and download links.</p>

          {keys.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No license keys yet.</p>
              <Link
                to="/purchase"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Visit the purchase page to get started
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-500">Product</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-500">License Key</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-500">Date</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {keys.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{item.productName}</div>
                          <div className="text-xs text-slate-500">{item.type}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-blue-400">{item.productName === 'Ducks $5/1m' ? '—' : item.key}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{item.date}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download NetCaster
                </a>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default KeysPage;
