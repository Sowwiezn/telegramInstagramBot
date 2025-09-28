const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const path = require('path');

class InstagramService {
  constructor(configManager, logger) {
    this.configManager = configManager;
    this.logger = logger;
    this.ig = new IgApiClient();
    this.isAuthenticated = false;
  }

  async authenticate() {
    try {
      const config = this.configManager.loadConfig();
      const { username, password } = config.instagram;

      if (!username || !password) {
        throw new Error('Instagram credentials not provided in config');
      }

      this.ig.state.generateDevice(username);

      const sessions = this.configManager.loadSessions();
      if (sessions.instagram) {
        try {
          await this.ig.state.deserialize(sessions.instagram);
          this.logger.info('Instagram session restored from file');
          this.isAuthenticated = true;
          return true;
        } catch (error) {
          this.logger.warn('Failed to restore Instagram session, performing fresh login');
        }
      }

      await this.ig.account.login(username, password);
      this.logger.info('Instagram login successful');

      const serialized = await this.ig.state.serialize();
      const sessions_new = this.configManager.loadSessions();
      sessions_new.instagram = serialized;
      this.configManager.saveSessions(sessions_new);

      this.isAuthenticated = true;
      return true;
    } catch (error) {
      this.logger.error('Instagram authentication failed:', error.message);
      this.isAuthenticated = false;

      if (error.message.includes('two-factor')) {
        this.logger.error('Two-factor authentication required. Please check your Instagram app for verification code.');
        throw new Error('Two-factor authentication required');
      }

      throw error;
    }
  }

  async handleTwoFactor(code) {
    try {
      await this.ig.account.twoFactorLogin({
        username: this.configManager.loadConfig().instagram.username,
        twoFactorIdentifier: this.ig.state.twoFactorIdentifier,
        verificationCode: code,
      });

      const serialized = await this.ig.state.serialize();
      const sessions = this.configManager.loadSessions();
      sessions.instagram = serialized;
      this.configManager.saveSessions(sessions);

      this.isAuthenticated = true;
      this.logger.info('Two-factor authentication successful');
      return true;
    } catch (error) {
      this.logger.error('Two-factor authentication failed:', error.message);
      throw error;
    }
  }

  async getUserInfo(username) {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      const user = await this.ig.user.searchExact(username);
      return user;
    } catch (error) {
      this.logger.error(`Failed to get user info for ${username}:`, error.message);
      throw error;
    }
  }

  async getLatestPosts(username, limit = 5) {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      const user = await this.getUserInfo(username);
      const feed = this.ig.feed.user(user.pk);
      const posts = await feed.items();

      return posts.slice(0, limit).map(post => ({
        id: post.id,
        code: post.code,
        caption: post.caption?.text || '',
        mediaType: post.media_type,
        imageVersions: post.image_versions2?.candidates || [],
        videoVersions: post.video_versions || [],
        carouselMedia: post.carousel_media || [],
        takenAt: post.taken_at,
        url: `https://www.instagram.com/p/${post.code}/`
      }));
    } catch (error) {
      this.logger.error(`Failed to get posts for ${username}:`, error.message);
      throw error;
    }
  }

  async getLatestStories(username) {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      const user = await this.getUserInfo(username);
      const stories = await this.ig.feed.userStory(user.pk).items();

      return stories.map(story => ({
        id: story.id,
        mediaType: story.media_type,
        imageVersions: story.image_versions2?.candidates || [],
        videoVersions: story.video_versions || [],
        takenAt: story.taken_at,
        expiringAt: story.expiring_at,
        url: `https://www.instagram.com/stories/${username}/${story.id}/`
      }));
    } catch (error) {
      this.logger.error(`Failed to get stories for ${username}:`, error.message);
      if (error.message.includes('not found')) {
        return [];
      }
      throw error;
    }
  }

  async downloadMedia(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.buffer();
    } catch (error) {
      this.logger.error(`Failed to download media from ${url}:`, error.message);
      throw error;
    }
  }

  getMediaUrl(mediaItem) {
    if (mediaItem.image_versions2?.candidates?.length > 0) {
      return mediaItem.image_versions2.candidates[0].url;
    }
    if (mediaItem.video_versions?.length > 0) {
      return mediaItem.video_versions[0].url;
    }
    return null;
  }

  isNewPost(username, postId) {
    const lastPosts = this.configManager.loadLastPosts();
    return !lastPosts[username] || lastPosts[username] !== postId;
  }

  isNewStory(username, storyId) {
    const lastStories = this.configManager.loadLastStories();
    return !lastStories[username] || !lastStories[username].includes(storyId);
  }

  markPostAsProcessed(username, postId) {
    const lastPosts = this.configManager.loadLastPosts();
    lastPosts[username] = postId;
    this.configManager.saveLastPosts(lastPosts);
  }

  markStoryAsProcessed(username, storyId) {
    const lastStories = this.configManager.loadLastStories();
    if (!lastStories[username]) {
      lastStories[username] = [];
    }

    lastStories[username].push(storyId);

    if (lastStories[username].length > 50) {
      lastStories[username] = lastStories[username].slice(-25);
    }

    this.configManager.saveLastStories(lastStories);
  }
}

module.exports = InstagramService;