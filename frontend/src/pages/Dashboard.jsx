import { useEffect, useReducer, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import Papa from 'papaparse';
import axios from 'axios';

import UserStatusBanner from '../components/dashboard/UserStatusBanner';
import FileDropzone from '../components/jobs/FileDropzone';
import ControlPanel from '../components/jobs/ControlPanel';
import MainContent from '../components/jobs/MainContent';
import JobProcessingModal from '../components/jobs/JobProcessingModal';
import ValidationReport from '../components/jobs/ValidationReport';
import Spinner from '../components/common/Spinner';

import { analyzeData } from '../utils/analyzer';
import { runEngine, cleanHeaders } from '@cleaning-engine/browser.js';

const initialState = {
    step: 'idle',
    selectedFile: null,
    operations: [],
    originalPreview: { data: [], headers: [] },
    analysisReport: [],
    headerStatus: null,
    parsingErrors: [],
    parsingProgress: 0,
    isSubmitting: false,
    submissionStatus: '',
    activeJobId: null,
    userPlan: 'free'
};

// --- THE REDUCER ---
function dashboardReducer(state, action) {
    // Helper for robust duplicate checking (ignores 'id')
    const isSameOperation = (opA, opB) => {
        if (!opA || !opB) return false;
        return opA.type === opB.type && JSON.stringify(opA.params) === JSON.stringify(opB.params);
    };

    switch (action.type) {
        case 'START_PARSE':
            return { ...initialState, userPlan: state.userPlan, step: 'parsing', selectedFile: action.payload.file };
        case 'SET_PARSING_PROGRESS':
            return { ...state, parsingProgress: action.payload.progress };
        case 'ANALYSIS_COMPLETE':
            return {
                ...state,
                step: 'cleaning',
                originalPreview: { data: action.payload.previewData, headers: action.payload.headers },
                analysisReport: action.payload.analysisReport,
                headerStatus: action.payload.headerStatus,
                parsingErrors: [],
                operations: [] // RESET to empty, no auto-apply
            };
        case 'STRUCTURAL_ERROR':
            return { ...state, step: 'structural_error', parsingErrors: action.payload.errors };
        
        // Correctly handles a SINGLE operation object
        case 'ADD_OPERATION': {
            const newOperation = action.payload.operation;
            
            // Ensure the operation has a unique ID
            if (!newOperation.id) {
                newOperation.id = Date.now() + Math.random();
            }
            
            const opExists = state.operations.some(existingOp => isSameOperation(existingOp, newOperation));
            if (opExists) {
                toast.error("This operation has already been applied.");
                return state;
            }
            return { ...state, operations: [...state.operations, newOperation] };
        };
        
        // Correctly handles an ARRAY of operation objects
        case 'APPLY_RECIPE': {
            const newOps = action.payload.operations.filter(newOp => !state.operations.some(existingOp => isSameOperation(existingOp, newOp)));
            if (newOps.length === 0) {
                toast.success("All recommended operations have already been applied.");
                return state;
            }
            const combinedOps = [...state.operations, ...newOps.map(op => ({ ...op, id: Date.now() + Math.random() }))];
            return { ...state, operations: combinedOps };
        }

        case 'REMOVE_OPERATION':
            return { ...state, operations: state.operations.filter(op => op.id !== action.payload.opId) };
        case 'START_SUBMIT':
            return { ...state, isSubmitting: true, submissionStatus: 'initiating' };
        case 'SET_UPLOAD_STATUS':
            return { ...state, submissionStatus: action.payload.status };
        case 'SUBMIT_SUCCESS':
            toast.success(action.payload.message);
            return { ...state, isSubmitting: false, submissionStatus: '', activeJobId: action.payload.jobId };
        case 'SUBMIT_ERROR':
            toast.error(action.payload.message);
            return { ...state, isSubmitting: false, submissionStatus: '' };
        case 'CLOSE_MODAL_AND_RESET':
            return { ...initialState, userPlan: state.userPlan };
        case 'SET_USER_PLAN':
            return { ...state, userPlan: action.payload.plan };
        default:
            return state;
    }
}

const Dashboard = () => {
    const [state, dispatch] = useReducer(dashboardReducer, initialState);
    const { step, selectedFile, operations, originalPreview, analysisReport, headerStatus, isSubmitting, submissionStatus, activeJobId, userPlan, parsingErrors, parsingProgress } = state;

    useEffect(() => {
        api.get('/auth/me').then(res => {
            if (res.data.success) dispatch({ type: 'SET_USER_PLAN', payload: { plan: res.data.data.plan } });
        }).catch(err => console.error("Could not fetch user plan", err));
    }, []);

    const processedPreview = useMemo(() => runEngine(originalPreview, operations), [originalPreview, operations]);
    
    // --- ALL FUNCTIONS PASSED AS PROPS ARE WRAPPED IN useCallback ---
    const handleFileSelect = useCallback((file) => {
        if (!file) return;
        dispatch({ type: 'START_PARSE', payload: { file } });
        
        const previewData = [], analysisData = [];
        const errors = [];
        let rowCount = 0, originalHeaders = [], finalHeaders = [], headerStatusObj = null;
        
        Papa.parse(file, {
            stream: true, 
            header: false, 
            skipEmptyLines: true,
            step: (results) => {
                if (rowCount === 0) {
                    originalHeaders = results.data;
                    finalHeaders = cleanHeaders(originalHeaders);
                    const headersWereFixed = JSON.stringify(originalHeaders) !== JSON.stringify(finalHeaders);
                    headerStatusObj = { 
                        status: headersWereFixed ? 'fixed' : 'ok', 
                        message: headersWereFixed ? 
                            'We detected and fixed issues like duplicates, empty values, or messy formatting in your column headers.' : 
                            'Your column headers are clean and well-formatted.' 
                    };
                } else {
                    if (results.errors.length > 0) errors.push(...results.errors);
                    const rowData = finalHeaders.reduce((obj, header, index) => { 
                        obj[header] = results.data[index] ?? ''; 
                        return obj; 
                    }, {});
                    if (rowCount < 101) previewData.push(rowData);
                    if (rowCount < 1001) analysisData.push(rowData);
                }
                rowCount++;
            },
            error: (error) => { 
                toast.error(`Critical parsing error: ${error.message}`); 
                dispatch({ type: 'CLOSE_MODAL_AND_RESET' }); 
            },
            complete: () => {
                // Set to 100% when complete
                dispatch({ type: 'SET_PARSING_PROGRESS', payload: { progress: 100 } });
                
                if (errors.length > 0) {
                    dispatch({ type: 'STRUCTURAL_ERROR', payload: { errors } });
                } else {
                    const analysisReport = analyzeData(analysisData, finalHeaders, userPlan);
                    dispatch({ 
                        type: 'ANALYSIS_COMPLETE', 
                        payload: { 
                            previewData, 
                            headers: finalHeaders, 
                            analysisReport, 
                            headerStatus: headerStatusObj 
                        } 
                    });
                }
            },
        });
    }, [userPlan]);

    const handleProcessFile = useCallback(async () => {
        if (!selectedFile || operations.length === 0) {
            if (!isAutoProcess) {
                toast.error("Please upload a file and add at least one operation.");
            }
            return;
        }
        dispatch({ type: 'START_SUBMIT' });
        try {
            const { data: { data: { url, fields, key } } } = await api.post('/jobs/initiate-upload', { filename: selectedFile.name, contentType: selectedFile.type || 'text/csv' });
            const s3FormData = new FormData();
            Object.entries(fields).forEach(([field, value]) => s3FormData.append(field, value));
            s3FormData.append('file', selectedFile);
            await axios.post(url, s3FormData);
            const { data: createJobData } = await api.post('/jobs/create', { s3Key: key, originalFileName: selectedFile.name, fileSize: selectedFile.size, operations: operations });
            dispatch({ type: 'SUBMIT_SUCCESS', payload: { message: createJobData.message, jobId: createJobData.jobId } });
        } catch (error) {
            dispatch({ type: 'SUBMIT_ERROR', payload: { message: error.response?.data?.message || "An unexpected error occurred." } });
        }
    }, [selectedFile, operations]);

    const addOperation = useCallback((op) => dispatch({ type: 'ADD_OPERATION', payload: { operation: op } }), []);
    const removeOperation = useCallback((id) => dispatch({ type: 'REMOVE_OPERATION', payload: { opId: id } }), []);
    const resetState = useCallback(() => dispatch({ type: 'CLOSE_MODAL_AND_RESET' }), []);
    
    const applyAllSuggestions = useCallback((suggestions) => {
        console.log('Applying suggestions:', suggestions);
        let appliedCount = 0;
        
        suggestions.forEach(suggestion => {
            if (suggestion.operation) {
                dispatch({ type: 'ADD_OPERATION', payload: { operation: suggestion.operation } });
                appliedCount++;
            }
        });
        
        console.log(`Applied ${appliedCount} operations`);
        toast.success(`Applied ${appliedCount} suggestions`);
    }, []);
    
    const onAcknowledgeErrors = useCallback(() => {
        Papa.parse(selectedFile, { header: true, preview: 100, skipEmptyLines: true, complete: (results) => {
            dispatch({ type: 'ANALYSIS_COMPLETE', payload: { previewData: results.data, analysisData: results.data, headers: results.meta.fields || [], headerStatus: null } });
        }});
    }, [selectedFile]);

    const renderContent = () => {
        switch (step) {
            case 'parsing': return ( 
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body items-center p-8">
                        <h2 className="card-title text-xl mb-4">Analyzing File...</h2>
                        <span className="loading loading-spinner loading-lg"></span>
                        <p className="text-sm mt-2">Scanning your data for cleaning opportunities</p>
                    </div>
                </div> 
            );
            case 'structural_error': return <ValidationReport errors={parsingErrors} onAcknowledge={onAcknowledgeErrors} onCancel={resetState} />;
            case 'cleaning': return (
                <div className="lg:flex lg:gap-8 h-full min-h-0 lg:items-start">
                    <aside className="lg:w-2/5 xl:w-1/3 flex-shrink-0 mb-8 lg:mb-0"><div className="bg-base-100 rounded-box shadow-lg p-6 h-full overflow-y-auto"><ControlPanel selectedFile={selectedFile} operations={operations} addOperation={addOperation} removeOperation={removeOperation} headers={originalPreview.headers} isProcessing={isSubmitting} resetState={resetState} /></div></aside>
                    <main className="lg:w-3/5 xl:w-2/3 flex-grow flex flex-col gap-8 min-h-0"><MainContent analysisReport={analysisReport} headerStatus={headerStatus} applyOperation={addOperation} onApplyAll={applyAllSuggestions} processedPreview={processedPreview} onProcessFile={handleProcessFile} isProcessing={isSubmitting} /></main>
                </div>
            );
            default: return ( <div className="card bg-base-100 shadow-xl"><div className="card-body"><h2 className="card-title text-2xl">Start a New Job</h2><p>Upload a CSV file...</p><div className="mt-4"><FileDropzone onFileSelect={handleFileSelect} isProcessing={isSubmitting} selectedFile={null} /></div></div></div> );
        }
    };

    return (
        <>
            <JobProcessingModal isOpen={!!activeJobId} jobId={activeJobId} onClose={resetState} initialPreviewData={processedPreview} />
            <div className="flex flex-col h-full gap-8">
                <div className="flex-shrink-0"><UserStatusBanner /></div>
                <div className="flex-grow min-h-0">{renderContent()}</div>
            </div>
        </>
    );
};

export default Dashboard;