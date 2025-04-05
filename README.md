# Job Aggregator Backend

This is the backend service for the Job Aggregator application, which scrapes job listings from LinkedIn, Wellfound, and Unstop.

## Deployment on Render

1. Create a [Render](https://render.com) account
2. Connect your GitHub repository
3. Create a new Web Service
4. Select your repository
5. Render will automatically detect settings from the render.yaml file
6. Set environment variables:
   - `FRONTEND_URL`: URL of your frontend (for CORS)
   - `WELLFOUND_EMAIL`: Email for Wellfound scraping
   - `WELLFOUND_PASSWORD`: Password for Wellfound scraping

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with required environment variables
4. Run development server: `npm run dev`

## Environment Variables

- `PORT`: Port for the server to run on (set by Render automatically)
- `FRONTEND_URL`: URL of your frontend (for CORS)
- `WELLFOUND_EMAIL`: Email for Wellfound scraping
- `WELLFOUND_PASSWORD`: Password for Wellfound scraping
