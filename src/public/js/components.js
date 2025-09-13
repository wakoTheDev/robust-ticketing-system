/**
 * RobustTicketing - Component System
 * Modular component architecture with lifecycle management
 */

import { errorHandler, validation, formatter, deviceDetection } from './utils.js';
import { api } from './api.js';

class Component {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...this.defaultOptions, ...options };
    this.state = {};
    this.listeners = new Map();
    this.children = new Set();
    this.parent = null;
    this.mounted = false;
    this.destroyed = false;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.mount = this.mount.bind(this);
    this.unmount = this.unmount.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  // Default options
  get defaultOptions() {
    return {
      autoRender: true,
      autoMount: true,
      template: '',
      data: {},
      events: {},
      attributes: {}
    };
  }

  // Initialize component
  async init() {
    if (this.destroyed) return;

    try {
      // Set initial state
      this.setState(this.options.data);

      // Set attributes
      this.setAttributes(this.options.attributes);

      // Auto render if enabled
      if (this.options.autoRender) {
        await this.render();
      }

      // Auto mount if enabled
      if (this.options.autoMount) {
        await this.mount();
      }

      return this;
    } catch (error) {
      errorHandler.handle(error, `Component initialization failed: ${this.constructor.name}`);
    }
  }

  // Set component state
  setState(newState, shouldRender = true) {
    if (this.destroyed) return;

    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };

    // Emit state change event
    this.emit('stateChange', { oldState, newState: this.state });

    // Re-render if needed
    if (shouldRender && this.mounted) {
      this.render();
    }
  }

  // Get component state
  getState() {
    return { ...this.state };
  }

  // Set element attributes
  setAttributes(attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        this.element.setAttribute(key, value);
      } else {
        this.element.removeAttribute(key);
      }
    });
  }

  // Render component
  async render() {
    if (this.destroyed) return;

    try {
      // Call beforeRender hook
      await this.beforeRender();

      // Get template content
      const content = this.getTemplate();

      // Update element content
      if (content !== null && content !== undefined) {
        this.element.innerHTML = content;
      }

      // Bind events
      this.bindEvents();

      // Initialize child components
      await this.initializeChildren();

      // Call afterRender hook
      await this.afterRender();

      // Emit render event
      this.emit('render');

    } catch (error) {
      errorHandler.handle(error, `Component render failed: ${this.constructor.name}`);
    }
  }

  // Get template content
  getTemplate() {
    if (typeof this.options.template === 'function') {
      return this.options.template(this.state);
    } else if (typeof this.options.template === 'string') {
      return this.interpolateTemplate(this.options.template, this.state);
    }
    return null;
  }

  // Interpolate template with state data
  interpolateTemplate(template, data) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key.trim());
      return value !== undefined ? value : match;
    });
  }

  // Get nested object value
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Bind event listeners
  bindEvents() {
    // Remove existing listeners
    this.unbindEvents();

    // Bind new listeners
    Object.entries(this.options.events).forEach(([selector, handlers]) => {
      const elements = selector === 'this' ? [this.element] : 
                      this.element.querySelectorAll(selector);

      elements.forEach(element => {
        Object.entries(handlers).forEach(([event, handler]) => {
          const boundHandler = this.createEventHandler(handler);
          element.addEventListener(event, boundHandler);
          
          // Store listener for cleanup
          if (!this.listeners.has(element)) {
            this.listeners.set(element, []);
          }
          this.listeners.get(element).push({ event, handler: boundHandler });
        });
      });
    });
  }

  // Create event handler
  createEventHandler(handler) {
    if (typeof handler === 'string') {
      // Method name reference
      return (event) => {
        if (this[handler] && typeof this[handler] === 'function') {
          this[handler](event);
        }
      };
    } else if (typeof handler === 'function') {
      // Direct function
      return handler.bind(this);
    }
    return () => {};
  }

  // Unbind event listeners
  unbindEvents() {
    this.listeners.forEach((eventList, element) => {
      eventList.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    this.listeners.clear();
  }

  // Initialize child components
  async initializeChildren() {
    const childElements = this.element.querySelectorAll('[data-component]');
    
    for (const childElement of childElements) {
      try {
        const componentName = childElement.dataset.component;
        const componentOptions = childElement.dataset.options ? 
          JSON.parse(childElement.dataset.options) : {};

        const ChildComponent = ComponentRegistry.get(componentName);
        if (ChildComponent) {
          const child = new ChildComponent(childElement, componentOptions);
          child.parent = this;
          this.children.add(child);
          await child.init();
        }
      } catch (error) {
        console.warn('Failed to initialize child component:', error);
      }
    }
  }

  // Mount component
  async mount() {
    if (this.mounted || this.destroyed) return;

    try {
      // Call beforeMount hook
      await this.beforeMount();

      // Mark as mounted
      this.mounted = true;

      // Add mounted class
      this.element.classList.add('component-mounted');

      // Call afterMount hook
      await this.afterMount();

      // Emit mount event
      this.emit('mount');

    } catch (error) {
      errorHandler.handle(error, `Component mount failed: ${this.constructor.name}`);
    }
  }

  // Unmount component
  async unmount() {
    if (!this.mounted || this.destroyed) return;

    try {
      // Call beforeUnmount hook
      await this.beforeUnmount();

      // Unmount children
      for (const child of this.children) {
        await child.unmount();
      }

      // Unbind events
      this.unbindEvents();

      // Mark as unmounted
      this.mounted = false;

      // Remove mounted class
      this.element.classList.remove('component-mounted');

      // Call afterUnmount hook
      await this.afterUnmount();

      // Emit unmount event
      this.emit('unmount');

    } catch (error) {
      errorHandler.handle(error, `Component unmount failed: ${this.constructor.name}`);
    }
  }

  // Destroy component
  async destroy() {
    if (this.destroyed) return;

    try {
      // Unmount first
      await this.unmount();

      // Destroy children
      for (const child of this.children) {
        await child.destroy();
      }
      this.children.clear();

      // Remove from parent
      if (this.parent) {
        this.parent.children.delete(this);
      }

      // Mark as destroyed
      this.destroyed = true;

      // Emit destroy event
      this.emit('destroy');

    } catch (error) {
      errorHandler.handle(error, `Component destroy failed: ${this.constructor.name}`);
    }
  }

  // Event emitter methods
  emit(event, data = null) {
    const customEvent = new CustomEvent(`component:${event}`, {
      detail: { component: this, data },
      bubbles: true
    });
    this.element.dispatchEvent(customEvent);
  }

  on(event, handler) {
    this.element.addEventListener(`component:${event}`, handler);
  }

  off(event, handler) {
    this.element.removeEventListener(`component:${event}`, handler);
  }

  // Lifecycle hooks (to be overridden by subclasses)
  async beforeRender() {}
  async afterRender() {}
  async beforeMount() {}
  async afterMount() {}
  async beforeUnmount() {}
  async afterUnmount() {}

  // Find child component
  findChild(selector) {
    const element = this.element.querySelector(selector);
    if (element) {
      for (const child of this.children) {
        if (child.element === element) {
          return child;
        }
      }
    }
    return null;
  }

  // Find all child components
  findChildren(selector) {
    const elements = this.element.querySelectorAll(selector);
    return Array.from(this.children).filter(child => 
      Array.from(elements).includes(child.element)
    );
  }
}

// Component Registry
class ComponentRegistry {
  static components = new Map();

  static register(name, componentClass) {
    this.components.set(name, componentClass);
  }

  static get(name) {
    return this.components.get(name);
  }

  static has(name) {
    return this.components.has(name);
  }

  static getAll() {
    return new Map(this.components);
  }
}

// Common Components

// Form Component
class FormComponent extends Component {
  get defaultOptions() {
    return {
      ...super.defaultOptions,
      validateOnSubmit: true,
      validateOnChange: false,
      submitEndpoint: '',
      submitMethod: 'POST',
      redirectAfterSubmit: null,
      showLoading: true
    };
  }

  async afterMount() {
    this.form = this.element.tagName === 'FORM' ? this.element : 
               this.element.querySelector('form');
    
    if (this.form) {
      this.bindFormEvents();
    }
  }

  bindFormEvents() {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    
    if (this.options.validateOnChange) {
      this.form.addEventListener('input', this.handleInputChange.bind(this));
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (this.options.validateOnSubmit) {
      const validation = this.validateForm();
      if (!validation.isValid) {
        this.showValidationErrors(validation.errors);
        return;
      }
    }

    await this.submitForm();
  }

  handleInputChange(event) {
    const field = event.target;
    this.validateField(field);
  }

  validateForm() {
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());
    const errors = [];

    // Validate required fields
    const requiredFields = this.form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      if (!data[field.name] || data[field.name].trim() === '') {
        errors.push(`${field.name} is required`);
      }
    });

    // Validate email fields
    const emailFields = this.form.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
      if (data[field.name] && !validation.isEmail(data[field.name])) {
        errors.push(`${field.name} must be a valid email address`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      data
    };
  }

  validateField(field) {
    const errors = [];
    const value = field.value;

    if (field.required && (!value || value.trim() === '')) {
      errors.push(`${field.name} is required`);
    }

    if (field.type === 'email' && value && !validation.isEmail(value)) {
      errors.push(`${field.name} must be a valid email address`);
    }

    this.showFieldErrors(field, errors);
    return errors.length === 0;
  }

  showValidationErrors(errors) {
    this.clearErrors();
    
    const errorContainer = this.element.querySelector('.form-errors') || 
                          this.createElement('div', 'form-errors');
    
    errorContainer.innerHTML = errors.map(error => 
      `<div class="error-message">${error}</div>`
    ).join('');

    if (!errorContainer.parentNode) {
      this.form.insertBefore(errorContainer, this.form.firstChild);
    }
  }

  showFieldErrors(field, errors) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    if (errors.length > 0) {
      const errorElement = this.createElement('div', 'field-error');
      errorElement.textContent = errors[0];
      field.parentNode.appendChild(errorElement);
      field.classList.add('error');
    } else {
      field.classList.remove('error');
    }
  }

  clearErrors() {
    const errorContainers = this.element.querySelectorAll('.form-errors, .field-error');
    errorContainers.forEach(container => container.remove());

    const errorFields = this.element.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));
  }

  async submitForm() {
    try {
      if (this.options.showLoading) {
        this.showLoading();
      }

      const formData = new FormData(this.form);
      const data = Object.fromEntries(formData.entries());

      const response = await api.request(this.options.submitEndpoint, {
        method: this.options.submitMethod,
        body: JSON.stringify(data)
      });

      this.emit('submitSuccess', { response, data });

      if (this.options.redirectAfterSubmit) {
        window.location.href = this.options.redirectAfterSubmit;
      }

    } catch (error) {
      this.emit('submitError', { error });
      this.showValidationErrors([error.message]);
    } finally {
      if (this.options.showLoading) {
        this.hideLoading();
      }
    }
  }

  showLoading() {
    const submitButton = this.form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add('loading');
    }
  }

  hideLoading() {
    const submitButton = this.form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove('loading');
    }
  }

  createElement(tag, className) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    return element;
  }
}

