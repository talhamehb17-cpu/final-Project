const { Resend } = require("resend");

if (!process.env.RESEND_API_KEY) {
    console.warn("[Email Service] WARNING: RESEND_API_KEY is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend API
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.from - Sender email (must be verified in Resend)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content (fallback)
 * @param {Array} [options.attachments] - Array of attachments
 * @returns {Promise<Object>} Resend API response
 */
async function sendEmail({ to, from, subject, html, text, attachments = [] }) {
    try {
        // Build email data
        const emailData = {
            from: from || 'onboarding@resend.dev',
            to: Array.isArray(to) ? to : [to],
            subject,
            ...(html && { html }),
            ...(text && !html && { text }),
        };

        // Resend doesn't support attachments in the same way as Nodemailer
        // For attachments, we'll need to handle them differently or use a different approach
        // For now, we'll log a warning if attachments are provided
        if (attachments.length > 0) {
            console.warn('[Email Service] Attachments are not supported in current Resend implementation');
        }

        console.log(`[Email Service] Sending email to: ${Array.isArray(to) ? to.join(', ') : to}`);
        
   const response = await resend.emails.send(emailData);

console.log("FULL RESPONSE:", JSON.stringify(response, null, 2));

if (response.error) {
    console.error("STATUS:", response.error.statusCode);
    console.error("NAME:", response.error.name);
    console.error("MESSAGE:", response.error.message);
    console.error("ERROR:", JSON.stringify(response.error, null, 2));
    throw new Error(response.error.message);
}

return response;
    } catch (error) {
        console.error('[Email Service] Email send failed:', error);
        throw error;
    }
}

/**
 * Verify Resend API is working
 */
async function verifyConnection() {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.log('[Email Service] RESEND_API_KEY not set, skipping verification');
            return false;
        }
        // Resend doesn't have a direct verify method, so we'll just log that the key is set
        console.log('[Email Service] RESEND_API_KEY is configured');
        return true;
    } catch (error) {
        console.error('[Email Service] Verification failed:', error);
        return false;
    }
}

// Verify connection on startup
verifyConnection();

module.exports = {
    sendEmail,
    verifyConnection
};
