# RobustTicketing - Responsive Web Design Specifications

## Design Philosophy

### Core Principles
1. **Mobile-First Approach**: Design starts with mobile and scales up
2. **Progressive Enhancement**: Basic functionality works everywhere, enhanced features for capable devices
3. **Accessibility-First**: WCAG 2.1 AA compliance from the ground up
4. **Performance-Optimized**: Fast loading and smooth interactions
5. **User-Centric**: Every design decision driven by user needs and behavior

### Design System Overview

#### Color Palette
```css
/* Primary Colors */
--primary-500: #3B82F6;    /* Electric Blue - Main brand color */
--primary-600: #2563EB;    /* Darker blue for hover states */
--primary-700: #1D4ED8;    /* Deep blue for active states */

/* Secondary Colors */
--secondary-500: #8B5CF6;  /* Purple - Accent color */
--secondary-600: #7C3AED;  /* Darker purple */

/* Neutral Colors */
--neutral-50: #F9FAFB;     /* Light background */
--neutral-100: #F3F4F6;    /* Card backgrounds */
--neutral-500: #6B7280;    /* Text secondary */
--neutral-900: #111827;    /* Text primary */

/* Status Colors */
--success: #10B981;        /* Green for success states */
--warning: #F59E0B;        /* Orange for warnings */
--error: #EF4444;          /* Red for errors */
--info: #3B82F6;           /* Blue for information */
```

#### Typography Scale
```css
/* Font Family */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', Consolas, monospace;

/* Font Sizes (fluid typography) */
--text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
--text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
--text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
--text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
--text-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
--text-2xl: clamp(1.5rem, 1.3rem + 1vw, 2rem);
--text-3xl: clamp(1.875rem, 1.6rem + 1.375vw, 2.5rem);
--text-4xl: clamp(2.25rem, 1.9rem + 1.75vw, 3rem);
```

#### Spacing System
```css
/* Spacing scale based on 0.25rem (4px) increment */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-24: 6rem;     /* 96px */
```

## Responsive Breakpoints

### Breakpoint Strategy
```css
/* Mobile-first breakpoints */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large screens */
```

### Container Strategy
```css
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

/* Responsive container widths */
@media (min-width: 640px) { .container { max-width: 640px; } }
@media (min-width: 768px) { .container { max-width: 768px; } }
@media (min-width: 1024px) { .container { max-width: 1024px; } }
@media (min-width: 1280px) { .container { max-width: 1280px; } }
@media (min-width: 1536px) { .container { max-width: 1536px; } }
```

## Page Layouts & Components

### 1. Header Navigation

#### Mobile (< 768px)
```
┌─────────────────────────────────────┐
│ [☰]  RobustTicketing        [👤🔔] │
└─────────────────────────────────────┘
```

#### Desktop (>= 768px)
```
┌───────────────────────────────────────────────────────────────┐
│ RobustTicketing  [Home][Events][About]     [Search] [👤][🔔] │
└───────────────────────────────────────────────────────────────┘
```

#### Implementation
```html
<header class="header">
  <div class="container">
    <nav class="nav">
      <!-- Logo -->
      <div class="nav-brand">
        <h1>RobustTicketing</h1>
      </div>
      
      <!-- Desktop Navigation -->
      <div class="nav-links hidden md:flex">
        <a href="/">Home</a>
        <a href="/events">Events</a>
        <a href="/about">About</a>
      </div>
      
      <!-- Search & Actions -->
      <div class="nav-actions">
        <div class="search-container hidden lg:block">
          <input type="search" placeholder="Search events...">
        </div>
        <button class="notification-btn">🔔</button>
        <button class="profile-btn">👤</button>
        <button class="mobile-menu-btn md:hidden">☰</button>
      </div>
    </nav>
  </div>
</header>
```

### 2. Hero Section

#### Mobile Layout
```
┌─────────────────────────────────────┐
│           Hero Image                │
│                                     │
│     Discover Amazing Events         │
│        Near You Today               │
│                                     │
│     [Search Events Button]          │
│                                     │
│  📍 Location  📅 Date  🎫 Category  │
└─────────────────────────────────────┘
```

#### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │
│  │                     │  │   Discover Amazing Events           │ │
│  │    Hero Image       │  │      Near You Today                │ │
│  │                     │  │                                     │ │
│  │                     │  │  [Search Events Button]             │ │
│  │                     │  │                                     │ │
│  └─────────────────────┘  │  📍Location 📅Date 🎫Category       │ │
│                           └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Event Grid Layout

