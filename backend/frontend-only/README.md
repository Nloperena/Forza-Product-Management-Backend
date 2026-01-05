# Product Management System - Frontend

This is a frontend-only deployment of the Product Management System, configured to work with mock data for demonstration purposes.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/your-repo)

## 📋 Manual Deployment Steps

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to the frontend-only directory:
   ```bash
   cd frontend-only
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your Git repository
4. Set the **Root Directory** to `frontend-only`
5. Vercel will auto-detect the React/Vite framework settings
6. Click "Deploy"

## 🛠 Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## 🎯 Demo Mode Features

This frontend deployment runs in **demo mode** with:
- Mock product data
- Simulated API delays for realistic experience
- All CRUD operations work but don't persist data
- Image uploads are simulated

## 🔄 API Environment Toggle

The application includes a toggle switch in the header that allows you to switch between:
- **Local API** (http://localhost:5000) - for local development
- **Heroku API** - for production testing

The toggle switch:
- Remembers your preference in localStorage
- Updates all API calls instantly when switched
- Shows visual indicators (Server icon for local, Cloud icon for Heroku)
- Is located in the top-right corner of the header

## 🔧 Configuration

- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Build Output**: `dist/` directory
- **Mock Data**: Located in `src/services/mockData.ts`
- **API Toggle**: Switch between local and Heroku APIs via header toggle

## 📁 Project Structure

```
frontend-only/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── layout/     # Layout components (Header, Layout)
│   │   ├── product/    # Product-specific components
│   │   └── ui/         # Reusable UI components (Button, Card, etc.)
│   ├── contexts/       # React contexts (ApiContext)
│   ├── pages/          # Page components
│   ├── services/       # API and mock data
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── vercel.json         # Vercel configuration
└── package.json        # Dependencies
```

## 🚨 Important Notes

- This is a **demo version** - data changes are not persisted
- For production use with a real backend, modify `src/services/api.ts`
- The app is optimized for modern browsers
- All API calls include simulated delays for realistic UX

## 🔗 Converting to Full-Stack

To connect this frontend to a real backend:

1. Update `IS_DEMO_MODE` to `false` in `src/services/api.ts`
2. Replace mock API calls with real HTTP requests
3. Configure your backend URL in the API service
4. Update Vercel configuration if needed for API routes
