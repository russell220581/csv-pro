import { FaFileCsv } from 'react-icons/fa';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="footer footer-center p-10 bg-base-100 text-base-content rounded-t-box">
            <div>
                <FaFileCsv className="text-4xl" />
                <p className="font-bold text-lg">
                    CSV Pro <br />
                    <span className="font-normal">The Effortless CSV Toolkit</span>
                </p>
                <p>Copyright © {currentYear} - All Rights Reserved</p>
            </div>
        </footer>
    );
};

export default Footer;