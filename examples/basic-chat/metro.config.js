const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable package exports for Better Auth and workspace packages
config.resolver.unstable_enablePackageExports = true;

// Enable following symlinks (required for pnpm workspace packages)
config.resolver.unstable_enableSymlinks = true;

// Uniwind must be the outermost wrapper
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
});
