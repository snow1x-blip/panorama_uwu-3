const API_URL = '';

let rowCount = 0;

// DOM элементы
const linkInput = document.getElementById('linkInput');
const addBtn = document.getElementById('addBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const tableBody = document.getElementById('tableBody');
const mainTable = document.getElementById('mainTable');
const emptyState = document.getElementById('emptyState');
const pagination = document.getElementById('pagination');
const countInfo = document.getElementById('countInfo');
const checkAll = document.getElementById('checkAll');

// Инициализация AI Витрины
const aiVitrina = new AiVitrina({
    triggerSelector: '#aiVitrinaTrigger'
});

// Инициализация модального окна авторизации
const authModal = new AuthModal({
    apiUrl: API_URL,
    triggerSelector: '#authTrigger',
    avatarSelector: '#profileAvatar',
    onLogin: async (data) => {
        console.log('Пользователь авторизован');
        await loadUserApartments(); // Загружаем карточки после входа
    },
    onLogout: () => {
        console.log('Пользователь вышел');
        clearTable();
    }
});

// После обновления страницы AuthModal восстанавливает токен из localStorage,
// но событие onLogin уже не происходит. Поэтому грузим сохраненные карточки явно.
loadUserApartments();

// Загрузка карточек пользователя из БД
async function loadUserApartments() {
    if (!authModal.isAuthenticated()) return;
    
    try {
        const token = authModal.getToken();
        const response = await fetch(`${API_URL}/apartments/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки карточек');
        }
        
        const apartments = await response.json();
        
        // Очищаем таблицу и загружаем карточки
        clearTable();
        
        if (apartments.length > 0) {
            apartments.forEach(apt => {
                addRowToTable(apt, false); // false - не сохранять в БД (уже сохранено)
            });
        }
        
    } catch (error) {
        console.error('Ошибка загрузки карточек:', error);
    }
}

// Очистка таблицы
function clearTable() {
    tableBody.innerHTML = '';
    rowCount = 0;
    emptyState.style.display = 'block';
    mainTable.style.display = 'none';
    pagination.style.display = 'none';
    countInfo.textContent = '';
}

// Добавление объявления
addBtn.addEventListener('click', async () => {
    const url = linkInput.value.trim();
    if (!url) return;

    // Проверка авторизации
    if (!authModal.isAuthenticated()) {
        alert('Пожалуйста, авторизуйтесь для добавления объявлений');
        authModal.show();
        return;
    }

    // UI Loading State
    addBtn.disabled = true;
    btnText.textContent = 'Парсинг...';
    btnSpinner.style.display = 'inline-block';

    try {
        const token = authModal.getToken();
        
        // Парсинг URL
        const parseResponse = await fetch(`${API_URL}/process`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ url: url })
        });

        if (!parseResponse.ok) {
            const err = await parseResponse.json();
            throw new Error(err.detail || 'Ошибка парсинга');
        }

        const result = await parseResponse.json();

        // /process теперь сразу сохраняет карточку в БД и возвращает
        // уже сохраненный объект — второй запрос на /apartments/ не нужен
        if (result.status === 'success' && result.data && result.data.apartment_card) {
            const savedApartment = result.data.apartment_card;

            // Добавляем в таблицу
            addRowToTable(savedApartment, false);

            // Clear Input
            linkInput.value = '';
        } else {
            throw new Error('Неверная структура ответа от сервера');
        }

        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    } finally {
        addBtn.disabled = false;
        btnText.textContent = 'Добавить в подборку';
        btnSpinner.style.display = 'none';
    }
});

// Добавление строки в таблицу
function addRowToTable(data, saveToDB = false) {
    // Hide empty state, show table
    emptyState.style.display = 'none';
    mainTable.style.display = 'table';
    pagination.style.display = 'flex';

    rowCount++;
    countInfo.textContent = `1–${rowCount} из ${rowCount}`;

    const date = data.created_at ? new Date(data.created_at).toLocaleString('ru-RU') : '—';
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const flatImages = rawImages.map(src => src.startsWith('/static') ? `${API_URL}${src}` : src);
    const imgSrc = flatImages.length > 0 ? flatImages[0] : 'https://luxorta.ru/uploads/posts/2020-11/1604676985_remont-kvartiry-kachestvenno.jpg';
    const shortId = data.id.toUpperCase().substring(0, 8);
    const priceText = Number(data.price || 0).toLocaleString('ru-RU');

    const rowHtml = `
        <tr class="new-row" data-apartment-id="${data.id}">
            <td><input type="checkbox" checked></td>
            <td>
                <div class="object">
                    <div class="img-box" data-images='${JSON.stringify(flatImages)}' data-current-index="0">
                        <img src="${imgSrc}" alt="${data.title}">
                        <span class="img-count">1/${flatImages.length}</span>
                        <div class="arrows">
                            <div class="arrow prev-arrow">‹</div>
                            <div class="arrow next-arrow">›</div>
                        </div>
                    </div>
                    <div class="details">
                        <div class="tags">
                            <span class="tag">Квартиры</span>
                            <span class="tag">Комната</span>
                            <span class="tag">Продажа</span>
                            <span class="tag active">Активный</span>
                        </div>
                        <div class="id">${shortId}</div>
                        <a href="${data.url}" target="_blank" class="addr">${data.title}</a>
                        <div class="district">${data.address}</div>
                        <span class="score">A (95%)</span>
                        <div class="read">Читать описание</div>
                        <button class="del-btn" onclick="deleteApartment('${data.id}', this)">Удалить</button>
                        <div class="sources">
                            <div class="src" style="background:#4CAF50" title="Avito"></div>
                            <div class="src" style="background:#F44336" title="ЦИАН"></div>
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight:500">${priceText} руб.</div>
                <div style="color:#666;font-size:12px;margin-top:4px">
                    ${data.price_per_sqm ? data.price_per_sqm.toLocaleString('ru-RU') + ' руб./м²' : '—'}
                </div>
            </td>
            <td>
                <div class="info-sec">
                    <div class="info-title">Описание объекта</div>
                    <div class="author">${data.source}</div>
                    <a href="${data.url}" target="_blank" class="link">${data.url}</a>
                    <div class="time">Распарсировано: ${date}</div>
                </div>
                <div style="margin-bottom: 10px; font-size: 12px; color: #666; line-height: 1.5;">
                    ${data.description || 'Описание отсутствует'}
                </div>
                <div class="specs">
                    ${data.rooms ? `<div class="spec"><span>Комнат</span> <span>${data.rooms}</span></div>` : ''}
                    ${data.floor ? `<div class="spec"><span>Этаж</span> <span>${data.floor}</span></div>` : ''}
                    ${data.area ? `<div class="spec"><span>Площадь</span> <span>${data.area} м²</span></div>` : ''}
                    <div class="spec"><span>Стены</span> <span>Кирпичные</span></div>
                    <div class="spec"><span>Торг</span> <span>Нет</span></div>
                </div>
                <a href="#" class="more">Подробнее</a>
            </td>
            <td>
                <div style="width:60px;height:20px;background:repeating-linear-gradient(45deg,#3b82f6,#3b82f6 2px,transparent 2px,transparent 6px);border-radius:4px"></div>
            </td>
            <td>
                <div class="owner-name">Менеджер</div>
                <div class="actions">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.26-.27.36-.66.24-1.01-.37-1.11-.56-2.3-.56-3.53 0-.55-.45-1-1-1H4.39c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
            </td>
            <td>
                <div class="date">Создан<br>${date}</div>
                <div class="date" style="margin-top:8px">Обновлен<br>${date}</div>
            </td>
            <td>
                <div style="display:flex;flex-direction:column;gap:10px">
                    <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:#666">
                        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> 1
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:#666">
                        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> 0
                    </div>
                </div>
            </td>
        </tr>
    `;

    // Insert new row at the top
    tableBody.insertAdjacentHTML('afterbegin', rowHtml);
    
    // Инициализация обработчиков для новой строки
    const newRow = tableBody.firstElementChild;
    initImageSlider(newRow);
}

// Удаление квартиры
async function deleteApartment(apartmentId, button) {
    if (!confirm('Вы уверены, что хотите удалить эту карточку?')) return;
    
    try {
        const token = authModal.getToken();
        const response = await fetch(`${API_URL}/apartments/${apartmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка удаления');
        }
        
        // Удаляем строку из таблицы
        const row = button.closest('tr');
        row.remove();
        rowCount--;
        
        // Обновляем счетчик
        if (rowCount === 0) {
            clearTable();
        } else {
            countInfo.textContent = `1–${rowCount} из ${rowCount}`;
        }
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// Инициализация слайдера изображений
function initImageSlider(row) {
    const imgBox = row.querySelector('.img-box');
    const img = imgBox.querySelector('img');
    const counter = imgBox.querySelector('.img-count');
    const prevArrow = imgBox.querySelector('.prev-arrow');
    const nextArrow = imgBox.querySelector('.next-arrow');
    
    const images = JSON.parse(imgBox.dataset.images);
    let currentIndex = 0;
    
    if (images.length === 0) {
        prevArrow.style.display = 'none';
        nextArrow.style.display = 'none';
        return;
    }
    
    function updateImage() {
        img.src = images[currentIndex];
        counter.textContent = `${currentIndex + 1}/${images.length}`;
    }
    
    prevArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateImage();
    });
    
    nextArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % images.length;
        updateImage();
    });
}
