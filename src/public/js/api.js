/**
 * RobustTicketing - API Client
 * Secure API communication with built-in security and error handling
 */

import { storage, errorHandler } from './utils.js';

class APIClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  // Add request interceptor
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor  
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // Get stored auth token
  getAuthToken() {
    return storage.get('auth_token');
  }

  // Set auth token
  setAuthToken(token) {
    storage.set('auth_token', token);
  }

  // Remove auth token
  removeAuthToken() {
    storage.remove('auth_token');
  }

  // Build request headers
  buildHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    
    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    return headers;
  }

  // Apply request interceptors
  async applyRequestInterceptors(config) {
    let modifiedConfig = { ...config };
    
    for (const interceptor of this.requestInterceptors) {
      try {
        modifiedConfig = await interceptor(modifiedConfig);
      } catch (error) {
        console.warn('Request interceptor failed:', error);
      }
    }
    
    return modifiedConfig;
  }

  // Apply response interceptors
  async applyResponseInterceptors(response) {
    let modifiedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      try {
        modifiedResponse = await interceptor(modifiedResponse);
      } catch (error) {
        console.warn('Response interceptor failed:', error);
      }
    }
    
    return modifiedResponse;
  }

  // Generate request ID for tracking
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Make HTTP request with built-in security and retry logic
  async request(url, options = {}) {
    const requestId = this.generateRequestId();
    
    let config = {
      method: 'GET',
      headers: this.buildHeaders(options.headers),
      ...options,
      url: `${this.baseURL}${url}`,
      requestId
    };

    // Apply request interceptors
    config = await this.applyRequestInterceptors(config);

    // Add request timestamp for performance monitoring
    const startTime = Date.now();

    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`API Request [${requestId}] (Attempt ${attempt}):`, {
            method: config.method,
            url: config.url,
            headers: config.headers
          });
        }

        const response = await fetch(config.url, {
          method: config.method,
          headers: config.headers,
          body: config.body,
          credentials: 'include',
          signal: config.signal
        });

        const duration = Date.now() - startTime;

        // Clone response for potential retry
        const clonedResponse = response.clone();

        // Handle different response types
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else if (contentType && contentType.includes('text/')) {
          data = await response.text();
        } else {
          data = await response.blob();
        }

        // Create enhanced response object
        const enhancedResponse = {
          data,
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers: clonedResponse.headers,
          config,
          duration,
          requestId
        };

        // Apply response interceptors
        const finalResponse = await this.applyResponseInterceptors(enhancedResponse);

        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`API Response [${requestId}]:`, {
            status: finalResponse.status,
            duration: `${duration}ms`,
            data: finalResponse.data
          });
        }

        // Handle non-successful responses
        if (!clonedResponse.ok) {
          const error = new Error(data.message || `HTTP ${clonedResponse.status}`);
          error.response = finalResponse;
          error.status = clonedResponse.status;
          error.requestId = requestId;
          
          // Don't retry client errors (4xx) except 429 (rate limit)
          if (clonedResponse.status >= 400 && clonedResponse.status < 500 && clonedResponse.status !== 429) {
            throw error;
          }
          
          // Retry server errors and rate limits
          if (attempt === this.retryAttempts) {
            throw error;
          }
          
          lastError = error;
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        return finalResponse;

      } catch (error) {
        lastError = error;
        
        // Don't retry if it's an abort signal
        if (error.name === 'AbortError') {
          throw error;
        }
        
        // Don't retry client errors except timeouts
        if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
          throw error;
        }
        
        if (attempt === this.retryAttempts) {
          errorHandler.handle(error, `API request failed after ${this.retryAttempts} attempts`);
          throw error;
        }
        
        console.warn(`API request attempt ${attempt} failed, retrying...`, error.message);
        await this.delay(this.retryDelay * attempt);
      }
    }
    
    throw lastError;
  }

  // Delay utility for retries
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP method shortcuts
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, data = null, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : null
    });
  }

  async put(url, data = null, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : null
    });
  }

  async patch(url, data = null, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null
    });
  }

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  // Upload file with progress tracking
  async upload(url, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.data) {
      Object.keys(options.data).forEach(key => {
        formData.append(key, options.data[key]);
      });
    }

    const config = {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
        ...this.buildHeaders(),
        'Content-Type': undefined
      }
    };

    delete config.headers['Content-Type'];

    return this.request(url, config);
  }

  // Download file
  async download(url, filename, options = {}) {
    const response = await this.request(url, {
      ...options,
      headers: {
        ...this.buildHeaders(options.headers),
        'Accept': 'application/octet-stream'
      }
    });

    // Create blob from response data
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(downloadUrl);
    
    return response;
  }
}

// Create API client instance
const api = new APIClient();

// Add default request interceptor for logging
api.addRequestInterceptor(async (config) => {
  // Add client info headers
  config.headers['X-Client-Version'] = '1.0.0';
  config.headers['X-Client-Platform'] = navigator.platform;
  config.headers['X-Client-Time'] = new Date().toISOString();
  
  return config;
});

