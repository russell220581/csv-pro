import { FaFileUpload } from 'react-icons/fa';

const FileDropzone = ({ onFileSelect, isProcessing, selectedFile }) => {
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="relative p-6 border-2 border-dashed rounded-lg text-center bg-base-100 hover:border-primary transition-colors duration-200">
            <input 
                id="fileInput"
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                accept=".csv,text/csv" 
                onChange={handleFileChange} 
                disabled={isProcessing}
            />
            <div className="flex flex-col items-center justify-center gap-2">
                <FaFileUpload className="text-4xl text-neutral-400" />
                {selectedFile ? (
                    <div>
                        <p>Selected file:</p>
                        <strong className="break-all">{selectedFile.name}</strong>
                    </div>
                ) : (
                    <p>Click or drag & drop a CSV file here</p>
                )}
            </div>
        </div>
    );
};

export default FileDropzone;