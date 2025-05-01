# Job Aggregator Backend

This is the backend service for the Job Aggregator application, which scrapes job listings from LinkedIn.


## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with required environment variables
4. Run development server: `npm run dev`

## Browser Requirements

This application uses Puppeteer for web scraping. It requires either:

- The bundled Chromium (downloaded during installation)
- A system installation of Google Chrome or Microsoft Edge

If you encounter browser launch errors, try these steps:

1. Make sure Google Chrome is installed on your system
2. Run `npm run install-puppeteer` to force download Chromium
3. If running in a Docker container, ensure proper permissions and dependencies

## Troubleshooting

### Browser Launch Failures

If you see errors like "Failed to launch browser", try:

```bash
# Force install Chromium (bypasses system Chrome)
npm run install-puppeteer

# Verify Chrome is detected
node -e "console.log(require('puppeteer').executablePath())"
```

### On Linux

Make sure the required dependencies are installed:

```bash
sudo apt-get install -y \
  gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 \
  libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 \
  libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
  libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
  libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 \
  libnss3 lsb-release xdg-utils wget
```

## Environment Variables

- `PORT`: Port for the server to run on (set by Render automatically)
- `FRONTEND_URL`: URL of your frontend (for CORS)
- `WELLFOUND_EMAIL`: Email for Wellfound scraping
- `WELLFOUND_PASSWORD`: Password for Wellfound scraping
