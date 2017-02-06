#!/usr/bin/env node

'use strict';

const spawn = require('child_process').spawn;

console.log('Got deploy_key %s in ssh.js', process.env.DEPLOY_KEY);
const args = [
  '-o', 'StrictHostKeyChecking=no',
  '-i', process.env.DEPLOY_KEY,
].concat(process.argv.slice(2));
const opt = {
  stdio: 'inherit',
};

spawn('ssh', args, opt);
