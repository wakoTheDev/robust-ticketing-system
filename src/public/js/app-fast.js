/**
 * RobustTicketing - Fast Loading Application
 * Optimized version for faster initial load
 */

class FastRobustTicketingApp {
  constructor() {
    this.initialized = false;
    this.user = null;
    this.config = {
      debug: true,
      apiTimeout: 10000, // Reduced timeout
      maxFileSize: 10 * 1024 * 1024
    };
    
    // Skip heavy initialization for speed
    this.componentManager = null;
    this.router = null;
  }

  // Fast initialization - only load essentials
  async init() {
    if (this.initialized) return;

    try {
      console.log('Fast initializing RobustTicketing Application...');
      
      // Hide loading overlay quickly
      this.hideLoadingOverlay();
      
      // Setup minimal error handling
      this.setupMinimalErrorHandling();
      
      // Load basic content immediately
      this.loadBasicContent();
      
      // Initialize homepage functionality
      this.initializeHomepage();
      
      // Mark as initialized
      this.initialized = true;
      console.log('RobustTicketing Application fast-loaded successfully');
      
      // Load remaining features in background
      this.loadRemainingFeatures();
      
    } catch (error) {
      console.error('Fast initialization failed:', error);
      this.showError('Application failed to load. Please refresh the page.');
    }
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 300);
    }
    
    const loadingContent = document.querySelector('.loading-content');
    if (loadingContent) {
      loadingContent.style.display = 'none';
    }
  }

  setupMinimalErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });
  }

  loadBasicContent() {
    const appContent = document.getElementById('app-content');
    if (appContent) {
      appContent.innerHTML = `
        <div class="hero-section">
          <div class="container">
            <div class="hero-content">
              <h1 class="hero-title">Welcome to RobustTicketing</h1>
              <p class="hero-subtitle">Discover amazing events near you</p>
              <div class="hero-actions">
                <button class="btn btn-primary" onclick="app.showEvents()">Browse Events</button>
                <button class="btn btn-outline" onclick="app.showLogin()">Sign In</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="quick-stats">
          <div class="container">
            <div class="stats-grid">
              <div class="stat-item">
                <h3>1000+</h3>
                <p>Events Listed</p>
              </div>
              <div class="stat-item">
                <h3>50,000+</h3>
                <p>Tickets Sold</p>
              </div>
              <div class="stat-item">
                <h3>10,000+</h3>
                <p>Happy Customers</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  async loadRemainingFeatures() {
    // Load features gradually to avoid blocking
    setTimeout(async () => {
      try {
        console.log('Loading advanced features...');
        
        // Import full app functionality
        if (typeof ComponentManager === 'undefined') {
          await this.loadScript('/static/js/components.js');
        }
        
        if (typeof router === 'undefined') {
          await this.loadScript('/static/js/router.js');
        }
        
        // Initialize advanced features
        this.setupAdvancedFeatures();
        
      } catch (error) {
        console.warn('Failed to load advanced features:', error);
      }
    }, 1000); // Delay to ensure fast initial load
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  setupAdvancedFeatures() {
    // Setup features only when needed
    this.setupNavigation();
    this.setupSearch();
    this.setupUserMenu();
  }

  setupNavigation() {
    // Basic navigation without router
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        this.navigate(href);
      });
    });
  }

  setupSearch() {
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        // Simple search without heavy processing
        this.simpleSearch(e.target.value);
      });
    });
  }

  setupUserMenu() {
    const userBtn = document.querySelector('.user-btn');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (userBtn && userDropdown) {
      userBtn.addEventListener('click', () => {
        userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
      });
    }
  }

  navigate(path) {
    console.log('Navigating to:', path);
    // Simple navigation without full router
    const appContent = document.getElementById('app-content');
    
    switch (path) {
      case '/events':
        this.showEvents();
        break;
      case '/create-event':
        this.showCreateEvent();
        break;
      case '/about':
        this.showAbout();
        break;
      default:
        this.loadBasicContent();
    }
  }

  showEvents() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
      <div class="page-header">
        <div class="container">
          <h1>Browse Events</h1>
          <p>Discover exciting events happening near you</p>
        </div>
      </div>
      <div class="container">
        <div class="events-grid">
          <div class="event-card">
            <h3>Sample Event 1</h3>
            <p>Coming soon...</p>
          </div>
          <div class="event-card">
            <h3>Sample Event 2</h3>
            <p>Coming soon...</p>
          </div>
        </div>
      </div>
    `;
  }

  showCreateEvent() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
      <div class="page-header">
        <div class="container">
          <h1>Create Event</h1>
          <p>Share your event with the world</p>
        </div>
      </div>
      <div class="container">
        <div class="form-container">
          <p>Event creation form coming soon...</p>
        </div>
      </div>
    `;
  }

  showAbout() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
      <div class="page-header">
        <div class="container">
          <h1>About RobustTicketing</h1>
          <p>The future of event ticketing</p>
        </div>
      </div>
      <div class="container">
        <div class="about-content">
          <p>RobustTicketing is a modern, secure event ticketing platform designed for the future.</p>
        </div>
      </div>
    `;
  }

  showLogin() {
    // Simple login modal
    alert('Login functionality coming soon!');
  }

  simpleSearch(query) {
    if (query.length > 2) {
      console.log('Searching for:', query);
      // Implement simple search without heavy API calls
    }
  }

  showError(message) {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
      <div class="error-message">
        <h2>Oops! Something went wrong</h2>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
      </div>
    `;
  }

  // Initialize homepage functionality
  initializeHomepage() {
    // Load events immediately
    this.loadEvents();
    
    // Setup search functionality
    this.setupEventSearch();
    
    // Setup auto-refresh
    this.setupAutoRefresh();
    
    // Setup service modal
    this.setupServiceModal();
    
    // Setup mobile menu
    this.setupMobileMenu();
  }

  // Check system status
  async checkSystemStatus() {
    try {
      const response = await fetch('/health');
      const status = response.ok ? 'Operational' : 'Issues Detected';
      const statusElement = document.getElementById('api-status');
      if (statusElement) {
        statusElement.textContent = status;
        statusElement.parentElement.previousElementSibling.className = 
          response.ok ? 'status-indicator status-online' : 'status-indicator status-error';
      }
    } catch (error) {
      const statusElement = document.getElementById('api-status');
      if (statusElement) {
        statusElement.textContent = 'Connection Error';
        statusElement.parentElement.previousElementSibling.className = 'status-indicator status-error';
      }
    }
  }

  // Setup service card interactions
  setupServiceCards() {
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
      card.addEventListener('click', () => {
        const service = card.dataset.service;
        if (service) {
          this.navigateToService(service);
        }
      });
    });
  }

  // Setup quick actions
  setupQuickActions() {
    // Quick actions are handled by onclick attributes in HTML
  }

  // Navigate to a specific service
  navigateToService(service) {
    console.log(`Navigating to service: ${service}`);
    
    // Hide homepage content and show service content
    const heroSection = document.querySelector('.hero');
    const servicesSection = document.querySelector('.services');
    const quickActionsSection = document.querySelector('.quick-actions');
    const systemStatusSection = document.querySelector('.system-status');
    const appContent = document.getElementById('app-content');

    if (heroSection) heroSection.style.display = 'none';
    if (servicesSection) servicesSection.style.display = 'none';
    if (quickActionsSection) quickActionsSection.style.display = 'none';
    if (systemStatusSection) systemStatusSection.style.display = 'none';
    if (appContent) appContent.style.display = 'block';

    // Load service-specific content
    this.loadServiceContent(service);
  }

  // Show homepage content
  showHomepage() {
    const heroSection = document.querySelector('.hero');
    const servicesSection = document.querySelector('.services');
    const quickActionsSection = document.querySelector('.quick-actions');
    const systemStatusSection = document.querySelector('.system-status');
    const appContent = document.getElementById('app-content');

    if (heroSection) heroSection.style.display = 'block';
    if (servicesSection) servicesSection.style.display = 'block';
    if (quickActionsSection) quickActionsSection.style.display = 'block';
    if (systemStatusSection) systemStatusSection.style.display = 'block';
    if (appContent) appContent.style.display = 'none';
  }

  // Load content for a specific service
  async loadServiceContent(service) {
    const appContent = document.getElementById('app-content');
    const serviceConfigs = {
      events: {
        title: 'Event Management',
        description: 'Create, manage, and promote your events',
        endpoint: '/api/events'
      },
      tickets: {
        title: 'Ticket Management',
        description: 'Advanced ticketing system with QR codes and blockchain verification',
        endpoint: '/api/tickets'
      },
      users: {
        title: 'User Management',
        description: 'Manage user profiles and authentication',
        endpoint: '/api/users'
      },
      payments: {
        title: 'Payment Processing',
        description: 'Secure payment processing and financial reporting',
        endpoint: '/api/payments'
      },
      analytics: {
        title: 'Analytics & Reports',
        description: 'Detailed analytics and business intelligence',
        endpoint: '/api/analytics'
      },
      api: {
        title: 'API Documentation',
        description: 'RESTful APIs and integrations',
        endpoint: '/api/docs'
      }
    };

    const config = serviceConfigs[service];
    if (!config) {
      this.showError(`Service '${service}' not found`);
      return;
    }

    // Show loading state
    appContent.innerHTML = `
      <div class="service-page">
        <div class="service-header">
          <div class="container">
            <button class="back-btn" onclick="app.showHomepage()">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Back to Home
            </button>
            <h1>${config.title}</h1>
            <p>${config.description}</p>
          </div>
        </div>
        <div class="container">
          <div class="loading-content">
            <div class="spinner"></div>
            <p>Loading ${config.title.toLowerCase()}...</p>
          </div>
        </div>
      </div>
    `;

    try {
      // Try to load service data
      const response = await fetch(config.endpoint);
      let data = {};
      
      if (response.ok) {
        data = await response.json();
      }

      // Load service-specific content
      this.renderServicePage(service, config, data);
    } catch (error) {
      console.error(`Error loading ${service}:`, error);
      this.renderServicePage(service, config, { error: error.message });
    }
  }

  // Render service page content
  renderServicePage(service, config, data) {
    const appContent = document.getElementById('app-content');
    
    const hasError = data.error;
    const isEmpty = !hasError && (!data.data || (Array.isArray(data.data) && data.data.length === 0));

    let content = `
      <div class="service-page">
        <div class="service-header">
          <div class="container">
            <button class="back-btn" onclick="app.showHomepage()">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Back to Home
            </button>
            <h1>${config.title}</h1>
            <p>${config.description}</p>
          </div>
        </div>
        <div class="container">
    `;

    if (hasError) {
      content += `
        <div class="error-state">
          <h3>Unable to load ${config.title.toLowerCase()}</h3>
          <p>Error: ${data.error}</p>
          <button class="btn btn-primary" onclick="app.loadServiceContent('${service}')">Try Again</button>
        </div>
      `;
    } else if (isEmpty) {
      content += `
        <div class="empty-state">
          <h3>No ${service} found</h3>
          <p>Get started by creating your first ${service.slice(0, -1)}.</p>
          <button class="btn btn-primary" onclick="app.createNew('${service}')">Create ${service.slice(0, -1)}</button>
        </div>
      `;
    } else {
      content += this.renderServiceData(service, data);
    }

    content += `
        </div>
      </div>
    `;

    appContent.innerHTML = content;
  }

  // Render service-specific data
  renderServiceData(service, data) {
    switch (service) {
      case 'events':
        return this.renderEventsData(data);
      case 'tickets':
        return this.renderTicketsData(data);
      case 'users':
        return this.renderUsersData(data);
      case 'payments':
        return this.renderPaymentsData(data);
      case 'analytics':
        return this.renderAnalyticsData(data);
      case 'api':
        return this.renderApiData(data);
      default:
        return `<div class="service-content"><pre>${JSON.stringify(data, null, 2)}</pre></div>`;
    }
  }

  // Service-specific rendering methods
  renderEventsData(data) {
    return `
      <div class="service-content">
        <div class="service-actions">
          <button class="btn btn-primary" onclick="app.createNew('event')">Create Event</button>
          <button class="btn btn-outline" onclick="app.refreshService('events')">Refresh</button>
        </div>
        <div class="data-display">
          <h3>Events Data</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    `;
  }

  renderTicketsData(data) {
    return `
      <div class="service-content">
        <div class="service-actions">
          <button class="btn btn-primary" onclick="app.createNew('ticket')">Generate Ticket</button>
          <button class="btn btn-outline" onclick="app.refreshService('tickets')">Refresh</button>
        </div>
        <div class="data-display">
          <h3>Tickets Data</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    `;
  }

  renderUsersData(data) {
    return `
      <div class="service-content">
        <div class="service-actions">
          <button class="btn btn-primary" onclick="app.showAuthModal('register')">Add User</button>
          <button class="btn btn-outline" onclick="app.refreshService('users')">Refresh</button>
        </div>
        <div class="data-display">
          <h3>Users Data</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    `;
  }

  renderPaymentsData(data) {
    return `
      <div class="service-content">
        <div class="service-actions">
          <button class="btn btn-outline" onclick="app.refreshService('payments')">Refresh</button>
        </div>
        <div class="data-display">
          <h3>Payments Data</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    `;
  }

  renderAnalyticsData(data) {
    return `
      <div class="service-content">
        <div class="service-actions">
          <button class="btn btn-outline" onclick="app.refreshService('analytics')">Refresh</button>
        </div>
        <div class="data-display">
          <h3>Analytics Data</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    `;
  }

  renderApiData(data) {
    return `
      <div class="service-content">
        <div class="api-documentation">
          <h3>API Endpoints</h3>
          <div class="endpoint-list">
            <div class="endpoint-item">
              <span class="method get">GET</span>
              <span class="path">/api/events</span>
              <span class="description">List all events</span>
            </div>
            <div class="endpoint-item">
              <span class="method post">POST</span>
              <span class="path">/api/events</span>
              <span class="description">Create new event</span>
            </div>
            <div class="endpoint-item">
              <span class="method get">GET</span>
              <span class="path">/api/tickets</span>
              <span class="description">List tickets</span>
            </div>
            <div class="endpoint-item">
              <span class="method post">POST</span>
              <span class="path">/api/auth/register</span>
              <span class="description">Register user</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Quick action handlers
  quickAction(action) {
    console.log(`Quick action: ${action}`);
    
    switch (action) {
      case 'create-event':
        this.navigateToService('events');
        break;
      case 'search-events':
        this.focusSearch();
        break;
      case 'my-tickets':
        this.navigateToService('tickets');
        break;
      case 'support':
        this.showSupport();
        break;
      default:
        console.log('Unknown quick action:', action);
    }
  }

  // Additional helper methods
  showEvents() {
    this.navigateToService('events');
  }

  showAuthModal(type) {
    alert(`${type} functionality will be implemented soon!`);
  }

  createNew(type) {
    alert(`Create ${type} functionality will be implemented soon!`);
  }

  refreshService(service) {
    this.loadServiceContent(service);
  }

  focusSearch() {
    const searchInput = document.getElementById('header-search');
    if (searchInput) {
      searchInput.focus();
    }
  }

  showSupport() {
    alert('Support system will be implemented soon!');
  }

  // Event Management Methods
  async loadEvents() {
    try {
      this.showEventsLoading();
      
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        this.displayEvents(data.data || data);
        this.updateLastRefreshed();
      } else {
        throw new Error('Failed to load events');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      this.showNoEvents('Failed to load events. Please try again.');
    }
  }

  displayEvents(events) {
    const eventsGrid = document.getElementById('events-grid');
    const eventsLoading = document.getElementById('events-loading');
    const noEvents = document.getElementById('no-events');

    eventsLoading.style.display = 'none';
    noEvents.style.display = 'none';

    if (!events || events.length === 0) {
      this.showNoEvents('No events found.');
      return;
    }

    eventsGrid.style.display = 'grid';
    eventsGrid.innerHTML = events.map(event => this.createEventCard(event)).join('');
  }

  createEventCard(event) {
    const eventDate = new Date(event.start_datetime);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    // Get price range (you might need to adjust this based on your data structure)
    const priceText = event.price_min ? `From $${event.price_min}` : 'Free';

    return `
      <div class="event-card" onclick="app.openEventDetails('${event.id}')">
        <div class="event-image" style="background-image: url('${event.featured_image || '/static/images/default-event.jpg'}')">
          <div class="event-category">${event.category}</div>
          <div class="event-price">${priceText}</div>
        </div>
        <div class="event-content">
          <h3 class="event-title">${event.title}</h3>
          <div class="event-date-location">
            <div class="event-date">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span>${formattedDate} at ${formattedTime}</span>
            </div>
            <div class="event-location">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>${event.venue_name}, ${event.venue_city}</span>
            </div>
          </div>
          <p class="event-description">${event.short_description || event.description || ''}</p>
          <div class="event-footer">
            <div class="event-tickets-left">
              ${event.tickets_available ? `${event.tickets_available} tickets left` : 'Limited availability'}
            </div>
            <button class="event-buy-btn" onclick="event.stopPropagation(); app.openTicketPurchase('${event.id}')">
              Buy Tickets
            </button>
          </div>
        </div>
      </div>
    `;
  }

  showEventsLoading() {
    const eventsGrid = document.getElementById('events-grid');
    const eventsLoading = document.getElementById('events-loading');
    const noEvents = document.getElementById('no-events');

    eventsGrid.style.display = 'none';
    noEvents.style.display = 'none';
    eventsLoading.style.display = 'block';
  }

  showNoEvents(message = 'No events found.') {
    const eventsGrid = document.getElementById('events-grid');
    const eventsLoading = document.getElementById('events-loading');
    const noEvents = document.getElementById('no-events');

    eventsGrid.style.display = 'none';
    eventsLoading.style.display = 'none';
    noEvents.style.display = 'block';
    
    const messageElement = noEvents.querySelector('p');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }

  updateLastRefreshed() {
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
      const now = new Date();
      lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }
  }

  // Search and Filter Methods
  setupEventSearch() {
    const searchInput = document.getElementById('main-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchEvents(e.target.value);
        }, 300);
      });

      // Enter key search
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.searchEvents(e.target.value);
        }
      });
    }
  }

  async searchEvents(query = '') {
    try {
      this.showEventsLoading();
      
      let url = '/api/events';
      const params = new URLSearchParams();
      
      if (query.trim()) {
        params.append('search', query.trim());
      }
      
      // Add active filter
      const activeFilter = document.querySelector('.filter-btn.active');
      if (activeFilter && activeFilter.dataset.filter !== 'all') {
        params.append('category', activeFilter.dataset.filter);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        this.displayEvents(data.data || data);
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.showNoEvents('Search failed. Please try again.');
    }
  }

  filterEvents(category) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${category}"]`).classList.add('active');

    // Perform search with current query and new filter
    const searchInput = document.getElementById('main-search');
    const query = searchInput ? searchInput.value : '';
    this.searchEvents(query);
  }

  clearFilters() {
    // Reset search input
    const searchInput = document.getElementById('main-search');
    if (searchInput) {
      searchInput.value = '';
    }

    // Reset filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector('[data-filter="all"]').classList.add('active');

    // Reload all events
    this.loadEvents();
  }

  // Auto-refresh functionality
  setupAutoRefresh() {
    // Refresh events every 5 minutes
    setInterval(() => {
      this.refreshEvents();
    }, 5 * 60 * 1000);
  }

  refreshEvents() {
    console.log('Refreshing events...');
    this.loadEvents();
  }

  // Services Modal Methods
  setupServiceModal() {
    // Services modal functionality
  }

  toggleServicesModal() {
    const modal = document.getElementById('services-modal');
    if (modal.style.display === 'none' || modal.style.display === '') {
      this.openServicesModal();
    } else {
      this.closeServicesModal();
    }
  }

  openServicesModal() {
    const modal = document.getElementById('services-modal');
    const servicesGrid = modal.querySelector('.services-grid-modal');
    
    // Populate services grid
    servicesGrid.innerHTML = this.getServicesHTML();
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  closeServicesModal() {
    const modal = document.getElementById('services-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Mobile Services Dropdown Methods
  toggleMobileServicesDropdown() {
    const dropdown = document.getElementById('mobile-services-list');
    const toggle = document.querySelector('.services-dropdown-toggle');
    
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
      dropdown.style.display = 'block';
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      dropdown.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  // Mobile Menu Setup
  setupMobileMenu() {
    // Mobile menu setup is now handled by direct onclick handler
  }

  // Mobile Menu Toggle Method
  toggleMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      
      mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
      mobileMenu.setAttribute('aria-hidden', isExpanded);
    }
  }

  getServicesHTML() {
    const services = [
      {
        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        title: 'Event Management',
        description: 'Create and manage events'
      },
      {
        icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
        title: 'Ticket Management',
        description: 'Advanced ticketing system'
      },
      {
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197v1z',
        title: 'User Management',
        description: 'User profiles and authentication'
      },
      {
        icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
        title: 'Payment Processing',
        description: 'Secure payment handling'
      },
      {
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        title: 'Analytics & Reports',
        description: 'Business intelligence and reporting'
      },
      {
        icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        title: 'API & Integrations',
        description: 'RESTful APIs and webhooks'
      }
    ];

    return services.map(service => `
      <div class="service-card" onclick="app.closeServicesModal(); app.navigateToService('${service.title.toLowerCase().replace(/[^a-z0-9]/g, '')}')">
        <div class="service-icon">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${service.icon}"/>
          </svg>
        </div>
        <h3 class="service-title">${service.title}</h3>
        <p class="service-description">${service.description}</p>
      </div>
    `).join('');
  }

  // Event Details and Ticket Purchase
  openEventDetails(eventId) {
    console.log('Opening event details for:', eventId);
    // For now, just open ticket purchase
    this.openTicketPurchase(eventId);
  }

  async openTicketPurchase(eventId) {
    try {
      const modal = document.getElementById('ticket-modal');
      const title = document.getElementById('ticket-modal-title');
      const body = document.getElementById('ticket-modal-body');

      // Show loading
      body.innerHTML = '<div class="loading-content"><div class="loading-spinner"></div><p>Loading ticket options...</p></div>';
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // Fetch event and ticket data
      const [eventResponse, ticketsResponse] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/tickets`)
      ]);

      if (eventResponse.ok && ticketsResponse.ok) {
        const eventData = await eventResponse.json();
        const ticketsData = await ticketsResponse.json();
        
        title.textContent = `Buy Tickets - ${eventData.title}`;
        body.innerHTML = this.createTicketPurchaseForm(eventData, ticketsData.data || ticketsData);
      } else {
        throw new Error('Failed to load ticket information');
      }
    } catch (error) {
      console.error('Error loading ticket purchase:', error);
      const body = document.getElementById('ticket-modal-body');
      body.innerHTML = `
        <div class="error-state">
          <h3>Unable to load tickets</h3>
          <p>Please try again later.</p>
          <button class="btn btn-primary" onclick="app.closeTicketModal()">Close</button>
        </div>
      `;
    }
  }

  createTicketPurchaseForm(event, tickets) {
    return `
      <div class="ticket-purchase-form">
        <div class="event-summary">
          <h4>${event.title}</h4>
          <p class="event-date">${new Date(event.start_datetime).toLocaleDateString()}</p>
          <p class="event-venue">${event.venue_name}, ${event.venue_city}</p>
        </div>
        
        <div class="ticket-options">
          <h5>Select Tickets</h5>
          ${tickets.map(ticket => `
            <div class="ticket-option">
              <div class="ticket-info">
                <h6>${ticket.name}</h6>
                <p>${ticket.description}</p>
                <span class="ticket-price">$${ticket.price}</span>
              </div>
              <div class="ticket-quantity">
                <label for="qty-${ticket.id}">Quantity:</label>
                <select id="qty-${ticket.id}" name="quantity">
                  ${Array.from({length: Math.min(ticket.max_per_order || 10, 10)}, (_, i) => 
                    `<option value="${i}">${i === 0 ? 'None' : i}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="purchase-summary">
          <div class="total-section">
            <strong>Total: $<span id="total-price">0.00</span></strong>
          </div>
        </div>
        
        <div class="purchase-actions">
          <button class="btn btn-outline" onclick="app.closeTicketModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.proceedToCheckout('${event.id}')">Proceed to Checkout</button>
        </div>
      </div>
    `;
  }

  closeTicketModal() {
    const modal = document.getElementById('ticket-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  proceedToCheckout(eventId) {
    // Get selected tickets
    const ticketSelects = document.querySelectorAll('[id^="qty-"]');
    const selectedTickets = [];
    let total = 0;

    ticketSelects.forEach(select => {
      const quantity = parseInt(select.value);
      if (quantity > 0) {
        const ticketId = select.id.replace('qty-', '');
        const ticketOption = select.closest('.ticket-option');
        const price = parseFloat(ticketOption.querySelector('.ticket-price').textContent.replace('$', ''));
        
        selectedTickets.push({
          ticketId,
          quantity,
          price
        });
        total += price * quantity;
      }
    });

    if (selectedTickets.length === 0) {
      alert('Please select at least one ticket.');
      return;
    }

    // For now, just show a success message
    alert(`Proceeding to checkout with ${selectedTickets.length} ticket type(s). Total: $${total.toFixed(2)}\n\nPayment processing and email delivery will be implemented next!`);
    this.closeTicketModal();
  }
}

// Create and initialize fast app
const app = new FastRobustTicketingApp();

// Initialize immediately for fast loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Make app globally available
window.app = app;