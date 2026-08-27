// Default Logo Pb. Sorga Belega
export const DEFAULT_LOGO = '/favicon.svg';

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
    if (url.endsWith('.ico')) {
      link.type = 'image/x-icon';
    } else if (url.startsWith('data:image/svg') || url.endsWith('.svg')) {
      link.type = 'image/svg+xml';
    } else {
      link.type = 'image/png';
    }
  } catch (err) {
    console.warn("Gagal merubah favicon browser:", err);
  }
};
