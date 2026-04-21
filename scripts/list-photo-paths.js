import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8').split('\n').filter(l => l.includes('=')).map(l => {
    const [k, ...v] = l.split('=');
    return [k.trim(), v.join('=').trim()];
  })
);

const app = initializeApp({
  apiKey: env.PUBLIC_FIREBASE_API_KEY,
  authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore(app);
const snap = await getDocs(collection(db, 'therapists'));
const allPaths = new Set();
let count = 0;
let withPhotos = 0;

for (const d of snap.docs) {
  const data = d.data();
  if (!data.wpUserId || data.wpUserId < 1000) continue;
  count++;
  const photos = data.photos || [];
  if (photos.length > 0) withPhotos++;
  for (const url of photos) {
    const match = url.match(/\/wp-content\/uploads\/(.+)$/);
    if (match) allPaths.add(match[1]);
  }
}

console.log(`Therapists with wpUserId >= 1000: ${count}`);
console.log(`With photos: ${withPhotos}`);
console.log(`Unique photo paths: ${allPaths.size}`);

// Write paths to file
const fs = await import('fs');
fs.writeFileSync('/tmp/therapist-photo-paths.txt', [...allPaths].join('\n'));
console.log('Paths written to /tmp/therapist-photo-paths.txt');
process.exit(0);
