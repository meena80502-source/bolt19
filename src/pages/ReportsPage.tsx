import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Calendar, Filter, BarChart3, 
  TrendingUp, Users, Clock, DollarSign, Eye,
  Printer, Share2, Search
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getAnalytics, updateAnalyticsFromCurrentData, generateTimeSeriesData } from '../utils/analyticsManager';

function ReportsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);

  useEffect(() => {
    // Load analytics data
    const currentAnalytics = updateAnalyticsFromCurrentData();
    setAnalytics(currentAnalytics);
    
    // Generate time series data
    const timeData = generateTimeSeriesData();
    setTimeSeriesData(timeData);
    
    // Set up interval to refresh data
    const interval = setInterval(() => {
      const updatedAnalytics = updateAnalyticsFromCurrentData();
      setAnalytics(updatedAnalytics);
      setTimeSeriesData(generateTimeSeriesData());
    }, 10000);
    
    // Listen for analytics updates
    const handleAnalyticsUpdate = () => {
      const updatedAnalytics = updateAnalyticsFromCurrentData();
      setAnalytics(updatedAnalytics);
      setTimeSeriesData(generateTimeSeriesData());
    };
    
    window.addEventListener('mindcare-analytics-updated', handleAnalyticsUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('mindcare-analytics-updated', handleAnalyticsUpdate);
    };
  }, []);

  // Generate session data from real therapist bookings
  const generateSessionData = () => {
    const allBookings = JSON.parse(localStorage.getItem('mindcare_bookings') || '[]');
    const therapistBookings = allBookings.filter((booking: any) => 
      booking.therapistName === user?.name || booking.therapistId === user?.id
    );
    
    // Group by month for the last 6 months
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthBookings = therapistBookings.filter((booking: any) => 
        booking.date.startsWith(monthKey)
      );
      
      const completedSessions = monthBookings.filter((b: any) => b.status === 'completed');
      const revenue = completedSessions.reduce((sum: number, booking: any) => {
        const amount = parseFloat(booking.amount?.replace('$', '') || '0');
        return sum + amount;
      }, 0);
      
      return {
        month: monthName,
        sessions: completedSessions.length,
        revenue
      };
    });
    
    return last6Months;
  };

  const generatePatientProgress = () => {
    const allBookings = JSON.parse(localStorage.getItem('mindcare_bookings') || '[]');
    const moodEntries = JSON.parse(localStorage.getItem('mindcare_mood_entries') || '[]');
    const therapistBookings = allBookings.filter((booking: any) => 
      booking.therapistName === user?.name || booking.therapistId === user?.id
    );
    
    // Get unique patients
    const uniquePatients = new Set(therapistBookings.map((b: any) => b.patientId));
    const totalPatients = uniquePatients.size;
    
    if (totalPatients === 0) {
      return [
        { name: 'No Data Yet', value: 100, color: '#6B7280' }
      ];
    }
    
    // Analyze patient progress based on mood trends and session completion
    let excellentProgress = 0;
    let goodProgress = 0;
    let moderateProgress = 0;
    let needsAttention = 0;
    
    uniquePatients.forEach(patientId => {
      const patientBookings = therapistBookings.filter((b: any) => b.patientId === patientId);
      const completedSessions = patientBookings.filter((b: any) => b.status === 'completed');
      const patientMoodEntries = moodEntries.filter((entry: any) => entry.userId === patientId);
      
      // Calculate progress score based on multiple factors
      let progressScore = 0;
      
      // Session completion rate (40% weight)
      if (patientBookings.length > 0) {
        progressScore += (completedSessions.length / patientBookings.length) * 40;
      }
      
      // Mood trend (40% weight)
      if (patientMoodEntries.length >= 2) {
        const recentMoods = patientMoodEntries.slice(-5);
        const avgMood = recentMoods.reduce((sum: number, entry: any) => sum + (entry.moodIntensity || 5), 0) / recentMoods.length;
        progressScore += (avgMood / 10) * 40;
      } else {
        progressScore += 20; // Default moderate score if no mood data
      }
      
      // Engagement level (20% weight)
      const recentActivity = patientMoodEntries.filter((entry: any) => {
        const entryDate = new Date(entry.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
      });
      progressScore += Math.min(20, recentActivity.length * 3);
      
      // Categorize based on progress score
      if (progressScore >= 80) excellentProgress++;
      else if (progressScore >= 60) goodProgress++;
      else if (progressScore >= 40) moderateProgress++;
      else needsAttention++;
    });
    
    return [
      { name: 'Excellent Progress', value: Math.round((excellentProgress / totalPatients) * 100), color: '#10B981' },
      { name: 'Good Progress', value: Math.round((goodProgress / totalPatients) * 100), color: '#3B82F6' },
      { name: 'Moderate Progress', value: Math.round((moderateProgress / totalPatients) * 100), color: '#F59E0B' },
      { name: 'Needs Attention', value: Math.round((needsAttention / totalPatients) * 100), color: '#EF4444' }
    ].filter(item => item.value > 0);
  };

  const generateTherapyTypes = () => {
    const allBookings = JSON.parse(localStorage.getItem('mindcare_bookings') || '[]');
    const userProgress = JSON.parse(localStorage.getItem('mindcare_user_progress') || '{}');
    const therapistBookings = allBookings.filter((booking: any) => 
      booking.therapistName === user?.name || booking.therapistId === user?.id
    );
    
    if (therapistBookings.length === 0) {
      return [
        { type: 'General Therapy', sessions: 0, percentage: 100 }
      ];
    }
    
    // Analyze therapy types based on patient plans and specializations
    const therapyTypeMap = new Map();
    
    therapistBookings.forEach((booking: any) => {
      // Try to determine therapy type from patient's current plan or default to therapist specialization
      let therapyType = 'General Therapy';
      
      if (userProgress.currentPlan?.issue) {
        switch (userProgress.currentPlan.issue.toLowerCase()) {
          case 'anxiety':
            therapyType = 'CBT';
            break;
          case 'depression':
            therapyType = 'CBT';
            break;
          case 'trauma':
            therapyType = 'EMDR';
            break;
          case 'relationships':
            therapyType = 'Family Therapy';
            break;
          default:
            therapyType = user?.specialization || 'General Therapy';
        }
      } else {
        therapyType = user?.specialization || 'General Therapy';
      }
      
      therapyTypeMap.set(therapyType, (therapyTypeMap.get(therapyType) || 0) + 1);
    });
    
    const totalSessions = therapistBookings.length;
    return Array.from(therapyTypeMap.entries()).map(([type, sessions]) => ({
      type,
      sessions,
      percentage: Math.round((sessions / totalSessions) * 100)
    }));
  };

  const sessionData = generateSessionData();
  const patientProgress = generatePatientProgress();
  const therapyTypes = generateTherapyTypes();

  const reports = [
    {
      id: 'patient-progress',
      title: 'Patient Progress Report',
      description: 'Detailed analysis of patient treatment outcomes',
      lastGenerated: '2024-01-15',
      type: 'PDF'
    },
    {
      id: 'session-summary',
      title: 'Monthly Session Summary',
      description: 'Overview of all therapy sessions conducted',
      lastGenerated: '2024-01-14',
      type: 'Excel'
    },
    {
      id: 'revenue-analysis',
      title: 'Revenue Analysis',
      description: 'Financial performance and billing summary',
      lastGenerated: '2024-01-13',
      type: 'PDF'
    },
    {
      id: 'treatment-outcomes',
      title: 'Treatment Outcomes',
      description: 'Success rates and therapy effectiveness metrics',
      lastGenerated: '2024-01-12',
      type: 'PDF'
    }
  ];

  const stats = analytics ? [
    {
      title: 'Total Sessions',
      value: analytics.sessions.totalSessions.toString(),
      change: `${analytics.sessions.completedSessions} completed`,
      icon: Clock,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Total Patients',
      value: (analytics.users.totalUsers - analytics.therapists.totalTherapists).toString(),
      change: `${analytics.users.newUsersThisMonth} new this month`,
      icon: Users,
      color: 'from-green-500 to-teal-500'
    },
    {
      title: 'Monthly Revenue',
      value: `$${analytics.revenue.monthlyRevenue.toLocaleString()}`,
      change: `+${analytics.revenue.revenueGrowthRate}% from last month`,
      icon: DollarSign,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Completion Rate',
      value: `${analytics.sessions.sessionCompletionRate.toFixed(1)}%`,
      change: 'Session completion',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-500'
    }
  ] : [];

  return (
    <div className={`h-screen flex flex-col ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50'
    }`}>
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Reports & Analytics
              </h1>
              <p className={`text-base ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Track your practice performance and patient outcomes
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300">
                <Download className="w-4 h-4" />
                <span>Export All</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {stat.title}
                  </h3>
                  <p className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {stat.change}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`mb-4 p-4 rounded-xl shadow-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="overview">Overview</option>
                <option value="patients">Patient Analytics</option>
                <option value="sessions">Session Analytics</option>
                <option value="revenue">Revenue Analytics</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          {/* Sessions & Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={`p-4 rounded-xl shadow-lg ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              Sessions & Revenue Trends
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={sessionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                <XAxis 
                  dataKey="month" 
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  fontSize={12}
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#FFFFFF' : '#000000'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  name="Sessions"
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Revenue ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Patient Progress Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className={`p-4 rounded-xl shadow-lg ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              Patient Progress Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={patientProgress}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {patientProgress.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#FFFFFF' : '#000000'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Therapy Types Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`mb-4 p-4 rounded-xl shadow-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <h3 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            Therapy Types Distribution
          </h3>
          <div className="space-y-3">
            {therapyTypes.map((type, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500`}></div>
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {type.type}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`w-32 h-2 rounded-full ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                      style={{ width: `${type.percentage}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {type.sessions} ({type.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Generated Reports */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className={`p-4 rounded-xl shadow-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              Generated Reports
            </h3>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300">
              <FileText className="w-4 h-4" />
              <span>Generate New</span>
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {reports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' 
                    ? 'border-gray-700 bg-gray-700/50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {report.title}
                      </h4>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {report.description}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    report.type === 'PDF' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {report.type}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-2">
                    <button className="p-2 text-gray-500 hover:text-blue-600 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-green-600 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-purple-600 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ReportsPage;