// Admin action logging middleware

function logAdminAction(action, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        action,
        ...details
    };
    
    // In production, this should go to a proper logging system
    // For now, console log with admin prefix
    console.log('[ADMIN ACTION]', JSON.stringify(logEntry));
    
    // TODO: Store in database for audit trail
    // Could create an admin_logs table in PostgreSQL
}

const adminActionLogger = (action) => {
    return (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logAdminAction(action, {
                    adminId: req.admin?.id,
                    adminEmail: req.admin?.email,
                    method: req.method,
                    path: req.path,
                    params: req.params,
                    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
                });
            }
            originalSend.call(this, data);
        };
        
        next();
    };
};

module.exports = {
    logAdminAction,
    adminActionLogger
};
