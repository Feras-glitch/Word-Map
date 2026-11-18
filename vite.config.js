import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

// mode=single: ملف HTML واحد يحتوي كل شيء (للتجربة السريعة والنشر كصفحة)
export default defineConfig(({ mode }) => ({
  base: './',
  // رقم الإصدار نفسه في كل المنصات: يضعه سير البناء، وإلا رقم package.json
  define: { __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || pkg.version) },
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 3000,
  },
  server: { host: true },
}));
