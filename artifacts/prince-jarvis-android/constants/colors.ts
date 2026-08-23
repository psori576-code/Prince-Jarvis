/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#F7F2E8',
    tint: '#D6A84C',

    // Core surfaces
    background: '#101522',
    foreground: '#F7F2E8',

    // Cards / elevated surfaces
    card: '#192235',
    cardForeground: '#F7F2E8',

    // Primary action color (buttons, links, active states)
    primary: '#D6A84C',
    primaryForeground: '#101522',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#26324A',
    secondaryForeground: '#F7F2E8',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#222D42',
    mutedForeground: '#98A5B8',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#273A4A',
    accentForeground: '#BCE4D6',

    // Destructive actions (delete, error states)
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#2B3851',
    input: '#32415D',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
