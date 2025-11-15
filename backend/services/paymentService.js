import Stripe from 'stripe';
import config from '../config/index.js';
import User from '../models/User.js';

// Initialize the Stripe client with the API key from our central config
const stripe = new Stripe(config.stripe.apiKey);

/**
 * Creates a Stripe Checkout Session for a user to upgrade their plan.
 * @param {object} user - The Mongoose user document.
 * @returns {Promise<Stripe.Checkout.Session>} The created Stripe session object.
 */
const createCheckoutSession = async (user) => {
    // In a real application, you would fetch this price ID from your database or config
    const premiumPriceId = 'price_your_premium_plan_id'; // IMPORTANT: Replace with your actual Stripe Price ID

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: user.email, // Pre-fill the user's email
        line_items: [
            {
                price: premiumPriceId,
                quantity: 1,
            },
        ],
        // IMPORTANT: These URLs should point to your frontend application
        success_url: `${config.cors.clientUrl}/dashboard?payment=success`,
        cancel_url: `${config.cors.clientUrl}/dashboard?payment=cancelled`,
        // Pass the user's ID in metadata to identify them in the webhook
        metadata: {
            userId: user._id.toString(),
        },
    });

    return session;
};

/**
 * Handles incoming Stripe webhook events to update user plans.
 * @param {object} event - The Stripe event object from the webhook.
 */
const handleWebhookEvent = async (event) => {
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.metadata.userId;
            const stripeCustomerId = session.customer;
            const subscriptionStatus = 'active';

            await User.findByIdAndUpdate(userId, {
                plan: 'premium',
                stripeCustomerId,
                subscriptionStatus,
            });
            console.log(`User ${userId} successfully upgraded to premium.`);
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const stripeCustomerId = subscription.customer;

            await User.findOneAndUpdate(
                { stripeCustomerId },
                {
                    plan: 'free',
                    subscriptionStatus: 'canceled',
                }
            );
            console.log(`Subscription for customer ${stripeCustomerId} cancelled. User downgraded to free.`);
            break;
        }
        
        // Add more event handlers here as needed (e.g., for failed payments)
        // case 'invoice.payment_failed': { ... }
        
        default:
            console.log(`Unhandled Stripe event type: ${event.type}`);
    }
};

export {
    stripe, // Also export the stripe instance for the webhook signature check
    createCheckoutSession,
    handleWebhookEvent
};