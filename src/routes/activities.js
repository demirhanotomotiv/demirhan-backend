const express = require('express');
const router = express.Router();
const { getRecentActivities } = require('../controllers/activityController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, getRecentActivities);

module.exports = router; 