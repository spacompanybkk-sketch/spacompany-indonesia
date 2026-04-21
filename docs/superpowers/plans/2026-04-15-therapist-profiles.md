# Therapist Profile System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a therapist profile system with a public search page, a password-protected recruiter entry form, and a password-protected admin status management page, all backed by Firebase Firestore and Storage.

**Architecture:** Three new Astro pages with all Firebase interactions running client-side in `<script>` tags. Profile data stored in Firestore; photos in Firebase Storage. Recruiter and admin pages protected by a shared password stored in `.env`.

**Tech Stack:** Astro v6, Tailwind CSS v4, Firebase JS SDK v10 (Firestore + Storage)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/firebase.js` | Create | Firebase app init, exports `db` and `storage` |
| `.env` | Create (gitignored) | Firebase config + admin password |
| `.env.example` | Create | Committed template showing required env var names |
| `firestore.rules` | Create | Firestore security rules |
| `storage.rules` | Create | Storage security rules |
| `firebase.json` | Modify | Add references to rules files |
| `src/components/PasswordOverlay.astro` | Create | Shared password gate used by recruiter + admin |
| `src/pages/therapists.astro` | Create | Public search + filter page |
| `src/pages/therapist.astro` | Create | Individual profile page (reads `?id=` from URL) |
| `src/pages/recruiter.astro` | Create | Password-protected profile entry form |
| `src/pages/admin.astro` | Create | Password-protected status management table |

---

### Task 1: Install Firebase SDK and configure environment

**Files:**
- Modify: `package.json` (via npm install)
- Create: `.env`
- Create: `.env.example`
- Create: `src/lib/firebase.js`

- [ ] **Step 1: Install the Firebase JS SDK**

```bash
npm install firebase
```

Expected output: `added N packages`

- [ ] **Step 2: Create `.env` with Firebase config**

Get your Firebase project config from the Firebase Console → Project Settings → Your apps → SDK setup and configuration → Config. The project ID is `spa-company-4ae61`.

Create `.env` in the project root:

```
PUBLIC_FIREBASE_API_KEY=your-api-key-here
PUBLIC_FIREBASE_AUTH_DOMAIN=spa-company-4ae61.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=spa-company-4ae61
PUBLIC_FIREBASE_STORAGE_BUCKET=spa-company-4ae61.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
PUBLIC_FIREBASE_APP_ID=your-app-id
PUBLIC_ADMIN_PASSWORD=your-chosen-password
```

- [ ] **Step 3: Create `.env.example` (committed template)**

Create `.env.example` in the project root:

```
PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_STORAGE_BUCKET=
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
PUBLIC_FIREBASE_APP_ID=
PUBLIC_ADMIN_PASSWORD=
```

- [ ] **Step 4: Create `src/lib/firebase.js`**

```js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const storage = getStorage(app);
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: Build completes with no errors. The `dist/` folder is populated.

- [ ] **Step 6: Commit**

```bash
git add src/lib/firebase.js .env.example package.json package-lock.json
git commit -m "feat: install Firebase SDK and add environment config template"
```

---

### Task 2: Firestore and Storage security rules

**Files:**
- Create: `firestore.rules`
- Create: `storage.rules`
- Modify: `firebase.json`

