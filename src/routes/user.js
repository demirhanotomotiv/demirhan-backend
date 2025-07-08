const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/:id', authenticateToken, (req, res) => {
  userController.getUser(req, res);
});

module.exports = router; 