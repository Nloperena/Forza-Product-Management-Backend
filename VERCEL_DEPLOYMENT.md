# Vercel Deployment Guide

This guide will help you deploy your product images to Vercel Blob storage for production use.

## 🚀 Quick Start

### 1. Set up Vercel Blob Storage

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project settings
3. Go to the "Storage" tab
4. Create a new Blob store or use an existing one
5. Copy the "Read and Write" token

### 2. Configure Environment Variables

Add your Vercel Blob token to your `.env` file:

```bash
VERCEL_BLOB_TOKEN=your_vercel_blob_token_here
```

### 3. Upload Images to Vercel

Run the upload script:

```bash
npm run upload-to-vercel
```

## 📋 Available Scripts

- `npm run setup-vercel` - Set up Vercel Blob configuration
- `npm run download-images` - Download images from WordPress to local storage
- `npm run upload-to-vercel` - Upload local images to Vercel Blob storage

## 🔄 Complete Workflow

### For Development (Local Images)
```bash
# Download images from WordPress
npm run download-images

# Images will be served from: http://localhost:5000/product-images/[filename]
```

### For Production (Vercel Blob)
```bash
# 1. Set up Vercel Blob token
npm run setup-vercel

# 2. Upload to Vercel Blob
npm run upload-to-vercel

# Images will be served from Vercel Blob URLs
```

## 📁 Image Storage Locations

### Local Development
- **Path**: `backend/public/uploads/product-images/`
- **URL**: `http://localhost:5000/product-images/[filename]`
- **Database**: `/product-images/[filename]`

### Production (Vercel Blob)
- **Storage**: Vercel Blob storage
- **URL**: `https://[blob-domain].vercel-storage.com/[filename]`
- **Database**: Full Vercel Blob URL

## 🎯 Benefits

### Local Development
- ✅ Fast local access
- ✅ No external dependencies
- ✅ Easy debugging
- ✅ No API costs

### Vercel Blob Production
- ✅ Global CDN distribution
- ✅ Automatic optimization
- ✅ Scalable storage
- ✅ Production-ready URLs

## 🔧 Troubleshooting

### Missing Vercel Token
```
❌ VERCEL_BLOB_TOKEN environment variable is required
```
**Solution**: Add your token to the `.env` file

### Upload Failures
```
❌ Upload failed: HTTP 401
```
**Solution**: Check your Vercel Blob token is correct

### Local File Not Found
```
⚠️ Local file not found
```
**Solution**: Run `npm run download-images` first

## 📊 Current Status

- ✅ **12 products** with images downloaded locally
- ✅ **Database updated** with local image paths
- ✅ **Static file serving** configured
- ⏳ **Vercel Blob upload** (run when ready for production)

## 🚀 Next Steps

1. **For Development**: Your images are ready to use locally
2. **For Production**: 
   - Set up Vercel Blob token
   - Run `npm run upload-to-vercel`
   - Deploy your application

Your product images are now properly configured for both development and production environments! 🎉
