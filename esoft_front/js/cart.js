// cart.js - Логика страницы корзины подборок

const API_URL = 'http://localhost:8000';

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

// Добавление объявления
addBtn.addEventListener('click', async () => {
    const url = linkInput.value.trim();
    if (!url) return;

    // UI Loading State
    addBtn.disabled = true;
    btnText.textContent = 'Парсинг...';
    btnSpinner.style.display = 'inline-block';

    try {
        const response = await fetch(`${API_URL}/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Ошибка парсинга');
        }

        const data = await response.json();
        addRowToTable(data);
        
        // Clear Input
        linkInput.value = '';
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    } finally {
        addBtn.disabled = false;
        btnText.textContent = 'Добавить в подборку';
        btnSpinner.style.display = 'none';
    }
});

// Добавление строки в таблицу
function addRowToTable(data) {
    // Hide empty state, show table
    emptyState.style.display = 'none';
    mainTable.style.display = 'table';
    pagination.style.display = 'flex';

    rowCount++;
    countInfo.textContent = `1–${rowCount} из ${rowCount}`;

    const date = new Date().toLocaleString('ru-RU');
    const imgSrc = data.images && data.images.length > 0 ? data.images[0] : 'https://placehold.co/120x90/e0e0e0/999999?text=Room';
    const shortId = data.id.substring(0, 8).toUpperCase();

    const rowHtml = `
        <tr class="new-row">
            <td><input type="checkbox" checked></td>
            <td>
                <div class="object">
                    <div class="img-box">
                        <img src="${imgSrc}" alt="${data.title}">
                        <span class="img-count">1/${data.images ? data.images.length : 0}</span>
                        <div class="arrows">
                            <div class="arrow">‹</div>
                            <div class="arrow">›</div>
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
                        <button class="del-btn" onclick="this.closest('tr').remove()">Удалить</button>
                        <div class="sources">
                            <div class="src" style="background:#4CAF50" title="Avito"></div>
                            <div class="src" style="background:#F44336" title="ЦИАН"></div>
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight:500">${data.price.toLocaleString('ru-RU')} руб.</div>
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
}

// Check all logic
checkAll.addEventListener('change', function() {
    document.querySelectorAll('#tableBody input[type="checkbox"]').forEach(cb => {
        cb.checked = this.checked;
    });
});
