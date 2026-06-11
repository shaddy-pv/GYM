const express = require('express');
const {
  createPayment, getPayments, getPaymentStats,
  getPendingDues, getPayment, generateReceipt, deletePayment,
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyGymOwnership } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createPaymentSchema } = require('../validators/payment.validator');

const router = express.Router({ mergeParams: true });

router.use(protect, verifyGymOwnership);

router.post('/', validate(createPaymentSchema), createPayment);
router.get('/', getPayments);
router.get('/stats', getPaymentStats);
router.get('/pending', getPendingDues);
router.get('/:paymentId', getPayment);
router.get('/:paymentId/receipt', generateReceipt);
router.delete('/:paymentId', deletePayment);

module.exports = router;
