import Header from './Header.astro';

export default {
  title: 'Indonesia/Header',
  component: Header,
  parameters: {
    docs: {
      description: {
        component:
          'Sticky site header with the Spa Company Indonesia logo, a bilingual (EN/ID) navigation bar, "For Candidates" and "Post a Job" CTA pills, a language toggle, and a hamburger-driven mobile menu. It takes no props: the active language and nav highlighting are derived from Astro.url at render time (paths without an /en prefix render Indonesian), and some links are language-exclusive (Therapists is EN-only, Jobs is ID-only). The mobile menu toggle is wired up by an inline client script.',
      },
    },
  },
};

// Header reads language and active-link state from Astro.url, not from props,
// so a single Default story is rendered (Indonesian, the default locale).
export const Default = {};
