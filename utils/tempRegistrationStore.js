// Temporary in-memory storage for pending registrations
// In production, consider using Redis or a database with TTL
const pendingRegistrations = new Map();

// Store registration data temporarily
function storePendingRegistration(email, data) {
    const key = email.toLowerCase();
    pendingRegistrations.set(key, {
        ...data,
        createdAt: Date.now()
    });
}

// Retrieve pending registration without deleting it
function getPendingRegistration(email) {
    const key = email.toLowerCase();
    return pendingRegistrations.get(key) || null;
}

// Delete pending registration
function deletePendingRegistration(email) {
    const key = email.toLowerCase();
    pendingRegistrations.delete(key);
}

// Clean up expired registrations (older than 15 minutes)
function cleanupExpiredRegistrations() {
    const now = Date.now();
    const expireTime = 15 * 60 * 1000; // 15 minutes
    
    for (const [key, data] of pendingRegistrations.entries()) {
        if (now - data.createdAt > expireTime) {
            pendingRegistrations.delete(key);
            console.log(`Cleaned up expired registration for: ${key}`);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredRegistrations, 5 * 60 * 1000);

module.exports = {
    storePendingRegistration,
    getPendingRegistration,
    deletePendingRegistration,
    cleanupExpiredRegistrations
};
