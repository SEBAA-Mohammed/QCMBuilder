const express = require('express');
const { 
    getStudentStats, 
    getAvailableTests, 
    getTestHistory,
    startTestAttempt,
    submitTestAttempt 
} = require('../controllers/studentController');
const router = express.Router();

// Get student dashboard statistics
router.get('/stats', getStudentStats);

// Get available tests for student
router.get('/available-tests', getAvailableTests);

// Get test attempt history for student
router.get('/test-history', getTestHistory);

// Start a new test attempt
router.post('/test-attempts/start', startTestAttempt);

// Submit test attempt
router.post('/test-attempts/submit', submitTestAttempt);

module.exports = router;