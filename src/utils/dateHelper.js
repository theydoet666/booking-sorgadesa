/**
 * Utility helper untuk operasi tanggal & waktu yang konsisten
 * Mencegah bug timezone shift (UTC vs Local) dan parsing NaN.
 */

// Format tanggal lokal hari ini: YYYY-MM-DD
export const getTodayLocalStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Menambah atau mengurangi hari dari string YYYY-MM-DD secara aman (tanpa timezone shift)
export const shiftDateStr = (dateStr, deltaDays = 0) => {
  if (!dateStr || !dateStr.includes('-')) return getTodayLocalStr();
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Validasi format jam HH:MM
export const isValidTimeFormat = (val) => {
  return typeof val === 'string' && /^\d{2}:\d{2}$/.test(val);
};

// Helper konversi HH:MM ke total menit
export const timeToMinutes = (timeStr) => {
  if (!isValidTimeFormat(timeStr)) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Hitung durasi jam antara jam_mulai dan jam_selesai
export const calculateDurationHours = (startTime, endTime) => {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) return 0;
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const diff = endMin - startMin;
  return diff > 0 ? diff / 60.0 : 0;
};
