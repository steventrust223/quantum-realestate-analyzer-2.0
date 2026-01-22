/**
 * Quantum Real Estate Analyzer v2.0
 * Main Application Module
 * Efficient, User-Friendly, Reliable
 */

// ============================================
// Data Store (LocalStorage-backed for demo)
// ============================================
const DataStore = {
  KEYS: {
    DEALS: 'qra_deals',
    PROPERTIES: 'qra_properties',
    BUYERS: 'qra_buyers',
    SETTINGS: 'qra_settings',
    ANALYTICS: 'qra_analytics'
  },

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('DataStore get error:', e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('DataStore set error:', e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    Object.values(this.KEYS).forEach(key => this.remove(key));
  }
};

// ============================================
// Sample Data Generator
// ============================================
const SampleData = {
  deals: [
    { id: 1, address: '123 Oak Street', city: 'Austin', state: 'TX', type: 'wholesale', status: 'active', arv: 285000, purchasePrice: 185000, assignmentFee: 15000, createdAt: '2025-01-15' },
    { id: 2, address: '456 Pine Avenue', city: 'Dallas', state: 'TX', type: 'sub2', status: 'active', arv: 320000, existingMortgage: 245000, monthlyPayment: 1850, createdAt: '2025-01-12' },
    { id: 3, address: '789 Maple Drive', city: 'Houston', state: 'TX', type: 'wholesale', status: 'pending', arv: 198000, purchasePrice: 125000, assignmentFee: 12000, createdAt: '2025-01-18' },
    { id: 4, address: '321 Cedar Lane', city: 'San Antonio', state: 'TX', type: 'sub2', status: 'active', arv: 275000, existingMortgage: 210000, monthlyPayment: 1650, createdAt: '2025-01-10' },
    { id: 5, address: '654 Elm Court', city: 'Austin', state: 'TX', type: 'wholesale', status: 'closed', arv: 245000, purchasePrice: 160000, assignmentFee: 18000, createdAt: '2025-01-05' },
  ],

  buyers: [
    { id: 1, name: 'John Smith', email: 'john@investor.com', phone: '512-555-0101', type: 'cash', maxBudget: 350000, areas: ['Austin', 'Round Rock'], active: true },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@realestate.com', phone: '214-555-0202', type: 'cash', maxBudget: 500000, areas: ['Dallas', 'Plano'], active: true },
    { id: 3, name: 'Mike Davis', email: 'mike@investments.com', phone: '713-555-0303', type: 'hard-money', maxBudget: 275000, areas: ['Houston'], active: true },
    { id: 4, name: 'Emily Chen', email: 'emily@buyhomes.com', phone: '210-555-0404', type: 'cash', maxBudget: 400000, areas: ['San Antonio'], active: true },
    { id: 5, name: 'Robert Wilson', email: 'robert@flipper.com', phone: '512-555-0505', type: 'cash', maxBudget: 300000, areas: ['Austin', 'Georgetown'], active: false },
  ],

  initialize() {
    if (!DataStore.get(DataStore.KEYS.DEALS)) {
      DataStore.set(DataStore.KEYS.DEALS, this.deals);
    }
    if (!DataStore.get(DataStore.KEYS.BUYERS)) {
      DataStore.set(DataStore.KEYS.BUYERS, this.buyers);
    }
  }
};

// ============================================
// Utility Functions
// ============================================
const Utils = {
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
  },

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  },

  formatPercent(value) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  calculateROI(profit, investment) {
    if (investment === 0) return 0;
    return ((profit / investment) * 100).toFixed(1);
  }
};

// ============================================
// Dashboard Analytics
// ============================================
const Analytics = {
  getStats() {
    const deals = DataStore.get(DataStore.KEYS.DEALS) || [];
    const buyers = DataStore.get(DataStore.KEYS.BUYERS) || [];

    const activeDeals = deals.filter(d => d.status === 'active').length;
    const pendingDeals = deals.filter(d => d.status === 'pending').length;
    const closedDeals = deals.filter(d => d.status === 'closed').length;

    const wholesaleDeals = deals.filter(d => d.type === 'wholesale').length;
    const sub2Deals = deals.filter(d => d.type === 'sub2').length;

    const totalRevenue = deals
      .filter(d => d.status === 'closed' && d.assignmentFee)
      .reduce((sum, d) => sum + d.assignmentFee, 0);

    const activeBuyers = buyers.filter(b => b.active).length;
    const propertiesAnalyzed = deals.length;

    return {
      activeDeals,
      pendingDeals,
      closedDeals,
      wholesaleDeals,
      sub2Deals,
      totalRevenue,
      activeBuyers,
      propertiesAnalyzed,
      totalBuyers: buyers.length
    };
  },

  getRecentActivity() {
    const deals = DataStore.get(DataStore.KEYS.DEALS) || [];
    return deals
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(deal => ({
        type: deal.type,
        title: `${deal.type === 'wholesale' ? 'Wholesale' : 'Sub2'} deal: ${deal.address}`,
        status: deal.status,
        time: Utils.formatDate(deal.createdAt)
      }));
  }
};

