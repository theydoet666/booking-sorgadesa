import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, X, Calendar, User, Clock, Check, Power, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { db } from '../../utils/db';
import GlassCard from '../../components/GlassCard';
import { showAlert } from '../../utils/alertHelper';
import { getTodayLocalStr, shiftDateStr, calculateDurationHours } from '../../utils/dateHelper';

export default function KelolaSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cronResult, setCronResult] = useState('');
  const [generateDays, setGenerateDays] = useState(30); // Default to 30 days (1 month)

  // Paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [schedules.length]);

  // Pilihan Jadwal untuk Trigger
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);

  useEffect(() => {
    const activeIds = schedules.filter(s => s.status === 'Aktif').map(s => s.id_jadwal_tetap);
    setSelectedScheduleIds(activeIds);
  }, [schedules]);

  const handleToggleSelectRow = (id) => {
    setSelectedScheduleIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const activeSchedules = schedules.filter(s => s.status === 'Aktif');
    const allActiveSelected = activeSchedules.length > 0 && activeSchedules.every(s => selectedScheduleIds.includes(s.id_jadwal_tetap));
    if (allActiveSelected) {
      setSelectedScheduleIds([]);
    } else {
      setSelectedScheduleIds(activeSchedules.map(s => s.id_jadwal_tetap));
    }
  };

  const totalPages = Math.ceil(schedules.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSchedules = schedules.slice(indexOfFirstItem, indexOfLastItem);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingScheduleId, setEditingScheduleId] = useState('');
  const [editingMemberId, setEditingMemberId] = useState('');
  const [editingStatus, setEditingStatus] = useState('Aktif');
  const [newSchedule, setNewSchedule] = useState({
    nama_member: '',
    no_hp: '',
    id_lapangan: '',
    hari: 'Senin',
    jam_mulai: '18:00',
    jam_selesai: '20:00',
    tanggal_mulai_periode: getTodayLocalStr(),
    tanggal_akhir_periode: '',
    catatan: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allSchedules = await db.getSchedules();
      setSchedules(allSchedules);

      const dbCourts = await db.getCourts();
      setCourts(dbCourts.filter(c => c.status === 'Aktif'));
      
      if (dbCourts.length > 0) {
        setNewSchedule(prev => ({ ...prev, id_lapangan: dbCourts[0].id_lapangan }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Status Aktif/Nonaktif
  const handleToggleStatus = async (id, currentStatus) => {
    const activeSession = JSON.parse(sessionStorage.getItem('sorga_session'));
    const adminName = activeSession ? activeSession.user.nama : 'Admin';
    
    const actionText = currentStatus === 'Aktif' ? 'menonaktifkan' : 'mengaktifkan';
    const confirmRes = await showAlert.confirm("Konfirmasi Status Jadwal", `Apakah Anda yakin ingin ${actionText} jadwal rutin member ini?`);
    if (!confirmRes.isConfirmed) return;

    const newStatus = currentStatus === 'Aktif' ? 'Nonaktif' : 'Aktif';
    await db.toggleScheduleStatus(id, newStatus);
    
    db.addActivityLog(adminName, 'Toggle Jadwal Member', `Mengubah status jadwal ${id} menjadi ${newStatus}`);
    showAlert.success("Status Diperbarui", `Status langganan member rutin berhasil diubah menjadi ${newStatus}.`);
    loadData();
  };

  // Trigger Manual Generation (Daily Cron Trigger)
  const handleGenerateSlots = async () => {
    const activeJadwal = schedules.filter(s => s.status === 'Aktif' && selectedScheduleIds.includes(s.id_jadwal_tetap));
    if (activeJadwal.length === 0) {
      showAlert.warning("Tidak Ada Pilihan", "Tidak ada jadwal aktif tercentang yang dipilih untuk dijalankan!");
      return;
    }

    setGenerating(true);
    setCronResult('');
    
    try {
      // Tunggu 1 detik untuk efek simulasi trigger
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ambil bookings & courts dari DB
      const dbBookings = await db.getBookings();
      const courtList = await db.getCourts();

      let generatedCount = 0;
      let warningCount = 0;
      let newBookingsArray = dbBookings ? [...dbBookings] : [];
      let bookingsToInsert = [];

      const todayStr = getTodayLocalStr();
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

      // Generate slot selama periode hari terpilih
      for (let d = 0; d < generateDays; d++) {
        const dateStr = shiftDateStr(todayStr, d);
        const [y, m, dayNum] = dateStr.split('-').map(Number);
        const targetDate = new Date(y, (m || 1) - 1, dayNum || 1);
        const targetDayName = dayNames[targetDate.getDay()];

        activeJadwal.forEach(j => {
          // Cocokkan Hari
          if (j.hari === 'Setiap Hari' || j.hari.includes(targetDayName)) {
            // Cocokkan Periode
            if (j.tanggal_mulai_periode && dateStr < j.tanggal_mulai_periode) return;
            if (j.tanggal_akhir_periode && dateStr > j.tanggal_akhir_periode) return;

            // Cek bentrok dengan booking di array temporal
            const isBentrok = newBookingsArray.some(b => {
              if (b.id_lapangan !== j.id_lapangan) return false;
              if (b.tanggal !== dateStr) return false;
              if (b.status_booking === 'Dibatalkan') return false;
              return j.jam_mulai < b.jam_selesai && b.jam_mulai < j.jam_selesai;
            });

            if (isBentrok) {
              warningCount++;
              return;
            }

            // Hitung harga sewa
            const court = courtList.find(c => c.id_lapangan === j.id_lapangan);
            const duration = calculateDurationHours(j.jam_mulai, j.jam_selesai);
            const price = court ? (court.harga_member * duration) : 45000 * duration;

            // Generate ID Booking
            const dateCompact = dateStr.replace(/-/g, '');
            const idBooking = `BK-${dateCompact}-${j.id_jadwal_tetap.substring(0, 4).toUpperCase()}`;

            // Tambah jika belum ada
            if (!newBookingsArray.some(b => b.id_booking === idBooking)) {
              const newBookingObj = {
                id_booking: idBooking,
                id_lapangan: j.id_lapangan,
                tanggal: dateStr,
                jam_mulai: j.jam_mulai,
                jam_selesai: j.jam_selesai,
                nama_pemesan: j.nama_member,
                no_hp: j.no_hp || '-',
                sumber_booking: 'Terjadwal',
                status_booking: 'Dikonfirmasi',
                status_pembayaran: 'Belum Bayar',
                nominal_dibayar: 0,
                total_harga: price,
                catatan: `Jadwal Rutin Member (${j.id_jadwal_tetap})`,
                dibuat_oleh: 'Sistem Trigger'
              };
              newBookingsArray.push(newBookingObj);
              bookingsToInsert.push(newBookingObj);
              generatedCount++;
            }
          }
        });
      }

      // Simpan batch baru ke database
      if (bookingsToInsert.length > 0) {
        const saveRes = await db.addBookingsBatch(bookingsToInsert);
        if (!saveRes.success) {
          throw new Error(saveRes.message || "Gagal menyimpan data booking.");
        }
      }
      
      const summaryMsg = `Simulasi Cron Selesai! Berhasil men-generate ${generatedCount} slot booking baru untuk ${generateDays} hari ke depan. (Dilewati karena bentrok/tutup: ${warningCount})`;
      setCronResult(summaryMsg);
      showAlert.success("Proses Generate Selesai", summaryMsg);
      
      const activeSession = JSON.parse(sessionStorage.getItem('sorga_session'));
      db.addActivityLog(activeSession ? activeSession.user.nama : 'Sistem', 'Generate Jadwal Rutin', summaryMsg);

    } catch (err) {
      console.error(err);
      setCronResult(`Terjadi kesalahan pemicu: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Buka Modal Tambah Jadwal
  const handleOpenAddSchedule = () => {
    setNewSchedule({
      nama_member: '',
      no_hp: '',
      id_lapangan: courts.length > 0 ? courts[0].id_lapangan : '',
      hari: 'Senin',
      jam_mulai: '18:00',
      jam_selesai: '20:00',
      tanggal_mulai_periode: getTodayLocalStr(),
      tanggal_akhir_periode: '',
      catatan: ''
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  // Buka Modal Edit Jadwal
  const handleOpenEditSchedule = (schedule) => {
    setNewSchedule({
      nama_member: schedule.nama_member,
      no_hp: schedule.no_hp || '',
      id_lapangan: schedule.id_lapangan,
      hari: schedule.hari,
      jam_mulai: schedule.jam_mulai,
      jam_selesai: schedule.jam_selesai,
      tanggal_mulai_periode: schedule.tanggal_mulai_periode,
      tanggal_akhir_periode: schedule.tanggal_akhir_periode || '',
      catatan: schedule.catatan || ''
    });
    setEditingScheduleId(schedule.id_jadwal_tetap);
    setEditingMemberId(schedule.id_member);
    setEditingStatus(schedule.status);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Hapus Jadwal Rutin Member
  const handleDeleteSchedule = async (schedule) => {
    const activeSession = JSON.parse(sessionStorage.getItem('sorga_session'));
    const adminName = activeSession ? activeSession.user.nama : 'Admin';

    const confirmRes = await showAlert.confirm("Hapus Jadwal Member", `Apakah Anda yakin ingin menghapus jadwal rutin member ${schedule.nama_member} secara permanen? Slot booking mendatang yang telah digenerate tidak akan terpengaruh.`);
    if (!confirmRes.isConfirmed) return;

    const res = await db.deleteSchedule(schedule.id_jadwal_tetap);
    if (res.success) {
      db.addActivityLog(adminName, 'Hapus Jadwal Member', `Menghapus jadwal rutin ${schedule.nama_member} (ID: ${schedule.id_jadwal_tetap})`);
      showAlert.success("Berhasil Dihapus", `Jadwal rutin ${schedule.nama_member} telah dihapus.`);
      loadData();
    } else {
      showAlert.error("Gagal Menghapus", res.message || "Gagal menghapus jadwal.");
    }
  };

  // Submit Schedule Baru / Edit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    const activeSession = JSON.parse(sessionStorage.getItem('sorga_session'));
    const adminName = activeSession ? activeSession.user.nama : 'Admin';

    if (modalMode === 'edit') {
      const scheduleData = {
        id_jadwal_tetap: editingScheduleId,
        id_member: editingMemberId,
        nama_member: newSchedule.nama_member,
        no_hp: newSchedule.no_hp,
        id_lapangan: newSchedule.id_lapangan,
        hari: newSchedule.hari,
        jam_mulai: newSchedule.jam_mulai,
        jam_selesai: newSchedule.jam_selesai,
        tanggal_mulai_periode: newSchedule.tanggal_mulai_periode,
        tanggal_akhir_periode: newSchedule.tanggal_akhir_periode || null,
        status: editingStatus,
        catatan: newSchedule.catatan
      };

      const res = await db.updateSchedule(scheduleData);
      if (res.success) {
        db.addActivityLog(adminName, 'Edit Jadwal Member', `Mengubah langganan tetap: ${newSchedule.nama_member} (${newSchedule.hari} ${newSchedule.jam_mulai}-${newSchedule.jam_selesai})`);
        setIsModalOpen(false);
        showAlert.success("Jadwal Diperbarui", `Jadwal rutin member ${newSchedule.nama_member} berhasil diperbarui.`);
        loadData();
      } else {
        showAlert.error("Gagal Menyimpan", res.message || "Terjadi kesalahan saat memperbarui jadwal.");
      }
      return;
    }

    // Member ID Mock / Generator
    const memberId = `MBR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const scheduleId = `SCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Daftarkan member baru di local storage jika tidak ada
    const members = JSON.parse(localStorage.getItem('sorga_member')) || [];
    members.push({
      id_member: memberId,
      nama: newSchedule.nama_member,
      no_hp: newSchedule.no_hp,
      tipe_member: 'Reguler',
      tanggal_daftar: new Date().toISOString().split('T')[0],
      status: 'Aktif'
    });
    localStorage.setItem('sorga_member', JSON.stringify(members));

    const scheduleData = {
      id_jadwal_tetap: scheduleId,
      id_member: memberId,
      nama_member: newSchedule.nama_member,
      no_hp: newSchedule.no_hp,
      id_lapangan: newSchedule.id_lapangan,
      hari: newSchedule.hari,
      jam_mulai: newSchedule.jam_mulai,
      jam_selesai: newSchedule.jam_selesai,
      tanggal_mulai_periode: newSchedule.tanggal_mulai_periode,
      tanggal_akhir_periode: newSchedule.tanggal_akhir_periode || null,
      status: 'Aktif',
      catatan: newSchedule.catatan
    };

    const res = await db.addSchedule(scheduleData);
    if (res.success) {
      db.addActivityLog(adminName, 'Tambah Jadwal Member', `Mendaftarkan langganan tetap baru: ${newSchedule.nama_member} (${newSchedule.hari} ${newSchedule.jam_mulai}-${newSchedule.jam_selesai})`);
      setIsModalOpen(false);
      showAlert.success("Jadwal Ditambahkan", `Jadwal rutin baru untuk member ${newSchedule.nama_member} berhasil disimpan.`);
      loadData();
    }
  };

  // Opsi jam
  const times = [];
  for (let h = 8; h <= 22; h++) {
    const hourStr = String(h).padStart(2, '0');
    times.push(`${hourStr}:00`);
    if (h < 22) {
      times.push(`${hourStr}:30`);
    }
  }

  const hariOptions = ['Setiap Hari', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-fraunces font-bold text-2xl sm:text-3xl text-net-charcoal">Jadwal Member</h2>
          <p className="text-xs font-sans text-net-charcoal/60 uppercase tracking-wider mt-0.5">Daftar Slot Tetap Langganan Komunitas</p>
        </div>
        
        <div className="flex gap-2">
          {/* Refresh */}
          <button 
            onClick={loadData}
            className="flex items-center justify-center w-10 h-10 border border-net-charcoal/20 text-net-charcoal/70 bg-shuttle-cream hover:bg-net-charcoal/10 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={16} />
          </button>

          {/* Selector Periode Generate */}
          <div className="flex items-center gap-1.5 border border-net-charcoal/20 bg-shuttle-cream rounded-xl px-2 h-10">
            <span className="text-[10px] font-sans font-bold text-net-charcoal/50 uppercase tracking-wider pl-1 select-none">Periode:</span>
            <select
              value={generateDays}
              onChange={(e) => setGenerateDays(Number(e.target.value))}
              className="bg-transparent text-xs font-sans font-bold text-net-charcoal focus:outline-none cursor-pointer pr-1"
            >
              <option value={7}>7 Hari</option>
              <option value={30}>30 Hari (1 Bulan)</option>
              <option value={90}>90 Hari (3 Bulan)</option>
            </select>
          </div>

          {/* Trigger Cron Simulation */}
          <button
            onClick={handleGenerateSlots}
            disabled={generating}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-rattan-gold text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-rattan-gold/90 transition-all cursor-pointer border border-chalk-line/10"
          >
            {generating ? 'Memproses...' : 'Jalankan Trigger Booking'}
          </button>
          
          {/* Add Schedule */}
          <button
            onClick={handleOpenAddSchedule}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-court-green/95 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Rutin</span>
          </button>
        </div>
      </div>

      {/* Cron Result Toast/Box */}
      {cronResult && (
        <div className="flex items-start gap-2.5 p-4 bg-court-green/10 border border-court-green/20 rounded-2xl text-xs text-net-charcoal relative">
          <Check size={16} className="text-court-green shrink-0 mt-0.5" />
          <div className="text-left">
            <span className="font-bold block">Status Trigger Otomatis</span>
            <p className="text-net-charcoal/80 mt-0.5 leading-relaxed">{cronResult}</p>
          </div>
          <button onClick={() => setCronResult('')} className="absolute right-3 top-3 text-net-charcoal/40 hover:text-net-charcoal">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Schedules Table */}
      <GlassCard lPost className="border border-net-charcoal/10 relative p-4">
        {loading ? (
          <p className="text-sm font-sans text-net-charcoal/60 py-10 text-center">Menarik database jadwal tetap...</p>
        ) : schedules.length === 0 ? (
          <p className="text-sm font-sans text-net-charcoal/60 py-10 text-center">Belum ada langganan tetap terdaftar.</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-net-charcoal/10 text-net-charcoal/60 uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-3 text-center w-10">
                    <input 
                      type="checkbox"
                      checked={schedules.filter(s => s.status === 'Aktif').length > 0 && schedules.filter(s => s.status === 'Aktif').every(s => selectedScheduleIds.includes(s.id_jadwal_tetap))}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                      title="Pilih semua jadwal aktif"
                    />
                  </th>
                  <th className="py-2.5 px-3">ID & Nama Member</th>
                  <th className="py-2.5 px-3">Lapangan</th>
                  <th className="py-2.5 px-3">Hari</th>
                  <th className="py-2.5 px-3">Jam Sewa</th>
                  <th className="py-2.5 px-3">Mulai Periode</th>
                  <th className="py-2.5 px-3">Akhir Periode</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-net-charcoal/5 font-medium text-net-charcoal">
                {currentSchedules.map(s => (
                  <tr key={s.id_jadwal_tetap} className="hover:bg-court-green/5">
                    <td className="py-3 px-3 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedScheduleIds.includes(s.id_jadwal_tetap)}
                        disabled={s.status !== 'Aktif'}
                        onChange={() => handleToggleSelectRow(s.id_jadwal_tetap)}
                        className={`cursor-pointer ${s.status !== 'Aktif' ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title={s.status !== 'Aktif' ? 'Jadwal nonaktif tidak dapat di-trigger' : 'Pilih jadwal ini untuk dijalankan'}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold block">{s.nama_member}</span>
                      <span className="font-mono text-[10px] text-net-charcoal/50">{s.id_jadwal_tetap}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold">{s.id_lapangan}</td>
                    <td className="py-3 px-3 font-bold text-court-green">{s.hari}</td>
                    <td className="py-3 px-3 font-mono text-net-charcoal/80">{s.jam_mulai} - {s.jam_selesai}</td>
                    <td className="py-3 px-3 font-mono">{s.tanggal_mulai_periode}</td>
                    <td className="py-3 px-3 font-mono text-net-charcoal/60">
                      {s.tanggal_akhir_periode || 'Seterusnya'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block py-0.5 px-2.5 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'Aktif' 
                          ? 'bg-status-success/20 text-court-green border border-status-success/30' 
                          : 'bg-status-danger/10 text-status-danger border border-status-danger/20'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(s.id_jadwal_tetap, s.status)}
                          className={`inline-flex items-center gap-1 py-1 px-2.5 rounded text-[10px] font-bold uppercase cursor-pointer shrink-0 ${
                            s.status === 'Aktif'
                              ? 'bg-status-danger/15 text-status-danger hover:bg-status-danger/25'
                              : 'bg-status-success/20 text-court-green hover:bg-status-success/30'
                          }`}
                          title={s.status === 'Aktif' ? 'Matikan Jadwal' : 'Aktifkan Jadwal'}
                        >
                          <Power size={10} />
                          <span>{s.status === 'Aktif' ? 'Matikan' : 'Aktifkan'}</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditSchedule(s)}
                          className="p-1 bg-court-green/10 text-court-green hover:bg-court-green/20 rounded transition-all cursor-pointer"
                          title="Edit Jadwal"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(s)}
                          className="p-1 bg-status-danger/10 text-status-danger hover:bg-status-danger/20 rounded transition-all cursor-pointer"
                          title="Hapus Jadwal"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Kontrol Paginasi */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-net-charcoal/10 pt-4 mt-4 text-xs font-sans">
            <span className="text-net-charcoal/60">
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, schedules.length)} dari {schedules.length} jadwal
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="py-1 px-3 border border-net-charcoal/20 bg-shuttle-cream/50 text-net-charcoal hover:bg-net-charcoal/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-all cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="font-mono font-bold px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="py-1 px-3 border border-net-charcoal/20 bg-shuttle-cream/50 text-net-charcoal hover:bg-net-charcoal/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-all cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* New Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-net-charcoal/60 backdrop-blur-sm"></div>
          
          <div className="w-full max-w-md z-10">
            <GlassCard lPost className="p-6 relative max-h-[85vh] overflow-y-auto custom-scrollbar border border-rattan-gold/30">
              <div className="flex items-center justify-between border-b border-rattan-gold/25 pb-3 mb-4">
                <h3 className="font-fraunces font-bold text-xl text-net-charcoal">
                  {modalMode === 'add' ? 'Tambah Jadwal Rutin' : 'Edit Jadwal Rutin'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-net-charcoal/50 hover:text-net-charcoal">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs text-left">
                
                {/* Member Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nama Member</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap member"
                      value={newSchedule.nama_member}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, nama_member: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">No. WhatsApp</label>
                    <input
                      type="tel"
                      required
                      placeholder="0812345678"
                      value={newSchedule.no_hp}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, no_hp: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                    />
                  </div>
                </div>

                {/* Court & Day */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Lapangan</label>
                    <select
                      value={newSchedule.id_lapangan}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, id_lapangan: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans font-medium"
                    >
                      {courts.map(c => (
                        <option key={c.id_lapangan} value={c.id_lapangan}>{c.nama_lapangan}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Hari Rutin</label>
                    <select
                      value={newSchedule.hari}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, hari: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                    >
                      {hariOptions.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Mulai</label>
                    <select
                      value={newSchedule.jam_mulai}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewSchedule(prev => {
                          let newEnd = prev.jam_selesai;
                          if (newEnd <= val) {
                            const [h, m] = val.split(':').map(Number);
                            let endH = (h || 18) + 1;
                            let endM = m || 0;
                            if (endH >= 22) {
                              endH = 22;
                              endM = 0;
                            }
                            newEnd = String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0');
                          }
                          return { ...prev, jam_mulai: val, jam_selesai: newEnd };
                        });
                      }}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                    >
                      {times.filter(t => t !== '22:00').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Selesai</label>
                    <select
                      value={newSchedule.jam_selesai}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, jam_selesai: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                    >
                      {times.filter(t => t > newSchedule.jam_mulai).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Period Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Mulai Berlaku</label>
                    <input
                      type="date"
                      required
                      value={newSchedule.tanggal_mulai_periode}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, tanggal_mulai_periode: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Akhir (Opsional)</label>
                    <input
                      type="date"
                      value={newSchedule.tanggal_akhir_periode}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, tanggal_akhir_periode: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Catatan</label>
                  <textarea
                    placeholder="Catatan rutin, nama PB/klub"
                    value={newSchedule.catatan}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, catatan: e.target.value }))}
                    rows={1}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3 bg-court-green text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-court-green/95 transition-all text-xs pt-3.5 cursor-pointer shadow-md"
                >
                  Simpan Jadwal Rutin
                </button>

              </form>
            </GlassCard>
          </div>
        </div>
      )}

    </div>
  );
}
