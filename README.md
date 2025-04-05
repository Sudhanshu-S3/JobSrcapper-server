# Job Aggregator Backend

This is the backend service for the Job Aggregator application, which scrapes job listings from LinkedIn, Wellfound, and Unstop.

## Deployment on Railway

1. Create a Railway account at [railway.app](https://railway.app)
2. Install Railway CLI:
   ```
   npm i -g @railway/cli
   ```
3. Login to Railway:
   ```
   railway login
   ```
4. Link the project:
   ```
   railway link
   ```
5. Add environment variables:
   ```
   railway variables set FRONTEND_URL=https://your-github-username.github.io
   ```
6. Deploy:
   ```
   railway up
   ```

## Environment Variables

- `PORT`: Port for the server to run on (set by Railway automatically)
- `FRONTEND_URL`: URL of your frontend (for CORS)
- `WELLFOUND_EMAIL`: Email for Wellfound scraping
- `WELLFOUND_PASSWORD`: Password for Wellfound scraping
