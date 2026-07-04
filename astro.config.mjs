// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://labs.stacknarrative.com',
  trailingSlash: 'always',
  output: 'server',
  adapter: cloudflare({
    imageService: 'compile'
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // React's default server renderer needs MessageChannel, which the
      // Workers runtime doesn't provide. The edge build avoids it.
      alias: {
        'react-dom/server': 'react-dom/server.edge'
      }
    }
  }
});
