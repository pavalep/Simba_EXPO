const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');

const projectRoot = __dirname;
const mediaPlayerRoot = path.resolve(projectRoot, '../react-native-media-player');

const config = getDefaultConfig(projectRoot);

// Watch the symlinked local @simba-dev/react-native-media-player package
config.watchFolders = [mediaPlayerRoot];

// Always resolve packages (especially react & react-native) from Simba_EXPO's
// own node_modules, never from react-native-media-player/node_modules.
const escapedMediaPlayerNodeModules = path
  .join(mediaPlayerRoot, 'node_modules')
  .replace(/[/\\]/g, '[/\\\\]');

config.resolver.blockList = [
  new RegExp(`^${escapedMediaPlayerNodeModules}[/\\\\].*$`),
];

config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) => path.join(projectRoot, 'node_modules', String(name)),
  },
);

module.exports = config;
