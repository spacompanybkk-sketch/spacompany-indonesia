# Spa Company Indonesia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create spacompany-indonesia.com by forking the existing spa-company.com repo, rebranding for Indonesia, adding i18n (Bahasa Indonesia + English), a Notion-powered job board, WhatsApp integration, and an About/Trust page.

**Architecture:** Fork the Astro 6 + Tailwind 4 + Firebase project. Add Astro's built-in i18n routing with `/id/` (default) and `/en/` prefixes for public pages. Internal pages (recruiter, admin, checkout, booking) remain at root level, English only. New Cloud Function syncs jobs from a separate Notion workspace.

**Tech Stack:** Astro 6, Tailwind CSS 4, Firebase (Hosting/Functions/Firestore/Storage), Notion API

**Spec:** `docs/superpowers/specs/2026-04-21-spacompany-indonesia-design.md`

---

### Task 1: Create New Repo and Firebase Setup

**Files:**
- Modify: `package.json`
- Modify: `firebase.json`
- Modify: `.firebaserc` (create if not exists)
- Modify: `astro.config.mjs`
- Modify: `src/lib/firebase.js`
- Create: `.env.example`
- Create: `.env` (local only, not committed)

- [ ] **Step 1: Create new GitHub repo and clone the fork**

```bash
# From parent directory (not inside spa-company)
cd ~/Projects
# Create the new repo on GitHub
gh repo create spacompany-indonesia --public --clone
# Copy all files from spa-company (excluding .git, node_modules, dist)
rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='.firebase' spa-company/ spacompany-indonesia/
cd spacompany-indonesia
git add -A
git commit -m "feat: initial fork from spa-company.com"
```

- [ ] **Step 2: Create .firebaserc pointing to spa-indonesia project**

Create `.firebaserc`:

```json
{
  "projects": {
    "default": "spa-indonesia"
  }
}
```

- [ ] **Step 3: Update astro.config.mjs with new site URL and i18n config**

```javascript
// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://spacompany-indonesia.com',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'id',
    locales: ['id', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  redirects: {
    '/': '/id/',
  },
});
```

- [ ] **Step 4: Create .env.example with required Firebase env vars for spa-indonesia**

```
PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=spa-indonesia.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=spa-indonesia
PUBLIC_FIREBASE_STORAGE_BUCKET=spa-indonesia.firebasestorage.app
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
PUBLIC_FIREBASE_APP_ID=
NOTION_API_KEY=
NOTION_JOBS_DATABASE_ID=
```

- [ ] **Step 5: Get Firebase config values and create .env**

```bash
# Log in to Firebase and select the spa-indonesia project
firebase use spa-indonesia
# Get the web app config from the Firebase console
# https://console.firebase.google.com/project/spa-indonesia/settings/general
# Create .env with the actual values
```

- [ ] **Step 6: Update .gitignore to exclude .env**

Ensure `.env` is in `.gitignore` (should already be there from the fork).

- [ ] **Step 7: Install dependencies and verify build**

```bash
npm install
npm run build
```

Expected: Build succeeds (content is still Bangkok but structure works).

- [ ] **Step 8: Commit**

```bash
git add .firebaserc astro.config.mjs .env.example package.json
git commit -m "feat: configure Firebase project spa-indonesia and Astro i18n"
```

---

### Task 2: Rebrand — Logo, Colors, and Global Styles

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/layouts/Layout.astro`
- Add: `public/images/spa-company-indonesia-logo.png` (from user-provided JPEG)
- Remove: Bangkok-specific images that won't be reused

- [ ] **Step 1: Copy the Indonesia logo to public/images**

```bash
# Convert the JPEG to PNG and copy to public/images
cp ~/Downloads/"Spa Company Indonesia LOGO GREEN.jpeg" public/images/spa-company-indonesia-logo.png
```

- [ ] **Step 2: Update global.css brand colors to match the green Indonesia logo**

The Indonesia logo uses a darker green. Update the theme:

```css
@import "tailwindcss";

@theme {
  --color-brand-green: #4a7c3f;
  --color-brand-dark-green: #2d5a27;
  --color-brand-light-green: #6b9e5e;
  --color-brand-gray: #ababab;
  --color-body: #404040;
  --font-family-sans: 'Prompt', sans-serif;
}

@layer base {
  body {
    font-family: var(--font-family-sans);
    color: var(--color-body);
  }
}
```

- [ ] **Step 3: Update Layout.astro — meta tags, OG data, analytics**

Replace all Bangkok references in `src/layouts/Layout.astro`:

```astro
---
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title?: string;
  description?: string;
  lang?: string;
}

const {
  title = 'Spa Company Indonesia — Indonesian Therapist Recruiting Portal',
  description = 'Find verified Indonesian massage therapists for your spa. Large database, fast approval, and placement guarantees.',
  lang = 'id',
} = Astro.props;
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content="https://spacompany-indonesia.com/og-image.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Spa Company Indonesia" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://spacompany-indonesia.com/og-image.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="antialiased">
    <Header />
    <main>
      <slot />
    </main>
    <Footer />

    <!-- Floating WhatsApp Button -->
    <div class="fixed bottom-6 right-6 z-50">
      <a href="https://wa.me/628211519986" target="_blank" rel="noopener noreferrer"
        class="w-14 h-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        title="Chat on WhatsApp">
        <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  </body>
</html>
```

Note: LINE button removed (not used in Indonesia), only WhatsApp remains. WhatsApp number changed to +62 821 151 9986.

- [ ] **Step 4: Replace hardcoded color `#a9cf54` with new brand green `#4a7c3f` across all files**

```bash
# Find all files using the old brand color
grep -rl '#a9cf54' src/ --include='*.astro' --include='*.css'
# Replace in each file
```

Replace `#a9cf54` → `#4a7c3f` and `#588f27` → `#2d5a27` throughout all `.astro` files.

- [ ] **Step 5: Verify build and visual check**

```bash
npm run build && npm run preview
```

