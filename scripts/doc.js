#!/usr/bin/env node

'use strict';

const fs = require('mz/fs');
const co = require('co');
const rimraf = require('rimraf');
const runscript = require('runscript');
const ghpages = require('gh-pages');
const path = require('path');

const BRANCH = 'test';
const command = process.argv[2];

co(function* () {
  const exists = yield fs.exists('node_modules');
  if (!exists) {
    throw new Error('should run `npm install` first');
  }

  console.log('Copying CONTRIBUTING.md');
  yield copyFile('CONTRIBUTING.md', 'docs/source/contributing.md');
  yield copyFile('CONTRIBUTING.zh-CN.md', 'docs/source/zh-cn/contributing.md');

  yield rm('docs/public');
  yield runscript('npminstall', { cwd: 'docs' });

  switch (command) {
    case 'server':
      yield runscript('hexo --cwd docs server -l');
      break;
    case 'build':
      yield runscript('hexo --cwd docs generate --force');
      break;
    case 'deploy':
      yield runscript('hexo --cwd docs generate --force');
      yield deploy();
      break;
    case 'travis-deploy':
      yield runscript('hexo --cwd docs generate --force');
      yield deployTravis();
      break;
    default:
  }
}).catch(err => {
  console.error(err.stack);
  process.exit(1);
});

function* deploy() {
  console.log('Pushing to %s', BRANCH);
  yield publish('docs/public', {
    logger(message) { console.log(message); },
    BRANCH,
    user: {
      name: 'Auto Doc Publisher',
      email: 'docs@egg.com',
    },
  });
}

// https://gist.github.com/domenic/ec8b0fc8ab45f39403dd#sign-up-for-travis-and-add-your-project
function* deployTravis() {
  console.log('Pushing to %s', BRANCH);
  let repo = yield runscript('git config remote.origin.url', { stdio: 'pipe' });
  repo = repo.stdout.toString().slice(0, -1);
  if (/^http/.test(repo)) {
    repo = repo.replace('https://github.com/', 'git@github.com:');
  }
  const key = `$encrypted_${process.env.ENCRYPTION_LABEL}_key`;
  const iv = `$encrypted_${process.env.ENCRYPTION_LABEL}_iv`;
  const enc = 'scripts/deploy_key.enc';
  yield runscript(`openssl aes-256-cbc -K ${key} -iv ${iv} -in ${enc} -out deploy_key -d`);
  yield runscript('chmod 600 deploy_key');

  process.env.GIT_SSH = path.join(__dirname, 'ssh.js');
  process.env.DEPLOY_KEY = path.join(process.cwd(), 'deploy_key');
  yield publish('docs/public', {
    logger(message) { console.log(message); },
    user: {
      name: 'Travis CI',
      email: 'docs@egg.com',
    },
    BRANCH,
    repo,
  });
}

function* copyFile(src, dist) {
  const buf = yield fs.readFile(src);
  yield fs.writeFile(dist, buf);
}

function rm(dir) {
  return done => rimraf(dir, done);
}

function publish(basePath, options) {
  return done => ghpages.publish(basePath, options, done);
}
