// ===== НАСТРОЙКИ БЭКЕНДА =====
const API_BASE_URL = '';

// ===== JWT УТИЛИТЫ =====

// Декодирование JWT токена (без внешних библиотек)
function decodeJwt(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        // Base64url декодирование
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(base64);
        return JSON.parse(decoded);
    } catch (e) {
        console.error('Ошибка декодирования JWT:', e);
        return null;
    }
}

// Получить email из токена
function getEmailFromToken(token) {
    const payload = decodeJwt(token);
    if (!payload) return null;
    // Стандартные поля JWT: sub, email, username — проверяем все
    return payload.email || payload.sub || payload.username || null;
}

// Сохранить токен
function saveToken(token) {
    localStorage.setItem('auth_token', token);
}

// Получить токен
function getToken() {
    return localStorage.getItem('auth_token');
}

// Удалить токен
function removeToken() {
    localStorage.removeItem('auth_token');
}

// ===== ОБНОВЛЕНИЕ ШАПКИ =====

function updateHeader() {
    const token = getToken();
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');

    if (token) {
        const email = getEmailFromToken(token);
        if (email) {
            btnLogin.style.display = 'none';
            btnRegister.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = email;
        } else {
            // Токен есть, но email не удалось извлечь — выходим
            logout();
        }
    } else {
        btnLogin.style.display = 'inline-block';
        btnRegister.style.display = 'inline-block';
        userInfo.style.display = 'none';
    }
}

// ===== ВЫХОД =====

function logout() {
    removeToken();
    updateHeader();
}

// ===== МОДАЛЬНЫЕ ОКНА =====

function openModal(modalId, tab) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';

    requestAnimationFrame(() => {
        modal.classList.add('active');
    });

    if (tab && modalId === 'authModal') {
        switchTab(tab);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');

    setTimeout(() => {
        modal.style.display = 'none';
        // Очищаем ошибки и поля при закрытии
        clearAuthForms();
    }, 300);
}

function clearAuthForms() {
    document.getElementById('regError').textContent = '';
    document.getElementById('loginError').textContent = '';
    document.getElementById('regBtn').disabled = false;
    document.getElementById('loginBtn').disabled = false;
    document.getElementById('regBtn').textContent = 'Зарегистрироваться';
    document.getElementById('loginBtn').textContent = 'Войти';
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal(this.id);
        }
    });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====

function switchTab(tab) {
    const tabRegister = document.getElementById('tabRegister');
    const tabLogin = document.getElementById('tabLogin');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    clearAuthForms();

    if (tab === 'register') {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.remove('active');
    } else {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.add('hidden');
    }
}

// ===== РЕГИСТРАЦИЯ =====

async function handleRegister() {
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const errorEl = document.getElementById('regError');
    const btn = document.getElementById('regBtn');

    // Валидация на клиенте
    if (!email || !password) {
        errorEl.textContent = 'Заполните все поля';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Пароль должен содержать минимум 6 символов';
        return;
    }

    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Регистрация...';

    try {
        const response = await fetch(`${API_BASE_URL}/user/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (response.ok) {
            // Регистрация успешна — автоматически входим
            errorEl.style.color = '#51cf66';
            errorEl.textContent = 'Регистрация успешна! Выполняем вход...';
            
            await performLogin(email, password);
        } else {
            const data = await response.json().catch(() => ({}));
            const message = data.detail || data.message || `Ошибка ${response.status}`;
            errorEl.style.color = '#EE5549';
            errorEl.textContent = message;
            btn.disabled = false;
            btn.textContent = 'Зарегистрироваться';
        }
    } catch (error) {
        errorEl.style.color = '#EE5549';
        errorEl.textContent = 'Ошибка соединения с сервером';
        btn.disabled = false;
        btn.textContent = 'Зарегистрироваться';
        console.error('Register error:', error);
    }
}

// ===== ВХОД =====

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    if (!email || !password) {
        errorEl.textContent = 'Заполните все поля';
        return;
    }

    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Вход...';

    await performLogin(email, password, errorEl, btn);
}

async function performLogin(email, password, errorEl, btn) {
    if (!errorEl) errorEl = document.getElementById('loginError');
    if (!btn) btn = document.getElementById('loginBtn');

    try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const response = await fetch(`${API_BASE_URL}/user/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            const token = data.access_token || data.token;

            if (token) {
                saveToken(token);
                updateHeader();
                closeModal('authModal');
            } else {
                errorEl.textContent = 'Токен не получен от сервера';
                btn.disabled = false;
                btn.textContent = 'Войти';
            }
        } else {
            const data = await response.json().catch(() => ({}));
            const message = data.detail || data.message || 'Неверный email или пароль';
            errorEl.textContent = message;
            btn.disabled = false;
            btn.textContent = 'Войти';
        }
    } catch (error) {
        errorEl.textContent = 'Ошибка соединения с сервером';
        btn.disabled = false;
        btn.textContent = 'Войти';
        console.error('Login error:', error);
    }
}

