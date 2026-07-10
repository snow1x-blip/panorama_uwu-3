// carts.js — profile page script
(function () {
    function populateProfile() {
        var token = typeof getToken === 'function' ? getToken() : localStorage.getItem('access_token');
        var email = (typeof getUserEmail === 'function' ? getUserEmail() : null) || localStorage.getItem('user_email');

        if (token && !email && typeof fetchMe === 'function') {
            fetchMe().then(function (user) {
                if (user) renderProfile(user);
            });
            return;
        }

        if (email) renderProfile({ email: email });
    }

    function renderProfile(user) {
        var emailEl = document.getElementById('userEmail');
        var nameEl = document.getElementById('userName');
        var phoneEl = document.getElementById('userPhone');
        
        if (user.email && emailEl) emailEl.textContent = user.email;
        if (user.name && nameEl) nameEl.textContent = user.name;
        if (user.phone && phoneEl) phoneEl.textContent = user.phone;

        // === НОВАЯ ЛОГИКА: Загрузка PDF ===
        // Используем email или username как идентификатор (в зависимости от того, что хранится в Pdf.user_name)
        const userIdentifier = user.email || user.name; 
        if (userIdentifier) {
            loadUserPdfs(userIdentifier);
        }
    }

    // Функция загрузки и отрисовки PDF
    async function loadUserPdfs(userIdentifier) {
        const container = document.getElementById('pdfList');
        const emptyMsg = document.getElementById('pdfEmptyMessage');
        if (!container) return;

        try {
            // ВАЖНО: Замените URL на адрес вашего бекенда, если он на другом порту (например, http://localhost:8000)
            const apiUrl = `/files/${encodeURIComponent(userIdentifier)}`;
            const response = await fetch(apiUrl);
            
            if (response.status === 404) {
                container.innerHTML = '';
                if (emptyMsg) emptyMsg.style.display = 'block';
                return;
            }
            if (!response.ok) throw new Error('Ошибка загрузки документов');

            const files = await response.json();
            
            if (!files || files.length === 0) {
                container.innerHTML = '';
                if (emptyMsg) emptyMsg.style.display = 'block';
                return;
            }

            if (emptyMsg) emptyMsg.style.display = 'none';
            container.innerHTML = ''; // Очищаем перед отрисовкой

            files.forEach(file => {
                // Извлекаем имя файла из полного пути (работает для Windows и Linux)
                const fileName = file.path.split('\\').pop().split('/').pop();
                
                const item = document.createElement('a');
                item.className = 'presentation-item pdf-item';
                item.href = '#';
                
                // Обработка клика для скачивания
                item.addEventListener('click', async (e) => {
                    e.preventDefault();
                    
                    // Получаем токен (используем ту же логику, что и в populateProfile)
                    const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('access_token');
                    
                    if (!token) {
                        alert('Необходимо войти в систему');
                        return;
                    }
                    
                    try {
                        // Делаем запрос с заголовком авторизации
                        const response = await fetch(`/download/${encodeURIComponent(fileName)}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`  // Или 'Token ' в зависимости от вашей схемы
                            }
                        });
                        
                        if (!response.ok) {
                            if (response.status === 401 || response.status === 403) {
                                alert('Ошибка авторизации. Возможно, срок действия токена истёк.');
                            } else {
                                alert('Ошибка при загрузке файла');
                            }
                            return;
                        }
                        
                        // Получаем файл как Blob
                        const blob = await response.blob();
                        
                        // Создаём временный URL для blob
                        const blobUrl = URL.createObjectURL(blob);
                        
                        // Открываем PDF в новой вкладке
                        window.open(blobUrl, '_blank');
                        
                        // Освобождаем память через некоторое время (опционально)
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                        
                    } catch (error) {
                        console.error('Ошибка при скачивании PDF:', error);
                        alert('Не удалось загрузить документ');
                    }
                });

                // Рендерим карточку с иконкой PDF (SVG)
                item.innerHTML = `
                    <div class="presentation-thumb pdf-thumb" style="display: flex; align-items: center; justify-content: center; background: #f3f4f6;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" style="width: 48px; height: 48px;">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                    <p class="presentation-name" title="${fileName}">${fileName}</p>
                `;
                container.appendChild(item);
            });
        } catch (error) {
            console.error('Ошибка при загрузке PDF:', error);
            if (emptyMsg) {
                emptyMsg.textContent = 'Ошибка загрузки документов';
                emptyMsg.style.display = 'block';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', populateProfile);
    } else {
        populateProfile();
    }
})();
