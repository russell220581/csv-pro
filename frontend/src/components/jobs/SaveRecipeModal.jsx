import { useState } from 'react';
import Modal from 'react-modal';
import toast from 'react-hot-toast';
import api from '../../api';
import { FaSave, FaTimes } from 'react-icons/fa';

const SaveRecipeModal = ({ isOpen, onClose, operations, onRecipeSaved }) => {
    const [recipeName, setRecipeName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!recipeName.trim()) {
            return toast.error("Please provide a name for your recipe.");
        }
        setIsLoading(true);
        try {
            const { data } = await api.post('/recipes', {
                name: recipeName,
                operations: operations.map(({ id, ...rest }) => rest), // Remove the temporary frontend 'id' before saving
            });

            if (data.success) {
                toast.success('Recipe saved successfully!');
                onRecipeSaved(data.data); // Pass the new recipe back to the parent to update the list
                onClose(); // Close the modal
                setRecipeName(''); // Reset for next time
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save recipe.");
        } finally {
            setIsLoading(false);
        }
    };

    const modalStyles = {
        content: { top: '40%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', border: 'none', padding: '0', borderRadius: '1rem', width: '90%', maxWidth: '500px', backgroundColor: 'transparent' },
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1000 }
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={onClose} style={modalStyles} contentLabel="Save Cleaning Recipe">
            <div className="card bg-base-100 shadow-xl">
                <form className="card-body" onSubmit={handleSave}>
                    <button type="button" onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><FaTimes /></button>
                    <h2 className="card-title text-2xl mb-4">Save Your Recipe</h2>
                    <p className="text-sm mb-4 text-base-content/70">
                        Save your current set of operations to reuse them later.
                    </p>
                    <div className="form-control w-full">
                        <label className="label">
                            <span className="label-text">Recipe Name</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Monthly Sales Report Cleanup"
                            className="input input-bordered w-full"
                            value={recipeName}
                            onChange={(e) => setRecipeName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="card-actions justify-end mt-6">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? <span className="loading loading-spinner loading-xs"></span> : <FaSave />}
                            Save Recipe
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default SaveRecipeModal;