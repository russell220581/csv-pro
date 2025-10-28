import mongoose from 'mongoose';
import crypto from 'crypto';

const tokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600, // 1 hour
    },
});

// Hash the token before saving it to the database
tokenSchema.pre("save", async function (next) {
    if (!this.isModified("token")) {
        next();
    }
    this.token = crypto.createHash("sha256").update(this.token).digest("hex");
    next();
});

const Token = mongoose.model('Token', tokenSchema);

export default Token;