// ===== ОТПРАВКА URL КВАРТИРЫ =====

function handleUrlSubmit() {
    const input = document.getElementById('apartmentUrl');
    const btn = document.getElementById('urlSubmitBtn');
    const hint = document.getElementById('urlHint');
    const url = input.value.trim();

    // Проверка авторизации
    if (!getToken()) {
        hint.textContent = 'Сначала войдите в аккаунт';
        hint.style.color = '#ff6b6b';
        input.classList.add('error');
        setTimeout(() => {
            input.classList.remove('error');
            hint.textContent = 'Например: ссылка на объявление Циан, Авито или фото квартиры';
            hint.style.color = '';
        }, 3000);
        return;
    }

    if (!url) {
        hint.textContent = 'Введите ссылку на квартиру';
        hint.style.color = '#ff6b6b';
        input.classList.add('error');
        setTimeout(() => {
            input.classList.remove('error');
            hint.textContent = 'Например: ссылка на объявление Циан, Авито или фото квартиры';
            hint.style.color = '';
        }, 3000);
        return;
    }

    if (url.length < 5) {
        hint.textContent = 'Слишком короткая ссылка';
        hint.style.color = '#ff6b6b';
        input.classList.add('error');
        setTimeout(() => {
            input.classList.remove('error');
            hint.textContent = 'Например: ссылка на объявление Циан, Авито или фото квартиры';
            hint.style.color = '';
        }, 3000);
        return;
    }

    input.classList.remove('error');
    input.classList.add('success');
    btn.disabled = true;
    btn.textContent = 'Обработка...';
    hint.textContent = 'Получаем данные по ссылке...';
    hint.style.color = 'rgba(255, 255, 255, 0.8)';

    setTimeout(() => {
        btn.textContent = 'Готово!';
        btn.style.background = '#51cf66';
        hint.textContent = 'Ссылка успешно получена';

        setTimeout(() => {
            alert('Ссылка: ' + url);

            input.value = '';
            input.classList.remove('success');
            btn.disabled = false;
            btn.textContent = 'Продолжить';
            btn.style.background = '';
            hint.textContent = 'Например: ссылка на объявление Циан, Авито или фото квартиры';
            hint.style.color = '';
        }, 800);
    }, 1500);
}

// Enter для отправки URL
document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('apartmentUrl');
    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleUrlSubmit();
            }
        });

        urlInput.addEventListener('input', () => {
            urlInput.classList.remove('error', 'success');
        });
    }

    // Enter для форм авторизации
    document.getElementById('regPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });

    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Проверяем авторизацию при загрузке
    updateHeader();
});

// ===== SCROLL ANIMATIONS =====

const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 150);
            scrollObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
    scrollObserver.observe(el);
});

// ===== PARALLAX POLAROID =====

document.addEventListener('mousemove', (e) => {
    const polaroid = document.querySelector('.polaroid');
    if (!polaroid) return;

    const x = (window.innerWidth / 2 - e.clientX) / 60;
    const y = (window.innerHeight / 2 - e.clientY) / 60;

    polaroid.style.transform = `translateX(calc(-50% + ${x}px)) rotate(8deg) translateY(${y}px)`;
});

// ===== TILT STEP CARDS =====

document.querySelectorAll('.step-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 15;
        const rotateY = (centerX - x) / 15;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});
