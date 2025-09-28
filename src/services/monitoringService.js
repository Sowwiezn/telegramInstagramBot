class MonitoringService {
  constructor(instagramService, telegramService, configManager, logger) {
    this.instagramService = instagramService;
    this.telegramService = telegramService;
    this.configManager = configManager;
    this.logger = logger;
  }

  async checkForNewPosts() {
    const config = this.configManager.loadConfig();

    if (!config.monitoring.enablePosts) {
      return;
    }

    const accounts = this.configManager.getAccounts();

    for (const [username, accountConfig] of Object.entries(accounts)) {
      if (!accountConfig.enabled) {
        continue;
      }

      try {
        this.logger.info(`Checking new posts for ${username}`);

        const posts = await this.instagramService.getLatestPosts(username, 1);

        if (posts.length === 0) {
          continue;
        }

        const latestPost = posts[0];

        if (this.instagramService.isNewPost(username, latestPost.id)) {
          this.logger.info(`New post found for ${username}: ${latestPost.id}`);

          await this.telegramService.sendPost(latestPost, accountConfig.channelId, username);
          this.instagramService.markPostAsProcessed(username, latestPost.id);

          this.logger.info(`Post ${latestPost.id} sent to channel ${accountConfig.channelId}`);
        }
      } catch (error) {
        this.logger.error(`Error checking posts for ${username}:`, error.message);
      }
    }
  }

  async checkForNewStories() {
    const config = this.configManager.loadConfig();

    if (!config.monitoring.enableStories) {
      return;
    }

    const accounts = this.configManager.getAccounts();

    for (const [username, accountConfig] of Object.entries(accounts)) {
      if (!accountConfig.enabled) {
        continue;
      }

      try {
        this.logger.info(`Checking new stories for ${username}`);

        const stories = await this.instagramService.getLatestStories(username);

        for (const story of stories) {
          if (this.instagramService.isNewStory(username, story.id)) {
            this.logger.info(`New story found for ${username}: ${story.id}`);

            await this.telegramService.sendStory(story, accountConfig.channelId, username);
            this.instagramService.markStoryAsProcessed(username, story.id);

            this.logger.info(`Story ${story.id} sent to channel ${accountConfig.channelId}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error checking stories for ${username}:`, error.message);
      }
    }
  }

  async runMonitoring() {
    try {
      this.logger.info('Starting monitoring cycle');

      await Promise.allSettled([
        this.checkForNewPosts(),
        this.checkForNewStories()
      ]);

      this.logger.info('Monitoring cycle completed');
    } catch (error) {
      this.logger.error('Error in monitoring cycle:', error.message);
    }
  }

  getStatus() {
    const lastPosts = this.configManager.loadLastPosts();
    const lastStories = this.configManager.loadLastStories();
    const accounts = this.configManager.getAccounts();

    const status = {
      accounts: {},
      totalAccounts: Object.keys(accounts).length,
      enabledAccounts: Object.values(accounts).filter(acc => acc.enabled).length
    };

    for (const [username, accountConfig] of Object.entries(accounts)) {
      status.accounts[username] = {
        enabled: accountConfig.enabled,
        channelId: accountConfig.channelId,
        lastPostId: lastPosts[username] || 'None',
        lastStoriesCount: lastStories[username] ? lastStories[username].length : 0
      };
    }

    return status;
  }
}

module.exports = MonitoringService;