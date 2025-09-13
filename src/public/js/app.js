/**
 * RobustTicketing - Main Application
 * Core application logic and initialization
 */

import { storage, errorHandler, validation, formatter, deviceDetection, performance } from './utils.js';
import { api, authAPI, userAPI, eventsAPI, ticketsAPI } from './api.js';
import { router } from './router.js';
import { ComponentManager, ComponentRegistry } from './components.js';

class RobustTicketingApp {
  constructor() {
    this.initialized = false;
    this.user = null;
    this.config = {
      debug: false,
      apiTimeout: 30000,
      retryAttempts: 3,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
      pagination: {
        defaultLimit: 20,
        maxLimit: 100
      }
    };
    this.eventListeners = new Map();
    this.intervals = new Set();
    this.timeouts = new Set();
    
    // Bind methods
    this.init = this.init.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
  }

  // Initialize application
  async init() {
    if (this.initialized) return;

    try {
      console.log('Initializing RobustTicketing Application...');
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      // Load configuration
      await this.loadConfiguration();
      
      // Initialize device detection
      deviceDetection.init();
      
      // Setup API interceptors
      this.setupAPIInterceptors();
      
      // Setup router middleware
      this.setupRouterMiddleware();
      
      // Register application routes
      this.registerRoutes();
      
      // Initialize authentication
      await this.initializeAuth();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize components
      await ComponentManager.initializeAll();
      ComponentManager.setupObserver();
      
      // Setup periodic tasks
      this.setupPeriodicTasks();
      
      // Mark as initialized
      this.initialized = true;
      
      console.log('RobustTicketing Application initialized successfully');
      
      // Fire ready event
      this.fireEvent('app:ready');
      
    } catch (error) {
      errorHandler.handle(error, 'Application initialization failed');
      this.fireEvent('app:error', { error });
    }
  }

