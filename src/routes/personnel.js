const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Activity = require('../models/activityModel');

// Tüm personeli getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('=== PERSONNEL API CALL ===');
    console.log('Personnel GET endpoint called by user:', req.user.id);
    console.log('User role:', req.user.role);
    console.log('Request headers:', req.headers);
    
    const [personnel] = await req.app.locals.pool.promise().query(
      'SELECT id, full_name, username, email, phone, hire_date, status, notes, is_active, role, created_at, updated_at FROM personnel ORDER BY created_at DESC'
    );
    
    console.log('Personnel query result:', personnel.length, 'personnel found');
    console.log('First personnel:', personnel[0]);
    
    res.json({
      success: true,
      data: personnel
    });
    
    console.log('=== PERSONNEL API RESPONSE SENT ===');
  } catch (error) {
    console.error('Personeli getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Personel alınırken hata oluştu',
      error: error.message
    });
  }
});

// Tek personel getir
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [personnel] = await req.app.locals.pool.promise().query(
      'SELECT * FROM personnel WHERE id = ?',
      [id]
    );
    
    if (personnel.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Personel bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: personnel[0]
    });
  } catch (error) {
    console.error('Personel getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Personel alınırken hata oluştu',
      error: error.message
    });
  }
});

// Yeni personel ekle
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    const { full_name, email, phone, hire_date, status, notes, is_active, username, password, role } = req.body;
    const userId = req.user.id;

    // Validasyon
    if (!full_name) {
      return res.status(400).json({
        success: false,
        message: 'Ad Soyad zorunludur'
      });
    }

    // Email formatını kontrol et (opsiyonel)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz email formatı'
        });
      }

      // Aynı email'de personel var mı kontrol et
      const [existingEmail] = await req.app.locals.pool.promise().query(
        'SELECT id FROM personnel WHERE email = ?',
        [email]
      );

      if (existingEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Bu email adresi zaten kullanımda'
        });
      }
    }

    // Username kontrolü
    if (username) {
      const [existingUsername] = await req.app.locals.pool.promise().query(
        'SELECT id FROM personnel WHERE username = ?',
        [username]
      );

      if (existingUsername.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Bu kullanıcı adı zaten kullanımda'
        });
      }
    }

    // Şifre hash'leme
    let passwordHash = null;
    if (password) {
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    const [result] = await req.app.locals.pool.promise().query(
      'INSERT INTO personnel (full_name, email, phone, hire_date, status, notes, is_active, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [full_name, email || null, phone || null, hire_date || null, status || 'active', notes || '', is_active !== undefined ? is_active : 1, username || null, passwordHash, role || 'personnel']
    );

    const [newPersonnel] = await req.app.locals.pool.promise().query(
      'SELECT * FROM personnel WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Personel başarıyla eklendi',
      data: newPersonnel[0]
    });
    // Activity log
    try { await Activity.create(userId, 'Personel eklendi', { full_name, email }); } catch (e) { console.error('Activity log error:', e); }
  } catch (error) {
    console.error('Personel ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Personel eklenirken hata oluştu',
      error: error.message
    });
  }
});

// Personel güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    const { id } = req.params;
    const { full_name, email, phone, hire_date, status, notes, is_active, username, password, role } = req.body;
    const userId = req.user.id;

    // Validasyon
    if (!full_name) {
      return res.status(400).json({
        success: false,
        message: 'Ad Soyad zorunludur'
      });
    }

    // Personel var mı kontrol et
    const [existing] = await req.app.locals.pool.promise().query(
      'SELECT id FROM personnel WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Personel bulunamadı'
      });
    }

    // Email kontrolü
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz email formatı'
        });
      }

      // Aynı email'de başka personel var mı kontrol et
      const [duplicateEmail] = await req.app.locals.pool.promise().query(
        'SELECT id FROM personnel WHERE email = ? AND id != ?',
        [email, id]
      );

      if (duplicateEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Bu email adresi başka bir personel tarafından kullanılıyor'
        });
      }
    }

    // Username kontrolü
    if (username) {
      const [existingUsername] = await req.app.locals.pool.promise().query(
        'SELECT id FROM personnel WHERE username = ? AND id != ?',
        [username, id]
      );

      if (existingUsername.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Bu kullanıcı adı zaten kullanımda'
        });
      }
    }

    // Şifre hash'leme
    let passwordHash = null;
    if (password) {
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Güncelleme sorgusu
    let updateQuery = 'UPDATE personnel SET full_name = ?, email = ?, phone = ?, hire_date = ?, status = ?, notes = ?, is_active = ?';
    let updateParams = [full_name, email || null, phone || null, hire_date || null, status || 'active', notes || '', is_active !== undefined ? is_active : 1];

    if (username !== undefined) {
      updateQuery += ', username = ?';
      updateParams.push(username || null);
    }

    if (passwordHash !== null) {
      updateQuery += ', password_hash = ?';
      updateParams.push(passwordHash);
    }

    if (role !== undefined) {
      updateQuery += ', role = ?';
      updateParams.push(role || 'personnel');
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

    await req.app.locals.pool.promise().query(updateQuery, updateParams);

    const [updatedPersonnel] = await req.app.locals.pool.promise().query(
      'SELECT * FROM personnel WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Personel başarıyla güncellendi',
      data: updatedPersonnel[0]
    });
    // Activity log
    try { await Activity.create(userId, 'Personel güncellendi', { id, full_name, email }); } catch (e) { console.error('Activity log error:', e); }
  } catch (error) {
    console.error('Personel güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Personel güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// Personel sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Admin kontrolü
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    const { id } = req.params;

    // Personel var mı kontrol et
    const [existing] = await req.app.locals.pool.promise().query(
      'SELECT id FROM personnel WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Personel bulunamadı'
      });
    }

    // Bu personelle ilgili işlemler var mı kontrol et
    const [transactions] = await req.app.locals.pool.promise().query(
      'SELECT id FROM transactions WHERE personnel_id = ? LIMIT 1',
      [id]
    );

    if (transactions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu personelle ilgili işlemler bulunduğu için silinemez'
      });
    }

    await req.app.locals.pool.promise().query(
      'DELETE FROM personnel WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Personel başarıyla silindi'
    });
    // Activity log
    try { await Activity.create(req.user.id, 'Personel silindi', { id }); } catch (e) { console.error('Activity log error:', e); }
  } catch (error) {
    console.error('Personel silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Personel silinirken hata oluştu',
      error: error.message
    });
  }
});

// Personel istatistikleri
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const [stats] = await req.app.locals.pool.promise().query(`
      SELECT 
        COUNT(*) as total_personnel,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_personnel,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_personnel
      FROM personnel
    `);
    
    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Personel istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınırken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router; 