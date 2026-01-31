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
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const newSessionsThisMonth = await Session.countDocuments({
      createdAt: { $gte: currentMonthStart }
    });

    const newSessionsLastMonth = await Session.countDocuments({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });

    const sessions = await Session.find({
      createdAt: { $gte: currentMonthStart }
    }).select('createdAt lastActivityAt pageViews');

    let totalDurationMs = 0;
    let sessionCount = 0;
    let bouncedSessions = 0;

    sessions.forEach(s => {
      const end = s.lastActivityAt || new Date();
      const duration = new Date(end) - new Date(s.createdAt);
      if (duration > 0 && duration < 24 * 60 * 60 * 1000) {
        totalDurationMs += duration;
        sessionCount++;
      }
      if ((s.pageViews || 0) <= 1) {
        bouncedSessions++;
      }
    });

    const avgSessionMs = sessionCount > 0 ? totalDurationMs / sessionCount : 0;
    const avgSessionMinutes = Math.floor(avgSessionMs / 1000 / 60);
    const avgSessionSeconds = Math.round((avgSessionMs / 1000) % 60);

    const totalSessionsForBounce = sessions.length;
    const bounceRate = totalSessionsForBounce > 0
      ? Number(((bouncedSessions / totalSessionsForBounce) * 100).toFixed(1))
      : 0;

    const ordersAggregation = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          createdAt: { $gte: lastMonthStart }
        }
      },
      {
        $facet: {
          currentMonth: [
            { $match: { createdAt: { $gte: currentMonthStart } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalRevenue: { $sum: '$pricing.totalAmount' }
              }
            }
          ],
          lastMonth: [
            { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalRevenue: { $sum: '$pricing.totalAmount' }
              }
            }
          ]
        }
      }
    ]);

    const currentMonthOrders = ordersAggregation[0].currentMonth[0]?.count || 0;
    const currentMonthRevenue = ordersAggregation[0].currentMonth[0]?.totalRevenue || 0;
    const lastMonthOrders = ordersAggregation[0].lastMonth[0]?.count || 0;
    const lastMonthRevenue = ordersAggregation[0].lastMonth[0]?.totalRevenue || 0;

    const avgOrderValue = currentMonthOrders > 0
      ? Number((currentMonthRevenue / currentMonthOrders).toFixed(2))
      : 0;
    const lastMonthAvgOrderValue = lastMonthOrders > 0
      ? Number((lastMonthRevenue / lastMonthOrders).toFixed(2))
      : 0;

    const uniqueSessionUsers = await Session.distinct('userId', {
      createdAt: { $gte: currentMonthStart }
    });
    const uniqueSessionCount = uniqueSessionUsers.length || newSessionsThisMonth;
    const conversionRate = uniqueSessionCount > 0
      ? Number(((currentMonthOrders / uniqueSessionCount) * 100).toFixed(2))
      : 0;

    const lastMonthUniqueUsers = await Session.distinct('userId', {
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    const lastMonthConversionRate = lastMonthUniqueUsers.length > 0
      ? Number(((lastMonthOrders / lastMonthUniqueUsers.length) * 100).toFixed(2))
      : 0;

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
            { $count: 'count' }
          ],
          lastMonth: [
            { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const newUsersThisMonth = usersAggregation[0].currentMonth[0]?.count || 0;
    const newUsersLastMonth = usersAggregation[0].lastMonth[0]?.count || 0;
    const totalUsers = await User.countDocuments({ role: 'user' });
    const userGrowthPercentage = newUsersLastMonth > 0
      ? Number((((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100).toFixed(1))
      : (newUsersThisMonth > 0 ? 100 : 0);

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    res.status(200).json({
      success: true,
      data: {
        conversionRate: {
          value: conversionRate,
          unit: '%',
          change: calculateChange(conversionRate, lastMonthConversionRate),
          description: 'Orders per unique session user'
        },
        avgSessionDuration: {
          value: `${avgSessionMinutes}m ${avgSessionSeconds}s`,
          totalMs: Math.round(avgSessionMs),
          change: null,
          description: 'Average time spent per session'
        },
        bounceRate: {
          value: bounceRate,
          unit: '%',
          description: 'Sessions with 1 or fewer page views'
        },
        newSessions: {
          value: newSessionsThisMonth,
          change: calculateChange(newSessionsThisMonth, newSessionsLastMonth),
          description: 'New sessions this month'
        },
        avgOrderValue: {
          value: avgOrderValue,
          unit: 'INR',
          change: calculateChange(avgOrderValue, lastMonthAvgOrderValue),
          description: 'Average order value this month'
        },
        userGrowth: {
          newUsersThisMonth,
          totalUsers,
          growthPercentage: userGrowthPercentage,
          description: 'New user registrations this month'
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getRecentOrders = async (req, res) => {
  try {
    const { page, limit, status } = req.query;

    const query = { isDeleted: false };
    if (status && status !== 'all') {
      query.status = status;
    }

    // If no pagination params provided, return all orders
    if (!page && !limit) {
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .populate('userId', 'firstName lastName email avatar')
        .populate('productId', 'name sku colors price')
        .select('orderId userId productId quantity color pricing status createdAt');

      return res.status(200).json({
        success: true,
        data: {
          orders,
          total: orders.length
        }
      });
    }

    // Paginated response
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName email avatar')
        .populate('productId', 'name sku colors price')
        .select('orderId userId productId quantity color pricing status createdAt'),
      Order.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages,
          total,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
