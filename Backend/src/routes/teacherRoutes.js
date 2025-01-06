const express = require('express');
const { getTeacherStats, getTeacherTests } = require('../controllers/teacherController');
const router = express.Router();

router.get('/stats', getTeacherStats);
router.get('/tests', getTeacherTests);

module.exports = router;