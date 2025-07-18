const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Activity = require('../models/activityModel');

// Tüm işlemleri getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, vehicle_id, personnel_id, category_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    
    if (vehicle_id) {
      whereConditions.push('t.vehicle_id = ?');
      queryParams.push(vehicle_id);
    }
    
    if (personnel_id) {
      whereConditions.push('t.personnel_id = ?');
      queryParams.push(personnel_id);
    }
    
    if (category_id) {
      whereConditions.push('t.category_id = ?');
      queryParams.push(category_id);
    }
    
    if (start_date) {
      whereConditions.push('t.date >= ?');
      queryParams.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('t.date <= ?');
      queryParams.push(end_date);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const [transactions] = await req.app.locals.pool.promise().query(`
      SELECT 
        t.*,
        v.plate as vehicle_plate,
        v.brand as vehicle_brand,
        v.model as vehicle_model,
        p.full_name as personnel_name,
        tc.name as category_name,
        p.username as created_by_name
      FROM transactions t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN personnel p ON t.personnel_id = p.id
      LEFT JOIN transaction_categories tc ON t.category_id = tc.id
      ${whereClause}
      ORDER BY t.transaction_date DESC, t.id DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);
    
    // Toplam sayıyı al
    const [countResult] = await req.app.locals.pool.promise().query(`
      SELECT COUNT(*) as total
      FROM transactions t
      ${whereClause}
    `, queryParams);
    
    res.json({
      success: true,
      transactions: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('İşlemleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlemler alınırken hata oluştu',
      error: error.message
    });
  }
});

// Tek işlem getir
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [transactions] = await req.app.locals.pool.promise().query(`
      SELECT 
        t.*,
        v.plate as vehicle_plate,
        v.brand as vehicle_brand,
        v.model as vehicle_model,
        p.full_name as personnel_name,
        tc.name as category_name,
        p.username as created_by_name
      FROM transactions t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN personnel p ON t.personnel_id = p.id
      LEFT JOIN transaction_categories tc ON t.category_id = tc.id
      WHERE t.id = ?
    `, [id]);
    
    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İşlem bulunamadı'
      });
    }
    
    res.json({
      success: true,
      transaction: transactions[0]
    });
  } catch (error) {
    console.error('İşlem getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem alınırken hata oluştu',
      error: error.message
    });
  }
});

// Yeni işlem ekle
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { vehicle_id, category_id, transaction_type, description, amount, transaction_date, odometer_reading, service_provider, invoice_number, notes } = req.body;
    const userId = req.user.id;

    // Validasyon
    if (!vehicle_id || !amount || !transaction_date) {
      return res.status(400).json({
        success: false,
        message: 'Araç, tutar ve tarih zorunludur'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tutar 0\'dan büyük olmalıdır'
      });
    }

    // Araç var mı kontrol et
    const [vehicle] = await req.app.locals.pool.promise().query(
      'SELECT id FROM vehicles WHERE id = ?',
      [vehicle_id]
    );

    if (vehicle.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }

    // Kategori var mı kontrol et (opsiyonel)
    if (category_id) {
      const [category] = await req.app.locals.pool.promise().query(
        'SELECT id FROM transaction_categories WHERE id = ?',
        [category_id]
      );

      if (category.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'İşlem türü bulunamadı'
        });
      }
    }

    const [result] = await req.app.locals.pool.promise().query(
      'INSERT INTO transactions (vehicle_id, category_id, description, amount, transaction_date, personnel_id) VALUES (?, ?, ?, ?, ?, ?)',
      [vehicle_id, category_id || null, description || '', amount, transaction_date, userId]
    );

    const [newTransaction] = await req.app.locals.pool.promise().query(
      'SELECT * FROM transactions WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'İşlem başarıyla eklendi',
      data: newTransaction[0]
    });
    // Activity log
    try { await Activity.create(userId, 'İşlem eklendi', { transaction_id: result.insertId, ...req.body }); } catch (e) { console.error('Activity log error:', e); }
  } catch (error) {
    console.error('İşlem ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem eklenirken hata oluştu',
      error: error.message
    });
  }
});

// İşlem güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, personnel_id, category_id, transaction_type, description, amount, date } = req.body;
    const userId = req.user.id;

    // Validasyon
    if (!vehicle_id || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Araç, tutar ve tarih zorunludur'
      });
    }

    // İşlem var mı kontrol et
    const [existing] = await req.app.locals.pool.promise().query(
      'SELECT id FROM transactions WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İşlem bulunamadı'
      });
    }

    // Araç var mı kontrol et
    const [vehicle] = await req.app.locals.pool.promise().query(
      'SELECT id FROM vehicles WHERE id = ?',
      [vehicle_id]
    );

    if (vehicle.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }

    await req.app.locals.pool.promise().query(
      'UPDATE transactions SET vehicle_id = ?, personnel_id = ?, category_id = ?, description = ?, amount = ?, transaction_date = ? WHERE id = ?',
      [vehicle_id, personnel_id || null, category_id || null, description || '', amount, date, id]
    );

    const [updatedTransaction] = await req.app.locals.pool.promise().query(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'İşlem başarıyla güncellendi',
      data: updatedTransaction[0]
    });
    // Activity log
    try { await Activity.create(userId, 'İşlem güncellendi', { transaction_id: id, ...req.body }); } catch (e) { console.error('Activity log error:', e); }
  } catch (error) {
    console.error('İşlem güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// İşlem sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // İşlem var mı kontrol et
    const [existing] = await req.app.locals.pool.promise().query(
      'SELECT id FROM transactions WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İşlem bulunamadı'
      });
    }

    await req.app.locals.pool.promise().query(
      'DELETE FROM transactions WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'İşlem başarıyla silindi'
    });
    // Activity log
    try { await Activity.create(req.user.id, 'İşlem silindi', { transaction_id: id }); } catch (e) { console.error('Activity log error:', e); }
  } catch (error) {
    console.error('İşlem silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem silinirken hata oluştu',
      error: error.message
    });
  }
});

// İşlem istatistikleri
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE transaction_date BETWEEN ? AND ?';
      queryParams = [start_date, end_date];
    }
    
    const [stats] = await req.app.locals.pool.promise().query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as average_amount,
        COUNT(DISTINCT vehicle_id) as unique_vehicles,
        COUNT(DISTINCT personnel_id) as unique_personnel
      FROM transactions
      ${whereClause}
    `, queryParams);
    
    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    console.error('İşlem istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınırken hata oluştu',
      error: error.message
    });
  }
});

