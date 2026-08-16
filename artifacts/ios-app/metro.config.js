const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude vitest temp dirs (created by the api-server test suite) from
// Metro's file watcher — they don't exist when vitest isn't running and
// cause Metro to crash with ENOENT on startup.
config.watchFolders = (config.watchFolders ?? []).filter(
  (folder) => !folder.includes('vitest_tmp'),
);

// Also tell Metro's resolver to block-list paths it should never watch.
const { blockList } = config.resolver ?? {};
const existingBlockList = Array.isArray(blockList)
  ? blockList
  : blockList
  ? [blockList]
  : [];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...existingBlockList,
    // Ignore vitest temp directories inside pnpm store
    /node_modules\/.pnpm\/vitest[^/]*\/node_modules\/vitest_tmp.*/,
  ],
};

module.exports = config;
