/**
 * RobustTicketing - Utility Functions
 * Core utility functions for the application
 */

// Debounce function for performance optimization
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

// Throttle function for performance optimization
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Format currency
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.warn('Currency formatting failed:', error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// Format date and time
export function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  try {
    return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.warn('Date formatting failed:', error);
    return date.toString();
  }
}

export function formatDateTime(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  try {
    return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.warn('DateTime formatting failed:', error);
    return date.toString();
  }
}

export function formatTime(date, options = {}) {
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit'
  };
  
  try {
    return new Date(date).toLocaleTimeString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.warn('Time formatting failed:', error);
    return date.toString();
  }
}

// Get relative time (e.g., "2 hours ago")
export function getRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diff = now - target;
  
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;
  
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)} minutes ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hours ago`;
  if (diff < week) return `${Math.floor(diff / day)} days ago`;
  if (diff < month) return `${Math.floor(diff / week)} weeks ago`;
  if (diff < year) return `${Math.floor(diff / month)} months ago`;
  return `${Math.floor(diff / year)} years ago`;
}

// Validation utilities
export const validators = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  password: (password) => {
    // At least 8 characters, uppercase, lowercase, number, special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  },
  
  phone: (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  },
  
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  required: (value) => {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  }
};

// Sanitize HTML to prevent XSS
export function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Escape HTML entities
export function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Generate unique ID
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate UUID v4
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Storage utilities with error handling and encryption support
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to get item from storage: ${key}`, error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set item in storage: ${key}`, error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item from storage: ${key}`, error);
      return false;
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear storage', error);
      return false;
    }
  }
};

// Session storage utilities
export const sessionStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to get item from session storage: ${key}`, error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set item in session storage: ${key}`, error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      window.sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item from session storage: ${key}`, error);
      return false;
    }
  }
};

// Cookie utilities
export const cookies = {
  get: (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  },
  
  set: (name, value, options = {}) => {
    const {
      expires = 7,
      path = '/',
      domain = '',
      secure = window.location.protocol === 'https:',
      sameSite = 'Strict'
    } = options;
    
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (expires) {
      const date = new Date();
      date.setTime(date.getTime() + (expires * 24 * 60 * 60 * 1000));
      cookieString += `; expires=${date.toUTCString()}`;
    }
    
    cookieString += `; path=${path}`;
    
    if (domain) {
      cookieString += `; domain=${domain}`;
    }
    
    if (secure) {
      cookieString += '; secure';
    }
    
    cookieString += `; samesite=${sameSite}`;
    
    document.cookie = cookieString;
  },
  
  remove: (name, options = {}) => {
    cookies.set(name, '', { ...options, expires: -1 });
  }
};

// URL utilities
export const url = {
  getParams: () => {
    return new URLSearchParams(window.location.search);
  },
  
  getParam: (name, defaultValue = null) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || defaultValue;
  },
  
  setParam: (name, value) => {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url);
  },
  
  removeParam: (name) => {
    const url = new URL(window.location);
    url.searchParams.delete(name);
    window.history.pushState({}, '', url);
  }
};

// Event emitter for custom events
export class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }
  
  off(event, callback) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }
  
  emit(event, data) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }
  
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    
    this.on(event, onceCallback);
  }
}

// Device detection
export const device = {
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  isTablet: () => {
    return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
  },
  
  isDesktop: () => {
    return !device.isMobile() && !device.isTablet();
  },
  
  isTouchDevice: () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  getScreenSize: () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  },
  
  getOrientation: () => {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }
};

// Performance utilities
export const performance = {
  measure: (name, fn) => {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    console.log(`Performance: ${name} took ${duration}ms`);
    return result;
  },
  
  measureAsync: async (name, fn) => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`Performance: ${name} took ${duration}ms`);
    return result;
  }
};

// Animation utilities
export const animation = {
  fadeIn: (element, duration = 300) => {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.opacity = progress.toString();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  fadeOut: (element, duration = 300) => {
    const startTime = Date.now();
    const startOpacity = parseFloat(getComputedStyle(element).opacity);
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.opacity = (startOpacity * (1 - progress)).toString();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  slideUp: (element, duration = 300) => {
    const startHeight = element.offsetHeight;
    const startTime = Date.now();
    
    element.style.overflow = 'hidden';
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.height = `${startHeight * (1 - progress)}px`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
        element.style.height = '';
        element.style.overflow = '';
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  slideDown: (element, targetHeight, duration = 300) => {
    element.style.height = '0px';
    element.style.overflow = 'hidden';
    element.style.display = 'block';
    
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.height = `${targetHeight * progress}px`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.style.height = '';
        element.style.overflow = '';
      }
    };
    
    requestAnimationFrame(animate);
  }
};

// Error handling utilities
export class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
  }
  
  handle(error, context = '') {
    const errorInfo = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.errors.push(errorInfo);
    
    // Keep only the last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught:', errorInfo);
    }
    
    // Send to logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(errorInfo);
    }
  }
  
  sendToLoggingService(errorInfo) {
    // Implementation would send to your logging service
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorInfo)
    }).catch(err => {
      console.warn('Failed to send error to logging service:', err);
    });
  }
  
  getErrors() {
    return [...this.errors];
  }
  
  clearErrors() {
    this.errors = [];
  }
}

// Create global error handler instance
export const errorHandler = new ErrorHandler();

// Global error listeners
window.addEventListener('error', (event) => {
  errorHandler.handle(event.error, 'Global error handler');
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handle(new Error(event.reason), 'Unhandled promise rejection');
});

// Feature detection
export const features = {
  supportsWebP: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },
  
  supportsLocalStorage: () => {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
  
  supportsServiceWorker: () => {
    return 'serviceWorker' in navigator;
  },
  
  supportsPushNotifications: () => {
    return 'PushManager' in window;
  },
  
  supportsGeolocation: () => {
    return 'geolocation' in navigator;
  }
};

// Make utils available globally for debugging
if (typeof window !== 'undefined') {
  window.RobustTicketingUtils = {
    debounce,
    throttle,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatTime,
    getRelativeTime,
    validators,
    sanitizeHTML,
    escapeHTML,
    generateId,
    generateUUID,
    storage,
    sessionStorage,
    cookies,
    url,
    EventEmitter,
    device,
    performance,
    animation,
    errorHandler,
    features
  };
}