import { auth } from '../config/firebase';

const checkoutHttpUrl = import.meta.env.VITE_CHECKOUT_HTTP_URL || 'https://createcheckoutsessionhttp-t33rckpowa-uc.a.run.app';

/**
 * Start Stripe Checkout for the current user via HTTP endpoint (CORS-enabled for localhost).
 * productId: 'netcaster' | 'duckruns'. On success Stripe redirects back and webhook updates Firestore.
 */
export async function redirectToStripeCheckout(productId = 'netcaster') {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in to purchase.');
  const token = await user.getIdToken();
  const url = `${checkoutHttpUrl}?productId=${encodeURIComponent(productId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ origin: window.location.origin, productId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create checkout session.');
  if (data.url) {
    window.location.href = data.url;
    return;
  }
  throw new Error('No checkout URL returned');
}
