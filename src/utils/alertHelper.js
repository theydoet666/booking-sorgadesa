import Swal from 'sweetalert2';

// Custom SweetAlert2 styling wrapper that matches the Sorga Desa Belega brand guidelines
const swalCustomTheme = {
  background: '#F7F4EC', // shuttle-cream
  confirmButtonColor: '#1B4A3F', // court-green
  cancelButtonColor: '#B98B4E', // rattan-gold
  customClass: {
    popup: 'font-sans rounded-3xl border border-rattan-gold/35 shadow-2xl p-6',
    title: 'font-fraunces font-bold text-net-charcoal text-xl',
    htmlContainer: 'text-net-charcoal/70 font-sans text-xs leading-relaxed',
    confirmButton: 'font-sans font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl text-shuttle-cream border-0 cursor-pointer shadow-md mx-1 select-none',
    cancelButton: 'font-sans font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl text-shuttle-cream border-0 cursor-pointer shadow-md mx-1 select-none'
  }
};

export const showAlert = {
  success(title, text = '') {
    return Swal.fire({
      ...swalCustomTheme,
      title,
      text,
      icon: 'success',
      iconColor: '#1B4A3F'
    });
  },

  error(title, text = '') {
    return Swal.fire({
      ...swalCustomTheme,
      title,
      text,
      icon: 'error',
      iconColor: '#B54747' // status-danger red
    });
  },

  warning(title, text = '') {
    return Swal.fire({
      ...swalCustomTheme,
      title,
      text,
      icon: 'warning',
      iconColor: '#B98B4E' // rattan-gold
    });
  },

  confirm(title, text = '', confirmText = 'Ya, Lanjutkan', cancelText = 'Batal') {
    return Swal.fire({
      ...swalCustomTheme,
      title,
      text,
      icon: 'question',
      iconColor: '#1B4A3F',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true
    });
  }
};
