/**
 * Migrate therapists collection → candidates collection
 * Run with: node scripts/migrate-therapists.js
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or gcloud auth
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'spa-company-4ae61' });
const db = getFirestore();

async function migrate() {
  const therapistsSnap = await db.collection('therapists').get();
  console.log(`Found ${therapistsSnap.size} therapists to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of therapistsSnap.docs) {
    const t = doc.data();

    // Generate candidateId from wpUserId or doc index
    const candidateNum = t.wpUserId || t.candidateNum || null;
    const candidateId = candidateNum ? `SC-${candidateNum}` : `SC-${2000 + migrated}`;

    // Check if already migrated
    const existing = await db.collection('candidates')
      .where('candidateId', '==', candidateId)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`  Skip ${candidateId} (already exists)`);
      skipped++;
      continue;
    }

    // Approximate DOB from age
    const age = parseInt(t.age) || null;
    const approxDob = age
      ? `${new Date().getFullYear() - age}-01-01`
      : null;

    // Transform
    const candidate = {
      candidateId,
      fullName: t.name || '',
      firstName: t.name || '',
      lastName: '',
      dateOfBirth: approxDob,
      placeOfBirth: t.location || null,
      nationality: 'Thailand',
      originCountry: 'Thailand',
      gender: t.gender || null,
      maritalStatus: null,

      jobPosition: 'Massage',
      experience: t.experience ? `${t.experience} years` : null,
      education: null,
      englishLevel: null,
      skills: t.skills || [],
      bio: t.bio || '',
      youtubeUrl: t.youtubeUrl || null,
      workHistory: (t.workHistory || []).map(w => ({
        role: w.role || '',
        location: w.location || '',
        duration: w.duration || '',
        duties: Array.isArray(w.duties)
          ? w.duties
          : (w.duties || '').split('\n').filter(Boolean),
      })),

      ratings: {
        communication: t.ratings?.communication || 0,
        appearance: t.ratings?.appearance || 0,
        proActivity: t.ratings?.proactivity || t.ratings?.proActivity || 0,
        experience: t.ratings?.experience || 0,
        jobSkills: t.ratings?.massageSkills || t.ratings?.jobSkills || 0,
      },

      email: null,
      phone: null,
      alternatePhone: null,
      whatsapp: null,
      lineFacebook: null,
      originAddress: t.location || null,
      originAddressLocal: null,

      photos: t.photos || [],
      passportNumber: null,
      passportUrl: null,
      cvUrl: null,

      targetCountry: t.desiredWorkLocation || null,

      status: t.status === 'active' ? 'published' : 'draft',
      createdBy: 'migration:therapists',
      createdAt: t.createdAt || new Date(),
      approvedBy: 'migration:therapists',
      approvedAt: new Date(),

      notionCandidateUrl: null,

      // Keep reference to old doc
      _migratedFrom: `therapists/${doc.id}`,
    };

    await db.collection('candidates').add(candidate);
    console.log(`  Migrated ${candidateId} — ${candidate.fullName}`);
    migrated++;
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} skipped`);
}

migrate().catch(console.error);
