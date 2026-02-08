import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import Stripe from 'stripe';

initializeApp();
const db = getFirestore();
const authAdmin = getAuth();

const stripeSecretKey = defineString('STRIPE_SECRET_KEY');

const INITIAL_ADMIN_UID = 'VwgYAsHYCMbgJfYTZuoHnmwILGC3';

const PRODUCTS = {
  netcaster: {
    name: 'NetCaster Arc Raiders Lifetime',
    description: 'Full access + All future updates',
    unit_amount: 4000,
    keyPrefix: 'NC',
  },
  duckruns: {
    name: 'Ducks $5/1m',
    description: '1m worth of ducks per $5 (in-game currency)',
    unit_amount: 500,
    keyPrefix: 'DR',
  },
};

function setCors(res, origin = '*') {
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');
}

const HEARTBEAT_TTL_MS = 90 * 1000;

function sanitizeKeyForDocId(key) {
  return String(key || '').replace(/[^a-zA-Z0-9-_]/g, '_');
}

async function createSessionForUser(uid, email, origin, productId = 'netcaster') {
  const product = PRODUCTS[productId] || PRODUCTS.netcaster;
  const secret = stripeSecretKey.value();
  if (!secret || !secret.startsWith('sk_')) {
    throw new Error('Stripe is not configured.');
  }
  const stripe = new Stripe(secret, { apiVersion: '2024-11-20.acacia' });
  const usersRef = db.collection('users').doc(uid);
  const userSnap = await usersRef.get();
  let customerId = userSnap.exists ? userSnap.data().stripeCustomerId : null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: { firebaseUid: uid },
    });
    customerId = customer.id;
    const existingData = userSnap.exists ? userSnap.data() : {};
    const updates = { stripeCustomerId: customerId };
    if (!existingData.role) updates.role = 'customer';
    await usersRef.set(updates, { merge: true });
  }
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card', 'cashapp'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description,
            images: [],
          },
          unit_amount: product.unit_amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/purchase?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/purchase`,
    metadata: { firebaseUid: uid, product: productId },
    payment_intent_data: { metadata: { firebaseUid: uid, product: productId } },
  });
  return session.url;
}

/**
 * Callable: create a Stripe Checkout Session (used when not blocked by CORS).
 */
export const createCheckoutSession = onCall(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in to purchase.');
    }
    const uid = request.auth.uid;
    const email = request.auth.token.email || null;
    const origin = request.data?.origin || request.rawRequest?.headers?.origin || '';
    if (!origin) {
      throw new HttpsError('invalid-argument', 'Missing origin for success/cancel URLs.');
    }
    const productId = request.data?.productId || 'netcaster';
    const url = await createSessionForUser(uid, email, origin, productId);
    return { url };
  }
);

/**
 * HTTP endpoint with CORS. POST with Authorization: Bearer <firebaseIdToken>
 * and body { "origin": "...", "productId": "netcaster" | "duckruns" }.
 */
export const createCheckoutSessionHttp = onRequest(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (req, res) => {
    const origin = req.headers.origin || req.body?.origin || '*';
    setCors(res, origin);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header.' });
      return;
    }
    const idToken = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(idToken);
    } catch (e) {
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }

    const bodyOrigin = (req.body && req.body.origin) || req.headers.origin || '';
    if (!bodyOrigin) {
      res.status(400).json({ error: 'Missing origin in body or Origin header.' });
      return;
    }

    try {
      const productId = (req.query && req.query.productId) || (req.body && req.body.productId) || 'netcaster';
      const url = await createSessionForUser(decoded.uid, decoded.email, bodyOrigin, productId);
      res.status(200).json({ url });
    } catch (e) {
      console.error('createCheckoutSessionHttp error:', e);
      res.status(500).json({ error: e.message || 'Failed to create checkout session.' });
    }
  }
);

async function ensureUserIsAdmin(uid) {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  const data = snap.exists ? snap.data() : {};
  if (data.role === 'admin') return true;
  if (uid === INITIAL_ADMIN_UID) {
    await userRef.set({ role: 'admin' }, { merge: true });
    return true;
  }
  return false;
}

/**
 * Callable: returns all NetCaster license holders (active/inactive).
 * Requires caller to have role 'admin' in users/{uid}.
 */
export const getNetcasterLicenses = onCall(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }
    const uid = request.auth.uid;
    const isAdmin = await ensureUserIsAdmin(uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required.');
    }

    const usersSnap = await db.collection('users').get();
    const netcasters = [];

    usersSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const keyVal = d.licenseKey;
      if (!keyVal || typeof keyVal !== 'string') return;
      if (!keyVal.startsWith('NC')) return;

      const licenseActive = d.licenseActive !== false;
      netcasters.push({
        uid: docSnap.id,
        email: d.email || null,
        licenseKey: keyVal,
        purchaseDate: d.purchaseDate || null,
        role: d.role || 'customer',
        active: licenseActive,
        licenseActive,
      });
    });

    netcasters.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));

    return { netcasters };
  }
);

/**
 * HTTP endpoint with CORS. POST with body { email, licenseKey, hwid }.
 * Called by the NetCaster Python app to verify license before login.
 * Uses Admin SDK so it bypasses Firestore security rules.
 */
export const verifyLicense = onRequest(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (req, res) => {
    const origin = req.headers.origin || '*';
    setCors(res, origin);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
      return;
    }

    let email, licenseKey, hwid;
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      email = String(body.email || '').trim();
      licenseKey = String(body.licenseKey || body.license_key || '').trim();
      hwid = String(body.hwid || '').trim();
    } catch {
      res.status(400).json({ success: false, message: 'Invalid JSON body.' });
      return;
    }

    if (!email || !licenseKey || !licenseKey.startsWith('NC')) {
      res.status(200).json({ success: false, message: 'Invalid Email or License Key.' });
      return;
    }

    try {
      const usersSnap = await db.collection('users')
        .where('email', '==', email)
        .where('licenseKey', '==', licenseKey)
        .limit(1)
        .get();

      if (usersSnap.empty) {
        res.status(200).json({ success: false, message: 'Invalid Email or License Key.' });
        return;
      }

      const doc = usersSnap.docs[0];
      const docId = doc.id;
      const data = doc.data();

      if (!data.purchased) {
        res.status(200).json({ success: false, message: 'This account has not purchased a license.' });
        return;
      }

      if (data.licenseActive === false) {
        res.status(200).json({ success: false, message: 'This license has been deactivated. Contact support for assistance.' });
        return;
      }

      const storedHwid = data.hwid || null;

      if (!storedHwid) {
        if (hwid) {
          await db.collection('users').doc(docId).set({ hwid }, { merge: true });
        }
        res.status(200).json({ success: true, message: 'Success! Hardware ID bound to your account.' });
        return;
      }

      if (storedHwid !== hwid) {
        res.status(200).json({ success: false, message: 'License is bound to another computer. Contact support to reset HWID.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Welcome back!' });
    } catch (e) {
      console.error('verifyLicense error:', e);
      res.status(500).json({ success: false, message: `Connection error: ${e.message || 'Unknown error'}` });
    }
  }
);

/**
 * HTTP endpoint with CORS. POST with body { licenseKey: "NC-XXX-YYY" }.
 * Called by the NetCaster Python app to report it is running.
 * Validates the key exists and is active before recording.
 */
export const reportHeartbeat = onRequest(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (req, res) => {
    const origin = req.headers.origin || '*';
    setCors(res, origin);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    let licenseKey;
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      licenseKey = body.licenseKey || body.license_key || '';
      licenseKey = String(licenseKey).trim();
    } catch {
      res.status(400).json({ error: 'Invalid JSON body.' });
      return;
    }

    if (!licenseKey || !licenseKey.startsWith('NC')) {
      res.status(400).json({ error: 'Invalid or missing license key.' });
      return;
    }

    try {
      const usersSnap = await db.collection('users').where('licenseKey', '==', licenseKey).limit(1).get();
      if (usersSnap.empty) {
        res.status(404).json({ error: 'License key not found.' });
        return;
      }
      const userData = usersSnap.docs[0].data();
      if (!userData.purchased || !userData.licenseKey) {
        res.status(403).json({ error: 'License is not active.' });
        return;
      }
      if (userData.licenseActive === false) {
        res.status(403).json({ error: 'License has been deactivated.' });
        return;
      }

      const docId = sanitizeKeyForDocId(licenseKey);
      const now = new Date();
      await db.collection('heartbeats').doc(docId).set(
        { lastSeen: now.toISOString(), licenseKey, updatedAt: now, offline: false },
        { merge: true }
      );

      res.status(200).json({ ok: true });
    } catch (e) {
      console.error('reportHeartbeat error:', e);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

/**
 * HTTP endpoint with CORS. POST with body { licenseKey: "NC-XXX-YYY" }.
 * Called by the NetCaster Python app when it shuts down for instant offline detection.
 */
export const reportOffline = onRequest(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (req, res) => {
    const origin = req.headers.origin || '*';
    setCors(res, origin);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    let licenseKey;
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      licenseKey = body.licenseKey || body.license_key || '';
      licenseKey = String(licenseKey).trim();
    } catch {
      res.status(400).json({ error: 'Invalid JSON body.' });
      return;
    }

    if (!licenseKey || !licenseKey.startsWith('NC')) {
      res.status(400).json({ error: 'Invalid or missing license key.' });
      return;
    }

    try {
      const docId = sanitizeKeyForDocId(licenseKey);
      const docRef = db.collection('heartbeats').doc(docId);
      const snap = await docRef.get();
      const existing = snap.exists ? snap.data() : {};
      const now = new Date();
      await docRef.set(
        {
          licenseKey,
          lastSeen: existing.lastSeen || now.toISOString(),
          offline: true,
          offlineAt: now.toISOString(),
        },
        { merge: true }
      );
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error('reportOffline error:', e);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

/**
 * HTTP endpoint with CORS. GET with Authorization: Bearer <firebaseIdToken>.
 * Returns NetCaster licenses for admin users. Use when callable triggers CORS issues.
 */
export const getNetcasterLicensesHttp = onRequest(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (req, res) => {
    const origin = req.headers.origin || '*';
    setCors(res, origin);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header.' });
      return;
    }
    const idToken = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(idToken);
    } catch (e) {
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }

    try {
      const uid = decoded.uid;
      const isAdmin = await ensureUserIsAdmin(uid);
      if (!isAdmin) {
        res.status(403).json({ error: 'Admin access required.' });
        return;
      }

      const usersSnap = await db.collection('users').get();
      const netcasters = [];

      usersSnap.forEach((docSnap) => {
        const d = docSnap.data();
        const keyVal = d.licenseKey;
        if (!keyVal || typeof keyVal !== 'string') return;
        if (!keyVal.startsWith('NC')) return;

        const licenseActive = d.licenseActive !== false && String(d.licenseActive) !== 'false';
        netcasters.push({
          uid: docSnap.id,
          email: d.email || null,
          licenseKey: keyVal,
          purchaseDate: d.purchaseDate || null,
          role: d.role || 'customer',
          active: licenseActive,
        });
      });

      netcasters.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));

      const heartbeatRefs = netcasters.map((n) => db.collection('heartbeats').doc(sanitizeKeyForDocId(n.licenseKey)));
      const heartbeatSnaps = heartbeatRefs.length > 0 ? await db.getAll(...heartbeatRefs) : [];
      const now = Date.now();
      netcasters.forEach((n, i) => {
        const hb = heartbeatSnaps[i]?.exists ? heartbeatSnaps[i].data() : null;
        const lastSeen = hb?.lastSeen || null;
        const isOffline = hb?.offline === true;
        n.lastSeen = lastSeen;
        n.online = !isOffline && lastSeen && now - new Date(lastSeen).getTime() < HEARTBEAT_TTL_MS;
      });

      res.status(200).json({ netcasters });
    } catch (e) {
      console.error('getNetcasterLicensesHttp error:', e);
      res.status(500).json({ error: e.message || 'Internal server error.' });
    }
  }
);

/**
 * HTTP: list all users (Firebase Auth + Firestore overlay). Admin only.
 */
export const listUsersHttp = onRequest(
  { region: 'us-central1', cors: true, run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (req, res) => {
    const origin = req.headers.origin || '*';
    setCors(res, origin);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header.' });
      return;
    }
    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }
    const isAdmin = await ensureUserIsAdmin(decoded.uid);
    if (!isAdmin) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }

    try {
      const listResult = await authAdmin.listUsers(1000);
      const authUsers = listResult.users.map((u) => ({
        uid: u.uid,
        email: u.email || null,
        displayName: u.displayName || null,
      }));

      if (authUsers.length === 0) {
        res.status(200).json({ users: [] });
        return;
      }

      const batchSize = 100;
      const firestoreData = new Map();
      for (let i = 0; i < authUsers.length; i += batchSize) {
        const batch = authUsers.slice(i, i + batchSize);
        const refs = batch.map((u) => db.collection('users').doc(u.uid));
        const snaps = await db.getAll(...refs);
        snaps.forEach((snap, idx) => {
          if (snap.exists) {
            const d = snap.data();
            firestoreData.set(snap.id, {
              purchased: Boolean(d.purchased),
              licenseKey: d.licenseKey || null,
              role: d.role || 'customer',
              purchaseDate: d.purchaseDate || null,
              email: d.email || null,
            });
          }
        });
      }

      const users = authUsers.map((u) => {
        const fs = firestoreData.get(u.uid) || {};
        return {
          uid: u.uid,
          email: u.email || fs.email || null,
          displayName: u.displayName || null,
          purchased: Boolean(fs.purchased),
          licenseKey: fs.licenseKey || null,
          role: fs.role || 'customer',
          purchaseDate: fs.purchaseDate || null,
        };
      });

      users.sort((a, b) => {
        const aDate = a.purchaseDate || '';
        const bDate = b.purchaseDate || '';
        if (aDate && bDate) return bDate.localeCompare(aDate);
        if (aDate) return -1;
        if (bDate) return 1;
        return (a.email || '').localeCompare(b.email || '');
      });

      res.status(200).json({ users });
    } catch (e) {
      console.error('listUsersHttp error:', e);
      res.status(500).json({ error: e.message || 'Internal server error.' });
    }
  }
);

/**
 * HTTP: mark a user as NOT purchased. Admin only. Body: { uid }
 */
export const setUserNotPurchasedHttp = onRequest(
  { region: 'us-central1', cors: true, run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization required.' });
      return;
    }
    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }
    const isAdmin = await ensureUserIsAdmin(decoded.uid);
    if (!isAdmin) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
      res.status(400).json({ error: 'Invalid JSON body.' });
      return;
    }
    const uid = body.uid || '';
    if (!uid) {
      res.status(400).json({ error: 'uid is required.' });
      return;
    }
    try {
      const userRef = db.collection('users').doc(uid);
      await userRef.set({ purchased: false, licenseActive: false }, { merge: true });
      res.status(200).json({ ok: true, uid });
    } catch (e) {
      console.error('setUserNotPurchasedHttp error:', e);
      res.status(500).json({ error: e.message || 'Internal server error.' });
    }
  }
);

/**
 * Callable: promote a user to admin. Requires caller to already be an admin.
 * Pass uid to promote, or omit to promote INITIAL_ADMIN_UID.
 */
export const bootstrapAdmin = onCall(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }
    const isAdmin = await ensureUserIsAdmin(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required.');
    }
    const { uid } = request.data || {};
    const targetUid = uid || INITIAL_ADMIN_UID;
    await db.collection('users').doc(targetUid).set({ role: 'admin' }, { merge: true });
    return { ok: true, uid: targetUid };
  }
);

/**
 * Callable: mark a user as purchased (NetCaster). Admin only.
 */
export const setUserPurchased = onCall(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }
    const isAdmin = await ensureUserIsAdmin(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required.');
    }
    const { uid } = request.data || {};
    if (!uid) {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }
    const licenseKey = `NC-${Date.now().toString(36).toUpperCase().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    const existingRole = snap.exists ? snap.data().role : null;
    const role = existingRole === 'admin' ? 'admin' : 'holder';
    let email = snap.exists ? snap.data().email : null;
    try {
      const authUser = await authAdmin.getUser(uid);
      email = authUser.email || email;
    } catch {}
      await userRef.set(
        { purchased: true, licenseKey, purchaseDate: now, role, email: email || null, licenseActive: true },
        { merge: true }
      );
      return { ok: true, uid, licenseKey };
  }
);