// Modal Component
class ModalComponent extends Component {
  get defaultOptions() {
    return {
      ...super.defaultOptions,
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
      animation: 'fade'
    };
  }

  async afterMount() {
    this.backdrop = this.element.querySelector('.modal-backdrop');
    this.content = this.element.querySelector('.modal-content');
    this.closeButton = this.element.querySelector('.modal-close');

    this.bindModalEvents();
  }

  bindModalEvents() {
    if (this.options.closeOnBackdrop && this.backdrop) {
      this.backdrop.addEventListener('click', (event) => {
        if (event.target === this.backdrop) {
          this.close();
        }
      });
    }

    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.close());
    }

    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', this.handleEscapeKey.bind(this));
    }
  }

  handleEscapeKey(event) {
    if (event.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  }

  open() {
    this.element.classList.add('active');
    document.body.classList.add('modal-open');
    this.emit('open');
  }

  close() {
    this.element.classList.remove('active');
    document.body.classList.remove('modal-open');
    this.emit('close');
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  isOpen() {
    return this.element.classList.contains('active');
  }
}

// Dropdown Component
class DropdownComponent extends Component {
  get defaultOptions() {
    return {
      ...super.defaultOptions,
      trigger: 'click',
      position: 'bottom',
      closeOnOutsideClick: true
    };
  }

  async afterMount() {
    this.trigger = this.element.querySelector('.dropdown-trigger');
    this.menu = this.element.querySelector('.dropdown-menu');

    this.bindDropdownEvents();
  }

  bindDropdownEvents() {
    if (this.trigger) {
      this.trigger.addEventListener(this.options.trigger, this.toggle.bind(this));
    }

    if (this.options.closeOnOutsideClick) {
      document.addEventListener('click', this.handleOutsideClick.bind(this));
    }
  }

  handleOutsideClick(event) {
    if (!this.element.contains(event.target) && this.isOpen()) {
      this.close();
    }
  }

  open() {
    this.element.classList.add('active');
    this.positionMenu();
    this.emit('open');
  }

  close() {
    this.element.classList.remove('active');
    this.emit('close');
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  isOpen() {
    return this.element.classList.contains('active');
  }

  positionMenu() {
    if (!this.menu || !this.trigger) return;

    const triggerRect = this.trigger.getBoundingClientRect();
    const menuRect = this.menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let top, left;

    switch (this.options.position) {
      case 'top':
        top = triggerRect.top - menuRect.height;
        left = triggerRect.left;
        break;
      case 'bottom':
      default:
        top = triggerRect.bottom;
        left = triggerRect.left;
        break;
    }

    // Adjust for viewport boundaries
    if (left + menuRect.width > viewport.width) {
      left = viewport.width - menuRect.width - 10;
    }
    if (left < 10) {
      left = 10;
    }

    this.menu.style.top = `${top}px`;
    this.menu.style.left = `${left}px`;
  }
}

// Register common components
ComponentRegistry.register('form', FormComponent);
ComponentRegistry.register('modal', ModalComponent);
ComponentRegistry.register('dropdown', DropdownComponent);

// Component Manager
class ComponentManager {
  static components = new Set();
  static observers = new Map();

  // Initialize all components in container
  static async initializeAll(container = document) {
    const elements = container.querySelectorAll('[data-component]');
    
    for (const element of elements) {
      await this.initialize(element);
    }
  }

  // Initialize single component
  static async initialize(element) {
    const componentName = element.dataset.component;
    const componentOptions = element.dataset.options ? 
      JSON.parse(element.dataset.options) : {};

    const ComponentClass = ComponentRegistry.get(componentName);
    if (!ComponentClass) {
      console.warn(`Component not found: ${componentName}`);
      return null;
    }

    try {
      const component = new ComponentClass(element, componentOptions);
      await component.init();
      
      this.components.add(component);
      return component;
    } catch (error) {
      errorHandler.handle(error, `Failed to initialize component: ${componentName}`);
      return null;
    }
  }

  // Destroy all components
  static async destroyAll() {
    for (const component of this.components) {
      await component.destroy();
    }
    this.components.clear();
  }

  // Setup mutation observer for dynamic components
  static setupObserver(container = document) {
    if (this.observers.has(container)) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Initialize new components
            if (node.dataset && node.dataset.component) {
              this.initialize(node);
            }
            
            // Initialize child components
            const childComponents = node.querySelectorAll('[data-component]');
            childComponents.forEach(child => this.initialize(child));
          }
        });
      });
    });

    observer.observe(container, {
      childList: true,
      subtree: true
    });

    this.observers.set(container, observer);
  }
}

// Export everything
export {
  Component,
  ComponentRegistry,
  ComponentManager,
  FormComponent,
  ModalComponent,
  DropdownComponent
};

export default Component;