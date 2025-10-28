import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    createRecipe,
    getUserRecipes,
    deleteRecipe
} from '../controllers/recipeController.js';

const router = express.Router();

// All recipe routes are protected and require a logged-in user.
router.use(protect);

router.route('/')
    .post(createRecipe)
    .get(getUserRecipes);

router.route('/:id')
    .delete(deleteRecipe);

export default router;