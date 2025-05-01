#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Install dependencies
npm install

# Create a public directory if it doesn't exist
mkdir -p src/public

# Copy static files (if any) - uncomment if needed
# cp -r static/* public/

echo "Build completed successfully!"
