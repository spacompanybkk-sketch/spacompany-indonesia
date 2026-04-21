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
  messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

const BASE = 'https://spa-company.com/therapist/?id=';

function parseRatings(html) {
  const ratingKeys = ['Communication','Appearance','Pro Activity','Experience','Massage Skills'];
  const ratings = { communication: 0, appearance: 0, proactivity: 0, experience: 0, massageSkills: 0 };
  for (const key of ratingKeys) {
    const m = html.match(new RegExp('section_headline">\\s*' + key + '\\s*<\\/div>[\\s\\S]*?<span>(\\d{1,2})<br', 'i'));
    if (m) {
      const fieldKey = key === 'Pro Activity' ? 'proactivity' : key === 'Massage Skills' ? 'massageSkills' : key.toLowerCase();
      ratings[fieldKey] = parseInt(m[1]);
    }
  }
  return ratings;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function updateAll() {
  const snap = await getDocs(collection(db, 'therapists'));
  const therapists = snap.docs
    .map(d => ({ docId: d.id, ...d.data() }))
    .filter(t => t.wpUserId); // only bulk-imported ones

  console.log(`Found ${therapists.length} bulk-imported therapists to update ratings for.\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const t of therapists) {
    // Skip if ratings already look populated (total > 0)
    const r = t.ratings || {};
    const total = (r.communication || 0) + (r.appearance || 0) + (r.proactivity || 0) + (r.experience || 0) + (r.massageSkills || 0);
    if (total > 0) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(BASE + t.wpUserId);
      if (!res.ok) { console.log(`  SKIP ${t.wpUserId} ${t.name} — HTTP ${res.status}`); failed++; continue; }
      const html = await res.text();
      const ratings = parseRatings(html);
      const newTotal = ratings.communication + ratings.appearance + ratings.proactivity + ratings.experience + ratings.massageSkills;

      if (newTotal === 0) {
        console.log(`  NO RATINGS ${t.wpUserId} ${t.name}`);
        skipped++;
      } else {
        await updateDoc(doc(db, 'therapists', t.docId), { ratings });
        updated++;
        console.log(`[${updated}] ${t.wpUserId} ${t.name} → ${newTotal}/100 (${ratings.communication}/${ratings.appearance}/${ratings.proactivity}/${ratings.experience}/${ratings.massageSkills})`);
      }

      await sleep(200);
    } catch (err) {
      console.log(`  FAIL ${t.wpUserId} ${t.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  process.exit(0);
}

updateAll().catch(err => { console.error(err); process.exit(1); });
