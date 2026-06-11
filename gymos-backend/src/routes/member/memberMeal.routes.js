const express = require('express');
const { getMealPlan, getTodayMeals, completeMeal } = require('../../controllers/member/memberMeal.controller');
const { protectMember } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protectMember);

router.get('/', getMealPlan);
router.get('/today', getTodayMeals);
router.post('/:mealIndex/complete', completeMeal);

module.exports = router;
