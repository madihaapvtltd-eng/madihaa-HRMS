import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Filter, Download, Check, X, Eye, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import {
  getOvertimeRequests,
  getOvertimeSummary,
  createOvertimeRequest,
  validateOvertimeRequest,
} from '../lib/overtime';
import { useAuth } from '../contexts/AuthContext';
import type { OvertimeRequest, OvertimeSummary } from '../types';

export const Overtime = () => {
  const { user } = useAuth();
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [summary, setSummary] = useState<OvertimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newRequestDate, setNewRequestDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newHours, setNewHours] = useState(0);
  const [newReason, setNewReason] = useState('');
  const [newRequestType, setNewRequestType] = useState<'planned' | 'emergency' | 'public_holiday'>('planned');
  const [overtimeErrors, setOvertimeErrors] = useState<string[]>([]);
  const [submittingOvertime, setSubmittingOvertime] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const requests = await getOvertimeRequests(user?.employeeId);
      setOvertimeRequests(requests);
      
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      
      const summaryData = await getOvertimeSummary(startDate, endDate, user?.employeeId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading overtime data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRequests = overtimeRequests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const calculateTotalHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);
    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);
    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  };

  const toggleRequestForm = () => {
    setShowRequestForm(!showRequestForm);
    setOvertimeErrors([]);
  };

  const handleOvertimeSubmit = async () => {
    if (!user?.employeeId) return;

    const request: Partial<OvertimeRequest> = {
      employeeId: user.employeeId,
      date: newRequestDate ? new Date(newRequestDate) : undefined,
      startTime: newStartTime,
      endTime: newEndTime,
      hours: newHours,
      reason: newReason,
      requestType: newRequestType,
    };

    const validationErrors = validateOvertimeRequest(request, new Date());
    if (validationErrors.length > 0) {
      setOvertimeErrors(validationErrors);
      return;
    }

    setSubmittingOvertime(true);
    try {
      await createOvertimeRequest(request);
      setNewRequestDate('');
      setNewStartTime('');
      setNewEndTime('');
      setNewHours(0);
      setNewReason('');
      setNewRequestType('planned');
      setShowRequestForm(false);
      setOvertimeErrors([]);
      loadData();
    } catch (error) {
      console.error('Error requesting overtime:', error);
      setOvertimeErrors(['Unable to submit overtime request. Please try again.']);
    } finally {
      setSubmittingOvertime(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Overtime Management</h1>
          <p className="text-secondary-600 mt-1">Track and approve overtime requests</p>
        </div>
        <Button onClick={toggleRequestForm} className="sm:w-auto w-full">
          <Plus className="w-5 h-5 mr-2" />
          Request Overtime
        </Button>
      </div>

      {showRequestForm && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newRequestDate}
                  onChange={(e) => setNewRequestDate(e.target.value)}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => {
                    setNewStartTime(e.target.value);
                    setNewHours(calculateTotalHours(e.target.value, newEndTime));
                  }}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => {
                    setNewEndTime(e.target.value);
                    setNewHours(calculateTotalHours(newStartTime, e.target.value));
                  }}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Hours</label>
                <input
                  type="number"
                  value={newHours}
                  readOnly
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg bg-secondary-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Request Type</label>
                <select
                  value={newRequestType}
                  onChange={(e) => setNewRequestType(e.target.value as 'planned' | 'emergency' | 'public_holiday')}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="planned">Planned</option>
                  <option value="emergency">Emergency</option>
                  <option value="public_holiday">Public Holiday</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Reason</label>
              <textarea
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {overtimeErrors.length > 0 && (
              <div className="mt-4 space-y-2 text-sm text-red-600">
                {overtimeErrors.map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={handleOvertimeSubmit} loading={submittingOvertime}>
                Submit Overtime Request
              </Button>
              <Button variant="secondary" onClick={toggleRequestForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary-600">Total Requests</p>
                  <p className="text-2xl font-bold text-secondary-900">{summary.totalRequests}</p>
                </div>
                <div className="p-2 bg-secondary-100 rounded-lg">
                  <Clock className="w-5 h-5 text-secondary-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary-600">Total Hours</p>
                  <p className="text-2xl font-bold text-primary-600">{summary.totalHours}</p>
                  <p className="text-xs text-secondary-500">hours</p>
                </div>
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Clock className="w-5 h-5 text-primary-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{summary.approvedHours}</p>
                  <p className="text-xs text-secondary-500">hours</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.pendingHours}</p>
                  <p className="text-xs text-secondary-500">hours</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary-600">Completed</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.completedHours}</p>
                  <p className="text-xs text-secondary-500">hours</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
            <Button variant="secondary">
              <Filter className="w-5 h-5 mr-2" />
              More Filters
            </Button>
            <Button variant="secondary">
              <Download className="w-5 h-5 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overtime Requests */}
      <Card>
        {/* Mobile Cards */}
        <div className="sm:hidden space-y-4 p-4">
          {filteredRequests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-lg shadow p-4 border border-secondary-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-secondary-400" />
                  <span className="font-bold text-secondary-900 text-sm">
                    {new Date(request.date).toLocaleDateString()}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                  {request.status}
                </span>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-secondary-600">Time:</span>
                  <span className="font-medium">{request.startTime} - {request.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">Hours:</span>
                  <span className="font-medium">{request.hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">Requested:</span>
                  <span className="font-medium">{new Date(request.requestedDate).toLocaleDateString()}</span>
                </div>
                <div className="text-secondary-600">
                  <span className="font-medium">Reason:</span> {request.reason}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  View
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Requested Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {filteredRequests.map((request, index) => (
                <motion.tr
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-secondary-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-secondary-400 mr-2" />
                      <span className="text-sm text-secondary-900">
                        {new Date(request.date).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                    {request.startTime} - {request.endTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-secondary-900">{request.hours}h</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600 max-w-xs truncate">
                    {request.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[request.status]}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                    {new Date(request.requestedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-primary-600 hover:text-primary-900">
                        <Eye className="w-5 h-5" />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button className="text-green-600 hover:text-green-900">
                            <Check className="w-5 h-5" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
              <p className="text-secondary-600">No overtime requests found</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
