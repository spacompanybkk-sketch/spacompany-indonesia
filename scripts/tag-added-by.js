import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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
let updated = 0;

for (const d of snap.docs) {
  if (!d.data().addedBy) {
    await updateDoc(doc(db, 'therapists', d.id), { addedBy: 'michal@spa-company.com' });
    updated++;
  }
}

console.log(`Tagged ${updated} therapists as addedBy: michal@spa-company.com`);
process.exit(0);
