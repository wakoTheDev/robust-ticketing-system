/**
 * RobustTicketing - Backend Routes: Events
 * Event management endpoints with security and validation
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

// Helper functions for logging
const logError = (error, type, metadata = {}) => {
  logger.error(`${type}: ${error.message}`, {
    type,
    error: error.message,
    stack: error.stack,
    ...metadata
  });
};

const logActivity = (userId, activity, metadata = {}) => {
  logger.info(`User activity: ${activity}`, {
    userId,
    activity,
    ...metadata
  });
};

const router = express.Router();

// Rate limiting for event creation
const createEventLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 events per 15 minutes
  message: { error: 'Too many events created. Please try again later.' }
});

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/events');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Validation schemas
const createEventSchema = {
  title: { required: true, minLength: 3, maxLength: 200 },
  description: { required: true, minLength: 10, maxLength: 5000 },
  category: { required: true, enum: ['music', 'sports', 'theater', 'comedy', 'conference', 'workshop', 'other'] },
  venue: { required: true, minLength: 3, maxLength: 200 },
  address: { required: true, minLength: 5, maxLength: 500 },
  city: { required: true, minLength: 2, maxLength: 100 },
  state: { minLength: 2, maxLength: 100 },
  country: { required: true, minLength: 2, maxLength: 100 },
  zipCode: { minLength: 3, maxLength: 20 },
  startDate: { required: true, type: 'datetime' },
  endDate: { required: true, type: 'datetime' },
  capacity: { required: true, type: 'number', min: 1, max: 1000000 },
  isPublic: { type: 'boolean', default: true },
  requiresApproval: { type: 'boolean', default: false },
  allowRefunds: { type: 'boolean', default: true },
  refundPolicy: { maxLength: 1000 }
};

const updateEventSchema = {
  title: { minLength: 3, maxLength: 200 },
  description: { minLength: 10, maxLength: 5000 },
  category: { enum: ['music', 'sports', 'theater', 'comedy', 'conference', 'workshop', 'other'] },
  venue: { minLength: 3, maxLength: 200 },
  address: { minLength: 5, maxLength: 500 },
  city: { minLength: 2, maxLength: 100 },
  state: { minLength: 2, maxLength: 100 },
  country: { minLength: 2, maxLength: 100 },
  zipCode: { minLength: 3, maxLength: 20 },
  startDate: { type: 'datetime' },
  endDate: { type: 'datetime' },
  capacity: { type: 'number', min: 1, max: 1000000 },
  isPublic: { type: 'boolean' },
  requiresApproval: { type: 'boolean' },
  allowRefunds: { type: 'boolean' },
  refundPolicy: { maxLength: 1000 }
};

// Helper functions
const buildEventQuery = (filters = {}) => {
  let query = `
    SELECT e.*, u.first_name as organizer_first_name, u.last_name as organizer_last_name,
           u.email as organizer_email, u.profile_image as organizer_avatar,
           COUNT(t.id) as total_tickets_sold,
           COALESCE(MIN(tt.price), 0) as min_price,
           COALESCE(MAX(tt.price), 0) as max_price
    FROM events e
    LEFT JOIN users u ON e.organizer_id = u.id
    LEFT JOIN ticket_types tt ON e.id = tt.event_id
    LEFT JOIN tickets t ON tt.id = t.ticket_type_id
    WHERE e.deleted_at IS NULL
  `;
  
  const params = [];
  let paramIndex = 1;

  if (filters.category) {
    query += ` AND e.category = $${paramIndex}`;
    params.push(filters.category);
    paramIndex++;
  }

  if (filters.city) {
    query += ` AND LOWER(e.city) LIKE LOWER($${paramIndex})`;
    params.push(`%${filters.city}%`);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (LOWER(e.title) LIKE LOWER($${paramIndex}) OR LOWER(e.description) LIKE LOWER($${paramIndex}))`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.startDate) {
    query += ` AND e.start_datetime >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
  }

  if (filters.endDate) {
    query += ` AND e.end_datetime <= $${paramIndex}`;
    params.push(filters.endDate);
    paramIndex++;
  }

  if (filters.isPublic !== undefined) {
    query += ` AND e.is_public = $${paramIndex}`;
    params.push(filters.isPublic);
    paramIndex++;
  }

  if (filters.organizerId) {
    query += ` AND e.organizer_id = $${paramIndex}`;
    params.push(filters.organizerId);
    paramIndex++;
  }

  query += ` GROUP BY e.id, u.id`;

  return { query, params, paramIndex };
};

const formatEventData = (event) => {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    short_description: event.short_description,
    category: event.category,
    venue_name: event.venue_name,
    venue_address: event.venue_address,
    venue_city: event.venue_city,
    venue_state: event.venue_state,
    venue_country: event.venue_country,
    venue_postal_code: event.venue_postal_code,
    start_datetime: event.start_datetime,
    end_datetime: event.end_datetime,
    venue_capacity: event.venue_capacity,
    is_public: event.is_public,
    status: event.status,
    featured_image: event.featured_image,
    organizer_id: event.organizer_id,
    min_price: event.min_price,
    max_price: event.max_price,
    organizer: {
      firstName: event.organizer_first_name,
      lastName: event.organizer_last_name,
      email: event.organizer_email,
      avatar: event.organizer_avatar
    },
    totalTicketsSold: parseInt(event.total_tickets_sold) || 0,
    minPrice: parseFloat(event.min_price) || 0,
    maxPrice: parseFloat(event.max_price) || 0,
    createdAt: event.created_at,
    updatedAt: event.updated_at
  };
};

// Routes

// GET /api/events - List events with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      city,
      search,
      startDate,
      endDate,
      featured,
      popular,
      nearby
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const filters = {
      category,
      city,
      search,
      startDate,
      endDate,
      isPublic: true
    };

    let { query: sqlQuery, params } = buildEventQuery(filters);

    // Handle special filters
    if (featured === 'true') {
      sqlQuery += ` AND e.is_featured = true`;
    }

    if (popular === 'true') {
      sqlQuery += ` ORDER BY total_tickets_sold DESC`;
    } else if (nearby === 'true' && req.query.lat && req.query.lng) {
      // Add location-based sorting (requires PostGIS or similar)
      sqlQuery += ` ORDER BY e.start_datetime ASC`;
    } else {
      sqlQuery += ` ORDER BY e.start_datetime ASC`;
    }

    sqlQuery += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const result = await query(sqlQuery, params);
    const events = result.rows.map(formatEventData);

    // Get total count for pagination
    const countQuery = buildEventQuery(filters);
    const countSql = `SELECT COUNT(DISTINCT e.id) as total ${countQuery.query.substring(countQuery.query.indexOf('FROM'))}`;
    const countResult = await query(countSql, countQuery.params);
    
    const total = parseInt(countResult.rows[0]?.total || 0);

    logger.info('Events listed', { 
      filters,
      page: parseInt(page),
      limit: parseInt(limit),
      total
    });

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logError(error, 'GET_EVENTS_ERROR', { query: req.query });
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
});

// GET /api/events/featured - Get featured events
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const sqlQuery = `
      SELECT e.*, u.first_name as organizer_first_name, u.last_name as organizer_last_name,
             COUNT(t.id) as total_tickets_sold,
             COALESCE(MIN(tt.price), 0) as min_price
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN ticket_types tt ON e.id = tt.event_id
      LEFT JOIN tickets t ON tt.id = t.ticket_type_id
      WHERE e.deleted_at IS NULL 
        AND e.is_public = true 
        AND e.is_featured = true
        AND e.start_date > datetime('now')
      GROUP BY e.id, u.id
      ORDER BY e.start_datetime ASC
      LIMIT ?
    `;

    const result = await query(sqlQuery, [parseInt(limit)]);
    const events = result.rows.map(formatEventData);

    res.json({ events });

  } catch (error) {
    logError(error, 'GET_FEATURED_EVENTS_ERROR');
    res.status(500).json({ error: 'Failed to retrieve featured events' });
  }
});

// GET /api/events/popular - Get popular events
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const sqlQuery = `
      SELECT e.*, u.first_name as organizer_first_name, u.last_name as organizer_last_name,
             COUNT(t.id) as total_tickets_sold,
             COALESCE(MIN(tt.price), 0) as min_price
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN ticket_types tt ON e.id = tt.event_id
      LEFT JOIN tickets t ON tt.id = t.ticket_type_id
      WHERE e.deleted_at IS NULL 
        AND e.is_public = true
        AND e.start_date > datetime('now')
      GROUP BY e.id, u.id
      HAVING COUNT(t.id) > 0
      ORDER BY COUNT(t.id) DESC, e.start_date ASC
      LIMIT ?
    `;

    const result = await query(sqlQuery, [parseInt(limit)]);
    const events = result.rows.map(formatEventData);

    res.json({ events });

  } catch (error) {
    logError(error, 'GET_POPULAR_EVENTS_ERROR');
    res.status(500).json({ error: 'Failed to retrieve popular events' });
  }
});

// GET /api/events/search - Search events
router.get('/search', async (req, res) => {
  try {
    const { q, category, city, date, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const filters = {
      search: q.trim(),
      category,
      city,
      startDate: date,
      isPublic: true
    };

    let { query: sqlQuery, params } = buildEventQuery(filters);
    sqlQuery += ` ORDER BY e.start_datetime ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const result = await query(sqlQuery, params);
    const events = result.rows.map(formatEventData);

    logActivity(req.user?.id, 'EVENTS_SEARCHED', { 
      query: q,
      filters: { category, city, date },
      resultsCount: events.length
    });

    res.json({ events, query: q });

  } catch (error) {
    logError(error, 'SEARCH_EVENTS_ERROR', { query: req.query });
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    if (!eventId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }

    const { query: sqlQuery, params } = buildEventQuery();
    const fullQuery = `${sqlQuery} AND e.id = ? GROUP BY e.id, u.id`;
    params.push(eventId);

    const result = await query(fullQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = formatEventData(result.rows[0]);

    // Get ticket types for this event
    const ticketTypesQuery = `
      SELECT tt.*, COUNT(t.id) as sold_count
      FROM ticket_types tt
      LEFT JOIN tickets t ON tt.id = t.ticket_type_id
      WHERE tt.event_id = $1 AND tt.deleted_at IS NULL
      GROUP BY tt.id
      ORDER BY tt.price ASC
    `;

    const ticketTypesResult = await query(ticketTypesQuery, [eventId]);
    event.ticketTypes = ticketTypesResult.rows.map(tt => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price: parseFloat(tt.price),
      quantity: tt.quantity,
      soldCount: parseInt(tt.sold_count) || 0,
      availableCount: tt.quantity - (parseInt(tt.sold_count) || 0),
      saleStartDate: tt.sale_start_date,
      saleEndDate: tt.sale_end_date,
      isActive: tt.is_active
    }));

    logActivity(req.user?.id, 'EVENT_VIEWED', { eventId });

    res.json({ event });

  } catch (error) {
    logError(error, 'GET_EVENT_ERROR', { eventId: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve event' });
  }
});

// POST /api/events - Create new event
router.post('/', 
  authenticateToken,
  createEventLimit,
  validateRequest(createEventSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const eventData = req.body;

      // Validate dates
      const startDate = new Date(eventData.startDate);
      const endDate = new Date(eventData.endDate);
      const now = new Date();

      if (startDate <= now) {
        return res.status(400).json({ error: 'Event start date must be in the future' });
      }

      if (endDate <= startDate) {
        return res.status(400).json({ error: 'Event end date must be after start date' });
      }

      const eventId = uuidv4();

      const sqlQuery = `
        INSERT INTO events (
          id, title, description, category, venue, address, city, state, country, zip_code,
          start_date, end_date, capacity, is_public, requires_approval, allow_refunds,
          refund_policy, organizer_id, status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'), datetime('now')
        )
      `;

      const values = [
        eventId,
        eventData.title,
        eventData.description,
        eventData.category,
        eventData.venue,
        eventData.address,
        eventData.city,
        eventData.state || null,
        eventData.country,
        eventData.zipCode || null,
        startDate,
        endDate,
        eventData.capacity,
        eventData.isPublic !== false,
        eventData.requiresApproval === true,
        eventData.allowRefunds !== false,
        eventData.refundPolicy || null,
        userId
      ];

      await query(sqlQuery, values);
      
      // Get the created event
      const getCreatedQuery = `SELECT * FROM events WHERE id = ?`;
      const result = await query(getCreatedQuery, [eventId]);
      const event = formatEventData(result.rows[0]);

      logActivity(userId, 'EVENT_CREATED', { eventId, title: eventData.title });

      res.status(201).json({ 
        event,
        message: 'Event created successfully' 
      });

    } catch (error) {
      logError(error, 'CREATE_EVENT_ERROR', { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// PUT /api/events/:id - Update event
router.put('/:id',
  authenticateToken,
  validateRequest(updateEventSchema),
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user.id;
      const updateData = req.body;

      // Check if event exists and user has permission
      const checkQuery = `
        SELECT * FROM events 
        WHERE id = ? AND deleted_at IS NULL AND (organizer_id = ? OR EXISTS(SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?))
      `;
      const checkResult = await query(checkQuery, [eventId, userId, userId, 'admin']);

      if (checkResult.length === 0) {
        return res.status(404).json({ error: 'Event not found or access denied' });
      }

      const event = checkResult[0];

      // Validate dates if provided
      if (updateData.startDate || updateData.endDate) {
        const startDate = new Date(updateData.startDate || event.start_date);
        const endDate = new Date(updateData.endDate || event.end_date);

        if (endDate <= startDate) {
          return res.status(400).json({ error: 'Event end date must be after start date' });
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbField} = $${paramIndex}`);
        updateValues.push(updateData[key]);
        paramIndex++;
      });

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push(`updated_at = datetime('now')`);

      const updateQuery = `
        UPDATE events 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      updateValues.push(eventId);

      await query(updateQuery, updateValues);
      
      // Get the updated event
      const getUpdatedQuery = `SELECT * FROM events WHERE id = ?`;
      const result = await query(getUpdatedQuery, [eventId]);
      const updatedEvent = formatEventData(result[0]);

      logActivity(userId, 'EVENT_UPDATED', { eventId, changes: Object.keys(updateData) });

      res.json({ 
        event: updatedEvent,
        message: 'Event updated successfully' 
      });

    } catch (error) {
      logError(error, 'UPDATE_EVENT_ERROR', { 
        eventId: req.params.id,
        userId: req.user?.id 
      });
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// DELETE /api/events/:id - Delete event
router.delete('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user.id;

      // Check if event exists and user has permission
      const checkQuery = `
        SELECT e.*, COUNT(t.id) as ticket_count
        FROM events e
        LEFT JOIN ticket_types tt ON e.id = tt.event_id
        LEFT JOIN tickets t ON tt.id = t.ticket_type_id
        WHERE e.id = ? AND e.deleted_at IS NULL 
          AND (e.organizer_id = ? OR EXISTS(SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?))
        GROUP BY e.id
      `;
      const checkResult = await query(checkQuery, [eventId, userId, userId, 'admin']);

      if (checkResult.length === 0) {
        return res.status(404).json({ error: 'Event not found or access denied' });
      }

      const event = checkResult[0];
      const ticketCount = parseInt(event.ticket_count) || 0;

      // Prevent deletion if tickets have been sold
      if (ticketCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete event with sold tickets. Please cancel the event instead.' 
        });
      }

      // Soft delete the event
      const deleteQuery = `
        UPDATE events 
        SET deleted_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `;
      await query(deleteQuery, [eventId]);

      logActivity(userId, 'EVENT_DELETED', { eventId, title: event.title });

      res.json({ message: 'Event deleted successfully' });

    } catch (error) {
      logError(error, 'DELETE_EVENT_ERROR', { 
        eventId: req.params.id,
        userId: req.user?.id 
      });
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
);

// POST /api/events/:id/publish - Publish event
router.post('/:id/publish',
  authenticateToken,
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user.id;

      // Check if event exists and user has permission
      const checkQuery = `
        SELECT * FROM events 
        WHERE id = ? AND deleted_at IS NULL AND organizer_id = ?
      `;
      const checkResult = await query(checkQuery, [eventId, userId]);

      if (checkResult.length === 0) {
        return res.status(404).json({ error: 'Event not found or access denied' });
      }

      const event = checkResult[0];

      if (event.status === 'published') {
        return res.status(400).json({ error: 'Event is already published' });
      }

      // Validate event has required data for publishing
      const ticketTypesQuery = `
        SELECT COUNT(*) as count FROM ticket_types 
        WHERE event_id = ? AND deleted_at IS NULL
      `;
      const ticketTypesResult = await query(ticketTypesQuery, [eventId]);
      const ticketTypesCount = parseInt(ticketTypesResult[0].count);

      if (ticketTypesCount === 0) {
        return res.status(400).json({ 
          error: 'Cannot publish event without ticket types. Please add at least one ticket type.' 
        });
      }

      // Update event status
      const updateQuery = `
        UPDATE events 
        SET status = 'published', updated_at = datetime('now')
        WHERE id = ?
      `;
      await query(updateQuery, [eventId]);
      
      // Get the updated event
      const getUpdatedQuery = `SELECT * FROM events WHERE id = ?`;
      const result = await query(getUpdatedQuery, [eventId]);
      const updatedEvent = formatEventData(result[0]);

      logActivity(userId, 'EVENT_PUBLISHED', { eventId, title: event.title });

      res.json({ 
        event: updatedEvent,
        message: 'Event published successfully' 
      });

    } catch (error) {
      logError(error, 'PUBLISH_EVENT_ERROR', { 
        eventId: req.params.id,
        userId: req.user?.id 
      });
      res.status(500).json({ error: 'Failed to publish event' });
    }
  }
);

// POST /api/events/:id/image - Upload event image
router.post('/:id/image',
  authenticateToken,
  upload.single('image'),
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Check if event exists and user has permission
      const checkQuery = `
        SELECT * FROM events 
        WHERE id = ? AND deleted_at IS NULL AND organizer_id = ?
      `;
      const checkResult = await query(checkQuery, [eventId, userId]);

      if (checkResult.length === 0) {
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({ error: 'Event not found or access denied' });
      }

      const imageUrl = `/uploads/events/${req.file.filename}`;

      // Update event with image URL
      const updateQuery = `
        UPDATE events 
        SET image_url = ?, updated_at = datetime('now')
        WHERE id = ?
      `;
      await query(updateQuery, [imageUrl, eventId]);
      
      // Get the updated event
      const getUpdatedQuery = `SELECT * FROM events WHERE id = ?`;
      const result = await query(getUpdatedQuery, [eventId]);
      const updatedEvent = formatEventData(result[0]);

      logActivity(userId, 'EVENT_IMAGE_UPLOADED', { eventId, imageUrl });

      res.json({ 
        event: updatedEvent,
        imageUrl,
        message: 'Event image uploaded successfully' 
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      
      logError(error, 'UPLOAD_EVENT_IMAGE_ERROR', { 
        eventId: req.params.id,
        userId: req.user?.id 
      });
      res.status(500).json({ error: 'Failed to upload event image' });
    }
  }
);

export default router;