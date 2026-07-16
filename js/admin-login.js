const adminLoginForm = document.getElementById('adminLoginForm');
const adminEmail = document.getElementById('adminEmail');
const adminPassword = document.getElementById('adminPassword');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLoginError = document.getElementById('adminLoginError');
const toggleAdminPassword = document.getElementById('toggleAdminPassword');
const rememberAdmin = document.getElementById('rememberAdmin');

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('nighthowls_admin_token');
    if (token) {
        // Verify token
       fetch('https://final-project-production-13f4.up.railway.app/api/admin/verify', {
       headers: {
        'Authorization': `Bearer ${token}`
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.admin) {
                window.location.href = 'admin-dashboard.html';
            }
        })
        .catch(() => {
            localStorage.removeItem('nighthowls_admin_token');
        });
    }
    
    // Auto-fill email if remembered
    const rememberedEmail = localStorage.getItem('nighthowls_admin_email');
    if (rememberedEmail) {
        adminEmail.value = rememberedEmail;
        rememberAdmin.checked = true;
    }
});

// Toggle password visibility
toggleAdminPassword.addEventListener('click', () => {
    const type = adminPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    adminPassword.setAttribute('type', type);
    toggleAdminPassword.querySelector('i').classList.toggle('fa-eye');
    toggleAdminPassword.querySelector('i').classList.toggle('fa-eye-slash');
});

// Handle login
adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    adminLoginBtn.disabled = true;
    adminLoginBtn.querySelector('.btn-text').style.display = 'none';
    adminLoginBtn.querySelector('.btn-loading').style.display = 'inline';
    adminLoginError.style.display = 'none';
    
try {
    const response = await fetch('https://final-project-production-13f4.up.railway.app/api/admin/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: adminEmail.value,
            password: adminPassword.value
        })
    });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        // Store token
        localStorage.setItem('nighthowls_admin_token', data.token);
        localStorage.setItem('nighthowls_admin_id', data.admin.id);
        localStorage.setItem('nighthowls_admin_name', data.admin.name);
        localStorage.setItem('nighthowls_admin_email', data.admin.email);
        
        // Remember email if checked
        if (rememberAdmin.checked) {
            localStorage.setItem('nighthowls_admin_email', adminEmail.value);
        } else {
            localStorage.removeItem('nighthowls_admin_email');
        }
        
        // Show success notification
        showNotification('Login successful! Redirecting...', 'success', 1500);
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 1500);
        
    } catch (error) {
        showNotification(error.message, 'error', 5000);
        
        // Reset button state
        adminLoginBtn.disabled = false;
        adminLoginBtn.querySelector('.btn-text').style.display = 'inline';
        adminLoginBtn.querySelector('.btn-loading').style.display = 'none';
    }
});
