// frontend/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Intercepte toutes les requêtes frontend commençant par /api/
        source: '/api/:path*',
        // Et les redirige silencieusement vers ton backend
        // 🔴 ATTENTION : Remplace cette URL par l'URL exacte de ton backend
        destination: 'https://g-stock-pro-backend.vercel.app/api/:path*' 
      }
    ];
  }
};

module.exports = nextConfig;