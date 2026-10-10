class LoginPage {
    constructor() {
        this.resetEmail = '';
        document.getElementById('loginForm').addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            if (email === 'open@admin') { this.openAdminPasscode(); return; }
            this.loginUser();
        });
    }

    togglePassword() {
        this._toggleEye('password', 'eyeIcon');
    }

    newPassToggle() {
        this._toggleEye('newPassword', 'newPassEyeIcon');
    }

    ConfirmNewPassToggle() {
        this._toggleEye('confirmNewPassword', 'ConfirmNewPassEyeIcon');
    }

    _toggleEye(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon  = document.getElementById(iconId);
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        icon.classList.toggle('fa-eye', !isHidden);
        icon.classList.toggle('fa-eye-slash', isHidden);
    }

    async loginUser() {
        const email    = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            return Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please enter email and password' });
        }

        try {
            const res = await fetch('/teacher/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('teacher', JSON.stringify(data));
                await Swal.fire({ icon: 'success', title: 'Login Successful', text: 'Welcome to SmartAttend!', timer: 2000, showConfirmButton: false, allowOutsideClick: false });
                window.location.href = 'TeacherDashboard.html';
                document.getElementById('loginForm').reset();
            } else {
                if (res.status === 403) return Swal.fire({ icon: 'error', title: 'Account Banned', text: 'Your account has been banned. Please contact the administrator.', confirmButtonColor: '#0F6577' });
                Swal.fire({ icon: 'error', title: 'Login Failed', text: await res.text() });
            }
        } catch (err) {
            console.error('Login Failed', err);
            Swal.fire({ icon: 'error', title: 'Server Error', text: 'Unable to connect to server' });
        }
    }

    openForgotModal()  { document.getElementById('forgotModal').style.display = 'block'; }
    closeForgotModal() { document.getElementById('forgotModal').style.display = 'none'; }
    closechangeForgotModal() { document.getElementById('changePasswordModal').style.display = 'none'; }

    async forgotPassword() {
        const email = document.getElementById('ForgotEmail').value;
        if (!email) return Swal.fire({ icon: 'warning', title: 'Enter Email', text: 'Please enter email' });

        Swal.fire({ title: 'Sending OTP...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const res  = await fetch('/teacher/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
            const data = await res.text();
            Swal.close();

            if (!res.ok) return Swal.fire({ icon: 'error', title: 'Failed to access token', text: data });

            this.resetEmail = email;
            document.getElementById('forgotModal').style.display = 'none';
            document.getElementById('emailForm').reset();

            const otpResult = await Swal.fire({
                title: '<i class="fa-solid fa-envelope" style="color:#0F6577"></i> Verify Your Identity',
                html: `<p style="font-size:13px;color:#64748b;margin:0 0 16px">${data}</p>
                       <input id="swal-otp" class="swal2-input" placeholder="Enter 6-digit OTP" maxlength="6" style="letter-spacing:6px;font-size:18px;text-align:center">`,
                showCancelButton: true, confirmButtonText: 'Verify', confirmButtonColor: '#0F6577', focusConfirm: false,
                preConfirm: () => {
                    const val = document.getElementById('swal-otp').value.trim();
                    if (!val || val.length !== 6) { Swal.showValidationMessage('Please enter the 6-digit OTP'); return false; }
                    return val;
                }
            });

            if (!otpResult.isConfirmed) return;

            const verifyRes  = await fetch('/teacher/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: this.resetEmail, otp: otpResult.value }) });
            const verifyData = await verifyRes.text();

            if (!verifyRes.ok) return Swal.fire({ icon: 'error', title: 'Verify OTP', text: verifyData });

            await Swal.fire({ icon: 'success', title: 'OTP Verified', text: verifyData, timer: 2000, showConfirmButton: false });
            document.getElementById('changePasswordModal').style.display = 'block';
        } catch (err) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Server Error', text: 'Unable to connect to server' });
        }
    }

    async submitNewPassword() {
        const password        = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (!password) return Swal.fire({ icon: 'warning', title: 'Enter New Password', text: 'Please enter new password' });
        if (confirmPassword !== password) return Swal.fire({ icon: 'error', title: 'Invalid Password', text: 'Passwords do not match' });

        try {
            const res  = await fetch('/teacher/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: this.resetEmail, password }) });
            const data = await res.text();

            if (!res.ok) return Swal.fire({ icon: 'error', title: 'Error Encountered', text: data });

            await Swal.fire({ icon: 'success', title: 'Password reset successful', text: data, timer: 2000, showConfirmButton: false });
            document.getElementById('changePasswordModal').style.display = 'none';
            document.getElementById('newPasswordForm').reset();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Server Error', text: 'Unable to connect to server' });
        }
    }

    openAdminPasscode() {
        Swal.fire({
            title: '<i class="fa-solid fa-shield-halved" style="color:#0F6577"></i> Admin Access',
            input: 'password', inputPlaceholder: 'Enter passcode', inputAttributes: { autocomplete: 'off' },
            showCancelButton: true, confirmButtonText: 'Enter', confirmButtonColor: '#0F6577', cancelButtonColor: '#aaa',
            inputValidator: v => { if (!v) return 'Please enter the passcode'; }
        }).then(result => {
            if (!result.isConfirmed) return;
            if (result.value === 'smartattend@admin') {
                sessionStorage.setItem('adminGate', 'granted');
                window.location.href = '/body/adminLogin.html';
            } else {
                Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Incorrect passcode.', timer: 1800, showConfirmButton: false });
            }
        });
    }
}

const loginPage = new LoginPage();

// Global wrappers for HTML onclick attributes
function togglePassword()          { loginPage.togglePassword(); }
function newPassToggle()           { loginPage.newPassToggle(); }
function ConfirmNewPassToggle()    { loginPage.ConfirmNewPassToggle(); }
function openForgotModal()         { loginPage.openForgotModal(); }
function closeForgotModal()        { loginPage.closeForgotModal(); }
function closechangeForgotModal()  { loginPage.closechangeForgotModal(); }
function forgotPassword()          { loginPage.forgotPassword(); }
function submitNewPassword()       { loginPage.submitNewPassword(); }
