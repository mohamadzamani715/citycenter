document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTheme();
  initForgotPassword();
  initActionButtons();
});

// CSP-safe replacement for inline event handlers (onclick=…) — CSP no longer allows
// 'unsafe-inline' in script-src-attr, so all handlers are bound here instead.
function initActionButtons() {
  document.querySelectorAll('[data-action="logout"]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  });

  document.querySelectorAll('[data-action="navigate"]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); window.location.href = el.dataset.href; });
  });

  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(el.dataset.closeModal);
      if (target) target.classList.remove('active');
    });
  });
}

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const subTabBtns = document.querySelectorAll('.sub-tab-btn');
  const subTabContents = document.querySelectorAll('.sub-tab-content');
  
  if (!tabBtns.length && !subTabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const subTabId = btn.getAttribute('data-subtab');
      
      subTabBtns.forEach(b => b.classList.remove('active'));
      subTabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(subTabId).classList.add('active');
    });
  });

  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) adminLoginForm.addEventListener('submit', loginAdmin);
  
  const shopLoginForm = document.getElementById('shopLoginForm');
  if (shopLoginForm) shopLoginForm.addEventListener('submit', loginShop);
  
  const shopRegisterForm = document.getElementById('shopRegisterForm');
  if (shopRegisterForm) shopRegisterForm.addEventListener('submit', registerShop);
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
  
  // Set initial icon
  updateThemeIcon();

  const toggleThemeBtn = document.getElementById('toggleTheme');
  if (toggleThemeBtn) toggleThemeBtn.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  // Update icon
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = document.querySelector('.theme-icon');
  if (icon) {
    icon.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  }
}

async function loginAdmin(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  try {
    const response = await fetch('/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      window.location.href = '/admin/dashboard';
    } else {
      alert(result.message || 'خطا در ورود');
    }
  } catch (err) {
    console.error(err);
    alert('خطا: ' + err.message);
  }
}

async function loginShop(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  try {
    const response = await fetch('/auth/shop/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      window.location.href = '/shop/dashboard';
    } else {
      alert(result.message || 'خطا در ورود');
    }
  } catch (err) {
    console.error(err);
    alert('خطا در ورود');
  }
}

async function registerShop(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  try {
    const response = await fetch('/auth/shop/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      alert(result.message || 'ثبت‌نام موفق');
      const subTabBtns = document.querySelectorAll('.sub-tab-btn');
      const subTabContents = document.querySelectorAll('.sub-tab-content');
      subTabBtns.forEach(b => b.classList.remove('active'));
      subTabContents.forEach(c => c.classList.remove('active'));
      subTabBtns[0].classList.add('active');
      subTabContents[0].classList.add('active');
    } else {
      alert(result.message || 'خطا در ثبت‌نام');
    }
  } catch (err) {
    console.error(err);
    alert('خطا در ثبت‌نام');
  }
}

function initForgotPassword() {
  const modal = document.getElementById('forgotPasswordModal');
  const btn = document.getElementById('forgotPasswordBtn');
  const closeBtn = document.querySelector('.close');
  const step1 = document.getElementById('forgotStep1');
  const step2 = document.getElementById('forgotStep2');
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  
  if (!modal || !btn || !closeBtn || !step1 || !step2) return;

  const setStep2Visible = (visible) => {
    step2.classList.toggle('forgot-step-2-hidden', !visible);
    step2.classList.toggle('forgot-step-2-visible', visible);
  };

  btn.onclick = () => {
    modal.style.display = 'block';
    step1.style.display = 'block';
    setStep2Visible(false);
  };

  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };

  const step1Form = document.getElementById('forgotStep1Form');
  if (step1Form) {
    step1Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      try {
        const response = await fetch('/auth/shop/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        alert(result.message || 'درخواست ارسال شد');
        
        if (response.ok) {
          // carry the phone entered in step 1 into the step-2 form
          const phoneValue = document.getElementById('forgotPhone')?.value || '';
          const phoneHidden = document.getElementById('forgotPhoneHidden');
          if (phoneHidden) phoneHidden.value = phoneValue;
          step1.style.display = 'none';
          setStep2Visible(true);
        }
      } catch (err) {
        console.error(err);
        alert('خطا در ارسال درخواست');
      }
    });
  }

  const step2Form = document.getElementById('forgotStep2Form');
  if (step2Form) {
    step2Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      // phone was entered in step 1 — always send it with the reset request
      data.phone = document.getElementById('forgotPhoneHidden')?.value || '';
      
      try {
        const response = await fetch('/auth/shop/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        alert(result.message || 'رمز عبور با موفقیت تغییر یافت');
        
        if (response.ok) {
          modal.style.display = 'none';
        }
      } catch (err) {
        console.error(err);
        alert('خطا در تغییر رمز عبور');
      }
    });
  }
}

function fetchWithAuth(url, options = {}) {
  let csrfToken = document.querySelector('input[name="_csrf"]')?.value;
  
  // Fall back to meta tag if not found in input
  if (!csrfToken) {
    csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  }

  const headers = {
    ...options.headers,
  };

  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function logout() {
  try {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    await fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    });
  } catch (err) {
    console.error(err);
  }
  window.location.href = '/login';
}
