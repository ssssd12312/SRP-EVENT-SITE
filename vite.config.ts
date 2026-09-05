import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      deny: [
        '.env',
        '.env.*',
        '**/*.{crt,pem,key,sqlite,sqlite-wal,sqlite-shm}',
        '**/.git/**',
        '**/.data/**',
        '**/server/**',
        '**/tests/**',
      ],
    },
  },
  build: { sourcemap: false },
});