Open http://localhost:4321 and verify new colors and logo render correctly.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: rebrand to Spa Company Indonesia — logo, colors, WhatsApp"
```

---

### Task 3: i18n Translation System

**Files:**
- Create: `src/i18n/translations.ts`
- Create: `src/i18n/utils.ts`

- [ ] **Step 1: Create translation strings file**

Create `src/i18n/translations.ts`:

```typescript
export const translations = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.services': 'Services',
    'nav.jobs': 'Job Board',
    'nav.about': 'About Us',
    'nav.contact': 'Contact',
    'nav.getQuote': 'Get a Quote',
    'nav.blog': 'Blog',
    'nav.book': 'Book',
    'nav.forCandidates': 'For Job Seekers',
    'nav.postJob': 'Post a Job',

    // Home
    'home.hero.title': "Indonesia's Leading Therapist Recruiting Portal",
    'home.hero.subtitle': 'Find verified Indonesian massage therapists for your spa. Fast approval and placement guarantees.',
    'home.hero.cta': 'Browse Jobs',
    'home.hero.ctaEmployer': 'Post a Job',

    // Features
    'home.feature1.title': 'Large Database of Indonesian Therapists',
    'home.feature1.body': 'Every time you visit our site there is an online database of Indonesian therapists ready to go overseas. The database is updated daily so your time is never wasted.',
    'home.feature1.sub1.title': 'SHEER NUMBERS',
    'home.feature1.sub1.body': 'Hundreds of verified therapists to search from, all confirmed in our office.',
    'home.feature1.sub2.title': 'UPDATES',
    'home.feature1.sub2.body': 'Our database is regularly updated with real and verified people.',
    'home.feature1.sub3.title': 'GREAT PROFILES',
    'home.feature1.sub3.body': 'Profiles include work experience, short videos and therapist evaluations.',

    'home.feature2.title': 'Find Your Personnel Quickly',
    'home.feature2.body': 'Get a therapist within 24 hours of approving a job offer. Lower the time spent on ineffective HR tasks and focus on your core business.',
    'home.feature2.sub1.title': 'QUICK APPROVAL',
    'home.feature2.sub1.body': 'After you shortlist candidates, we approve therapists for the job as quickly as possible.',
    'home.feature2.sub2.title': 'SAVE TIME',
    'home.feature2.sub2.body': 'Automated processes save your time. Constantly updated profiles with real job-seekers.',
    'home.feature2.sub3.title': 'MONEY BACK',
    'home.feature2.sub3.body': 'Refund 100% if you are unhappy with the selected candidate within the first month.',

    'home.feature3.title': 'Guarantees for Peace of Mind',
    'home.feature3.body': 'International recruiting is complicated. We offer a wide range of guarantees to secure your peace of mind.',
    'home.feature3.sub1.title': 'VERIFIED',
    'home.feature3.sub1.body': 'Hundreds of verified therapists to choose from. What you see is what you get.',
    'home.feature3.sub2.title': 'LIVE CHAT',
    'home.feature3.sub2.body': 'Chat online with approved therapists to discuss work details directly.',
    'home.feature3.sub3.title': 'GUARANTEE',
    'home.feature3.sub3.body': 'Money-back guarantee — refund 100% if unhappy within the first month.',

    // Steps
    'home.step1.label': 'Post a Job',
    'home.step1.body': 'Fill a quick form with your spa details and job requirements.',
    'home.step2.label': 'Payment & Verification',
    'home.step2.body': 'Pay via bank transfer. After payment your job goes live.',
    'home.step3.label': 'Browse Candidates',
    'home.step3.body': 'Search our database, watch therapist videos, and shortlist your favourites.',
    'home.step4.label': 'Select & Approve',
    'home.step4.body': 'Make your final selection. We handle documentation, visa support, and onboarding.',

    // Service
    'service.hero.title': 'Our Services',
    'service.hero.subtitle': 'End-to-end Indonesian therapist recruitment — from sourcing and vetting to visa processing and placement.',
    'service.headhunting.title': 'Headhunting & Candidate Matching',
    'service.headhunting.body': 'We source and match Indonesian therapists to your specific requirements — skills, experience, location, and salary range.',
    'service.screening.title': 'Screening & Verification',
    'service.screening.body': 'Every candidate is verified in person at our Indonesia office. We check identity, qualifications, work history, and conduct skill evaluations.',
    'service.documents.title': 'Document Processing',
    'service.documents.body': 'We handle visa applications, work permits, contract preparation, and all required documentation for international placement.',
    'service.flight.title': 'Flight Arrangements',
    'service.flight.body': 'We coordinate travel logistics including flight booking, departure orientation, and arrival coordination with your spa.',
    'service.aftercare.title': 'After-Recruitment Services',
    'service.aftercare.body': 'Ongoing support after placement — performance check-ins, contract renewals, replacement guarantees, and therapist welfare monitoring.',

    // About
    'about.hero.title': 'About Spa Company Indonesia',
    'about.hero.subtitle': 'Your trusted recruitment partner for Indonesian therapists.',
    'about.permits.title': 'Licensed & Registered',
    'about.permits.body': 'Spa Company Indonesia is a fully licensed recruitment agency operating under Indonesian law.',
    'about.team.title': 'Our Team',
    'about.team.body': 'Meet the people behind your recruitment.',
    'about.testimonials.title': 'What Our Candidates Say',

    // Contact
    'contact.hero.title': 'Contact Us',
    'contact.hero.subtitle': 'We respond within one business day.',
    'contact.whatsapp': 'Chat on WhatsApp',
    'contact.form.name': 'Name',
    'contact.form.phone': 'Phone',
    'contact.form.email': 'Email',
    'contact.form.subject': 'Subject',
    'contact.form.message': 'Message',
    'contact.form.send': 'Send Message',
    'contact.form.success': 'Message Sent!',
    'contact.form.successBody': "We'll get back to you within one business day.",

    // Jobs
    'jobs.hero.title': 'Job Board',
    'jobs.hero.subtitle': 'Browse current overseas job opportunities for Indonesian therapists.',
    'jobs.search': 'Search jobs...',
    'jobs.uploadCv': 'Upload Your CV',
    'jobs.noJobs': 'No jobs available at the moment. Check back soon!',
    'jobs.apply': 'Apply via WhatsApp',

    // Get a Quote
    'quote.hero.title': 'Get a Quote',
    'quote.hero.subtitle': 'Post a Job Here',

    // Footer
    'footer.description': "Indonesia's leading Indonesian therapist recruiting portal. Find verified, experienced therapists for your spa.",
    'footer.navigation': 'Navigation',
    'footer.getInTouch': 'Get in Touch',
    'footer.location': 'Indonesia',
    'footer.copyright': 'Spa Company Indonesia — All Rights Reserved',

    // Common
    'common.learnMore': 'Learn More',
    'common.contactUs': 'Contact Us',
    'common.getStarted': 'Get Started',
  },
  id: {
    // Nav
    'nav.home': 'Beranda',
    'nav.services': 'Layanan',
    'nav.jobs': 'Lowongan Kerja',
    'nav.about': 'Tentang Kami',
    'nav.contact': 'Kontak',
    'nav.getQuote': 'Minta Penawaran',
    'nav.blog': 'Blog',
    'nav.book': 'Buku',
    'nav.forCandidates': 'Untuk Pencari Kerja',
    'nav.postJob': 'Pasang Lowongan',

    // Home
    'home.hero.title': 'Portal Rekrutmen Terapis Terkemuka di Indonesia',
    'home.hero.subtitle': 'Temukan terapis pijat Indonesia terverifikasi untuk spa Anda. Persetujuan cepat dan jaminan penempatan.',
    'home.hero.cta': 'Lihat Lowongan',
    'home.hero.ctaEmployer': 'Pasang Lowongan',

    // Features
    'home.feature1.title': 'Database Besar Terapis Indonesia',
    'home.feature1.body': 'Setiap kali Anda mengunjungi situs kami, ada database online terapis Indonesia yang siap bekerja di luar negeri. Database diperbarui setiap hari.',
    'home.feature1.sub1.title': 'JUMLAH BESAR',
    'home.feature1.sub1.body': 'Ratusan terapis terverifikasi untuk dicari, semua dikonfirmasi di kantor kami.',
    'home.feature1.sub2.title': 'UPDATE',
    'home.feature1.sub2.body': 'Database kami secara rutin diperbarui dengan orang-orang nyata dan terverifikasi.',
    'home.feature1.sub3.title': 'PROFIL LENGKAP',
    'home.feature1.sub3.body': 'Profil mencakup pengalaman kerja, video pendek, dan evaluasi terapis.',

    'home.feature2.title': 'Temukan Personel Anda dengan Cepat',
    'home.feature2.body': 'Dapatkan terapis dalam 24 jam setelah menyetujui tawaran kerja. Kurangi waktu untuk tugas HR yang tidak efektif.',
    'home.feature2.sub1.title': 'PERSETUJUAN CEPAT',
    'home.feature2.sub1.body': 'Setelah Anda memilih kandidat, kami menyetujui terapis untuk pekerjaan secepat mungkin.',
    'home.feature2.sub2.title': 'HEMAT WAKTU',
    'home.feature2.sub2.body': 'Proses otomatis menghemat waktu Anda. Profil yang selalu diperbarui.',
    'home.feature2.sub3.title': 'UANG KEMBALI',
    'home.feature2.sub3.body': 'Pengembalian 100% jika Anda tidak puas dengan kandidat dalam bulan pertama.',

    'home.feature3.title': 'Jaminan untuk Ketenangan Pikiran',
    'home.feature3.body': 'Rekrutmen internasional itu rumit. Kami menawarkan berbagai jaminan untuk ketenangan pikiran Anda.',
    'home.feature3.sub1.title': 'TERVERIFIKASI',
    'home.feature3.sub1.body': 'Ratusan terapis terverifikasi untuk dipilih. Yang Anda lihat adalah yang Anda dapatkan.',
    'home.feature3.sub2.title': 'CHAT LANGSUNG',
    'home.feature3.sub2.body': 'Chat online dengan terapis yang disetujui untuk mendiskusikan detail pekerjaan.',
    'home.feature3.sub3.title': 'JAMINAN',
    'home.feature3.sub3.body': 'Jaminan uang kembali — pengembalian 100% jika tidak puas dalam bulan pertama.',

    // Steps
    'home.step1.label': 'Pasang Lowongan',
    'home.step1.body': 'Isi formulir singkat dengan detail spa dan persyaratan kerja Anda.',
    'home.step2.label': 'Pembayaran & Verifikasi',
    'home.step2.body': 'Bayar melalui transfer bank. Setelah pembayaran, lowongan Anda aktif.',
    'home.step3.label': 'Telusuri Kandidat',
    'home.step3.body': 'Cari database kami, tonton video terapis, dan pilih favorit Anda.',
    'home.step4.label': 'Pilih & Setujui',
    'home.step4.body': 'Buat pilihan akhir. Kami mengurus dokumentasi, dukungan visa, dan onboarding.',

    // Service
    'service.hero.title': 'Layanan Kami',
    'service.hero.subtitle': 'Rekrutmen terapis Indonesia end-to-end — dari pencarian dan verifikasi hingga pemrosesan visa dan penempatan.',
    'service.headhunting.title': 'Headhunting & Pencocokan Kandidat',
    'service.headhunting.body': 'Kami mencari dan mencocokkan terapis Indonesia sesuai kebutuhan spesifik Anda.',
    'service.screening.title': 'Screening & Verifikasi',
    'service.screening.body': 'Setiap kandidat diverifikasi langsung di kantor Indonesia kami.',
    'service.documents.title': 'Pemrosesan Dokumen',
    'service.documents.body': 'Kami mengurus aplikasi visa, izin kerja, persiapan kontrak, dan semua dokumentasi.',
    'service.flight.title': 'Pengaturan Penerbangan',
    'service.flight.body': 'Kami mengkoordinasikan logistik perjalanan termasuk pemesanan penerbangan dan orientasi keberangkatan.',
    'service.aftercare.title': 'Layanan Pasca-Rekrutmen',
    'service.aftercare.body': 'Dukungan berkelanjutan setelah penempatan — pemeriksaan kinerja, perpanjangan kontrak, dan jaminan penggantian.',

    // About
    'about.hero.title': 'Tentang Spa Company Indonesia',
    'about.hero.subtitle': 'Mitra rekrutmen terpercaya untuk terapis Indonesia.',
    'about.permits.title': 'Berlisensi & Terdaftar',
    'about.permits.body': 'Spa Company Indonesia adalah agen rekrutmen berlisensi penuh yang beroperasi di bawah hukum Indonesia.',
    'about.team.title': 'Tim Kami',
    'about.team.body': 'Kenali orang-orang di balik rekrutmen Anda.',
    'about.testimonials.title': 'Apa Kata Kandidat Kami',

    // Contact
    'contact.hero.title': 'Hubungi Kami',
    'contact.hero.subtitle': 'Kami merespons dalam satu hari kerja.',
    'contact.whatsapp': 'Chat di WhatsApp',
    'contact.form.name': 'Nama',
    'contact.form.phone': 'Telepon',
    'contact.form.email': 'Email',
    'contact.form.subject': 'Subjek',
    'contact.form.message': 'Pesan',
    'contact.form.send': 'Kirim Pesan',
    'contact.form.success': 'Pesan Terkirim!',
    'contact.form.successBody': 'Kami akan menghubungi Anda dalam satu hari kerja.',

    // Jobs
    'jobs.hero.title': 'Lowongan Kerja',
    'jobs.hero.subtitle': 'Telusuri peluang kerja luar negeri saat ini untuk terapis Indonesia.',
    'jobs.search': 'Cari lowongan...',
    'jobs.uploadCv': 'Unggah CV Anda',
    'jobs.noJobs': 'Belum ada lowongan saat ini. Periksa kembali nanti!',
    'jobs.apply': 'Lamar via WhatsApp',

    // Get a Quote
    'quote.hero.title': 'Minta Penawaran',
    'quote.hero.subtitle': 'Pasang Lowongan Kerja di Sini',

    // Footer
    'footer.description': 'Portal rekrutmen terapis Indonesia terkemuka. Temukan terapis berpengalaman dan terverifikasi untuk spa Anda.',
    'footer.navigation': 'Navigasi',
    'footer.getInTouch': 'Hubungi Kami',
    'footer.location': 'Indonesia',
    'footer.copyright': 'Spa Company Indonesia — Hak Cipta Dilindungi',

    // Common
    'common.learnMore': 'Pelajari Lebih Lanjut',
    'common.contactUs': 'Hubungi Kami',
    'common.getStarted': 'Mulai Sekarang',
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations['en'];
```

- [ ] **Step 2: Create i18n utility functions**

Create `src/i18n/utils.ts`:

```typescript
import { translations, type Locale, type TranslationKey } from './translations';

export function getLangFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/');
  if (lang === 'en') return 'en';
  return 'id';
}