// Add default response interceptor for token refresh
api.addResponseInterceptor(async (response) => {
  // Handle token expiration
  if (response.status === 401 && response.data?.error === 'token_expired') {
    const refreshToken = storage.get('refresh_token');
    
    if (refreshToken) {
      try {
        const refreshResponse = await api.post('/auth/refresh', { refreshToken });
        
        if (refreshResponse.data?.tokens) {
          api.setAuthToken(refreshResponse.data.tokens.accessToken);
          storage.set('refresh_token', refreshResponse.data.tokens.refreshToken);
          
          // Retry original request
          const originalConfig = response.config;
          originalConfig.headers.Authorization = `Bearer ${refreshResponse.data.tokens.accessToken}`;
          
          return api.request(originalConfig.url.replace(api.baseURL, ''), originalConfig);
        }
      } catch (error) {
        // Refresh failed, redirect to login
        api.removeAuthToken();
        storage.remove('refresh_token');
        window.location.href = '/login';
      }
    } else {
      // No refresh token, redirect to login
      window.location.href = '/login';
    }
  }
  
  return response;
});

// API service methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  verify2FA: (token, code) => api.post('/auth/verify-2fa', { token, code })
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (file) => api.upload('/users/avatar', file),
  changePassword: (data) => api.post('/users/change-password', data),
  enable2FA: () => api.post('/users/enable-2fa'),
  disable2FA: (code) => api.post('/users/disable-2fa', { code }),
  getNotifications: () => api.get('/users/notifications'),
  markNotificationRead: (id) => api.patch(`/users/notifications/${id}/read`),
  getPreferences: () => api.get('/users/preferences'),
  updatePreferences: (preferences) => api.put('/users/preferences', preferences)
};

export const eventsAPI = {
  getEvents: (params = {}) => api.get('/events', { params }),
  getEvent: (id) => api.get(`/events/${id}`),
  createEvent: (eventData) => api.post('/events', eventData),
  updateEvent: (id, eventData) => api.put(`/events/${id}`, eventData),
  deleteEvent: (id) => api.delete(`/events/${id}`),
  publishEvent: (id) => api.post(`/events/${id}/publish`),
  unpublishEvent: (id) => api.post(`/events/${id}/unpublish`),
  uploadEventImage: (id, file) => api.upload(`/events/${id}/image`, file),
  getEventAnalytics: (id) => api.get(`/events/${id}/analytics`),
  searchEvents: (query, filters = {}) => api.get('/events/search', { params: { q: query, ...filters } }),
  getFeaturedEvents: () => api.get('/events/featured'),
  getPopularEvents: () => api.get('/events/popular'),
  getNearbyEvents: (lat, lng, radius = 50) => api.get('/events/nearby', { params: { lat, lng, radius } })
};

export const ticketsAPI = {
  getTicketTypes: (eventId) => api.get(`/events/${eventId}/ticket-types`),
  createTicketType: (eventId, ticketData) => api.post(`/events/${eventId}/ticket-types`, ticketData),
  updateTicketType: (eventId, ticketId, ticketData) => api.put(`/events/${eventId}/ticket-types/${ticketId}`, ticketData),
  deleteTicketType: (eventId, ticketId) => api.delete(`/events/${eventId}/ticket-types/${ticketId}`),
  purchaseTickets: (orderData) => api.post('/tickets/purchase', orderData),
  getMyTickets: () => api.get('/tickets/my-tickets'),
  getTicket: (id) => api.get(`/tickets/${id}`),
  transferTicket: (id, transferData) => api.post(`/tickets/${id}/transfer`, transferData),
  cancelTicket: (id, reason) => api.post(`/tickets/${id}/cancel`, { reason }),
  downloadTicket: (id) => api.download(`/tickets/${id}/download`, `ticket-${id}.pdf`),
  validateTicket: (code) => api.post('/tickets/validate', { code })
};

export const ordersAPI = {
  getOrders: () => api.get('/orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
  refundOrder: (id, reason) => api.post(`/orders/${id}/refund`, { reason }),
  downloadInvoice: (id) => api.download(`/orders/${id}/invoice`, `invoice-${id}.pdf`)
};

export const paymentsAPI = {
  createPaymentIntent: (orderData) => api.post('/payments/create-intent', orderData),
  confirmPayment: (paymentIntentId, paymentMethodId) => api.post('/payments/confirm', {
    paymentIntentId,
    paymentMethodId
  }),
  getPaymentMethods: () => api.get('/payments/methods'),
  addPaymentMethod: (paymentMethodData) => api.post('/payments/methods', paymentMethodData),
  removePaymentMethod: (id) => api.delete(`/payments/methods/${id}`),
  processRefund: (orderId, amount, reason) => api.post('/payments/refund', { orderId, amount, reason })
};

export const analyticsAPI = {
  getEventAnalytics: (eventId, timeRange = '7d') => api.get(`/analytics/events/${eventId}`, { 
    params: { timeRange } 
  }),
  getUserAnalytics: (timeRange = '30d') => api.get('/analytics/user', { 
    params: { timeRange } 
  }),
  getRevenueAnalytics: (timeRange = '30d') => api.get('/analytics/revenue', { 
    params: { timeRange } 
  }),
  getAttendanceAnalytics: (eventId) => api.get(`/analytics/attendance/${eventId}`),
  exportAnalytics: (type, eventId, format = 'csv') => api.download(
    `/analytics/export/${type}/${eventId}`, 
    `analytics-${type}-${eventId}.${format}`,
    { params: { format } }
  )
};

// Export the API client and all service modules
export { api };
export default api;