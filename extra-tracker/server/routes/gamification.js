/**
 * GAMIFICATION ROUTES
 *
 * API endpoints per il sistema di gamification:
 * - Status e statistiche
 * - Challenges (daily, weekly, monthly)
 * - Achievements
 * - Streak e Freeze
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const gamificationService = require('../services/gamificationService');
const streakService = require('../services/streakService');
const achievementService = require('../services/achievementService');
const challengeService = require('../services/challengeService');

/**
 * @route   GET /api/gamification/status
 * @desc    Ottiene lo stato gamification completo dell'utente
 * @access  Private
 */
router.get('/status', requireAuth, async (req, res, next) => {
    try {
        const status = await gamificationService.getGamificationStatus(req.user.id);
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/gamification/multipliers
 * @desc    Ottiene i multipliers attivi per l'utente
 * @access  Private
 */
router.get('/multipliers', requireAuth, async (req, res, next) => {
    try {
        const multipliers = await gamificationService.calculateMultipliers(req.user.id, {
            isFirstOfDay: true // Assume first for preview
        });
        res.json({
            success: true,
            data: multipliers
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// STREAK ROUTES
// ==========================================

/**
 * @route   GET /api/gamification/streak
 * @desc    Ottiene informazioni sulla streak dell'utente
 * @access  Private
 */
router.get('/streak', requireAuth, async (req, res, next) => {
    try {
        const streakInfo = await streakService.getStreakInfo(req.user.id);
        res.json({
            success: true,
            data: streakInfo
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/gamification/streak/freeze
 * @desc    Acquista uno streak freeze
 * @access  Private
 */
router.post('/streak/freeze', requireAuth, async (req, res, next) => {
    try {
        const result = await streakService.purchaseStreakFreeze(req.user.id);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.reason,
                details: result
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// CHALLENGES ROUTES
// ==========================================

/**
 * @route   GET /api/gamification/challenges
 * @desc    Ottiene tutte le challenges (daily, weekly, monthly)
 * @access  Private
 */
router.get('/challenges', requireAuth, async (req, res, next) => {
    try {
        const challenges = await challengeService.getUserChallenges(req.user.id);
        res.json({
            success: true,
            data: challenges
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/gamification/challenges/daily
 * @desc    Ottiene le challenges giornaliere
 * @access  Private
 */
router.get('/challenges/daily', requireAuth, async (req, res, next) => {
    try {
        const challenges = await challengeService.getUserChallenges(req.user.id);
        res.json({
            success: true,
            data: challenges.daily
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/gamification/challenges/weekly
 * @desc    Ottiene le challenges settimanali
 * @access  Private
 */
router.get('/challenges/weekly', requireAuth, async (req, res, next) => {
    try {
        const challenges = await challengeService.getUserChallenges(req.user.id);
        res.json({
            success: true,
            data: challenges.weekly
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/gamification/challenges/monthly
 * @desc    Ottiene le challenges mensili
 * @access  Private
 */
router.get('/challenges/monthly', requireAuth, async (req, res, next) => {
    try {
        const challenges = await challengeService.getUserChallenges(req.user.id);
        res.json({
            success: true,
            data: challenges.monthly
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/gamification/challenges/refresh
 * @desc    Rigenera le challenges (force refresh)
 * @access  Private
 */
router.post('/challenges/refresh', requireAuth, async (req, res, next) => {
    try {
        const { period } = req.body;

        if (period === 'daily') {
            await challengeService.generateDailyChallenges(req.user.id, true);
        } else if (period === 'weekly') {
            await challengeService.generateWeeklyChallenges(req.user.id, true);
        } else if (period === 'monthly') {
            await challengeService.generateMonthlyChallenges(req.user.id, true);
        } else {
            // Rigenera tutte
            await challengeService.generateDailyChallenges(req.user.id, true);
            await challengeService.generateWeeklyChallenges(req.user.id, true);
            await challengeService.generateMonthlyChallenges(req.user.id, true);
        }

        const challenges = await challengeService.getUserChallenges(req.user.id);
        res.json({
            success: true,
            data: challenges
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// ACHIEVEMENTS ROUTES
// ==========================================

/**
 * @route   GET /api/gamification/achievements
 * @desc    Ottiene tutti gli achievements con stato per l'utente
 * @access  Private
 */
router.get('/achievements', requireAuth, async (req, res, next) => {
    try {
        const achievements = await achievementService.getUserAchievements(req.user.id);
        res.json({
            success: true,
            data: achievements
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/gamification/achievements/recent
 * @desc    Ottiene gli achievements sbloccati di recente
 * @access  Private
 */
router.get('/achievements/recent', requireAuth, async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const recent = await achievementService.getRecentAchievements(req.user.id, limit);
        res.json({
            success: true,
            data: recent
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/gamification/achievements/:id
 * @desc    Ottiene dettagli di un singolo achievement
 * @access  Private
 */
router.get('/achievements/:id', requireAuth, async (req, res, next) => {
    try {
        const achievement = await achievementService.getAchievementDetails(
            req.user.id,
            req.params.id
        );
        res.json({
            success: true,
            data: achievement
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/gamification/achievements/category/:category
 * @desc    Ottiene achievements per categoria
 * @access  Private
 */
router.get('/achievements/category/:category', requireAuth, async (req, res, next) => {
    try {
        const allAchievements = await achievementService.getUserAchievements(req.user.id);
        const categoryAchievements = allAchievements.byCategory[req.params.category] || [];
        res.json({
            success: true,
            data: categoryAchievements
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// LEADERBOARD/RANKINGS (placeholder for future)
// ==========================================

/**
 * @route   GET /api/gamification/leaderboard
 * @desc    Ottiene la classifica (placeholder)
 * @access  Private
 */
router.get('/leaderboard', requireAuth, async (req, res, next) => {
    try {
        // Placeholder - implementare quando necessario
        res.json({
            success: true,
            data: {
                message: 'Leaderboard coming soon'
            }
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// LEVEL INFO
// ==========================================

/**
 * @route   GET /api/gamification/levels
 * @desc    Ottiene informazioni sui livelli e rank
 * @access  Private
 */
router.get('/levels', requireAuth, async (req, res, next) => {
    try {
        const {
            LEVEL_TITLES,
            LEVEL_MULTIPLIERS,
            RANKS,
            getXpForLevel,
            getCumulativeXpForLevel
        } = require('../config/gamification');

        // Genera tabella livelli
        const levels = [];
        for (let i = 1; i <= 30; i++) {
            levels.push({
                level: i,
                title: LEVEL_TITLES[i],
                xpRequired: getXpForLevel(i),
                cumulativeXp: getCumulativeXpForLevel(i),
                multiplier: LEVEL_MULTIPLIERS[i] || null
            });
        }

        res.json({
            success: true,
            data: {
                levels,
                ranks: RANKS
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
