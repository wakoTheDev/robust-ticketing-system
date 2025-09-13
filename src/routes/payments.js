/**
 * RobustTicketing - Payment Routes
 * Payment processing and management endpoints
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Mock payment processing for development
const processPayment = async (paymentData) => {
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate successful payment (90% success rate for testing)
  const success = Math.random() > 0.1;
  
  if (success) {
    return {
      success: true,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentIntentId: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    throw new Error('Payment failed - insufficient funds');
  }
};

// POST /api/payments/create-intent - Create payment intent
router.post('/create-intent', authenticateToken, async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    
    if (!orderId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid order ID and amount are required' });
    }
    
    // Verify order exists and belongs to user
    const orderQuery = `
      SELECT * FROM orders 
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
    `;
    
    const orderResult = await db.query(orderQuery, [orderId, req.user.id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or not eligible for payment' });
    }
    
    const order = orderResult.rows[0];
    
    if (parseFloat(order.total_amount) !== amount) {
      return res.status(400).json({ error: 'Amount mismatch' });
    }
    
    // Create payment intent (mock)
    const paymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      status: 'requires_payment_method',
      client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 16)}`
    };
    
    logger.info('Payment intent created', {
      orderId,
      paymentIntentId: paymentIntent.id,
      amount,
      userId: req.user.id
    });
    
    res.json({
      paymentIntent,
      message: 'Payment intent created successfully'
    });
    
  } catch (error) {
    logger.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// POST /api/payments/confirm - Confirm payment
router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId, orderId } = req.body;
    
    if (!paymentIntentId || !paymentMethodId || !orderId) {
      return res.status(400).json({ error: 'Payment intent ID, payment method ID, and order ID are required' });
    }
    
    // Verify order
    const orderQuery = `
      SELECT * FROM orders 
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
    `;
    
    const orderResult = await db.query(orderQuery, [orderId, req.user.id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or already processed' });
    }
    
    const order = orderResult.rows[0];
    
    // Process payment (mock)
    const paymentResult = await processPayment({
      paymentIntentId,
      paymentMethodId,
      amount: order.total_amount
    });
    
    if (paymentResult.success) {
      // Update order status
      const updateOrderQuery = `
        UPDATE orders 
        SET status = 'completed', payment_intent_id = $1, transaction_id = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      
      const updatedOrder = await db.query(updateOrderQuery, [
        paymentIntentId,
        paymentResult.transactionId,
        orderId
      ]);
      
      logger.info('Payment confirmed', {
        orderId,
        paymentIntentId,
        transactionId: paymentResult.transactionId,
        amount: order.total_amount,
        userId: req.user.id
      });
      
      res.json({
        payment: {
          status: 'succeeded',
          transactionId: paymentResult.transactionId,
          paymentIntentId
        },
        order: updatedOrder.rows[0],
        message: 'Payment processed successfully'
      });
    } else {
      throw new Error('Payment processing failed');
    }
    
  } catch (error) {
    logger.error('Confirm payment error:', error);
    res.status(400).json({ error: error.message || 'Payment confirmation failed' });
  }
});

// GET /api/payments/methods - Get user payment methods
router.get('/methods', authenticateToken, async (req, res) => {
  try {
    // Mock payment methods for development
    const paymentMethods = [
      {
        id: 'pm_1234567890',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025
        },
        isDefault: true
      }
    ];
    
    res.json({ paymentMethods });
    
  } catch (error) {
    logger.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to retrieve payment methods' });
  }
});

// POST /api/payments/refund - Process refund
router.post('/refund', authenticateToken, async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;
    
    if (!orderId || !amount || !reason) {
      return res.status(400).json({ error: 'Order ID, amount, and reason are required' });
    }
    
    // Verify order and user permission
    const orderQuery = `
      SELECT o.*, e.organizer_id 
      FROM orders o
      JOIN events e ON o.event_id = e.id
      WHERE o.id = $1 AND (o.user_id = $2 OR e.organizer_id = $2)
    `;
    
    const orderResult = await db.query(orderQuery, [orderId, req.user.id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or access denied' });
    }
    
    const order = orderResult.rows[0];
    
    if (order.status !== 'completed') {
      return res.status(400).json({ error: 'Order is not eligible for refund' });
    }
    
    if (amount > parseFloat(order.total_amount)) {
      return res.status(400).json({ error: 'Refund amount cannot exceed order total' });
    }
    
    // Process refund (mock)
    const refundId = `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update order with refund information
    const updateQuery = `
      UPDATE orders 
      SET status = 'refunded', refund_amount = $1, refund_reason = $2, 
          refund_id = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const updatedOrder = await db.query(updateQuery, [amount, reason, refundId, orderId]);
    
    logger.info('Refund processed', {
      orderId,
      refundId,
      amount,
      reason,
      userId: req.user.id
    });
    
    res.json({
      refund: {
        id: refundId,
        amount,
        reason,
        status: 'succeeded'
      },
      order: updatedOrder.rows[0],
      message: 'Refund processed successfully'
    });
    
  } catch (error) {
    logger.error('Process refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

export default router;