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
const stripeWebhookSecret = defineString('STRIPE_WEBHOOK_SECRET');

const PRODUCTS = {
  netcaster: {
    name: 'NetCaster Arc Raiders Lifetime',
    description: 'Full access + All future updates',
    unit_amount: 2500,
    keyPrefix: 'NC',
  },
  duckruns: {
    name: 'Duck Runs',
    description: 'Single use access',
    unit_amount: 500,
    keyPrefix: 'DR',
  },
};

function setCors(res, origin = '*') {
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');
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
    await usersRef.set({ stripeCustomerId: customerId }, { merge: true });
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
  { region: 'us-central1' },
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
  { region: 'us-central1' },
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

/**
 * Stripe webhook HTTP endpoint. On checkout.session.completed, writes
 * purchased, licenseKey, purchaseDate to Firestore users/{uid}.
 *
 * In Stripe Dashboard: Developers -> Webhooks -> Add endpoint
 * URL: https://us-central1-<projectId>.cloudfunctions.net/stripeWebhook
 * Events: checkout.session.completed
 */
export const stripeWebhook = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const secret = stripeWebhookSecret.value();
    if (!secret) {
      console.error('STRIPE_WEBHOOK_SECRET not set');
      res.status(500).send('Webhook secret not configured');
      return;
    }

    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: '2024-11-20.acacia' });
    const sig = req.headers['stripe-signature'];
    const rawBody = req.rawBody ?? req.body;
    const payload = Buffer.isBuffer(rawBody) ? rawBody : (typeof rawBody === 'string' ? rawBody : JSON.stringify(req.body));

    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, secret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const uid = session.metadata?.firebaseUid || session.client_reference_id;
      if (!uid) {
        console.error('No firebaseUid in session metadata');
        res.status(200).send('OK');
        return;
      }

      const productId = session.metadata?.product || 'netcaster';
      const product = PRODUCTS[productId] || PRODUCTS.netcaster;
      const licenseKey = `${product.keyPrefix}-${session.id.slice(-8).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();

      if (productId === 'duckruns') {
        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        let existing = userSnap.exists ? (userSnap.data().duckRunsLicenses || []) : [];
        if (existing.length === 0 && userSnap.exists && userSnap.data().licenseKeyDuckRuns) {
          existing = [{ licenseKey: userSnap.data().licenseKeyDuckRuns, purchaseDate: userSnap.data().purchaseDateDuckRuns || now }];
        }
        const newEntry = { licenseKey, purchaseDate: now };
        await userRef.set(
          {
            purchasedDuckRuns: true,
            duckRunsLicenses: [...existing, newEntry],
          },
          { merge: true }
        );
      } else {
        await db.collection('users').doc(uid).set(
          {
            purchased: true,
            purchaseDate: now,
            licenseKey,
            stripeSessionId: session.id,
          },
          { merge: true }
        );
      }
    }

    res.status(200).send('OK');
  }
);
