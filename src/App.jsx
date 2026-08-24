import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginAdmin from './pages/LoginAdmin';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import KelolaBooking from './pages/dashboard/KelolaBooking';
import KelolaSchedules from './pages/dashboard/KelolaSchedules';
import PointOfSale from './pages/dashboard/PointOfSale';
import LaporanKeuangan from './pages/dashboard/LaporanKeuangan';
import PengaturanSistem from './pages/dashboard/PengaturanSistem';

function App() {
  return (
    <Router>
      <Routes>
        {/* Halaman Publik (Landing Page) */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Halaman Masuk Admin (Login) */}
        <Route path="/login" element={<LoginAdmin />} />
        
        {/* Halaman Dashboard Admin (Terproteksi) */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="bookings" element={<KelolaBooking />} />
          <Route path="schedules" element={<KelolaSchedules />} />
          <Route path="pos" element={<PointOfSale />} />
          <Route path="reports" element={<LaporanKeuangan />} />
          <Route path="settings" element={<PengaturanSistem />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
