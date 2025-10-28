import nodemailer from 'nodemailer';
import config from '../config/index.js';

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: false, // true for 465, false for other ports (like 587)
        auth: {
            user: config.email.user,
            pass: config.email.pass,
        },
    });

    const mailOptions = {
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        html: options.html, // We will send HTML content
        text: options.text, // Plain text version for email clients that don't render HTML
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
        // In a production app, you might want to throw the error to be handled by a higher-level service
        throw new Error('Email could not be sent.');
    }
};

export default sendEmail;