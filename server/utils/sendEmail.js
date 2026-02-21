const { Resend } = require("resend");

/**
 * Send an email using the Resend API
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async (options) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
    });
};

module.exports = sendEmail;
