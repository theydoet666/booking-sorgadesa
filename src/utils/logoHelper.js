// Default SVG Logo representing a Balinese-ornamented Badminton Shuttlecock
export const DEFAULT_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="46" fill="%231B4A3F" stroke="%23B98B4E" stroke-width="4"/><path d="M50 20 L35 65 L65 65 Z" fill="%23F7F4EC" stroke="%23B98B4E" stroke-width="2"/><circle cx="50" cy="72" r="8" fill="%23C9DB4A"/><line x1="50" y1="20" x2="50" y2="65" stroke="%23B98B4E" stroke-width="2"/><line x1="42" y1="42" x2="58" y2="42" stroke="%23B98B4E" stroke-width="2"/><line x1="38" y1="55" x2="62" y2="55" stroke="%23B98B4E" stroke-width="2"/></svg>`;

/**
 * Dynamically updates the browser's favicon tag
 * @param {string} url - URL or Base64 data URI of the logo
 */
export const updateFavicon = (url) => {
  if (!url) return;
  try {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = url;
    link.type = url.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png';
  } catch (err) {
    console.warn("Gagal merubah favicon browser:", err);
  }
};
