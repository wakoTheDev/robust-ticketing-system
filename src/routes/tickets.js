/**
 * RobustTicketing - Backend Routes: Tickets
 * Ticket management and purchase endpoints with security
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Rate limiting for ticket purchases
const purchaseLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 purchase attempts per 5 minutes
  message: { error: 'Too many purchase attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const ticketTypeSchema = {
  name: { required: true, minLength: 2, maxLength: 100 },
  description: { maxLength: 500 },
  price: { required: true, type: 'number', min: 0 },
  quantity: { required: true, type: 'number', min: 1, max: 100000 },
  saleStartDate: { type: 'datetime' },
  saleEndDate: { type: 'datetime' },
  maxPerOrder: { type: 'number', min: 1, max: 100 },
  isActive: { type: 'boolean', default: true }
};

const purchaseSchema = {
  eventId: { required: true, type: 'uuid' },
  tickets: { 
    required: true, 
    type: 'array',
    minLength: 1,
    maxLength: 20,
    items: {
      ticketTypeId: { required: true, type: 'uuid' },
      quantity: { required: true, type: 'number', min: 1, max: 10 }
    }
  },
  customerInfo: {
    required: true,
    firstName: { required: true, minLength: 1, maxLength: 100 },
    lastName: { required: true, minLength: 1, maxLength: 100 },
    email: { required: true, type: 'email' },
    phone: { minLength: 10, maxLength: 20 }
  }
};

// Helper functions
const generateTicketCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const calculateOrderTotal = (ticketTypes, ticketQuantities) => {
  let total = 0;
  ticketTypes.forEach(type => {
    const quantity = ticketQuantities[type.id] || 0;
    total += type.price * quantity;
  });
  return total;
};

const formatTicketData = (ticket) => {
  return {
    id: ticket.id,
    code: ticket.code,
    status: ticket.status,
    customerFirstName: ticket.customer_first_name,
    customerLastName: ticket.customer_last_name,
    customerEmail: ticket.customer_email,
    customerPhone: ticket.customer_phone,
    purchaseDate: ticket.purchase_date,
    validatedAt: ticket.validated_at,
    transferredAt: ticket.transferred_at,
    transferredTo: ticket.transferred_to,
    createdAt: ticket.created_at,
    ticketType: {
      id: ticket.ticket_type_id,
      name: ticket.ticket_name,
      description: ticket.ticket_description,
      price: parseFloat(ticket.ticket_price)
    },
    event: {
      id: ticket.event_id,
      title: ticket.event_title,
      startDate: ticket.event_start_date,
      endDate: ticket.event_end_date,
      venue: ticket.event_venue,
      address: ticket.event_address
    },
    order: {
      id: ticket.order_id,
      totalAmount: parseFloat(ticket.order_total)
    }
  };
};

// Routes

// GET /api/events/:eventId/ticket-types - Get ticket types for event
router.get('/events/:eventId/ticket-types', async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Validate event ID format
    if (!eventId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }

    // Check if event exists and is public
    const eventQuery = `
      SELECT id, title, status, is_public FROM events 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const eventResult = await db.query(eventQuery, [eventId]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    if (!event.is_public && (!req.user || req.user.id !== event.organizer_id)) {
      return res.status(403).json({ error: 'Event is not public' });
    }

    // Get ticket types with availability
    const query = `
      SELECT tt.*, 
             COUNT(t.id) as sold_count,
             (tt.quantity - COUNT(t.id)) as available_count
      FROM ticket_types tt
      LEFT JOIN tickets t ON tt.id = t.ticket_type_id AND t.status != 'cancelled'
      WHERE tt.event_id = $1 AND tt.deleted_at IS NULL
      GROUP BY tt.id
      ORDER BY tt.price ASC
    `;

    const result = await db.query(query, [eventId]);
    const ticketTypes = result.rows.map(tt => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price: parseFloat(tt.price),
      quantity: tt.quantity,
      soldCount: parseInt(tt.sold_count) || 0,
      availableCount: parseInt(tt.available_count),
      saleStartDate: tt.sale_start_date,
      saleEndDate: tt.sale_end_date,
      maxPerOrder: tt.max_per_order || 10,
      isActive: tt.is_active,
      isAvailable: tt.is_active && 
                  (parseInt(tt.available_count) > 0) &&
                  (!tt.sale_start_date || new Date(tt.sale_start_date) <= new Date()) &&
                  (!tt.sale_end_date || new Date(tt.sale_end_date) >= new Date())
    }));

    res.json({ ticketTypes });

  } catch (error) {
    logError(error, 'GET_TICKET_TYPES_ERROR', { eventId: req.params.eventId });
    res.status(500).json({ error: 'Failed to retrieve ticket types' });
  }
});

// POST /api/events/:eventId/ticket-types - Create ticket type
router.post('/events/:eventId/ticket-types',
  authenticateToken,
  validateRequest(ticketTypeSchema),
  async (req, res) => {
    try {
      const eventId = req.params.eventId;
      const userId = req.user.id;
      const ticketData = req.body;

      // Check if user owns the event
      const eventQuery = `
        SELECT * FROM events 
        WHERE id = $1 AND organizer_id = $2 AND deleted_at IS NULL
      `;
      const eventResult = await db.query(eventQuery, [eventId, userId]);

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found or access denied' });
      }

      // Validate sale dates
      if (ticketData.saleStartDate && ticketData.saleEndDate) {
        const startDate = new Date(ticketData.saleStartDate);
        const endDate = new Date(ticketData.saleEndDate);
        
        if (endDate <= startDate) {
          return res.status(400).json({ error: 'Sale end date must be after start date' });
        }
      }

      const ticketTypeId = uuidv4();
      const query = `
        INSERT INTO ticket_types (
          id, event_id, name, description, price, quantity, 
          sale_start_date, sale_end_date, max_per_order, is_active,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
        ) RETURNING *
      `;

      const values = [
        ticketTypeId,
        eventId,
        ticketData.name,
        ticketData.description || null,
        ticketData.price,
        ticketData.quantity,
        ticketData.saleStartDate || null,
        ticketData.saleEndDate || null,
        ticketData.maxPerOrder || 10,
        ticketData.isActive !== false
      ];

      const result = await db.query(query, values);
      const ticketType = result.rows[0];

      logActivity(userId, 'TICKET_TYPE_CREATED', { 
        eventId, 
        ticketTypeId,
        name: ticketData.name 
      });

      res.status(201).json({
        ticketType: {
          id: ticketType.id,
          name: ticketType.name,
          description: ticketType.description,
          price: parseFloat(ticketType.price),
          quantity: ticketType.quantity,
          saleStartDate: ticketType.sale_start_date,
          saleEndDate: ticketType.sale_end_date,
          maxPerOrder: ticketType.max_per_order,
          isActive: ticketType.is_active
        },
        message: 'Ticket type created successfully'
      });

    } catch (error) {
      logError(error, 'CREATE_TICKET_TYPE_ERROR', { 
        eventId: req.params.eventId,
        userId: req.user?.id 
      });
      res.status(500).json({ error: 'Failed to create ticket type' });
    }
  }
);

// POST /api/tickets/purchase - Purchase tickets
router.post('/purchase',
  authenticateToken,
  purchaseLimit,
  validateRequest(purchaseSchema),
  async (req, res) => {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const userId = req.user.id;
      const { eventId, tickets: ticketOrders, customerInfo } = req.body;

      // Validate event exists and is available for purchase
      const eventQuery = `
        SELECT * FROM events 
        WHERE id = $1 AND deleted_at IS NULL AND status = 'published'
      `;
      const eventResult = await client.query(eventQuery, [eventId]);

      if (eventResult.rows.length === 0) {
        throw new Error('Event not found or not available for purchase');
      }

      const event = eventResult.rows[0];
      const now = new Date();

      if (new Date(event.start_date) <= now) {
        throw new Error('Cannot purchase tickets for events that have already started');
      }

      // Get ticket types and check availability
      const ticketTypeIds = ticketOrders.map(order => order.ticketTypeId);
      const ticketTypesQuery = `
        SELECT tt.*, COUNT(t.id) as sold_count
        FROM ticket_types tt
        LEFT JOIN tickets t ON tt.id = t.ticket_type_id AND t.status != 'cancelled'
        WHERE tt.id = ANY($1) AND tt.event_id = $2 AND tt.deleted_at IS NULL
        GROUP BY tt.id
      `;
      const ticketTypesResult = await client.query(ticketTypesQuery, [ticketTypeIds, eventId]);

      if (ticketTypesResult.rows.length !== ticketTypeIds.length) {
        throw new Error('One or more ticket types not found');
      }

      const ticketTypes = ticketTypesResult.rows;
      const ticketQuantities = {};
      let totalAmount = 0;

      // Validate each ticket order
      for (const order of ticketOrders) {
        const ticketType = ticketTypes.find(tt => tt.id === order.ticketTypeId);
        
        if (!ticketType.is_active) {
          throw new Error(`Ticket type "${ticketType.name}" is not active`);
        }

        // Check sale period
        if (ticketType.sale_start_date && new Date(ticketType.sale_start_date) > now) {
          throw new Error(`Sales for "${ticketType.name}" have not started yet`);
        }

        if (ticketType.sale_end_date && new Date(ticketType.sale_end_date) < now) {
          throw new Error(`Sales for "${ticketType.name}" have ended`);
        }

        // Check quantity limits
        if (order.quantity > ticketType.max_per_order) {
          throw new Error(`Maximum ${ticketType.max_per_order} tickets allowed per order for "${ticketType.name}"`);
        }

        const availableCount = ticketType.quantity - (parseInt(ticketType.sold_count) || 0);
        if (order.quantity > availableCount) {
          throw new Error(`Only ${availableCount} tickets available for "${ticketType.name}"`);
        }

        ticketQuantities[ticketType.id] = order.quantity;
        totalAmount += ticketType.price * order.quantity;
      }

      // Create order
      const orderId = uuidv4();
      const orderQuery = `
        INSERT INTO orders (
          id, user_id, event_id, total_amount, status, 
          customer_first_name, customer_last_name, customer_email, customer_phone,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'pending', $5, $6, $7, $8, NOW(), NOW()
        ) RETURNING *
      `;

      const orderValues = [
        orderId,
        userId,
        eventId,
        totalAmount,
        customerInfo.firstName,
        customerInfo.lastName,
        customerInfo.email,
        customerInfo.phone || null
      ];

      const orderResult = await client.query(orderQuery, orderValues);

      // Create tickets
      const createdTickets = [];
      for (const order of ticketOrders) {
        const ticketType = ticketTypes.find(tt => tt.id === order.ticketTypeId);
        
        for (let i = 0; i < order.quantity; i++) {
          const ticketId = uuidv4();
          const ticketCode = generateTicketCode();

          const ticketQuery = `
            INSERT INTO tickets (
              id, code, order_id, ticket_type_id, status,
              customer_first_name, customer_last_name, customer_email, customer_phone,
              purchase_date, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, 'valid', $5, $6, $7, $8, NOW(), NOW(), NOW()
            ) RETURNING *
          `;

          const ticketValues = [
            ticketId,
            ticketCode,
            orderId,
            order.ticketTypeId,
            customerInfo.firstName,
            customerInfo.lastName,
            customerInfo.email,
            customerInfo.phone || null
          ];

          const ticketResult = await client.query(ticketQuery, ticketValues);
          createdTickets.push({
            ...ticketResult.rows[0],
            ticketType: {
              name: ticketType.name,
              price: parseFloat(ticketType.price)
            }
          });
        }
      }

      // Update order status to completed
      await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        ['completed', orderId]
      );

      await client.query('COMMIT');

      logActivity(userId, 'TICKETS_PURCHASED', {
        orderId,
        eventId,
        totalAmount,
        ticketCount: createdTickets.length
      });

      res.status(201).json({
        order: {
          id: orderId,
          totalAmount,
          status: 'completed',
          ticketCount: createdTickets.length
        },
        tickets: createdTickets.map(ticket => ({
          id: ticket.id,
          code: ticket.code,
          ticketType: ticket.ticketType
        })),
        message: 'Tickets purchased successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      logError(error, 'PURCHASE_TICKETS_ERROR', { 
        userId: req.user?.id,
        eventId: req.body?.eventId 
      });
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  }
);

// GET /api/tickets/my-tickets - Get user's tickets
router.get('/my-tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, eventId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT t.*, tt.name as ticket_name, tt.description as ticket_description, tt.price as ticket_price,
             e.id as event_id, e.title as event_title, e.start_date as event_start_date, 
             e.end_date as event_end_date, e.venue as event_venue, e.address as event_address,
             o.id as order_id, o.total_amount as order_total
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN events e ON tt.event_id = e.id
      JOIN orders o ON t.order_id = o.id
      WHERE o.user_id = $1 AND t.deleted_at IS NULL
    `;
    
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (eventId) {
      query += ` AND e.id = $${paramIndex}`;
      params.push(eventId);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);
    const tickets = result.rows.map(formatTicketData);

    // Get total count
    let countQuery = `
      SELECT COUNT(t.id) as total
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN events e ON tt.event_id = e.id
      JOIN orders o ON t.order_id = o.id
      WHERE o.user_id = $1 AND t.deleted_at IS NULL
    `;
    
    const countParams = [userId];
    let countParamIndex = 2;

    if (status) {
      countQuery += ` AND t.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (eventId) {
      countQuery += ` AND e.id = $${countParamIndex}`;
      countParams.push(eventId);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logError(error, 'GET_MY_TICKETS_ERROR', { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve tickets' });
  }
});

// GET /api/tickets/:id - Get single ticket
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;

    const query = `
      SELECT t.*, tt.name as ticket_name, tt.description as ticket_description, tt.price as ticket_price,
             e.id as event_id, e.title as event_title, e.start_date as event_start_date, 
             e.end_date as event_end_date, e.venue as event_venue, e.address as event_address,
             o.id as order_id, o.total_amount as order_total
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN events e ON tt.event_id = e.id
      JOIN orders o ON t.order_id = o.id
      WHERE t.id = $1 AND o.user_id = $2 AND t.deleted_at IS NULL
    `;

    const result = await db.query(query, [ticketId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = formatTicketData(result.rows[0]);

    res.json({ ticket });

  } catch (error) {
    logError(error, 'GET_TICKET_ERROR', { 
      ticketId: req.params.id,
      userId: req.user?.id 
    });
    res.status(500).json({ error: 'Failed to retrieve ticket' });
  }
});

// POST /api/tickets/validate - Validate ticket at event
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Ticket code is required' });
    }

    const query = `
      SELECT t.*, tt.name as ticket_name, e.title as event_title, e.start_date, e.end_date
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN events e ON tt.event_id = e.id
      WHERE t.code = $1 AND t.deleted_at IS NULL
    `;

    const result = await db.query(query, [code.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        valid: false,
        error: 'Invalid ticket code' 
      });
    }

    const ticket = result.rows[0];
    const now = new Date();
    const eventStart = new Date(ticket.start_date);
    const eventEnd = new Date(ticket.end_date);

    // Check ticket status
    if (ticket.status === 'cancelled') {
      return res.status(400).json({
        valid: false,
        error: 'Ticket has been cancelled'
      });
    }

    if (ticket.status === 'used') {
      return res.status(400).json({
        valid: false,
        error: 'Ticket has already been used',
        validatedAt: ticket.validated_at
      });
    }

    // Check event timing
    if (now < eventStart) {
      return res.status(400).json({
        valid: false,
        error: 'Event has not started yet'
      });
    }

    if (now > eventEnd) {
      return res.status(400).json({
        valid: false,
        error: 'Event has already ended'
      });
    }

    // Mark ticket as validated
    const updateQuery = `
      UPDATE tickets 
      SET status = 'used', validated_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const updateResult = await db.query(updateQuery, [ticket.id]);
    const validatedTicket = updateResult.rows[0];

    logActivity(null, 'TICKET_VALIDATED', {
      ticketId: ticket.id,
      ticketCode: code,
      eventTitle: ticket.event_title
    });

    res.json({
      valid: true,
      ticket: {
        id: validatedTicket.id,
        code: validatedTicket.code,
        customerName: `${validatedTicket.customer_first_name} ${validatedTicket.customer_last_name}`,
        ticketType: ticket.ticket_name,
        eventTitle: ticket.event_title,
        validatedAt: validatedTicket.validated_at
      },
      message: 'Ticket validated successfully'
    });

  } catch (error) {
    logError(error, 'VALIDATE_TICKET_ERROR', { code: req.body?.code });
    res.status(500).json({ error: 'Failed to validate ticket' });
  }
});

export default router;