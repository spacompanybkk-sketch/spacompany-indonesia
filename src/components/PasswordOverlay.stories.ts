import PasswordOverlay from './PasswordOverlay.astro';

export default {
  title: 'Indonesia/PasswordOverlay',
  component: PasswordOverlay,
  parameters: {
    docs: {
      description: {
        component:
          'Full-screen admin sign-in overlay: a fixed, blurred dark backdrop with a centered card asking for email and password. Client-side it signs in through Firebase Auth (signInWithEmailAndPassword) and only hides itself for the two hardcoded allowed staff emails; wrong credentials and rate-limit errors are surfaced inline. The component takes no props, so a single Default story shows the locked state as an unauthenticated visitor would see it.',
      },
    },
  },
};

// Prop-less component; renders the locked overlay state.
export const Default = {};
