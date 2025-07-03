const express = require('express');
const router = express.Router();
const printerController = require('../controllers/printController');

// Endpoint for the printer to poll for jobs
router.post('/get-job', printerController.getPrintJob);

// (Optional) A route to manually add a test job for now
router.post('/add-test-job', printerController.addTestPrintJob);
// 🚀 NEW: Endpoint to receive orders from restaurant management backend
router.post('/add-order', printerController.addOrderPrintJob);


module.exports = router;
