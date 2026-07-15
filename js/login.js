const loginToggle = document.getElementById('loginToggle');
const signupToggle = document.getElementById('signupToggle');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginFormElement = document.getElementById('loginFormElement');
const signupFormElement = document.getElementById('signupFormElement');
const switchToSignupLinks = document.querySelectorAll('.switch-to-signup');
const switchToLoginLinks = document.querySelectorAll('.switch-to-login');
const togglePasswordButtons = document.querySelectorAll('.toggle-password');

const otpGroup = document.getElementById('otpGroup');
const signupOTP = document.getElementById('signupOTP');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const signupLoading = document.getElementById('signupLoading');

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
    otpGroup.style.display = 'none'; // hide OTP when switching
}
function showSignupForm() {
    signupToggle.classList.add('active');
    loginToggle.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    window.history.pushState({}, '', 'login.html?action=signup');
    otpGroup.style.display = 'none';
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
        const res = await fetch('http://localhost:5000/api/auth/login',{
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
        // Show loading
        signupLoading.style.display='block';
        signupFormElement.querySelectorAll('input,button').forEach(el=>el.disabled=true);

        const res = await fetch('http://localhost:5000/api/auth/signup',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({name,email,password})
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message||'Signup failed');

        showFormSuccess('signupForm','OTP sent to your email.');
        otpGroup.style.display='block';
        signupOTP.value='';
        signupOTP.focus();

    } catch(err){
        showFormError('signupForm', err.message);
    } finally{
        signupFormElement.querySelectorAll('input,button').forEach(el=>el.disabled=false);
        signupLoading.style.display='none';
    }
});

// ===== VERIFY OTP =====
verifyOtpBtn.addEventListener('click', async function(){
    const otp = signupOTP.value.trim();
    if(otp.length!==6){ showFormError('signupForm','Enter valid 6-digit OTP'); return; }

    try {
        signupLoading.style.display='block';
        signupFormElement.querySelectorAll('input,button').forEach(el=>el.disabled=true);

        const email = document.getElementById('signupEmail').value.trim();
        const name = document.getElementById('signupName').value.trim();
        const password = document.getElementById('signupPassword').value.trim();
        const res = await fetch('http://localhost:5000/api/auth/verify-otp',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({email, otp})
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message||'OTP verification failed');
        showFormSuccess('signupForm', data.message);
        // auto-login to get JWT so protected pages work
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.message || 'Auto-login failed');

        localStorage.setItem('nighthowls_user', JSON.stringify(loginData.user || {name,email}));
        if (loginData.token) localStorage.setItem('nighthowls_token', loginData.token);

        // update navbar immediately if loaded
        if (typeof window.updateNavbarUser === 'function') window.updateNavbarUser();

        setTimeout(()=>window.location.href='index.html',800);
    } catch(err){
        showFormError('signupForm', err.message);
    } finally{
        signupFormElement.querySelectorAll('input,button').forEach(el=>el.disabled=false);
        signupLoading.style.display='none';
    }
});

// ===== RESEND OTP =====
document.getElementById('resendOtpBtn').addEventListener('click', async function(){
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();

    try{
        signupLoading.style.display='block';
        signupFormElement.querySelectorAll('input,button').forEach(el=>el.disabled=true);

        const res = await fetch('http://localhost:5000/api/auth/signup',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({name,email,password})
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message||'Resend OTP failed');
        showFormSuccess('signupForm','OTP resent to your email.');
        signupOTP.value='';
        signupOTP.focus();
    } catch(err){
        showFormError('signupForm', err.message);
    } finally{
        signupFormElement.querySelectorAll('input,button').forEach(el=>el.disabled=false);
        signupLoading.style.display='none';
    }
});