/**
 * HTTP: mark a user as purchased (NetCaster). Admin only. Use when callable has CORS issues.
 */
export const setUserPurchasedHttp = onRequest(
  { region: 'us-central1', run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (req, res) => {
    const origin = req.headers.origin || '*';
    setCors(res, origin);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header.' });
      return;
    }
    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }
    const isAdmin = await ensureUserIsAdmin(decoded.uid);
    if (!isAdmin) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
      res.status(400).json({ error: 'Invalid JSON body.' });
      return;
    }
    const uid = body.uid || '';
    if (!uid) {
      res.status(400).json({ error: 'uid is required.' });
      return;
    }
    try {
      const licenseKey = `NC-${Date.now().toString(36).toUpperCase().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const userRef = db.collection('users').doc(uid);
      const snap = await userRef.get();
      const existingRole = snap.exists ? snap.data().role : null;
      const role = existingRole === 'admin' ? 'admin' : 'holder';
      let email = snap.exists ? snap.data().email : null;
      try {
        const authUser = await authAdmin.getUser(uid);
        email = authUser.email || email;
      } catch {}
      await userRef.set(
        { purchased: true, licenseKey, purchaseDate: now, role, email: email || null, licenseActive: true },
        { merge: true }
      );
      res.status(200).json({ ok: true, uid, licenseKey });
    } catch (e) {
      console.error('setUserPurchasedHttp error:', e);
      res.status(500).json({ error: e.message || 'Internal server error.' });
    }
  }
);

/**
 * HTTP: toggle license active/inactive. Admin only.
 * Body: { uid, active: boolean }
 */
export const setLicenseActiveHttp = onRequest(
  { region: 'us-central1', cors: true, run: { maxInstances: 1, cpu: 0.08, memory: '256Mi' } },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization required.' });
      return;
    }
    let decoded;
    try {
      decoded = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }
    const isAdmin = await ensureUserIsAdmin(decoded.uid);
    if (!isAdmin) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
      res.status(400).json({ error: 'Invalid JSON body.' });
      return;
    }
    const uid = body.uid || '';
    const active = body.active === true || body.active === 'true';
    if (!uid) {
      res.status(400).json({ error: 'uid is required.' });
      return;
    }
    try {
      const userRef = db.collection('users').doc(uid);
      const snap = await userRef.get();
      if (!snap.exists || !snap.data().licenseKey) {
        res.status(404).json({ error: 'User or license not found.' });
        return;
      }
      await userRef.set({ licenseActive: active }, { merge: true });
      res.status(200).json({ ok: true, uid, licenseActive: active });
    } catch (e) {
      console.error('setLicenseActiveHttp error:', e);
      res.status(500).json({ error: e.message || 'Internal server error.' });
    }
  }
);
