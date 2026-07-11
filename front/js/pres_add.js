// pres_add.js — new presentation page script
(function () {
    'use strict';
    
    console.log('pres_add.js загружен');
    
    // Элементы DOM
    let linkInput, loadButton, generateButton;
    let titleElement, roomsElement, floorElement, areaElement;
    let priceElement, pricePerSqmElement, addressElement, descriptionElement;
    let photoPlaceholders, presentationTextSection;
    let scenarioSection, scenarioView, scenarioEdit, editScenarioBtn, saveScenarioBtn, cancelEditBtn;
    let generatePresentationBtn, nSlidesInput, templateSelect, exportAsSelect, toneSelect;
    let authUsername, authPassword;
    
    // Текущие данные объекта
    let currentPropertyData = null;
    let currentScenario = '';
    let isEditing = false;
    let presentationToken = null; // Токен для сервиса генерации
    
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
        
        // Элементы для сценария
        scenarioSection = document.getElementById('scenarioSection');
        scenarioView = document.getElementById('scenarioView');
        scenarioEdit = document.getElementById('scenarioEdit');
        editScenarioBtn = document.getElementById('editScenarioBtn');
        saveScenarioBtn = document.getElementById('saveScenarioBtn');
        cancelEditBtn = document.getElementById('cancelEditBtn');
        
        // Элементы для генерации презентации
        generatePresentationBtn = document.getElementById('generatePresentationBtn');
        nSlidesInput = document.getElementById('nSlidesInput');
        templateSelect = document.getElementById('templateSelect');
        exportAsSelect = document.getElementById('exportAsSelect');
        toneSelect = document.getElementById('toneSelect');
        
        // Элементы авторизации
        authUsername = document.getElementById('authUsername');
        authPassword = document.getElementById('authPassword');
        
        console.log('Элементы найдены:', {
            linkInput: !!linkInput,
            loadButton: !!loadButton,
            generateButton: !!generateButton,
            scenarioSection: !!scenarioSection,
            scenarioView: !!scenarioView,
            scenarioEdit: !!scenarioEdit,
            editScenarioBtn: !!editScenarioBtn,
            generatePresentationBtn: !!generatePresentationBtn,
            authUsername: !!authUsername,
            authPassword: !!authPassword
        });
        
        // Проверяем, есть ли сохраненный токен в sessionStorage
        presentationToken = sessionStorage.getItem('presentation_token');
        if (presentationToken) {
            console.log('✓ Найден сохраненный токен для сервиса генерации');
        }
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
        
        // Скрываем секцию сценария при новой загрузке
        if (scenarioSection) {
            scenarioSection.style.display = 'none';
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
            
            // Показываем кнопку генерации сценария
            if (generateButton) {
                generateButton.style.display = 'inline-block';
                console.log('Кнопка генерации сценария показана');
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
        
        if (updateElement(titleElement, data.title || 'Квартира')) updatedCount++;
        if (updateElement(roomsElement, data.rooms)) updatedCount++;
        if (updateElement(floorElement, data.floor)) updatedCount++;
        
        const areaText = data.area ? data.area + ' кв.м.' : null;
        if (updateElement(areaElement, areaText)) updatedCount++;
        if (updateElement(priceElement, data.price, formatPrice)) updatedCount++;
        if (updateElement(pricePerSqmElement, data.price_per_sqm, formatPrice)) updatedCount++;
        if (updateElement(addressElement, data.address)) updatedCount++;
        if (updateElement(descriptionElement, data.description)) updatedCount++;
        
        console.log(`Обновлено элементов: ${updatedCount} из 8`);
        
        // Фотографии
        if (photoPlaceholders.length > 0 && data.images && data.images.length > 0) {
            console.log('📷 Загрузка фотографий:', data.images.length, 'шт.');
            
            photoPlaceholders.forEach((placeholder, index) => {
                if (data.images[index]) {
                    let imagePath = data.images[index];
                    if (imagePath.startsWith('static/')) {
                        imagePath = imagePath.substring(7);
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
        }
        
        console.log('✅ Поля заполнены');
    }
    
    // Генерация сценария презентации
    async function generateScenario() {
        console.log('generateScenario вызвана');
        
        if (!currentPropertyData) {
            alert('Сначала загрузите данные квартиры');
            return;
        }
        
        const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('access_token');
        
        if (!token) {
            alert('Необходимо войти в систему');
            return;
        }
        
        // Формируем данные для отправки
        const payload = {
            id: currentPropertyData.id || '',
            title: currentPropertyData.title || '',
            address: currentPropertyData.address || '',
            price: String(currentPropertyData.price || ''),
            source: currentPropertyData.source || ''
        };
        
        console.log('📤 Отправляемые данные:', JSON.stringify(payload, null, 2));
        
        // Показываем секцию сценария
        if (scenarioSection) {
            scenarioSection.style.display = 'block';
        }
        
        // Показываем спиннер загрузки внутри контейнера
        if (scenarioView) {
            scenarioView.innerHTML = `
                <div class="scenario-loading">
                    <div class="spinner"></div>
                    <span>Генерация сценария презентации...</span>
                </div>
            `;
        }
        
        // Скрываем кнопку генерации презентации
        if (generatePresentationBtn) {
            generatePresentationBtn.style.display = 'none';
        }
        
        // Блокируем кнопку генерации сценария
        if (generateButton) {
            generateButton.disabled = true;
            generateButton.textContent = 'Генерация...';
        }
        
        try {
            const response = await fetch('https://graniai.server72.ru/ai_gen/presa/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Статус ответа сценария:', response.status);
            
            if (response.status === 401 || response.status === 403) {
                alert('Ошибка авторизации. Пожалуйста, войдите снова.');
                if (scenarioSection) scenarioSection.style.display = 'none';
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка ответа сценария:', errorText);
                throw new Error('Ошибка при генерации сценария: ' + response.status);
            }
            
            // Ответ приходит как строка (возможно JSON)
            const responseText = await response.text();
            console.log('✅ Сценарий получен, длина:', responseText.length);
            
            // Пытаемся распарсить JSON
            let scenarioText = responseText;
            try {
                const parsed = JSON.parse(responseText);
                if (parsed.text) {
                    scenarioText = parsed.text;
                } else if (parsed.scenario) {
                    scenarioText = parsed.scenario;
                } else {
                    scenarioText = JSON.stringify(parsed, null, 2);
                }
            } catch (e) {
                console.log('Ответ не является JSON, используем как текст');
            }
            
            // Обрабатываем escape-последовательности
            scenarioText = scenarioText.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
            
            console.log('📝 Финальный текст сценария:', scenarioText.substring(0, 100) + '...');
            
            // Сохраняем сценарий
            currentScenario = scenarioText;
            
            // Отображаем сценарий
            if (scenarioView) {
                scenarioView.textContent = scenarioText;
            }
            if (scenarioEdit) {
                scenarioEdit.value = scenarioText;
            }
            
            // Показываем кнопку генерации презентации
            if (generatePresentationBtn) {
                generatePresentationBtn.style.display = 'inline-block';
                console.log('Кнопка генерации презентации показана');
            }
            
        } catch (error) {
            console.error('❌ Ошибка генерации сценария:', error);
            if (scenarioView) {
                scenarioView.innerHTML = '<div style="color: #ef4444; padding: 20px 0;">Ошибка при генерации сценария. Попробуйте снова.</div>';
            }
            alert('Не удалось сгенерировать сценарий. Попробуйте снова.');
        } finally {
            // Возвращаем кнопку в исходное состояние
            if (generateButton) {
                generateButton.disabled = false;
                generateButton.textContent = 'Сгенерировать сценарий презентации';
            }
        }
    }
    
    // Авторизация в сервисе генерации
    async function authenticatePresentationService() {
        const username = authUsername ? authUsername.value.trim() : 'neutrino';
        const password = authPassword ? authPassword.value : 'G7L2J3P726a/';
        
        if (!username || !password) {
            alert('Пожалуйста, введите username и password для сервиса генерации');
            return null;
        }
        
        console.log(' Выполняем авторизацию в сервисе генерации...');
        
        try {
            const response = await fetch('http://81.26.189.36:5001/api/v1/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            console.log('Статус ответа авторизации:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка авторизации:', errorText);
                throw new Error('Ошибка авторизации: ' + response.status);
            }
            
            const data = await response.json();
            console.log('✅ Авторизация успешна:', data);
            
            // Извлекаем токен (проверяем разные возможные поля)
            const token = data.access_token || data.token || data.jwt;
            
            if (!token) {
                console.error('Токен не найден в ответе:', data);
                throw new Error('Токен не получен от сервера');
            }
            
            // Сохраняем токен в sessionStorage (сессия пользователя)
            sessionStorage.setItem('presentation_token', token);
            presentationToken = token;
            
            console.log('✓ Токен сохранен в sessionStorage');
            
            return token;
            
        } catch (error) {
            console.error('❌ Ошибка авторизации:', error);
            alert('Не удалось авторизоваться в сервисе генерации. Проверьте username и password.');
            return null;
        }
    }
    
    // Редактирование сценария
    function enableEditing() {
        if (!scenarioView || !scenarioEdit || !editScenarioBtn || !saveScenarioBtn || !cancelEditBtn) {
            console.error('Элементы для редактирования не найдены');
            return;
        }
        
        isEditing = true;
        
        // Показываем textarea с текущим сценарием
        scenarioEdit.value = currentScenario;
        scenarioView.style.display = 'none';
        scenarioEdit.style.display = 'block';
        editScenarioBtn.style.display = 'none';
        saveScenarioBtn.parentElement.style.display = 'flex';
        
        // Фокус на textarea
        setTimeout(() => scenarioEdit.focus(), 100);
    }
    
    function saveEditing() {
        if (!scenarioEdit || !scenarioView || !editScenarioBtn) return;
        
        currentScenario = scenarioEdit.value.trim();
        
        scenarioView.textContent = currentScenario;
        scenarioEdit.style.display = 'none';
        scenarioView.style.display = 'block';
        editScenarioBtn.style.display = 'inline-block';
        saveScenarioBtn.parentElement.style.display = 'none';
        
        isEditing = false;
    }
    
    function cancelEditing() {
        if (!scenarioEdit || !scenarioView || !editScenarioBtn) return;
        
        // Восстанавливаем оригинальный сценарий
        scenarioEdit.value = currentScenario;
        scenarioEdit.style.display = 'none';
        scenarioView.style.display = 'block';
        editScenarioBtn.style.display = 'inline-block';
        saveScenarioBtn.parentElement.style.display = 'none';
        
        isEditing = false;
    }
    
    // Генерация презентации
    async function generatePresentation() {
        console.log('generatePresentation вызвана');
        
        if (!currentScenario) {
            alert('Сначала сгенерируйте сценарий презентации');
            return;
        }
        
        // Проверяем, есть ли токен, если нет - выполняем авторизацию
        if (!presentationToken) {
            console.log('Токен не найден, выполняем авторизацию...');
            presentationToken = await authenticatePresentationService();
            
            if (!presentationToken) {
                return; // Авторизация не удалась
            }
        }
        
        // Получаем значения из полей настроек
        const nSlides = parseInt(nSlidesInput?.value) || 6;
        const template = templateSelect?.value || 'general';
        const exportAs = exportAsSelect?.value || 'pptx';
        const tone = toneSelect?.value || 'default';
        
        // Формируем payload
        const payload = {
            content: currentScenario,
            slides_markdown: [],
            instructions: "Создать профессиональную презентацию для недвижимости",
            tone: tone,
            verbosity: "standard",
            web_search: true,
            n_slides: nSlides,
            language: "ru",
            template: template,
            include_table_of_contents: false,
            include_title_slide: true,
            files: [],
            export_as: exportAs,
            trigger_webhook: false
        };
        
        console.log('📤 Отправка данных для генерации презентации:', JSON.stringify(payload, null, 2));
        
        // Показываем загрузку на кнопке
        if (generatePresentationBtn) {
            generatePresentationBtn.disabled = true;
            generatePresentationBtn.innerHTML = '<span class="loading-spinner"></span>Генерация...';
        }
        
        // Скрываем кнопку скачивания если она была показана
        const downloadSection = document.getElementById('downloadSection');
        if (downloadSection) {
            downloadSection.style.display = 'none';
        }
        
        try {
            // Шаг 1: Генерация презентации
            const response = await fetch('http://81.26.189.36:5001/api/v1/ppt/presentation/generate/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${presentationToken}`
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Статус ответа презентации:', response.status);
            
            if (response.status === 401 || response.status === 403) {
                alert('Ошибка авторизации. Токен мог истечь. Пожалуйста, введите username и password снова.');
                sessionStorage.removeItem('presentation_token');
                presentationToken = null;
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка ответа презентации:', errorText);
                throw new Error('Ошибка при генерации презентации: ' + response.status);
            }
            
            // Получаем файл как blob
            const blob = await response.blob();
            console.log('✅ Презентация сгенерирована, размер:', blob.size, 'байт');
            
            // Определяем расширение и MIME-тип
            const fileExtension = exportAs === 'pptx' ? 'pptx' : 'pdf';
            const mimeType = exportAs === 'pptx' 
                ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
                : 'application/pdf';
            
            // Формируем имя файла
            const propertyId = currentPropertyData?.id || 'property';
            const timestamp = Date.now();
            const fileName = `presentation_${propertyId}_${timestamp}.${fileExtension}`;
            
            // Шаг 2: Загрузка файла на бекенд через /upload/pdf/{filename}
            console.log(' Загрузка файла на бекенд:', fileName);
            
            const formData = new FormData();
            formData.append('file', blob, fileName);
            
            const uploadResponse = await fetch(`https://graniai.server72.ru/upload/pdf/${encodeURIComponent(fileName)}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${typeof getToken === 'function' ? getToken() : localStorage.getItem('access_token')}`
                },
                body: formData
            });
            
            console.log('Статус загрузки на бекенд:', uploadResponse.status);
            
            if (!uploadResponse.ok) {
                const uploadErrorText = await uploadResponse.text();
                console.error('Ошибка загрузки на бекенд:', uploadErrorText);
                throw new Error('Ошибка при загрузке файла на сервер: ' + uploadResponse.status);
            }
            
            const uploadResult = await uploadResponse.json();
            console.log('✅ Файл загружен на бекенд:', uploadResult);
            
            // Получаем путь к файлу из ответа
            const filePath = uploadResult.path || uploadResult.edit_path;
            
            if (filePath) {
                // Настраиваем кнопку скачивания
                const downloadBtn = document.getElementById('downloadPdfBtn');
                if (downloadBtn) {
                    // Если путь относительный - добавляем базовый URL бекенда
                    const downloadUrl = filePath.startsWith('http') 
                        ? filePath 
                        : `https://graniai.server72.ru${filePath.startsWith('/') ? '' : '/'}${filePath}`;
                    
                    downloadBtn.href = downloadUrl;
                    downloadBtn.download = fileName;
                    
                    console.log('🔗 Ссылка для скачивания:', downloadUrl);
                }
                
                // Показываем кнопку скачивания
                if (downloadSection) {
                    downloadSection.style.display = 'flex';
                    console.log('Кнопка скачивания показана');
                }
            } else {
                console.warn('️ Путь к файлу не найден в ответе, скачиваем локально');
                // Фоллбэк: скачиваем файл напрямую из blob
                downloadBlobLocally(blob, fileName);
            }
            
            alert('Презентация успешно сгенерирована и загружена на сервер!');
            
        } catch (error) {
            console.error('❌ Ошибка генерации презентации:', error);
            alert('Не удалось сгенерировать презентацию. Попробуйте снова.');
        } finally {
            // Возвращаем кнопку в исходное состояние
            if (generatePresentationBtn) {
                generatePresentationBtn.disabled = false;
                generatePresentationBtn.textContent = 'Сгенерировать презентацию';
            }
        }
    }

    // Вспомогательная функция для скачивания blob локально (фоллбэк)
    function downloadBlobLocally(blob, fileName) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        }, 100);
    }
    
    // Обработчик загрузки данных
    function setupEventListeners() {
        if (loadButton) {
            loadButton.addEventListener('click', loadPropertyData);
            console.log('✓ Добавлен обработчик click на кнопку загрузки');
        }
        
        if (linkInput) {
            linkInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    loadPropertyData();
                }
            });
            console.log('✓ Добавлен обработчик keypress на поле ввода');
        }
        
        // Обработчик генерации сценария
        if (generateButton) {
            generateButton.addEventListener('click', generateScenario);
            console.log('✓ Добавлен обработчик click на кнопку генерации сценария');
        }
        
        // Обработчики редактирования сценария
        if (editScenarioBtn) {
            editScenarioBtn.addEventListener('click', enableEditing);
            console.log('✓ Добавлен обработчик click на кнопку редактирования');
        }
        
        if (saveScenarioBtn) {
            saveScenarioBtn.addEventListener('click', saveEditing);
            console.log('✓ Добавлен обработчик click на кнопку сохранения');
        }
        
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', cancelEditing);
            console.log('✓ Добавлен обработчик click на кнопку отмены');
        }
        
        // Обработчик генерации презентации
        if (generatePresentationBtn) {
            generatePresentationBtn.addEventListener('click', generatePresentation);
            console.log('✓ Добавлен обработчик click на кнопку генерации презентации');
        }
    }
    
    // Инициализация
    function init() {
        console.log('=== Инициализация pres_add.js ===');
        initElements();
        setupEventListeners();
        
        // Инициализация: скрываем кнопку генерации сценария изначально
        if (generateButton) {
            generateButton.style.display = 'none';
            console.log('Кнопка генерации сценария скрыта');
        }
        
        // Скрываем секцию сценария
        if (scenarioSection) {
            scenarioSection.style.display = 'none';
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
