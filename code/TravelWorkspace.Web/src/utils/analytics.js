import ReactGA from 'react-ga4';

export const TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID || 'G-38QHGD89YJ';

// Hàm mã hóa Email thành User ID ẩn danh (Tuân thủ nghiêm ngặt Google PII Policy, tránh bị GA4 drop sự kiện)
export const hashEmailToUserId = (email) => {
  if (!email || typeof email !== 'string') return undefined;
  const clean = email.toLowerCase().trim();
  try {
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }
    return 'u_' + Math.abs(hash).toString(36);
  } catch {
    return 'u_user';
  }
};

// Gửi sự kiện Đăng ký tài khoản (sign_up)
export const trackSignUp = (email) => {
  try {
    const safeId = hashEmailToUserId(email);
    if (safeId) {
      ReactGA.set({ user_id: safeId });
    }
    ReactGA.event('sign_up', {
      method: 'Email'
    });
    // Gửi trực tiếp qua window.gtag để đảm bảo 100% không bị miss
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'sign_up', {
        method: 'Email',
        send_to: TRACKING_ID
      });
    }
  } catch (err) {
    console.warn('Lỗi khi gửi sự kiện sign_up lên GA4:', err);
  }
};

// Gửi sự kiện Đăng nhập (login)
export const trackLogin = (email) => {
  try {
    const safeId = hashEmailToUserId(email);
    if (safeId) {
      ReactGA.set({ user_id: safeId });
    }
    ReactGA.event('login', {
      method: 'Email'
    });
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'login', {
        method: 'Email',
        send_to: TRACKING_ID
      });
    }
  } catch (err) {
    console.warn('Lỗi khi gửi sự kiện login lên GA4:', err);
  }
};