- [ ] **Step 1: Create `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /therapists/{docId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> Note: Writes are open because auth is client-side password only. Restrict further before exposing sensitive data publicly.

- [ ] **Step 2: Create `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /therapists/{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

- [ ] **Step 3: Update `firebase.json` to reference rules files**

Replace the entire content of `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  },
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

- [ ] **Step 4: Deploy rules to Firebase**

```bash
npx firebase-tools deploy --only firestore:rules,storage
```

Expected: `Deploy complete!`

- [ ] **Step 5: Commit**

```bash
git add firestore.rules storage.rules firebase.json
git commit -m "feat: add Firestore and Storage security rules"
```

---

### Task 3: Password overlay component

**Files:**
- Create: `src/components/PasswordOverlay.astro`

- [ ] **Step 1: Create `src/components/PasswordOverlay.astro`**

```astro
---
// Reads PUBLIC_ADMIN_PASSWORD client-side via import.meta.env
---

<div id="password-gate" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm">
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4">
    <h2 class="text-xl font-bold text-gray-900 mb-2 text-center">Staff Access</h2>
    <p class="text-sm text-gray-500 text-center mb-6">Enter the access password to continue.</p>
    <input
      id="password-input"
      type="password"
      placeholder="Password"
      class="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]"
      autofocus
    />
    <p id="password-error" class="text-red-500 text-xs mb-3 hidden">Incorrect password. Try again.</p>
    <button
      id="password-submit"
      class="w-full bg-[#a9cf54] text-white font-semibold py-2 rounded-lg hover:bg-[#588f27] transition-colors"
    >
      Enter
    </button>
  </div>
</div>

<script>
  const gate = document.getElementById('password-gate');
  const input = document.getElementById('password-input') as HTMLInputElement;
  const submitBtn = document.getElementById('password-submit');
  const error = document.getElementById('password-error');
  const CORRECT = import.meta.env.PUBLIC_ADMIN_PASSWORD;

  function check() {
    if (input.value === CORRECT) {
      gate?.classList.add('hidden');
    } else {
      error?.classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  }

  submitBtn?.addEventListener('click', check);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
</script>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PasswordOverlay.astro
git commit -m "feat: add shared password overlay component"
```

---

### Task 4: Public therapist search page (`/therapists`)

**Files:**
- Create: `src/pages/therapists.astro`

- [ ] **Step 1: Create `src/pages/therapists.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout
  title="Find a Thai Therapist — Spa Company Bangkok"
  description="Browse verified Thai massage therapists available for international placement."
>
  <!-- Page Hero -->
  <section class="bg-[#a9cf54] py-12 text-center">
    <div class="max-w-3xl mx-auto px-4">
      <h1 class="text-4xl font-bold text-white mb-3">Therapist Database</h1>
      <p class="text-white/85 text-lg">Browse verified Thai therapists ready to work abroad.</p>
    </div>
  </section>

  <!-- Filters -->
  <section class="bg-white border-b border-gray-100 py-5 sticky top-16 z-40 shadow-sm">
    <div class="max-w-5xl mx-auto px-4 flex flex-wrap gap-4 items-end">
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Min Age</label>
        <input id="filter-age-min" type="number" min="18" max="60" placeholder="18"
          class="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Max Age</label>
        <input id="filter-age-max" type="number" min="18" max="60" placeholder="60"
          class="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Min Experience (yrs)</label>
        <input id="filter-exp-min" type="number" min="0" max="40" placeholder="0"
          class="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Max Experience (yrs)</label>
        <input id="filter-exp-max" type="number" min="0" max="40" placeholder="40"
          class="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
      </div>
      <button id="filter-apply"
        class="px-5 py-2 bg-[#a9cf54] text-white text-sm font-semibold rounded-lg hover:bg-[#588f27] transition-colors">
        Apply
      </button>
      <button id="filter-reset"
        class="px-5 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
        Reset
      </button>
      <span id="results-count" class="text-sm text-gray-400 ml-auto self-center"></span>
    </div>
  </section>

  <!-- Grid -->
  <section class="py-12 bg-gray-50 min-h-[400px]">
    <div class="max-w-7xl mx-auto px-4">
      <div id="loading" class="text-center text-gray-400 py-20 text-lg">Loading therapists…</div>
      <div id="empty" class="hidden text-center text-gray-400 py-20 text-lg">No therapists match your filters.</div>
      <div id="grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"></div>
    </div>
  </section>
</Layout>

<script>
  import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
  import { db } from '../lib/firebase.js';

  type Therapist = {
    id: string;
    name: string;
    age: number;
    experience: number;
    location: string;
    desiredWorkLocation: string;
    skills: string[];
    photos: string[];
    status: string;
  };

  let allTherapists: Therapist[] = [];

  async function loadTherapists() {
    const q = query(
      collection(db, 'therapists'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    allTherapists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Therapist));
    document.getElementById('loading')?.classList.add('hidden');
    applyFilters();
  }

  function applyFilters() {
    const ageMin = parseInt((document.getElementById('filter-age-min') as HTMLInputElement).value) || 0;
    const ageMax = parseInt((document.getElementById('filter-age-max') as HTMLInputElement).value) || 999;
    const expMin = parseInt((document.getElementById('filter-exp-min') as HTMLInputElement).value) || 0;
    const expMax = parseInt((document.getElementById('filter-exp-max') as HTMLInputElement).value) || 999;

    const filtered = allTherapists.filter(t =>
      t.age >= ageMin && t.age <= ageMax &&
      t.experience >= expMin && t.experience <= expMax
    );

    const grid = document.getElementById('grid')!;
    const empty = document.getElementById('empty')!;
    const count = document.getElementById('results-count')!;

    count.textContent = `${filtered.length} therapist${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      grid.innerHTML = filtered.map(t => `
        <a href="/therapist?id=${t.id}" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
          <div class="aspect-[4/3] bg-gray-100 overflow-hidden">
            ${t.photos?.[0]
              ? `<img src="${t.photos[0]}" alt="${t.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />`
              : `<div class="w-full h-full flex items-center justify-center text-gray-300 text-4xl">👤</div>`
            }
          </div>
          <div class="p-4">
            <h3 class="font-semibold text-gray-900 mb-1">${t.name}</h3>
            <p class="text-sm text-gray-500 mb-2">${t.age} yrs · ${t.experience} yrs exp · ${t.location}</p>
            <p class="text-xs text-[#a9cf54] font-medium mb-3">→ ${t.desiredWorkLocation}</p>
            <div class="flex flex-wrap gap-1">
              ${(t.skills || []).slice(0, 3).map(s =>
                `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">${s}</span>`
              ).join('')}
              ${(t.skills?.length || 0) > 3 ? `<span class="text-xs text-gray-400">+${t.skills.length - 3} more</span>` : ''}
            </div>
          </div>
        </a>
      `).join('');
    }
  }

  document.getElementById('filter-apply')?.addEventListener('click', applyFilters);
  document.getElementById('filter-reset')?.addEventListener('click', () => {
    (document.getElementById('filter-age-min') as HTMLInputElement).value = '';
    (document.getElementById('filter-age-max') as HTMLInputElement).value = '';
    (document.getElementById('filter-exp-min') as HTMLInputElement).value = '';
    (document.getElementById('filter-exp-max') as HTMLInputElement).value = '';
    applyFilters();
  });

  loadTherapists();
</script>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build completes. `dist/therapists/index.html` is created.

- [ ] **Step 3: Smoke test in dev**

```bash
npm run dev
```

Open `http://localhost:4321/therapists`. Expected: hero section renders, filter bar is sticky, "Loading therapists…" spinner appears then transitions to empty state (no profiles in Firestore yet — correct).

- [ ] **Step 4: Commit**

```bash
git add src/pages/therapists.astro
git commit -m "feat: add public therapist search page with age/experience filters"
```

---

### Task 5: Individual therapist profile page (`/therapist?id=xxx`)

**Files:**
- Create: `src/pages/therapist.astro`

- [ ] **Step 1: Create `src/pages/therapist.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout
  title="Therapist Profile — Spa Company Bangkok"
  description="Verified Thai massage therapist profile."
>
  <div id="loading" class="min-h-[60vh] flex items-center justify-center text-gray-400 text-lg">
    Loading profile…
  </div>
  <div id="not-found" class="hidden min-h-[60vh] flex items-center justify-center text-gray-400 text-lg">
    Profile not found. <a href="/therapists" class="ml-2 text-[#a9cf54] underline">Back to search</a>
  </div>

  <div id="profile" class="hidden">
    <!-- Hero + Photos -->
    <section class="bg-gray-900 py-10">
      <div class="max-w-5xl mx-auto px-4">
        <a href="/therapists" class="text-[#a9cf54] text-sm hover:underline mb-6 inline-block">← Back to search</a>
        <div class="flex flex-col md:flex-row gap-8">
          <div class="md:w-1/2">
            <img id="main-photo" src="" alt="" class="rounded-2xl w-full object-cover max-h-96" />
            <div id="thumbnails" class="flex gap-2 mt-3 flex-wrap"></div>
          </div>
          <div class="md:w-1/2 text-white">
            <div class="flex items-center gap-2 mb-2">
              <span id="profile-name" class="text-3xl font-bold"></span>
              <span class="bg-[#a9cf54] text-white text-xs font-semibold px-2 py-0.5 rounded-full">Verified</span>
            </div>
            <div id="profile-meta" class="text-gray-300 text-sm space-y-1 mb-4"></div>
            <div id="profile-skills" class="flex flex-wrap gap-2 mb-4"></div>
            <div id="profile-desired" class="text-[#a9cf54] text-sm font-medium"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Bio + Ratings + Work History -->
    <section class="py-12 bg-white">
      <div class="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-10">
        <div class="md:col-span-2 space-y-8">
          <div>
            <h2 class="text-xl font-bold text-gray-900 mb-3">About</h2>
            <p id="profile-bio" class="text-gray-600 leading-relaxed"></p>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900 mb-4">Work History</h2>
            <div id="work-history" class="space-y-5"></div>
          </div>
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-900 mb-4">Assessment</h2>
          <div id="ratings" class="space-y-3"></div>
          <div id="ratings-total" class="mt-4 text-center text-2xl font-bold text-[#a9cf54]"></div>
        </div>
      </div>
    </section>
  </div>
</Layout>

<script>
  import { doc, getDoc } from 'firebase/firestore';
  import { db } from '../lib/firebase.js';

  type WorkEntry = { role: string; location: string; duration: string; duties: string };
  type Ratings = {
    communication: number; appearance: number; proactivity: number;
    experience: number; massageSkills: number;
  };
  type Therapist = {
    name: string; age: number; gender: string; location: string;
    experience: number; desiredWorkLocation: string; skills: string[];
    bio: string; photos: string[]; workHistory: WorkEntry[]; ratings: Ratings;
  };

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  async function loadProfile() {
    if (!id) { showNotFound(); return; }
    const snap = await getDoc(doc(db, 'therapists', id));
    if (!snap.exists()) { showNotFound(); return; }
    render(snap.data() as Therapist);
  }

  function showNotFound() {
    document.getElementById('loading')?.classList.add('hidden');
    document.getElementById('not-found')?.classList.remove('hidden');
  }

  function render(t: Therapist) {
    document.getElementById('loading')?.classList.add('hidden');
    document.getElementById('profile')?.classList.remove('hidden');

    document.getElementById('profile-name')!.textContent = t.name;
    document.getElementById('profile-meta')!.innerHTML = `
      <div>${t.gender} · ${t.age} years old</div>
      <div>From: ${t.location}, Thailand</div>
      <div>Experience: ${t.experience} years</div>
    `;
    document.getElementById('profile-desired')!.textContent = `Desired destination: ${t.desiredWorkLocation}`;
    document.getElementById('profile-bio')!.textContent = t.bio;

    document.getElementById('profile-skills')!.innerHTML = (t.skills || []).map(s =>
      `<span class="text-sm bg-[#a9cf54]/15 text-[#588f27] px-3 py-1 rounded-full font-medium">${s}</span>`
    ).join('');

    const photos = t.photos || [];
    if (photos.length > 0) {
      const mainImg = document.getElementById('main-photo') as HTMLImageElement;
      mainImg.src = photos[0];
      mainImg.alt = t.name;
      document.getElementById('thumbnails')!.innerHTML = photos.map((p, i) =>
        `<img src="${p}" alt="${t.name} photo ${i + 1}"
          class="w-16 h-16 object-cover rounded-lg cursor-pointer border-2 ${i === 0 ? 'border-[#a9cf54]' : 'border-transparent'} hover:border-[#a9cf54] transition-colors"
          data-index="${i}" />`
      ).join('');
      document.getElementById('thumbnails')?.addEventListener('click', (e) => {
        const thumb = (e.target as HTMLElement).closest('img[data-index]') as HTMLImageElement;
        if (!thumb) return;
        mainImg.src = thumb.src;
        document.querySelectorAll('#thumbnails img').forEach(el =>
          el.classList.replace('border-[#a9cf54]', 'border-transparent')
        );
        thumb.classList.replace('border-transparent', 'border-[#a9cf54]');
      });
    }

    const r = t.ratings || {} as Ratings;
    const ratingLabels: [keyof Ratings, string][] = [
      ['communication', 'Communication'], ['appearance', 'Appearance'],
      ['proactivity', 'Pro Activity'], ['experience', 'Experience'],
      ['massageSkills', 'Massage Skills'],
    ];
    const total = ratingLabels.reduce((sum, [key]) => sum + (r[key] || 0), 0);
    document.getElementById('ratings')!.innerHTML = ratingLabels.map(([key, label]) => `
      <div>
        <div class="flex justify-between text-sm mb-1">
          <span class="text-gray-600">${label}</span>
          <span class="font-semibold text-gray-900">${r[key] || 0}/20</span>
        </div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-[#a9cf54] rounded-full" style="width:${((r[key] || 0) / 20) * 100}%"></div>
        </div>
      </div>
    `).join('');
    document.getElementById('ratings-total')!.textContent = `${total} / 100`;

    document.getElementById('work-history')!.innerHTML = (t.workHistory || []).map(w => `
      <div class="border-l-2 border-[#a9cf54] pl-4">
        <div class="font-semibold text-gray-900">${w.role}</div>
        <div class="text-sm text-gray-500 mb-2">${w.location} · ${w.duration}</div>
        <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
          ${(w.duties || '').split('\n').filter(Boolean).map(d => `<li>${d.trim()}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  loadProfile();
</script>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `dist/therapist/index.html` created. No build errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/therapist.astro
git commit -m "feat: add individual therapist profile page"
```

---

### Task 6: Recruiter form page (`/recruiter`)

**Files:**
- Create: `src/pages/recruiter.astro`

- [ ] **Step 1: Create `src/pages/recruiter.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import PasswordOverlay from '../components/PasswordOverlay.astro';

const skills = [
  'Aroma Massage','Body Massage','Foot Massage','Foot Reflexology',
  'Foot Spa','Herbal Massage','Oil Massage',
  'Thai Foot Spa and Massage','Traditional Thai Massage',
];
const ratingFields = [
  ['communication','Communication'],
  ['appearance','Appearance'],
  ['proactivity','Pro Activity'],
  ['experience','Experience'],
  ['massageSkills','Massage Skills'],
];
---

<Layout title="Add Therapist — Spa Company Staff">
  <PasswordOverlay />

  <section class="py-12 bg-gray-50 min-h-screen">
    <div class="max-w-3xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Add Therapist Profile</h1>
      <p class="text-gray-500 mb-8">Complete all fields. Profile goes live as "Active" immediately.</p>

      <div id="success-msg" class="hidden bg-green-50 border border-green-200 text-green-800 rounded-xl px-5 py-4 mb-6 text-sm font-medium">
        Profile saved! <a href="/therapists" class="underline">View on search page →</a>
      </div>
      <div id="error-msg" class="hidden bg-red-50 border border-red-200 text-red-800 rounded-xl px-5 py-4 mb-6 text-sm font-medium"></div>

      <form id="recruiter-form" class="space-y-6">

        <!-- Basic Info -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 class="font-semibold text-gray-900 text-lg">Basic Information</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input name="name" required type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Age *</label>
              <input name="age" required type="number" min="18" max="65"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select name="gender" required
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]">
                <option value="">Select…</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Thai City *</label>
              <input name="location" required type="text" placeholder="e.g. Khon Kaen"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Experience (years) *</label>
              <input name="experience" required type="number" min="0" max="40"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Desired Work Location *</label>
              <input name="desiredWorkLocation" required type="text" placeholder="e.g. Slovakia, UAE"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
            </div>
          </div>
        </div>

        <!-- Skills -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 class="font-semibold text-gray-900 text-lg mb-4">Skills</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {skills.map(skill => (
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" name="skills" value={skill} class="rounded accent-[#a9cf54]" />
                {skill}
              </label>
            ))}
          </div>
        </div>

        <!-- Bio -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 class="font-semibold text-gray-900 text-lg mb-4">Biography</h2>
          <textarea name="bio" rows="4" required
            placeholder="Describe the therapist's background, personality, and experience…"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54] resize-none"></textarea>
        </div>

        <!-- Ratings -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 class="font-semibold text-gray-900 text-lg mb-4">Assessment (0–20 each)</h2>
          <div class="space-y-4">
            {ratingFields.map(([key, label]) => (
              <div>
                <div class="flex justify-between mb-1">
                  <label class="text-sm font-medium text-gray-700">{label}</label>
                  <span class="text-sm text-gray-500" id={`rating-display-${key}`}>0</span>
                </div>
                <input type="range" name={`rating-${key}`} min="0" max="20" value="0"
                  class="w-full accent-[#a9cf54]"
                  data-display={`rating-display-${key}`} />
              </div>
            ))}
          </div>
        </div>

        <!-- Work History -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-900 text-lg">Work History</h2>
            <button type="button" id="add-work-entry" class="text-sm text-[#a9cf54] font-medium hover:underline">
              + Add Entry
            </button>
          </div>
          <div id="work-entries" class="space-y-4"></div>
        </div>

        <!-- Photos -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 class="font-semibold text-gray-900 text-lg mb-4">Photos</h2>
          <input type="file" id="photo-input" multiple accept="image/*"
            class="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#a9cf54] file:text-white hover:file:bg-[#588f27]" />
          <div id="photo-previews" class="flex flex-wrap gap-3 mt-4"></div>
        </div>

        <!-- Submit -->
        <button type="submit" id="submit-btn"
          class="w-full py-4 bg-[#a9cf54] text-white font-bold text-lg rounded-xl hover:bg-[#588f27] transition-colors disabled:opacity-50">
          Save Profile
        </button>
      </form>
    </div>
  </section>
</Layout>

<script>
  import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
  import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { db, storage } from '../lib/firebase.js';

  // Range slider live display
  document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(input => {
    const displayId = input.dataset.display;
    if (displayId) {
      input.addEventListener('input', () => {
        document.getElementById(displayId)!.textContent = input.value;
      });
    }
  });

  // Work history
  let workEntryCount = 0;
  function addWorkEntry() {
    const i = workEntryCount++;
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-xl p-4 space-y-3 relative';
    div.dataset.entryIndex = String(i);
    div.innerHTML = `
      <button type="button" class="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xs remove-entry">✕ Remove</button>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <input type="text" name="work-role-${i}" placeholder="e.g. Senior Therapist"
            class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Location</label>
          <input type="text" name="work-location-${i}" placeholder="e.g. Dubai, UAE"
            class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Duration</label>
          <input type="text" name="work-duration-${i}" placeholder="e.g. 2 years"
            class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54]" />
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Duties (one per line)</label>
        <textarea name="work-duties-${i}" rows="3"
          placeholder="Provided traditional Thai massage&#10;Assisted with spa treatments"
          class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9cf54] resize-none"></textarea>
      </div>
    `;
    div.querySelector('.remove-entry')?.addEventListener('click', () => div.remove());
    document.getElementById('work-entries')!.appendChild(div);
  }
  document.getElementById('add-work-entry')?.addEventListener('click', addWorkEntry);
  addWorkEntry();

  // Photo previews
  document.getElementById('photo-input')?.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files;
    const container = document.getElementById('photo-previews')!;
    container.innerHTML = '';
    if (!files) return;
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      container.innerHTML += `<img src="${url}" class="w-20 h-20 object-cover rounded-lg border border-gray-200" />`;
    });
  });

  // Form submit
  document.getElementById('recruiter-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Saving…';
    document.getElementById('error-msg')?.classList.add('hidden');

    try {
      const form = e.currentTarget as HTMLFormElement;
      const data = new FormData(form);

      const workEntries = Array.from(
        document.querySelectorAll<HTMLElement>('#work-entries [data-entry-index]')
      ).map(el => {
        const i = el.dataset.entryIndex!;
        return {
          role: (data.get(`work-role-${i}`) as string) || '',
          location: (data.get(`work-location-${i}`) as string) || '',
          duration: (data.get(`work-duration-${i}`) as string) || '',
          duties: (data.get(`work-duties-${i}`) as string) || '',
        };
      }).filter(w => w.role);

      const photoInput = document.getElementById('photo-input') as HTMLInputElement;
      const tempId = Date.now().toString();
      const photoUrls: string[] = [];
      if (photoInput.files) {
        for (const file of Array.from(photoInput.files)) {
          const storageRef = ref(storage, `therapists/${tempId}/${file.name}`);
          const snap = await uploadBytes(storageRef, file);
          photoUrls.push(await getDownloadURL(snap.ref));
        }
      }

      await addDoc(collection(db, 'therapists'), {
        name: data.get('name') as string,
        age: parseInt(data.get('age') as string),
        gender: data.get('gender') as string,
        location: data.get('location') as string,
        experience: parseInt(data.get('experience') as string),
        desiredWorkLocation: data.get('desiredWorkLocation') as string,
        bio: data.get('bio') as string,
        skills: data.getAll('skills') as string[],
        ratings: {
          communication: parseInt(data.get('rating-communication') as string),
          appearance: parseInt(data.get('rating-appearance') as string),
          proactivity: parseInt(data.get('rating-proactivity') as string),
          experience: parseInt(data.get('rating-experience') as string),
          massageSkills: parseInt(data.get('rating-massageSkills') as string),
        },
        workHistory: workEntries,
        photos: photoUrls,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      document.getElementById('success-msg')?.classList.remove('hidden');
      form.reset();
      document.getElementById('photo-previews')!.innerHTML = '';
      document.getElementById('work-entries')!.innerHTML = '';
      addWorkEntry();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const errEl = document.getElementById('error-msg')!;
      errEl.textContent = `Error saving profile: ${(err as Error).message}`;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Profile';
    }
  });
</script>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build completes. `dist/recruiter/index.html` created.

- [ ] **Step 3: Smoke test in dev**

```bash
npm run dev
```

Open `http://localhost:4321/recruiter`. Expected:
- Password overlay appears on load
- Wrong password → error message shown, input cleared
- Correct password (from `.env`) → overlay hides, full form visible
- Work history "Add Entry" button adds new entry sections
- Photo picker shows thumbnails after selection

- [ ] **Step 4: Commit**

```bash
git add src/pages/recruiter.astro
git commit -m "feat: add password-protected recruiter profile entry form"
```

---

### Task 7: Admin status management page (`/admin`)

**Files:**
- Create: `src/pages/admin.astro`

- [ ] **Step 1: Create `src/pages/admin.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import PasswordOverlay from '../components/PasswordOverlay.astro';
---

<Layout title="Admin — Spa Company Staff">
  <PasswordOverlay />

  <section class="py-10 bg-gray-50 min-h-screen">
    <div class="max-w-5xl mx-auto px-4">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Therapist Status Management</h1>
      <p class="text-gray-500 mb-6 text-sm">Toggle therapist status between Active and Placed.</p>

      <div id="loading" class="text-center text-gray-400 py-16">Loading…</div>
      <div id="empty" class="hidden text-center text-gray-400 py-16">No profiles found.</div>

      <div class="overflow-x-auto rounded-2xl shadow-sm border border-gray-200">
        <table class="w-full text-sm bg-white">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Name</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Age</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Location</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Added</th>
              <th class="text-left px-4 py-3 text-gray-600 font-semibold">Status</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody id="admin-table-body" class="divide-y divide-gray-100"></tbody>
        </table>
      </div>
    </div>
  </section>
</Layout>

<script>
  import { collection, getDocs, doc, updateDoc, orderBy, query } from 'firebase/firestore';
  import { db } from '../lib/firebase.js';

  type Therapist = {
    id: string; name: string; age: number; location: string;
    status: string; createdAt?: { toDate: () => Date };
  };

  async function loadAll() {
    const q = query(collection(db, 'therapists'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const therapists: Therapist[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Therapist));

    document.getElementById('loading')?.classList.add('hidden');

    if (therapists.length === 0) {
      document.getElementById('empty')?.classList.remove('hidden');
      return;
    }

    const tbody = document.getElementById('admin-table-body')!;
    tbody.innerHTML = therapists.map(t => {
      const date = t.createdAt?.toDate?.().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      }) ?? '—';
      const isActive = t.status === 'active';
      return `
        <tr data-id="${t.id}">
          <td class="px-4 py-3 font-medium text-gray-900">
            <a href="/therapist?id=${t.id}" target="_blank" class="hover:text-[#a9cf54] hover:underline">${t.name}</a>
          </td>
          <td class="px-4 py-3 text-gray-600">${t.age}</td>
          <td class="px-4 py-3 text-gray-600">${t.location}</td>
          <td class="px-4 py-3 text-gray-500">${date}</td>
          <td class="px-4 py-3">
            <span class="status-badge px-2.5 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
              ${isActive ? 'Active' : 'Placed'}
            </span>
          </td>
          <td class="px-4 py-3 text-right">
            <button class="toggle-btn px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
              ${isActive ? 'border-gray-300 text-gray-600 hover:bg-gray-50' : 'border-[#a9cf54] text-[#588f27] hover:bg-[#a9cf54]/10'}"
              data-id="${t.id}" data-status="${t.status}">
              ${isActive ? 'Mark Placed' : 'Reactivate'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.toggle-btn');
      if (!btn) return;

      const id = btn.dataset.id!;
      const currentStatus = btn.dataset.status!;
      const newStatus = currentStatus === 'active' ? 'placed' : 'active';

      btn.disabled = true;
      btn.textContent = '…';

      await updateDoc(doc(db, 'therapists', id), { status: newStatus });

      const row = tbody.querySelector(`tr[data-id="${id}"]`)!;
      const badge = row.querySelector('.status-badge')!;
      const isNowActive = newStatus === 'active';

      badge.textContent = isNowActive ? 'Active' : 'Placed';
      badge.className = `status-badge px-2.5 py-1 rounded-full text-xs font-semibold ${isNowActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`;

      btn.dataset.status = newStatus;
      btn.textContent = isNowActive ? 'Mark Placed' : 'Reactivate';
      btn.className = `toggle-btn px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${isNowActive ? 'border-gray-300 text-gray-600 hover:bg-gray-50' : 'border-[#a9cf54] text-[#588f27] hover:bg-[#a9cf54]/10'}`;
      btn.disabled = false;
    });
  }

  loadAll();
</script>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build completes. `dist/admin/index.html` created.

- [ ] **Step 3: Smoke test in dev**

```bash
npm run dev
```

Open `http://localhost:4321/admin`. Expected:
- Password overlay on load
- Correct password → table appears (empty until profiles exist)

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin.astro
git commit -m "feat: add password-protected admin status management page"
```

---

### Task 8: End-to-end verification and deploy

- [ ] **Step 1: Full production build**

```bash
npm run build
```

Expected: All pages compile cleanly. Verify these files exist in `dist/`:
- `dist/therapists/index.html`
- `dist/therapist/index.html`
- `dist/recruiter/index.html`
- `dist/admin/index.html`

- [ ] **Step 2: Confirm `.env` is gitignored**

```bash
git status
```

Expected: `.env` does NOT appear in the output (it's already covered by `.gitignore`).

- [ ] **Step 3: Push to main to trigger deploy**

```bash
git push origin main
```

The existing GitHub Actions workflow builds and deploys to Firebase Hosting automatically.

- [ ] **Step 4: Smoke test production**

After the Actions workflow completes (~2 min):

1. Visit `/therapists` — hero loads, filters visible, empty state shown
2. Visit `/recruiter` — password overlay appears; enter correct password → form renders
3. Submit one test profile via `/recruiter` — fill all fields, upload 1 photo, click Save
4. Visit `/therapists` — new profile card appears
5. Click card → `/therapist?id=xxx` — full profile renders with photo, skills, ratings, work history
6. Visit `/admin` — enter password → profile row appears; click "Mark Placed"
7. Visit `/therapists` — profile no longer visible (status is now "placed")
8. Visit `/admin` → click "Reactivate" → profile reappears on `/therapists`