// Kategoriye göre işlem istatistikleri
router.get('/stats/by-category', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE t.transaction_date BETWEEN ? AND ?';
      queryParams = [start_date, end_date];
    }
    
    const [categoryStats] = await req.app.locals.pool.promise().query(`
      SELECT 
        tc.name as category_name,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COALESCE(AVG(t.amount), 0) as average_amount
      FROM transaction_categories tc
      LEFT JOIN transactions t ON tc.id = t.category_id
      ${whereClause}
      GROUP BY tc.id, tc.name
      ORDER BY total_amount DESC
    `, queryParams);
    
    res.json({
      success: true,
      categoryStats: categoryStats
    });
  } catch (error) {
    console.error('Kategori istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori istatistikleri alınırken hata oluştu',
      error: error.message
    });
  }
});

// Araca göre işlem listesi (ID ile)
router.get('/by-vehicle/:vehicleId', authenticateToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const [transactions] = await req.app.locals.pool.promise().query(`
      SELECT 
        t.*,
        p.full_name as personnel_name,
        tc.name as category_name,
        p.username as created_by_name
      FROM transactions t
      LEFT JOIN personnel p ON t.personnel_id = p.id
      LEFT JOIN transaction_categories tc ON t.category_id = tc.id
      WHERE t.vehicle_id = ?
      ORDER BY t.transaction_date DESC
      LIMIT ? OFFSET ?
    `, [vehicleId, parseInt(limit), offset]);
    
    const [countResult] = await req.app.locals.pool.promise().query(
      'SELECT COUNT(*) as total FROM transactions WHERE vehicle_id = ?',
      [vehicleId]
    );
    
    res.json({
      success: true,
      transactions: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Araç işlemleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç işlemleri alınırken hata oluştu',
      error: error.message
    });
  }
});

// Araç plakasına göre işlem listesi
router.get('/by-plate/:plate', authenticateToken, async (req, res) => {
  try {
    const { plate } = req.params;
    
    // Önce araç ID'sini bul
    const [vehicles] = await req.app.locals.pool.promise().query(
      'SELECT id FROM vehicles WHERE plate = ?',
      [plate]
    );
    
    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }
    
    const vehicleId = vehicles[0].id;
    
    // Araç işlemlerini getir
    const [transactions] = await req.app.locals.pool.promise().query(`
      SELECT 
        t.*,
        v.plate as vehicle_plate,
        v.brand as vehicle_brand,
        v.model as vehicle_model,
        p.full_name as personnel_name,
        tc.name as category_name
      FROM transactions t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN personnel p ON t.personnel_id = p.id
      LEFT JOIN transaction_categories tc ON t.category_id = tc.id
      WHERE t.vehicle_id = ?
      ORDER BY t.transaction_date DESC, t.id DESC
    `, [vehicleId]);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Araç plakasına göre işlemler hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç işlemleri alınırken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router; 