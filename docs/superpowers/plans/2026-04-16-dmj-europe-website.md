# DMJ Europe Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual (SK/EN) Astro static site for DMJ Europe — a workforce recruitment company — with 6 pages, i18n routing, and a geo-restricted job application form.

**Architecture:** Separate Astro v6 project with Tailwind CSS v4. Folder-based i18n (`/sk/`, `/en/` prefixes) with shared JSON translation dictionaries. Shared components receive text via props. Forms submit via FormSubmit.co. Geo-restriction via client-side IP geolocation API.

**Tech Stack:** Astro v6, Tailwind CSS v4, TypeScript, FormSubmit.co, ip-api.com

**Spec:** `docs/superpowers/specs/2026-04-16-dmj-europe-website-design.md` (in spa-company repo)

---

## File Map

```
/Users/michaglio/Projects/dmj-europe/
├── astro.config.mjs                    # Astro config with Tailwind vite plugin
├── package.json                        # Dependencies: astro, tailwindcss, @tailwindcss/vite
├── tsconfig.json                       # Strict Astro TS config
├── public/
│   ├── images/
│   │   └── dmj-europe-logo.png         # Copied from spa-company
│   └── favicon.ico                     # Placeholder
├── src/
│   ├── styles/
│   │   └── global.css                  # Tailwind imports + theme (navy, cyan, purple)
│   ├── i18n/
│   │   ├── sk.json                     # All Slovak strings
│   │   ├── en.json                     # All English strings
│   │   └── utils.ts                    # getLang(), t() helpers
│   ├── layouts/
│   │   └── Layout.astro                # HTML shell: head, header, slot, footer
│   ├── components/
│   │   ├── Header.astro                # Sticky dark nav + hamburger + lang switcher
│   │   ├── Footer.astro                # Dark navy footer, 3 columns, SPA Company link
│   │   ├── Hero.astro                  # Full-width hero with overlay + CTA
│   │   ├── StepCard.astro              # Numbered process step
│   │   ├── ContactForm.astro           # Name/email/company/phone/message form
│   │   └── JobForm.astro               # Geo-gated recruitment form (12 fields)
│   └── pages/
│       ├── index.astro                 # Meta redirect to /sk/
│       ├── sk/
│       │   ├── index.astro             # Home SK
│       │   ├── o-nas.astro             # About SK
│       │   ├── personalny-lizing.astro # Staff Leasing SK
│       │   ├── proces.astro            # Process SK
│       │   └── kontakt.astro           # Contact SK
│       └── en/
│           ├── index.astro             # Home EN
│           ├── about.astro             # About EN
│           ├── staff-leasing.astro     # Staff Leasing EN
│           ├── process.astro           # Process EN
│           ├── contact.astro           # Contact EN
│           └── jobs.astro              # Job form (EN only, geo-restricted)
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `astro.config.mjs`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/styles/global.css`
- Copy: `public/images/dmj-europe-logo.png`

- [ ] **Step 1: Create project directory and initialize**

```bash
mkdir -p /Users/michaglio/Projects/dmj-europe
cd /Users/michaglio/Projects/dmj-europe
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/michaglio/Projects/dmj-europe
npm install astro@latest tailwindcss@latest @tailwindcss/vite@latest
```

- [ ] **Step 3: Create `astro.config.mjs`**

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

- [ ] **Step 5: Update `package.json` scripts**

Add to package.json scripts:
```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  }
}
```

- [ ] **Step 6: Create `src/styles/global.css`**

```css
@import "tailwindcss";

@theme {
  --color-navy: #1e2a5a;
  --color-navy-light: #2a3d6e;
  --color-navy-dark: #141d40;
  --color-steel: #3a7ca5;
  --color-steel-light: #5a9bc0;
  --color-cyan: #00b8c4;
  --color-cyan-dark: #009aa3;
  --color-purple: #3b2070;
  --color-gray-light: #f7f8fa;
  --color-gray-body: #4a5568;
  --color-success: #22c55e;

  --font-sans: "Inter", system-ui, sans-serif;
}
```

- [ ] **Step 7: Copy logo and create favicon placeholder**

```bash
mkdir -p /Users/michaglio/Projects/dmj-europe/public/images
cp /Users/michaglio/Projects/spa-company/public/images/dmj-europe-logo.png /Users/michaglio/Projects/dmj-europe/public/images/
touch /Users/michaglio/Projects/dmj-europe/public/favicon.ico
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules/
dist/
.astro/
```

- [ ] **Step 9: Verify dev server starts**

```bash
cd /Users/michaglio/Projects/dmj-europe
npm run dev
```

