import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { FaPlus, FaTimes, FaStar } from 'react-icons/fa';
import api from '../../api';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodArray, ZodEnum, ZodString } from 'zod';

// Import the single source of truth for operations!
import { operations as operationDefinitions } from '@cleaning-engine/operations.js';

// --- Dynamic Form Component ---
const DynamicOperationForm = ({ operationKey, headers, onSave, onCancel }) => {
    const opInfo = operationDefinitions[operationKey];
    const { control, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(opInfo.schema),
        defaultValues: opInfo.schema.default(),
    });

    const handleFormSubmit = (data) => {
        // For multi-select, the data might be a single value if only one is selected.
        // Ensure 'columns' is always an array.
        if (opInfo.schema.shape.columns instanceof ZodArray && data.columns && !Array.isArray(data.columns)) {
            data.columns = [data.columns];
        }
        onSave({ type: operationKey, params: data });
    };

    const renderField = (fieldName, fieldType) => {
        // Check the type of Zod schema to determine the input type
        if (fieldType instanceof ZodArray) { // For multi-select, like 'remove_columns'
            return (
                <Controller
                    name={fieldName}
                    control={control}
                    render={({ field }) => (
                         <select {...field} multiple={true} className={`select select-bordered w-full h-32 ${errors[fieldName] ? 'select-error' : ''}`}>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    )}
                />
            );
        }
        
        if (fieldType instanceof ZodEnum) { // For dropdowns, like 'change_case'
            return (
                 <Controller
                    name={fieldName}
                    control={control}
                    render={({ field }) => (
                        <select {...field} className={`select select-bordered w-full ${errors[fieldName] ? 'select-error' : ''}`}>
                            {fieldType.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    )}
                />
            );
        }
        
        if (fieldType instanceof ZodString && (fieldName === 'column' || fieldName === 'columns')) { // For single-column dropdowns
            return (
                <Controller
                    name={fieldName}
                    control={control}
                    render={({ field }) => (
                        <select {...field} className={`select select-bordered w-full ${errors[fieldName] ? 'select-error' : ''}`}>
                            <option value="">-- Select a column --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    )}
                />
            );
        }

        // Default to a standard text input for find/replace, etc.
        return <Controller name={fieldName} control={control} render={({ field }) => <input type="text" {...field} className={`input input-bordered w-full ${errors[fieldName] ? 'input-error' : ''}`} />} />;
    };

    return (
        <div>
            <h3 className="font-bold text-lg mb-2">{opInfo.name}</h3>
            <p className="mb-4 text-sm text-base-content/70">{opInfo.description}</p>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                {Object.entries(opInfo.schema.shape).map(([fieldName, fieldType]) => (
                    <div key={fieldName} className="form-control w-full">
                        <label className="label">
                            <span className="label-text capitalize">{fieldName.replace(/_/g, ' ')}</span>
                        </label>
                        {renderField(fieldName, fieldType)}
                        {errors[fieldName] && <span className="text-error text-xs mt-1">{errors[fieldName].message}</span>}
                    </div>
                ))}
                <div className="modal-action">
                    <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Add Operation</button>
                </div>
            </form>
        </div>
    );
};

// The main OperationSelector component remains largely the same
const OperationSelector = ({ onAddOperation, headers }) => {
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [operationType, setOperationType] = useState('');
    const [userPlan, setUserPlan] = useState('free');

    useEffect(() => {
        if (modalIsOpen) {
            api.get('/auth/me').then(res => setUserPlan(res.data.data.plan)).catch(() => setUserPlan('free'));
        }
    }, [modalIsOpen]);

    const openModal = () => setModalIsOpen(true);
    const closeModal = () => { setModalIsOpen(false); setOperationType(''); };
    const handleSaveOperation = (opData) => { onAddOperation(opData); closeModal(); };

    const handleSelectChange = (e) => {
        const selectedKey = e.target.value;
        const opInfo = operationDefinitions[selectedKey];
        if (userPlan === 'free' && opInfo?.isPremium) {
            toast.error('This is a Premium feature. Please upgrade your plan.');
            return;
        }
        setOperationType(selectedKey);
    };
    
    const modalStyles = {
        content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)', // This also creates a new stacking context
            border: 'none',
            padding: '2rem', // Add padding directly to the content
            borderRadius: '1rem',
            width: '90%',
            maxWidth: '600px',
            backgroundColor: 'hsl(var(--b1))', // The DaisyUI base-100 color
            color: 'hsl(var(--bc))', // The DaisyUI base-content color
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        },
        overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000 // Ensure overlay is on top
        }
    };
    
    const groupedOps = Object.entries(operationDefinitions).reduce((acc, [key, op]) => {
        const group = op.isPremium ? 'premium' : 'free';
        if (!acc[group]) acc[group] = [];
        acc[group].push({ key, ...op });
        return acc;
    }, {});

    return (
        <div>
            <button className="btn btn-primary w-full" onClick={openModal} disabled={!headers || headers.length === 0}><FaPlus /> Add New Operation</button>
            <Modal isOpen={modalIsOpen} onRequestClose={closeModal} style={modalStyles} contentLabel="Add New Cleaning Operation">
                <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><FaTimes /></button>
                <h2 className="text-2xl font-bold mb-4">Add Cleaning Operation</h2>
                <div className="form-control w-full mb-6">
                    <label className="label"><span className="label-text">Operation Type</span></label>
                    <select className="select select-bordered" value={operationType} onChange={handleSelectChange}>
                        <option disabled value="">-- Choose an Operation --</option>
                        {Object.entries(groupedOps).map(([groupName, ops]) => (
                            <optgroup label={`${groupName} Features`} key={groupName}>
                                {ops.map(op => (
                                    <option key={op.key} value={op.key}>
                                        {op.name}
                                        {op.isPremium && userPlan === 'free' && ' ⭐'}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                {operationType ?
                    <DynamicOperationForm operationKey={operationType} headers={headers} onSave={handleSaveOperation} onCancel={closeModal} />
                    : <p className="text-center text-base-content/60 my-8">Please select an operation type to begin.</p>
                }
            </Modal>
        </div>
    );
};

export default OperationSelector;