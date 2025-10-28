import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    createStripeCheckoutSession,
    stripeWebhookHandler,
    mockPremiumUpgrade,
    createPortalSession
} from '../controllers/stripeController.js';

const router = express.Router();

// --- Protected Routes ---
// A logged-in user can request to create a checkout session
router.post('/create-checkout-session', protect, createStripeCheckoutSession);
// Route for a logged-in user to access the customer portal
router.post('/create-portal-session', protect, createPortalSession);
// A developer-only route to mock a premium upgrade
router.post('/mock-upgrade', protect, mockPremiumUpgrade);

// --- Public Webhook Route ---
// This route must be public and use express.raw to receive the raw request body from Stripe
// for signature verification.
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

export default router;