#### Mobile (Stack)
```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────────┐ │
│  │        Event Image              │ │
│  │                                 │ │
│  │  Event Title                    │ │
│  │  📅 Date  📍 Location           │ │
│  │  💰 $25-50                      │ │
│  └─────────────────────────────────┘ │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │        Event Image              │ │
│  │                                 │ │
│  │  Event Title                    │ │
│  │  📅 Date  📍 Location           │ │
│  │  💰 $25-50                      │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Tablet (2 Column)
```
┌───────────────────────────────────────────────────────────────┐
│ ┌─────────────────────┐  ┌─────────────────────────────────┐ │
│ │    Event Image      │  │      Event Image                │ │
│ │                     │  │                                 │ │
│ │ Event Title         │  │   Event Title                   │ │
│ │ 📅Date 📍Location   │  │   📅Date 📍Location            │ │
│ │ 💰$25-50           │  │   💰$25-50                     │ │
│ └─────────────────────┘  └─────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

#### Desktop (3-4 Column)
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────────────┐ │
│ │ Event 1 │ │ Event 2 │ │ Event 3 │ │       Event 4           │ │
│ │         │ │         │ │         │ │                         │ │
│ │ Title   │ │ Title   │ │ Title   │ │       Title             │ │
│ │📅📍💰  │ │📅📍💰  │ │📅📍💰  │ │     📅📍💰            │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Event Detail Page

#### Mobile Layout
```
┌─────────────────────────────────────┐
│           Event Banner              │
│                                     │
│  Event Title                        │
│  ⭐⭐⭐⭐⭐ (4.8) 234 reviews       │
│                                     │
│  📅 Date & Time                     │
│  📍 Venue & Location                │
│  👥 Attendees: 245 going            │
│                                     │
│  [Select Tickets Button]            │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  About This Event                   │
│  Description content...             │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Location & Venue                   │
│  [Map Component]                    │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Reviews & Ratings                  │
│  [Review Components]                │
└─────────────────────────────────────┘
```

#### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────┐
│                      Event Banner                               │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────┐ ┌─────────────────────────┐ │
│ │  Event Title                    │ │                         │ │
│ │  ⭐⭐⭐⭐⭐ (4.8) 234 reviews     │ │    Ticket Selection     │ │
│ │                                 │ │                         │ │
│ │  📅 Date & Time                 │ │  General Admission      │ │
│ │  📍 Venue & Location            │ │  $25.00                 │ │
│ │  👥 Attendees: 245 going        │ │  [- 1 +] [Add to Cart]  │ │
│ │                                 │ │                         │ │
│ │  About This Event               │ │  VIP Package            │ │
│ │  Description content...         │ │  $75.00                 │ │
│ │                                 │ │  [- 0 +] [Add to Cart]  │ │
│ │  Location & Map                 │ │                         │ │
│ │  [Map Component]                │ │  [Checkout Button]      │ │
│ │                                 │ │                         │ │
│ │  Reviews & Ratings              │ │                         │ │
│ │  [Review Components]            │ │                         │ │
│ └─────────────────────────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Event Card Component

```html
<div class="event-card">
  <div class="event-image">
    <img src="event-image.jpg" alt="Event Title" loading="lazy">
    <div class="event-badge">POPULAR</div>
  </div>
  <div class="event-content">
    <h3 class="event-title">Event Title</h3>
    <div class="event-meta">
      <span class="event-date">📅 Mar 15, 2025</span>
      <span class="event-location">📍 Madison Square Garden</span>
    </div>
    <div class="event-price">💰 $25 - $150</div>
    <div class="event-stats">
      <span class="rating">⭐ 4.8</span>
      <span class="attendees">👥 234 going</span>
    </div>
  </div>
</div>
```

### 2. Search & Filter Component

```html
<div class="search-filter-section">
  <div class="search-container">
    <input type="search" placeholder="Search events, artists, venues...">
    <button class="search-btn">🔍</button>
  </div>
  
  <div class="filter-chips">
    <button class="filter-chip active">All</button>
    <button class="filter-chip">Music</button>
    <button class="filter-chip">Sports</button>
    <button class="filter-chip">Comedy</button>
    <button class="filter-chip">Theater</button>
  </div>
  
  <div class="advanced-filters">
    <select class="filter-select">
      <option>Any Date</option>
      <option>Today</option>
      <option>This Week</option>
      <option>This Month</option>
    </select>
    
    <select class="filter-select">
      <option>Any Location</option>
      <option>Nearby</option>
      <option>Specific City</option>
    </select>
    
    <div class="price-range">
      <input type="range" min="0" max="500" class="price-slider">
      <span class="price-display">$0 - $500</span>
    </div>
  </div>
</div>
```

