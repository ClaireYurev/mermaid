const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clean dist directory
console.log('Cleaning dist directory...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}

// Run webpack build
console.log('Running webpack build...');
execSync('webpack --mode production', { stdio: 'inherit' });

// Run electron-builder
console.log('Running electron-builder...');
execSync('electron-builder', { stdio: 'inherit' });