// frontend/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Définition globale des variables d'environnement au Build
  env: {
    // Si la variable n'existe pas sur Vercel, on force une chaîne vide
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  
  // 2. Le Proxy (Rewrite) vers ton Backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://g-stock-pro-backend.vercel.app/api/:path*'
      }
    ];
  }
};

module.exports = nextConfig;