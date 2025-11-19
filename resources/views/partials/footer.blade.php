<!-- FOOTER -->
<footer class="footer">
    <div class="footer-content-inner">
        <div class="footer-section">
            <h3 class="footer-section-title">Продукт</h3>
            <ul class="footer-list">
                <li><a href="{{ route('configurator') }}">Конфигуратор</a></li>
                <li><a href="{{ route('landing') }}#documentation">Документация</a></li>
            </ul>
        </div>
        <div class="footer-section">
            <h3 class="footer-section-title">Ресурсы</h3>
            <ul class="footer-list">
                <li><a href="#">Блог</a></li>
                <li><a href="#">FAQ</a></li>
            </ul>
        </div>
        <div class="footer-section">
            <h3 class="footer-section-title">О нас</h3>
            <ul class="footer-list">
                <li><a href="#">О компании</a></li>
                <li><a href="#">Команда</a></li>
            </ul>
        </div>
        <div class="footer-section">
            <h3 class="footer-section-title">Контакты</h3>
            <ul class="footer-list">
                <li><a href="mailto:info@3dcabinet.ru">Email</a></li>
                <li><a href="tel:+74951234567">Телефон</a></li>
            </ul>
        </div>
        <div class="footer-copyright">
            <!-- Уменьшенная иконка логотипа слева -->
            <div class="footer-logo">
                <svg class="icon-logo-box-left" width="20" height="20" role="img">
                    <use xlink:href="#icon-logo-box-left"></use>
                </svg>
                <svg class="icon-logo-box-right" width="20" height="20" role="img">
                    <use xlink:href="#icon-logo-box-right"></use>
                </svg>
                <svg class="icon-logo-digits" width="35" height="35" role="img">
                    <use xlink:href="#icon-logo-digits"></use>
                </svg>
            </div>
            <!-- Текст копирайта справа -->
            <p>&copy; {{ date('Y') }} 3D Cabinet. Все права защищены.</p>
        </div>            
    </div>
</footer>

@push('scripts')
    <script src="{{ asset('js/landing/footer-collapse.js') }}" defer></script>
@endpush
