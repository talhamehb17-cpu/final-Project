const { pool } = require('../db/pg');

async function updateOrderStatuses() {
  try {
    // transition 'pending' -> 'shipped' after 2 days
    const shippedRes = await pool.query(`
      UPDATE orders
      SET status = 'shipped'
      WHERE status = 'pending'
        AND created_at <= NOW() - INTERVAL '2 days'
      RETURNING order_id
    `);
    
    if (shippedRes.rowCount > 0) {
      console.log(`[Order Scheduler] Auto-shipped ${shippedRes.rowCount} orders:`, shippedRes.rows.map(r => r.order_id));
    }

    // transition 'shipped' -> 'delivered' after 6 days
    const deliveredRes = await pool.query(`
      UPDATE orders
      SET status = 'delivered'
      WHERE status = 'shipped'
        AND created_at <= NOW() - INTERVAL '6 days'
      RETURNING order_id
    `);

    if (deliveredRes.rowCount > 0) {
      console.log(`[Order Scheduler] Auto-delivered ${deliveredRes.rowCount} orders:`, deliveredRes.rows.map(r => r.order_id));
    }

  } catch (err) {
    console.error('[Order Scheduler] Error during status transitions:', err.message);
  }
}

function startOrderScheduler() {
  console.log('[Order Scheduler] Initialized.');
  // Run once immediately on start
  updateOrderStatuses();

  // Run every 10 minutes
  setInterval(updateOrderStatuses, 600000);
}

module.exports = { startOrderScheduler };
