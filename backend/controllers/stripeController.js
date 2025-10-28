import config from '../config/index.js';
import { stripe, createCheckoutSession, handleWebhookEvent } from '../services/paymentService.js';
import User from '../models/User.js';

// @desc    Create a Stripe checkout session for plan upgrade
const createStripeCheckoutSession = async (req, res, next) => {
    if (!config.stripe.paymentsEnabled) {
        return res.status(503).json({ success: false, message: 'Payments are currently disabled.' });
    }
    try {
        // req.user is attached by the 'protect' middleware
        const session = await createCheckoutSession(req.user);
        res.status(200).json({ success: true, url: session.url });
    } catch (error) {
        next(error);
    }
};

// @desc    Handle incoming webhooks from Stripe
const stripeWebhookHandler = (req, res, next) => {
    // Stripe sends the signature in the headers
    const signature = req.headers['stripe-signature'];
    let event;

    try {
        // Verify the event is genuinely from Stripe using the webhook secret
        event = stripe.webhooks.constructEvent(req.body, signature, config.stripe.webhookSecret);
    } catch (err) {
        console.error('Stripe webhook signature verification failed.');
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Pass the verified event to our service for processing
    handleWebhookEvent(event)
        .then(() => {
            // Acknowledge receipt of the event with a 200 OK
            res.status(200).json({ received: true });
        })
        .catch((err) => {
            // If our handler fails, we still need to inform Stripe, but log the error
            console.error('Error handling webhook event:', err);
            res.status(500).json({ error: 'Webhook handler failed.' });
        });
};


// @desc    A mock endpoint for developers to upgrade to premium without payment
const mockPremiumUpgrade = async (req, res, next) => {
    // This endpoint should ONLY work in a non-production environment
    if (config.env === 'production') {
        return res.status(403).json({ success: false, message: 'This feature is not available in production.' });
    }

    try {
        // req.user is attached by the 'protect' middleware
        req.user.plan = 'premium';
        req.user.subscriptionStatus = 'active'; // or 'dev_mock'
        await req.user.save();
        res.status(200).json({ success: true, message: 'Successfully upgraded to premium for development.' });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a Stripe Customer Portal session
const createPortalSession = async (req, res, next) => {
    if (!config.stripe.paymentsEnabled) {
        return res.status(503).json({ success: false, message: 'Billing management is currently disabled.' });
    }
    try {
        // req.user is from our 'protect' middleware
        const user = req.user;
        
        if (!user.stripeCustomerId) {
            return res.status(400).json({ success: false, message: 'User does not have a billing account with us.' });
        }
        
        // This is the URL the user will be sent back to after they are done managing their subscription.
        const returnUrl = `${config.cors.clientUrl}/app/settings`;
        
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: returnUrl,
        });
        
        res.status(200).json({ success: true, url: portalSession.url });
    } catch (error) {
        next(error);
    }
};

export {
    createStripeCheckoutSession,
    stripeWebhookHandler,
    mockPremiumUpgrade,
    createPortalSession
};