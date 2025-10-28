import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name for the recipe.'],
        trim: true,
        maxlength: [100, 'Recipe name cannot be more than 100 characters.']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot be more than 500 characters.']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // The 'operations' array is the core of the recipe.
    operations: {
        type: Array,
        required: true,
        validate: [arr => arr.length > 0, 'A recipe must have at least one operation.']
    },
}, { timestamps: true });

// Ensure a user cannot have two recipes with the same name.
recipeSchema.index({ user: 1, name: 1 }, { unique: true });

const Recipe = mongoose.model('Recipe', recipeSchema);

export default Recipe;