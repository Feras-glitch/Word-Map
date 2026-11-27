// نسخة احتياطية تلقائية أسبوعية على أندرويد: ملف في مجلد المستندات يبقى إن مُسحت بيانات التطبيق
import { Capacitor } from '@capacitor/core';
import { store } from './store.js';

const WEEK = 7 * 864e5;
export async function autoBackup(force = false) {
  if (!Capacitor.isNativePlatform()) return null;
  const last = store.parent.autoBackup?.at || 0;
  const hasProgress = store.profiles.some((p) => Object.keys(p.stamps || {}).length || Object.keys(p.exam || {}).length);
  if (!force && (!hasProgress || Date.now() - last < WEEK)) return null;
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const data = store.exportData();
  for (const [dir, where] of [[Directory.Documents, 'المستندات › WorldExplorer'], [Directory.External, 'ملفات التطبيق'], [Directory.Data, 'داخل التطبيق']]) {
    try {
      await Filesystem.writeFile({ path: 'WorldExplorer/world-explorer-backup.json', data, directory: dir, encoding: Encoding.UTF8, recursive: true });
      store.setParent({ autoBackup: { at: Date.now(), where } });
      return where;
    } catch { /* نجرّب المكان التالي */ }
  }
  return null;
}
