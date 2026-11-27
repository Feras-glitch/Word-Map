import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };
import { execFileSync } from 'node:child_process';

// في الملف الواحد تُصغَّر الصور (المعالم والصور الثانية والحيوانات) حتى يبقى حجم الصفحة معقولاً؛
// تطبيقا أندرويد وويندوز يحملان الصور بدقتها الكاملة.
const smallPhotos = () => ({
  name: 'small-photos', enforce: 'pre',
  load(id) {
    const m = id.match(/^(.*\/(?:landmark|second|animal)-img\/[^?]+\.jpg)\?url$/);
    if (!m) return null;
    let buf; try { buf = execFileSync('convert', [m[1], '-resize', '400x300', '-strip', '-quality', '58', 'jpg:-']); } catch { return null; }
    return 'export default ' + JSON.stringify('data:image/jpeg;base64,' + buf.toString('base64'));
  },
});

// mode=single: ملف HTML واحد يحتوي كل شيء (للتجربة السريعة والنشر كصفحة)
export default defineConfig(({ mode }) => ({
  base: './',
  // رقم الإصدار نفسه في كل المنصات: يضعه سير البناء، وإلا رقم package.json
  define: { __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || pkg.version) },
  plugins: mode === 'single' ? [smallPhotos(), viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 3000,
  },
  server: { host: true },
}));