// ============================================
// Property Analyzer Calculator
// ============================================
const PropertyAnalyzer = {
  calculateWholesale(data) {
    const {
      arv,
      repairCosts,
      purchasePrice,
      closingCosts = 0,
      holdingCosts = 0,
      desiredProfit = 0.15 // Default 15% profit margin for buyer
    } = data;

    // Maximum Allowable Offer (MAO) = ARV × 70% - Repairs - Wholesale Fee
    const mao70 = (arv * 0.70) - repairCosts;
    const mao75 = (arv * 0.75) - repairCosts;

    // Potential assignment fee
    const assignmentFee = mao70 - purchasePrice;

    // Buyer's potential profit
    const buyerInvestment = purchasePrice + repairCosts + closingCosts + holdingCosts;
    const buyerProfit = arv - buyerInvestment;
    const buyerROI = Utils.calculateROI(buyerProfit, buyerInvestment);

    // Deal score (1-10)
    const profitMargin = (assignmentFee / purchasePrice) * 100;
    let dealScore = Math.min(10, Math.max(1, Math.round(profitMargin / 5)));

    return {
      arv,
      repairCosts,
      purchasePrice,
      mao70: Math.round(mao70),
      mao75: Math.round(mao75),
      assignmentFee: Math.round(assignmentFee),
      buyerProfit: Math.round(buyerProfit),
      buyerROI,
      dealScore,
      recommendation: assignmentFee >= 10000 ? 'PURSUE' : assignmentFee >= 5000 ? 'NEGOTIATE' : 'PASS'
    };
  },

  calculateSub2(data) {
    const {
      arv,
      existingMortgage,
      monthlyPayment,
      interestRate,
      remainingYears,
      fairMarketRent,
      repairCosts = 0
    } = data;

    // Equity position
    const equity = arv - existingMortgage;
    const equityPercent = ((equity / arv) * 100).toFixed(1);

    // Monthly cash flow
    const monthlyCashFlow = fairMarketRent - monthlyPayment;
    const annualCashFlow = monthlyCashFlow * 12;

    // Cash on cash return (assuming minimal down payment)
    const cashOnCash = repairCosts > 0 ?
      ((annualCashFlow / repairCosts) * 100).toFixed(1) : 'N/A';

    // Deal viability score
    let dealScore = 5;
    if (monthlyCashFlow >= 500) dealScore += 2;
    else if (monthlyCashFlow >= 300) dealScore += 1;
    if (equity >= 50000) dealScore += 2;
    else if (equity >= 25000) dealScore += 1;
    dealScore = Math.min(10, dealScore);

    return {
      arv,
      existingMortgage,
      monthlyPayment,
      equity: Math.round(equity),
      equityPercent,
      fairMarketRent,
      monthlyCashFlow: Math.round(monthlyCashFlow),
      annualCashFlow: Math.round(annualCashFlow),
      cashOnCash,
      dealScore,
      recommendation: monthlyCashFlow >= 300 && equity >= 25000 ? 'PURSUE' :
                     monthlyCashFlow >= 200 && equity >= 15000 ? 'NEGOTIATE' : 'PASS'
    };
  }
};

