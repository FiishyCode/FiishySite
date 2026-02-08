import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Users, CheckCircle, XCircle, RefreshCw, ShieldAlert, Wifi, WifiOff, ToggleLeft, ToggleRight, UserPlus, UserMinus } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { auth, functionsBaseUrl } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

function formatLastSeen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [netcasters, setNetcasters] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('licenses');
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersActionUid, setUsersActionUid] = useState(null);
  const [markUid, setMarkUid] = useState('');
  const [markLoading, setMarkLoading] = useState(false);
  const [markResult, setMarkResult] = useState('');
  const [togglingUid, setTogglingUid] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authChecked || !user) {
      setLoading(false);
      if (authChecked && !user) {
        navigate('/login');
      }
      return;
    }
    fetchNetcasters();
  }, [authChecked, user, navigate]);

  useEffect(() => {
    if (tab === 'users' && user && !error?.includes('Admin access required')) {
      fetchAllUsers();
    }
  }, [tab, user, error]);

  useEffect(() => {
    if (!user || error?.includes('Admin access required')) return;
    const interval = setInterval(fetchNetcasters, 30000);
    return () => clearInterval(interval);
  }, [user, error]);

  const fetchNetcasters = async (noLoading = false) => {
    if (!user) return;
    if (!noLoading) setFetchLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${functionsBaseUrl}/getNetcasterLicensesHttp?t=${Date.now()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) throw new Error('Admin access required.');
        throw new Error(data.error || 'Failed to fetch licenses.');
      }
      setNetcasters(data.netcasters || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch licenses.');
    } finally {
      if (!noLoading) setFetchLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    if (!user) return;
    setUsersLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${functionsBaseUrl}/listUsersHttp`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) throw new Error('Admin access required.');
        throw new Error(data.error || 'Failed to fetch users.');
      }
      setAllUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch users.');
    } finally {
      setUsersLoading(false);
    }
  };

  const setUserPurchasedStatus = async (uid, purchased) => {
    if (!user) return;
    setUsersActionUid(uid);
    try {
      const token = await user.getIdToken();
      const endpoint = purchased ? 'setUserPurchasedHttp' : 'setUserNotPurchasedHttp';
      const res = await fetch(`${functionsBaseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      fetchAllUsers();
      fetchNetcasters();
    } catch (err) {
      setError(err.message || 'Failed to update user.');
    } finally {
      setUsersActionUid(null);
    }
  };

  const toggleLicenseActive = async (uid, currentActive) => {
    if (!user) return;
    setTogglingUid(uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${functionsBaseUrl}/setLicenseActiveHttp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid, active: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setNetcasters((prev) =>
        prev.map((n) => (n.uid === uid ? { ...n, active: !currentActive } : n))
      );
    } catch (err) {
      setError(err.message || 'Failed to toggle license.');
    } finally {
      setTogglingUid(null);
    }
  };

  const filtered = netcasters.filter((n) => {
    if (filter === 'active') return n.active;
    if (filter === 'inactive') return !n.active;
    return true;
  });

  const activeCount = netcasters.filter((n) => n.active).length;
  const inactiveCount = netcasters.filter((n) => !n.active).length;

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error && error.includes('Admin access required')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
        <Navbar />
        <main className="pt-32 pb-20">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Admin Access Required</h1>
              <p className="text-slate-400 text-sm">
                Your account does not have admin privileges. Contact an administrator to request access.
              </p>
              <button
                onClick={() => navigate('/purchase')}
                className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all"
              >
                Back to Purchase
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Users className="w-8 h-8 text-blue-500" />
                Admin Dashboard
              </h1>
              <p className="text-slate-400 mt-1">
                {tab === 'licenses' ? 'NetCaster license holders' : 'All registered customers'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {tab === 'licenses' && (
                <button
                  onClick={fetchNetcasters}
                  disabled={fetchLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              )}
              {tab === 'users' && (
                <button
                  onClick={fetchAllUsers}
                  disabled={usersLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('licenses')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                tab === 'licenses' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              NetCaster Licenses
            </button>
            <button
              onClick={() => setTab('users')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                tab === 'users' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              All Users
            </button>
          </div>

          {error && !error.includes('Admin access required') && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              {error}
            </div>
          )}

          {tab === 'licenses' && (
          <div className="mb-8 p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="text-sm font-bold text-slate-400 mb-3">Mark user as purchased</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={markUid}
                onChange={(e) => setMarkUid(e.target.value)}
                placeholder="User UID"
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 w-64"
              />
              <button
                onClick={async () => {
                  if (!markUid.trim() || !user) return;
                  setMarkLoading(true);
                  setMarkResult('');
                  try {
                    const token = await user.getIdToken();
                    const res = await fetch(`${functionsBaseUrl}/setUserPurchasedHttp`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ uid: markUid.trim() }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed');
                    setMarkResult(`Done. License key: ${data.licenseKey}`);
                    fetchNetcasters();
                  } catch (err) {
                    setMarkResult(err.message || 'Failed');
                  } finally {
                    setMarkLoading(false);
                  }
                }}
                disabled={markLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
              >
                {markLoading ? '...' : 'Mark purchased'}
              </button>
              {markResult && (
                <span className={`text-sm ${markResult.startsWith('Done') ? 'text-green-400' : 'text-red-400'}`}>
                  {markResult}
                </span>
              )}
            </div>
          </div>
          )}

          {tab === 'licenses' && (
          <div className="flex flex-wrap gap-2 mb-6">
            {['all', 'active', 'inactive'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {f === 'all' && `All (${netcasters.length})`}
                {f === 'active' && `Active (${activeCount})`}
                {f === 'inactive' && `Inactive (${inactiveCount})`}
              </button>
            ))}
          </div>
          )}

          {tab === 'licenses' && (fetchLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No NetCaster licenses found{filter !== 'all' ? ` for this filter` : ''}.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-4 px-6 text-slate-400 font-medium">License Key</th>
                      <th className="text-left py-4 px-6 text-slate-400 font-medium">Email</th>
                      <th className="text-left py-4 px-6 text-slate-400 font-medium">Role</th>
                      <th className="text-left py-4 px-6 text-slate-400 font-medium">Purchase Date</th>
                      <th className="text-left py-4 px-6 text-slate-400 font-medium">Status</th>
                      <th className="text-left py-4 px-6 text-slate-400 font-medium">App</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((n) => (
                      <tr key={n.licenseKey + n.uid} className="border-b border-slate-800/80 hover:bg-slate-800/50">
                        <td className="py-4 px-6 font-mono text-white">{n.licenseKey}</td>
                        <td className="py-4 px-6 text-slate-300">{n.email || '(no email)'}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-sm font-medium ${
                              n.role === 'admin'
                                ? 'bg-blue-500/10 text-blue-400'
                                : n.role === 'holder'
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-slate-500/10 text-slate-400'
                            }`}
                          >
                            {n.role || 'customer'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                          {n.purchaseDate
                            ? new Date(n.purchaseDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : '-'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${
                                n.active
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {n.active ? (
                                <><CheckCircle className="w-4 h-4" /> Active</>
                              ) : (
                                <><XCircle className="w-4 h-4" /> Inactive</>
                              )}
                            </span>
                            <button
                              onClick={() => toggleLicenseActive(n.uid, n.active)}
                              disabled={togglingUid === n.uid}
                              className={`p-1.5 rounded-lg transition-all disabled:opacity-50 ${
                                n.active
                                  ? 'text-green-500 hover:bg-green-500/20'
                                  : 'text-amber-500 hover:bg-amber-500/20'
                              }`}
                              title={n.active ? 'Deactivate license' : 'Activate license'}
                            >
                              {togglingUid === n.uid ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : n.active ? (
                                <ToggleRight className="w-4 h-4" />
                              ) : (
                                <ToggleLeft className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${
                              n.online
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : n.lastSeen
                                  ? 'bg-slate-500/10 text-slate-400'
                                  : 'bg-slate-700/50 text-slate-500'
                            }`}
                          >
                            {n.online ? (
                              <><Wifi className="w-4 h-4" /> Online</>
                            ) : n.lastSeen ? (
                              <>
                                <WifiOff className="w-4 h-4" />
                                Offline
                                <span className="text-slate-500 font-normal ml-1">
                                  (last seen {formatLastSeen(n.lastSeen)})
                                </span>
                              </>
                            ) : (
                              <>Never</>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {tab === 'users' && (
            <>
              {usersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No users found.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-4 px-6 text-slate-400 font-medium">Email</th>
                          <th className="text-left py-4 px-6 text-slate-400 font-medium">UID</th>
                          <th className="text-left py-4 px-6 text-slate-400 font-medium">Role</th>
                          <th className="text-left py-4 px-6 text-slate-400 font-medium">Purchased</th>
                          <th className="text-left py-4 px-6 text-slate-400 font-medium">License Key</th>
                          <th className="text-left py-4 px-6 text-slate-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((u) => (
                          <tr key={u.uid} className="border-b border-slate-800/80 hover:bg-slate-800/50">
                            <td className="py-4 px-6 text-slate-300">{u.email || '(no email)'}</td>
                            <td className="py-4 px-6 font-mono text-slate-500 text-sm">{u.uid.slice(0, 12)}...</td>
                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-lg text-sm font-medium ${
                                  u.role === 'admin'
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : u.role === 'holder'
                                      ? 'bg-green-500/10 text-green-400'
                                      : 'bg-slate-500/10 text-slate-400'
                                }`}
                              >
                                {u.role || 'customer'}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${
                                  u.purchased ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'
                                }`}
                              >
                                {u.purchased ? <><CheckCircle className="w-4 h-4" /> Yes</> : <><XCircle className="w-4 h-4" /> No</>}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-mono text-slate-400 text-sm">{u.licenseKey || '-'}</td>
                            <td className="py-4 px-6">
                              {usersActionUid === u.uid ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                              ) : u.purchased ? (
                                <button
                                  onClick={() => setUserPurchasedStatus(u.uid, false)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
                                  title="Mark as not purchased"
                                >
                                  <UserMinus className="w-4 h-4" />
                                  Revoke
                                </button>
                              ) : (
                                <button
                                  onClick={() => setUserPurchasedStatus(u.uid, true)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
                                  title="Mark as purchased"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Mark purchased
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
