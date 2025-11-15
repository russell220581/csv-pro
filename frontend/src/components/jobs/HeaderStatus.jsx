import { FaCheckCircle, FaWrench } from 'react-icons/fa';

// The component now accepts simpler props: status and message.
const HeaderStatus = ({ status, message }) => {
    // If there's no status to show, render nothing.
    if (!status) {
        return null;
    }

    // Determine the style based on the status prop.
    const isFixed = status === 'fixed';
    const alertClass = isFixed ? 'alert-info' : 'alert-success';
    const IconComponent = isFixed ? FaWrench : FaCheckCircle;

    return (
        // It still spans the full width of the parent grid.
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className={`alert ${alertClass} shadow-md`}>
                <IconComponent />
                <div>
                    <h3 className="font-bold">{isFixed ? 'Headers Auto-Corrected' : 'Headers Look Good!'}</h3>
                    <p className="text-sm">{message}</p>
                </div>
            </div>
        </div>
    );
};

export default HeaderStatus;