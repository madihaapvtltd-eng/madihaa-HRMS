import { motion } from 'framer-motion';
import { Users, Calendar, DollarSign, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

export const Dashboard = () => {
  const stats = [
    { name: 'Total Employees', value: '0', icon: Users, change: '0%', color: 'bg-blue-500' },
    { name: 'Present Today', value: '0', icon: Calendar, change: '0%', color: 'bg-green-500' },
    { name: 'On Leave', value: '0', icon: Clock, change: '0%', color: 'bg-yellow-500' },
    { name: 'Payroll This Month', value: 'MVR 0', icon: DollarSign, change: '0%', color: 'bg-purple-500' },
  ];

  const recentActivities: any[] = [];

  const upcomingEvents: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">Dashboard</h1>
        <p className="text-secondary-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-secondary-900 mt-1">{stat.value}</p>
                    <p className="text-sm text-green-600 mt-1">{stat.change} from last month</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-secondary-900">Attendance Overview</h2>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-secondary-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-secondary-400 mx-auto mb-2" />
                <p className="text-secondary-600">Chart visualization coming soon</p>
                <p className="text-sm text-secondary-500">Attendance trends and analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-secondary-900">Recent Activities</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary-500"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-secondary-900">{activity.message}</p>
                    <p className="text-xs text-secondary-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-secondary-900">Upcoming Events</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <AlertCircle className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="font-medium text-secondary-900">{event.title}</p>
                    <p className="text-sm text-secondary-600">{event.date}</p>
                  </div>
                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700 capitalize">
                  {event.type}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
