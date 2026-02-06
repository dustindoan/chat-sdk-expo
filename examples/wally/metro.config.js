const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Enable package exports for Better Auth
config.resolver.unstable_enablePackageExports = true;

// Uniwind must be the outermost wrapper
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
});
