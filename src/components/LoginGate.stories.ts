import LoginGate from './LoginGate.astro';

export default {
  title: 'Indonesia/LoginGate',
  component: LoginGate,
  parameters: {
    docs: {
      description: {
        component:
          'Email-code authentication gate for internal intake tools. Renders a two-step card UI: step one asks for a @spa-company.com email and sends a 6-digit login code via the sendLoginCode Firebase function; step two verifies the code (verifyLoginCode) and stores a session token in localStorage. Slotted content stays hidden until authentication succeeds. The component takes no props — allowed domains are hardcoded — so only the initial email step is shown here; the code/loading steps and the actual Firebase calls are client-side behavior that does not run in a static Storybook build.',
      },
    },
  },
};

// Prop-less component; the visible state in a static render is the email step.
export const Default = {};
