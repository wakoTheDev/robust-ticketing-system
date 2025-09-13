/**
 * RobustTicketing - Client-Side Router
 * Single Page Application routing with security and performance features
 */

import { errorHandler, validation, deviceDetection } from './utils.js';
import { api, authAPI } from './api.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.middlewares = [];
    this.currentRoute = null;
    this.currentParams = {};
    this.history = [];
    this.maxHistoryLength = 50;
    this.loadingIndicator = null;
    this.pageTransitionDuration = 300;
    
    // Initialize router
    this.init();
  }

  // Initialize router
  init() {
    // Handle browser navigation
    window.addEventListener('popstate', (event) => {
      this.handlePopState(event);
    });

    // Handle link clicks
    document.addEventListener('click', (event) => {
      this.handleLinkClick(event);
    });

    // Initial route load
    this.loadCurrentRoute();
  }

  // Add middleware
  use(middleware) {
    this.middlewares.push(middleware);
  }

  // Register route
  register(path, handler, options = {}) {
    const route = {
      path: this.normalizePath(path),
      handler,
      options: {
        requiresAuth: false,
        roles: [],
        title: '',
        description: '',
        preload: false,
        cache: false,
        ...options
      },
      paramNames: this.extractParamNames(path),
      regex: this.pathToRegex(path)
    };

    this.routes.set(path, route);
    return this;
  }

  // Register multiple routes
  registerRoutes(routes) {
    Object.entries(routes).forEach(([path, config]) => {
      if (typeof config === 'function') {
        this.register(path, config);
      } else {
        this.register(path, config.handler, config.options);
      }
    });
    return this;
  }

  // Normalize path
  normalizePath(path) {
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  // Extract parameter names from path
  extractParamNames(path) {
    const matches = path.match(/:([^/]+)/g);
    return matches ? matches.map(match => match.slice(1)) : [];
  }

  // Convert path pattern to regex
  pathToRegex(path) {
    const pattern = path
      .replace(/:\w+/g, '([^/]+)')
      .replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`);
  }

  // Match route
  matchRoute(pathname) {
    for (const [path, route] of this.routes) {
      const match = pathname.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        return { route, params };
      }
    }
    return null;
  }

  // Navigate to route
  async navigate(path, options = {}) {
    const {
      replace = false,
      data = null,
      force = false,
      silent = false
    } = options;

    try {
      const normalizedPath = this.normalizePath(path);
      
      // Don't navigate to same route unless forced
      if (!force && this.currentRoute?.path === normalizedPath) {
        return;
      }

      // Show loading indicator
      if (!silent) {
        this.showLoading();
      }

      // Find matching route
      const match = this.matchRoute(normalizedPath);
      if (!match) {
        throw new Error(`Route not found: ${normalizedPath}`);
      }

      const { route, params } = match;

      // Apply middlewares
      const context = {
        path: normalizedPath,
        params,
        route,
        data,
        user: await this.getCurrentUser()
      };

      for (const middleware of this.middlewares) {
        const result = await middleware(context);
        if (result === false) {
          this.hideLoading();
          return; // Middleware blocked navigation
        }
      }

      // Check authentication
      if (route.options.requiresAuth && !context.user) {
        this.hideLoading();
        this.navigate('/login', { 
          data: { returnUrl: normalizedPath } 
        });
        return;
      }

      // Check user roles
      if (route.options.roles.length > 0 && context.user) {
        const hasRequiredRole = route.options.roles.some(role => 
          context.user.roles?.includes(role)
        );
        if (!hasRequiredRole) {
          this.hideLoading();
          this.navigate('/unauthorized');
          return;
        }
      }

      // Update browser history
      if (replace) {
        history.replaceState({ path: normalizedPath, data }, '', normalizedPath);
      } else {
        history.pushState({ path: normalizedPath, data }, '', normalizedPath);
      }

      // Update internal history
      this.updateHistory(normalizedPath, params, data);

      // Update page metadata
      this.updatePageMetadata(route);

      // Execute route handler
      await this.executeRoute(route, params, data);

      // Hide loading indicator
      this.hideLoading();

      // Fire navigation event
      this.fireNavigationEvent('navigate', {
        path: normalizedPath,
        params,
        data
      });

    } catch (error) {
      this.hideLoading();
      errorHandler.handle(error, 'Navigation failed');
      
      // Navigate to error page
      if (path !== '/error') {
        this.navigate('/error', { 
          data: { error: error.message } 
        });
      }
    }
  }

  // Execute route handler
  async executeRoute(route, params, data) {
    try {
      // Prepare page container
      const pageContainer = document.getElementById('page-content');
      if (!pageContainer) {
        throw new Error('Page container not found');
      }

      // Add page transition class
      pageContainer.classList.add('page-transitioning');

      // Execute handler
      const result = await route.handler(params, data);

      // Handle different return types
      if (typeof result === 'string') {
        // HTML string
        pageContainer.innerHTML = result;
      } else if (result && result.element) {
        // DOM element
        pageContainer.innerHTML = '';
        pageContainer.appendChild(result.element);
      } else if (result && result.template) {
        // Template with data
        pageContainer.innerHTML = this.renderTemplate(result.template, result.data);
      }

      // Initialize page components
      await this.initializePageComponents(pageContainer);

      // Remove transition class
      setTimeout(() => {
        pageContainer.classList.remove('page-transitioning');
      }, this.pageTransitionDuration);

      // Update current route
      this.currentRoute = route;
      this.currentParams = params;

    } catch (error) {
      throw new Error(`Route execution failed: ${error.message}`);
    }
  }

  // Initialize page components
  async initializePageComponents(container) {
    // Initialize forms
    const forms = container.querySelectorAll('form[data-auto-submit]');
    forms.forEach(form => this.initializeForm(form));

    // Initialize tooltips
    const tooltips = container.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => this.initializeTooltip(element));

    // Initialize modals
    const modals = container.querySelectorAll('[data-modal]');
    modals.forEach(modal => this.initializeModal(modal));

    // Initialize lazy loading
    const lazyElements = container.querySelectorAll('[data-lazy]');
    this.initializeLazyLoading(lazyElements);

    // Fire page ready event
    this.fireNavigationEvent('pageReady', { container });
  }

  // Initialize form with auto-submission
  initializeForm(form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      // Validate form data
      const validation = this.validateFormData(form, data);
      if (!validation.isValid) {
        this.showFormErrors(form, validation.errors);
        return;
      }

      try {
        form.classList.add('loading');
        
        const endpoint = form.dataset.endpoint;
        const method = form.dataset.method || 'POST';
        
        const response = await api.request(endpoint, {
          method,
          body: JSON.stringify(data)
        });

        // Handle successful submission
        const redirectUrl = form.dataset.redirect || response.data?.redirectUrl;
        if (redirectUrl) {
          this.navigate(redirectUrl);
        }

        // Fire form success event
        this.fireNavigationEvent('formSuccess', { form, response });

      } catch (error) {
        errorHandler.handle(error, 'Form submission failed');
        this.showFormErrors(form, [error.message]);
      } finally {
        form.classList.remove('loading');
      }
    });
  }

  // Validate form data
  validateFormData(form, data) {
    const errors = [];
    
    // Get validation rules from form attributes
    const fields = form.querySelectorAll('[data-validate]');
    
    fields.forEach(field => {
      const rules = field.dataset.validate.split('|');
      const value = data[field.name];
      
      rules.forEach(rule => {
        const [ruleName, ...params] = rule.split(':');
        
        switch (ruleName) {
          case 'required':
            if (!value || value.trim() === '') {
              errors.push(`${field.name} is required`);
            }
            break;
          case 'email':
            if (value && !validation.isEmail(value)) {
              errors.push(`${field.name} must be a valid email`);
            }
            break;
          case 'min':
            if (value && value.length < parseInt(params[0])) {
              errors.push(`${field.name} must be at least ${params[0]} characters`);
            }
            break;
          case 'max':
            if (value && value.length > parseInt(params[0])) {
              errors.push(`${field.name} must be no more than ${params[0]} characters`);
            }
            break;
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Show form errors
  showFormErrors(form, errors) {
    // Clear existing errors
    const existingErrors = form.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());

    // Show new errors
    errors.forEach(error => {
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      errorElement.textContent = error;
      form.appendChild(errorElement);
    });
  }

  // Handle browser back/forward
  handlePopState(event) {
    const state = event.state;
    if (state && state.path) {
      this.loadRoute(state.path, state.data, true);
    } else {
      this.loadCurrentRoute(true);
    }
  }

  // Handle link clicks
  handleLinkClick(event) {
    const link = event.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) {
      return; // External or hash link
    }

    // Check for data attributes
    if (link.dataset.external) {
      return; // Explicitly marked as external
    }

    event.preventDefault();
    
    const data = link.dataset.data ? JSON.parse(link.dataset.data) : null;
    this.navigate(href, { data });
  }

  // Load current route from URL
  loadCurrentRoute(isPopState = false) {
    const path = window.location.pathname;
    this.loadRoute(path, null, isPopState);
  }

  // Load specific route
  async loadRoute(path, data = null, isPopState = false) {
    try {
      if (!isPopState) {
        await this.navigate(path, { data, silent: true });
      } else {
        const match = this.matchRoute(path);
        if (match) {
          await this.executeRoute(match.route, match.params, data);
        }
      }
    } catch (error) {
      errorHandler.handle(error, 'Route loading failed');
    }
  }

  // Update internal history
  updateHistory(path, params, data) {
    this.history.unshift({
      path,
      params,
      data,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(0, this.maxHistoryLength);
    }
  }

  // Update page metadata
  updatePageMetadata(route) {
    if (route.options.title) {
      document.title = route.options.title;
    }

    if (route.options.description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = route.options.description;
    }
  }

  // Get current user
  async getCurrentUser() {
    const token = api.getAuthToken();
    if (!token) return null;

    try {
      const response = await authAPI.getProfile();
      return response.data;
    } catch (error) {
      return null;
    }
  }

  // Show loading indicator
  showLoading() {
    if (!this.loadingIndicator) {
      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.className = 'router-loading';
      this.loadingIndicator.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(this.loadingIndicator);
    }
    this.loadingIndicator.classList.add('active');
  }

  // Hide loading indicator
  hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.classList.remove('active');
    }
  }

  // Fire navigation event
  fireNavigationEvent(type, detail) {
    const event = new CustomEvent(`router:${type}`, {
      detail,
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  // Render template
  renderTemplate(template, data) {
    // Simple template rendering
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || '';
    });
  }

  // Initialize tooltip
  initializeTooltip(element) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = element.dataset.tooltip;
    document.body.appendChild(tooltip);

    element.addEventListener('mouseenter', (event) => {
      const rect = element.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
      tooltip.classList.add('visible');
    });

    element.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  }

  // Initialize modal
  initializeModal(modal) {
    const trigger = document.querySelector(`[data-modal-trigger="${modal.id}"]`);
    if (trigger) {
      trigger.addEventListener('click', () => {
        modal.classList.add('active');
      });
    }

    // Close on backdrop click
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.classList.remove('active');
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
      }
    });
  }

  // Initialize lazy loading
  initializeLazyLoading(elements) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const src = element.dataset.lazy;
            
            if (element.tagName === 'IMG') {
              element.src = src;
            } else {
              element.style.backgroundImage = `url(${src})`;
            }
            
            element.removeAttribute('data-lazy');
            observer.unobserve(element);
          }
        });
      });

      elements.forEach(element => observer.observe(element));
    }
  }

  // Go back in history
  back() {
    if (this.history.length > 1) {
      const previousRoute = this.history[1];
      this.navigate(previousRoute.path, { 
        data: previousRoute.data,
        replace: true 
      });
    } else {
      window.history.back();
    }
  }

  // Refresh current route
  refresh() {
    if (this.currentRoute) {
      this.navigate(window.location.pathname, { force: true });
    }
  }

  // Check if route exists
  hasRoute(path) {
    return this.matchRoute(this.normalizePath(path)) !== null;
  }

  // Get current route info
  getCurrentRoute() {
    return {
      route: this.currentRoute,
      params: this.currentParams,
      path: window.location.pathname
    };
  }
}

// Create router instance
const router = new Router();

// Export router
export { router };
export default router;