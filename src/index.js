const cron = require('node-cron');
const ConfigManager = require('./config/configManager');
const InstagramService = require('./services/instagramService');
const TelegramService = require('./services/telegramService');
const MonitoringService = require('./services/monitoringService');
const Logger = require('./utils/logger');

class InstagramTelegramBot {
  constructor() {
    this.logger = new Logger();
    this.configManager = new ConfigManager();
    this.instagramService = null;
    this.telegramService = null;
    this.monitoringService = null;
    this.cronJob = null;
  }

  async initialize() {
    try {
      this.logger.info('Starting Instagram Telegram Bot...');

      const config = this.configManager.loadConfig();

      this.instagramService = new InstagramService(this.configManager, this.logger);
      this.telegramService = new TelegramService(this.configManager, this.logger);

      this.telegramService.initialize();

      this.monitoringService = new MonitoringService(
        this.instagramService,
        this.telegramService,
        this.configManager,
        this.logger
      );

      this.telegramService.setupAdminCommands(this.monitoringService);

      // Skip Instagram auth if credentials are empty
      if (config.instagram.username && config.instagram.password) {
        await this.instagramService.authenticate();
      } else {
        this.logger.info('Instagram credentials not provided, skipping authentication');
      }

      this.setupScheduler(config.monitoring.intervalSeconds);

      this.telegramService.start();

      this.setupGracefulShutdown();

      this.logger.info('Bot initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize bot:', error);
      process.exit(1);
    }
  }

  setupScheduler(intervalSeconds) {
    const cronExpression = `*/${intervalSeconds} * * * * *`;

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.monitoringService.runMonitoring();
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.logger.info(`Monitoring scheduled every ${intervalSeconds} seconds`);
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.logger.info(`Received ${signal}, shutting down gracefully...`);

      if (this.cronJob) {
        this.cronJob.stop();
      }

      if (this.telegramService) {
        this.telegramService.stop();
      }

      this.logger.info('Bot stopped');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  async start() {
    await this.initialize();
  }
}

const bot = new InstagramTelegramBot();
bot.start();