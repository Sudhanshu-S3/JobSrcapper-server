const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing dependencies...');

// Check if --force-chromium flag is present
const forceChromium = process.argv.includes('--force-chromium');

try {
    // Install npm dependencies
    execSync('npm install', { stdio: 'inherit' });

    // Create cache directory for Puppeteer
    const cacheDir = path.join(__dirname, '.cache', 'puppeteer');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log(`Created Puppeteer cache directory: ${cacheDir}`);
    }

    // Handle forced Chromium installation
    if (forceChromium) {
        console.log('Force installing Chromium for Puppeteer...');
        try {
            // Set environment variable to skip Chrome download check
            const env = { ...process.env, PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: '' };
            delete env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD;

            // Re-install puppeteer to force Chromium download
            execSync('npm uninstall puppeteer && npm install puppeteer', {
                stdio: 'inherit',
                env
            });
            console.log('Chromium installation completed!');
        } catch (e) {
            console.log('Failed to force install Chromium:', e.message);
        }
    }

    // Try to launch Puppeteer to verify installation
    console.log('Testing Puppeteer installation...');
    try {
        execSync('node -e "require(\'puppeteer\').launch({headless: \'new\'}).then(b => b.close())"', { stdio: 'inherit' });
        console.log('Puppeteer works correctly!');
    } catch (e) {
        console.log('Warning: Puppeteer installation test failed. This might be due to:');
        console.log('1. Missing Chromium - the app will try to use system Chrome');
        console.log('2. System permissions - try running as administrator/sudo');
        console.log('Error details:', e.message);

        if (!forceChromium) {
            console.log('\nYou can try to force install Chromium with: npm run install-puppeteer');
        }
    }

    console.log('\n⚠️ IMPORTANT: This application uses Puppeteer which requires Chrome/Chromium.');
    console.log('If you have Chrome installed on your system, the app will try to use it.');
    console.log('Otherwise, please install Google Chrome or run with proper permissions.\n');

    console.log('Installation completed successfully!');
    console.log('Run the server with: npm run dev');
} catch (error) {
    console.error('Installation failed:', error.message);
    process.exit(1);
}
