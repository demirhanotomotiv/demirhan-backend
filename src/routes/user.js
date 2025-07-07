const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

router.get('/:id', auth, (req, res) => {
  userController.getUser(req, res);
});

module.exports = router; 