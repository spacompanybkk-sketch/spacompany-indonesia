import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
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

const db = getFirestore(app);

// Map therapist names to their YouTube URLs
const youtubeMap = {
  'Samawan (Tuk)': 'https://www.youtube.com/watch?v=0RifIDVrAlY',
  'Thanyachol (Gin)': 'https://www.youtube.com/watch?v=b-EbwhLRZmk',
  'Nareepat (Naree)': 'https://www.youtube.com/watch?v=yOsiaNk7eb8',
  'Kanchana': 'https://www.youtube.com/watch?v=XlEA-NAeWDU',
};

async function updateVideos() {
  const snap = await getDocs(collection(db, 'therapists'));
  for (const d of snap.docs) {
    const name = d.data().name;
    if (youtubeMap[name]) {
      await updateDoc(doc(db, 'therapists', d.id), { youtubeUrl: youtubeMap[name] });
      console.log(`Updated ${name} → ${youtubeMap[name]}`);
    }
  }
  console.log('Done!');
  process.exit(0);
}

updateVideos().catch(err => { console.error(err); process.exit(1); });
