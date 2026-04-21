import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Read .env manually (Node doesn't support import.meta.env)
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

const therapists = [
  {
    name: 'Samawan (Tuk)',
    age: 35,
    gender: 'Female',
    location: 'Khon Kaen',
    experience: 10,
    desiredWorkLocation: 'Slovakia',
    skills: ['Aroma Massage', 'Body Massage', 'Foot Massage', 'Foot Reflexology', 'Foot Spa', 'Herbal Massage', 'Oil Massage', 'Thai Foot Spa and Massage', 'Traditional Thai Massage'],
    bio: 'Experienced massage therapist with over 10 years of international work experience. Skilled in Thai massage, oil massage, aroma massage, and deep tissue massage. Worked extensively overseas, including South Korea, Bahrain, and Dubai.',
    ratings: { communication: 14, appearance: 15, proactivity: 17, experience: 17, massageSkills: 17 },
    workHistory: [
      { role: 'Therapist', location: 'Bahrain (Aleena Spa)', duration: '3 years', duties: 'Performed Thai massage using stretching, pressure, and acupressure techniques' },
      { role: 'Therapist', location: 'Dubai (Thai Spa Massage)', duration: '4 years', duties: 'Oil massage services (Swedish/deep tissue)\nClient consultation and needs assessment' },
      { role: 'Therapist', location: 'Korea (The Tera Thai)', duration: '3 years', duties: 'Thai, oil, and foot massage services\nMaintained professional spa standards' },
    ],
    photos: [
      'https://spa-company.com/wp-content/uploads/2026/02/IMG_8996-150x150.jpg',
    ],
    status: 'active',
  },
  {
    name: 'Thanyachol (Gin)',
    age: 30,
    gender: 'Female',
    location: 'Thailand',
    experience: 10,
    desiredWorkLocation: 'Europe',
    skills: ['Aroma Massage', 'Body Massage', 'Deep Tissue Massage', 'Facial Massage', 'Foot Massage', 'Herbal Massage', 'Hot Stone Massage', 'Oil Massage', 'Traditional Thai Massage'],
    bio: 'Experienced Thai massage therapist with 10+ years of professional experience across Thailand, Australia, Dubai, and Kyrgyzstan. Specializes in traditional Thai massage, oil massage, facial massage, and hot stone work. Holds diploma in Business Administration and Certificate in Thai Massage (150 hours). Fluent in Thai and English.',
    ratings: { communication: 15, appearance: 12, proactivity: 17, experience: 17, massageSkills: 15 },
    workHistory: [
      { role: 'Therapist', location: 'Australia (Korean Massage & Spa)', duration: '3 years', duties: 'Body and foot massage services\nCustomer care focus' },
      { role: 'Owner/Therapist', location: 'Thailand (Thanya Thai Massage)', duration: '2 years', duties: 'Operated small Thai massage business\nClient management and facility maintenance' },
      { role: 'Therapist', location: 'Dubai (Thai Space Massage)', duration: '1 year', duties: 'Traditional Thai massage delivery\nHygiene standards and client relationship building' },
      { role: 'Therapist', location: 'Kyrgyzstan (Tanka Tanka Massage & Spa)', duration: '1 year', duties: 'Traditional Thai massage and therapeutic services\nHygiene and customer satisfaction' },
    ],
    photos: [
      'https://spa-company.com/wp-content/uploads/2026/02/Thanyachol1.jpg',
      'https://spa-company.com/wp-content/uploads/2026/02/Thanyachol2.jpg',
      'https://spa-company.com/wp-content/uploads/2026/02/Thanyachol3.jpg',
      'https://spa-company.com/wp-content/uploads/2026/02/Thanyachol4.jpg',
      'https://spa-company.com/wp-content/uploads/2026/02/Thanyachol5.jpg',
    ],
    status: 'active',
  },
  {
    name: 'Nareepat (Naree)',
    age: 40,
    gender: 'Female',
    location: 'Sisaket',
    experience: 3,
    desiredWorkLocation: 'Slovakia',
    skills: ['Aroma Massage', 'Body Massage', 'Deep Tissue Massage', 'Foot Massage', 'Foot Reflexology', 'Herbal Massage', 'Hot Stone Massage', 'Oil Massage', 'Thai Foot Spa and Massage', 'Traditional Thai Massage'],
    bio: 'Nareepat (Naree) is a 40-year-old massage therapist with three years of professional experience. She has worked in Koh Phangan, Montenegro, and at the Maestral Resort & Casino.',
    ratings: { communication: 17, appearance: 15, proactivity: 18, experience: 16, massageSkills: 18 },
    workHistory: [
      { role: 'Therapist', location: 'Koh Phangan (Kanda Massage)', duration: '1 year', duties: 'Provided Thai traditional massage, oil massage, and spa services\nMaintained hygiene standards and customer satisfaction' },
      { role: 'Therapist', location: 'Montenegro (SuPavee Thai Massage)', duration: '2 years', duties: 'Delivered Thai massage and spa treatments focusing on stress relief and wellness' },
      { role: 'Therapist', location: 'Montenegro (Maestral Resort & Casino)', duration: '2 months', duties: 'Practiced Thai massage, foot massage, and oil massage\nMaintained spa standards' },
    ],
    photos: [
      'https://spa-company.com/wp-content/uploads/2026/02/Naree1.jpg',
      'https://spa-company.com/wp-content/uploads/2026/02/Naree2.jpg',
      'https://spa-company.com/wp-content/uploads/2026/02/Naree3.jpg',
      'https://spa-company.com/wp-content/uploads/2026/02/Naree4.jpg',
      'https://spa-company.com/wp-content/uploads/2026/02/Naree5.jpg',
    ],
    status: 'active',
  },
  {
    name: 'Kanchana',
    age: 34,
    gender: 'Female',
    location: 'Roi Et',
    experience: 7,
    desiredWorkLocation: 'Slovakia',
    skills: ['Aroma Massage', 'Body Massage', 'Foot Massage', 'Foot Reflexology', 'Oil Massage', 'Traditional Thai Massage'],
    bio: 'Experienced spa therapist with over seven years in the spa and wellness industry, delivering professional Thai, oil, and hot oil massage treatments to international clients. Has worked in high-end, multicultural spa environments in Thailand and the UAE, with strong focus on service quality and hygiene standards.',
    ratings: { communication: 17, appearance: 18, proactivity: 17, experience: 18, massageSkills: 17 },
    workHistory: [
      { role: 'Therapist', location: 'UAE (Milestone & Rose Like Spa)', duration: '1 year', duties: 'Provided Thai and oil massage treatments to international clients\nMaintained hygiene standards\nWorked in multicultural teams' },
      { role: 'Therapist', location: 'Bangkok (WellCare Massage)', duration: '4 years', duties: 'Provided professional Thai and oil massage treatments' },
      { role: 'Therapist', location: 'Bangkok (HANI SPA)', duration: '2 years', duties: 'Provided professional Thai and oil massage treatments' },
    ],
    photos: [
      'https://spa-company.com/wp-content/uploads/2026/01/IMG_8921-150x150.jpg',
    ],
    status: 'active',
  },
];

async function importAll() {
  for (const t of therapists) {
    const docRef = await addDoc(collection(db, 'therapists'), {
      ...t,
      createdAt: serverTimestamp(),
    });
    console.log(`Imported: ${t.name} → ${docRef.id}`);
  }
  console.log(`\nDone! ${therapists.length} profiles imported.`);
  process.exit(0);
}

importAll().catch(err => { console.error(err); process.exit(1); });
