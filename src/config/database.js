import pkg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { logger } from '../utils/logger.js';

const { Pool, Client } = pkg;

let pool;
let db; // SQLite database instance

const usePostgreSQL = () => {
  return process.env.NODE_ENV === 'production' || process.env.USE_POSTGRESQL === 'true';
};

export const connectDatabase = async () => {
  if (usePostgreSQL()) {
    await connectPostgreSQL();
  } else {
    await connectSQLite();
  }
};

const connectPostgreSQL = async () => {
  try {
    // First, try to create the database if it doesn't exist
    await createDatabaseIfNotExists();

    // Then connect to the specific database
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'robusttickets_dev',
      user: process.env.DB_USER || 'robusttickets_user',
      password: process.env.DB_PASSWORD || 'secure_password_123',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('PostgreSQL database connected successfully');

    // Create tables if they don't exist
    await createTables();

  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    throw error;
  }
};

const connectSQLite = async () => {
  try {
    // Open SQLite database (creates file if it doesn't exist)
    db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });

    logger.info('SQLite database connected successfully');

    // Create tables if they don't exist
    await createSQLiteTables();

  } catch (error) {
    logger.error('SQLite connection failed:', error);
    throw error;
  }
};

// Create database if it doesn't exist (PostgreSQL)
const createDatabaseIfNotExists = async () => {
  const dbName = process.env.DB_NAME || 'robusttickets_dev';
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER || 'robusttickets_user',
    password: process.env.DB_PASSWORD || 'secure_password_123',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await adminClient.connect();
    
    // Check if database exists
    const result = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      logger.info(`Database "${dbName}" created successfully`);
    } else {
      logger.info(`Database "${dbName}" already exists`);
    }
  } catch (error) {
    // If we can't connect as the user, try creating the user first
    if (error.code === '28P01') { // Invalid password/user
      logger.info('Database user might not exist, attempting to connect as postgres user');
      // This would require additional setup - for now log the error
      logger.error('Database user creation required. Please ensure the database user exists.');
    }
    logger.error('Error checking/creating database:', error.message);
    // Continue anyway - the database might exist
  } finally {
    await adminClient.end();
  }
};

export const getPool = () => {
  if (usePostgreSQL()) {
    if (!pool) {
      throw new Error('Database pool not initialized. Call connectDatabase() first.');
    }
    return pool;
  } else {
    if (!db) {
      throw new Error('Database not initialized. Call connectDatabase() first.');
    }
    return db;
  }
};

export const query = async (text, params) => {
  const start = Date.now();
  try {
    let result;
    
    if (usePostgreSQL()) {
      result = await pool.query(text, params);
    } else {
      // Convert PostgreSQL query to SQLite format
      const sqliteQuery = convertPostgresToSQLite(text);
      result = await db.all(sqliteQuery, params);
      // Format result to match PostgreSQL structure
      result = { rows: result };
    }
    
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${duration}ms`, { query: text, duration });
    }
    
    return result;
  } catch (error) {
    logger.error('Database query error:', { query: text, error: error.message });
    throw error;
  }
};

// Simple PostgreSQL to SQLite query converter
const convertPostgresToSQLite = (query) => {
  return query
    .replace(/\$(\d+)/g, '?') // Replace $1, $2, etc. with ?
    .replace(/SERIAL/gi, 'INTEGER') // Replace SERIAL with INTEGER
    .replace(/UUID/gi, 'TEXT') // Replace UUID with TEXT
    .replace(/TIMESTAMP/gi, 'DATETIME') // Replace TIMESTAMP with DATETIME
    .replace(/JSONB/gi, 'TEXT') // Replace JSONB with TEXT
    .replace(/TEXT\[\]/gi, 'TEXT') // Replace TEXT[] with TEXT
    .replace(/CURRENT_TIMESTAMP/gi, 'datetime("now")') // Replace CURRENT_TIMESTAMP
    .replace(/NOW\(\)/gi, 'datetime("now")'); // Replace NOW()
};

const createSQLiteTables = async () => {
  try {
    // Users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        date_of_birth DATE,
        profile_image TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin')),
        email_verified BOOLEAN DEFAULT FALSE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret TEXT,
        last_login DATETIME,
        login_attempts INTEGER DEFAULT 0,
        locked_until DATETIME,
        preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      )
    `);

    // Events table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        title TEXT NOT NULL,
        description TEXT,
        short_description TEXT,
        category TEXT NOT NULL,
        subcategory TEXT,
        organizer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        venue_name TEXT NOT NULL,
        venue_address TEXT NOT NULL,
        venue_city TEXT NOT NULL,
        venue_state TEXT,
        venue_country TEXT NOT NULL,
        venue_postal_code TEXT,
        venue_latitude REAL,
        venue_longitude REAL,
        venue_capacity INTEGER,
        start_datetime DATETIME NOT NULL,
        end_datetime DATETIME NOT NULL,
        timezone TEXT DEFAULT 'UTC',
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
        is_public BOOLEAN DEFAULT TRUE,
        featured_image TEXT,
        gallery_images TEXT DEFAULT '[]',
        tags TEXT,
        age_restriction INTEGER DEFAULT 0,
        dress_code TEXT,
        parking_info TEXT,
        accessibility_info TEXT,
        refund_policy TEXT,
        terms_conditions TEXT,
        social_links TEXT DEFAULT '{}',
        seo_title TEXT,
        seo_description TEXT,
        seo_keywords TEXT,
        deleted_at DATETIME,
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      )
    `);

    // Ticket types table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_types (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        quantity_total INTEGER NOT NULL,
        quantity_sold INTEGER DEFAULT 0,
        min_purchase INTEGER DEFAULT 1,
        max_purchase INTEGER DEFAULT 10,
        sale_start DATETIME,
        sale_end DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        perks TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      )
    `);

    // Tickets table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        ticket_type_id TEXT REFERENCES ticket_types(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        order_id TEXT NOT NULL,
        ticket_code TEXT UNIQUE NOT NULL,
        qr_code TEXT,
        nft_token_id TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'refunded', 'transferred')),
        purchase_price REAL NOT NULL,
        fees REAL DEFAULT 0,
        attendee_name TEXT,
        attendee_email TEXT,
        check_in_time DATETIME,
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      )
    `);

    // Orders table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
        order_number TEXT UNIQUE NOT NULL,
        total_amount REAL NOT NULL,
        fees REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
        payment_method TEXT,
        payment_reference TEXT,
        billing_address TEXT,
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      )
    `);

    // Analytics events table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        event_type TEXT NOT NULL,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
        properties TEXT DEFAULT '{}',
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        created_at DATETIME DEFAULT (datetime('now'))
      )
    `);

    // Reviews table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        helpful_count INTEGER DEFAULT 0,
        reported_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now')),
        UNIQUE(event_id, user_id)
      )
    `);

    // Create indexes for performance
    await db.exec('CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_events_category ON events(category)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(start_datetime)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_events_location ON events(venue_city, venue_country)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at)');

    logger.info('SQLite database tables created successfully');
    
    // Add missing columns if they don't exist (for existing databases)
    await addMissingColumns();
  } catch (error) {
    logger.error('Error creating SQLite database tables:', error);
    throw error;
  }
};

