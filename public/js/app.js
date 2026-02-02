/**
 * Mouse Diary - Main Application
 * Single Page Application for Laboratory Mouse Management
 */

const app = {
  currentPage: 'dashboard',
  currentMouseId: null,
  currentExperimentId: null,
  miceData: [],
  experimentsData: [],
  charts: {},
  exportHistory: JSON.parse(localStorage.getItem('exportHistory') || '[]'),

  // Initialize application
  init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.updateCurrentDate();
    this.navigate('dashboard');
  },

  // Update current date in navbar
  updateCurrentDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString('zh-CN');
    }
  },

  // Setup navigation
  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.target.dataset.page;
        this.navigate(page);
      });
    });
  },

  // Setup event listeners
  setupEventListeners() {
    // Mice filters
    document.getElementById('mice-search')?.addEventListener('input', () => this.loadMice());
    document.getElementById('filter-status')?.addEventListener('change', () => this.loadMice());
    document.getElementById('filter-gender')?.addEventListener('change', () => this.loadMice());
    document.getElementById('filter-strain')?.addEventListener('change', () => this.loadMice());

    // Experiment filters
    document.getElementById('exp-start-date')?.addEventListener('change', () => this.loadExperiments());
    document.getElementById('exp-end-date')?.addEventListener('change', () => this.loadExperiments());
    document.getElementById('exp-search')?.addEventListener('input', () => this.loadExperiments());
    document.getElementById('exp-type-filter')?.addEventListener('change', () => this.loadExperiments());
    
    // Type filter buttons
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.type-filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.loadExperiments();
      });
    });
    
    // Rows per page selector
    document.getElementById('exp-rows-per-page')?.addEventListener('change', () => this.loadExperiments());
    
    // Searchable select dropdowns
    document.querySelectorAll('.searchable-select .form-control').forEach(input => {
      input.addEventListener('click', (e) => {
        const dropdown = e.target.parentElement.querySelector('.select-dropdown');
        if (dropdown) {
          dropdown.classList.toggle('active');
        }
      });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.searchable-select')) {
        document.querySelectorAll('.select-dropdown').forEach(d => d.classList.remove('active'));
      }
    });

    // Select all checkboxes
    document.getElementById('select-all-mice')?.addEventListener('change', (e) => {
      document.querySelectorAll('.mouse-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('select-all-experiments')?.addEventListener('change', (e) => {
      document.querySelectorAll('.exp-checkbox').forEach(cb => {
        cb.checked = e.target.checked;
      });
      this.updateBatchDeleteButton();
    });

    // Forms
    document.getElementById('mouse-form')?.addEventListener('submit', (e) => this.saveMouse(e));
    document.getElementById('experiment-form')?.addEventListener('submit', (e) => this.saveExperiment(e));

    // Export page
    document.querySelectorAll('input[name="date-range"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const customRange = document.getElementById('custom-date-range');
        customRange.style.display = e.target.value === 'custom' ? 'flex' : 'none';
      });
    });

    document.querySelectorAll('input[name="mouse-filter"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const specificSelect = document.getElementById('specific-mice-select');
        specificSelect.style.display = e.target.value === 'specific' ? 'block' : 'none';
        if (e.target.value === 'specific') this.loadExportMiceOptions();
      });
    });

    document.getElementById('select-all-types')?.addEventListener('change', (e) => {
      document.querySelectorAll('.exp-type-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    document.querySelectorAll('.export-format-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.export-format-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        card.querySelector('input[type="radio"]').checked = true;
      });
    });
  },

  // Navigation
  navigate(route) {
    // Parse route format: 'page' or 'page/subpage'
    const parts = route.split('/');
    const page = parts[0];
    const subpage = parts[1] || null;
    
    this.currentPage = page;
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

    // Handle subpages first (they manage their own page visibility)
    if (page === 'mice' && subpage === 'add') {
      this.showMouseForm();
      return;
    } else if (page === 'experiments' && subpage === 'add') {
      this.showExperimentForm();
      return;
    }

    // Show target page for normal routes
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      targetPage.classList.remove('hidden');
    }

    // Load page data
    this.loadPageData(page);
  },

  // Go back to previous page
  goBack() {
    if (this.currentPage.includes('form')) {
      this.navigate(this.currentPage.replace('-form', '').replace('-detail', ''));
    } else {
      this.navigate('dashboard');
    }
  },

  // Load page specific data
  loadPageData(page) {
    switch(page) {
      case 'dashboard':
        this.loadDashboardStats();
        this.loadRecentExperiments();
        break;
      case 'mice':
        this.loadMice();
        break;
      case 'stats':
        this.loadStatistics();
        break;
      case 'export':
        this.loadExportMiceOptions();
        this.renderExportHistory();
        break;
      case 'experiments':
        this.loadExperiments();
        break;
    }
  },

  // API Helpers
  async api(url, options = {}) {
    try {
      const response = await fetch(`/api${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API Error');
      }
      
      return await response.json();
    } catch (error) {
      this.showAlert(error.message, 'error');
      throw error;
    }
  },

  // Dashboard
  async loadDashboardStats() {
    try {
      const stats = await this.api('/stats/overview');
      document.getElementById('stat-alive').textContent = stats.aliveMice || 0;
      document.getElementById('stat-today').textContent = stats.todayExperiments || 0;
      document.getElementById('stat-week').textContent = stats.weekExperiments || 0;
      document.getElementById('stat-month-new').textContent = stats.monthNewMice || 0;
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  },

  async loadRecentExperiments() {
    try {
      const data = await this.api('/experiments?limit=10');
      const tbody = document.getElementById('recent-experiments');
      
      if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">暂无记录</td></tr>';
        return;
      }

      tbody.innerHTML = data.data.map(exp => {
        const typeClass = this.getDashboardTypeClass(exp.experiment_type);
        const typeLabel = this.getDashboardTypeLabel(exp.experiment_type);
        return `
        <tr>
          <td>${this.formatDateShort(exp.experiment_date)}</td>
          <td><strong>${exp.mouse_code}</strong></td>
          <td><span class="type-tag-pill ${typeClass}">${typeLabel}</span></td>
          <td>${exp.weight ? exp.weight + 'g' : '-'}</td>
          <td>${exp.operator || '-'}</td>
        </tr>
      `}).join('');
    } catch (e) {
      console.error('Failed to load recent experiments:', e);
    }
  },
  
  // Get dashboard type class for pills
  getDashboardTypeClass(type) {
    const typeMap = {
      '日常称重': 'type-tag-weighing',
      '给药': 'type-tag-injection',
      '行为测试': 'type-tag-observation',
      '采血': 'type-tag-injection',
      '解剖': 'type-tag-observation'
    };
    return typeMap[type] || 'type-tag-observation';
  },
  
  // Get dashboard type label
  getDashboardTypeLabel(type) {
    const labelMap = {
      '日常称重': '称重',
      '给药': '注射',
      '行为测试': '观察',
      '采血': '采血',
      '解剖': '解剖'
    };
    return labelMap[type] || type;
  },
  
  // Format date short
  formatDateShort(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  // Mice Management
  async loadMice(page = 1) {
    try {
      const search = document.getElementById('mice-search')?.value || '';
      const status = document.getElementById('filter-status')?.value || '';
      const gender = document.getElementById('filter-gender')?.value || '';
      const strain = document.getElementById('filter-strain')?.value || '';

      const params = new URLSearchParams({ page, limit: 20, search, status, gender, strain });
      const data = await this.api(`/mice?${params}`);
      
      this.miceData = data.data;
      const tbody = document.getElementById('mice-table-body');
      
      if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">暂无小鼠数据</td></tr>';
      } else {
        tbody.innerHTML = data.data.map(mouse => {
          const ageMonths = Math.floor(mouse.age_months || 0);
          return `
            <tr>
              <td><input type="checkbox" class="mouse-checkbox" value="${mouse.id}"></td>
              <td>${mouse.mouse_code}</td>
              <td>${mouse.strain}</td>
              <td>${mouse.gender}</td>
              <td>${mouse.birth_date}</td>
              <td>${ageMonths}月</td>
              <td><span class="status-badge status-${mouse.status === '存活' ? 'alive' : mouse.status === '死亡' ? 'dead' : 'retired'}">${mouse.status_icon} ${mouse.status}</span></td>
              <td>${mouse.cage_number || '-'}</td>
              <td class="table-actions">
                <button class="action-btn" onclick="app.viewMouse(${mouse.id})" title="查看">👁</button>
                <button class="action-btn" onclick="app.editCurrentMouse(${mouse.id})" title="编辑">✏️</button>
                <button class="action-btn" onclick="app.confirmDeleteMouse(${mouse.id})" title="删除">🗑</button>
              </td>
            </tr>
          `;
        }).join('');
      }

      this.renderPagination('mice-pagination', data.pagination, (p) => this.loadMice(p));
    } catch (e) {
      console.error('Failed to load mice:', e);
    }
  },

  resetMiceFilters() {
    document.getElementById('mice-search').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-gender').value = '';
    document.getElementById('filter-strain').value = '';
    this.loadMice();
  },

  // Mouse Form
  showMouseForm(mouseId = null) {
    this.currentMouseId = mouseId;
    const form = document.getElementById('mouse-form');
    const title = document.getElementById('mouse-form-title');
    
    form.reset();
    document.getElementById('mouse-id').value = '';
    
    if (mouseId) {
      title.textContent = '编辑小鼠信息';
      this.loadMouseForEdit(mouseId);
    } else {
      title.textContent = '添加新小鼠';
    }

    document.getElementById('page-mice').classList.add('hidden');
    document.getElementById('page-mouse-form').classList.remove('hidden');
  },

  async loadMouseForEdit(mouseId) {
    try {
      const mouse = await this.api(`/mice/${mouseId}`);
      document.getElementById('mouse-id').value = mouse.id;
      document.getElementById('mouse-code').value = mouse.mouse_code;
      document.getElementById('mouse-strain').value = mouse.strain;
      document.querySelector(`input[name="gender"][value="${mouse.gender}"]`).checked = true;
      document.getElementById('mouse-birth-date').value = mouse.birth_date;
      document.getElementById('mouse-source').value = mouse.source || '';
      document.getElementById('mouse-cage').value = mouse.cage_number || '';
      document.getElementById('mouse-status').value = mouse.status;
      document.getElementById('mouse-notes').value = mouse.notes || '';
    } catch (e) {
      console.error('Failed to load mouse:', e);
    }
  },

  async saveMouse(e) {
    e.preventDefault();
    
    const mouseData = {
      mouse_code: document.getElementById('mouse-code').value,
      strain: document.getElementById('mouse-strain').value,
      gender: document.querySelector('input[name="gender"]:checked')?.value,
      birth_date: document.getElementById('mouse-birth-date').value,
      source: document.getElementById('mouse-source').value,
      cage_number: document.getElementById('mouse-cage').value,
      status: document.getElementById('mouse-status').value,
      notes: document.getElementById('mouse-notes').value
    };

    try {
      const id = document.getElementById('mouse-id').value;
      if (id) {
        await this.api(`/mice/${id}`, {
          method: 'PUT',
          body: JSON.stringify(mouseData)
        });
        this.showAlert('小鼠信息更新成功！', 'success');
      } else {
        await this.api('/mice', {
          method: 'POST',
          body: JSON.stringify(mouseData)
        });
        this.showAlert('小鼠添加成功！', 'success');
      }
      
      this.navigate('mice');
    } catch (e) {
      console.error('Failed to save mouse:', e);
    }
  },

  // Mouse Detail
  async viewMouse(mouseId) {
    this.currentMouseId = mouseId;
    
    try {
      const mouse = await this.api(`/mice/${mouseId}`);
      const experiments = await this.api(`/mice/${mouseId}/experiments`);
      
      document.getElementById('mouse-detail-title').textContent = `🐭 小鼠 ${mouse.mouse_code}`;
      
      // Info grid
      const infoGrid = document.getElementById('mouse-detail-info');
      infoGrid.innerHTML = `
        <div class="info-item">
          <div class="info-label">品系</div>
          <div class="info-value">${mouse.strain}</div>
        </div>
        <div class="info-item">
          <div class="info-label">性别</div>
          <div class="info-value">${mouse.gender}</div>
        </div>
        <div class="info-item">
          <div class="info-label">出生日期</div>
          <div class="info-value">${mouse.birth_date}</div>
        </div>
        <div class="info-item">
          <div class="info-label">来源</div>
          <div class="info-value">${mouse.source || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">笼位</div>
          <div class="info-value">${mouse.cage_number || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">状态</div>
          <div class="info-value">${mouse.status}</div>
        </div>
      `;
      
      // Notes
      document.getElementById('mouse-detail-notes').innerHTML = mouse.notes ? 
        `<strong>备注：</strong>${mouse.notes}` : '';
      
      // Timeline
      const timeline = document.getElementById('mouse-timeline');
      if (experiments.length === 0) {
        timeline.innerHTML = '<p class="text-center">暂无实验记录</p>';
      } else {
        timeline.innerHTML = experiments.map(exp => `
          <div class="timeline-item">
            <div class="timeline-date">${exp.experiment_date}</div>
            <div class="timeline-content">
              <div class="timeline-title">${exp.experiment_type}</div>
              <div class="timeline-detail">
                ${exp.weight ? `体重: ${exp.weight}g<br>` : ''}
                ${exp.medication ? `用药: ${exp.medication} ${exp.dosage || ''}<br>` : ''}
                ${exp.operator ? `操作人: ${exp.operator}` : ''}
              </div>
            </div>
          </div>
        `).join('');
      }
      
      // Weight chart
      this.renderWeightChart(mouseId);
      
      document.getElementById('page-mice').classList.add('hidden');
      document.getElementById('page-mouse-detail').classList.remove('hidden');
    } catch (e) {
      console.error('Failed to load mouse detail:', e);
    }
  },

  editCurrentMouse(mouseId = null) {
    // 如果传入了 mouseId，使用传入的 ID，否则使用 currentMouseId
    const id = mouseId || this.currentMouseId;
    if (id) {
      this.showMouseForm(id);
    } else {
      console.error('No mouse ID provided for editing');
    }
  },

  addExperimentForMouse() {
    if (this.currentMouseId) {
      this.showExperimentForm(null, this.currentMouseId);
    }
  },

  async renderWeightChart(mouseId) {
    try {
      const weightData = await this.api(`/stats/mouse-weight/${mouseId}`);
      
      const ctx = document.getElementById('weight-chart')?.getContext('2d');
      if (!ctx) return;
      
      if (this.charts.weight) {
        this.charts.weight.destroy();
      }
      
      if (weightData.length === 0) {
        // Show empty message
        return;
      }
      
      this.charts.weight = new Chart(ctx, {
        type: 'line',
        data: {
          labels: weightData.map(d => d.date),
          datasets: [{
            label: '体重 (g)',
            data: weightData.map(d => d.weight),
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: false,
              title: { display: true, text: '体重 (g)' }
            }
          }
        }
      });
    } catch (e) {
      console.error('Failed to render weight chart:', e);
    }
  },

  // Experiments
  async loadExperiments(page = 1) {
    try {
      const startDate = document.getElementById('exp-start-date')?.value || '';
      const endDate = document.getElementById('exp-end-date')?.value || '';
      const search = document.getElementById('exp-search')?.value || '';
      const rowsPerPage = document.getElementById('exp-rows-per-page')?.value || 25;
      
      // Get selected type from filter buttons
      const activeTypeBtn = document.querySelector('.type-filter-btn.active');
      const type = activeTypeBtn ? activeTypeBtn.dataset.type : '';

      const params = new URLSearchParams({ 
        page, limit: rowsPerPage, search, 
        start_date: startDate, 
        end_date: endDate,
        experiment_type: type 
      });
      
      const data = await this.api(`/experiments?${params}`);
      this.experimentsData = data.data;
      
      const tbody = document.getElementById('experiments-table-body');
      
      if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">暂无实验记录</td></tr>';
      } else {
        tbody.innerHTML = data.data.map(exp => {
          const typeClass = this.getExperimentTypeClass(exp.experiment_type);
          const typeLabel = this.getExperimentTypeLabel(exp.experiment_type);
          return `
          <tr>
            <td class="checkbox-col"><input type="checkbox" class="exp-checkbox" value="${exp.id}" onchange="app.updateBatchDeleteButton()"></td>
            <td>${this.formatDateTime(exp.experiment_date, exp.experiment_time)}</td>
            <td><a href="#" class="mouse-id-link" onclick="app.viewMouse(${exp.mouse_id}); return false;">${exp.mouse_code}</a></td>
            <td><span class="exp-type-tag ${typeClass}">${typeLabel}</span></td>
            <td>${exp.weight ? exp.weight : '-'}</td>
            <td>${exp.operator || '-'}</td>
            <td class="actions-col">
              <span class="edit-action" onclick="app.editExperiment(${exp.id})" title="Edit">✏️</span>
            </td>
          </tr>
        `}).join('');
      }

      this.renderPagination('experiments-pagination', data.pagination, (p) => this.loadExperiments(p));
      
      // Update calendar
      this.renderExperimentCalendar();
    } catch (e) {
      console.error('Failed to load experiments:', e);
    }
  },
  
  // Get experiment type CSS class
  getExperimentTypeClass(type) {
    const typeMap = {
      '日常称重': 'exp-type-weighing',
      '给药': 'exp-type-medications',
      '行为测试': 'exp-type-behavioral',
      '采血': 'exp-type-blood',
      '解剖': 'exp-type-dissection'
    };
    return typeMap[type] || 'exp-type-weighing';
  },
  
  // Get experiment type English label
  getExperimentTypeLabel(type) {
    const labelMap = {
      '日常称重': '称重',
      '给药': '给药',
      '行为测试': '行为',
      '采血': '采血',
      '解剖': '解剖'
    };
    return labelMap[type] || type.toUpperCase();
  },
  
  // Format date and time
  formatDateTime(date, time) {
    if (!date) return '-';
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (time) {
      return `${dateStr} · ${time}`;
    }
    return dateStr;
  },
  
  // Render experiment calendar
  renderExperimentCalendar() {
    const calendarEl = document.getElementById('experiment-calendar');
    if (!calendarEl) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    let html = '';
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < startDayOfWeek; i++) {
      html += '<div class="calendar-day other-month"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === now.getDate();
      const hasExperiments = this.experimentsData.some(exp => {
        const expDate = new Date(exp.experiment_date);
        return expDate.getDate() === day && expDate.getMonth() === month;
      });
      
      let className = 'calendar-day';
      if (isToday) className += ' today';
      if (hasExperiments) className += ' has-experiments';
      
      html += `<div class="${className}">${day}</div>`;
    }
    
    calendarEl.innerHTML = html;
  },
  
  // Calendar navigation
  prevCalendarMonth() {
    // Implementation for previous month
    this.renderExperimentCalendar();
  },
  
  nextCalendarMonth() {
    // Implementation for next month
    this.renderExperimentCalendar();
  },
  
  // Download weekly report
  downloadWeeklyReport() {
    this.showAlert('Weekly report download started...', 'success');
  },

  resetExpFilters() {
    document.getElementById('exp-start-date').value = '';
    document.getElementById('exp-end-date').value = '';
    document.getElementById('exp-search').value = '';
    document.getElementById('exp-type-filter').value = '';
    this.loadExperiments();
  },

  // Edit experiment - wrapper for showExperimentForm
  editExperiment(expId) {
    if (expId) {
      this.showExperimentForm(expId);
    } else {
      console.error('No experiment ID provided for editing');
    }
  },

  // Experiment Form
  async showExperimentForm(expId = null, mouseId = null) {
    this.currentExperimentId = expId;
    const form = document.getElementById('experiment-form');
    const title = document.getElementById('experiment-form-title');
    const breadcrumbTitle = document.getElementById('experiment-breadcrumb-title');
    
    form.reset();
    document.getElementById('experiment-id').value = '';
    
    // Reset medication list to single row
    this.resetMedicationList();
    
    // Load mice options for searchable dropdown
    const mouseDropdown = document.getElementById('exp-mouse-dropdown');
    const mouseSearchInput = document.getElementById('exp-mouse-search');
    const mouseIdInput = document.getElementById('exp-mouse-id');
    
    mouseDropdown.innerHTML = '';
    mouseSearchInput.value = '';
    mouseIdInput.value = '';
    
    try {
      const mice = await this.api('/mice?limit=1000&status=存活');
      this.miceOptions = mice.data;
      
      mice.data.forEach(mouse => {
        const item = document.createElement('div');
        item.className = 'select-dropdown-item';
        item.textContent = `${mouse.mouse_code} (${mouse.strain})`;
        item.onclick = () => {
          mouseSearchInput.value = `${mouse.mouse_code} (${mouse.strain})`;
          mouseIdInput.value = mouse.id;
          mouseDropdown.classList.remove('active');
        };
        mouseDropdown.appendChild(item);
      });
      
      if (mouseId) {
        const mouse = mice.data.find(m => m.id === parseInt(mouseId));
        if (mouse) {
          mouseSearchInput.value = `${mouse.mouse_code} (${mouse.strain})`;
          mouseIdInput.value = mouseId;
        }
      }
    } catch (e) {
      console.error('Failed to load mice options:', e);
    }

    // Set default date to today
    document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
    // Set default time
    document.getElementById('exp-time').value = '09:00';

    if (expId) {
      title.textContent = '编辑实验记录';
      if (breadcrumbTitle) breadcrumbTitle.textContent = '编辑记录';
      this.loadExperimentForEdit(expId);
    } else {
      title.textContent = '新建实验记录';
      if (breadcrumbTitle) breadcrumbTitle.textContent = '新建记录';
    }

    // Hide other pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-experiment-form').classList.remove('hidden');
  },

  // Reset medication list to single row
  resetMedicationList() {
    const list = document.getElementById('medication-list');
    if (list) {
      list.innerHTML = `
        <div class="medication-row">
          <div class="medication-field">
            <label class="field-label">药物名称</label>
            <input type="text" class="form-control" name="medication-name[]" placeholder="例如：氯胺酮">
          </div>
          <div class="medication-field">
            <label class="field-label">剂量</label>
            <input type="text" class="form-control" name="medication-dosage[]" placeholder="50">
          </div>
          <div class="medication-field">
            <label class="field-label">给药途径</label>
            <div class="searchable-select">
              <select class="form-control form-select" name="medication-route[]">
                <option value="Intraperitoneal (IP)">腹腔注射 (IP)</option>
                <option value="Subcutaneous (SC)">皮下注射 (SC)</option>
                <option value="Intravenous (IV)">静脉注射 (IV)</option>
                <option value="Oral (PO)">口服 (PO)</option>
              </select>
              <span class="select-arrow">🔽</span>
            </div>
          </div>
          <button type="button" class="remove-medication-btn" onclick="app.removeMedicationRow(this)">🗑️</button>
        </div>
      `;
    }
  },

  // Add new medication row
  addMedicationRow() {
    const list = document.getElementById('medication-list');
    const row = document.createElement('div');
    row.className = 'medication-row';
    row.innerHTML = `
      <div class="medication-field">
        <label class="field-label">药物名称</label>
        <input type="text" class="form-control" name="medication-name[]" placeholder="例如：氯胺酮">
      </div>
      <div class="medication-field">
        <label class="field-label">剂量</label>
        <input type="text" class="form-control" name="medication-dosage[]" placeholder="50">
      </div>
      <div class="medication-field">
        <label class="field-label">给药途径</label>
        <div class="searchable-select">
          <select class="form-control form-select" name="medication-route[]">
            <option value="Intraperitoneal (IP)">腹腔注射 (IP)</option>
            <option value="Subcutaneous (SC)">皮下注射 (SC)</option>
            <option value="Intravenous (IV)">静脉注射 (IV)</option>
            <option value="Oral (PO)">口服 (PO)</option>
          </select>
          <span class="select-arrow">🔽</span>
        </div>
      </div>
      <button type="button" class="remove-medication-btn" onclick="app.removeMedicationRow(this)">🗑️</button>
    `;
    list.appendChild(row);
  },

  // Remove medication row
  removeMedicationRow(btn) {
    const rows = document.querySelectorAll('.medication-row');
    if (rows.length > 1) {
      btn.closest('.medication-row').remove();
    } else {
      // Clear the fields instead of removing the last row
      const row = btn.closest('.medication-row');
      row.querySelectorAll('input').forEach(input => input.value = '');
      row.querySelector('select').selectedIndex = 0;
    }
  },

  async loadExperimentForEdit(expId) {
    try {
      const exp = await this.api(`/experiments/${expId}`);
      console.log('Loaded experiment data:', exp);
      console.log('Medications:', exp.medications);
      
      document.getElementById('experiment-id').value = exp.id;
      document.getElementById('exp-mouse-id').value = exp.mouse_id;
      
      // Set mouse search input
      const mouse = this.miceOptions?.find(m => m.id === exp.mouse_id);
      if (mouse) {
        document.getElementById('exp-mouse-search').value = `${mouse.mouse_code} (${mouse.strain})`;
      }
      
      document.getElementById('exp-date').value = exp.experiment_date;
      document.getElementById('exp-time').value = exp.experiment_time || '09:00';
      document.getElementById('exp-type').value = exp.experiment_type;
      document.getElementById('exp-weight').value = exp.weight || '';
      document.getElementById('exp-temp').value = exp.temperature || '';
      document.getElementById('exp-notes').value = exp.notes || exp.behavior_notes || '';
      
      // Load medications - always reset first
      const list = document.getElementById('medication-list');
      list.innerHTML = '';
      
      // Check if medications exist and have data
      let medications = exp.medications || [];
      
      // Fallback: if no medications array but has legacy fields, use them
      if (medications.length === 0 && (exp.medication || exp.dosage)) {
        medications = [{
          name: exp.medication || '',
          dosage: exp.dosage || '',
          route: exp.route || 'Intraperitoneal (IP)'
        }];
      }
      
      console.log('Final medications to display:', medications);
      
      if (medications.length > 0) {
        // Load existing medications
        medications.forEach((med, index) => {
          const row = document.createElement('div');
          row.className = 'medication-row';
          row.innerHTML = `
            <div class="medication-field">
              <label class="field-label">药物名称</label>
              <input type="text" class="form-control" name="medication-name[]" value="${med.name || ''}" placeholder="例如：氯胺酮">
            </div>
            <div class="medication-field">
              <label class="field-label">剂量</label>
              <input type="text" class="form-control" name="medication-dosage[]" value="${med.dosage || ''}" placeholder="50">
            </div>
            <div class="medication-field">
              <label class="field-label">给药途径</label>
              <div class="searchable-select">
                <select class="form-control form-select" name="medication-route[]">
                  <option value="Intraperitoneal (IP)" ${med.route === 'Intraperitoneal (IP)' ? 'selected' : ''}>腹腔注射 (IP)</option>
                  <option value="Subcutaneous (SC)" ${med.route === 'Subcutaneous (SC)' ? 'selected' : ''}>皮下注射 (SC)</option>
                  <option value="Intravenous (IV)" ${med.route === 'Intravenous (IV)' ? 'selected' : ''}>静脉注射 (IV)</option>
                  <option value="Oral (PO)" ${med.route === 'Oral (PO)' ? 'selected' : ''}>口服 (PO)</option>
                </select>
                <span class="select-arrow">🔽</span>
              </div>
            </div>
            <button type="button" class="remove-medication-btn" onclick="app.removeMedicationRow(this)">🗑️</button>
          `;
          list.appendChild(row);
        });
      } else {
        // Add empty medication row for new entries
        this.addMedicationRow();
      }
    } catch (e) {
      console.error('Failed to load experiment:', e);
    }
  },

  async saveExperiment(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const action = formData.get('action');
    
    // Collect medications
    const medications = [];
    const medNames = formData.getAll('medication-name[]');
    const medDosages = formData.getAll('medication-dosage[]');
    const medRoutes = formData.getAll('medication-route[]');
    
    for (let i = 0; i < medNames.length; i++) {
      if (medNames[i]) {
        medications.push({
          name: medNames[i],
          dosage: medDosages[i] || null,
          route: medRoutes[i] || null
        });
      }
    }
    
    const expData = {
      mouse_id: parseInt(document.getElementById('exp-mouse-id').value),
      experiment_date: document.getElementById('exp-date').value,
      experiment_time: document.getElementById('exp-time').value,
      experiment_type: document.getElementById('exp-type').value,
      weight: document.getElementById('exp-weight').value || null,
      temperature: document.getElementById('exp-temp').value || null,
      medications: medications.length > 0 ? medications : null,
      notes: document.getElementById('exp-notes').value || null
    };

    try {
      const id = document.getElementById('experiment-id').value;
      if (id) {
        await this.api(`/experiments/${id}`, {
          method: 'PUT',
          body: JSON.stringify(expData)
        });
        this.showAlert('实验记录更新成功！', 'success');
      } else {
        await this.api('/experiments', {
          method: 'POST',
          body: JSON.stringify(expData)
        });
        this.showAlert('实验记录添加成功！', 'success');
      }
      
      if (action === 'continue') {
        e.target.reset();
        document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('exp-mouse-id').value = expData.mouse_id;
      } else {
        this.navigate('experiments');
      }
    } catch (e) {
      console.error('Failed to save experiment:', e);
    }
  },

  updateBatchDeleteButton() {
    const checked = document.querySelectorAll('.exp-checkbox:checked');
    document.getElementById('batch-delete-btn').disabled = checked.length === 0;
  },

  async batchDeleteExperiments() {
    const checked = document.querySelectorAll('.exp-checkbox:checked');
    const ids = Array.from(checked).map(cb => parseInt(cb.value));
    
    if (ids.length === 0) return;
    
    this.showDeleteModal(`确定要删除选中的 ${ids.length} 条实验记录吗？`, async () => {
      try {
        await this.api('/experiments/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ ids })
        });
        this.showAlert('批量删除成功！', 'success');
        this.loadExperiments();
      } catch (e) {
        console.error('Failed to batch delete:', e);
      }
    });
  },

  // Statistics
  async loadStatistics() {
    try {
      // Overview stats
      const overview = await this.api('/stats/overview');
      document.getElementById('stats-total').textContent = overview.totalMice || 0;
      document.getElementById('stats-alive').textContent = overview.aliveMice || 0;
      document.getElementById('stats-dead').textContent = overview.deadMice || 0;
      document.getElementById('stats-month-exp').textContent = overview.monthExperiments || 0;

      // Strain distribution
      const strainData = await this.api('/stats/strain-distribution');
      this.renderPieChart('strain-chart', strainData, '品系分布');

      // Gender distribution
      const genderData = await this.api('/stats/gender-distribution');
      this.renderPieChart('gender-chart', genderData, '性别比例');

      // Experiment types
      const typeData = await this.api('/stats/experiment-types');
      this.renderBarChart('exp-type-chart', typeData, '实验类型分布');

      // Monthly trend
      const trendData = await this.api('/stats/monthly-trend');
      this.renderLineChart('monthly-chart', trendData, '月度实验趋势');
    } catch (e) {
      console.error('Failed to load statistics:', e);
    }
  },

  renderPieChart(canvasId, data, title) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];

    this.charts[canvasId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.map(d => d.strain || d.gender),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: colors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  },

  renderBarChart(canvasId, data, title) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.type),
        datasets: [{
          label: '次数',
          data: data.map(d => d.count),
          backgroundColor: '#2196F3'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
  },

  renderLineChart(canvasId, data, title) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [{
          label: '实验次数',
          data: data.map(d => d.count),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
  },

  // Export
  async loadExportMiceOptions() {
    try {
      const mice = await this.api('/mice?limit=1000');
      const select = document.getElementById('export-mice');
      select.innerHTML = mice.data.map(m => 
        `<option value="${m.id}">${m.mouse_code} (${m.strain})</option>`
      ).join('');
    } catch (e) {
      console.error('Failed to load export mice:', e);
    }
  },

  async exportData() {
    const dateRange = document.querySelector('input[name="date-range"]:checked')?.value;
    const mouseFilter = document.querySelector('input[name="mouse-filter"]:checked')?.value;
    const format = document.querySelector('input[name="export-format"]:checked')?.value;
    
    let startDate = '', endDate = '';
    if (dateRange === 'month') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    } else if (dateRange === 'custom') {
      startDate = document.getElementById('export-start-date')?.value;
      endDate = document.getElementById('export-end-date')?.value;
    }

    let mouseIds = [];
    if (mouseFilter === 'specific') {
      const select = document.getElementById('export-mice');
      mouseIds = Array.from(select.selectedOptions).map(o => parseInt(o.value));
    }

    const expTypes = Array.from(document.querySelectorAll('.exp-type-checkbox:checked')).map(cb => cb.value);

    const exportData = {
      start_date: startDate,
      end_date: endDate,
      mouse_ids: mouseIds,
      experiment_types: expTypes
    };

    try {
      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('content-disposition')?.split('filename="')[1]?.replace('"', '') || 
                   `export.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Add to history
      const record = {
        filename: a.download,
        format: format.toUpperCase(),
        count: 'N/A',
        time: new Date().toLocaleString('zh-CN')
      };
      this.exportHistory.unshift(record);
      if (this.exportHistory.length > 10) this.exportHistory.pop();
      localStorage.setItem('exportHistory', JSON.stringify(this.exportHistory));
      this.renderExportHistory();

      this.showAlert('导出成功！', 'success');
    } catch (e) {
      this.showAlert('导出失败：' + e.message, 'error');
    }
  },

  renderExportHistory() {
    const tbody = document.getElementById('export-history');
    if (this.exportHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">暂无导出记录</td></tr>';
      return;
    }

    tbody.innerHTML = this.exportHistory.map((record, i) => `
      <tr>
        <td>${record.filename}</td>
        <td>${record.format}</td>
        <td>${record.count}</td>
        <td>${record.time}</td>
        <td>-</td>
      </tr>
    `).join('');
  },

  // Delete confirmations
  confirmDeleteMouse(mouseId) {
    const mouse = this.miceData.find(m => m.id === mouseId);
    this.showDeleteModal(`确定要删除小鼠 ${mouse?.mouse_code || mouseId} 吗？此操作将同时删除该小鼠的所有实验记录，且不可恢复。`, async () => {
      try {
        await this.api(`/mice/${mouseId}`, { method: 'DELETE' });
        this.showAlert('小鼠删除成功！', 'success');
        this.loadMice();
      } catch (e) {
        console.error('Failed to delete mouse:', e);
      }
    });
  },

  confirmDeleteExperiment(expId) {
    this.showDeleteModal('确定要删除这条实验记录吗？此操作不可恢复。', async () => {
      try {
        await this.api(`/experiments/${expId}`, { method: 'DELETE' });
        this.showAlert('实验记录删除成功！', 'success');
        this.loadExperiments();
      } catch (e) {
        console.error('Failed to delete experiment:', e);
      }
    });
  },

  showDeleteModal(message, onConfirm) {
    document.getElementById('delete-message').textContent = message;
    const modal = document.getElementById('delete-modal');
    modal.classList.add('active');

    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.onclick = () => {
      this.closeModal();
      onConfirm();
    };
  },

  closeModal() {
    document.getElementById('delete-modal').classList.remove('active');
  },

  // Utilities
  renderPagination(containerId, pagination, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container || pagination.totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let html = `
      <button class="pagination-btn" onclick="${onPageChange.name}(${pagination.page - 1})" 
        ${pagination.page === 1 ? 'disabled' : ''}>←</button>
    `;

    for (let i = 1; i <= pagination.totalPages; i++) {
      if (i === 1 || i === pagination.totalPages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
        html += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" 
          onclick="${onPageChange.name}(${i})">${i}</button>`;
      } else if (i === pagination.page - 3 || i === pagination.page + 3) {
        html += '<span>...</span>';
      }
    }

    html += `
      <button class="pagination-btn" onclick="${onPageChange.name}(${pagination.page + 1})" 
        ${pagination.page === pagination.totalPages ? 'disabled' : ''}>→</button>
    `;

    html += `<span class="pagination-info">共 ${pagination.total} 条</span>`;

    container.innerHTML = html;
  },

  showAlert(message, type = 'success') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      ${type === 'success' ? '✅' : '❌'} ${message}
      <button class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(alert);

    setTimeout(() => alert.classList.add('show'), 10);
    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 300);
    }, 3000);
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