### 3. Ticket Selection Component

```html
<div class="ticket-selection">
  <h3>Select Tickets</h3>
  
  <div class="ticket-types">
    <div class="ticket-type">
      <div class="ticket-info">
        <h4>General Admission</h4>
        <p>Standard entry to the event</p>
        <span class="price">$25.00</span>
      </div>
      <div class="ticket-controls">
        <button class="quantity-btn">-</button>
        <span class="quantity">1</span>
        <button class="quantity-btn">+</button>
      </div>
    </div>
    
    <div class="ticket-type premium">
      <div class="ticket-info">
        <h4>VIP Package</h4>
        <p>Premium seating + exclusive perks</p>
        <span class="price">$75.00</span>
      </div>
      <div class="ticket-controls">
        <button class="quantity-btn">-</button>
        <span class="quantity">0</span>
        <button class="quantity-btn">+</button>
      </div>
    </div>
  </div>
  
  <div class="ticket-summary">
    <div class="summary-line">
      <span>Subtotal</span>
      <span>$25.00</span>
    </div>
    <div class="summary-line">
      <span>Fees</span>
      <span>$3.50</span>
    </div>
    <div class="summary-line total">
      <span>Total</span>
      <span>$28.50</span>
    </div>
  </div>
  
  <button class="checkout-btn">Proceed to Checkout</button>
</div>
```

## Responsive CSS Framework

### Grid System
```css
.grid {
  display: grid;
  gap: var(--space-4);
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

/* Responsive modifiers */
@media (min-width: 640px) {
  .sm\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .sm\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 768px) {
  .md\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
  .md\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
  .lg\:grid-cols-5 { grid-template-columns: repeat(5, 1fr); }
}
```

### Utility Classes
```css
/* Display utilities */
.hidden { display: none; }
.block { display: block; }
.flex { display: flex; }
.grid { display: grid; }

/* Responsive display utilities */
@media (min-width: 768px) {
  .md\:block { display: block; }
  .md\:flex { display: flex; }
  .md\:hidden { display: none; }
}

/* Spacing utilities */
.p-4 { padding: var(--space-4); }
.m-4 { margin: var(--space-4); }
.mt-8 { margin-top: var(--space-8); }
.mb-8 { margin-bottom: var(--space-8); }

/* Text utilities */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.font-bold { font-weight: bold; }
.font-medium { font-weight: 500; }
```

## Performance Optimization

### Image Optimization Strategy
```html
<!-- Responsive images with lazy loading -->
<img 
  src="event-thumb.jpg"
  srcset="
    event-thumb-400.jpg 400w,
    event-thumb-800.jpg 800w,
    event-thumb-1200.jpg 1200w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  "
  alt="Event Title"
  loading="lazy"
  decoding="async"
>
```

### Critical CSS Strategy
```css
/* Critical above-the-fold styles inlined in HTML */
/* Non-critical styles loaded asynchronously */

/* Critical CSS example */
.header { /* essential header styles */ }
.hero { /* essential hero styles */ }
.nav { /* essential navigation styles */ }
```

### Font Loading Strategy
```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

<!-- Font display swap for better performance -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-var.woff2') format('woff2');
    font-display: swap;
  }
</style>
```

## Accessibility Features

### ARIA Implementation
```html
<!-- Navigation with proper ARIA -->
<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar">
    <li role="menuitem"><a href="/">Home</a></li>
    <li role="menuitem"><a href="/events">Events</a></li>
  </ul>
</nav>

<!-- Search with ARIA -->
<div role="search">
  <label for="search-input" class="sr-only">Search events</label>
  <input id="search-input" type="search" aria-describedby="search-help">
  <div id="search-help" class="sr-only">Search for events by name, artist, or venue</div>
</div>
```

### Keyboard Navigation
```css
/* Focus styles for keyboard navigation */
.focus-visible:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* Skip link for screen readers */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--primary-500);
  color: white;
  padding: 8px;
  text-decoration: none;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 6px;
}
```

This comprehensive responsive design specification ensures that RobustTicketing will provide an exceptional user experience across all devices and accessibility requirements while maintaining modern design standards and optimal performance.