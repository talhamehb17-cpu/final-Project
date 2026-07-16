const loginToggle = document.getElementById('loginToggle');
const signupToggle = document.getElementById('signupToggle');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginFormElement = document.getElementById('loginFormElement');
const signupFormElement = document.getElementById('signupFormElement');
const switchToSignupLinks = document.querySelectorAll('.switch-to-signup');
const switchToLoginLinks = document.querySelectorAll('.switch-to-login');
const togglePasswordButtons = document.querySelectorAll('.toggle-password');

const API_BASE = window.API_BASE_URL || 'https://final-project-production-13f4.up.railway.app/api';
const modalOtpInput = document.getElementById('modalOtpInput');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const signupLoading = document.getElementById('signupLoading');
const closeOtpModal = document.getElementById('closeOtpModal');

// Check URL for action parameter
const urlParams = new URLSearchParams(window.location.search);
const action = urlParams.get('action');

if (action === 'signup') showSignupForm();
else showLoginForm();

// Toggle forms
loginToggle.addEventListener('click', showLoginForm);
signupToggle.addEventListener('click', showSignupForm);
switchToSignupLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); showSignupForm(); }));
switchToLoginLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); showLoginForm(); }));

function showLoginForm() {
    loginToggle.classList.add('active');
    signupToggle.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    window.history.pushState({}, '', 'login.html');
    hideOtpModal(); // hide OTP modal when switching
}
function showSignupForm() {
    signupToggle.classList.add('active');
    loginToggle.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    window.history.pushState({}, '', 'login.html?action=signup');
    hideOtpModal(); // hide OTP modal when switching
}

// Toggle password visibility
togglePasswordButtons.forEach(button => {
    button.addEventListener('click', function() {
        const input = this.parentElement.querySelector('input');
        const icon = this.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

// ===== HELPERS =====
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function showFormError(formId, message) {
    const form = document.getElementById(formId + 'Element');
    const existingError = form.querySelector('.form-error');
    if (existingError) existingError.remove();
    const div = document.createElement('div');
    div.className = 'form-error';
    div.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
    div.style.cssText = `background-color:#ffebee;color:#c62828;padding:12px 15px;border-radius:5px;margin-bottom:20px;display:flex;align-items:center;gap:10px;font-size:0.9rem;`;
    form.insertBefore(div, form.firstChild);
    setTimeout(() => div.remove(), 5000);
}
function showFormSuccess(formId, message) {
    const form = document.getElementById(formId + 'Element');
    const existingMessage = form.querySelector('.form-success');
    if (existingMessage) existingMessage.remove();
    const div = document.createElement('div');
    div.className = 'form-success';
    div.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
    div.style.cssText = `background-color:#e8f5e9;color:#2e7d32;padding:12px 15px;border-radius:5px;margin-bottom:20px;display:flex;align-items:center;gap:10px;font-size:0.9rem;`;
    form.insertBefore(div, form.firstChild);
}

// ===== LOGIN =====
loginFormElement.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!validateEmail(email)) { showFormError('loginForm','Enter valid email'); return; }
    if (password.length<6){ showFormError('loginForm','Password must be 6+ chars'); return; }

    try {
        const res = await fetch(`${API_BASE}/auth/login`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({email,password})
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message||'Login failed');
        showFormSuccess('loginForm', data.message);
        localStorage.setItem('nighthowls_user', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('nighthowls_token', data.token);
        setTimeout(()=>window.location.href='index.html',2000);
    } catch(err){ showFormError('loginForm', err.message); }
});

// ===== SIGNUP =====
signupFormElement.addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const agreeTerms = document.getElementById('agreeTerms').checked;

    if(name.length<2){ showFormError('signupForm','Enter full name'); return; }
    if(!validateEmail(email)){ showFormError('signupForm','Enter valid email'); return; }
    if(password.length<6){ showFormError('signupForm','Password must be 6+ chars'); return; }
    if(password!==confirmPassword){ showFormError('signupForm','Passwords do not match'); return; }
    if(!agreeTerms){ showFormError('signupForm','You must agree to terms'); return; }

    try {
        // Show OTP modal immediately in sending/loading state
        showOtpModal(email, true);
        signupFormElement.querySelectorAll('input,button').forEach(el=>el.disabled=true);

        console.log('[Signup] Sending OTP request for:', email);

        const res = await fetch(`${API_BASE}/auth/signup`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({name,email,password})
        });
        const data = await res.json();
        
        console.log('[Signup] Response:', data);
        
        if(!res.ok) {
            console.error('[Signup] Error response:', data);
            throw new Error(data.message||'Signup failed');
        }

        // Transition OTP modal to active input state
        showOtpModal(email, false);
        showOtpModalSuccess('OTP sent to your email.');

    } catch(err){
        console.error('[Signup] Error:', err);
        // Hide the modal and display the error on the main signup form
        hideOtpModal();
        showFormError('signupForm', err.message);
    } finally{
        signupFormElement.querySelectorAll('input,button').forEach(el=>el.disabled=false);
    }
});

