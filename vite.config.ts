
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  // กำหนด base path ให้ตรงกับชื่อ Repository บน GitHub Pages
  base: '/Checkin/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      // กำหนด scope ของ PWA ให้จำกัดอยู่ในโฟลเดอร์นี้
      scope: '/Checkin/',
      manifest: {
        name: 'Checkin System',
        short_name: 'Checkin',
        description: 'ระบบจัดการการเช็คอินและแข่งขัน',
        theme_color: '#2563eb',
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'portrait',
        // สำคัญ: กำหนดให้เปิดแอปที่ path นี้เสมอ
        start_url: '/Checkin/',
        scope: '/Checkin/',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': '.',
    },
  },
});