  // Setup error handling
  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      errorHandler.handle(event.error, 'Global error');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      errorHandler.handle(event.reason, 'Unhandled promise rejection');
      event.preventDefault();
    });
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    performance.startMonitoring();
    
    // Monitor page load performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            console.log('Page load time:', entry.loadEventEnd - entry.loadEventStart, 'ms');
          }
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
    }
  }

  // Load application configuration
  async loadConfiguration() {
    try {
      // Try to load config from server
      const response = await api.get('/config');
      this.config = { ...this.config, ...response.data };
    } catch (error) {
      console.warn('Failed to load server configuration, using defaults');
    }

    // Load user preferences
    const userPrefs = storage.get('user_preferences');
    if (userPrefs) {
      this.config = { ...this.config, ...userPrefs };
    }
  }

  // Setup API interceptors
  setupAPIInterceptors() {
    // Request interceptor for loading states
    api.addRequestInterceptor(async (config) => {
      this.showGlobalLoading();
      return config;
    });

    // Response interceptor for loading states and error handling
    api.addResponseInterceptor(async (response) => {
      this.hideGlobalLoading();
      
      // Handle specific error codes
      if (response.status === 403) {
        this.handleForbidden();
      } else if (response.status >= 500) {
        this.handleServerError(response);
      }
      
      return response;
    });
  }

  // Setup router middleware
  setupRouterMiddleware() {
    // Authentication middleware
    router.use(async (context) => {
      // Skip auth check for public routes
      const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
      if (publicRoutes.includes(context.path)) {
        return true;
      }

      // Check if user is authenticated
      if (context.route.options.requiresAuth && !this.user) {
        router.navigate('/login', { 
          data: { returnUrl: context.path } 
        });
        return false;
      }

      return true;
    });

    // Analytics middleware
    router.use(async (context) => {
      this.trackPageView(context.path);
      return true;
    });
  }

  // Register application routes
  registerRoutes() {
    const routes = {
      '/': {
        handler: this.renderHomePage.bind(this),
        options: { title: 'RobustTicketing - Home' }
      },
      '/login': {
        handler: this.renderLoginPage.bind(this),
        options: { title: 'Login - RobustTicketing' }
      },
      '/register': {
        handler: this.renderRegisterPage.bind(this),
        options: { title: 'Register - RobustTicketing' }
      },
      '/dashboard': {
        handler: this.renderDashboard.bind(this),
        options: { 
          title: 'Dashboard - RobustTicketing',
          requiresAuth: true 
        }
      },
      '/events': {
        handler: this.renderEventsPage.bind(this),
        options: { title: 'Events - RobustTicketing' }
      },
      '/events/:id': {
        handler: this.renderEventDetail.bind(this),
        options: { title: 'Event Details - RobustTicketing' }
      },
      '/tickets': {
        handler: this.renderTicketsPage.bind(this),
        options: { 
          title: 'My Tickets - RobustTicketing',
          requiresAuth: true 
        }
      },
      '/profile': {
        handler: this.renderProfilePage.bind(this),
        options: { 
          title: 'Profile - RobustTicketing',
          requiresAuth: true 
        }
      },
      '/error': {
        handler: this.renderErrorPage.bind(this),
        options: { title: 'Error - RobustTicketing' }
      },
      '/unauthorized': {
        handler: this.renderUnauthorizedPage.bind(this),
        options: { title: 'Unauthorized - RobustTicketing' }
      }
    };

    router.registerRoutes(routes);
  }

  // Initialize authentication
  async initializeAuth() {
    const token = api.getAuthToken();
    if (token) {
      try {
        const response = await userAPI.getProfile();
        this.user = response.data;
        this.fireEvent('auth:login', { user: this.user });
      } catch (error) {
        // Token is invalid, remove it
        api.removeAuthToken();
        storage.remove('refresh_token');
      }
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Visibility change handler
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Online/offline handlers
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Before unload handler
    window.addEventListener('beforeunload', (event) => {
      this.cleanup();
    });

    // Router events
    document.addEventListener('router:navigate', (event) => {
      this.handleRouteChange(event.detail);
    });

    // Authentication events
    document.addEventListener('auth:login', (event) => {
      this.user = event.detail.user;
      this.onUserLogin(event.detail.user);
    });

    document.addEventListener('auth:logout', () => {
      this.user = null;
      this.onUserLogout();
    });
  }

  // Setup periodic tasks
  setupPeriodicTasks() {
    // Sync user data every 5 minutes
    const syncInterval = setInterval(() => {
      if (this.user && !document.hidden) {
        this.syncUserData();
      }
    }, 5 * 60 * 1000);
    this.intervals.add(syncInterval);

    // Clean up storage every hour
    const cleanupInterval = setInterval(() => {
      storage.cleanup();
    }, 60 * 60 * 1000);
    this.intervals.add(cleanupInterval);
  }

  // Route handlers
  async renderHomePage() {
    const template = `
      <div class="home-page">
        <section class="hero">
          <div class="container">
            <h1>Welcome to RobustTicketing</h1>
            <p>Discover and book tickets for amazing events</p>
            <div class="hero-actions">
              <a href="/events" class="btn btn-primary">Browse Events</a>
              ${!this.user ? '<a href="/register" class="btn btn-secondary">Sign Up</a>' : ''}
            </div>
          </div>
        </section>
        
        <section class="featured-events">
          <div class="container">
            <h2>Featured Events</h2>
            <div id="featured-events-grid" class="events-grid loading">
              <div class="loading-placeholder">Loading featured events...</div>
            </div>
          </div>
        </section>
      </div>
    `;

    setTimeout(() => this.loadFeaturedEvents(), 100);
    return template;
  }

  async renderLoginPage() {
    return `
      <div class="auth-page">
        <div class="auth-container">
          <div class="auth-form">
            <h1>Sign In</h1>
            <form data-component="form" data-options='{"submitEndpoint": "/auth/login", "redirectAfterSubmit": "/dashboard"}'>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
              </div>
              <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">Sign In</button>
              </div>
            </form>
            <div class="auth-links">
              <a href="/forgot-password">Forgot Password?</a>
              <a href="/register">Create Account</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async renderRegisterPage() {
    return `
      <div class="auth-page">
        <div class="auth-container">
          <div class="auth-form">
            <h1>Create Account</h1>
            <form data-component="form" data-options='{"submitEndpoint": "/auth/register", "redirectAfterSubmit": "/dashboard"}'>
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">First Name</label>
                  <input type="text" id="firstName" name="firstName" required>
                </div>
                <div class="form-group">
                  <label for="lastName">Last Name</label>
                  <input type="text" id="lastName" name="lastName" required>
                </div>
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required>
              </div>
              <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">Create Account</button>
              </div>
            </form>
            <div class="auth-links">
              <a href="/login">Already have an account? Sign In</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async renderDashboard() {
    if (!this.user) {
      router.navigate('/login');
      return;
    }

    return `
      <div class="dashboard">
        <div class="container">
          <header class="dashboard-header">
            <h1>Welcome back, ${this.user.firstName}</h1>
            <div class="dashboard-actions">
              <a href="/events/create" class="btn btn-primary">Create Event</a>
            </div>
          </header>
          
          <div class="dashboard-grid">
            <div class="dashboard-card">
              <h3>Recent Tickets</h3>
              <div id="recent-tickets" class="loading">Loading...</div>
            </div>
            
            <div class="dashboard-card">
              <h3>Upcoming Events</h3>
              <div id="upcoming-events" class="loading">Loading...</div>
            </div>
            
            <div class="dashboard-card">
              <h3>Analytics</h3>
              <div id="analytics-summary" class="loading">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async renderEventsPage() {
    return `
      <div class="events-page">
        <div class="container">
          <header class="page-header">
            <h1>Events</h1>
            <div class="page-actions">
              <div class="search-filters">
                <input type="search" placeholder="Search events..." id="event-search">
                <select id="category-filter">
                  <option value="">All Categories</option>
                  <option value="music">Music</option>
                  <option value="sports">Sports</option>
                  <option value="theater">Theater</option>
                  <option value="comedy">Comedy</option>
                </select>
              </div>
            </div>
          </header>
          
          <div id="events-grid" class="events-grid loading">
            <div class="loading-placeholder">Loading events...</div>
          </div>
          
          <div id="pagination" class="pagination"></div>
        </div>
      </div>
    `;
  }

  async renderEventDetail(params) {
    const eventId = params.id;
    
    try {
      const response = await eventsAPI.getEvent(eventId);
      const event = response.data;
      
      return `
        <div class="event-detail">
          <div class="container">
            <div class="event-header">
              <div class="event-image">
                <img src="${event.imageUrl || '/images/default-event.jpg'}" alt="${event.title}">
              </div>
              <div class="event-info">
                <h1>${event.title}</h1>
                <div class="event-meta">
                  <div class="event-date">
                    <i class="icon-calendar"></i>
                    ${formatter.formatDate(event.startDate)}
                  </div>
                  <div class="event-location">
                    <i class="icon-location"></i>
                    ${event.venue}
                  </div>
                </div>
                <div class="event-description">
                  ${event.description}
                </div>
              </div>
            </div>
            
            <div class="ticket-selection">
              <h2>Select Tickets</h2>
              <div id="ticket-types" class="loading">Loading ticket options...</div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      return this.renderErrorPage(null, { error: 'Event not found' });
    }
  }

  async renderErrorPage(params, data) {
    const error = data?.error || 'An unexpected error occurred';
    
    return `
      <div class="error-page">
        <div class="container">
          <div class="error-content">
            <h1>Oops! Something went wrong</h1>
            <p>${error}</p>
            <div class="error-actions">
              <a href="/" class="btn btn-primary">Go Home</a>
              <button onclick="history.back()" class="btn btn-secondary">Go Back</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Utility methods
  async loadFeaturedEvents() {
    try {
      const response = await eventsAPI.getFeaturedEvents();
      const events = response.data;
      
      const grid = document.getElementById('featured-events-grid');
      if (grid) {
        grid.innerHTML = events.map(event => `
          <div class="event-card">
            <div class="event-image">
              <img src="${event.imageUrl || '/images/default-event.jpg'}" alt="${event.title}">
            </div>
            <div class="event-content">
              <h3><a href="/events/${event.id}">${event.title}</a></h3>
              <div class="event-date">${formatter.formatDate(event.startDate)}</div>
              <div class="event-location">${event.venue}</div>
              <div class="event-price">From ${formatter.formatCurrency(event.minPrice)}</div>
            </div>
          </div>
        `).join('');
        grid.classList.remove('loading');
      }
    } catch (error) {
      const grid = document.getElementById('featured-events-grid');
      if (grid) {
        grid.innerHTML = '<div class="error-message">Failed to load featured events</div>';
        grid.classList.remove('loading');
      }
    }
  }

  async syncUserData() {
    if (!this.user) return;
    
    try {
      const response = await userAPI.getProfile();
      this.user = response.data;
    } catch (error) {
      console.warn('Failed to sync user data:', error);
    }
  }

  trackPageView(path) {
    // Send analytics data
    if (this.config.analytics?.enabled) {
      // Implementation would depend on analytics provider
      console.log('Page view:', path);
    }
  }

  showGlobalLoading() {
    const existingLoader = document.querySelector('.global-loading');
    if (!existingLoader) {
      const loader = document.createElement('div');
      loader.className = 'global-loading';
      loader.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(loader);
    }
  }

  hideGlobalLoading() {
    const loader = document.querySelector('.global-loading');
    if (loader) {
      loader.remove();
    }
  }

  handleForbidden() {
    router.navigate('/unauthorized');
  }

  handleServerError(response) {
    this.fireEvent('app:serverError', { response });
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.fireEvent('app:background');
    } else {
      this.fireEvent('app:foreground');
    }
  }

  handleOnline() {
    this.fireEvent('app:online');
  }

  handleOffline() {
    this.fireEvent('app:offline');
  }

  handleRouteChange(detail) {
    // Update navigation state
    this.updateNavigation(detail.path);
  }

  updateNavigation(currentPath) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  onUserLogin(user) {
    // Update UI for logged in state
    this.updateUserInterface();
  }

  onUserLogout() {
    // Update UI for logged out state
    this.updateUserInterface();
    router.navigate('/');
  }

  updateUserInterface() {
    // Update user menu, navigation, etc.
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      if (this.user) {
        userMenu.innerHTML = `
          <div class="user-info">
            <span>${this.user.firstName} ${this.user.lastName}</span>
            <div class="user-dropdown" data-component="dropdown">
              <div class="dropdown-trigger">
                <img src="${this.user.avatarUrl || '/images/default-avatar.png'}" alt="Avatar">
              </div>
              <div class="dropdown-menu">
                <a href="/profile">Profile</a>
                <a href="/tickets">My Tickets</a>
                <a href="/dashboard">Dashboard</a>
                <hr>
                <button onclick="app.logout()">Sign Out</button>
              </div>
            </div>
          </div>
        `;
      } else {
        userMenu.innerHTML = `
          <div class="auth-links">
            <a href="/login" class="btn btn-outline">Sign In</a>
            <a href="/register" class="btn btn-primary">Sign Up</a>
          </div>
        `;
      }
    }
  }

  async logout() {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      api.removeAuthToken();
      storage.remove('refresh_token');
      this.fireEvent('auth:logout');
    }
  }

  fireEvent(type, detail = null) {
    const event = new CustomEvent(type, {
      detail,
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  cleanup() {
    // Clear intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    // Clear timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();

    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  async destroy() {
    this.cleanup();
    await ComponentManager.destroyAll();
    this.initialized = false;
  }
}

// Create and initialize application
const app = new RobustTicketingApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Make app globally available
window.app = app;

// Export for module use
export { RobustTicketingApp };
export default app;