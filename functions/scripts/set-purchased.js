/**
 * One-time script to mark a user as purchased.
 * Run from project root: npm run set-purchased
 * Or: npm run set-purchased -- YbzEftE2ohefLD5Bkjhe8crDs3o1
 * Requires: GOOGLE_APPLICATION_CREDENTIALS pointing to service account JSON path
 */

import admin from 'firebase-admin';

const uid = process.argv[2] || 'YbzEftE2ohefLD5Bkjhe8crDs3o1';

if (!admin.apps.length) {
  try {
    admin.initializeApp({ projectId: 'fiishy' });
  } catch (e) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
    process.exit(1);
  }
}

const db = admin.firestore();
const licenseKey = `NC-${Date.now().toString(36).toUpperCase().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const now = new Date().toISOString();

db.collection('users').doc(uid).set(
  { purchased: true, licenseKey, purchaseDate: now, role: 'holder' },
  { merge: true }
)
  .then(() => {
    console.log('Done. User', uid, 'marked as purchased.');
    console.log('License key:', licenseKey);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
