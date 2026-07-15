const express = require('express');
const { pool } = require('../db/pg');
const requireAdminAuth = require('../middleware/adminAuth');
const { adminActionLogger } = require('../middleware/adminLogger');
const { sanitizeString, sanitizeNumber } = require('../utils/sanitize');

const router = express.Router();

// Get all promo codes (admin only)
router.get('/', requireAdminAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM promo_codes WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (status === 'active') {
            query += ` AND is_active = true AND expiry_date > CURRENT_TIMESTAMP`;
        } else if (status === 'inactive') {
            query += ` AND (is_active = false OR expiry_date <= CURRENT_TIMESTAMP)`;
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM promo_codes WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;
        
        if (status === 'active') {
            countQuery += ` AND is_active = true AND expiry_date > CURRENT_TIMESTAMP`;
        } else if (status === 'inactive') {
            countQuery += ` AND (is_active = false OR expiry_date <= CURRENT_TIMESTAMP)`;
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        const promoCodes = result.rows.map(p => ({
            id: p.id,
            code: p.code,
            discountPercentage: parseFloat(p.discount_percentage),
            expiryDate: p.expiry_date,
            isActive: p.is_active,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            createdBy: p.created_by
        }));
        
        res.json({
            promoCodes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get promo codes error:', error);
        res.status(500).json({ message: 'Error fetching promo codes' });
    }
});

// Get single promo code (admin only)
router.get('/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM promo_codes WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Promo code not found' });
        }
        
        const p = result.rows[0];
        res.json({
            promoCode: {
                id: p.id,
                code: p.code,
                discountPercentage: parseFloat(p.discount_percentage),
                expiryDate: p.expiry_date,
                isActive: p.is_active,
                createdAt: p.created_at,
                updatedAt: p.updated_at,
                createdBy: p.created_by
            }
        });
    } catch (error) {
        console.error('Get promo code error:', error);
        res.status(500).json({ message: 'Error fetching promo code' });
    }
});

// Validate promo code (public - for checkout)
router.post('/validate', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ message: 'Promo code is required' });
        }
        
        const sanitizedCode = sanitizeString(code, 50).toUpperCase();
        
        const result = await pool.query(
            `SELECT * FROM promo_codes 
             WHERE code = $1 AND is_active = true AND expiry_date > CURRENT_TIMESTAMP`,
            [sanitizedCode]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ 
                valid: false,
                message: 'Invalid or expired promo code' 
            });
        }
        
        const p = result.rows[0];
        res.json({
            valid: true,
            promoCode: {
                code: p.code,
                discountPercentage: parseFloat(p.discount_percentage),
                expiryDate: p.expiry_date
            }
        });
    } catch (error) {
        console.error('Validate promo code error:', error);
        res.status(500).json({ message: 'Error validating promo code' });
    }
});

// Create promo code (admin only)
router.post('/', requireAdminAuth, adminActionLogger('CREATE_PROMO_CODE'), async (req, res) => {
    try {
        const { code, discountPercentage, expiryDate, isActive = true } = req.body;
        
        const sanitizedCode = sanitizeString(code, 50).toUpperCase();
        const sanitizedDiscount = sanitizeNumber(discountPercentage, 1, 100);
        
        if (!sanitizedCode || sanitizedCode.length < 3) {
            return res.status(400).json({ message: 'Promo code must be at least 3 characters' });
        }
        if (!sanitizedDiscount) {
            return res.status(400).json({ message: 'Discount percentage must be between 1 and 100' });
        }
        if (!expiryDate) {
            return res.status(400).json({ message: 'Expiry date is required' });
        }
        
        const expiryDateObj = new Date(expiryDate);
        if (isNaN(expiryDateObj.getTime())) {
            return res.status(400).json({ message: 'Invalid expiry date' });
        }
        
        if (expiryDateObj <= new Date()) {
            return res.status(400).json({ message: 'Expiry date must be in the future' });
        }
        
        const createdBy = req.admin?.email || 'admin';
        
        const result = await pool.query(
            `INSERT INTO promo_codes (code, discount_percentage, expiry_date, is_active, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [sanitizedCode, sanitizedDiscount, expiryDateObj, isActive, createdBy]
        );
        
        const p = result.rows[0];
        res.status(201).json({
            message: 'Promo code created successfully',
            promoCode: {
                id: p.id,
                code: p.code,
                discountPercentage: parseFloat(p.discount_percentage),
                expiryDate: p.expiry_date,
                isActive: p.is_active,
                createdAt: p.created_at,
                createdBy: p.created_by
            }
        });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'Promo code already exists' });
        }
        console.error('Create promo code error:', error);
        res.status(500).json({ message: 'Error creating promo code' });
    }
});

// Update promo code (admin only)
router.put('/:id', requireAdminAuth, adminActionLogger('UPDATE_PROMO_CODE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { code, discountPercentage, expiryDate, isActive } = req.body;
        
        const existingResult = await pool.query('SELECT * FROM promo_codes WHERE id = $1', [id]);
        if (existingResult.rows.length === 0) {
            return res.status(404).json({ message: 'Promo code not found' });
        }
        
        const sanitizedCode = code ? sanitizeString(code, 50).toUpperCase() : existingResult.rows[0].code;
        const sanitizedDiscount = discountPercentage !== undefined ? sanitizeNumber(discountPercentage, 1, 100) : existingResult.rows[0].discount_percentage;
        const expiryDateObj = expiryDate ? new Date(expiryDate) : existingResult.rows[0].expiry_date;
        const finalIsActive = isActive !== undefined ? isActive : existingResult.rows[0].is_active;
        
        if (expiryDate && isNaN(expiryDateObj.getTime())) {
            return res.status(400).json({ message: 'Invalid expiry date' });
        }
        
        const result = await pool.query(
            `UPDATE promo_codes 
             SET code = $1, discount_percentage = $2, expiry_date = $3, is_active = $4
             WHERE id = $5
             RETURNING *`,
            [sanitizedCode, sanitizedDiscount, expiryDateObj, finalIsActive, id]
        );
        
        const p = result.rows[0];
        res.json({
            message: 'Promo code updated successfully',
            promoCode: {
                id: p.id,
                code: p.code,
                discountPercentage: parseFloat(p.discount_percentage),
                expiryDate: p.expiry_date,
                isActive: p.is_active,
                updatedAt: p.updated_at
            }
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Promo code already exists' });
        }
        console.error('Update promo code error:', error);
        res.status(500).json({ message: 'Error updating promo code' });
    }
});

// Delete promo code (admin only)
router.delete('/:id', requireAdminAuth, adminActionLogger('DELETE_PROMO_CODE'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM promo_codes WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Promo code not found' });
        }
        
        res.json({ message: 'Promo code deleted successfully' });
    } catch (error) {
        console.error('Delete promo code error:', error);
        res.status(500).json({ message: 'Error deleting promo code' });
    }
});

// Toggle promo code status (admin only)
router.patch('/:id/toggle', requireAdminAuth, adminActionLogger('TOGGLE_PROMO_CODE'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'UPDATE promo_codes SET is_active = NOT is_active WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Promo code not found' });
        }
        
        const p = result.rows[0];
        res.json({
            message: `Promo code ${p.is_active ? 'activated' : 'deactivated'} successfully`,
            promoCode: {
                id: p.id,
                code: p.code,
                isActive: p.is_active
            }
        });
    } catch (error) {
        console.error('Toggle promo code error:', error);
        res.status(500).json({ message: 'Error toggling promo code status' });
    }
});

module.exports = router;
