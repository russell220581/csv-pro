import { useState } from 'react';
import Modal from 'react-modal';
import toast from 'react-hot-toast';
import api from '../../api';
import { FaCommentDots, FaPaperPlane, FaTimes, FaCheckCircle } from 'react-icons/fa';

const FeedbackWidget = () => {
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [formData, setFormData] = useState({ category: 'general_question', message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const openModal = () => setModalIsOpen(true);
    const closeModal = () => {
        setModalIsOpen(false);
        // Reset form state after a short delay to allow for closing animation
        setTimeout(() => {
            setIsSuccess(false);
            setFormData({ category: 'general_question', message: '' });
        }, 300);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.message.trim()) {
            return toast.error("Please enter a message.");
        }
        setIsLoading(true);
        try {
            const { data } = await api.post('/feedback', formData);
            if (data.success) {
                setIsSuccess(true); // Show the success message
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send feedback.");
        } finally {
            setIsLoading(false);
        }
    };

    const modalStyles = {
        content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', border: 'none', padding: '0', borderRadius: '1rem', width: '90%', maxWidth: '500px', backgroundColor: 'transparent' },
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, backdropFilter: 'blur(4px)' }
    };

    return (
        <>
            {/* The Floating Button */}
            <button
                onClick={openModal}
                className="btn btn-primary btn-circle fixed bottom-6 right-6 shadow-lg animate-bounce hover:animate-none"
                aria-label="Open feedback form"
            >
                <FaCommentDots size={24} />
            </button>

            {/* The Modal */}
            <Modal isOpen={modalIsOpen} onRequestClose={closeModal} style={modalStyles} contentLabel="Feedback Form">
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><FaTimes /></button>
                        
                        {isSuccess ? (
                            <div className="text-center p-8">
                                <FaCheckCircle className="text-6xl text-success mx-auto mb-4" />
                                <h2 className="text-2xl font-bold">Thank You!</h2>
                                <p className="mt-2">Your feedback has been received.</p>
                                <button onClick={closeModal} className="btn btn-primary mt-6">Close</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <h2 className="card-title text-2xl mb-4">Send us your Feedback</h2>
                                <p className="text-sm mb-4 text-base-content/70">
                                    Encountered a bug? Have a feature idea? We'd love to hear from you.
                                </p>
                                <div className="form-control w-full">
                                    <label className="label block"><span className="label-text">How can we help?</span></label>
                                    <select name="category" value={formData.category} onChange={handleChange} className="select select-bordered w-full">
                                        <option value="general_question">General Question</option>
                                        <option value="bug_report">I'm reporting a bug</option>
                                        <option value="feature_request">I have a feature request</option>
                                    </select>
                                </div>
                                <div className="form-control w-full mt-4">
                                    <label className="label block"><span className="label-text">Your Message</span></label>
                                    <textarea
                                        name="message"
                                        className="textarea textarea-bordered h-24 w-full"
                                        placeholder="Please be as detailed as possible..."
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                    ></textarea>
                                </div>
                                <div className="card-actions justify-end mt-6">
                                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                        {isLoading ? <span className="loading loading-spinner"></span> : <FaPaperPlane />}
                                        Send Feedback
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default FeedbackWidget;