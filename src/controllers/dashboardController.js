import Order from '../models/Order.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import mongoose from 'mongoose';

export const getOverviewStats = async (req, res) => {
  try {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const revenueAggregation = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          createdAt: { $gte: lastMonthStart },
        },
      },
      {
        $facet: {
          currentMonth: [
            {
              $match: {
                createdAt: { $gte: currentMonthStart },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$pricing.totalAmount' },
              },
            },
          ],
          lastMonth: [
            {
              $match: {
                createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$pricing.totalAmount' },
              },
            },
          ],
        },
      },
    ]);

    const currentRevenue = revenueAggregation[0].currentMonth[0]?.total || 0;
    const lastMonthRevenue = revenueAggregation[0].lastMonth[0]?.total || 0;
    const revenueGrowth = calculatePercentageChange(currentRevenue, lastMonthRevenue);

    const usersAggregation = await User.aggregate([
      {
        $match: {
          role: 'user',
          createdAt: { $gte: lastMonthStart }
        }
      },
      {
        $facet: {
          currentMonth: [
            { $match: { createdAt: { $gte: currentMonthStart } } },
            { $count: 'count' },
          ],
          lastMonth: [
            { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const totalUsersCount = await User.countDocuments({ role: 'user' });
    const newUsersCurrentMonth = usersAggregation[0].currentMonth[0]?.count || 0;
    const previousTotalUsers = totalUsersCount - newUsersCurrentMonth;
    const userGrowth = calculatePercentageChange(totalUsersCount, previousTotalUsers);

    const ordersAggregation = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: lastMonthStart }
        }
      },
      {
        $facet: {
          currentMonth: [
            { $match: { createdAt: { $gte: currentMonthStart } } },
            { $count: 'count' }
          ],
          lastMonth: [
            { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const currentOrders = ordersAggregation[0].currentMonth[0]?.count || 0;
    const lastMonthOrders = ordersAggregation[0].lastMonth[0]?.count || 0;
    const orderGrowth = calculatePercentageChange(currentOrders, lastMonthOrders);


    res.status(200).json({
      success: true,
      data: {
        revenue: {
          total: currentRevenue,
          growth: revenueGrowth,
          lastMonth: lastMonthRevenue
        },
        users: {
          total: totalUsersCount,
          growth: userGrowth,
          newThisMonth: newUsersCurrentMonth
        },
        orders: {
          total: currentOrders,
          growth: orderGrowth,
          lastMonth: lastMonthOrders
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRevenueChart = async (req, res) => {
  try {
    const range = req.query.range || '12m';
    let startDate = new Date();

    if (range === '12m') {
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }

    const revenueData = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: range === '30d' ? "%Y-%m-%d" : "%Y-%m",
              date: "$createdAt"
            }
          },
          revenue: { $sum: '$pricing.totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: revenueData
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRecentUsers = async (req, res) => {
  try {
    const recentUsers = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('firstName lastName email avatar status createdAt');

    const activeUsersCount = await Session.countDocuments({
      isActive: true,
      refreshTokenExpiresAt: { $gt: new Date() }
    });

    const distinctActiveUserIds = await Session.distinct('userId', {
      isActive: true,
      refreshTokenExpiresAt: { $gt: new Date() }
    });

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const dauStats = await User.aggregate([
      {
        $match: {
          lastLogin: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastLogin" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        recentUsers,
        activeUsersCount: distinctActiveUserIds.length,
        dailyActiveUsers: dauStats
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getPerformanceMetrics = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const newSessionsToday = await Session.countDocuments({
      createdAt: { $gte: startOfToday }
    });

    const sessions = await Session.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).select('createdAt lastActivityAt');

    let totalDurationMs = 0;
    let count = 0;

    sessions.forEach(s => {
      const end = s.lastActivityAt || new Date();
      const duration = new Date(end) - new Date(s.createdAt);
      if (duration > 0 && duration < 24 * 60 * 60 * 1000) {
        totalDurationMs += duration;
        count++;
      }
    });

    const avgSessionMinutes = count > 0 ? Math.round((totalDurationMs / count) / 1000 / 60) : 0;
    const avgSessionSeconds = count > 0 ? Math.round(((totalDurationMs / count) / 1000) % 60) : 0;

    res.status(200).json({
      success: true,
      data: {
        newSessionsToday,
        avgSessionDuration: `${avgSessionMinutes}m ${avgSessionSeconds}s`
      }
    })

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
