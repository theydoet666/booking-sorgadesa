/**
 * ⚠️ PERINGATAN KEAMANAN / SECURITY NOTICE:
 * File ini HANYA digunakan untuk simulasi otentikasi di lingkungan Development (Sandbox Dev Mode).
 * 
 * ATURAN KETAT:
 * File ini TIDAK BOLEH di-import secara statis di luar guard `if (import.meta.env.DEV)`
 * agar bundler Vite/Rollup dapat melakukan dead-code elimination / tree-shaking secara total,
 * sehingga kredensial dan logika mock ini TIDAK PERNAH masuk ke dalam bundle production (dist/).
 */

export async function handleDevMockLogin({ username, password, db, navigate, setErrorMsg, setLoading }) {
  const staffList = JSON.parse(localStorage.getItem('sorga_staff')) || [];
  const user = staffList.find(s => s.username === username);

  if (!user) {
    setErrorMsg('Username tidak terdaftar di database sandbox.');
    setLoading(false);
    return false;
  }

  // Sandbox development credentials only (development sandbox environment)
  const expectedPassword = username === 'admin' ? 'admin123' : 'kasir123';
  if (password !== expectedPassword) {
    setErrorMsg('Password salah! (Khusus mode dev: gunakan admin123 atau kasir123)');
    setLoading(false);
    return false;
  }

  if (user.status !== 'Aktif') {
    setErrorMsg('Akun Anda dinonaktifkan. Silakan hubungi Super Admin.');
    setLoading(false);
    return false;
  }

  // Success sandbox login
  sessionStorage.setItem('sorga_session', JSON.stringify({
    token: `mock-token-${Date.now()}`,
    user: {
      id: user.id_user || user.id || 'mock-id',
      nama: user.nama,
      username: user.username,
      role: user.role,
      must_change_password: Boolean(user.must_change_password)
    }
  }));

  db.addActivityLog(user.nama, 'Login Admin', 'Berhasil masuk ke dashboard sandbox');
  setLoading(false);
  navigate('/admin');
  return true;
}
