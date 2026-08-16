const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the pnpm workspace so EAS / Metro can resolve @workspace/* packages.
// Strip vitest temp dirs — they don't exist when vitest isn't running and
// cause Metro to crash with ENOENT on startup.
config.watchFolders = [workspaceRoot, ...(config.watchFolders ?? [])].filter(
  (folder) => !folder.includes('vitest_tmp'),
);

const { blockList } = config.resolver ?? {};
const existingBlockList = Array.isArray(blockList)
  ? blockList
  : blockList
    ? [blockList]
    : [];

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  blockList: [
    ...existingBlockList,
    // Ignore vitest temp directories inside pnpm store
    /node_modules\/.pnpm\/vitest[^/]*\/node_modules\/vitest_tmp.*/,
  ],
};

module.exports = config;