const addMissingColumns = async () => {
  try {
    // Check if is_public column exists, if not add it
    const tableInfo = await db.all("PRAGMA table_info(events)");
    const hasIsPublic = tableInfo.some(col => col.name === 'is_public');
    const hasDeletedAt = tableInfo.some(col => col.name === 'deleted_at');
    
    if (!hasIsPublic) {
      await db.exec('ALTER TABLE events ADD COLUMN is_public BOOLEAN DEFAULT TRUE');
      logger.info('Added is_public column to events table');
    }
    
    if (!hasDeletedAt) {
      await db.exec('ALTER TABLE events ADD COLUMN deleted_at DATETIME');
      logger.info('Added deleted_at column to events table');
    }
  } catch (error) {
    logger.error('Error adding missing columns:', error);
    // Don't throw - this is non-critical for new installations
  }
};

const createTables = async () => {
  try {
    // Enable UUID extension
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        date_of_birth DATE,
        profile_image VARCHAR(500),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin')),
        email_verified BOOLEAN DEFAULT FALSE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret VARCHAR(32),
        last_login TIMESTAMP,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Events table
    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        short_description VARCHAR(500),
        category VARCHAR(50) NOT NULL,
        subcategory VARCHAR(50),
        organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        venue_name VARCHAR(255) NOT NULL,
        venue_address TEXT NOT NULL,
        venue_city VARCHAR(100) NOT NULL,
        venue_state VARCHAR(100),
        venue_country VARCHAR(100) NOT NULL,
        venue_postal_code VARCHAR(20),
        venue_latitude DECIMAL(10, 8),
        venue_longitude DECIMAL(11, 8),
        venue_capacity INTEGER,
        start_datetime TIMESTAMP NOT NULL,
        end_datetime TIMESTAMP NOT NULL,
        timezone VARCHAR(50) DEFAULT 'UTC',
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
        featured_image VARCHAR(500),
        gallery_images JSONB DEFAULT '[]',
        tags TEXT[],
        age_restriction INTEGER DEFAULT 0,
        dress_code VARCHAR(100),
        parking_info TEXT,
        accessibility_info TEXT,
        refund_policy TEXT,
        terms_conditions TEXT,
        social_links JSONB DEFAULT '{}',
        seo_title VARCHAR(255),
        seo_description VARCHAR(500),
        seo_keywords TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ticket types table
    await query(`
      CREATE TABLE IF NOT EXISTS ticket_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        quantity_total INTEGER NOT NULL,
        quantity_sold INTEGER DEFAULT 0,
        min_purchase INTEGER DEFAULT 1,
        max_purchase INTEGER DEFAULT 10,
        sale_start TIMESTAMP,
        sale_end TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        perks JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tickets table
    await query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        order_id UUID NOT NULL,
        ticket_code VARCHAR(50) UNIQUE NOT NULL,
        qr_code VARCHAR(500),
        nft_token_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'refunded', 'transferred')),
        purchase_price DECIMAL(10, 2) NOT NULL,
        fees DECIMAL(10, 2) DEFAULT 0,
        attendee_name VARCHAR(200),
        attendee_email VARCHAR(255),
        check_in_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        order_number VARCHAR(20) UNIQUE NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        fees DECIMAL(10, 2) DEFAULT 0,
        tax DECIMAL(10, 2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        billing_address JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Analytics events table
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_type VARCHAR(50) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_id UUID REFERENCES events(id) ON DELETE SET NULL,
        properties JSONB DEFAULT '{}',
        session_id VARCHAR(100),
        ip_address INET,
        user_agent TEXT,
        referrer VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reviews table
    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        helpful_count INTEGER DEFAULT 0,
        reported_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id)
      )
    `);

    // Create indexes for performance
    await query('CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_events_category ON events(category)');
    await query('CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(start_datetime)');
    await query('CREATE INDEX IF NOT EXISTS idx_events_location ON events(venue_city, venue_country)');
    await query('CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)');
    await query('CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at)');

    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error('Error creating database tables:', error);
    throw error;
  }
};

// Export default object with all database functions
export default {
  connectDatabase,
  createTables,
  createSQLiteTables,
  query,
  getClient: () => usePostgreSQL() ? pool.connect() : db
};