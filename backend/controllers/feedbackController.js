import Feedback from '../models/Feedback.js';

// @desc    Submit user feedback
// @route   POST /api/feedback
// @access  Private
const submitFeedback = async (req, res, next) => {
    try {
        const { category, message } = req.body;
        const user = req.user; // Attached by the 'protect' middleware

        if (!category || !message) {
            return res.status(400).json({ success: false, message: 'Please provide a category and a message.' });
        }

        // --- THE PRIORITY LOGIC ---
        const priority = user.plan === 'premium' ? 'high' : 'normal';

        await Feedback.create({
            user: user.id,
            category,
            message,
            priority, // The priority is set automatically
        });

        // Optional: Trigger a confirmation email to the user here.
        // Optional: Trigger a notification email to admin here.

        res.status(201).json({ success: true, message: 'Thank you! Your feedback has been received.' });

    } catch (error) {
        next(error);
    }
};

export { submitFeedback };