// ============================================
// Deal Calculator (Workbook)
// ============================================
const DealCalculator = {
  // Wholesale deal quick calculator
  quickWholesaleCalc(arv, repairCosts) {
    return {
      mao70: Math.round((arv * 0.70) - repairCosts),
      mao75: Math.round((arv * 0.75) - repairCosts),
      mao80: Math.round((arv * 0.80) - repairCosts)
    };
  },

  // Monthly payment calculator
  calculateMortgagePayment(principal, annualRate, years) {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;

    if (monthlyRate === 0) return principal / numPayments;

    const payment = principal *
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    return Math.round(payment * 100) / 100;
  },

  // Cash flow analysis
  calculateCashFlow(rent, mortgage, taxes, insurance, maintenance, vacancy = 0.08) {
    const grossRent = rent;
    const effectiveRent = grossRent * (1 - vacancy);
    const totalExpenses = mortgage + taxes + insurance + maintenance;
    const netCashFlow = effectiveRent - totalExpenses;

    return {
      grossRent,
      effectiveRent: Math.round(effectiveRent),
      totalExpenses: Math.round(totalExpenses),
      netCashFlow: Math.round(netCashFlow),
      annualCashFlow: Math.round(netCashFlow * 12)
    };
  },

  // Comps analysis
  analyzeComps(comps) {
    if (!comps || comps.length === 0) return null;

    const prices = comps.map(c => c.soldPrice);
    const pricePerSqFt = comps.map(c => c.soldPrice / c.sqft);

    return {
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      medianPrice: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
      highPrice: Math.max(...prices),
      lowPrice: Math.min(...prices),
      avgPricePerSqFt: Math.round(pricePerSqFt.reduce((a, b) => a + b, 0) / pricePerSqFt.length),
      compCount: comps.length
    };
  }
};

