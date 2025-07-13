import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for S3 deployment
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true
  },
  
  // Configure trailing slash for S3 compatibility
  trailingSlash: true,
  
  // Configure asset prefix for CDN (will be updated after CloudFront setup)
  // assetPrefix: process.env.NODE_ENV === 'production' ? 'https://your-cloudfront-domain.cloudfront.net' : '',
};

export default nextConfig;
