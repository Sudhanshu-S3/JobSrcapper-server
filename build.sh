#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Install dependencies
npm install

# Install necessary dependencies for Chrome/Puppeteer on Render
echo "Installing Chrome dependencies..."
apt-get update && apt-get install -y \
  gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 \
  libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 \
  libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
  libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
  libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 \
  libnss3 lsb-release xdg-utils wget || true

# Create a public directory if it doesn't exist
mkdir -p src/public

echo "Build completed successfully!"