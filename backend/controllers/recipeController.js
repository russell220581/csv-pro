import Recipe from '../models/Recipe.js';

/**
 * @desc    Create a new recipe
 * @route   POST /api/recipes
 * @access  Private
 */
const createRecipe = async (req, res, next) => {
    const { name, description, operations } = req.body;
    const userId = req.user.id;

    if (!name || !operations) {
        return res.status(400).json({ success: false, message: 'Name and operations are required.' });
    }

    try {
        const recipe = await Recipe.create({
            name,
            description,
            operations,
            user: userId,
        });
        res.status(201).json({ success: true, data: recipe });
    } catch (error) {
        // Handle the unique index error gracefully
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'A recipe with this name already exists.' });
        }
        next(error);
    }
};

/**
 * @desc    Get all recipes for the logged-in user
 * @route   GET /api/recipes
 * @access  Private
 */
const getUserRecipes = async (req, res, next) => {
    try {
        const recipes = await Recipe.find({ user: req.user.id }).sort({ name: 1 });
        res.status(200).json({ success: true, data: recipes });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a recipe
 * @route   DELETE /api/recipes/:id
 * @access  Private
 */
const deleteRecipe = async (req, res, next) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({ success: false, message: 'Recipe not found.' });
        }

        // Ensure the user owns the recipe they are trying to delete
        if (recipe.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'User not authorized to delete this recipe.' });
        }

        await recipe.deleteOne();

        res.status(200).json({ success: true, message: 'Recipe deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

export {
    createRecipe,
    getUserRecipes,
    deleteRecipe,
};