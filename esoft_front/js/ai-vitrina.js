class AiVitrina {
    constructor(options = {}) {
        this.triggerSelector = options.triggerSelector || '#aiVitrinaTrigger';
        this.panel = null;
        this.overlay = null;
        this.isOpen = false;
        this.init();
    }

    init() {
        this.injectStyles();
        this.bindEvents();
    }

    injectStyles() {
        const styles = `
            .ai-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.3);
                z-index: 200;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
            }
            .ai-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
            .ai-vitrina {
                position: fixed;
                top: 0;
                right: -420px;
                width: 420px;
                height: 100vh;
                background: white;
                box-shadow: -2px 0 10px rgba(0,0,0,0.1);
                z-index: 300;
                display: flex;
                transition: right 0.3s ease;
            }
            .ai-vitrina.active {
                right: 0;
            }
            .ai-nav {
                width: 40px;
                background: #f8f9fa;
                border-right: 1px solid #e5e7eb;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 15px 0;
                gap: 8px;
            }
            .ai-nav-item {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 6px;
                color: #666;
                position: relative;
            }
            .ai-nav-item:hover { background: #e5e7eb; }
            .ai-nav-item.active { background: #3b82f6; color: white; }
            .ai-nav-item .tooltip {
                position: absolute;
                left: 40px;
                background: #333;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s;
            }
            .ai-nav-item:hover .tooltip { opacity: 1; }
            .ai-nav-spacer { flex: 1; }
            .ai-nav-avatar { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; }
            .ai-nav-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .ai-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            .ai-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .ai-header h2 {
                font-size: 18px;
                font-weight: 600;
            }
            .ai-header-actions {
                display: flex;
                gap: 10px;
            }
            .ai-icon-btn {
                width: 32px;
                height: 32px;
                border: none;
                background: transparent;
                cursor: pointer;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
            }
            .ai-icon-btn:hover { background: #f3f4f6; }
            .ai-hero {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 25px;
            }
            .ai-hero-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #ef4444;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                flex-shrink: 0;
            }
            .ai-hero-text {
                font-size: 14px;
                font-weight: 600;
                color: #333;
                line-height: 1.4;
            }
            .ai-section-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 12px;
                color: #333;
            }
            .ai-card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                overflow: hidden;
                margin-bottom: 15px;
                cursor: pointer;
                transition: box-shadow 0.2s;
            }
            .ai-card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .ai-card-img {
                width: 100%;
                height: 140px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
            }
            .ai-card-badge {
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(255,255,255,0.9);
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                color: #666;
            }
            .ai-card-body {
                padding: 12px 15px;
            }
            .ai-card-title {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 6px;
                color: #333;
            }
            .ai-card-desc {
                font-size: 12px;
                color: #666;
                line-height: 1.4;
            }
            .ai-view {
                display: none;
            }
            .ai-view.active {
                display: block;
            }
            .ai-presentation-panel {
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                padding: 15px;
                background: #fff;
            }
            .ai-presentation-lead {
                font-size: 13px;
                line-height: 1.45;
                color: #4b5563;
                margin-bottom: 16px;
            }
            .ai-field {
                margin-bottom: 14px;
            }
            .ai-field label {
                display: block;
                margin-bottom: 7px;
                font-size: 13px;
                font-weight: 600;
                color: #374151;
            }
            .ai-select {
                width: 100%;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 10px 12px;
                font-size: 13px;
                color: #111827;
                background: white;
            }
            .ai-select:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
            }
            .ai-input {
                width: 100%;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 10px 12px;
                font-size: 13px;
                color: #111827;
                background: white;
            }
            .ai-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
            }
            .ai-selected-apartment {
                display: none;
                border: 1px solid #dbeafe;
                border-radius: 8px;
                padding: 12px;
                background: #eff6ff;
                margin-bottom: 14px;
            }
            .ai-selected-apartment.active {
                display: block;
            }
            .ai-selected-title {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 5px;
            }
            .ai-selected-meta {
                font-size: 12px;
                color: #4b5563;
                line-height: 1.45;
            }
            .ai-generate-btn {
                display: none;
                width: 100%;
                border: none;
                border-radius: 8px;
                padding: 12px;
                background: #3b82f6;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            .ai-generate-btn.active {
                display: block;
            }
            .ai-generate-btn:hover {
                background: #2563eb;
            }
            .ai-empty-note {
                padding: 14px;
                border-radius: 8px;
                background: #f9fafb;
                color: #6b7280;
                font-size: 13px;
                line-height: 1.45;
            }
            .ai-loading-container {
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                text-align: center;
            }
            .ai-loading-container.active {
                display: flex;
            }
            .ai-loading-spinner {
                width: 48px;
                height: 48px;
                border: 4px solid #e5e7eb;
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: ai-spin 0.8s linear infinite;
                margin-bottom: 16px;
            }
            @keyframes ai-spin {
                to { transform: rotate(360deg); }
            }
            .ai-loading-text {
                font-size: 14px;
                color: #6b7280;
                line-height: 1.5;
            }
            .ai-result-container {
                display: none;
            }
            .ai-result-container.active {
                display: block;
            }
            .ai-result-text {
                width: 100%;
                min-height: 300px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 12px;
                font-size: 13px;
                line-height: 1.6;
                color: #111827;
                background: #f9fafb;
                resize: vertical;
                font-family: inherit;
                margin-bottom: 12px;
            }
            .ai-result-text:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
            }
            .ai-presentation-options {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 14px;
                background: #f9fafb;
                margin-bottom: 14px;
            }
            .ai-presentation-options-title {
                font-size: 13px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 12px;
            }
            .ai-options-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            .ai-options-grid .ai-field {
                margin-bottom: 0;
            }
            .ai-result-actions {
                display: flex;
                gap: 10px;
            }
            .ai-back-btn {
                flex: 1;
                border: 1px solid #d1d5db;
                background: white;
                border-radius: 8px;
                padding: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                color: #374151;
                transition: background 0.2s;
            }
            .ai-back-btn:hover {
                background: #f3f4f6;
            }
            .ai-generate-pdf-btn {
                flex: 1;
                border: none;
                border-radius: 8px;
                padding: 12px;
                background: #10b981;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            .ai-generate-pdf-btn:hover {
                background: #059669;
            }
            .ai-generate-pdf-btn:disabled {
                background: #9ca3af;
                cursor: not-allowed;
            }
        `;
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    bindEvents() {
        const trigger = document.querySelector(this.triggerSelector);
        if (trigger) {
            trigger.addEventListener('click', () => this.toggle());
        }
    }

    createPanel() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'ai-overlay';
        this.overlay.addEventListener('click', () => this.close());
        document.body.appendChild(this.overlay);
        
        this.panel = document.createElement('div');
        this.panel.className = 'ai-vitrina';
        this.panel.innerHTML = this.getPanelHTML();
        document.body.appendChild(this.panel);
        
        this.bindPanelEvents();
    }

    getPanelHTML() {
        return `
            <div class="ai-nav">
                <div class="ai-nav-item active" data-view="home">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                    <span class="tooltip">Чаты</span>
                </div>
                <div class="ai-nav-item" data-view="editor">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    <span class="tooltip">Редактор</span>
                </div>
                <div class="ai-nav-item" data-view="ideas">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/></svg>
                    <span class="tooltip">Идеи</span>
                </div>
                <div class="ai-nav-item" data-view="gallery">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    <span class="tooltip">Галерея</span>
                </div>
                <div class="ai-nav-item" data-view="calendar">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                    <span class="tooltip">Календарь</span>
                </div>
                <div class="ai-nav-item" data-view="presentation">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 4h18v12H3V4zm2 2v8h14V6H5zm4 12h6l2 2H7l2-2zM8 8h8v2H8V8zm0 3h5v1.5H8V11z"/></svg>
                    <span class="tooltip">Презентация</span>
                </div>
                <div class="ai-nav-spacer"></div>
                <div class="ai-nav-item" data-view="send">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    <span class="tooltip">Отправить</span>
                </div>
                <div class="ai-nav-item" data-view="help">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                    <span class="tooltip">Помощь</span>
                </div>
                <div class="ai-nav-item" data-view="status">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    <span class="tooltip">Статус</span>
                </div>
                <div class="ai-nav-item" data-view="info">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    <span class="tooltip">Информация</span>
                </div>
                <div class="ai-nav-avatar">
                    <img src="https://placehold.co/40x40/cccccc/ffffff?text=U" alt="User">
                </div>
            </div>
            <div class="ai-content">
                <div class="ai-header">
                    <h2>AI Витрина</h2>
                    <div class="ai-header-actions">
                        <button class="ai-icon-btn" title="Развернуть">
                            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                        </button>
                        <button class="ai-icon-btn" id="closeAiVitrina" title="Закрыть">
                            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="ai-view active" data-view-panel="home">
                    <div class="ai-hero">
                        <div class="ai-hero-avatar">AI</div>
                        <div class="ai-hero-text">Все нужные инструменты для агента недвижимости — в одном сервисе</div>
                    </div>
                    <div class="ai-section-title">Чаты</div>
                    <div class="ai-card">
                        <div class="ai-card-img" style="background: linear-gradient(135deg, #fde8e8 0%, #f5c6c6 100%);">
                            <div style="font-size: 80px; opacity: 0.4;">AI</div>
                            <div class="ai-card-badge">Генератор сторис</div>
                        </div>
                        <div class="ai-card-body">
                            <div class="ai-card-title">Чат с нейросетью</div>
                            <div class="ai-card-desc">Задавайте любые вопросы, уточняйте детали, просите объяснить сложное простыми словами или помочь с идеями</div>
                        </div>
                    </div>
                    <div class="ai-card">
                        <div class="ai-card-img" style="background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);">
                            <div style="font-size: 54px; opacity: 0.45;">Объект</div>
                        </div>
                        <div class="ai-card-body">
                            <div class="ai-card-title">Генератор описаний</div>
                            <div class="ai-card-desc">Введите ID объекта недвижимости, бот сделает описание на основе данных из «Космоса»</div>
                        </div>
                    </div>
                    <div class="ai-section-title" style="margin-top: 20px;">AI-инструменты</div>
                    <div class="ai-card">
                        <div class="ai-card-img" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
                            <div style="font-size: 54px; opacity: 0.45;">Голос</div>
                        </div>
                        <div class="ai-card-body">
                            <div class="ai-card-title">Голосовой помощник</div>
                            <div class="ai-card-desc">Озвучьте задачу — AI выполнит её за вас</div>
                        </div>
                    </div>
                </div>
                <div class="ai-view" data-view-panel="presentation">
                    <div class="ai-hero">
                        <div class="ai-hero-avatar">AI</div>
                        <div class="ai-hero-text">Создание презентации по выбранной квартире</div>
                    </div>
                    <div class="ai-section-title">Презентация</div>
                    <div class="ai-presentation-panel">
                        <div class="ai-presentation-form" id="presentationForm">
                            <div class="ai-presentation-lead">
                                Выберите объект из текущей подборки. После выбора станет доступна подготовка презентации.
                            </div>
                            <div class="ai-field" id="presentationApartmentField">
                                <label for="presentationApartmentSelect">Квартира</label>
                                <select class="ai-select" id="presentationApartmentSelect">
                                    <option value="">Выберите квартиру</option>
                                </select>
                            </div>
                            <div class="ai-empty-note" id="presentationEmptyNote">
                                В подборке пока нет квартир. Добавьте объект на странице корзины, затем вернитесь в этот раздел.
                            </div>
                            <div class="ai-selected-apartment" id="selectedApartmentPreview">
                                <div class="ai-selected-title" id="selectedApartmentTitle"></div>
                                <div class="ai-selected-meta" id="selectedApartmentMeta"></div>
                            </div>
                            <button class="ai-generate-btn" id="generatePresentationBtn">Сгенерировать</button>
                        </div>
                        <div class="ai-loading-container" id="presentationLoading">
                            <div class="ai-loading-spinner"></div>
                            <div class="ai-loading-text">Генерируем презентацию...<br>Это займёт пару минут</div>
                        </div>
                        <div class="ai-result-container" id="presentationResult">
                            <div class="ai-section-title" style="margin-bottom: 10px;">Текст презентации</div>
                            <textarea class="ai-result-text" id="presentationText" readonly></textarea>
                            
                            <div class="ai-presentation-options">
                                <div class="ai-presentation-options-title">Параметры генерации PDF</div>
                                <div class="ai-options-grid">
                                    <div class="ai-field">
                                        <label for="pdfExportAs">Формат</label>
                                        <select class="ai-select" id="pdfExportAs">
                                            <option value="pptx">PPTX</option>
                                            <option value="pdf">PDF</option>
                                        </select>
                                    </div>
                                    <div class="ai-field">
                                        <label for="pdfTemplate">Шаблон</label>
                                        <select class="ai-select" id="pdfTemplate">
                                            <option value="general">General</option>
                                            <option value="business">Business</option>
                                            <option value="minimal">Minimal</option>
                                        </select>
                                    </div>
                                    <div class="ai-field">
                                        <label for="pdfTone">Тон</label>
                                        <select class="ai-select" id="pdfTone">
                                            <option value="default">Default</option>
                                            <option value="formal">Formal</option>
                                            <option value="casual">Casual</option>
                                        </select>
                                    </div>
                                    <div class="ai-field">
                                        <label for="pdfNSlides">Кол-во слайдов</label>
                                        <input type="number" class="ai-input" id="pdfNSlides" value="10" min="1" max="50">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="ai-result-actions">
                                <button class="ai-back-btn" id="presentationBackBtn">Назад</button>
                                <button class="ai-generate-pdf-btn" id="generatePdfBtn">Сгенерировать PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindPanelEvents() {
        const closeBtn = this.panel.querySelector('#closeAiVitrina');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        const navItems = this.panel.querySelectorAll('.ai-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                this.setActiveView(item.dataset.view || 'home');
            });
        });
        
        const apartmentSelect = this.panel.querySelector('#presentationApartmentSelect');
        if (apartmentSelect) {
            apartmentSelect.addEventListener('change', () => this.updateSelectedApartment());
        }
        
        const generateBtn = this.panel.querySelector('#generatePresentationBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.handleGeneratePresentation());
        }
        
        const backBtn = this.panel.querySelector('#presentationBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.handleBackToForm());
        }
        
        const pdfBtn = this.panel.querySelector('#generatePdfBtn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => this.handleGeneratePdf());
        }
    }

    setActiveView(viewName) {
        const targetView = viewName === 'presentation' ? 'presentation' : 'home';
        this.panel.querySelectorAll('.ai-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        this.panel.querySelectorAll('.ai-view').forEach(view => {
            view.classList.toggle('active', view.dataset.viewPanel === targetView);
        });
        if (targetView === 'presentation') {
            this.renderPresentationApartments();
        }
    }

    renderPresentationApartments() {
        const apartments = this.getCartApartments();
        const select = this.panel.querySelector('#presentationApartmentSelect');
        const field = this.panel.querySelector('#presentationApartmentField');
        const emptyNote = this.panel.querySelector('#presentationEmptyNote');
        
        if (!select || !field || !emptyNote) return;
        
        const selectedValue = select.value;
        select.innerHTML = '<option value="">Выберите квартиру</option>';
        
        apartments.forEach(apartment => {
            const option = document.createElement('option');
            option.value = apartment.id;
            option.textContent = apartment.title;
            select.appendChild(option);
        });
        
        if (apartments.some(apartment => apartment.id === selectedValue)) {
            select.value = selectedValue;
        }
        
        field.style.display = apartments.length ? 'block' : 'none';
        emptyNote.style.display = apartments.length ? 'none' : 'block';
        this.updateSelectedApartment();
    }

    getCartApartments() {
        return Array.from(document.querySelectorAll('#tableBody tr[data-apartment-id]')).map(row => {
            const title = row.querySelector('.addr')?.textContent.trim() || 'Квартира';
            const address = row.querySelector('.district')?.textContent.trim() || 'Адрес не указан';
            const price = row.children[2]?.innerText.split('\n')[0].trim() || '';
            const source = row.querySelector('.author')?.textContent.trim() || '';
            return {
                id: row.dataset.apartmentId,
                title,
                address,
                price,
                source
            };
        });
    }

    updateSelectedApartment() {
        const select = this.panel.querySelector('#presentationApartmentSelect');
        const preview = this.panel.querySelector('#selectedApartmentPreview');
        const title = this.panel.querySelector('#selectedApartmentTitle');
        const meta = this.panel.querySelector('#selectedApartmentMeta');
        const generateBtn = this.panel.querySelector('#generatePresentationBtn');
        
        if (!select || !preview || !title || !meta || !generateBtn) return;
        
        const apartment = this.getCartApartments().find(item => item.id === select.value);
        
        if (!apartment) {
            preview.classList.remove('active');
            generateBtn.classList.remove('active');
            title.textContent = '';
            meta.textContent = '';
            return;
        }
        
        title.textContent = apartment.title;
        meta.textContent = [apartment.address, apartment.price, apartment.source]
            .filter(Boolean)
            .join(' · ');
        preview.classList.add('active');
        generateBtn.classList.add('active');
    }

    handleGeneratePresentation() {
        const select = this.panel.querySelector('#presentationApartmentSelect');
        if (!select || !select.value) return;
        
        const apartment = this.getCartApartments().find(item => item.id === select.value);
        if (!apartment) return;
        
        const form = this.panel.querySelector('#presentationForm');
        const loading = this.panel.querySelector('#presentationLoading');
        const result = this.panel.querySelector('#presentationResult');
        
        form.style.display = 'none';
        loading.classList.add('active');
        
        const API_BASE = '';
        
        fetch(`${API_BASE}/ai_gen/presa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apartment),
        })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`);
                }
                return response.json();
            })
            .then(data => {
                const text = data.text || data.presentation || data.content || '';
                if (!text) {
                    throw new Error('Сервер вернул пустой ответ');
                }
                
                loading.classList.remove('active');
                result.classList.add('active');
                
                const textArea = this.panel.querySelector('#presentationText');
                if (textArea) {
                    textArea.value = text;
                }
            })
            .catch(err => {
                console.error('Ошибка генерации презентации:', err);
                alert('Ошибка: ' + err.message);
                
                loading.classList.remove('active');
                form.style.display = 'block';
            });
    }

    handleBackToForm() {
        const form = this.panel.querySelector('#presentationForm');
        const result = this.panel.querySelector('#presentationResult');
        
        result.classList.remove('active');
        form.style.display = 'block';
    }

    handleGeneratePdf() {
        const textArea = this.panel.querySelector('#presentationText');
        const content = textArea ? textArea.value : '';
        
        if (!content) {
            alert('Текст презентации пуст');
            return;
        }
        
        const exportAs = this.panel.querySelector('#pdfExportAs').value;
        const template = this.panel.querySelector('#pdfTemplate').value;
        const tone = this.panel.querySelector('#pdfTone').value;
        const nSlides = parseInt(this.panel.querySelector('#pdfNSlides').value) || 10;
        
        const pdfBtn = this.panel.querySelector('#generatePdfBtn');
        const originalText = pdfBtn.textContent;
        pdfBtn.disabled = true;
        pdfBtn.textContent = 'Авторизация...';
        
        // Шаг 1: Авторизация для получения JWT токена
        fetch('http://127.0.0.1:5001/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'snow1x',
                password: 'scoray_y1t'
            })
        })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Ошибка авторизации: ${response.status} - ${errorText}`);
                }
                return response.json();
            })
            .then(authData => {
                // Извлекаем JWT токен (обычно в поле access_token или token)
                const token = authData.access_token || authData.token || authData.accessToken || '';
                if (!token) {
                    throw new Error('JWT токен не получен от сервера');
                }
                
                console.log('Успешная авторизация, получен JWT токен');
                
                // Меняем текст кнопки перед вторым запросом
                pdfBtn.textContent = 'Генерация...';
                
                // Шаг 2: Генерация презентации с JWT токеном в заголовке Bearer
                const requestBody = {
                    content: content,
                    slides_markdown: [],
                    instructions: "Создай профессиональную презентацию для недвижимости",
                    tone: tone,
                    verbosity: "standard",
                    web_search: false,
                    n_slides: nSlides,
                    language: "ru",
                    template: template,
                    include_table_of_contents: false,
                    include_title_slide: true,
                    files: [],
                    export_as: exportAs,
                    trigger_webhook: false
                };
                
                return fetch('http://127.0.0.1:5001/api/v1/ppt/presentation/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestBody),
                });
            })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Ошибка генерации: ${response.status} - ${errorText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Презентация успешно сгенерирована:', data);
                alert('Презентация успешно сгенерирована!');
                
                pdfBtn.disabled = false;
                pdfBtn.textContent = originalText;
                
                // Если есть ссылка на скачивание - открываем её
                if (data.download_url || data.file_url) {
                    window.open(data.download_url || data.file_url, '_blank');
                }
            })
            .catch(err => {
                console.error('Ошибка:', err);
                alert('Ошибка: ' + err.message);
                
                pdfBtn.disabled = false;
                pdfBtn.textContent = originalText;
            });
    }

    open() {
        if (!this.panel) {
            this.createPanel();
        }
        this.renderPresentationApartments();
        this.panel.classList.add('active');
        this.overlay.classList.add('active');
        this.isOpen = true;
    }

    close() {
        if (this.panel) {
            this.panel.classList.remove('active');
        }
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        this.isOpen = false;
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    destroy() {
        if (this.panel) this.panel.remove();
        if (this.overlay) this.overlay.remove();
    }
}

if (typeof window !== 'undefined') {
    window.AiVitrina = AiVitrina;
}
