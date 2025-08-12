/* PropVest Sri Lanka – Minimal JS (ES6+) */
(function () {
  const STORAGE_KEYS = {
    user: 'stakeUser',
    listings: 'stakeListings',
    investments: 'stakeInvestments',
    teamInvites: 'stakeTeamInvites'
  };

  /* ------------------------- Utilities & Storage ------------------------- */
  const getJSON = (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const setJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const currencyLKR = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(Number(value || 0));
  const byId = (id) => document.getElementById(id);

  /* ----------------------------- Toast Notifications -------------------- */
  const showToast = (message, type = 'info', duration = 4000) => {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());

    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed top-4 right-4 z-50 space-y-3';
      document.body.appendChild(toastContainer);
    }

    // Toast colors based on type
    const colors = {
      success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification flex items-center p-4 rounded-xl border shadow-lg transform transition-all duration-300 ease-out ${colors[type]}`;
    toast.style.transform = 'translateX(100%)';
    
    // Toast icon
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <div class="flex-shrink-0 w-5 h-5 mr-3 flex items-center justify-center rounded-full ${type === 'success' ? 'bg-emerald-100 text-emerald-600' : type === 'error' ? 'bg-red-100 text-red-600' : type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'} font-bold text-sm">
        ${icons[type]}
      </div>
      <div class="flex-1 text-sm font-medium">${message}</div>
      <button class="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });

    // Auto remove after duration
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);

    // Only close when clicking the close button, not when clicking elsewhere on the toast
    // (The close button already has onclick="this.parentElement.remove()")
  };

  // Convenience functions for different toast types
  const showSuccess = (message, duration) => showToast(message, 'success', duration);
  const showError = (message, duration) => showToast(message, 'error', duration);
  const showWarning = (message, duration) => showToast(message, 'warning', duration);
  const showInfo = (message, duration) => showToast(message, 'info', duration);

  /* ------------------------------- Auth & Storage ------------------------------ */
  const currentUser = () => getJSON(STORAGE_KEYS.user);
  const isLoggedIn = () => !!currentUser();
  const isAdmin = () => currentUser()?.role === 'admin';
  const isInvestor = () => currentUser()?.role === 'investor';
  const logout = () => { 
    showInfo('Logging out...');
    setTimeout(() => {
      localStorage.removeItem(STORAGE_KEYS.user); 
      window.location.href = 'index.html'; 
    }, 500);
  };

  /* ----------------------------- Data Storage ---------------------------- */
  // Seed initial data if none exists
  const ensureSeedData = () => {
    if (!getJSON(STORAGE_KEYS.listings)) {
      const seedListings = [
        {
          id: 'colombo-sky-1',
          title: 'Colombo Sky Residences',
          city: 'Colombo',
          category: 'Residential',
          status: 'Active',
          image: 'https://images.unsplash.com/photo-1600585154340-1e9a27f926c3?q=80&w=1200&auto=format&fit=crop',
          minInvestment: 500000,
          roi: 12,
          targetAmount: 50000000,
          totalRaised: 25000000,
          durationMonths: 24
        },
        {
          id: 'galle-heritage-1',
          title: 'Galle Heritage Hotel',
          city: 'Galle',
          category: 'Hospitality',
          status: 'Active',
          image: 'https://images.unsplash.com/photo-1544989164-31dc3c645987?q=80&w=1200&auto=format&fit=crop',
          minInvestment: 750000,
          roi: 15,
          targetAmount: 75000000,
          totalRaised: 45000000,
          durationMonths: 36
        },
        {
          id: 'kandy-hills-1',
          title: 'Kandy Hills Apartments',
          city: 'Kandy',
          category: 'Residential',
          status: 'Funding',
          image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop',
          minInvestment: 600000,
          roi: 11,
          targetAmount: 60000000,
          totalRaised: 30000000,
          durationMonths: 30
        }
      ];
      setJSON(STORAGE_KEYS.listings, seedListings);
    }
    
    if (!getJSON(STORAGE_KEYS.investments)) {
      setJSON(STORAGE_KEYS.investments, []);
    }
  };

  /* ---------------------------- Listings Store --------------------------- */
  const getListings = () => {
    return getJSON(STORAGE_KEYS.listings) || [];
  };

  const findListingById = (id) => {
    const listings = getListings();
    return listings.find(l => l.id === id) || null;
  };

  const upsertListing = (listing) => {
    const listings = getListings();
    const existingIndex = listings.findIndex(l => l.id === listing.id);
    
    if (existingIndex >= 0) {
      listings[existingIndex] = listing;
    } else {
      listings.push(listing);
    }
    
    setJSON(STORAGE_KEYS.listings, listings);
    return listing;
  };

  const deleteListing = (id) => {
    const listings = getListings();
    const filtered = listings.filter(l => l.id !== id);
    setJSON(STORAGE_KEYS.listings, filtered);
    return true;
  };

  /* -------------------------- Investments Store ------------------------- */
  const getInvestments = () => {
    return getJSON(STORAGE_KEYS.investments) || [];
  };

  const createInvestment = (listingId, amount) => {
    const investments = getInvestments();
    const user = currentUser();
    
    const investment = {
      id: `inv_${Date.now()}`,
      listingId,
      amount,
      userEmail: user.email,
      date: new Date().toISOString()
    };
    
    investments.push(investment);
    setJSON(STORAGE_KEYS.investments, investments);
    return investment;
  };

  // Team invites per listing
  const getTeamInvites = (listingId) => {
    const key = `stakeTeamInvites_${listingId}`;
    return getJSON(key) || [];
  };

  const sendTeamInvite = (listingId, email) => {
    const invites = getTeamInvites(listingId);
    const invite = {
      email,
      status: 'Pending',
      date: new Date().toISOString()
    };
    invites.push(invite);
    setTeamInvites(listingId, invites);
    return invite;
  };

  const acceptTeamInvite = (listingId) => {
    const invites = getTeamInvites(listingId);
    const user = currentUser();
    const invite = invites.find(i => i.email === user.email);
    if (invite) {
      invite.status = 'Accepted';
      setTeamInvites(listingId, invites);
    }
    return invite;
  };

  const setTeamInvites = (listingId, invites) => {
    const key = `stakeTeamInvites_${listingId}`;
    setJSON(key, invites);
  };

  /* ---------------------------- Helper Renders --------------------------- */
  function renderFeatured() {
    const grid = byId('featuredGrid'); if (!grid) return;
    try {
      const listings = getListings();
      const featured = listings.slice(0, 3);
      grid.innerHTML = featured.map(cardTemplate).join('');
      attachProgressAnimations(grid);
      if (featured.length > 0) {
        showSuccess(`Loaded ${featured.length} featured properties`);
      }
    } catch (error) {
      console.error('Failed to render featured:', error);
      grid.innerHTML = '<p class="text-gray-500">Failed to load featured properties</p>';
      showError('Failed to load featured properties');
    }
  }

  function renderNavAuth() {
    const container = document.getElementById('navAuth');
    if (!container) return;
    if (!isLoggedIn()) {
      container.innerHTML = `
        <a href="login.html" class="px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold">Login</a>
        <a href="register.html" class="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow">Sign up</a>
      `;
    } else {
      const dashHref = isAdmin() ? 'admin-dashboard.html' : 'investor-dashboard.html';
      const u = currentUser();
      const displayName = (u && (u.name || u.email)) || 'Account';
      container.innerHTML = `
        <span class="hidden sm:inline px-3 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">${displayName}</span>
        <a href="${dashHref}" class="px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold">Dashboard</a>
        <button id="navLogout" class="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Logout</button>
      `;
      const btn = document.getElementById('navLogout');
      btn && btn.addEventListener('click', logout);
    }
  }

  function renderProjectsGrid() {
    const grid = byId('listingsGrid'); if (!grid) return;
    try {
      const listings = getListings();
      const filtered = applyFilters(listings);
      byId('listingsCount') && (byId('listingsCount').textContent = String(filtered.length));
      grid.innerHTML = filtered.map(cardTemplate).join('');
      attachProgressAnimations(grid);
      if (filtered.length > 0) {
        showSuccess(`Loaded ${filtered.length} properties`);
      }
    } catch (error) {
      console.error('Failed to render projects grid:', error);
      grid.innerHTML = '<p class="text-gray-500">Failed to load properties</p>';
      showError('Failed to load properties');
    }
  }

  function applyFilters(listings) {
    const q = (byId('searchInput')?.value || '').trim().toLowerCase();
    const category = byId('categorySelect')?.value || 'All';
    const status = byId('statusSelect')?.value || 'All';
    return listings.filter((l) => {
      const matchesQuery = !q || l.city.toLowerCase().includes(q) || l.title.toLowerCase().includes(q);
      const matchesCategory = category === 'All' || l.category === category;
      const matchesStatus = status === 'All' || l.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }

  function cardTemplate(l) {
    const pct = Math.min(100, Math.round((l.totalRaised / l.targetAmount) * 100));
    const admin = isAdmin();
    const canInvest = !admin && l.status === 'Active';
    const ctaHref = admin ? `#` : `project-details.html?id=${encodeURIComponent(l.id)}`;
    const ctaLabel = admin ? 'Edit Property' : (canInvest ? 'Invest Now' : 'View Details');
    const ctaClass = admin
      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
      : (canInvest ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700');
    return `
      <article class="group rounded-2xl bg-white shadow-sm overflow-hidden">
        <div class="relative">
          <img src="${l.image}" alt="${l.title} in ${l.city}" class="h-48 w-full object-cover" />
          <span class="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold">${l.category}</span>
          <span class="absolute top-3 right-3 px-3 py-1 rounded-full ${l.status === 'Active' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'} text-xs font-semibold">${l.status}</span>
        </div>
        <div class="p-5 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-bold">${l.title}</h3>
            <span class="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">${l.roi}% ROI</span>
          </div>
          <div class="text-sm text-gray-600">${l.city}</div>
          <div>
            <div class="flex items-center justify-between text-xs text-gray-600"><span>Progress</span><span>${pct}%</span></div>
            <div class="mt-1 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-emerald-600 rounded-full will-animate-progress" style="width:0%" data-progress="${pct}"></div>
            </div>
          </div>
          <a href="${ctaHref}" data-cta="true" data-id="${l.id}" class="inline-block mt-2 w-full text-center px-4 py-2 rounded-full ${ctaClass} text-sm font-semibold">${ctaLabel}</a>
        </div>
      </article>
    `;
  }

  function renderAdminTable() {
    const body = byId('adminListingsBody'); if (!body) return;
    try {
      const listings = getListings();
      const rows = listings.map((l) => `
        <tr>
          <td class="px-6 py-3">${l.title}</td>
          <td class="px-6 py-3">${l.city}</td>
          <td class="px-6 py-3">${l.category}</td>
          <td class="px-6 py-3">${l.status}</td>
          <td class="px-6 py-3">${l.roi}%</td>
          <td class="px-6 py-3">${currencyLKR(l.targetAmount)}</td>
          <td class="px-6 py-3">${currencyLKR(l.totalRaised)}</td>
          <td class="px-6 py-3 space-y-2">
            <button data-action="edit" data-id="${l.id}" class="px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold">Edit</button>
            <button data-action="delete" data-id="${l.id}" class="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">Delete</button>
          </td>
        </tr>
      `);
      body.innerHTML = rows.join('');
      if (listings.length > 0) {
        showSuccess(`Loaded ${listings.length} properties for management`);
      }
    } catch (error) {
      console.error('Failed to render admin table:', error);
      body.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500">Failed to load properties</td></tr>';
      showError('Failed to load properties for management');
    }
  }

  /* --------------------------- Progress Animation ------------------------ */
  function attachProgressAnimations(root = document) {
    const bars = root.querySelectorAll('.will-animate-progress');
    if (!bars.length) return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target; const pct = Number(el.getAttribute('data-progress')) || 0;
          el.style.transition = 'width 1s ease';
          requestAnimationFrame(() => el.style.width = pct + '%');
          io.unobserve(el);
        }
      }
    }, { threshold: 0.3 });
    bars.forEach((b) => io.observe(b));
  }

  /* ------------------------------ Home Page ------------------------------ */
  function initHome() {
    renderNavAuth();
    renderFeatured();
    
    // Show welcome toast for new visitors
    if (!isLoggedIn()) {
      setTimeout(() => {
        showInfo('Welcome to PropVest Sri Lanka! 🏠', 6000);
      }, 1000);
    }
    // CountUp stats
    if (window.CountUp) {
      document.querySelectorAll('[data-countup]').forEach((el) => {
        const to = Number(el.getAttribute('data-to')) || 0;
        const cu = new window.CountUp.CountUp(el, to, { duration: 2 }); cu.start();
      });
    }
    // CTA behavior
    const cta = byId('ctaInvest');
    const modal = byId('authModal');
    cta && cta.addEventListener('click', () => {
      if (isAdmin()) {
        showInfo('Redirecting to admin dashboard...');
        setTimeout(() => window.location.href = 'admin-dashboard.html', 500);
      } else if (isInvestor()) {
        showInfo('Redirecting to properties...');
        setTimeout(() => window.location.href = 'projects.html', 500);
      } else if (modal) { 
        showInfo('Please login or sign up to start investing');
        modal.classList.remove('hidden'); 
        modal.classList.add('flex'); 
      }
    });

    // Subtle tilt on hero visual
    const hv = byId('heroVisual');
    if (hv) {
      const strength = 10; // px
      const onMove = (e) => {
        const rect = hv.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        hv.style.transform = `rotateX(${(-dy * strength).toFixed(2)}deg) rotateY(${(dx * strength).toFixed(2)}deg)`;
      };
      const reset = () => { hv.style.transform = 'rotateX(0deg) rotateY(0deg)'; };
      hv.addEventListener('mousemove', onMove);
      hv.addEventListener('mouseleave', reset);
    }
  }

  /* ---------------------------- Projects Page ---------------------------- */
  function initProjects() {
    renderNavAuth();
    renderProjectsGrid();
    // Populate categories
    const categorySelect = byId('categorySelect');
    if (categorySelect) {
               const listings = getListings();
         const cats = Array.from(new Set(listings.map((l) => l.category))).sort();
         categorySelect.innerHTML = `<option value="All">All categories</option>` + cats.map((c) => `<option value="${c}">${c}</option>`).join('');
    }
    // Wire filters
    const searchInput = byId('searchInput');
    const statusSelect = byId('statusSelect');
    [searchInput, categorySelect, statusSelect].forEach((el) => {
      el && el.addEventListener('input', () => {
        renderProjectsGrid();
        showInfo('Filters updated');
      });
      el && el.addEventListener('change', () => {
        renderProjectsGrid();
        showInfo('Filters applied');
      });
    });
    if (isAdmin()) {
      const grid = byId('listingsGrid');
      const modal = byId('listingModal');
      const form = byId('listingForm');
      if (grid && modal && form) {
        const openModal = () => { modal.classList.remove('hidden'); modal.classList.add('flex'); };
        const closeModal = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); form.reset(); form.id.value = ''; };
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        grid.addEventListener('click', (e) => {
          const link = e.target.closest('a[data-cta]');
          if (!link) return;
          if (link.getAttribute('href') === '#') {
            e.preventDefault();
            const id = link.getAttribute('data-id');
            findListingById(id).then(l => {
              if (!l) return;
              form.id.value = l.id;
              form.title.value = l.title;
              form.city.value = l.city;
              form.category.value = l.category;
              form.status.value = l.status;
              form.imageUrl.value = l.image.startsWith('http') ? l.image : '';
              form.minInvestment.value = l.minInvestment;
              form.roi.value = l.roi;
              form.targetAmount.value = l.targetAmount;
              form.totalRaised.value = l.totalRaised;
              form.durationMonths.value = l.durationMonths;
              showInfo('Editing property...');
              openModal();
            }).catch(error => {
              console.error('Failed to load listing for edit:', error);
              showError('Failed to load property details for editing');
            });
          }
        });
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const data = new FormData(form);
          const id = data.get('id')?.toString().trim() || slugify(String(data.get('title') || 'property') + '-' + Date.now());
          const file = data.get('imageFile');
          let image = String(data.get('imageUrl') || '').trim();
          if (file && file instanceof File && file.size) image = await fileToBase64(file);
          const listing = {
            id,
            title: String(data.get('title')), city: String(data.get('city')),
            category: String(data.get('category')), status: String(data.get('status')),
            image: image || 'https://images.unsplash.com/photo-1600585154340-1e9a27f926c3?q=80&w=1200&auto=format&fit=crop',
            minInvestment: Number(data.get('minInvestment')),
            roi: Number(data.get('roi')),
            targetAmount: Number(data.get('targetAmount')),
            totalRaised: Number(data.get('totalRaised')),
            durationMonths: Number(data.get('durationMonths')),
          };
          try {
            await upsertListing(listing);
            renderProjectsGrid();
            showSuccess('Property saved successfully');
            closeModal();
          } catch (error) {
            showError('Failed to save property: ' + error.message);
          }
        });
      }
    }
  }

  /* ------------------------- Project Details Page ------------------------ */
  function initProjectDetails() {
    renderNavAuth();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    try {
      const listing = findListingById(id);
      if (!listing) { showError('Property not found'); window.location.href = 'projects.html'; return; }
      
      // Fill content
      byId('pdImage').src = listing.image;
      byId('pdImage').alt = `${listing.title} in ${listing.city}`;
      byId('pdTitle').textContent = listing.title;
      byId('pdCity').textContent = listing.city;
      byId('pdRoi').textContent = `${listing.roi}% ROI`;
      byId('pdMinInv').textContent = `Min ${currencyLKR(listing.minInvestment)}`;
      const pct = Math.min(100, Math.round((listing.totalRaised / listing.targetAmount) * 100));
      byId('pdProgressText').textContent = `${pct}%`; byId('pdProgress').style.width = '0%';
      requestAnimationFrame(() => { byId('pdProgress').style.transition = 'width 1s ease'; byId('pdProgress').style.width = pct + '%'; });

      // Investment controls
      const slider = byId('investAmount');
      const input = byId('investInput');
      const display = byId('investValue');
      const commitBtn = byId('investCommit');
      const remaining = Math.max(0, listing.targetAmount - listing.totalRaised);
      const step = Math.max(1, Number(listing.minInvestment));
      const canInvest = listing.status === 'Active';
      slider.min = String(step); slider.step = String(step);
      slider.max = String(Math.max(step, Math.floor(remaining / step) * step));
      slider.value = String(step);
      input.value = String(step);
      display.textContent = currencyLKR(step);

      if (!canInvest) {
        slider.disabled = true; input.disabled = true; commitBtn.disabled = true;
        commitBtn.textContent = 'Investing unavailable';
        commitBtn.classList.remove('bg-emerald-600','hover:bg-emerald-700','text-white');
        commitBtn.classList.add('bg-emerald-50','hover:bg-emerald-100','text-emerald-700','cursor-not-allowed');
      }

      function syncFromSlider() { input.value = slider.value; display.textContent = currencyLKR(slider.value); }
      function syncFromInput() {
        const raw = Math.max(step, Math.min(Number(slider.max), Number(input.value || 0)));
        const snapped = Math.floor(raw / step) * step;
        slider.value = String(snapped);
        input.value = String(snapped);
        display.textContent = currencyLKR(snapped);
      }
      slider.addEventListener('input', syncFromSlider);
      input.addEventListener('input', syncFromInput);

             byId('investCommit').addEventListener('click', () => {
         if (listing.status !== 'Active') { showWarning('Investing is only available for Active listings.'); return; }
         if (!isInvestor()) { window.location.href = 'login.html'; return; }
         const amount = Number(input.value || 0);
         if (!amount || amount < step) { showError('Please enter a valid amount.'); return; }
         if (amount > remaining) { showError('Amount exceeds remaining target.'); return; }
         
         try {
           createInvestment(listing.id, amount);
           // Update listing raised
           listing.totalRaised += amount;
           upsertListing(listing);
           showSuccess('Investment committed successfully! Redirecting to your dashboard...');
           window.location.href = 'investor-dashboard.html';
         } catch (error) {
           showError('Failed to commit investment: ' + error.message);
         }
       });

      // Team investing: invite by email
      const inviteInput = byId('teamInviteEmail');
      const inviteBtn = byId('teamInviteBtn');
      const teamList = byId('teamList');
      
      async function renderTeam() {
        if (!teamList) return;
        try {
          const invites = await getTeamInvites(listing.id);
          teamList.innerHTML = invites.length ? invites.map((m) => `<li class="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2"><span>${m.email} — ${m.status}</span><button data-email="${m.email}" class="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">Remove</button></li>`).join('') : '<li class="text-xs text-gray-500">No invites yet</li>';
        } catch (error) {
          console.error('Failed to load team invites:', error);
          teamList.innerHTML = '<li class="text-xs text-gray-500">Failed to load invites</li>';
        }
      }
      
      renderTeam();
      
             inviteBtn && inviteBtn.addEventListener('click', (e) => {
         e.preventDefault();
         if (!isInvestor()) { window.location.href = 'login.html'; return; }
         const email = (inviteInput?.value || '').trim();
         if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showError('Please enter a valid email address'); return; }
         
         try {
           sendTeamInvite(listing.id, email);
           inviteInput.value = '';
           renderTeam();
           showSuccess('Team invite sent successfully!');
         } catch (error) {
           showError('Failed to send invite: ' + error.message);
         }
       });
      
             teamList && teamList.addEventListener('click', (e) => {
         const btn = e.target.closest('button[data-email]'); if (!btn) return;
         const email = btn.getAttribute('data-email');
         
         try {
           const invites = getTeamInvites(listing.id);
           const updatedInvites = invites.filter((i) => i.email !== email);
           setTeamInvites(listing.id, updatedInvites);
           renderTeam();
         } catch (error) {
           console.error('Failed to remove invite:', error);
         }
       });
      
    } catch (error) {
      console.error('Failed to load project details:', error);
      showError('Failed to load property details. Please try again.');
      window.location.href = 'projects.html';
    }
  }

  /* --------------------------- Admin Dashboard --------------------------- */
  function initAdmin() {
    if (!isAdmin()) { window.location.href = 'login.html'; return; }
    renderAdminTable();
    const modal = byId('listingModal');
    const form = byId('listingForm');
    const openModal = () => { modal.classList.remove('hidden'); modal.classList.add('flex'); };
    const closeModal = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); form.reset(); form.id.value = ''; };
    byId('addListingBtn').addEventListener('click', () => { 
      form.reset(); 
      form.id.value = ''; 
      showInfo('Adding new property...');
      openModal(); 
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

         // Table actions
     byId('adminListingsBody').addEventListener('click', (e) => {
       const btn = e.target.closest('button'); if (!btn) return;
       const id = btn.getAttribute('data-id'); const action = btn.getAttribute('data-action');
       const listing = findListingById(id);
       if (action === 'edit' && listing) {
         form.id.value = listing.id;
         form.title.value = listing.title;
         form.city.value = listing.city;
         form.category.value = listing.category;
         form.status.value = listing.status;
         form.imageUrl.value = listing.image.startsWith('http') ? listing.image : '';
         form.minInvestment.value = listing.minInvestment;
         form.roi.value = listing.roi;
         form.targetAmount.value = listing.targetAmount;
         form.totalRaised.value = listing.totalRaised;
         form.durationMonths.value = listing.durationMonths;
         openModal();
       }
       if (action === 'delete') {
         if (confirm('Delete this property?')) {
           try {
             deleteListing(id);
             renderAdminTable();
             showSuccess('Property deleted successfully');
           } catch (error) {
             showError('Failed to delete property: ' + error.message);
           }
         }
       }
     });

         // Save form
     form.addEventListener('submit', (e) => {
       e.preventDefault();
       const data = new FormData(form);
       const id = data.get('id')?.toString().trim() || slugify(String(data.get('title') || 'property') + '-' + Date.now());
       const file = data.get('imageFile');
       let image = String(data.get('imageUrl') || '').trim();
       if (file && file instanceof File && file.size) {
         fileToBase64(file).then(base64Image => {
           const listing = {
             id,
             title: String(data.get('title')), city: String(data.get('city')),
             category: String(data.get('category')), status: String(data.get('status')),
             image: base64Image || 'https://images.unsplash.com/photo-1600585154340-1e9a27f926c3?q=80&w=1200&auto=format&fit=crop',
             minInvestment: Number(data.get('minInvestment')),
             roi: Number(data.get('roi')),
             targetAmount: Number(data.get('targetAmount')),
             totalRaised: Number(data.get('totalRaised')),
             durationMonths: Number(data.get('durationMonths')),
           };
           try {
             upsertListing(listing);
             renderAdminTable();
             showSuccess('Property saved successfully');
             closeModal();
           } catch (error) {
             showError('Failed to save property: ' + error.message);
           }
         });
       } else {
         const listing = {
           id,
           title: String(data.get('title')), city: String(data.get('city')),
           category: String(data.get('category')), status: String(data.get('status')),
           image: image || 'https://images.unsplash.com/photo-1600585154340-1e9a27f926c3?q=80&w=1200&auto=format&fit=crop',
           minInvestment: Number(data.get('minInvestment')),
           roi: Number(data.get('roi')),
           targetAmount: Number(data.get('targetAmount')),
           totalRaised: Number(data.get('totalRaised')),
           durationMonths: Number(data.get('durationMonths')),
         };
         try {
           upsertListing(listing);
           renderAdminTable();
           showSuccess('Property saved successfully');
           closeModal();
         } catch (error) {
           showError('Failed to save property: ' + error.message);
         }
       }
     });

    // Logout
    const out = byId('logoutBtn'); out && out.addEventListener('click', logout);

         // Quick edit if navigated with editId param
     const params = new URLSearchParams(window.location.search);
     const editId = params.get('editId');
     if (editId) {
       const listing = findListingById(editId);
       if (listing) {
         form.id.value = listing.id;
         form.title.value = listing.title;
         form.city.value = listing.city;
         form.category.value = listing.category;
         form.status.value = listing.status;
         form.imageUrl.value = listing.image.startsWith('http') ? listing.image : '';
         form.minInvestment.value = listing.minInvestment;
         form.roi.value = listing.roi;
         form.targetAmount.value = listing.targetAmount;
         form.totalRaised.value = listing.totalRaised;
         form.durationMonths.value = listing.durationMonths;
         showInfo('Editing property...');
         openModal();
       }
     }
  }

  const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const fileToBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });

  /* -------------------------- Investor Dashboard ------------------------- */
  function initInvestor() {
    if (!isInvestor()) { window.location.href = 'login.html'; return; }
    const user = currentUser();
    
    try {
      const investments = getInvestments();
      const all = investments.filter((i) => i.userEmail === user.email);
      const listings = getListings();
      const byIdMap = {};
      listings.forEach(l => byIdMap[l.id] = l);
      
      const tbody = document.getElementById('investmentsBody');
      if (tbody) {
        tbody.innerHTML = all.map((inv) => {
          const l = byIdMap[inv.listingId];
          const date = new Date(inv.date).toLocaleDateString();
          return `<tr>
            <td class="px-6 py-3">${l?.title || inv.listingId}</td>
            <td class="px-6 py-3">${l?.city || '—'}</td>
            <td class="px-6 py-3">${currencyLKR(inv.amount)}</td>
            <td class="px-6 py-3">${date}</td>
            <td class="px-6 py-3"><a href="project-details.html?id=${encodeURIComponent(inv.listingId)}" class="px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold">View</a></td>
          </tr>`;
        }).join('');
      }
      
      // Calculate summary stats
      const sum = all.reduce((n, i) => n + i.amount, 0);
      byId('sumInvested') && (byId('sumInvested').textContent = currencyLKR(sum));
      
      const uniqueProperties = new Set(all.map((i) => i.listingId)).size;
      byId('sumProperties') && (byId('sumProperties').textContent = String(uniqueProperties));
      
      // Estimated ROI: average of involved listings
      if (all.length > 0) {
        let totalRoi = 0;
        all.forEach(inv => {
          const l = listings.find(l => l.id === inv.listingId);
          if (l) totalRoi += l.roi;
        });
        const avgRoi = totalRoi / all.length;
        byId('sumRoi') && (byId('sumRoi').textContent = avgRoi.toFixed(1) + '% p.a.');
      } else {
        byId('sumRoi') && (byId('sumRoi').textContent = '—');
      }
    } catch (error) {
      console.error('Failed to load investor data:', error);
      const tbody = document.getElementById('investmentsBody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500">Failed to load investments</td></tr>';
      }
    }
    
    const out = byId('logoutBtn'); out && out.addEventListener('click', logout);
  }

  /* --------------------------------- Auth -------------------------------- */
  function initLogin() {
    renderNavAuth();
    if (isLoggedIn()) { redirectByRole(); return; }
    const form = byId('loginForm'); if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value.trim();
      
      // Demo login - no backend needed
      if (email === 'admin@stake.com' && password === 'admin123') {
        const user = { email, role: 'admin', name: 'Admin User' };
        setJSON(STORAGE_KEYS.user, user);
        showSuccess(`Welcome back, ${user.name}!`);
        setTimeout(() => redirectByRole(), 1000);
      } else if (email === 'investor@stake.com' && password === 'investor123') {
        const user = { email, role: 'investor', name: 'Demo Investor' };
        setJSON(STORAGE_KEYS.user, user);
        showSuccess(`Welcome back, ${user.name}!`);
        setTimeout(() => redirectByRole(), 1000);
      } else {
        showError('Invalid credentials. Use demo accounts: admin@stake.com/admin123 or investor@stake.com/investor123');
      }
    });
  }

  function initRegister() {
    renderNavAuth();
    if (isLoggedIn()) { redirectByRole(); return; }
    const form = byId('registerForm'); if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value.trim();
      
      if (!name || !email || !password) {
        showError('Please fill in all fields');
        return;
      }
      
      // Create investor account
      const user = { email, role: 'investor', name };
      setJSON(STORAGE_KEYS.user, user);
      showSuccess(`Welcome to PropVest, ${user.name}!`);
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    });
  }

  function redirectByRole() {
    if (isAdmin()) window.location.href = 'admin-dashboard.html';
    else if (isInvestor()) window.location.href = 'index.html';
    else window.location.href = 'index.html';
  }

  /* ------------------------------- Bootstrap ----------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize seed data
    ensureSeedData();
    
    // Footer year
    const yearEl = byId('year'); if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    // AOS
    if (window.AOS) window.AOS.init({ once: true, duration: 600, easing: 'ease-out' });

    const page = document.body.getAttribute('data-page');
    switch (page) {
      case 'home': initHome(); break;
      case 'projects': initProjects(); break;
      case 'project-details': initProjectDetails(); break;
      case 'admin-dashboard': initAdmin(); break;
      case 'investor-dashboard': initInvestor(); break;
      case 'login': initLogin(); break;
      case 'register': initRegister(); break;
      default: break;
    }
  });
})();


