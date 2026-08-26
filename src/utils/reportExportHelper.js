import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEFAULT_LOGO } from './logoHelper';

// Helper format currency IDR
const formatRupiah = (num) => {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
};

// Helper format tanggal Indonesia
const formatDateIndo = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${parseInt(d, 10)} ${monthNames[parseInt(m, 10) - 1]} ${y}`;
};

// Helper konversi SVG / URL Gambar ke PNG Data URL untuk jsPDF
const getPngDataUrl = (src) => {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 150;
        canvas.height = img.naturalHeight || 150;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

/**
 * Menyimpan Laporan Keuangan Langsung Sebagai File PDF (.pdf)
 */
export const saveFinancialToPdf = async ({
  summary = {},
  courtPerformance = [],
  posPerformance = [],
  filteredBookings = [],
  filteredTransactions = [],
  startDate = '',
  endDate = '',
  settings = {}
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 14;

  const businessName = settings.nama_desa || 'Sorga Desa Belega';
  const businessAddress = settings.alamat || 'Jl. Raya Belega, Blahbatuh, Gianyar, Bali';
  const businessPhone = settings.nomor_wa_admin ? `+${settings.nomor_wa_admin}` : '+62 812-3456-7890';
  const logoSrc = settings.logo_url || DEFAULT_LOGO;

  // 1. Render Kop Surat & Logo
  try {
    const pngLogo = await getPngDataUrl(logoSrc);
    if (pngLogo) {
      doc.addImage(pngLogo, 'PNG', margin, currentY, 18, 18);
    }
  } catch (e) {
    console.warn('Gagal memuat gambar logo untuk PDF:', e);
  }

  // Teks Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(27, 74, 63); // #1B4A3F Court Green
  doc.text(businessName.toUpperCase(), margin + 22, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(businessAddress, margin + 22, currentY + 10);
  
  doc.setFontSize(8.5);
  doc.setTextColor(185, 139, 78); // #B98B4E Rattan Gold
  doc.text(`WhatsApp: ${businessPhone}  |  Sistem Manajemen Booking & POS`, margin + 22, currentY + 15);

  // Garis Pembatas Kop Surat
  currentY += 21;
  doc.setDrawColor(27, 74, 63);
  doc.setLineWidth(0.75);
  doc.line(margin, currentY, margin + contentWidth, currentY);

  currentY += 6;

  // 2. Judul Dokumen & Periode
  doc.setFillColor(248, 250, 249);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(27, 74, 63);
  doc.text('LAPORAN KEUANGAN & OKUPANSI LAPANGAN', margin + contentWidth / 2, currentY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Periode: ${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}  |  Dicetak: ${new Date().toLocaleString('id-ID')}`, margin + contentWidth / 2, currentY + 10.5, { align: 'center' });

  currentY += 18;

  // 3. Ringkasan Finansial Eksekutif (4 Box KPI)
  const boxGap = 3;
  const boxWidth = (contentWidth - boxGap * 3) / 4;
  const boxHeight = 16;

  const kpis = [
    { label: 'OMSET SEWA LAPANGAN', value: formatRupiah(summary.bookingRevenue), highlight: false },
    { label: 'OMSET PENJUALAN POS', value: formatRupiah(summary.posRevenue), highlight: false },
    { label: 'TOTAL OMSET GABUNGAN', value: formatRupiah(summary.totalRevenue), highlight: true },
    { label: 'ESTIMASI LABA POS', value: formatRupiah(summary.posProfit), highlight: false }
  ];

  kpis.forEach((kpi, idx) => {
    const boxX = margin + idx * (boxWidth + boxGap);
    if (kpi.highlight) {
      doc.setFillColor(237, 247, 244);
      doc.setDrawColor(27, 74, 63);
      doc.setLineWidth(0.4);
    } else {
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
    }
    doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, boxX + 3, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(27, 74, 63);
    doc.text(kpi.value, boxX + 3, currentY + 11.5);
  });

  currentY += boxHeight + 8;

  // 4. Tabel Kinerja & Okupansi Lapangan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(27, 74, 63);
  doc.text(`1. KINERJA & OKUPANSI LAPANGAN (Rata-rata: ${summary.occupancyPct}%)`, margin, currentY);
  currentY += 3;

  const courtRows = courtPerformance.map((c, i) => [
    i + 1,
    c.nama_lapangan,
    `${c.total_booking} Pesanan`,
    `${c.total_jam} Jam`,
    formatRupiah(c.revenue),
    `${c.okupansi_pct}%`
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['No', 'Nama Lapangan', 'Total Booking', 'Jam Terpakai', 'Omset Lapangan', 'Tingkat Okupansi']],
    body: courtRows,
    theme: 'grid',
    headStyles: {
      fillColor: [27, 74, 63],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [40, 40, 40]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'center', fontStyle: 'bold', textColor: [27, 74, 63] }
    }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 5. Tabel Penjualan POS per Kategori
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(27, 74, 63);
  doc.text('2. REKAPITULASI PENJUALAN POS / KANTIN', margin, currentY);
  currentY += 3;

  const totalPosQty = posPerformance.reduce((acc, curr) => acc + curr.qty, 0);
  const posRows = posPerformance.map((p, i) => [
    i + 1,
    p.kategori,
    `${p.qty} Pcs`,
    formatRupiah(p.omset),
    formatRupiah(p.profit)
  ]);

  // Tambahkan baris total
  posRows.push(['', 'TOTAL PENJUALAN POS', `${totalPosQty} Pcs`, formatRupiah(summary.posRevenue), formatRupiah(summary.posProfit)]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['No', 'Kategori Produk', 'Qty Terjual', 'Total Omset', 'Estimasi Laba Bersih']],
    body: posRows,
    theme: 'grid',
    headStyles: {
      fillColor: [27, 74, 63],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [40, 40, 40]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold', textColor: [27, 74, 63] }
    },
    didParseCell: (data) => {
      if (data.row.index === posRows.length - 1) {
        data.cell.styles.fillColor = [237, 247, 244];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 6. Rincian Booking (Ringkas) jika ada ruang atau di halaman baru
  if (filteredBookings.length > 0) {
    // Jika sisa halaman tidak cukup, autoTable otomatis page-break
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(27, 74, 63);
    
    // Cek posisi Y apakah perlu pindah halaman
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }
    
    doc.text(`3. DATA TRANSAKSI BOOKING LAPANGAN (${filteredBookings.length} Pesanan)`, margin, currentY);
    currentY += 3;

    const bookingRows = filteredBookings.slice(0, 15).map(b => [
      b.id_booking,
      b.tanggal,
      `${b.jam_mulai}-${b.jam_selesai}`,
      b.nama_pemesan || '-',
      b.id_lapangan,
      formatRupiah(b.total_harga),
      b.status_pembayaran || 'Lunas'
    ]);

    if (filteredBookings.length > 15) {
      bookingRows.push(['...', '...', '...', `... dan ${filteredBookings.length - 15} transaksi lainnya (lihat file Excel)`, '...', '...', '...']);
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['ID Booking', 'Tanggal', 'Waktu', 'Pemesan', 'Lapangan', 'Biaya', 'Status']],
      body: bookingRows,
      theme: 'striped',
      headStyles: {
        fillColor: [34, 38, 31],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8
      },
      columnStyles: {
        5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'center' }
      }
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // 7. Kolom Pengesahan Tanda Tangan
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  const signWidth = 60;
  const leftSignX = margin + 10;
  const rightSignX = margin + contentWidth - signWidth - 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  // Kiri: Petugas Kasir
  doc.text('Dibuat Oleh,', leftSignX + signWidth / 2, currentY, { align: 'center' });
  doc.text('Petugas Kasir / Admin', leftSignX + signWidth / 2, currentY + 4, { align: 'center' });
  doc.text('( ......................................... )', leftSignX + signWidth / 2, currentY + 24, { align: 'center' });

  // Kanan: Pengelola
  const todayIndoStr = formatDateIndo(new Date().toISOString().split('T')[0]);
  doc.text(`Gianyar, ${todayIndoStr}`, rightSignX + signWidth / 2, currentY, { align: 'center' });
  doc.text('Mengetahui, Pengelola', rightSignX + signWidth / 2, currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 74, 63);
  doc.text(settings.atas_nama_rekening || 'Pengelola Sorga Desa', rightSignX + signWidth / 2, currentY + 24, { align: 'center' });

  // 8. Footer Nomor Halaman
  const totalPagesCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, 285, margin + contentWidth, 285);
    doc.text(`Dokumen Resmi Laporan Keuangan - ${businessName}`, margin, 290);
    doc.text(`Halaman ${i} dari ${totalPagesCount}`, margin + contentWidth, 290, { align: 'right' });
  }

  // Unduh Berkas PDF
  const filename = `Laporan_Keuangan_SorgaDesa_${startDate}_${endDate}.pdf`;
  doc.save(filename);
};

