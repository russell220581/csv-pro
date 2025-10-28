import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';

// Import Child Components
import FileDropzone from './FileDropzone';
import OperationSelector from './OperationSelector';
import AppliedStepsList from './AppliedStepsList';
import SaveRecipeModal from './SaveRecipeModal';
import { FaSync, FaSave, FaTrash } from 'react-icons/fa';

const ControlPanel = ({ 
    selectedFile, onFileSelect, operations, addOperation, removeOperation, applyRecipe,
    headers, isProcessing, resetState 
}) => {
    const [recipes, setRecipes] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch user's recipes when the component mounts
    useEffect(() => {
        if (selectedFile) { // Only fetch recipes once a file is active
            api.get('/recipes')
                .then(res => setRecipes(res.data.data))
                .catch(() => toast.error("Could not load saved recipes."));
        }
    }, [selectedFile]);

    const handleApplyRecipe = (e) => {
        const recipeId = e.target.value;
        if (!recipeId) return;
        
        const selectedRecipe = recipes.find(r => r._id === recipeId);
        if (selectedRecipe) {
            applyRecipe(selectedRecipe.operations);
            toast.success(`Recipe "${selectedRecipe.name}" applied!`);
        }
    };
    
    const handleRecipeSaved = (newRecipe) => {
        setRecipes(prev => [...prev, newRecipe].sort((a, b) => a.name.localeCompare(b.name)));
    };
    
    const handleDeleteRecipe = async (recipeId) => {
        if (!window.confirm("Are you sure you want to delete this recipe?")) return;

        try {
            await api.delete(`/recipes/${recipeId}`);
            setRecipes(prev => prev.filter(r => r._id !== recipeId));
            toast.success("Recipe deleted.");
        } catch (error) {
            toast.error("Failed to delete recipe.");
        }
    };

    return (
        <>
            <SaveRecipeModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                operations={operations}
                onRecipeSaved={handleRecipeSaved}
            />

            <div className="flex flex-col gap-6 h-full">
                {/* Section 1: Upload */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">1. Upload File</h3>
                        {selectedFile && (
                            <button onClick={resetState} className="btn btn-ghost btn-xs"><FaSync /> Start Over</button>
                        )}
                    </div>
                    <FileDropzone onFileSelect={onFileSelect} isProcessing={isProcessing} selectedFile={selectedFile} />
                </div>

                {selectedFile && (
                    <>
                        <div className="divider my-0"></div>

                        {/* Section 2: Recipes */}
                        <div>
                            <h3 className="text-lg font-semibold mb-2">2. Apply a Saved Recipe (Optional)</h3>
                            <div className="form-control w-full">
                                <select className="select select-bordered" onChange={handleApplyRecipe} defaultValue="">
                                    <option value="" disabled>Choose a recipe...</option>
                                    {recipes.map(recipe => (
                                        <option key={recipe._id} value={recipe._id}>{recipe.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="divider my-0"></div>

                        {/* Section 3: Add Operations */}
                        <div>
                            <h3 className="text-lg font-semibold mb-2">3. Add Cleaning Operations</h3>
                            <OperationSelector onAddOperation={addOperation} headers={headers} />
                        </div>

                        <div className="divider my-0"></div>

                        {/* Section 4: The Recipe itself */}
                        <div className="flex-grow flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">4. Your Recipe</h3>
                                {operations.length > 0 && (
                                    <button className="btn btn-primary btn-xs" onClick={() => setIsModalOpen(true)}>
                                        <FaSave/> Save Recipe
                                    </button>
                                )}
                            </div>
                            <AppliedStepsList operations={operations} onRemoveOperation={removeOperation} />
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default ControlPanel;