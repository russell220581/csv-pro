import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
        required: true
    },
    originalFileName: {
        type: String,
        required: true
    },
    inputFileSize: {
        type: Number,
        required: true
    },
    inputS3Key: {
        type: String,
        required: true,
        unique: true
    },
    outputS3Key: {
        type: String,
        unique: true,
        sparse: true
    },
    rowCount: {
        type: Number
    },
    operations: {
        type: Object,
        required: true
    },
    errorMessage: {
        type: String
    },
    failureReason: {
        type: String,
        enum: ['QUOTA_LIMIT_ROWS', 'QUOTA_LIMIT_JOBS', 'INVALID_FILE', 'INTERNAL_ERROR', 'VIRUS_DETECTED', null],
        default: null
    },
    // NEW: Virus scan results
    virusScanResult: {
        isClean: { type: Boolean, default: true },
        scannedAt: { type: Date, default: Date.now },
        scanResult: { type: String },
        skipped: { type: Boolean, default: false },
        reason: { type: String }
    }
}, { timestamps: true });

const Job = mongoose.model('Job', jobSchema);

export default Job;