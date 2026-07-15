// Input sanitization utilities

function sanitizeString(input, maxLength = 1000) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, maxLength);
}

function sanitizeEmail(email) {
    if (typeof email !== 'string') return '';
    const sanitized = email.trim().toLowerCase();
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : '';
}

function sanitizeNumber(input, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const num = Number(input);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
}

function sanitizeId(input) {
    const id = String(input).trim();
    // Allow alphanumeric, hyphens, underscores
    return id.replace(/[^a-zA-Z0-9-_]/g, '');
}

function sanitizeHtml(input) {
    if (typeof input !== 'string') return '';
    // Remove HTML tags to prevent XSS
    return input.replace(/<[^>]*>/g, '').trim();
}

function sanitizeName(input) {
    if (typeof input !== 'string') return '';
    // Allow letters, spaces, hyphens, apostrophes
    return input.trim().replace(/[^a-zA-Z\s\-']/g, '');
}

function sanitizePhone(input) {
    if (typeof input !== 'string') return '';
    // Allow digits, spaces, +, -, (, )
    return input.trim().replace(/[^0-9\s\+\-\(\)]/g, '');
}

function sanitizeAddress(input) {
    if (typeof input !== 'string') return '';
    // Allow letters, digits, spaces, commas, periods, hyphens, #, /
    return input.trim().replace(/[^a-zA-Z0-9\s,\.\-#/]/g, '');
}

module.exports = {
    sanitizeString,
    sanitizeEmail,
    sanitizeNumber,
    sanitizeId,
    sanitizeHtml,
    sanitizeName,
    sanitizePhone,
    sanitizeAddress
};
