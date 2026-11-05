const express = require('express');
const router = express.Router();
const printerController = require('../controllers/printController');

// TM boxes probe with HEAD/GET, then poll with POST.
// Some devices call /api/printer/ instead of /api/printer/get-job.
router.head('/', printerController.getPrintJob);
router.get('/', printerController.getPrintJob);
router.post('/', printerController.getPrintJob);
router.head('/get-job', printerController.getPrintJob);
router.get('/get-job', printerController.getPrintJob);
router.post('/get-job', printerController.getPrintJob);

// (Optional) A route to manually add a test job for now
router.post('/add-test-job', printerController.addTestPrintJob);
// 🚀 NEW: Endpoint to receive orders from restaurant management backend
router.post('/add-order', printerController.addOrderPrintJob);

router.get('/queue/:restaurantId', printerController.listPrintQueue);
router.delete('/queue/:restaurantId/order/:orderId', printerController.removePrintJobsByOrder);
router.patch('/queue/:restaurantId/:jobId', printerController.setPrintJobDisabled);
router.delete('/queue/:restaurantId/:jobId', printerController.removePrintJob);


module.exports = router;
