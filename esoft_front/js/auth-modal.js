class AuthModal {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || '';
        this.triggerSelector = options.triggerSelector || '#authTrigger';
        this.avatarSelector = options.avatarSelector || '#profileAvatar';
        this.onLogin = options.onLogin || null;
        this.onLogout = options.onLogout || null;
        
        this.init();
    }
    
    init() {
        this.createModalHTML();
        this.bindEvents();
        this.checkAuth();
    }
    
    createModalHTML() {
        const modalHTML = `
            <div class="auth-modal-overlay" id="authModalOverlay">
                <div class="auth-modal">
                    <div class="auth-modal-header">
                        <h2 id="authModalTitle">Вход</h2>
                        <button class="auth-modal-close" id="authModalClose">×</button>
                    </div>
                    
                    <div class="auth-modal-tabs">
                        <button class="auth-tab active" data-tab="login">Вход</button>
                        <button class="auth-tab" data-tab="register">Регистрация</button>
                    </div>
                    
                    <form class="auth-form" id="loginForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" required placeholder="your@email.com">
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <input type="password" name="password" required placeholder="••••••••">
                        </div>
                        <button type="submit" class="auth-submit-btn">Войти</button>
                        <div class="auth-error" id="loginError"></div>
                    </form>
                    
                    <form class="auth-form hidden" id="registerForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" required placeholder="your@email.com">
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <input type="password" name="password" required placeholder="••••••••" minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Подтвердите пароль</label>
                            <input type="password" name="confirmPassword" required placeholder="••••••••" minlength="6">
                        </div>
                        <button type="submit" class="auth-submit-btn">Зарегистрироваться</button>
                        <div class="auth-error" id="registerError"></div>
                    </form>
                    
                    <div class="auth-user-info hidden" id="authUserInfo">
                        <div class="user-avatar" id="userAvatar">U</div>
                        <div class="user-details">
                            <div class="user-email" id="userEmail"></div>
                            <div class="user-status">Авторизован</div>
                        </div>
                        <button class="auth-logout-btn" id="logoutBtn">Выйти</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.addStyles();
    }
    
    addStyles() {
        const styles = `
            <style>
                .auth-modal-overlay {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 9999;
                    align-items: center;
                    justify-content: center;
                }
                
                .auth-modal-overlay.active {
                    display: flex;
                }
                
                .auth-modal {
                    background: white;
                    border-radius: 12px;
                    width: 400px;
                    max-width: 90%;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    animation: authModalSlideIn 0.3s ease;
                }
                
                @keyframes authModalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .auth-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .auth-modal-header h2 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                }
                
                .auth-modal-close {
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #6b7280;
                    line-height: 1;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: background 0.2s;
                }
                
                .auth-modal-close:hover {
                    background: #f3f4f6;
                }
                
                .auth-modal-tabs {
                    display: flex;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .auth-tab {
                    flex: 1;
                    padding: 14px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: #6b7280;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                }
                
                .auth-tab.active {
                    color: #3b82f6;
                    border-bottom-color: #3b82f6;
                }
                
                .auth-form {
                    padding: 24px;
                }
                
                .auth-form.hidden {
                    display: none;
                }
                
                .form-group {
                    margin-bottom: 16px;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                }
                
                .form-group input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                
                .form-group input:focus {
                    outline: none;
                    border-color: #3b82f6;
                }
                
                .auth-submit-btn {
                    width: 100%;
                    padding: 12px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .auth-submit-btn:hover {
                    background: #2563eb;
                }
                
                .auth-submit-btn:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                }
                
                .auth-error {
                    margin-top: 12px;
                    padding: 10px;
                    background: #fee2e2;
                    color: #991b1b;
                    border-radius: 6px;
                    font-size: 13px;
                    display: none;
                }
                
                .auth-error.show {
                    display: block;
                }
                
                .auth-user-info {
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                
                .auth-user-info.hidden {
                    display: none;
                }
                
                .user-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: #3b82f6;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: 600;
                }
                
                .user-details {
                    flex: 1;
                }
                
                .user-email {
                    font-size: 14px;
                    font-weight: 500;
                    color: #111827;
                    margin-bottom: 2px;
                }
                
                .user-status {
                    font-size: 12px;
                    color: #6b7280;
                }
                
                .auth-logout-btn {
                    padding: 8px 16px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .auth-logout-btn:hover {
                    background: #dc2626;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    bindEvents() {
        const overlay = document.getElementById('authModalOverlay');
        const closeBtn = document.getElementById('authModalClose');
        const tabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const logoutBtn = document.getElementById('logoutBtn');
        
        // Закрытие модального окна
        closeBtn.addEventListener('click', () => this.hide());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.hide();
        });
        
        // Переключение табов
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Обработка входа
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(loginForm);
        });
        
        // Обработка регистрации
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister(registerForm);
        });
        
        // Выход
        logoutBtn.addEventListener('click', () => this.logout());
        
        // Триггер
        const trigger = document.querySelector(this.triggerSelector);
        if (trigger) {
            trigger.addEventListener('click', () => this.show());
        }
    }
    
    async handleLogin(form) {
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        const errorEl = document.getElementById('loginError');
        const submitBtn = form.querySelector('.auth-submit-btn');
        
        errorEl.classList.remove('show');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Вход...';
        
        try {
            // Формируем данные в формате URL-encoded
            const urlEncodedData = new URLSearchParams();
            urlEncodedData.append('username', email);
            urlEncodedData.append('password', password);
            
            const response = await fetch(`${this.apiUrl}/user/token`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: urlEncodedData.toString()
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Неверный email или пароль');
            }
            
            const data = await response.json();
            this.saveToken(data.access_token, email);
            this.showUserInfo(email);
            this.updateAvatar(email);
            
            if (this.onLogin) this.onLogin(data);
            
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.add('show');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Войти';
        }
    }
    
    async handleRegister(form) {
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const errorEl = document.getElementById('registerError');
        const submitBtn = form.querySelector('.auth-submit-btn');
        
        errorEl.classList.remove('show');
        
        if (password !== confirmPassword) {
            errorEl.textContent = 'Пароли не совпадают';
            errorEl.classList.add('show');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Регистрация...';
        
        try {
            const response = await fetch(`${this.apiUrl}/user/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Ошибка регистрации');
            }
            
            // Автоматический вход после регистрации
            await this.handleLogin(form);
            
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.add('show');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрироваться';
        }
    }
    
    saveToken(token, email) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_email', email);
    }
    
    getToken() {
        return localStorage.getItem('auth_token');
    }
    
    getUserEmail() {
        return localStorage.getItem('user_email');
    }
    
    checkAuth() {
        const token = this.getToken();
        const email = this.getUserEmail();
        
        if (token && email) {
            this.showUserInfo(email);
            this.updateAvatar(email);
        }
    }
    
    updateAvatar(email) {
        const avatar = document.querySelector(this.avatarSelector);
        if (!avatar) return;
        
        const letter = email.charAt(0).toUpperCase();
        const letterSpan = avatar.querySelector('.avatar-letter');
        
        if (letterSpan) {
            letterSpan.textContent = letter;
        }
        
        avatar.classList.add('authenticated');
        const trigger = document.querySelector(this.triggerSelector);
        if (trigger) {
            trigger.classList.add('authenticated');
        }
    }
    
    resetAvatar() {
        const avatar = document.querySelector(this.avatarSelector);
        if (!avatar) return;
        
        const letterSpan = avatar.querySelector('.avatar-letter');
        if (letterSpan) {
            letterSpan.textContent = '?';
        }
        
        avatar.classList.remove('authenticated');
        const trigger = document.querySelector(this.triggerSelector);
        if (trigger) {
            trigger.classList.remove('authenticated');
        }
    }
    
    showUserInfo(email) {
        const userInfo = document.getElementById('authUserInfo');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const tabs = document.querySelector('.auth-modal-tabs');
        
        userEmail.textContent = email;
        userAvatar.textContent = email.charAt(0).toUpperCase();
        
        userInfo.classList.remove('hidden');
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        tabs.style.display = 'none';
    }
    
    hideUserInfo() {
        const userInfo = document.getElementById('authUserInfo');
        const loginForm = document.getElementById('loginForm');
        const tabs = document.querySelector('.auth-modal-tabs');
        
        userInfo.classList.add('hidden');
        loginForm.classList.remove('hidden');
        tabs.style.display = 'flex';
    }
    
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_email');
        this.hideUserInfo();
        this.resetAvatar();
        
        if (this.onLogout) this.onLogout();
        this.hide();
    }
    
    switchTab(tabName) {
        const tabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const title = document.getElementById('authModalTitle');
        
        tabs.forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        if (tabName === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            title.textContent = 'Вход';
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            title.textContent = 'Регистрация';
        }
    }
    
    show() {
        const overlay = document.getElementById('authModalOverlay');
        overlay.classList.add('active');
    }
    
    hide() {
        const overlay = document.getElementById('authModalOverlay');
        overlay.classList.remove('active');
    }
    
    isAuthenticated() {
        return !!this.getToken();
    }
}