export function t(lang: Locale, key: TranslationKey): string {
  return translations[lang][key] ?? translations['en'][key] ?? key;
}

export function localizedPath(lang: Locale, path: string): string {
  // Strip any existing locale prefix
  const cleanPath = path.replace(/^\/(en|id)/, '');
  return `/${lang}${cleanPath || '/'}`;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx astro check
```

Expected: No type errors in i18n files.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/
git commit -m "feat: add i18n translation system with Bahasa Indonesia and English"
```

---

### Task 4: Update Header and Footer Components

**Files:**
- Modify: `src/components/Header.astro`
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Rewrite Header.astro with i18n, language toggle, and Indonesia branding**

```astro
---
import { getLangFromUrl, t, localizedPath } from '../i18n/utils';

const lang = getLangFromUrl(Astro.url);
const otherLang = lang === 'id' ? 'en' : 'id';

const navLinks = [
  { key: 'nav.home' as const, href: '/' },
  { key: 'nav.services' as const, href: '/service' },
  { key: 'nav.jobs' as const, href: '/jobs' },
  { key: 'nav.about' as const, href: '/about' },
  { key: 'nav.getQuote' as const, href: '/get-a-quote' },
  { key: 'nav.blog' as const, href: '/blog' },
  { key: 'nav.contact' as const, href: '/contact' },
];

const pathname = Astro.url.pathname;
---

<header class="sticky top-0 z-50 bg-white shadow-md">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">

      <!-- Logo -->
      <a href={localizedPath(lang, '/')} class="shrink-0">
        <img src="/images/spa-company-indonesia-logo.png" alt="Spa Company Indonesia" class="h-10 object-contain" />
      </a>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-6">
        {navLinks.map(({ key, href }) => {
          const localHref = localizedPath(lang, href);
          const isActive = href === '/' ? pathname === localHref : pathname.startsWith(localHref);
          return (
            <a
              href={localHref}
              class={`text-sm font-medium transition-colors ${
                isActive
                  ? 'text-[#4a7c3f] border-b-2 border-[#4a7c3f] pb-0.5'
                  : 'text-gray-600 hover:text-[#4a7c3f]'
              }`}
            >
              {t(lang, key)}
            </a>
          );
        })}
      </nav>

      <!-- CTA + Language Toggle -->
      <div class="hidden md:flex items-center gap-2">
        <!-- Language Toggle -->
        <a
          href={localizedPath(otherLang, pathname.replace(/^\/(en|id)/, ''))}
          class="px-3 py-1.5 text-xs font-bold rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors uppercase"
        >
          {otherLang === 'en' ? 'EN' : 'ID'}
        </a>
        <a
          href={localizedPath(lang, '/jobs')}
          class="px-4 py-2 text-sm font-medium rounded-full bg-[#4a7c3f] text-white hover:bg-[#2d5a27] transition-colors"
        >
          {t(lang, 'nav.forCandidates')}
        </a>
        <a
          href={localizedPath(lang, '/contact')}
          class="px-4 py-2 text-sm font-medium rounded-full bg-[#ababab] text-white hover:bg-gray-500 transition-colors"
        >
          {t(lang, 'nav.postJob')}
        </a>
      </div>

      <!-- Mobile Hamburger -->
      <button
        id="mobile-menu-btn"
        class="md:hidden p-2 rounded-md text-gray-600 hover:text-[#4a7c3f] focus:outline-none"
        aria-label="Toggle menu"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path id="menu-icon-open" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          <path id="menu-icon-close" class="hidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Mobile Menu -->
  <div id="mobile-menu" class="hidden md:hidden border-t border-gray-100 bg-white">
    <nav class="flex flex-col px-4 py-3 gap-1">
      {navLinks.map(({ key, href }) => {
        const localHref = localizedPath(lang, href);
        const isActive = href === '/' ? pathname === localHref : pathname.startsWith(localHref);
        return (
          <a
            href={localHref}
            class={`px-3 py-2 rounded-md text-sm font-medium ${
              isActive
                ? 'bg-[#4a7c3f]/10 text-[#4a7c3f]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#4a7c3f]'
            }`}
          >
            {t(lang, key)}
          </a>
        );
      })}
      <a
        href={localizedPath(otherLang, pathname.replace(/^\/(en|id)/, ''))}
        class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        {otherLang === 'en' ? '🇬🇧 English' : '🇮🇩 Bahasa Indonesia'}
      </a>
      <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <a
          href={localizedPath(lang, '/jobs')}
          class="flex-1 text-center px-4 py-2 text-sm font-medium rounded-full bg-[#4a7c3f] text-white"
        >
          {t(lang, 'nav.forCandidates')}
        </a>
        <a
          href={localizedPath(lang, '/contact')}
          class="flex-1 text-center px-4 py-2 text-sm font-medium rounded-full bg-[#ababab] text-white"
        >
          {t(lang, 'nav.postJob')}
        </a>
      </div>
    </nav>
  </div>
</header>

<script>
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  const iconOpen = document.getElementById('menu-icon-open');
  const iconClose = document.getElementById('menu-icon-close');

  btn?.addEventListener('click', () => {
    const isOpen = !menu?.classList.contains('hidden');
    menu?.classList.toggle('hidden', isOpen);
    iconOpen?.classList.toggle('hidden', !isOpen);
    iconClose?.classList.toggle('hidden', isOpen);
  });
</script>
```

- [ ] **Step 2: Rewrite Footer.astro with Indonesia branding and i18n**

```astro
---
import { getLangFromUrl, t, localizedPath } from '../i18n/utils';

const lang = getLangFromUrl(Astro.url);

const navLinks = [
  { key: 'nav.home' as const, href: '/' },
  { key: 'nav.services' as const, href: '/service' },
  { key: 'nav.jobs' as const, href: '/jobs' },
  { key: 'nav.about' as const, href: '/about' },
  { key: 'nav.contact' as const, href: '/contact' },
  { key: 'nav.getQuote' as const, href: '/get-a-quote' },
];
---

<footer class="bg-gray-900 text-gray-300">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">

      <!-- Brand -->
      <div>
        <a href={localizedPath(lang, '/')} class="inline-block mb-4">
          <img src="/images/spa-company-indonesia-logo.png" alt="Spa Company Indonesia" class="h-12 object-contain brightness-0 invert" />
        </a>
        <p class="text-sm text-gray-400 leading-relaxed">
          {t(lang, 'footer.description')}
        </p>
      </div>

      <!-- Navigation -->
      <div>
        <h3 class="text-white font-semibold mb-4">{t(lang, 'footer.navigation')}</h3>
        <ul class="space-y-2">
          {navLinks.map(({ key, href }) => (
            <li>
              <a href={localizedPath(lang, href)} class="text-sm text-gray-400 hover:text-[#4a7c3f] transition-colors">
                {t(lang, key)}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <!-- Contact -->
      <div>
        <h3 class="text-white font-semibold mb-4">{t(lang, 'footer.getInTouch')}</h3>
        <ul class="space-y-2 text-sm text-gray-400">
          <li>{t(lang, 'footer.location')}</li>
          <li>
            <a href="https://wa.me/628211519986" class="hover:text-[#4a7c3f] transition-colors">
              WhatsApp: +62 821 151 9986
            </a>
          </li>
          <li>
            <a href="mailto:info@spacompany-indonesia.com" class="hover:text-[#4a7c3f] transition-colors">
              info@spacompany-indonesia.com
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-10 pt-6 border-t border-gray-700 text-center text-sm text-gray-500">
      &copy; {new Date().getFullYear()} {t(lang, 'footer.copyright')}
    </div>
  </div>
</footer>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.astro src/components/Footer.astro
git commit -m "feat: update Header and Footer with i18n and Indonesia branding"
```

---

### Task 5: Create i18n Page Structure — Home Page

**Files:**
- Create: `src/pages/id/index.astro`
- Create: `src/pages/en/index.astro`
- Delete: `src/pages/index.astro` (replaced by i18n versions)
- Delete: `src/pages/home-th.astro`

- [ ] **Step 1: Create the shared home page template**

Since both `/id/` and `/en/` render the same layout with different translations, create `src/pages/en/index.astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import { getLangFromUrl, t, localizedPath } from '../../i18n/utils';

const lang = getLangFromUrl(Astro.url);

const features = [
  {
    titleKey: 'home.feature1.title' as const,
    bodyKey: 'home.feature1.body' as const,
    img: '/images/Main1-1.png',
    imgLeft: true,
    subs: [
      { titleKey: 'home.feature1.sub1.title' as const, img: '/images/sub1-1.png', bodyKey: 'home.feature1.sub1.body' as const },
      { titleKey: 'home.feature1.sub2.title' as const, img: '/images/sub1-2.png', bodyKey: 'home.feature1.sub2.body' as const },
      { titleKey: 'home.feature1.sub3.title' as const, img: '/images/sub1-3.png', bodyKey: 'home.feature1.sub3.body' as const },
    ],
  },
  {
    titleKey: 'home.feature2.title' as const,
    bodyKey: 'home.feature2.body' as const,
    img: '/images/Main2.png',
    imgLeft: false,
    subs: [
      { titleKey: 'home.feature2.sub1.title' as const, img: '/images/sub2-1.png', bodyKey: 'home.feature2.sub1.body' as const },
      { titleKey: 'home.feature2.sub2.title' as const, img: '/images/sub2-2.png', bodyKey: 'home.feature2.sub2.body' as const },
      { titleKey: 'home.feature2.sub3.title' as const, img: '/images/sub2-3.png', bodyKey: 'home.feature2.sub3.body' as const },
    ],
  },
  {
    titleKey: 'home.feature3.title' as const,
    bodyKey: 'home.feature3.body' as const,
    img: '/images/Main3.png',
    imgLeft: true,
    subs: [
      { titleKey: 'home.feature3.sub1.title' as const, img: '/images/sub3-1.png', bodyKey: 'home.feature3.sub1.body' as const },
      { titleKey: 'home.feature3.sub2.title' as const, img: '/images/sub3-2.png', bodyKey: 'home.feature3.sub2.body' as const },
      { titleKey: 'home.feature3.sub3.title' as const, img: '/images/sub3-3.png', bodyKey: 'home.feature3.sub3.body' as const },
    ],
  },
];

const steps = [
  { num: 1, labelKey: 'home.step1.label' as const, img: '/images/02-Post-A-Job.png', bodyKey: 'home.step1.body' as const },
  { num: 2, labelKey: 'home.step2.label' as const, img: '/images/03-Payment.png', bodyKey: 'home.step2.body' as const },
  { num: 3, labelKey: 'home.step3.label' as const, img: '/images/04-Select-Candidates.png', bodyKey: 'home.step3.body' as const },
  { num: 4, labelKey: 'home.step4.label' as const, img: '/images/06-Approval.png', bodyKey: 'home.step4.body' as const },
];
---

<Layout
  title={lang === 'en' ? "Spa Company Indonesia — Indonesia's Leading Therapist Recruiting Portal" : "Spa Company Indonesia — Portal Rekrutmen Terapis Terkemuka di Indonesia"}
  description={t(lang, 'home.hero.subtitle')}
  lang={lang}
>

  <!-- Hero -->
  <section class="relative bg-[#4a7c3f] py-20 text-center overflow-hidden">
    <div class="max-w-4xl mx-auto px-4 relative z-10">
      <img src="/images/spa-company-indonesia-logo.png" alt="Spa Company Indonesia" class="h-24 mx-auto mb-6" />
      <h1 class="text-4xl sm:text-5xl font-bold text-white mb-4">{t(lang, 'home.hero.title')}</h1>
      <p class="text-white/85 text-lg mb-8 max-w-2xl mx-auto">{t(lang, 'home.hero.subtitle')}</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <a href={localizedPath(lang, '/jobs')} class="px-8 py-3 rounded-full bg-white text-[#4a7c3f] font-bold hover:bg-gray-100 transition-colors">
          {t(lang, 'home.hero.cta')}
        </a>
        <a href={localizedPath(lang, '/get-a-quote')} class="px-8 py-3 rounded-full border-2 border-white text-white font-bold hover:bg-white hover:text-[#4a7c3f] transition-colors">
          {t(lang, 'home.hero.ctaEmployer')}
        </a>
      </div>
    </div>
  </section>

  <!-- Features -->
  {features.map((f, i) => (
    <section class={`py-16 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class={`flex flex-col ${f.imgLeft ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12`}>
          <div class="md:w-1/2">
            <img src={f.img} alt={t(lang, f.titleKey)} class="rounded-2xl shadow-lg w-full object-cover" />
          </div>
          <div class="md:w-1/2">
            <h2 class="text-3xl font-bold text-gray-900 mb-4">{t(lang, f.titleKey)}</h2>
            <p class="text-gray-600 leading-relaxed mb-8">{t(lang, f.bodyKey)}</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {f.subs.map((s) => (
                <div class="text-center">
                  <img src={s.img} alt={t(lang, s.titleKey)} class="w-16 h-16 mx-auto mb-2 object-contain" />
                  <h3 class="text-xs font-bold text-gray-800 mb-1">{t(lang, s.titleKey)}</h3>
                  <p class="text-xs text-gray-500">{t(lang, s.bodyKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  ))}

  <!-- How It Works -->
  <section class="py-16 bg-[#4a7c3f]">
    <div class="max-w-5xl mx-auto px-4 text-center">
      <h2 class="text-3xl font-bold text-white mb-10">
        {lang === 'en' ? 'How It Works' : 'Cara Kerjanya'}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-8">
        {steps.map((s) => (
          <div>
            <div class="w-16 h-16 rounded-full bg-white text-[#4a7c3f] text-xl font-bold flex items-center justify-center mx-auto mb-4">{s.num}</div>
            <img src={s.img} alt={t(lang, s.labelKey)} class="w-20 h-20 mx-auto mb-3 object-contain" />
            <h3 class="font-semibold text-white mb-1">{t(lang, s.labelKey)}</h3>
            <p class="text-sm text-white/75">{t(lang, s.bodyKey)}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <!-- WhatsApp CTA -->
  <section class="py-16 bg-gray-900 text-center">
    <div class="max-w-2xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-white mb-4">
        {lang === 'en' ? 'Ready to Get Started?' : 'Siap untuk Memulai?'}
      </h2>
      <p class="text-gray-400 mb-8">
        {lang === 'en' ? 'Contact us on WhatsApp for a quick response.' : 'Hubungi kami di WhatsApp untuk respons cepat.'}
      </p>
      <a
        href="https://wa.me/628211519986"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#25D366] text-white font-bold hover:bg-[#128C7E] transition-colors"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        {lang === 'en' ? 'Chat on WhatsApp' : 'Chat di WhatsApp'}
      </a>
    </div>
  </section>

</Layout>
```

- [ ] **Step 2: Create the Bahasa Indonesia version**

Copy `src/pages/en/index.astro` to `src/pages/id/index.astro` — the file is identical since it reads `lang` from the URL dynamically.

```bash
mkdir -p src/pages/id src/pages/en
cp src/pages/en/index.astro src/pages/id/index.astro
```

- [ ] **Step 3: Delete old pages**

```bash
rm src/pages/index.astro src/pages/home-th.astro
```

- [ ] **Step 4: Verify both routes work**

```bash
npm run build
```

Expected: Build succeeds. Routes `/en/` and `/id/` both exist. `/` redirects to `/id/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add i18n home page with Bahasa Indonesia and English"
```

---

### Task 6: Service Page (i18n)

**Files:**
- Create: `src/pages/en/service.astro`
- Create: `src/pages/id/service.astro`
- Delete: `src/pages/service.astro`

- [ ] **Step 1: Create the service page**

Create `src/pages/en/service.astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import { getLangFromUrl, t, localizedPath } from '../../i18n/utils';

const lang = getLangFromUrl(Astro.url);

const services = [
  {
    titleKey: 'service.headhunting.title' as const,
    bodyKey: 'service.headhunting.body' as const,
    img: '/images/Candidates-spolocna-Green-Lotus-1024x702.jpg',
    imgLeft: true,
    bullets: lang === 'en'
      ? ['Source candidates matching your criteria', 'Pre-vetted and interview-ready', 'Industry focus: Spa, Hospitality, General Worker', 'Fast turnaround from posting to shortlist']
      : ['Mencari kandidat sesuai kriteria Anda', 'Sudah diverifikasi dan siap wawancara', 'Fokus industri: Spa, Hospitality, Pekerja Umum', 'Proses cepat dari posting ke shortlist'],
    cta: { labelKey: 'nav.getQuote' as const, href: '/get-a-quote' },
  },
  {
    titleKey: 'service.screening.title' as const,
    bodyKey: 'service.screening.body' as const,
    img: '/images/Sabaidee-therapists-1024x768.jpg',
    imgLeft: false,
    bullets: lang === 'en'
      ? ['In-person identity verification', 'Skills evaluation and testing', 'Work history confirmation', 'Background checks']
      : ['Verifikasi identitas langsung', 'Evaluasi dan tes keterampilan', 'Konfirmasi riwayat kerja', 'Pemeriksaan latar belakang'],
    cta: { labelKey: 'common.contactUs' as const, href: '/contact' },
  },
  {
    titleKey: 'service.documents.title' as const,
    bodyKey: 'service.documents.body' as const,
    img: '/images/Main2.png',
    imgLeft: true,
    bullets: lang === 'en'
      ? ['Visa application processing', 'Work permit preparation', 'Employment contract drafting', 'Government compliance support']
      : ['Pemrosesan aplikasi visa', 'Persiapan izin kerja', 'Penyusunan kontrak kerja', 'Dukungan kepatuhan pemerintah'],
    cta: { labelKey: 'nav.getQuote' as const, href: '/get-a-quote' },
  },
  {
    titleKey: 'service.flight.title' as const,
    bodyKey: 'service.flight.body' as const,
    img: '/images/Main3.png',
    imgLeft: false,
    bullets: lang === 'en'
      ? ['Flight booking coordination', 'Pre-departure orientation', 'Airport pickup arrangement', 'Arrival coordination with employer']
      : ['Koordinasi pemesanan penerbangan', 'Orientasi pra-keberangkatan', 'Pengaturan penjemputan bandara', 'Koordinasi kedatangan dengan pemberi kerja'],
    cta: { labelKey: 'common.contactUs' as const, href: '/contact' },
  },
  {
    titleKey: 'service.aftercare.title' as const,
    bodyKey: 'service.aftercare.body' as const,
    img: '/images/Main1-1.png',
    imgLeft: true,
    bullets: lang === 'en'
      ? ['Performance check-ins', 'Contract renewal support', 'Replacement guarantee', 'Therapist welfare monitoring']
      : ['Pemeriksaan kinerja', 'Dukungan perpanjangan kontrak', 'Jaminan penggantian', 'Pemantauan kesejahteraan terapis'],
    cta: { labelKey: 'common.contactUs' as const, href: '/contact' },
  },
];
---

<Layout
  title={lang === 'en' ? 'Our Services — Spa Company Indonesia' : 'Layanan Kami — Spa Company Indonesia'}
  description={t(lang, 'service.hero.subtitle')}
  lang={lang}
>

  <!-- Page Hero -->
  <section class="bg-[#4a7c3f] py-16 text-center">
    <div class="max-w-3xl mx-auto px-4">
      <h1 class="text-4xl font-bold text-white mb-4">{t(lang, 'service.hero.title')}</h1>
      <p class="text-white/85 text-lg">{t(lang, 'service.hero.subtitle')}</p>
    </div>
  </section>

  <!-- Service Sections -->
  {services.map((s, i) => (
    <section class={`py-16 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class={`flex flex-col ${s.imgLeft ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12`}>
          <div class="md:w-1/2">
            <img src={s.img} alt={t(lang, s.titleKey)} class="rounded-2xl shadow-lg w-full object-cover max-h-80" />
          </div>
          <div class="md:w-1/2">
            <h2 class="text-3xl font-bold text-gray-900 mb-4">{t(lang, s.titleKey)}</h2>
            <p class="text-gray-600 leading-relaxed mb-6">{t(lang, s.bodyKey)}</p>
            <ul class="space-y-2 mb-6">
              {s.bullets.map((b) => (
                <li class="flex items-start gap-3">
                  <span class="mt-1 w-5 h-5 rounded-full bg-[#4a7c3f] flex items-center justify-center shrink-0">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span class="text-gray-600">{b}</span>
                </li>
              ))}
            </ul>
            <a href={localizedPath(lang, s.cta.href)}
              class="inline-block px-6 py-2.5 rounded-full bg-[#4a7c3f] text-white font-semibold text-sm hover:bg-[#2d5a27] transition-colors">
              {t(lang, s.cta.labelKey)}
            </a>
          </div>
        </div>
      </div>
    </section>
  ))}

  <!-- CTA -->
  <section class="bg-gray-900 py-16 text-center">
    <div class="max-w-2xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-white mb-4">
        {lang === 'en' ? 'Ready to Hire?' : 'Siap untuk Merekrut?'}
      </h2>
      <p class="text-gray-400 mb-8">
        {lang === 'en' ? 'Post your job today and we\'ll have shortlisted candidates for you within days.' : 'Pasang lowongan hari ini dan kami akan memiliki kandidat terpilih untuk Anda dalam hitungan hari.'}
      </p>
      <a href={localizedPath(lang, '/get-a-quote')}
        class="px-10 py-4 rounded-full bg-[#4a7c3f] text-white font-bold hover:bg-[#2d5a27] transition-colors">
        {t(lang, 'nav.postJob')}
      </a>
    </div>
  </section>

</Layout>
```

- [ ] **Step 2: Copy to id/ directory and delete old page**

```bash
cp src/pages/en/service.astro src/pages/id/service.astro
rm src/pages/service.astro
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add i18n service page with Indonesia-specific services"
```

---

### Task 7: Contact Page (i18n) with WhatsApp

**Files:**
- Create: `src/pages/en/contact.astro`
- Create: `src/pages/id/contact.astro`
- Delete: `src/pages/contact.astro`

- [ ] **Step 1: Create the contact page**

Create `src/pages/en/contact.astro` — same structure as Bangkok's contact page but with:
- WhatsApp as primary contact method (replacing Facebook)
- Indonesia location and email (info@spacompany-indonesia.com)
- i18n labels from translation system
- Updated brand color from `#a9cf54` to `#4a7c3f`
- formsubmit.co endpoint updated to Indonesia email addresses
- Firestore collection remains `messages`

The page structure is identical to the Bangkok version at `src/pages/contact.astro` with the following substitutions:
- Import i18n utilities: `import { getLangFromUrl, t, localizedPath } from '../../i18n/utils';`
- `const lang = getLangFromUrl(Astro.url);`
- Layout title/description use `t(lang, ...)` calls
- "Bangkok, Thailand" → `t(lang, 'footer.location')`
- "info@spa-company.com" → "info@spacompany-indonesia.com"
- Facebook section → WhatsApp section with link to `https://wa.me/628211519986`
- Map image → placeholder or remove (update later when office location is confirmed)
- All `#a9cf54` → `#4a7c3f`, all `#588f27` → `#2d5a27`
- formsubmit.co URL updated to Indonesia team emails

- [ ] **Step 2: Copy to id/ directory and delete old page**

```bash
cp src/pages/en/contact.astro src/pages/id/contact.astro
rm src/pages/contact.astro
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add i18n contact page with WhatsApp integration"
```

---

### Task 8: Get a Quote Page (i18n)

**Files:**
- Create: `src/pages/en/get-a-quote.astro`
- Create: `src/pages/id/get-a-quote.astro`
- Delete: `src/pages/get-a-quote.astro`

- [ ] **Step 1: Create the get-a-quote page**

Same structure as Bangkok's `get-a-quote.astro` with:
- i18n imports and `lang` detection
- Layout wraps with `lang={lang}`
- Hero text uses `t(lang, 'quote.hero.title')` and `t(lang, 'quote.hero.subtitle')`
- "Thai therapist" references → "Indonesian therapist"
- "Bangkok" → "Indonesia"
- All `#a9cf54` → `#4a7c3f`
- formsubmit.co URL updated to Indonesia team emails
- Field labels translated for Bahasa Indonesia when `lang === 'id'`
- "Number of Therapists" label updated to include "Hospitality / General Worker" options
- The form fields remain the same (company, contact, address, country, salary, etc.) — they're universally applicable

- [ ] **Step 2: Copy to id/ and delete old**

```bash
cp src/pages/en/get-a-quote.astro src/pages/id/get-a-quote.astro
rm src/pages/get-a-quote.astro
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add i18n get-a-quote page for Indonesia"
```

---

### Task 9: Blog Page (i18n, posts copied)

**Files:**
- Create: `src/pages/en/blog.astro`
- Create: `src/pages/id/blog.astro`
- Delete: `src/pages/blog.astro`

- [ ] **Step 1: Create the blog page**

Same blog post data as Bangkok — all 15 posts are kept with the same content (English). The page chrome (hero, heading) is translated but blog post content stays in English for both locales (blog posts are business content relevant to international audience).

Adapt the Bangkok `blog.astro`:
- i18n imports, `lang` from URL
- Hero text: `t(lang, 'nav.blog')` for title
- "Spa Company Bangkok" → "Spa Company Indonesia" in titles
- All `#a9cf54` → `#4a7c3f`
- Book CTA section links to `/book` (kept from Bangkok)

- [ ] **Step 2: Copy to id/ and delete old**

```bash
cp src/pages/en/blog.astro src/pages/id/blog.astro
rm src/pages/blog.astro
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add i18n blog page with copied posts from Bangkok"
```

---

### Task 10: About / Trust Page (new)

**Files:**
- Create: `src/pages/en/about.astro`
- Create: `src/pages/id/about.astro`

- [ ] **Step 1: Create the About page**

Create `src/pages/en/about.astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import { getLangFromUrl, t, localizedPath } from '../../i18n/utils';

const lang = getLangFromUrl(Astro.url);

const teamMembers = [
  { name: 'Coming Soon', role: lang === 'en' ? 'Recruitment Manager' : 'Manajer Rekrutmen', img: '/images/team-placeholder.png' },
  { name: 'Coming Soon', role: lang === 'en' ? 'Candidate Coordinator' : 'Koordinator Kandidat', img: '/images/team-placeholder.png' },
  { name: 'Coming Soon', role: lang === 'en' ? 'Document Specialist' : 'Spesialis Dokumen', img: '/images/team-placeholder.png' },
];

const testimonials = [
  {
    quote: lang === 'en'
      ? '"Spa Company Indonesia helped me find a great job overseas. The process was smooth and professional."'
      : '"Spa Company Indonesia membantu saya menemukan pekerjaan yang bagus di luar negeri. Prosesnya lancar dan profesional."',
    name: 'Candidate testimonial coming soon',
    role: lang === 'en' ? 'Placed Therapist' : 'Terapis yang Ditempatkan',
    img: '/images/team-placeholder.png',
  },
];
---

<Layout
  title={t(lang, 'about.hero.title')}
  description={t(lang, 'about.hero.subtitle')}
  lang={lang}
>

  <!-- Hero -->
  <section class="bg-[#4a7c3f] py-16 text-center">
    <div class="max-w-3xl mx-auto px-4">
      <h1 class="text-4xl font-bold text-white mb-4">{t(lang, 'about.hero.title')}</h1>
      <p class="text-white/85 text-lg">{t(lang, 'about.hero.subtitle')}</p>
    </div>
  </section>

  <!-- Permits & Registration -->
  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center">{t(lang, 'about.permits.title')}</h2>
      <div class="bg-gray-50 rounded-2xl border border-gray-200 p-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-semibold text-gray-800 mb-2">{lang === 'en' ? 'Company Name' : 'Nama Perusahaan'}</h3>
            <p class="text-gray-600">Spa Company Indonesia</p>
          </div>
          <div>
            <h3 class="font-semibold text-gray-800 mb-2">{lang === 'en' ? 'Office Address' : 'Alamat Kantor'}</h3>
            <p class="text-gray-600 italic">{lang === 'en' ? 'Address coming soon' : 'Alamat segera hadir'}</p>
          </div>
          <div>
            <h3 class="font-semibold text-gray-800 mb-2">{lang === 'en' ? 'Recruitment License' : 'Izin Rekrutmen'}</h3>
            <p class="text-gray-600 italic">{lang === 'en' ? 'License details coming soon' : 'Detail izin segera hadir'}</p>
          </div>
          <div>
            <h3 class="font-semibold text-gray-800 mb-2">{lang === 'en' ? 'Contact' : 'Kontak'}</h3>
            <p class="text-gray-600">
              <a href="https://wa.me/628211519986" class="text-[#4a7c3f] hover:underline">+62 821 151 9986</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Team -->
  <section class="py-16 bg-gray-50">
    <div class="max-w-5xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-gray-900 mb-4 text-center">{t(lang, 'about.team.title')}</h2>
      <p class="text-gray-600 text-center mb-10">{t(lang, 'about.team.body')}</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {teamMembers.map((m) => (
          <div class="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div class="w-24 h-24 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center">
              <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 class="font-semibold text-gray-800">{m.name}</h3>
            <p class="text-sm text-gray-500">{m.role}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section class="py-16 bg-white">
    <div class="max-w-5xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-gray-900 mb-10 text-center">{t(lang, 'about.testimonials.title')}</h2>
      <div class="max-w-2xl mx-auto">
        {testimonials.map((tm) => (
          <div class="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <p class="text-gray-600 italic leading-relaxed mb-6">{tm.quote}</p>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div class="font-semibold text-gray-800 text-sm">{tm.name}</div>
                <div class="text-gray-500 text-xs">{tm.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-16 bg-[#4a7c3f] text-center">
    <div class="max-w-2xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-white mb-4">
        {lang === 'en' ? 'Want to Work Overseas?' : 'Ingin Bekerja di Luar Negeri?'}
      </h2>
      <p class="text-white/80 mb-8">
        {lang === 'en' ? 'Browse our current job openings or send us your CV.' : 'Lihat lowongan kerja kami saat ini atau kirimkan CV Anda.'}
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <a href={localizedPath(lang, '/jobs')} class="px-8 py-3 rounded-full bg-white text-[#4a7c3f] font-bold hover:bg-gray-100 transition-colors">
          {t(lang, 'nav.jobs')}
        </a>
        <a href="https://wa.me/628211519986" target="_blank" rel="noopener noreferrer"
          class="px-8 py-3 rounded-full border-2 border-white text-white font-bold hover:bg-white hover:text-[#4a7c3f] transition-colors">
          WhatsApp
        </a>
      </div>
    </div>
  </section>

</Layout>
```

- [ ] **Step 2: Copy to id/ directory**

```bash
cp src/pages/en/about.astro src/pages/id/about.astro
```

- [ ] **Step 3: Create team placeholder image**

```bash
# Create a simple placeholder (or use the SVG inline as already done in the template)
# The template uses inline SVG placeholders, so no image file needed yet
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add About/Trust page with permits, team, and testimonials placeholders"
```

---

### Task 11: Job Board Page (i18n) + Notion Cloud Function

**Files:**
- Create: `src/pages/en/jobs.astro`
- Create: `src/pages/id/jobs.astro`
- Create: `functions/src/fetchJobs.js`
- Modify: `functions/index.js` (add fetchJobs export)
- Modify: `functions/package.json` (add @notionhq/client if not present)

- [ ] **Step 1: Create the Cloud Function to fetch jobs from Notion**

Create `functions/src/fetchJobs.js`:

```javascript
const { onCall } = require('firebase-functions/v2/https');
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

exports.fetchJobs = onCall(async (request) => {
  const databaseId = process.env.NOTION_JOBS_DATABASE_ID;

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Show on Website',
      select: { equals: 'Yes' },
    },
    sorts: [{ property: 'Created', direction: 'descending' }],
  });

  const jobs = response.results.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      title: props.Title?.title?.[0]?.plain_text || 'Untitled',
      location: props.Location?.rich_text?.[0]?.plain_text || '',
      salary: props.Salary?.rich_text?.[0]?.plain_text || '',
      type: props.Type?.select?.name || '',
      industry: props.Industry?.select?.name || '',
      description: props.Description?.rich_text?.[0]?.plain_text || '',
      posted: page.created_time,
    };
  });

  return { jobs };
});
```

Note: The exact Notion property names (`Show on Website`, `Title`, `Location`, etc.) need to match the user's actual Notion Jobs database. These are reasonable defaults that can be adjusted after seeing the real database schema.

- [ ] **Step 2: Add fetchJobs to functions/index.js**

Add to `functions/index.js`:

```javascript
const { fetchJobs } = require('./src/fetchJobs');
exports.fetchJobs = fetchJobs;
```

- [ ] **Step 3: Add @notionhq/client dependency if needed**

```bash
cd functions && npm install @notionhq/client && cd ..
```

- [ ] **Step 4: Set Notion secrets in Firebase**

```bash
firebase functions:secrets:set NOTION_API_KEY
firebase functions:secrets:set NOTION_JOBS_DATABASE_ID
```

- [ ] **Step 5: Create the Job Board page**

Create `src/pages/en/jobs.astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import { getLangFromUrl, t, localizedPath } from '../../i18n/utils';

const lang = getLangFromUrl(Astro.url);
---

<Layout
  title={t(lang, 'jobs.hero.title') + ' — Spa Company Indonesia'}
  description={t(lang, 'jobs.hero.subtitle')}
  lang={lang}
>

  <!-- Hero -->
  <section class="bg-[#4a7c3f] py-16 text-center">
    <div class="max-w-3xl mx-auto px-4">
      <h1 class="text-4xl font-bold text-white mb-4">{t(lang, 'jobs.hero.title')}</h1>
      <p class="text-white/85 text-lg">{t(lang, 'jobs.hero.subtitle')}</p>
    </div>
  </section>

  <!-- Search + Upload -->
  <section class="py-6 bg-white border-b border-gray-200">
    <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
      <input
        id="job-search"
        type="text"
        placeholder={t(lang, 'jobs.search')}
        class="w-full sm:w-96 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c3f]/50 focus:border-[#4a7c3f] text-sm"
      />
      <label class="cursor-pointer px-6 py-3 rounded-full bg-[#4a7c3f] text-white font-semibold text-sm hover:bg-[#2d5a27] transition-colors flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {t(lang, 'jobs.uploadCv')}
        <input id="cv-upload" type="file" accept=".pdf,.doc,.docx" class="hidden" />
      </label>
    </div>
  </section>

  <!-- Job Listings -->
  <section class="py-12 bg-gray-50">
    <div class="max-w-5xl mx-auto px-4">
      <div id="jobs-loading" class="text-center py-12">
        <div class="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#4a7c3f] rounded-full animate-spin"></div>
        <p class="text-gray-500 mt-4">{lang === 'en' ? 'Loading jobs...' : 'Memuat lowongan...'}</p>
      </div>

      <div id="jobs-empty" class="hidden text-center py-12">
        <p class="text-gray-500 text-lg">{t(lang, 'jobs.noJobs')}</p>
      </div>

      <div id="jobs-list" class="hidden space-y-4"></div>
    </div>
  </section>

  <!-- WhatsApp CTA -->
  <section class="py-12 bg-white text-center">
    <div class="max-w-2xl mx-auto px-4">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">
        {lang === 'en' ? "Don't see the right job?" : 'Tidak menemukan lowongan yang tepat?'}
      </h2>
      <p class="text-gray-600 mb-6">
        {lang === 'en' ? 'Send us your CV on WhatsApp and we\'ll match you when new positions open.' : 'Kirim CV Anda melalui WhatsApp dan kami akan mencocokkan Anda saat posisi baru dibuka.'}
      </p>
      <a href="https://wa.me/628211519986" target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#25D366] text-white font-bold hover:bg-[#128C7E] transition-colors">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        {t(lang, 'jobs.apply')}
      </a>
    </div>
  </section>

</Layout>

<script>
  import { callFunction } from '../../lib/firebase.js';
  import { ref, uploadBytes } from 'firebase/storage';
  import { storage } from '../../lib/firebase.js';

  const listEl = document.getElementById('jobs-list')!;
  const loadingEl = document.getElementById('jobs-loading')!;
  const emptyEl = document.getElementById('jobs-empty')!;
  const searchInput = document.getElementById('job-search') as HTMLInputElement;

  let allJobs: any[] = [];

  async function loadJobs() {
    try {
      const result = await callFunction('fetchJobs', {});
      allJobs = (result.data as any).jobs || [];
      renderJobs(allJobs);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      loadingEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
    }
  }

  function renderJobs(jobs: any[]) {
    loadingEl.classList.add('hidden');

    if (jobs.length === 0) {
      emptyEl.classList.remove('hidden');
      listEl.classList.add('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    listEl.innerHTML = jobs.map((job) => `
      <div class="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold text-gray-900">${job.title}</h3>
            <div class="flex flex-wrap gap-2 mt-2">
              ${job.location ? `<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">${job.location}</span>` : ''}
              ${job.industry ? `<span class="text-xs px-2 py-1 rounded-full bg-[#4a7c3f]/10 text-[#4a7c3f]">${job.industry}</span>` : ''}
              ${job.type ? `<span class="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">${job.type}</span>` : ''}
            </div>
            ${job.salary ? `<p class="text-sm font-semibold text-gray-800 mt-2">${job.salary}</p>` : ''}
            ${job.description ? `<p class="text-sm text-gray-500 mt-2 line-clamp-2">${job.description}</p>` : ''}
          </div>
          <a href="https://wa.me/628211519986?text=${encodeURIComponent('Hi, I\'m interested in the job: ' + job.title)}"
            target="_blank" rel="noopener noreferrer"
            class="shrink-0 px-6 py-2.5 rounded-full bg-[#25D366] text-white font-semibold text-sm hover:bg-[#128C7E] transition-colors text-center">
            Apply via WhatsApp
          </a>
        </div>
      </div>
    `).join('');
  }

  // Search filter
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    const filtered = allJobs.filter((j) =>
      j.title.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.industry.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q)
    );
    renderJobs(filtered);
  });

  // CV Upload
  document.getElementById('cv-upload')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const storageRef = ref(storage, `cvs/${Date.now()}-${file.name}`);
    try {
      await uploadBytes(storageRef, file);
      alert(document.documentElement.lang === 'id'
        ? 'CV berhasil diunggah! Kami akan menghubungi Anda.'
        : 'CV uploaded successfully! We will contact you.');
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed. Please try again or send via WhatsApp.');
    }
  });

  loadJobs();
</script>
```

- [ ] **Step 6: Copy to id/ directory**

```bash
cp src/pages/en/jobs.astro src/pages/id/jobs.astro
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Job Board page with Notion integration and CV upload"
```

---

### Task 12: Remove Bangkok-Specific Pages

**Files:**
- Delete: `src/pages/therapists.astro`
- Delete: `src/pages/therapist.astro`
- Delete: `src/pages/candidates.astro`
- Delete: `src/pages/candidate.astro`
- Delete: `src/pages/intake.astro`
- Delete: `src/pages/intake/` (directory)
- Delete: `src/pages/s-legal.astro`
- Delete: `src/components/CandidateCard.astro`
- Delete: `src/components/CandidateForm.astro`
- Delete: `src/components/UploadZone.astro`
- Delete: `src/components/JobPositionTabs.astro`

- [ ] **Step 1: Remove all Bangkok-specific pages and components**

```bash
rm -f src/pages/therapists.astro src/pages/therapist.astro
rm -f src/pages/candidates.astro src/pages/candidate.astro
rm -f src/pages/intake.astro
rm -rf src/pages/intake/
rm -f src/pages/s-legal.astro
rm -f src/components/CandidateCard.astro src/components/CandidateForm.astro
rm -f src/components/UploadZone.astro src/components/JobPositionTabs.astro
```

- [ ] **Step 2: Remove Bangkok-specific Cloud Functions that aren't needed**

Keep: `sendLoginCode`, `verifyLoginCode` (auth — used by recruiter/admin)
Keep: `sendFormNotification` (contact/quote forms)
Remove: `importFromNotion`, `enrichFromNotion`, `submitToNotion`, `processDocuments`, `migrateTherapists`, `createTherapistInNotion`

```bash
rm -f functions/src/importFromNotion.js functions/src/enrichFromNotion.js
rm -f functions/src/submitToNotion.js functions/src/processDocuments.js
rm -f functions/src/migrateTherapists.js functions/src/createTherapistInNotion.js
rm -f functions/src/lib/ocrPrompts.js functions/src/lib/candidateIdGenerator.js
```

Update `functions/index.js` to remove the deleted exports.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Bangkok-specific pages and functions"
```

---

### Task 13: Keep Internal Pages (Recruiter, Admin, Checkout, Booking)

**Files:**
- Modify: `src/pages/recruiter.astro` (rebrand)
- Modify: `src/pages/admin.astro` (rebrand)
- Modify: `src/pages/checkout.astro` (rebrand)
- Modify: `src/pages/book.astro` (rebrand)

- [ ] **Step 1: Update recruiter.astro branding**

In `src/pages/recruiter.astro`:
- Change Layout title from "Spa Company Staff" to "Spa Company Indonesia Staff"
- Update `#a9cf54` → `#4a7c3f` throughout
- Change "Thai" references to "Indonesian" in skills/labels

- [ ] **Step 2: Update admin.astro branding**

Same pattern — title, colors, Thai → Indonesian references.

- [ ] **Step 3: Update checkout.astro and book.astro branding**

- Colors: `#a9cf54` → `#4a7c3f`
- "Spa Company Bangkok" → "Spa Company Indonesia"
- Book CTA links updated

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: rebrand internal pages (recruiter, admin, checkout, book) for Indonesia"
```

---

### Task 14: Firebase Deploy and Domain Setup

**Files:**
- Modify: `firebase.json` (verify hosting config)

- [ ] **Step 1: Initialize Firebase in the new project**

```bash
firebase use spa-indonesia
```

- [ ] **Step 2: Enable required Firebase services**

```bash
# Enable Firestore
firebase firestore:indexes:deploy
# Deploy storage rules
firebase deploy --only storage
# Deploy Firestore rules
firebase deploy --only firestore:rules
```

- [ ] **Step 3: Deploy Cloud Functions**

```bash
firebase deploy --only functions
```

Expected: Functions deploy successfully including `fetchJobs`, `sendLoginCode`, `verifyLoginCode`.

- [ ] **Step 4: Build and deploy hosting**

```bash
npm run build
firebase deploy --only hosting
```

Expected: Site accessible at `https://spa-indonesia.web.app`.

- [ ] **Step 5: Configure custom domain**

```bash
firebase hosting:channel:create production
# Then in Firebase console: Hosting > Add custom domain > spacompany-indonesia.com
# Follow DNS verification steps
```

- [ ] **Step 6: Verify live site**

Open `https://spa-indonesia.web.app` and verify:
- Root `/` redirects to `/id/`
- Language toggle switches between `/en/` and `/id/`
- WhatsApp floating button works
- All pages render with correct Indonesia branding
- Contact form submits to Firestore

- [ ] **Step 7: Commit any final config changes**

```bash
git add -A
git commit -m "chore: Firebase deployment configuration"
```

---

### Task 15: Create Firebase Web App and Set Environment Variables

**Files:**
- Create/Modify: `.env`

- [ ] **Step 1: Create a web app in the Firebase project**

```bash
firebase apps:create web "Spa Company Indonesia"
```

- [ ] **Step 2: Get the config and update .env**

```bash
firebase apps:sdkconfig web
```

Copy the output values into `.env`:

```
PUBLIC_FIREBASE_API_KEY=<from output>
PUBLIC_FIREBASE_AUTH_DOMAIN=spa-indonesia.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=spa-indonesia
PUBLIC_FIREBASE_STORAGE_BUCKET=spa-indonesia.firebasestorage.app
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<from output>
PUBLIC_FIREBASE_APP_ID=<from output>
```

- [ ] **Step 3: Rebuild and verify Firebase connection**

```bash
npm run build && npm run preview
```

Open the site, submit the contact form, and verify it appears in the Firestore console at https://console.firebase.google.com/project/spa-indonesia/firestore.
