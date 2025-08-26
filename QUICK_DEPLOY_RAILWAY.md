# Quick Railway Deployment

## Railway Setup (5 minutes)
1. Go to https://railway.app and sign up with GitHub
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js and deploy

## Environment Variables
Add these in Railway dashboard:
```
DATABASE_URL=postgresql://postgres:Supriya123@35.239.108.141:5432/tallyToCash?sslmode=disable
NODE_ENV=production
PORT=$PORT
```

## Access
Your team will get a URL like: `https://your-app-name.railway.app`

## Cost
- Free tier: 500 execution hours/month
- Perfect for team development