// ===== VERIFY OTP =====
verifyOtpBtn.addEventListener('click', async function(){
    const otp = modalOtpInput.value.trim();
    if(otp.length!==6){ showOtpModalError('Enter valid 6-digit OTP'); return; }

    try {
        // Disable verify button and show loading text
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

        const email = document.getElementById('signupEmail').value.trim();
        const name = document.getElementById('signupName').value.trim();
        const password = document.getElementById('signupPassword').value.trim();
        
        console.log('[Verify OTP] Verifying OTP for:', email);

        const res = await fetch(`${API_BASE}/auth/verify-otp`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({email, otp})
        });
        const data = await res.json();
        
        console.log('[Verify OTP] Response:', data);
        
        if(!res.ok) {
            console.error('[Verify OTP] Error response:', data);
            throw new Error(data.message||'OTP verification failed');
        }
        
        showOtpModalSuccess('OTP verified successfully!');
        
        // Auto-login to obtain token
        console.log('[Verify OTP] Auto-login for:', email);
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.message || 'Auto-login failed');

        localStorage.setItem('nighthowls_user', JSON.stringify(loginData.user || {name,email}));
        if (loginData.token) localStorage.setItem('nighthowls_token', loginData.token);

        // Update navbar immediately if loaded
        if (typeof window.updateNavbarUser === 'function') window.updateNavbarUser();

        setTimeout(()=> {
            hideOtpModal();
            window.location.href='index.html';
        }, 1200);
    } catch(err){
        console.error('[Verify OTP] Error:', err);
        showOtpModalError(err.message);
    } finally{
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify OTP';
    }
});

// ===== RESEND OTP =====
document.getElementById('resendOtpBtn').addEventListener('click', async function(){
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const resendBtn = document.getElementById('resendOtpBtn');

    try{
        // Disable button and show loading text
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resending...';
        verifyOtpBtn.disabled = true;

        console.log('[Resend OTP] Resending OTP for:', email);

        const res = await fetch(`${API_BASE}/auth/signup`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({name,email,password})
        });
        const data = await res.json();
        
        console.log('[Resend OTP] Response:', data);
        
        if(!res.ok) {
            console.error('[Resend OTP] Error response:', data);
            throw new Error(data.message||'Resend OTP failed');
        }
        
        showOtpModalSuccess('OTP resent to your email.');
        modalOtpInput.value='';
        modalOtpInput.focus();
    } catch(err){
        console.error('[Resend OTP] Error:', err);
        showOtpModalError(err.message);
    } finally{
        resendBtn.disabled = false;
        resendBtn.innerHTML = '<i class="fas fa-redo"></i> Resend OTP';
        verifyOtpBtn.disabled = false;
    }
});

// ===== OTP MODAL FUNCTIONS =====
function showOtpModal(email, isSending) {
    const modal = document.getElementById('otpModal');
    const modalEmail = document.getElementById('modalEmail');
    const sendingDiv = document.getElementById('otpModalSending');
    const formDiv = document.getElementById('otpModalForm');
    
    if (modal && modalEmail && sendingDiv && formDiv) {
        modalEmail.textContent = email;
        modal.style.display = 'flex'; // Centered modal overlay
        
        if (isSending) {
            sendingDiv.style.display = 'block';
            formDiv.style.display = 'none';
        } else {
            sendingDiv.style.display = 'none';
            formDiv.style.display = 'block';
            modalOtpInput.value = '';
            setTimeout(() => {
                modalOtpInput.focus();
            }, 100);
        }
    }
}

function hideOtpModal() {
    const modal = document.getElementById('otpModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showOtpModalError(message) {
    const errorDiv = document.getElementById('otpModalError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function showOtpModalSuccess(message) {
    const successDiv = document.getElementById('otpModalSuccess');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }
}

// Close button event listener
if (closeOtpModal) {
    closeOtpModal.addEventListener('click', function() {
        hideOtpModal();
    });
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('otpModal');
    if (modal && e.target === modal) {
        hideOtpModal();
    }
});

// Close modal with escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideOtpModal();
    }
});
