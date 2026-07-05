// proposal.js - Логика страницы коммерческого предложения

// Инициализация AI Витрины
const aiVitrina = new AiVitrina({
    triggerSelector: '#aiVitrinaTrigger'
});

// Переключение кнопок способов отправки
document.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// Счетчик символов в заметке
const textarea = document.querySelector('.textarea');
const charCount = document.querySelector('.char-count');

textarea.addEventListener('input', function() {
    charCount.textContent = this.value.length + '/400';
});

// Обработка формы отправки
const form = document.getElementById('proposalForm');
if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();
        
        if (!url) {
            alert('Введите ссылку на объявление');
            return;
        }

        // Валидация URL
        try {
            new URL(url);
        } catch {
            alert('Введите корректный URL');
            return;
        }

        // Проверка на поддерживаемые сайты
        const supportedSites = ['avito.ru', 'cian.ru', 'domofond.ru'];
        const isSupported = supportedSites.some(site => url.includes(site));
        
        if (!isSupported) {
            alert('Поддерживаются только Avito, ЦИАН и Домофонд');
            return;
        }

        // Здесь можно добавить логику отправки формы
        console.log('Отправка предложения для:', url);
    });
}
