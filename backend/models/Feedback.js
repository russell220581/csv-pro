import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    category: {
        type: String,
        enum: ['bug_report', 'feature_request', 'general_question'],
        required: [true, 'Please select a category.'],
    },
    message: {
        type: String,
        required: [true, 'Please provide a message.'],
        trim: true,
        maxlength: [2000, 'Message cannot be more than 2000 characters.'],
    },
    status: {
        type: String,
        enum: ['new', 'viewed', 'in_progress', 'resolved'],
        default: 'new',
    },
    priority: {
        type: String,
        enum: ['high', 'normal'],
        default: 'normal',
    },
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;