/**
 * Export Laporan Keuangan ke Spreadsheet Excel / CSV dengan UTF-8 BOM
 */
export const exportFinancialToExcel = ({
  summary = {},
  courtPerformance = [],
  posPerformance = [],
  filteredBookings = [],
  filteredTransactions = [],
  startDate = '',
  endDate = '',
  settings = {}
}) => {
  const businessName = settings.nama_desa || 'Sorga Desa Belega';
  
  let csvContent = '\uFEFF'; // UTF-8 BOM agar Excel menampilkan aksen dan angka dengan benar

  // 1. Header Bisnis & Metadata
  csvContent += `"${businessName.toUpperCase()} - LAPORAN KEUANGAN DAN OKUPANSI"\n`;
  csvContent += `"Periode:","${startDate} s/d ${endDate}"\n`;
  csvContent += `"Tanggal Export:","${new Date().toLocaleString('id-ID')}"\n\n`;

  // 2. Ringkasan Finansial
  csvContent += `"=== RINGKASAN EKSEKUTIF FINANSIAL ==="\n`;
  csvContent += `"Indikator Metrik","Nilai (Rp / Persen)"\n`;
  csvContent += `"Total Omset Sewa Lapangan",${summary.bookingRevenue || 0}\n`;
  csvContent += `"Total Omset Penjualan POS",${summary.posRevenue || 0}\n`;
  csvContent += `"Total Omset Gabungan",${summary.totalRevenue || 0}\n`;
  csvContent += `"Estimasi Laba Kotor POS",${summary.posProfit || 0}\n`;
  csvContent += `"Total Jam Lapangan Terpakai (Jam)",${summary.bookedHours || 0}\n`;
  csvContent += `"Rata-rata Tingkat Okupansi (%)","${summary.occupancyPct || 0}%"\n\n`;

  // 3. Kinerja Lapangan
  csvContent += `"=== KINERJA & OKUPANSI LAPANGAN ==="\n`;
  csvContent += `"ID Lapangan","Nama Lapangan","Total Booking","Total Jam Terpakai","Omset Lapangan (Rp)","Tingkat Okupansi (%)"\n`;
  courtPerformance.forEach(c => {
    csvContent += `"${c.id_lapangan}","${c.nama_lapangan}",${c.total_booking || 0},${c.total_jam || 0},${c.revenue || 0},"${c.okupansi_pct || 0}%"\n`;
  });
  csvContent += '\n';

  // 4. Kategori Penjualan POS
  csvContent += `"=== REKAPITULASI PENJUALAN POS PER KATEGORI ==="\n`;
  csvContent += `"Kategori Produk","Qty Terjual (Pcs)","Total Omset POS (Rp)","Estimasi Laba Bersih (Rp)"\n`;
  posPerformance.forEach(p => {
    csvContent += `"${p.kategori}",${p.qty || 0},${p.omset || 0},${p.profit || 0}\n`;
  });
  csvContent += '\n';

  // 5. Data Mentah Booking Lapangan
  if (filteredBookings.length > 0) {
    csvContent += `"=== DATA TRANSAKSI BOOKING LAPANGAN ==="\n`;
    csvContent += `"ID Booking","Tanggal","Jam Mulai","Jam Selesai","Nama Pemesan","No WhatsApp","Lapangan","Total Harga (Rp)","Status Booking","Status Pembayaran"\n`;
    filteredBookings.forEach(b => {
      csvContent += `"${b.id_booking || ''}","${b.tanggal || ''}","${b.jam_mulai || ''}","${b.jam_selesai || ''}","${(b.nama_pemesan || '').replace(/"/g, '""')}","${b.no_wa || ''}","${b.id_lapangan || ''}",${b.total_harga || 0},"${b.status_booking || ''}","${b.status_pembayaran || ''}"\n`;
    });
    csvContent += '\n';
  }

  // 6. Data Mentah Transaksi Kasir POS
  if (filteredTransactions.length > 0) {
    csvContent += `"=== DATA TRANSAKSI KASIR POS ==="\n`;
    csvContent += `"ID Transaksi","Waktu Transaksi","Kasir / Petugas","Total Belanja (Rp)","Nominal Bayar (Rp)","Kembalian (Rp)","Metode Pembayaran"\n`;
    filteredTransactions.forEach(t => {
      csvContent += `"${t.id_transaksi || ''}","${t.tanggal || ''}","${t.kasir || 'Kasir'}",${t.total_belanja || 0},${t.bayar || 0},${t.kembalian || 0},"${t.metode_pembayaran || 'Tunai'}"\n`;
    });
  }

  // Trigger download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `Laporan_Keuangan_SorgaDesa_${startDate}_${endDate}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
