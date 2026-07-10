// pres_add.js — new presentation page script
(function () {
    'use strict';
    
    console.log('pres_add.js загружен');
    
    // Элементы DOM
    let linkInput, loadButton, generateButton;
    let titleElement, roomsElement, floorElement, areaElement;
    let priceElement, pricePerSqmElement, addressElement, descriptionElement;
    let photoPlaceholders, presentationTextSection;
    
    // Текущие данные объекта
    let currentPropertyData = null;
    
    // Инициализация элементов
    function initElements() {
        linkInput = document.getElementById('propertyLink');
        loadButton = document.getElementById('loadPropertyBtn');
        generateButton = document.getElementById('generateScenarioBtn');
        
        titleElement = document.getElementById('propertyTitle');
        roomsElement = document.getElementById('rooms');
        floorElement = document.getElementById('floor');
        areaElement = document.getElementById('area');
        priceElement = document.getElementById('price');
        pricePerSqmElement = document.getElementById('pricePerSqm');
        addressElement = document.getElementById('address');
        descriptionElement = document.getElementById('description');
        
        photoPlaceholders = document.querySelectorAll('.photo-placeholder');
        presentationTextSection = document.querySelector('.presentation-section');
        
        console.log('Элементы найдены:', {
            linkInput: !!linkInput,
            loadButton: !!loadButton,
            titleElement: !!titleElement,
            roomsElement: !!roomsElement,
            floorElement: !!floorElement,
            areaElement: !!areaElement,
            priceElement: !!priceElement,
            pricePerSqmElement: !!pricePerSqmElement,
            addressElement: !!addressElement,
            descriptionElement: !!descriptionElement,
            photoPlaceholders: photoPlaceholders.length
        });
    }
    
    // Форматирование цены
    function formatPrice(price) {
        if (!price && price !== 0) return '-';
        return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
    }
    
    // Безопасное обновление текста элемента
    function updateElement(element, value, formatter = null) {
        if (!element) {
            console.warn('Элемент не найден для обновления');
            return false;
        }
        if (value === null || value === undefined || value === '') {
            element.textContent = '-';
        } else {
            element.textContent = formatter ? formatter(value) : value;
        }
        return true;
    }
    
    // Загрузка данных по ссылке
    async function loadPropertyData() {
        console.log('loadPropertyData вызвана');
        
        const url = linkInput ? linkInput.value.trim() : '';
        
        if (!url) {
            alert('Пожалуйста, введите ссылку на объявление');
            return;
        }
        
        console.log('URL для обработки:', url);
        
        // Получаем токен
        const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('access_token');
        
        if (!token) {
            alert('Необходимо войти в систему');
            console.error('Токен не найден');
            return;
        }
        
        console.log('Токен найден, длина:', token.length);
        
        if (loadButton) {
            loadButton.textContent = 'Загрузка...';
            loadButton.disabled = true;
        }
        
        try {
            console.log('Отправка POST запроса на /process');
            
            const response = await fetch('http://localhost:8000/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url: url })
            });
            
            console.log('Статус ответа:', response.status);
            console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));
            
            if (response.status === 401 || response.status === 403) {
                alert('Ошибка авторизации. Пожалуйста, войдите снова.');
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка ответа:', errorText);
                throw new Error('Ошибка при загрузке данных: ' + response.status);
            }
            
            const responseData = await response.json();
            console.log('✅ Полученные данные:', JSON.stringify(responseData, null, 2));
            
            // Проверяем структуру данных и извлекаем apartment_card
            let apartmentData;
            if (responseData.data && responseData.data.apartment_card) {
                apartmentData = responseData.data.apartment_card;
                console.log('✓ Данные извлечены из data.apartment_card');
            } else if (responseData.data) {
                apartmentData = responseData.data;
                console.log('✓ Данные извлечены из data');
            } else {
                apartmentData = responseData;
                console.log('✓ Используем корневой объект как данные');
            }
            
            console.log('📋 Данные квартиры:', JSON.stringify(apartmentData, null, 2));
            
            currentPropertyData = apartmentData;
            
            // Заполняем поля данными
            console.log('Вызов populatePropertyData...');
            populatePropertyData(apartmentData);
            
            // Показываем кнопку генерации
            if (generateButton) {
                generateButton.style.display = 'inline-block';
                console.log('Кнопка генерации показана');
            }
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            alert('Не удалось загрузить данные. Проверьте ссылку и попробуйте снова.');
        } finally {
            if (loadButton) {
                loadButton.textContent = 'Загрузить данные';
                loadButton.disabled = false;
            }
        }
    }
    
    // Заполнение полей данными
    function populatePropertyData(data) {
        console.log('📝 Заполнение полей данными...');
        
        let updatedCount = 0;
        
        // Заголовок
        if (updateElement(titleElement, data.title || 'Квартира')) {
            console.log('✓ Заголовок:', data.title);
            updatedCount++;
        }
        
        // Количество комнат
        if (updateElement(roomsElement, data.rooms)) {
            console.log('✓ Комнаты:', data.rooms);
            updatedCount++;
        }
        
        // Этаж
        if (updateElement(floorElement, data.floor)) {
            console.log('✓ Этаж:', data.floor);
            updatedCount++;
        }
        
        // Площадь
        const areaText = data.area ? data.area + ' кв.м.' : null;
        if (updateElement(areaElement, areaText)) {
            console.log('✓ Площадь:', areaText);
            updatedCount++;
        }
        
        // Цена
        if (updateElement(priceElement, data.price, formatPrice)) {
            console.log('✓ Цена:', formatPrice(data.price));
            updatedCount++;
        }
        
        // Цена за кв.м.
        if (updateElement(pricePerSqmElement, data.price_per_sqm, formatPrice)) {
            console.log('✓ Цена за кв.м.:', formatPrice(data.price_per_sqm));
            updatedCount++;
        }
        
        // Адрес
        if (updateElement(addressElement, data.address)) {
            console.log('✓ Адрес:', data.address);
            updatedCount++;
        }
        
        // Описание
        if (updateElement(descriptionElement, data.description)) {
            console.log('✓ Описание:', data.description ? data.description.substring(0, 50) + '...' : 'пустое');
            updatedCount++;
        }
        
        console.log(`Обновлено элементов: ${updatedCount} из 8`);
        
        // Фотографии
        if (photoPlaceholders.length > 0 && data.images && data.images.length > 0) {
            console.log('📷 Загрузка фотографий:', data.images.length, 'шт.');
            
            photoPlaceholders.forEach((placeholder, index) => {
                if (data.images[index]) {
                    // Убираем "static/" из начала пути, если он есть
                    let imagePath = data.images[index];
                    if (imagePath.startsWith('static/')) {
                        imagePath = imagePath.substring(7); // убираем "static/"
                    }
                    
                    const imageUrl = 'esoft_front/static/' + imagePath;
                    console.log(`Загрузка фото ${index + 1}:`, imageUrl);
                    
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = 'Фото квартиры ' + (index + 1);
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '12px';
                    
                    // Обработка ошибки загрузки изображения
                    img.onerror = function() {
                        console.error('❌ Не удалось загрузить изображение:', imageUrl);
                        placeholder.textContent = 'фото квартиры';
                    };
                    
                    img.onload = function() {
                        console.log(`✓ Фото ${index + 1} загружено`);
                    };
                    
                    placeholder.innerHTML = '';
                    placeholder.appendChild(img);
                }
            });
        } else {
            console.log('Нет фотографий для загрузки');
            console.log('data.images:', data.images);
        }
        
        // Скрываем секцию с текстом презентации до генерации
        if (presentationTextSection) {
            presentationTextSection.style.display = 'none';
        }
        
        console.log('✅ Поля заполнены');
    }
    
    // Обработчик загрузки данных
    function setupEventListeners() {
        if (loadButton) {
            loadButton.addEventListener('click', loadPropertyData);
            console.log('✓ Добавлен обработчик click на кнопку загрузки');
        } else {
            console.error('❌ Кнопка загрузки не найдена!');
        }
        
        // Обработчик нажатия Enter в поле ввода
        if (linkInput) {
            linkInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    console.log('Нажат Enter в поле ввода');
                    loadPropertyData();
                }
            });
            console.log('✓ Добавлен обработчик keypress на поле ввода');
        } else {
            console.error('❌ Поле ввода не найдено!');
        }
    }
    
    // Инициализация
    function init() {
        console.log('=== Инициализация pres_add.js ===');
        initElements();
        setupEventListeners();
        
        // Инициализация: скрываем кнопку генерации изначально
        if (generateButton) {
            generateButton.style.display = 'none';
            console.log('Кнопка генерации скрыта');
        }
        
        console.log('=== Инициализация завершена ===');
    }
    
    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
        console.log('DOM еще загружается, ждем DOMContentLoaded');
    } else {
        console.log('DOM уже загружен, запускаем сразу');
        init();
    }
})();
