import Footer from './Footer.astro';

export default {
  title: 'Indonesia/Footer',
  component: Footer,
  parameters: {
    docs: {
      description: {
        component:
          'Dark three-column site footer: inverted brand logo with a short company description, a localized navigation column (the Jobs link only appears in the Indonesian locale), and a contact column with location, the info@spacompany-indonesia.com mailto link, and a WhatsApp link. Ends with a copyright line using the current year. It takes no props — the language is derived from Astro.url, defaulting to Indonesian.',
      },
    },
  },
};

// Footer is prop-less; language comes from Astro.url (defaults to Indonesian).
export const Default = {};
