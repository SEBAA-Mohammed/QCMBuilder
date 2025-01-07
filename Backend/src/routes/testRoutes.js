const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
// const { authenticateToken } = require('../controllers/authController');

// Apply authentication middleware to all routes
// router.use(authenticateToken);

// Test routes
router.post('/', testController.createTest);
router.get('/', testController.getTests);
router.get('/:id', testController.getTestById);
// router.put('/:id', testController.updateTest);
// router.delete('/:id', testController.deleteTest);

// Question routes
router.post('/:testId/questions', testController.addQuestion);
// router.put('/:testId/questions/:questionId', testController.updateQuestion);
// router.delete('/:testId/questions/:questionId', testController.deleteQuestion);
// router.put('/:testId/questions/:questionId/order', testController.updateQuestionOrder);

module.exports = router;