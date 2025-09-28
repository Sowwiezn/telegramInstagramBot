const { Telegraf } = require('telegraf');
const axios = require('axios');

class TelegramService {
  constructor(configManager, logger) {
    this.configManager = configManager;
    this.logger = logger;
    this.bot = null;
  }

  initialize() {
    const config = this.configManager.loadConfig();

    if (!config.telegram.botToken) {
      throw new Error('Telegram bot token not provided in config');
    }

    this.bot = new Telegraf(config.telegram.botToken);
    this.logger.info('Telegram bot initialized');
  }

  async sendPost(post, channelId, username) {
    try {
      let caption = `📸 Новый пост от @${username}\n\n`;

      if (post.caption) {
        caption += `${post.caption}\n\n`;
      }

      caption += `🔗 ${post.url}`;

      if (post.carouselMedia && post.carouselMedia.length > 1) {
        await this.sendCarousel(post.carouselMedia, channelId, caption);
      } else if (post.mediaType === 2 && post.videoVersions.length > 0) {
        await this.sendVideo(post.videoVersions[0].url, channelId, caption);
      } else if (post.imageVersions.length > 0) {
        await this.sendPhoto(post.imageVersions[0].url, channelId, caption);
      } else {
        await this.bot.telegram.sendMessage(channelId, caption);
      }

      this.logger.info(`Post sent to channel ${channelId}`);
    } catch (error) {
      this.logger.error(`Failed to send post to ${channelId}:`, error.message);
      throw error;
    }
  }

  async sendStory(story, channelId, username) {
    try {
      let caption = `📖 Новая сторис от @${username}\n\n`;
      caption += `🔗 ${story.url}`;

      if (story.mediaType === 2 && story.videoVersions.length > 0) {
        await this.sendVideo(story.videoVersions[0].url, channelId, caption);
      } else if (story.imageVersions.length > 0) {
        await this.sendPhoto(story.imageVersions[0].url, channelId, caption);
      } else {
        await this.bot.telegram.sendMessage(channelId, caption);
      }

      this.logger.info(`Story sent to channel ${channelId}`);
    } catch (error) {
      this.logger.error(`Failed to send story to ${channelId}:`, error.message);
      throw error;
    }
  }

  async sendPhoto(photoUrl, channelId, caption) {
    try {
      const response = await axios.get(photoUrl, { responseType: 'stream' });

      await this.bot.telegram.sendPhoto(channelId, {
        source: response.data
      }, {
        caption: caption,
        parse_mode: 'HTML'
      });
    } catch (error) {
      this.logger.error(`Failed to send photo:`, error.message);
      await this.bot.telegram.sendMessage(channelId, `${caption}\n\n📷 Фото: ${photoUrl}`);
    }
  }

  async sendVideo(videoUrl, channelId, caption) {
    try {
      const response = await axios.get(videoUrl, { responseType: 'stream' });

      await this.bot.telegram.sendVideo(channelId, {
        source: response.data
      }, {
        caption: caption,
        parse_mode: 'HTML'
      });
    } catch (error) {
      this.logger.error(`Failed to send video:`, error.message);
      await this.bot.telegram.sendMessage(channelId, `${caption}\n\n🎬 Видео: ${videoUrl}`);
    }
  }

  async sendCarousel(carouselMedia, channelId, caption) {
    try {
      const mediaGroup = [];

      for (let i = 0; i < Math.min(carouselMedia.length, 10); i++) {
        const media = carouselMedia[i];

        if (media.image_versions2?.candidates?.length > 0) {
          const response = await axios.get(media.image_versions2.candidates[0].url, { responseType: 'stream' });

          mediaGroup.push({
            type: 'photo',
            media: { source: response.data },
            caption: i === 0 ? caption : undefined
          });
        } else if (media.video_versions?.length > 0) {
          const response = await axios.get(media.video_versions[0].url, { responseType: 'stream' });

          mediaGroup.push({
            type: 'video',
            media: { source: response.data },
            caption: i === 0 ? caption : undefined
          });
        }
      }

      if (mediaGroup.length > 0) {
        await this.bot.telegram.sendMediaGroup(channelId, mediaGroup);
      } else {
        await this.bot.telegram.sendMessage(channelId, caption);
      }
    } catch (error) {
      this.logger.error(`Failed to send carousel:`, error.message);
      await this.bot.telegram.sendMessage(channelId, caption);
    }
  }

  async sendMessage(chatId, message) {
    try {
      await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      this.logger.error(`Failed to send message to ${chatId}:`, error.message);
      throw error;
    }
  }

