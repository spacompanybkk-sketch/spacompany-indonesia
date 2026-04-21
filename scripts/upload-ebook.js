import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.PUBLIC_FIREBASE_APP_ID,
});

const storage = getStorage(app);

const pdfPath = process.argv[2];
if (!pdfPath) { console.error('Usage: node scripts/upload-ebook.js <path-to-pdf>'); process.exit(1); }

const fileBuffer = readFileSync(pdfPath);
const storageRef = ref(storage, 'ebooks/HTRS_ebook.pdf');

console.log('Uploading ebook to Firebase Storage...');
const snap = await uploadBytes(storageRef, fileBuffer, { contentType: 'application/pdf' });
const url = await getDownloadURL(snap.ref);
console.log('Upload complete!');
console.log('Download URL:', url);
process.exit(0);
