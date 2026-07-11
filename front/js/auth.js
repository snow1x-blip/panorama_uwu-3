const API_BASE = 'https://81.26.189.36:8000';

function getToken() {
    return localStorage.getItem('access_token');
}

function setToken(token) {
    localStorage.setItem('access_token', token);
}

function clearToken() {
    localStorage.removeItem('access_token');
}

function getUserEmail() {
    return localStorage.getItem('user_email');
}

async function fetchMe() {
    const res = await fetch(API_BASE + '/user/users/me', {
        headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (!res.ok) {
        clearToken();
        localStorage.removeItem('user_email');
        return null;
    }
    return res.json();
}

function ensureAuthModal() {
    if (document.getElementById('authModal')) return;

    const html = `
        <style>
            .modal-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(200, 200, 200, 0.95);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            }
            .modal-overlay.active {
                display: flex;
                opacity: 1;
            }
            .modal-overlay.active .modal-card {
                transform: scale(1) translateY(0);
            }
            .modal-logo {
                position: absolute;
                top: 20px;
                left: 40px;
                font-size: 28px;
                font-weight: 900;
                letter-spacing: 2px;
            }
            .modal-card {
                background: #fff;
                border-radius: 20px;
                padding: 40px;
                width: 420px;
                max-width: 90vw;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .modal-tabs {
                display: flex;
                margin-bottom: 30px;
                border-bottom: 1px solid #e0e0e0;
            }
            .modal-tab {
                flex: 1;
                text-align: center;
                padding: 12px 0;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                border-bottom: 3px solid transparent;
                transition: all 0.3s;
                background: none;
                border-top: none;
                border-left: none;
                border-right: none;
                font-family: 'Inter', sans-serif;
            }
            .modal-tab.active {
                color: #00A6FF;
                border-bottom-color: #00A6FF;
            }
            .modal-tab:not(.active) {
                color: #1a1a1a;
            }
            .form-group {
                margin-bottom: 20px;
            }
            .form-label {
                display: block;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            .form-input {
                width: 100%;
                padding: 14px 18px;
                border: 1.5px solid #ccc;
                border-radius: 30px;
                font-size: 14px;
                font-family: 'Inter', sans-serif;
                outline: none;
                transition: border-color 0.3s;
            }
            .form-input:focus {
                border-color: #00A6FF;
            }
            .form-input::placeholder {
                color: #aaa;
            }
            .form-error {
                color: #EE5549;
                font-size: 13px;
                min-height: 18px;
                margin-bottom: 8px;
                text-align: center;
            }
            .submit-btn {
                width: 100%;
                padding: 16px;
                background: #00A6FF;
                color: #fff;
                border: none;
                border-radius: 30px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                font-family: 'Inter', sans-serif;
                margin-top: 10px;
                transition: all 0.3s;
            }
            .submit-btn:hover:not(:disabled) {
                background: #0090e0;
            }
            .submit-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .modal-footer {
                text-align: center;
                margin-top: 20px;
                font-size: 14px;
            }
            .modal-footer a {
                color: #1a1a1a;
                font-weight: 600;
                text-decoration: underline;
                cursor: pointer;
            }
            .close-modal {
                position: absolute;
                top: 20px;
                right: 40px;
                font-size: 28px;
                cursor: pointer;
                background: none;
                border: none;
                color: #1a1a1a;
                font-family: 'Inter', sans-serif;
                transition: transform 0.3s;
            }
            .close-modal:hover {
                transform: rotate(90deg);
            }
            .login-form {
                display: none;
            }
            .login-form.active {
                display: block;
            }
            .register-form {
                display: block;
            }
            .register-form.hidden {
                display: none;
            }
        </style>
        <div class="modal-overlay" id="authModal">
            <div class="modal-logo">LOGO</div>
            <button class="close-modal" onclick="closeModal()">✕</button>
            <div class="modal-card">
                <div class="modal-tabs">
                    <button class="modal-tab active" data-tab="register" onclick="switchTab('register')">Регистрация</button>
                    <button class="modal-tab" data-tab="login" onclick="switchTab('login')">Вход</button>
                </div>
                <form class="register-form" id="registerForm" onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label class="form-label">Электронная почта</label>
                        <input type="email" class="form-input" placeholder="email@example.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Пароль</label>
                        <input type="password" class="form-input" placeholder="••••••••" required>
                    </div>
                    <div class="form-error" id="registerError"></div>
                    <button type="submit" class="submit-btn">Зарегистрироваться</button>
                    <div class="modal-footer">
                        Уже есть аккаунт? <a onclick="switchTab('login')">Войти</a>
                    </div>
                </form>
                <form class="login-form hidden" id="loginForm" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Электронная почта</label>
                        <input type="email" class="form-input" placeholder="email@example.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Пароль</label>
                        <input type="password" class="form-input" placeholder="••••••••" required>
                    </div>
                    <div class="form-error" id="loginError"></div>
                    <button type="submit" class="submit-btn">Войти</button>
                    <div class="modal-footer">
                        Нет аккаунта? <a onclick="switchTab('register')">Зарегистрироваться</a>
                    </div>
                </form>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('authModal').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });
}

function openModal(tab) {
    ensureAuthModal();
    const modal = document.getElementById('authModal');
    modal.classList.add('active');
    switchTab(tab || 'register');
}

function closeModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
}

function switchTab(tab) {
    document.querySelectorAll('.modal-tab').forEach(function (t) { t.classList.remove('active'); });
    const tabBtn = document.querySelector('.modal-tab[data-tab="' + tab + '"]');
    if (tabBtn) tabBtn.classList.add('active');

    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    if (!registerForm || !loginForm) return;

    if (tab === 'login') {
        registerForm.classList.remove('active');
        registerForm.classList.add('hidden');
        loginForm.classList.add('active');
        loginForm.classList.remove('hidden');
    } else {
        loginForm.classList.remove('active');
        loginForm.classList.add('hidden');
        registerForm.classList.add('active');
        registerForm.classList.remove('hidden');
    }
}

function updateHeaderButtons(user) {
    const container = document.querySelector('.header-buttons');
    if (!container) return;
    if (user) {
        const email = user.email || getUserEmail() || '';
        container.innerHTML =
            '<button class="header-btn header-username-btn" onclick="window.location.href=\'/front/profile.html\'">' + email + '</button>' +
            '<button class="header-btn" onclick="logout()">выйти</button>';
    } else {
        container.innerHTML =
            '<button class="header-btn" onclick="openModal(\'login\')">войти</button>' +
            '<button class="header-btn" onclick="openModal(\'register\')">регистрация</button>';
    }
}

function logout() {
    clearToken();
    localStorage.removeItem('user_email');
    updateHeaderButtons(null);
    if (typeof onLogout === 'function') onLogout();
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    try {
        const res = await fetch(API_BASE + '/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });
        if (!res.ok) {
            const data = await res.json();
            errorEl.textContent = data.detail || 'Ошибка регистрации';
            return;
        }
        closeModal();
        openModal('login');
    } catch (err) {
        errorEl.textContent = 'Ошибка сети';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch(API_BASE + '/user/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        if (!res.ok) {
            const data = await res.json();
            errorEl.textContent = data.detail || 'Ошибка входа';
            return;
        }
        const data = await res.json();
        setToken(data.access_token);
        localStorage.setItem('user_email', email);
        closeModal();
        const user = await fetchMe();
        if (user) {
            updateHeaderButtons(user);
            if (typeof onLogin === 'function') onLogin(data);
        }
    } catch (err) {
        errorEl.textContent = 'Ошибка сети';
    }
}

var onLogin = null;
var onLogout = null;

function setAuthCallbacks(loginCb, logoutCb) {
    onLogin = loginCb || null;
    onLogout = logoutCb || null;
}

(async function initAuth() {
    ensureAuthModal();
    if (getToken()) {
        const user = await fetchMe();
        if (user) updateHeaderButtons(user);
    }
})();