// ============================================
// UI Components
// ============================================
const UI = {
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">&times;</button>
    `;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('active');
    });
    document.body.style.overflow = '';
  },

  renderStats(stats) {
    const elements = {
      'stat-active-deals': stats.activeDeals,
      'stat-revenue': Utils.formatCurrency(stats.totalRevenue),
      'stat-properties': stats.propertiesAnalyzed,
      'stat-buyers': stats.activeBuyers
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  },

  renderDealsTable(deals) {
    const tbody = document.getElementById('deals-table-body');
    if (!tbody) return;

    tbody.innerHTML = deals.map(deal => `
      <tr data-id="${deal.id}">
        <td>
          <div style="font-weight: 500">${deal.address}</div>
          <div style="font-size: 0.8em; color: var(--gray-500)">${deal.city}, ${deal.state}</div>
        </td>
        <td><span class="badge badge-${deal.type === 'wholesale' ? 'primary' : 'info'}">${deal.type}</span></td>
        <td><span class="badge badge-${deal.status === 'active' ? 'success' : deal.status === 'pending' ? 'warning' : 'info'}">${deal.status}</span></td>
        <td>${Utils.formatCurrency(deal.arv)}</td>
        <td>${deal.assignmentFee ? Utils.formatCurrency(deal.assignmentFee) : '-'}</td>
        <td>${Utils.formatDate(deal.createdAt)}</td>
      </tr>
    `).join('');
  },

  renderActivity(activities) {
    const container = document.getElementById('activity-feed');
    if (!container) return;

    container.innerHTML = activities.map(activity => `
      <li class="activity-item">
        <div class="activity-icon ${activity.type === 'wholesale' ? 'stat-icon primary' : 'stat-icon info'}">
          ${activity.type === 'wholesale' ? '📋' : '🏠'}
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-time">${activity.time} • <span class="badge badge-${activity.status === 'active' ? 'success' : activity.status === 'pending' ? 'warning' : 'info'}">${activity.status}</span></div>
        </div>
      </li>
    `).join('');
  }
};

// ============================================
// App Controller
// ============================================
const App = {
  currentPage: 'dashboard',

  init() {
    // Initialize sample data
    SampleData.initialize();

    // Set up event listeners
    this.setupEventListeners();

    // Load initial dashboard
    this.loadDashboard();

    // Set up auto-refresh
    setInterval(() => this.refreshStats(), 30000);

    console.log('🏡 Quantum Real Estate Analyzer v2.0 initialized');
  },

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page;
        if (page) this.navigateTo(page);
      });
    });

    // Modal close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) UI.closeAllModals();
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') UI.closeAllModals();
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.search-box input')?.focus();
      }
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
  },

  navigateTo(page) {
    this.currentPage = page;

    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });

    // Show appropriate content
    document.querySelectorAll('.page-content').forEach(content => {
      content.classList.toggle('hidden', content.id !== `${page}-page`);
    });

    // Load page-specific data
    switch (page) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'analyzer':
        this.loadAnalyzer();
        break;
      case 'deals':
        this.loadDeals();
        break;
      case 'calculator':
        this.loadCalculator();
        break;
      case 'buyers':
        this.loadBuyers();
        break;
    }
  },

  loadDashboard() {
    const stats = Analytics.getStats();
    UI.renderStats(stats);

    const deals = DataStore.get(DataStore.KEYS.DEALS) || [];
    UI.renderDealsTable(deals.slice(0, 5));

    const activities = Analytics.getRecentActivity();
    UI.renderActivity(activities);
  },

  loadAnalyzer() {
    // Analyzer page is interactive, no pre-loading needed
  },

  loadDeals() {
    const deals = DataStore.get(DataStore.KEYS.DEALS) || [];
    UI.renderDealsTable(deals);
  },

  loadCalculator() {
    // Calculator is interactive
  },

  loadBuyers() {
    const buyers = DataStore.get(DataStore.KEYS.BUYERS) || [];
    this.renderBuyersTable(buyers);
  },

  renderBuyersTable(buyers) {
    const tbody = document.getElementById('buyers-table-body');
    if (!tbody) return;

    tbody.innerHTML = buyers.map(buyer => `
      <tr data-id="${buyer.id}">
        <td>
          <div style="font-weight: 500">${buyer.name}</div>
          <div style="font-size: 0.8em; color: var(--gray-500)">${buyer.email}</div>
        </td>
        <td>${buyer.phone}</td>
        <td><span class="badge badge-${buyer.type === 'cash' ? 'success' : 'warning'}">${buyer.type}</span></td>
        <td>${Utils.formatCurrency(buyer.maxBudget)}</td>
        <td>${buyer.areas.join(', ')}</td>
        <td><span class="badge badge-${buyer.active ? 'success' : 'danger'}">${buyer.active ? 'Active' : 'Inactive'}</span></td>
      </tr>
    `).join('');
  },

  refreshStats() {
    if (this.currentPage === 'dashboard') {
      this.loadDashboard();
    }
  },

  // Property Analysis Functions
  analyzeWholesale() {
    const form = document.getElementById('wholesale-form');
    if (!form) return;

    const data = {
      arv: parseFloat(form.querySelector('[name="arv"]')?.value) || 0,
      repairCosts: parseFloat(form.querySelector('[name="repairs"]')?.value) || 0,
      purchasePrice: parseFloat(form.querySelector('[name="purchase"]')?.value) || 0,
      closingCosts: parseFloat(form.querySelector('[name="closing"]')?.value) || 0,
      holdingCosts: parseFloat(form.querySelector('[name="holding"]')?.value) || 0
    };

    const results = PropertyAnalyzer.calculateWholesale(data);
    this.displayAnalysisResults('wholesale', results);
  },

  analyzeSub2() {
    const form = document.getElementById('sub2-form');
    if (!form) return;

    const data = {
      arv: parseFloat(form.querySelector('[name="arv"]')?.value) || 0,
      existingMortgage: parseFloat(form.querySelector('[name="mortgage"]')?.value) || 0,
      monthlyPayment: parseFloat(form.querySelector('[name="payment"]')?.value) || 0,
      interestRate: parseFloat(form.querySelector('[name="rate"]')?.value) || 0,
      remainingYears: parseFloat(form.querySelector('[name="years"]')?.value) || 0,
      fairMarketRent: parseFloat(form.querySelector('[name="rent"]')?.value) || 0,
      repairCosts: parseFloat(form.querySelector('[name="repairs"]')?.value) || 0
    };

    const results = PropertyAnalyzer.calculateSub2(data);
    this.displayAnalysisResults('sub2', results);
  },

  displayAnalysisResults(type, results) {
    const container = document.getElementById(`${type}-results`);
    if (!container) return;

    const recClass = results.recommendation === 'PURSUE' ? 'success' :
                     results.recommendation === 'NEGOTIATE' ? 'warning' : 'danger';

    if (type === 'wholesale') {
      container.innerHTML = `
        <div class="results-grid">
          <div class="result-item">
            <span class="result-label">MAO (70%)</span>
            <span class="result-value">${Utils.formatCurrency(results.mao70)}</span>
          </div>
          <div class="result-item">
            <span class="result-label">MAO (75%)</span>
            <span class="result-value">${Utils.formatCurrency(results.mao75)}</span>
          </div>
          <div class="result-item">
            <span class="result-label">Assignment Fee</span>
            <span class="result-value text-${results.assignmentFee > 0 ? 'success' : 'danger'}">${Utils.formatCurrency(results.assignmentFee)}</span>
          </div>
          <div class="result-item">
            <span class="result-label">Buyer's Profit</span>
            <span class="result-value">${Utils.formatCurrency(results.buyerProfit)}</span>
          </div>
          <div class="result-item">
            <span class="result-label">Buyer's ROI</span>
            <span class="result-value">${results.buyerROI}%</span>
          </div>
          <div class="result-item">
            <span class="result-label">Deal Score</span>
            <span class="result-value">${results.dealScore}/10</span>
          </div>
        </div>
        <div class="recommendation badge-${recClass}">
          <strong>Recommendation: ${results.recommendation}</strong>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="results-grid">
          <div class="result-item">
            <span class="result-label">Equity Position</span>
            <span class="result-value">${Utils.formatCurrency(results.equity)} (${results.equityPercent}%)</span>
          </div>
          <div class="result-item">
            <span class="result-label">Monthly Cash Flow</span>
            <span class="result-value text-${results.monthlyCashFlow > 0 ? 'success' : 'danger'}">${Utils.formatCurrency(results.monthlyCashFlow)}</span>
          </div>
          <div class="result-item">
            <span class="result-label">Annual Cash Flow</span>
            <span class="result-value">${Utils.formatCurrency(results.annualCashFlow)}</span>
          </div>
          <div class="result-item">
            <span class="result-label">Cash on Cash Return</span>
            <span class="result-value">${results.cashOnCash}%</span>
          </div>
          <div class="result-item">
            <span class="result-label">Deal Score</span>
            <span class="result-value">${results.dealScore}/10</span>
          </div>
        </div>
        <div class="recommendation badge-${recClass}">
          <strong>Recommendation: ${results.recommendation}</strong>
        </div>
      `;
    }

    container.classList.remove('hidden');
  },

  // Quick Calculator Functions
  quickMAO() {
    const arv = parseFloat(document.getElementById('quick-arv')?.value) || 0;
    const repairs = parseFloat(document.getElementById('quick-repairs')?.value) || 0;

    const results = DealCalculator.quickWholesaleCalc(arv, repairs);

    document.getElementById('quick-results').innerHTML = `
      <div class="quick-result"><span>MAO @ 70%:</span> <strong>${Utils.formatCurrency(results.mao70)}</strong></div>
      <div class="quick-result"><span>MAO @ 75%:</span> <strong>${Utils.formatCurrency(results.mao75)}</strong></div>
      <div class="quick-result"><span>MAO @ 80%:</span> <strong>${Utils.formatCurrency(results.mao80)}</strong></div>
    `;
  },

  calculatePayment() {
    const principal = parseFloat(document.getElementById('calc-principal')?.value) || 0;
    const rate = parseFloat(document.getElementById('calc-rate')?.value) || 0;
    const years = parseFloat(document.getElementById('calc-years')?.value) || 0;

    const payment = DealCalculator.calculateMortgagePayment(principal, rate, years);

    document.getElementById('payment-result').textContent = Utils.formatCurrency(payment) + '/month';
  },

  // Data Management
  addDeal(dealData) {
    const deals = DataStore.get(DataStore.KEYS.DEALS) || [];
    const newDeal = {
      ...dealData,
      id: Utils.generateId(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    deals.unshift(newDeal);
    DataStore.set(DataStore.KEYS.DEALS, deals);
    UI.showNotification('Deal added successfully!');
    this.loadDeals();
    return newDeal;
  },

  addBuyer(buyerData) {
    const buyers = DataStore.get(DataStore.KEYS.BUYERS) || [];
    const newBuyer = {
      ...buyerData,
      id: Utils.generateId(),
      active: true
    };
    buyers.unshift(newBuyer);
    DataStore.set(DataStore.KEYS.BUYERS, buyers);
    UI.showNotification('Buyer added successfully!');
    this.loadBuyers();
    return newBuyer;
  },

  exportData() {
    const data = {
      deals: DataStore.get(DataStore.KEYS.DEALS),
      buyers: DataStore.get(DataStore.KEYS.BUYERS),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum-realestate-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    UI.showNotification('Data exported successfully!');
  },

  resetDemo() {
    if (confirm('This will reset all data to demo values. Continue?')) {
      DataStore.clear();
      SampleData.initialize();
      this.loadDashboard();
      UI.showNotification('Demo data restored!');
    }
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Export for use in HTML
window.App = App;
window.Utils = Utils;
window.UI = UI;
window.PropertyAnalyzer = PropertyAnalyzer;
window.DealCalculator = DealCalculator;
