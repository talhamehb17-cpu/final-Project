// Admin Utilities - Shared functions for all admin pages

/**
 * Show a notification/toast message
 * @param {string} message - The message to display
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - How long to show (ms), 0 = permanent
 */
function showNotification(message, type = 'info', duration = 4000) {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
        font-size: 14px;
        word-wrap: break-word;
    `;

    // Add icon based on type
    const icon = document.createElement('i');
    icon.className = `fas ${getNotificationIcon(type)}`;
    icon.style.cssText = 'flex-shrink: 0;';

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
        flex-shrink: 0;
    `;
    closeBtn.onclick = () => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    };

    // Add text
    const text = document.createElement('span');
    text.textContent = message;

    notification.appendChild(icon);
    notification.appendChild(text);
    notification.appendChild(closeBtn);
    container.appendChild(notification);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    return notification;
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-warning',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

/**
 * Show loading state on a button
 */
function setButtonLoading(button, isLoading = true) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || 'Save';
    }
}

/**
 * Add CSS animations for notifications
 */
function injectNotificationStyles() {
    if (document.getElementById('notificationStyles')) return;

    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }

        .notification {
            position: relative;
        }

        @media (max-width: 768px) {
            #notificationContainer {
                left: 20px !important;
                right: 20px !important;
                max-width: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize styles when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNotificationStyles);
} else {
    injectNotificationStyles();
}

/**
 * Show a loading overlay
 */
function showLoadingOverlay(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9998;
        `;
        document.body.appendChild(overlay);
    }

    const spinner = document.querySelector('.loading-spinner') || document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    `;
    spinner.innerHTML = `
        <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #6366f1; margin-bottom: 12px; display: block;"></i>
        <div style="color: #374151; font-size: 14px;">${message}</div>
    `;

    if (!overlay.querySelector('.loading-spinner')) {
        overlay.appendChild(spinner);
    }
    overlay.style.display = 'flex';

    return overlay;
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Confirm dialog
 */
function showConfirmDialog(message, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    content.innerHTML = `
        <div style="margin-bottom: 24px; color: #374151; font-size: 16px;">${message}</div>
        <div style="display: flex; gap: 12px;">
            <button class="btn-secondary" style="flex: 1;">Cancel</button>
            <button class="btn-danger" style="flex: 1;">Confirm</button>
        </div>
    `;

    const cancelBtn = content.querySelector('.btn-secondary');
    const confirmBtn = content.querySelector('.btn-danger');

    cancelBtn.addEventListener('click', () => {
        dialog.remove();
        onCancel && onCancel();
    });

    confirmBtn.addEventListener('click', () => {
        dialog.remove();
        onConfirm && onConfirm();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
            onCancel && onCancel();
        }
    });

    dialog.appendChild(content);
    document.body.appendChild(dialog);

    return dialog;
}
