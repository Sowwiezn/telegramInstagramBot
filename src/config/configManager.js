const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '../../config/config.json');
    this.dataPath = path.join(__dirname, '../../data');
    this.sessionsPath = path.join(this.dataPath, 'sessions.json');
    this.lastPostsPath = path.join(this.dataPath, 'lastPosts.json');
    this.lastStoriesPath = path.join(this.dataPath, 'lastStories.json');

    this.ensureDataDirectory();
    this.ensureDataFiles();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  ensureDataFiles() {
    const defaultFiles = [
      { path: this.sessionsPath, content: '{}' },
      { path: this.lastPostsPath, content: '{}' },
      { path: this.lastStoriesPath, content: '{}' }
    ];

    defaultFiles.forEach(file => {
      if (!fs.existsSync(file.path)) {
        fs.writeFileSync(file.path, file.content, 'utf8');
      }
    });
  }

  loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Config file not found at ${this.configPath}. Please copy config.example.json to config.json and fill in your credentials.`);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  saveConfig(config) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  loadSessions() {
    try {
      const data = fs.readFileSync(this.sessionsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  saveSessions(sessions) {
    try {
      fs.writeFileSync(this.sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save sessions: ${error.message}`);
    }
  }

  loadLastPosts() {
    try {
      const data = fs.readFileSync(this.lastPostsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  saveLastPosts(lastPosts) {
    try {
      fs.writeFileSync(this.lastPostsPath, JSON.stringify(lastPosts, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save last posts: ${error.message}`);
    }
  }

  loadLastStories() {
    try {
      const data = fs.readFileSync(this.lastStoriesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  saveLastStories(lastStories) {
    try {
      fs.writeFileSync(this.lastStoriesPath, JSON.stringify(lastStories, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save last stories: ${error.message}`);
    }
  }

  addAccount(username, channelId) {
    const config = this.loadConfig();
    config.accounts[username] = {
      channelId: channelId,
      enabled: true
    };
    this.saveConfig(config);
  }

  removeAccount(username) {
    const config = this.loadConfig();
    delete config.accounts[username];
    this.saveConfig(config);
  }

  getAccounts() {
    const config = this.loadConfig();
    return config.accounts || {};
  }

  isAccountEnabled(username) {
    const accounts = this.getAccounts();
    return accounts[username] && accounts[username].enabled;
  }
}

module.exports = ConfigManager;