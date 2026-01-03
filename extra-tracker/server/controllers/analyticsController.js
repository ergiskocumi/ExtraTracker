/**
 * ANALYTICS CONTROLLER
 * ====================
 *
 * Aggrega i dati di UserActivity per la dashboard analytics.
 */

const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const { asyncHandler } = require('../middleware/errorHandler');

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * GET /api/analytics/weekly
 * Aggrega attivita degli ultimi 7 giorni.
 */
const getWeekly = asyncHandler(async (req, res) => {
    const userId = req.tenantScope?.tenantId;

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const dailyRaw = await UserActivity.aggregate([
        {
            $match: {
                user: userId,
                createdAt: { $gte: startDate },
            },
        },
        {
            $project: {
                createdAt: 1,
                type: 1,
                xpEarned: { $ifNull: ['$xpEarned', 0] },
                metadata: 1,
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                totalXP: { $sum: '$xpEarned' },
                studySeconds: {
                    $sum: {
                        $cond: [
                            { $eq: ['$type', 'SESSION_COMPLETE'] },
                            {
                                $convert: {
                                    input: '$metadata.timeSpentSeconds',
                                    to: 'double',
                                    onError: 0,
                                    onNull: 0,
                                },
                            },
                            0,
                        ],
                    },
                },
                workMinutes: {
                    $sum: {
                        $cond: [
                            { $eq: ['$type', 'WORK_SESSION_LOGGED'] },
                            {
                                $convert: {
                                    input: '$metadata.durationMinutes',
                                    to: 'double',
                                    onError: 0,
                                    onNull: 0,
                                },
                            },
                            0,
                        ],
                    },
                },
                goalsCompleted: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'GOAL_COMPLETED'] }, 1, 0],
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const dailyMap = new Map(
        dailyRaw.map((item) => [item._id, item])
    );

    const dailyActivity = [];
    for (let i = 0; i < 7; i += 1) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + i);
        const key = toDateKey(current);
        const entry = dailyMap.get(key) || {};

        dailyActivity.push({
            date: DAY_LABELS[current.getDay()],
            study: Math.round((entry.studySeconds || 0) / 60),
            work: Math.round(entry.workMinutes || 0),
            xp: Math.round(entry.totalXP || 0),
        });
    }

    const user = await User.findById(userId).select('gamification');

    const overview = {
        totalXP: user?.gamification?.xp || 0,
        currentStreak: user?.gamification?.streak?.current || 0,
        level: user?.gamification?.level || 1,
    };

    const recent = await UserActivity.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(8)
        .select('type xpEarned metadata createdAt')
        .lean();

    const recentActivities = recent.map((activity) => ({
        id: String(activity._id),
        type: activity.type,
        title:
            activity.metadata?.projectName ||
            activity.metadata?.habitName ||
            activity.metadata?.goalTitle ||
            activity.metadata?.deckTitle ||
            activity.metadata?.title ||
            null,
        xp: activity.xpEarned ?? 0,
        mode: activity.metadata?.mode ?? null,
        date: activity.createdAt,
    }));

    res.json({
        success: true,
        data: {
            overview,
            dailyActivity,
            recentActivities,
        },
    });
});

module.exports = {
    getWeekly,
};