  setupAdminCommands(monitoringService) {
    const config = this.configManager.loadConfig();
    const adminUserId = config.telegram.adminUserId;

    // Установка меню команд
    this.bot.telegram.setMyCommands([
      { command: 'start', description: '🏠 Главное меню' },
      { command: 'add_account', description: '➕ Добавить аккаунт' },
      { command: 'remove_account', description: '➖ Удалить аккаунт' },
      { command: 'list_accounts', description: '📋 Список аккаунтов' },
      { command: 'status', description: '📊 Статус бота' }
    ]);

    this.bot.command('start', (ctx) => {
      if (ctx.from.id.toString() === adminUserId) {
        ctx.reply('🤖 Instagram Monitor Bot\n\nДоступные команды:\n/add_account - добавить аккаунт\n/remove_account - удалить аккаунт\n/list_accounts - список аккаунтов\n/status - статус бота');
      } else {
        ctx.reply('❌ У вас нет доступа к этому боту');
      }
    });

    this.bot.command('add_account', (ctx) => {
      if (ctx.from.id.toString() !== adminUserId) {
        return ctx.reply('❌ У вас нет доступа к этой команде');
      }

      const args = ctx.message.text.split(' ').slice(1);
      if (args.length < 2) {
        return ctx.reply('❌ Использование: /add_account <username> <channel_id>\nПример: /add_account example_user @my_channel');
      }

      const [username, channelId] = args;

      try {
        this.configManager.addAccount(username, channelId);
        ctx.reply(`✅ Аккаунт @${username} добавлен для канала ${channelId}`);
        this.logger.info(`Account ${username} added by admin ${ctx.from.id}`);
      } catch (error) {
        ctx.reply(`❌ Ошибка при добавлении аккаунта: ${error.message}`);
      }
    });

    this.bot.command('remove_account', (ctx) => {
      if (ctx.from.id.toString() !== adminUserId) {
        return ctx.reply('❌ У вас нет доступа к этой команде');
      }

      const args = ctx.message.text.split(' ').slice(1);
      if (args.length < 1) {
        return ctx.reply('❌ Использование: /remove_account <username>\nПример: /remove_account example_user');
      }

      const username = args[0];

      try {
        this.configManager.removeAccount(username);
        ctx.reply(`✅ Аккаунт @${username} удален`);
        this.logger.info(`Account ${username} removed by admin ${ctx.from.id}`);
      } catch (error) {
        ctx.reply(`❌ Ошибка при удалении аккаунта: ${error.message}`);
      }
    });

    this.bot.command('list_accounts', (ctx) => {
      if (ctx.from.id.toString() !== adminUserId) {
        return ctx.reply('❌ У вас нет доступа к этой команде');
      }

      try {
        const accounts = this.configManager.getAccounts();

        if (Object.keys(accounts).length === 0) {
          return ctx.reply('📋 Список аккаунтов пуст');
        }

        let message = '📋 Отслеживаемые аккаунты:\n\n';

        for (const [username, config] of Object.entries(accounts)) {
          const status = config.enabled ? '✅' : '❌';
          message += `${status} @${username} → ${config.channelId}\n`;
        }

        ctx.reply(message);
      } catch (error) {
        ctx.reply(`❌ Ошибка при получении списка: ${error.message}`);
      }
    });

    this.bot.command('status', (ctx) => {
      if (ctx.from.id.toString() !== adminUserId) {
        return ctx.reply('❌ У вас нет доступа к этой команде');
      }

      try {
        const status = monitoringService.getStatus();

        let message = `🤖 Статус бота:\n\n`;
        message += `📊 Всего аккаунтов: ${status.totalAccounts}\n`;
        message += `✅ Активных: ${status.enabledAccounts}\n\n`;

        if (status.totalAccounts > 0) {
          message += `📋 Детали:\n`;
          for (const [username, accountStatus] of Object.entries(status.accounts)) {
            const statusEmoji = accountStatus.enabled ? '✅' : '❌';
            message += `${statusEmoji} @${username}\n`;
            message += `   Канал: ${accountStatus.channelId}\n`;
            message += `   Последний пост: ${accountStatus.lastPostId}\n`;
            message += `   Сторис: ${accountStatus.lastStoriesCount}\n\n`;
          }
        }

        ctx.reply(message);
      } catch (error) {
        ctx.reply(`❌ Ошибка при получении статуса: ${error.message}`);
      }
    });
  }

  start() {
    this.bot.launch();
    this.logger.info('Telegram bot started');
  }

  stop() {
    if (this.bot) {
      this.bot.stop();
      this.logger.info('Telegram bot stopped');
    }
  }
}

module.exports = TelegramService;