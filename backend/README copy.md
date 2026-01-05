# Forza Products - New Frontend

A modern, responsive React frontend for the Forza Products Management System built with TypeScript, Vite, and Tailwind CSS.

## 🚀 Features

- **Modern Design**: Clean, professional UI with a completely new design approach
- **Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **Fast Performance**: Built with Vite for lightning-fast development and production builds
- **Type Safety**: Full TypeScript support for better development experience
- **Component-Based**: Modular, reusable UI components
- **API Integration**: Connects to the existing Flask backend API

## 🛠 Technology Stack

- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Lucide React** - Beautiful icon library

## 📦 Installation

1. Navigate to the frontend directory:
   ```bash
   cd forza-products-new-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## 🏗 Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 🔧 Configuration

The frontend is configured to work with the existing Flask backend:

- **API Proxy**: Vite development server proxies `/api` and `/product-images` requests to `http://localhost:5000`
- **Backend Integration**: All API calls are handled through the services layer
- **Image Serving**: Product images are served from the Flask backend

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Header, Layout)
│   ├── product/        # Product-specific components
│   └── ui/             # Base UI components (Button, Card, etc.)
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # API service layer
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── assets/             # Static assets
```

## 🎨 Design Features

- **Color Scheme**: Professional blue and gray palette
- **Typography**: Inter font for excellent readability
- **Icons**: Lucide React icons for consistency
- **Spacing**: Consistent spacing using Tailwind's design system
- **Animations**: Subtle hover effects and transitions
- **Responsive Grid**: Adaptive layouts for all screen sizes

## 🔌 API Integration

The frontend connects to the existing Flask backend API endpoints:

- `GET /api/products` - Fetch all products
- `GET /api/product/{id}` - Fetch single product
- `POST /api/products` - Create new product
- `PUT /api/product/{id}` - Update product
- `DELETE /api/product/{id}` - Delete product
- `GET /api/statistics` - Get dashboard statistics
- `GET /api/images` - Get available images

## 🌟 Key Features

### Dashboard
- Overview statistics and metrics
- Brand and industry breakdown
- Recent products preview
- Quick actions and navigation

### Product Management
- Grid and list view modes
- Advanced filtering and search
- Real-time product cards
- Responsive design

### Modern UI Components
- Consistent design system
- Accessible components
- Loading states and error handling
- Professional styling

## 🚀 Getting Started

1. Ensure the Flask backend is running on `http://localhost:5000`
2. Start the frontend development server with `npm run dev`
3. The frontend will automatically proxy API requests to the backend
4. Navigate to different pages to explore the functionality

## 📝 Notes

- This is a completely new frontend with no resemblance to the previous one
- All components are built from scratch with modern React patterns
- The design focuses on usability and professional appearance
- The codebase follows TypeScript best practices for maintainability

Deployment: trigger rebuild 2025-09-23T18:32:31.4125920-04:00
