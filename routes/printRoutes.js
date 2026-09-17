const express = require('express');
const router = express.Router();
const printerController = require('../controllers/printController');

// TM boxes probe with HEAD/GET, then poll with POST
router.head('/get-job', printerController.getPrintJob);
router.get('/get-job', printerController.getPrintJob);
router.post('/get-job', printerController.getPrintJob);

// (Optional) A route to manually add a test job for now
router.post('/add-test-job', printerController.addTestPrintJob);
// 🚀 NEW: Endpoint to receive orders from restaurant management backend
router.post('/add-order', printerController.addOrderPrintJob);


module.exports = router;