Expected: Astro dev server starts on localhost:4321 (may show 404 since no pages yet — that's fine).

- [ ] **Step 10: Init git and commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git init
git add .
git commit -m "feat: scaffold Astro project with Tailwind CSS v4"
```

---

### Task 2: i18n System

**Files:**
- Create: `src/i18n/utils.ts`
- Create: `src/i18n/sk.json`
- Create: `src/i18n/en.json`

- [ ] **Step 1: Create `src/i18n/utils.ts`**

```ts
import sk from "./sk.json";
import en from "./en.json";

const dictionaries: Record<string, Record<string, string>> = { sk, en };

export type Lang = "sk" | "en";

export function getLang(url: URL): Lang {
  const seg = url.pathname.split("/")[1];
  return seg === "en" ? "en" : "sk";
}

export function t(lang: Lang, key: string): string {
  return dictionaries[lang]?.[key] ?? key;
}

export function localePath(lang: Lang, path: string): string {
  return `/${lang}${path}`;
}

export function altLang(lang: Lang): Lang {
  return lang === "sk" ? "en" : "sk";
}

export function altLangPath(lang: Lang, skPath: string, enPath: string): string {
  const alt = altLang(lang);
  return `/${alt}${alt === "sk" ? skPath : enPath}`;
}
```

- [ ] **Step 2: Create `src/i18n/sk.json`**

```json
{
  "site.title": "DMJ Europe",
  "site.description": "Kvalifikovaný personál z Juhovýchodnej Ázie pre vašu spoločnosť",

  "nav.home": "Domov",
  "nav.about": "O nás",
  "nav.staffLeasing": "Personálny lízing",
  "nav.process": "Proces",
  "nav.contact": "Kontakt",

  "hero.title": "Kvalifikovaný personál z Juhovýchodnej Ázie pre vašu spoločnosť",
  "hero.subtitle": "Thajsko, Filipíny, Indonézia — 17+ rokov skúseností s medzinárodným náborom",
  "hero.cta": "Kontaktujte nás",

  "stats.years": "rokov skúseností",
  "stats.employees": "zamestnancov",
  "stats.partners": "obchodných partnerov",
  "stats.legal": "100% legálne zamestnávanie",

  "industries.title": "Sektory, v ktorých pôsobíme",
  "industries.automotive": "Automobilový priemysel",
  "industries.manufacturing": "Výroba",
  "industries.welding": "Zváranie",
  "industries.logistics": "Logistika",
  "industries.warehousing": "Skladovanie",
  "industries.housekeeping": "Upratovanie",

  "partner.title": "Spolupráca so SPA Company",
  "partner.text": "DMJ Europe je sesterská spoločnosť SPA Company, ktorá zabezpečuje nábor kvalifikovaného personálu pre priemyselný sektor. Spoločne zamestnávame viac ako 250 pracovníkov naprieč celým Slovenskom.",

  "cta.title": "Potrebujete kvalifikovaných pracovníkov?",
  "cta.button": "Kontaktujte nás",

  "about.title": "O nás",
  "about.story.title": "Ako vznikla DMJ Europe",
  "about.story.text": "Spoločnosť DMJ Europe s.r.o. vznikla v roku 2025 na základe neustále sa zvyšujúceho dopytu po pracovnej sile z ázijských krajín ako Filipíny či Indonézia. Jej sesterské spoločnosti SPA Company a SPA Company Slovakia poskytujú kvalifikovaný personál v oblasti Gastra a Wellnessu už viac ako 3 roky. DMJ toto segmentové portfólio rozšírila o ten najväčší na Slovensku — automobilový priemysel.",
  "about.mission.title": "Naša misia",
  "about.mission.text": "Poskytnúť stabilitu, riadené služby s profesionálnym prístupom a spokojnosť zákazníka.",
  "about.solutions.title": "Komplexné riešenia náboru",
  "about.solutions.text": "Zabezpečujeme celý proces náboru — od výberu vhodných kandidátov v Ázii, cez vízovú a administratívnu agendu, až po ich nástup a adaptáciu vo vašej prevádzke.",

  "leasing.title": "Outsourcing Pracovnej Sily",
  "leasing.what.title": "Čo je personálny lízing?",
  "leasing.what.text": "Pracovník je zamestnancom našej spoločnosti a vy ho využívate na výkon práce vo vašej prevádzke.",
  "leasing.benefit1": "Žiadne starosti s náborom",
  "leasing.benefit2": "Žiadna vízová ani pracovnoprávna agenda",
  "leasing.benefit3": "Flexibilné riešenie podľa vašich potrieb",
  "leasing.benefit4": "Istota legálneho zamestnávania",
  "leasing.cta": "Pozrite si náš proces",

  "process.title": "Ako to funguje",
  "process.step1.title": "Zadanie požiadavky",
  "process.step1.text": "Klient definuje pozície, počty a kvalifikačné požiadavky.",
  "process.step2.title": "Výber kandidátov",
  "process.step2.text": "DMJ vyberá kandidátov v Ázii a vedie osobné pohovory.",
  "process.step3.title": "Schválenie klientom",
  "process.step3.text": "Klient prezrie a schváli vybraných kandidátov.",
  "process.step4.title": "Víza a pracovné povolenia",
  "process.step4.text": "DMJ zabezpečí kompletnú dokumentáciu a legálny proces.",
  "process.step5.title": "Príchod a onboarding",
  "process.step5.text": "Pracovníci prichádzajú, DMJ poskytuje orientáciu a podporu.",
  "process.step6.title": "Priebežná podpora",
  "process.step6.text": "Kontinuálny HR manažment a starostlivosť o pracovníkov.",

  "contact.title": "Kontakt",
  "contact.subtitle": "Otázky k náboru pracovníkov z Ázie a personálnym riešeniam",
  "contact.email": "E-mail",
  "contact.phone": "Telefón",
  "contact.address": "Adresa",
  "contact.form.name": "Meno",
  "contact.form.email": "E-mail",
  "contact.form.company": "Spoločnosť",
  "contact.form.phone": "Telefón",
  "contact.form.message": "Správa",
  "contact.form.submit": "Odoslať",
  "contact.form.success": "Ďakujeme! Ozveme sa vám čo najskôr.",

  "footer.company": "DMJ Europe s.r.o.",
  "footer.address": "Priemyselná 650/12, 965 63 Žiar nad Hronom, Slovakia",
  "footer.rights": "Všetky práva vyhradené.",
  "footer.partner": "Sesterská spoločnosť"
}
```

- [ ] **Step 3: Create `src/i18n/en.json`**

```json
{
  "site.title": "DMJ Europe",
  "site.description": "Qualified personnel from Southeast Asia for your company",

  "nav.home": "Home",
  "nav.about": "About",
  "nav.staffLeasing": "Staff Leasing",
  "nav.process": "Process",
  "nav.contact": "Contact",

  "hero.title": "Qualified Personnel from Southeast Asia for Your Company",
  "hero.subtitle": "Thailand, Philippines, Indonesia — 17+ years of cross-border hiring experience",
  "hero.cta": "Contact Us",

  "stats.years": "years of experience",
  "stats.employees": "employees",
  "stats.partners": "business partners",
  "stats.legal": "100% legal employment",

  "industries.title": "Industries We Serve",
  "industries.automotive": "Automotive",
  "industries.manufacturing": "Manufacturing",
  "industries.welding": "Welding",
  "industries.logistics": "Logistics",
  "industries.warehousing": "Warehousing",
  "industries.housekeeping": "Housekeeping",

  "partner.title": "In Partnership with SPA Company",
  "partner.text": "DMJ Europe is a sister company to SPA Company, providing qualified personnel recruitment for the industrial sector. Together, we employ over 250 workers across Slovakia.",

  "cta.title": "Need Qualified Workers?",
  "cta.button": "Contact Us",

  "about.title": "About Us",
  "about.story.title": "How DMJ Europe Was Founded",
  "about.story.text": "DMJ Europe s.r.o. was founded in 2025 in response to growing demand for workforce from Asian countries such as the Philippines and Indonesia. Its sister companies SPA Company and SPA Company Slovakia have been providing qualified personnel in gastronomy and wellness for over 3 years. DMJ expanded this portfolio into Slovakia's largest sector — automotive manufacturing.",
  "about.mission.title": "Our Mission",
  "about.mission.text": "To provide stability, managed services with a professional approach, and customer satisfaction.",
  "about.solutions.title": "Comprehensive Recruitment Solutions",
  "about.solutions.text": "We handle the entire recruitment process — from selecting suitable candidates in Asia, through visa and administrative procedures, to their onboarding and adaptation at your facility.",

  "leasing.title": "Workforce Outsourcing",
  "leasing.what.title": "What Is Staff Leasing?",
  "leasing.what.text": "The worker is employed by our company and deployed to perform work at your operation.",
  "leasing.benefit1": "No recruitment burden",
  "leasing.benefit2": "No visa or labor law administration",
  "leasing.benefit3": "Flexible solutions tailored to your needs",
  "leasing.benefit4": "Guaranteed legal employment",
  "leasing.cta": "See Our Process",

  "process.title": "How It Works",
  "process.step1.title": "Requirement Gathering",
  "process.step1.text": "Client defines positions, quantities, and qualification requirements.",
  "process.step2.title": "Candidate Selection",
  "process.step2.text": "DMJ selects candidates in Asia and conducts personal interviews.",
  "process.step3.title": "Client Approval",
  "process.step3.text": "Client reviews and approves selected candidates.",
  "process.step4.title": "Visa & Work Permits",
  "process.step4.text": "DMJ handles all documentation and legal processes.",
  "process.step5.title": "Travel & Onboarding",
  "process.step5.text": "Workers arrive, DMJ provides orientation and support.",
  "process.step6.title": "Ongoing Support",
  "process.step6.text": "Continuous HR management and worker welfare.",

  "contact.title": "Contact",
  "contact.subtitle": "Questions about recruiting workers from Asia and staffing solutions",
  "contact.email": "Email",
  "contact.phone": "Phone",
  "contact.address": "Address",
  "contact.form.name": "Name",
  "contact.form.email": "Email",
  "contact.form.company": "Company",
  "contact.form.phone": "Phone",
  "contact.form.message": "Message",
  "contact.form.submit": "Send",
  "contact.form.success": "Thank you! We will get back to you shortly.",

  "footer.company": "DMJ Europe s.r.o.",
  "footer.address": "Priemyselná 650/12, 965 63 Žiar nad Hronom, Slovakia",
  "footer.rights": "All rights reserved.",
  "footer.partner": "Sister company"
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add src/i18n/
git commit -m "feat: add i18n system with SK/EN translation dictionaries"
```

---

### Task 3: Layout, Header, and Footer

**Files:**
- Create: `src/layouts/Layout.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`

- [ ] **Step 1: Create `src/layouts/Layout.astro`**

```astro
---
import "../styles/global.css";
import Header from "../components/Header.astro";
import Footer from "../components/Footer.astro";
import type { Lang } from "../i18n/utils";

interface Props {
  title: string;
  description: string;
  lang: Lang;
}

const { title, description, lang } = Astro.props;
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap"
      rel="stylesheet"
    />
    <title>{title} | DMJ Europe</title>
  </head>
  <body class="font-sans text-gray-body bg-white">
    <Header lang={lang} />
    <main>
      <slot />
    </main>
    <Footer lang={lang} />
  </body>
</html>
```

- [ ] **Step 2: Create `src/components/Header.astro`**

Sticky dark navy header with logo, nav links, language switcher, and mobile hamburger menu.

```astro
---
import type { Lang } from "../i18n/utils";
import { t, localePath, altLang } from "../i18n/utils";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const alt = altLang(lang);

const navItems = [
  { key: "nav.home", sk: "/", en: "/" },
  { key: "nav.about", sk: "/o-nas", en: "/about" },
  { key: "nav.staffLeasing", sk: "/personalny-lizing", en: "/staff-leasing" },
  { key: "nav.process", sk: "/proces", en: "/process" },
  { key: "nav.contact", sk: "/kontakt", en: "/contact" },
];
---

<header class="sticky top-0 z-50 bg-navy shadow-lg">
  <div class="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
    <a href={localePath(lang, "/")} class="flex items-center gap-2">
      <img src="/images/dmj-europe-logo.png" alt="DMJ Europe" class="h-10" />
    </a>

    <nav class="hidden md:flex items-center gap-6">
      {navItems.map((item) => (
        <a
          href={localePath(lang, lang === "sk" ? item.sk : item.en)}
          class="text-white/80 hover:text-cyan text-sm font-medium transition-colors"
        >
          {t(lang, item.key)}
        </a>
      ))}
      <a
        href={`/${alt}/`}
        class="ml-4 px-3 py-1 rounded-full border border-white/30 text-white text-xs font-bold uppercase hover:bg-white/10 transition-colors"
      >
        {alt.toUpperCase()}
      </a>
    </nav>

    <button
      id="menu-toggle"
      class="md:hidden text-white"
      aria-label="Menu"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  </div>

  <div id="mobile-menu" class="hidden md:hidden bg-navy-dark border-t border-white/10">
    <nav class="flex flex-col px-4 py-4 gap-3">
      {navItems.map((item) => (
        <a
          href={localePath(lang, lang === "sk" ? item.sk : item.en)}
          class="text-white/80 hover:text-cyan text-sm font-medium transition-colors"
        >
          {t(lang, item.key)}
        </a>
      ))}
      <a
        href={`/${alt}/`}
        class="mt-2 px-3 py-1 rounded-full border border-white/30 text-white text-xs font-bold uppercase hover:bg-white/10 transition-colors w-fit"
      >
        {alt.toUpperCase()}
      </a>
    </nav>
  </div>
</header>

<script>
  const toggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("mobile-menu");
  toggle?.addEventListener("click", () => {
    menu?.classList.toggle("hidden");
  });
</script>
```

- [ ] **Step 3: Create `src/components/Footer.astro`**

```astro
---
import type { Lang } from "../i18n/utils";
import { t, localePath } from "../i18n/utils";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const year = new Date().getFullYear();

const navItems = [
  { key: "nav.home", sk: "/", en: "/" },
  { key: "nav.about", sk: "/o-nas", en: "/about" },
  { key: "nav.staffLeasing", sk: "/personalny-lizing", en: "/staff-leasing" },
  { key: "nav.process", sk: "/proces", en: "/process" },
  { key: "nav.contact", sk: "/kontakt", en: "/contact" },
];
---

<footer class="bg-navy-dark text-white/70">
  <div class="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
    <div>
      <img src="/images/dmj-europe-logo.png" alt="DMJ Europe" class="h-12 mb-4" />
      <p class="text-sm">{t(lang, "footer.address")}</p>
    </div>

    <div>
      <h4 class="text-white font-bold text-sm uppercase mb-4">{t(lang, "nav.home")}</h4>
      <nav class="flex flex-col gap-2">
        {navItems.map((item) => (
          <a
            href={localePath(lang, lang === "sk" ? item.sk : item.en)}
            class="text-sm hover:text-cyan transition-colors"
          >
            {t(lang, item.key)}
          </a>
        ))}
      </nav>
    </div>

    <div>
      <h4 class="text-white font-bold text-sm uppercase mb-4">{t(lang, "contact.title")}</h4>
      <div class="flex flex-col gap-2 text-sm">
        <a href="mailto:jakub@dmjeurope.com" class="hover:text-cyan transition-colors">jakub@dmjeurope.com</a>
        <a href="tel:+421911152766" class="hover:text-cyan transition-colors">+421 911 152 766</a>
      </div>
      <div class="mt-4 text-sm">
        <span class="text-white/50">{t(lang, "footer.partner")}:</span>
        <a href="https://spa-company.com" target="_blank" rel="noopener" class="hover:text-cyan transition-colors ml-1">SPA Company</a>
      </div>
    </div>
  </div>

  <div class="border-t border-white/10 py-4">
    <p class="text-center text-xs text-white/40">
      &copy; {year} {t(lang, "footer.company")} {t(lang, "footer.rights")}
    </p>
  </div>
</footer>
```

- [ ] **Step 4: Commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add src/layouts/ src/components/
git commit -m "feat: add Layout, Header, and Footer components"
```

---

### Task 4: Hero Component and Root Redirect

**Files:**
- Create: `src/components/Hero.astro`
- Create: `src/pages/index.astro`

- [ ] **Step 1: Create `src/components/Hero.astro`**

```astro
---
interface Props {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  backgroundImage?: string;
}

const { title, subtitle, ctaText, ctaHref, backgroundImage } = Astro.props;
---

<section class="relative min-h-[520px] flex items-center justify-center overflow-hidden">
  {backgroundImage ? (
    <div
      class="absolute inset-0 bg-cover bg-center"
      style={`background-image: url(${backgroundImage})`}
    />
  ) : (
    <div class="absolute inset-0 bg-navy" />
  )}
  <div class="absolute inset-0 bg-navy/70" />

  <div class="relative z-10 text-center px-4 max-w-4xl mx-auto">
    <h1 class="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4">
      {title}
    </h1>
    {subtitle && (
      <p class="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
        {subtitle}
      </p>
    )}
    {ctaText && ctaHref && (
      <a
        href={ctaHref}
        class="inline-block bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors text-lg"
      >
        {ctaText}
      </a>
    )}
  </div>
</section>
```

- [ ] **Step 2: Create `src/pages/index.astro`**

Root redirects to Slovak version:

```astro
---
return Astro.redirect("/sk/");
---
```

- [ ] **Step 3: Verify redirect works**

```bash
cd /Users/michaglio/Projects/dmj-europe
npm run dev
```

Visit `http://localhost:4321/` — should redirect to `/sk/`.

- [ ] **Step 4: Commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add src/components/Hero.astro src/pages/index.astro
git commit -m "feat: add Hero component and root redirect to /sk/"
```

---

### Task 5: Home Page (SK + EN)

**Files:**
- Create: `src/pages/sk/index.astro`
- Create: `src/pages/en/index.astro`

- [ ] **Step 1: Create `src/pages/sk/index.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import { t } from "../../i18n/utils";

const lang = "sk" as const;
---

<Layout title={t(lang, "nav.home")} description={t(lang, "site.description")} lang={lang}>
  <Hero
    title={t(lang, "hero.title")}
    subtitle={t(lang, "hero.subtitle")}
    ctaText={t(lang, "hero.cta")}
    ctaHref="/sk/kontakt"
  />

  <!-- Stats -->
  <section class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div>
        <p class="text-4xl font-extrabold text-navy">17+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.years")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-navy">250+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.employees")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-navy">35+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.partners")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-cyan">&#10003;</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.legal")}</p>
      </div>
    </div>
  </section>

  <!-- Industries -->
  <section class="py-16 bg-gray-light">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-2xl md:text-3xl font-bold text-navy text-center mb-10">
        {t(lang, "industries.title")}
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {(["automotive", "manufacturing", "welding", "logistics", "warehousing", "housekeeping"] as const).map((key) => (
          <div class="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow">
            <p class="text-sm font-semibold text-navy">{t(lang, `industries.${key}`)}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <!-- SPA Company Partnership -->
  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl md:text-3xl font-bold text-navy mb-4">
        {t(lang, "partner.title")}
      </h2>
      <p class="text-gray-body text-lg leading-relaxed mb-6">
        {t(lang, "partner.text")}
      </p>
      <a
        href="https://spa-company.com"
        target="_blank"
        rel="noopener"
        class="inline-block text-cyan hover:text-cyan-dark font-semibold transition-colors"
      >
        spa-company.com &rarr;
      </a>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-16 bg-navy">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl md:text-3xl font-bold text-white mb-6">
        {t(lang, "cta.title")}
      </h2>
      <a
        href="/sk/kontakt"
        class="inline-block bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors text-lg"
      >
        {t(lang, "cta.button")}
      </a>
    </div>
  </section>
</Layout>
```

- [ ] **Step 2: Create `src/pages/en/index.astro`**

Same structure, but with `lang = "en"` and English paths:

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import { t } from "../../i18n/utils";

const lang = "en" as const;
---

<Layout title={t(lang, "nav.home")} description={t(lang, "site.description")} lang={lang}>
  <Hero
    title={t(lang, "hero.title")}
    subtitle={t(lang, "hero.subtitle")}
    ctaText={t(lang, "hero.cta")}
    ctaHref="/en/contact"
  />

  <section class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div>
        <p class="text-4xl font-extrabold text-navy">17+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.years")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-navy">250+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.employees")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-navy">35+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.partners")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-cyan">&#10003;</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.legal")}</p>
      </div>
    </div>
  </section>

  <section class="py-16 bg-gray-light">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-2xl md:text-3xl font-bold text-navy text-center mb-10">
        {t(lang, "industries.title")}
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {(["automotive", "manufacturing", "welding", "logistics", "warehousing", "housekeeping"] as const).map((key) => (
          <div class="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow">
            <p class="text-sm font-semibold text-navy">{t(lang, `industries.${key}`)}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl md:text-3xl font-bold text-navy mb-4">
        {t(lang, "partner.title")}
      </h2>
      <p class="text-gray-body text-lg leading-relaxed mb-6">
        {t(lang, "partner.text")}
      </p>
      <a
        href="https://spa-company.com"
        target="_blank"
        rel="noopener"
        class="inline-block text-cyan hover:text-cyan-dark font-semibold transition-colors"
      >
        spa-company.com &rarr;
      </a>
    </div>
  </section>

  <section class="py-16 bg-navy">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl md:text-3xl font-bold text-white mb-6">
        {t(lang, "cta.title")}
      </h2>
      <a
        href="/en/contact"
        class="inline-block bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors text-lg"
      >
        {t(lang, "cta.button")}
      </a>
    </div>
  </section>
</Layout>
```

- [ ] **Step 3: Verify both pages render**

```bash
cd /Users/michaglio/Projects/dmj-europe
npm run dev
```

Visit `http://localhost:4321/sk/` and `http://localhost:4321/en/`. Both should render the home page with correct translations. Language switcher in header should toggle between them.

- [ ] **Step 4: Commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add src/pages/
git commit -m "feat: add Home page in SK and EN"
```

---

### Task 6: About Page (SK + EN)

**Files:**
- Create: `src/pages/sk/o-nas.astro`
- Create: `src/pages/en/about.astro`

- [ ] **Step 1: Create `src/pages/sk/o-nas.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import { t } from "../../i18n/utils";

const lang = "sk" as const;
---

<Layout title={t(lang, "about.title")} description={t(lang, "about.story.text").slice(0, 150)} lang={lang}>
  <Hero title={t(lang, "about.title")} />

  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4">
      <h2 class="text-2xl font-bold text-navy mb-4">{t(lang, "about.story.title")}</h2>
      <p class="text-gray-body text-lg leading-relaxed">{t(lang, "about.story.text")}</p>
    </div>
  </section>

  <section class="py-16 bg-gray-light">
    <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
      <div>
        <p class="text-4xl font-extrabold text-navy">250+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.employees")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-navy">35+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.partners")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-navy">17+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.years")}</p>
      </div>
    </div>
  </section>

  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4">
      <h2 class="text-2xl font-bold text-navy mb-4">{t(lang, "about.mission.title")}</h2>
      <p class="text-gray-body text-lg leading-relaxed mb-8">{t(lang, "about.mission.text")}</p>

      <h2 class="text-2xl font-bold text-navy mb-4">{t(lang, "about.solutions.title")}</h2>
      <p class="text-gray-body text-lg leading-relaxed">{t(lang, "about.solutions.text")}</p>
    </div>
  </section>

  <section class="py-16 bg-navy">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl md:text-3xl font-bold text-white mb-6">{t(lang, "cta.title")}</h2>
      <a href="/sk/kontakt" class="inline-block bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors text-lg">
        {t(lang, "cta.button")}
      </a>
    </div>
  </section>
</Layout>
```

- [ ] **Step 2: Create `src/pages/en/about.astro`**

Same structure with `lang = "en"` and CTA linking to `/en/contact`:

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import { t } from "../../i18n/utils";

const lang = "en" as const;
---

<Layout title={t(lang, "about.title")} description={t(lang, "about.story.text").slice(0, 150)} lang={lang}>
  <Hero title={t(lang, "about.title")} />

  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4">
      <h2 class="text-2xl font-bold text-navy mb-4">{t(lang, "about.story.title")}</h2>
      <p class="text-gray-body text-lg leading-relaxed">{t(lang, "about.story.text")}</p>
    </div>
  </section>

  <section class="py-16 bg-gray-light">
    <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
      <div>
        <p class="text-4xl font-extrabold text-navy">250+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.employees")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-navy">35+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.partners")}</p>
      </div>
      <div>
        <p class="text-4xl font-extrabold text-navy">17+</p>
        <p class="text-gray-body mt-1">{t(lang, "stats.years")}</p>
      </div>
    </div>
  </section>

  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4">
      <h2 class="text-2xl font-bold text-navy mb-4">{t(lang, "about.mission.title")}</h2>
      <p class="text-gray-body text-lg leading-relaxed mb-8">{t(lang, "about.mission.text")}</p>

      <h2 class="text-2xl font-bold text-navy mb-4">{t(lang, "about.solutions.title")}</h2>
      <p class="text-gray-body text-lg leading-relaxed">{t(lang, "about.solutions.text")}</p>
    </div>
  </section>

  <section class="py-16 bg-navy">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl md:text-3xl font-bold text-white mb-6">{t(lang, "cta.title")}</h2>
      <a href="/en/contact" class="inline-block bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors text-lg">
        {t(lang, "cta.button")}
      </a>
    </div>
  </section>
</Layout>
```

- [ ] **Step 3: Verify both pages**

Visit `/sk/o-nas` and `/en/about`.

- [ ] **Step 4: Commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add src/pages/sk/o-nas.astro src/pages/en/about.astro
git commit -m "feat: add About page in SK and EN"
```

---

### Task 7: Staff Leasing Page (SK + EN)

**Files:**
- Create: `src/pages/sk/personalny-lizing.astro`
- Create: `src/pages/en/staff-leasing.astro`

- [ ] **Step 1: Create `src/pages/sk/personalny-lizing.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import { t } from "../../i18n/utils";

const lang = "sk" as const;

const benefits = [
  { num: "01", key: "leasing.benefit1" },
  { num: "02", key: "leasing.benefit2" },
  { num: "03", key: "leasing.benefit3" },
  { num: "04", key: "leasing.benefit4" },
];

const industries = ["automotive", "manufacturing", "welding", "logistics", "warehousing", "housekeeping"] as const;
---

<Layout title={t(lang, "leasing.title")} description={t(lang, "leasing.what.text")} lang={lang}>
  <Hero title={t(lang, "leasing.title")} />

  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4">
      <h2 class="text-2xl font-bold text-navy mb-4">{t(lang, "leasing.what.title")}</h2>
      <p class="text-gray-body text-lg leading-relaxed">{t(lang, "leasing.what.text")}</p>
    </div>
  </section>

  <section class="py-16 bg-gray-light">
    <div class="max-w-4xl mx-auto px-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {benefits.map((b) => (
          <div class="flex items-start gap-4 bg-white rounded-lg p-6 shadow-sm">
            <span class="text-3xl font-extrabold text-cyan">{b.num}</span>
            <p class="text-navy font-semibold">{t(lang, b.key)}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <section class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-2xl font-bold text-navy text-center mb-10">{t(lang, "industries.title")}</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {industries.map((key) => (
          <div class="bg-gray-light rounded-lg p-6 text-center">
            <p class="text-sm font-semibold text-navy">{t(lang, `industries.${key}`)}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <section class="py-16 bg-navy">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl font-bold text-white mb-6">{t(lang, "cta.title")}</h2>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/sk/proces" class="inline-block bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors">
          {t(lang, "leasing.cta")}
        </a>
        <a href="/sk/kontakt" class="inline-block border border-white text-white hover:bg-white/10 font-bold px-8 py-3 rounded-full transition-colors">
          {t(lang, "cta.button")}
        </a>
      </div>
    </div>
  </section>
</Layout>
```

- [ ] **Step 2: Create `src/pages/en/staff-leasing.astro`**

Same structure with `lang = "en"` and English paths (`/en/process`, `/en/contact`):

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import { t } from "../../i18n/utils";

const lang = "en" as const;

const benefits = [
  { num: "01", key: "leasing.benefit1" },
  { num: "02", key: "leasing.benefit2" },
  { num: "03", key: "leasing.benefit3" },
  { num: "04", key: "leasing.benefit4" },
];

const industries = ["automotive", "manufacturing", "welding", "logistics", "warehousing", "housekeeping"] as const;
---

<Layout title={t(lang, "leasing.title")} description={t(lang, "leasing.what.text")} lang={lang}>
  <Hero title={t(lang, "leasing.title")} />

  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4">
      <h2 class="text-2xl font-bold text-navy mb-4">{t(lang, "leasing.what.title")}</h2>
      <p class="text-gray-body text-lg leading-relaxed">{t(lang, "leasing.what.text")}</p>
    </div>
  </section>

  <section class="py-16 bg-gray-light">
    <div class="max-w-4xl mx-auto px-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {benefits.map((b) => (
          <div class="flex items-start gap-4 bg-white rounded-lg p-6 shadow-sm">
            <span class="text-3xl font-extrabold text-cyan">{b.num}</span>
            <p class="text-navy font-semibold">{t(lang, b.key)}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <section class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-2xl font-bold text-navy text-center mb-10">{t(lang, "industries.title")}</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {industries.map((key) => (
          <div class="bg-gray-light rounded-lg p-6 text-center">
            <p class="text-sm font-semibold text-navy">{t(lang, `industries.${key}`)}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <section class="py-16 bg-navy">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl font-bold text-white mb-6">{t(lang, "cta.title")}</h2>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/en/process" class="inline-block bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors">
          {t(lang, "leasing.cta")}
        </a>
        <a href="/en/contact" class="inline-block border border-white text-white hover:bg-white/10 font-bold px-8 py-3 rounded-full transition-colors">
          {t(lang, "cta.button")}
        </a>
      </div>
    </div>
  </section>
</Layout>
```

- [ ] **Step 3: Verify and commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add src/pages/sk/personalny-lizing.astro src/pages/en/staff-leasing.astro
git commit -m "feat: add Staff Leasing page in SK and EN"
```

---

### Task 8: Process Page with StepCard (SK + EN)

**Files:**
- Create: `src/components/StepCard.astro`
- Create: `src/pages/sk/proces.astro`
- Create: `src/pages/en/process.astro`

- [ ] **Step 1: Create `src/components/StepCard.astro`**

```astro
---
interface Props {
  number: number;
  title: string;
  text: string;
  isLast?: boolean;
}

const { number, title, text, isLast = false } = Astro.props;
---

<div class="flex gap-6">
  <div class="flex flex-col items-center">
    <div class="w-12 h-12 rounded-full bg-cyan flex items-center justify-center text-white font-bold text-lg shrink-0">
      {number}
    </div>
    {!isLast && <div class="w-0.5 bg-cyan/30 flex-1 mt-2" />}
  </div>
  <div class="pb-10">
    <h3 class="text-lg font-bold text-navy mb-1">{title}</h3>
    <p class="text-gray-body">{text}</p>
  </div>
</div>
```

- [ ] **Step 2: Create `src/pages/sk/proces.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import StepCard from "../../components/StepCard.astro";
import { t } from "../../i18n/utils";

const lang = "sk" as const;

const steps = [1, 2, 3, 4, 5, 6].map((n) => ({
  number: n,
  title: t(lang, `process.step${n}.title`),
  text: t(lang, `process.step${n}.text`),
}));
---

<Layout title={t(lang, "process.title")} description={t(lang, "process.step1.text")} lang={lang}>
  <Hero title={t(lang, "process.title")} />

  <section class="py-16 bg-white">
    <div class="max-w-2xl mx-auto px-4">
      {steps.map((step, i) => (
        <StepCard
          number={step.number}
          title={step.title}
          text={step.text}
          isLast={i === steps.length - 1}
        />
      ))}
    </div>
  </section>

  <section class="py-16 bg-navy">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl font-bold text-white mb-6">{t(lang, "cta.title")}</h2>
      <a href="/sk/kontakt" class="inline-block bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors text-lg">
        {t(lang, "cta.button")}
      </a>
    </div>
  </section>
</Layout>
```

- [ ] **Step 3: Create `src/pages/en/process.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import StepCard from "../../components/StepCard.astro";
import { t } from "../../i18n/utils";

const lang = "en" as const;

const steps = [1, 2, 3, 4, 5, 6].map((n) => ({
  number: n,
  title: t(lang, `process.step${n}.title`),
  text: t(lang, `process.step${n}.text`),
}));
---

<Layout title={t(lang, "process.title")} description={t(lang, "process.step1.text")} lang={lang}>
  <Hero title={t(lang, "process.title")} />

  <section class="py-16 bg-white">
    <div class="max-w-2xl mx-auto px-4">
      {steps.map((step, i) => (
        <StepCard
          number={step.number}
          title={step.title}
          text={step.text}
          isLast={i === steps.length - 1}
        />
      ))}
    </div>
  </section>

  <section class="py-16 bg-navy">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-2xl font-bold text-white mb-6">{t(lang, "cta.title")}</h2>
      <a href="/en/contact" class="inline-block bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors text-lg">
        {t(lang, "cta.button")}
      </a>
    </div>
  </section>
</Layout>
```

- [ ] **Step 4: Commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add src/components/StepCard.astro src/pages/sk/proces.astro src/pages/en/process.astro
git commit -m "feat: add Process page with StepCard component in SK and EN"
```

---

### Task 9: Contact Page with ContactForm (SK + EN)

**Files:**
- Create: `src/components/ContactForm.astro`
- Create: `src/pages/sk/kontakt.astro`
- Create: `src/pages/en/contact.astro`

- [ ] **Step 1: Create `src/components/ContactForm.astro`**

Form submits via FormSubmit.co with honeypot spam protection:

```astro
---
interface Props {
  nameLabel: string;
  emailLabel: string;
  companyLabel: string;
  phoneLabel: string;
  messageLabel: string;
  submitLabel: string;
  successMessage: string;
}

const { nameLabel, emailLabel, companyLabel, phoneLabel, messageLabel, submitLabel, successMessage } = Astro.props;
---

<form
  id="contact-form"
  action="https://formsubmit.co/jakub@dmjeurope.com"
  method="POST"
  class="space-y-4"
>
  <input type="text" name="_honey" style="display:none" />
  <input type="hidden" name="_captcha" value="false" />
  <input type="hidden" name="_next" value="" />

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-navy mb-1">{nameLabel}</label>
      <input type="text" name="name" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
    </div>
    <div>
      <label class="block text-sm font-medium text-navy mb-1">{emailLabel}</label>
      <input type="email" name="email" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-navy mb-1">{companyLabel}</label>
      <input type="text" name="company" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
    </div>
    <div>
      <label class="block text-sm font-medium text-navy mb-1">{phoneLabel}</label>
      <input type="tel" name="phone" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
    </div>
  </div>

  <div>
    <label class="block text-sm font-medium text-navy mb-1">{messageLabel}</label>
    <textarea name="message" rows="4" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan"></textarea>
  </div>

  <button type="submit" class="bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors">
    {submitLabel}
  </button>

  <p id="form-success" class="hidden text-success font-medium">{successMessage}</p>
</form>
```

- [ ] **Step 2: Create `src/pages/sk/kontakt.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import ContactForm from "../../components/ContactForm.astro";
import { t } from "../../i18n/utils";

const lang = "sk" as const;
---

<Layout title={t(lang, "contact.title")} description={t(lang, "contact.subtitle")} lang={lang}>
  <Hero title={t(lang, "contact.title")} subtitle={t(lang, "contact.subtitle")} />

  <section class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <div class="space-y-6">
          <div>
            <h3 class="text-sm font-bold text-navy uppercase">{t(lang, "contact.email")}</h3>
            <a href="mailto:jakub@dmjeurope.com" class="text-cyan hover:text-cyan-dark text-lg">jakub@dmjeurope.com</a>
          </div>
          <div>
            <h3 class="text-sm font-bold text-navy uppercase">{t(lang, "contact.phone")}</h3>
            <a href="tel:+421911152766" class="text-cyan hover:text-cyan-dark text-lg">+421 911 152 766</a>
          </div>
          <div>
            <h3 class="text-sm font-bold text-navy uppercase">{t(lang, "contact.address")}</h3>
            <p class="text-gray-body">Priemyselná 650/12<br />965 63 Žiar nad Hronom<br />Slovakia</p>
          </div>
        </div>
      </div>

      <ContactForm
        nameLabel={t(lang, "contact.form.name")}
        emailLabel={t(lang, "contact.form.email")}
        companyLabel={t(lang, "contact.form.company")}
        phoneLabel={t(lang, "contact.form.phone")}
        messageLabel={t(lang, "contact.form.message")}
        submitLabel={t(lang, "contact.form.submit")}
        successMessage={t(lang, "contact.form.success")}
      />
    </div>
  </section>
</Layout>
```

- [ ] **Step 3: Create `src/pages/en/contact.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import ContactForm from "../../components/ContactForm.astro";
import { t } from "../../i18n/utils";

const lang = "en" as const;
---

<Layout title={t(lang, "contact.title")} description={t(lang, "contact.subtitle")} lang={lang}>
  <Hero title={t(lang, "contact.title")} subtitle={t(lang, "contact.subtitle")} />

  <section class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <div class="space-y-6">
          <div>
            <h3 class="text-sm font-bold text-navy uppercase">{t(lang, "contact.email")}</h3>
            <a href="mailto:jakub@dmjeurope.com" class="text-cyan hover:text-cyan-dark text-lg">jakub@dmjeurope.com</a>
          </div>
          <div>
            <h3 class="text-sm font-bold text-navy uppercase">{t(lang, "contact.phone")}</h3>
            <a href="tel:+421911152766" class="text-cyan hover:text-cyan-dark text-lg">+421 911 152 766</a>
          </div>
          <div>
            <h3 class="text-sm font-bold text-navy uppercase">{t(lang, "contact.address")}</h3>
            <p class="text-gray-body">Priemyselná 650/12<br />965 63 Žiar nad Hronom<br />Slovakia</p>
          </div>
        </div>
      </div>

      <ContactForm
        nameLabel={t(lang, "contact.form.name")}
        emailLabel={t(lang, "contact.form.email")}
        companyLabel={t(lang, "contact.form.company")}
        phoneLabel={t(lang, "contact.form.phone")}
        messageLabel={t(lang, "contact.form.message")}
        submitLabel={t(lang, "contact.form.submit")}
        successMessage={t(lang, "contact.form.success")}
      />
    </div>
  </section>
</Layout>
```

- [ ] **Step 4: Commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add src/components/ContactForm.astro src/pages/sk/kontakt.astro src/pages/en/contact.astro
git commit -m "feat: add Contact page with form in SK and EN"
```

---

### Task 10: Jobs Page with Geo-Restricted Form (EN only)

**Files:**
- Create: `src/components/JobForm.astro`
- Create: `src/pages/en/jobs.astro`

- [ ] **Step 1: Create `src/components/JobForm.astro`**

```astro
---
---

<div id="geo-gate">
  <div id="geo-loading" class="text-center py-12">
    <p class="text-gray-body">Checking availability...</p>
  </div>

  <div id="geo-blocked" class="hidden text-center py-12">
    <div class="bg-gray-light rounded-lg p-8 max-w-lg mx-auto">
      <h3 class="text-xl font-bold text-navy mb-2">Not Available in Your Region</h3>
      <p class="text-gray-body">This form is currently available only for workers in Central Europe (Czech Republic, Slovakia, Poland, Hungary).</p>
    </div>
  </div>

  <form id="job-form" class="hidden space-y-6">
    <input type="text" name="_honey" style="display:none" />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Full Name *</label>
        <input type="text" name="fullName" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
      </div>
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Nationality *</label>
        <select name="nationality" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan">
          <option value="">Select...</option>
          <option value="Filipino">Filipino</option>
          <option value="Indonesian">Indonesian</option>
          <option value="Thai">Thai</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Phone Number (with country code) *</label>
        <input type="tel" name="phone" required placeholder="+421..." class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
      </div>
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Email *</label>
        <input type="email" name="email" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Current Country of Deployment *</label>
        <select name="currentCountry" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan">
          <option value="">Select...</option>
          <option value="Czech Republic">Czech Republic</option>
          <option value="Slovakia">Slovakia</option>
          <option value="Poland">Poland</option>
          <option value="Hungary">Hungary</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Current Visa/Permit Status *</label>
        <select name="visaStatus" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan">
          <option value="">Select...</option>
          <option value="Work permit">Work permit</option>
          <option value="Blue card">Blue card</option>
          <option value="Seasonal permit">Seasonal permit</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Current Deployment Length (months) *</label>
        <input type="number" name="deploymentLength" required min="0" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
      </div>
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Current Net Monthly Salary (EUR) *</label>
        <input type="number" name="currentSalary" required min="0" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
      </div>
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Expected Net Salary w/o Accommodation (EUR) *</label>
        <input type="number" name="expectedSalary" required min="0" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan" />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Industry / Skills *</label>
        <select name="industry" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan">
          <option value="">Select...</option>
          <option value="Automotive">Automotive</option>
          <option value="Manufacturing">Manufacturing</option>
          <option value="Welding">Welding</option>
          <option value="Logistics">Logistics</option>
          <option value="Warehousing">Warehousing</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-navy mb-1">Availability *</label>
        <select name="availability" required class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan">
          <option value="">Select...</option>
          <option value="Immediately">Immediately</option>
          <option value="1-3 months">1-3 months</option>
          <option value="3+ months">3+ months</option>
        </select>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-navy mb-1">Message (optional)</label>
      <textarea name="message" rows="3" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan"></textarea>
    </div>

    <button type="submit" class="bg-cyan hover:bg-cyan-dark text-white font-bold px-8 py-3 rounded-full transition-colors">
      Submit Application
    </button>

    <p id="job-success" class="hidden text-success font-medium">Thank you! We will review your application and contact you soon.</p>
    <p id="job-error" class="hidden text-red-500 font-medium">Something went wrong. Please try again or email us directly at jakub@dmjeurope.com.</p>
  </form>
</div>

<script>
  const ALLOWED_COUNTRIES = ["CZ", "SK", "PL", "HU"];

  async function checkGeo() {
    const loading = document.getElementById("geo-loading");
    const blocked = document.getElementById("geo-blocked");
    const form = document.getElementById("job-form");

    try {
      const res = await fetch("http://ip-api.com/json/?fields=countryCode");
      const data = await res.json();

      loading?.classList.add("hidden");

      if (ALLOWED_COUNTRIES.includes(data.countryCode)) {
        form?.classList.remove("hidden");
      } else {
        blocked?.classList.remove("hidden");
      }
    } catch {
      // On error, show the form (fail open for usability)
      loading?.classList.add("hidden");
      form?.classList.remove("hidden");
    }
  }

  checkGeo();

  // Handle form submission via FormSubmit.co
  const form = document.getElementById("job-form") as HTMLFormElement;
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const success = document.getElementById("job-success");
    const error = document.getElementById("job-error");

    try {
      await fetch("https://formsubmit.co/ajax/jakub@dmjeurope.com", {
        method: "POST",
        body: data,
      });
      form.reset();
      success?.classList.remove("hidden");
      error?.classList.add("hidden");
    } catch {
      error?.classList.remove("hidden");
      success?.classList.add("hidden");
    }
  });
</script>
```

- [ ] **Step 2: Create `src/pages/en/jobs.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";
import Hero from "../../components/Hero.astro";
import JobForm from "../../components/JobForm.astro";
---

<Layout title="Looking for a Job" description="Job opportunities for workers from Southeast Asia in Central Europe" lang="en">
  <Hero
    title="Looking for a Job?"
    subtitle="Opportunities for workers from the Philippines, Indonesia, and Thailand currently deployed in Central Europe"
  />

  <section class="py-16 bg-white">
    <div class="max-w-3xl mx-auto px-4">
      <div class="mb-8">
        <p class="text-gray-body text-lg leading-relaxed">
          DMJ Europe connects qualified workers from Southeast Asia with employers across Central Europe.
          If you are currently working in the Czech Republic, Slovakia, Poland, or Hungary and looking for
          new opportunities, fill out the form below and our team will be in touch.
        </p>
      </div>

      <JobForm />
    </div>
  </section>
</Layout>
```

- [ ] **Step 3: Verify the geo-gate works**

```bash
cd /Users/michaglio/Projects/dmj-europe
npm run dev
```

Visit `http://localhost:4321/en/jobs`. Since you're in Slovakia, the form should appear. The geo check calls ip-api.com.

- [ ] **Step 4: Commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add src/components/JobForm.astro src/pages/en/jobs.astro
git commit -m "feat: add geo-restricted Jobs page with recruitment form (EN only)"
```

---

### Task 11: Placeholder Images and Final Verification

**Files:**
- Create: placeholder images in `public/images/`

- [ ] **Step 1: Create SVG placeholder images**

We need hero background images. For now, create simple dark placeholder images so the layout looks correct:

```bash
cd /Users/michaglio/Projects/dmj-europe

# Create a simple SVG placeholder for hero backgrounds
cat > public/images/hero-factory.svg << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="800" viewBox="0 0 1920 800">
  <rect fill="#1e2a5a" width="1920" height="800"/>
  <text x="960" y="400" text-anchor="middle" fill="#4a5568" font-family="sans-serif" font-size="32">Factory Hero Image</text>
</svg>
SVG
```

- [ ] **Step 2: Update Home page heroes to use background image**

In both `src/pages/sk/index.astro` and `src/pages/en/index.astro`, update the Hero component to include the background image:

Change:
```astro
<Hero
  title={t(lang, "hero.title")}
  subtitle={t(lang, "hero.subtitle")}
  ctaText={t(lang, "hero.cta")}
  ctaHref="/sk/kontakt"
/>
```

To:
```astro
<Hero
  title={t(lang, "hero.title")}
  subtitle={t(lang, "hero.subtitle")}
  ctaText={t(lang, "hero.cta")}
  ctaHref="/sk/kontakt"
  backgroundImage="/images/hero-factory.svg"
/>
```

(Same for EN with `/en/contact` as ctaHref.)

- [ ] **Step 3: Run full build to verify no errors**

```bash
cd /Users/michaglio/Projects/dmj-europe
npm run build
```

Expected: Clean build with all 12 pages generated (index redirect + 5 SK + 6 EN).

- [ ] **Step 4: Start dev server and verify all routes**

```bash
cd /Users/michaglio/Projects/dmj-europe
npm run dev
```

Check each route:
- `http://localhost:4321/` → redirects to `/sk/`
- `http://localhost:4321/sk/` → Home SK
- `http://localhost:4321/en/` → Home EN
- `http://localhost:4321/sk/o-nas` → About SK
- `http://localhost:4321/en/about` → About EN
- `http://localhost:4321/sk/personalny-lizing` → Staff Leasing SK
- `http://localhost:4321/en/staff-leasing` → Staff Leasing EN
- `http://localhost:4321/sk/proces` → Process SK
- `http://localhost:4321/en/process` → Process EN
- `http://localhost:4321/sk/kontakt` → Contact SK
- `http://localhost:4321/en/contact` → Contact EN
- `http://localhost:4321/en/jobs` → Jobs EN (geo-gated)

Verify: header nav works, language switcher toggles, mobile menu opens, footer links work.

- [ ] **Step 5: Commit**

```bash
cd /Users/michaglio/Projects/dmj-europe
git add .
git commit -m "feat: add placeholder images and verify all routes"
```

---

## Images Needed from User

Once the site is running on localhost, these placeholder images should be replaced with real photos:

1. **Hero background** — factory floor, manufacturing line, or workers (1920x800+)
2. **About page** — team photo or office
3. **Staff Leasing** — workers in industrial setting
4. **Process** — optional step illustrations
5. **Industries** — small icons or photos per sector

User can provide these, or we can search for stock photos together.
