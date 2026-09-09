const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.platform === 'win32') {
  config.server.unstable_serverRoot = __dirname;
}

module.exports = config;
