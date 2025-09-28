# Telegram Instagram Monitor Bot

Telegram-бот для автоматического мониторинга Instagram аккаунтов и публикации новых постов и сторис в Telegram каналы.

## Возможности

- 🔍 Мониторинг до 2 Instagram аккаунтов
- 📸 Автоматическая публикация постов (фото, видео, карусели)
- 📖 Автоматическая публикация сторис
- 🚫 Защита от дубликатов
- 🔧 Администраторские команды
- 💾 Легковесное хранение данных в JSON

## Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd telegram-instagram-bot
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте конфигурационный файл:
```bash
cp config/config.example.json config/config.json
```

4. Заполните конфигурацию в `config/config.json`:
```json
{
  "telegram": {
    "botToken": "YOUR_TELEGRAM_BOT_TOKEN",
    "adminUserId": "YOUR_ADMIN_USER_ID"
  },
  "instagram": {
    "username": "YOUR_INSTAGRAM_USERNAME",
    "password": "YOUR_INSTAGRAM_PASSWORD"
  },
  "monitoring": {
    "intervalSeconds": 60,
    "enablePosts": true,
    "enableStories": true
  },
  "accounts": {
    "example_username": {
      "channelId": "@your_channel",
      "enabled": true
    }
  }
}
```

## Запуск

### Режим разработки
```bash
npm run dev
```

### Продакшн режим
```bash
npm start
```

### С PM2
```bash
npm run pm2:start
npm run pm2:stop
npm run pm2:restart
```

## Команды бота

Доступны только администратору:

- `/start` - Показать список команд
- `/add_account <username> <channel_id>` - Добавить Instagram аккаунт
- `/remove_account <username>` - Удалить аккаунт
- `/list_accounts` - Показать все отслеживаемые аккаунты
- `/status` - Показать статус бота

### Примеры команд

```
/add_account example_user @my_channel
/remove_account example_user
/list_accounts
/status
```

## Структура проекта

```
telegram-instagram-bot/
├── src/
│   ├── config/
│   │   └── configManager.js
│   ├── services/
│   │   ├── instagramService.js
│   │   ├── telegramService.js
│   │   └── monitoringService.js
│   ├── utils/
│   │   └── logger.js
│   └── index.js
├── config/
│   ├── config.json
│   └── config.example.json
├── data/
│   ├── sessions.json
│   ├── lastPosts.json
│   └── lastStories.json
├── logs/
├── package.json
├── ecosystem.config.js
└── README.md
```

## Настройка Telegram бота

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Узнайте ваш User ID (можно через [@userinfobot](https://t.me/userinfobot))
4. Добавьте бота в качестве администратора в нужные каналы

## Настройка Instagram

1. Используйте учетные данные обычного Instagram аккаунта
2. Убедитесь, что аккаунт не имеет двухфакторной аутентификации или будьте готовы к ее обработке
3. Бот автоматически сохранит сессию для избежания повторных входов

## Мониторинг и логи

Логи сохраняются в папку `logs/`:
- `error.log` - только ошибки
- `combined.log` - все логи
- `pm2-*.log` - логи PM2 (при использовании PM2)

## Безопасность

- Никогда не делитесь файлом `config/config.json`
- Используйте сильные пароли
- Регулярно проверяйте логи на подозрительную активность

## Устранение неполадок

### Ошибки авторизации Instagram
- Проверьте корректность логина и пароля
- Попробуйте войти в Instagram через браузер с того же IP
- При двухфакторной аутентификации следуйте инструкциям в логах

### Ошибки отправки в Telegram
- Убедитесь, что бот добавлен в канал как администратор
- Проверьте корректность ID канала (должен начинаться с @ или быть числовым ID)

### Проблемы с производительностью
- Увеличьте интервал мониторинга в конфигурации
- Проверьте доступную память и CPU

## Лицензия

MIT