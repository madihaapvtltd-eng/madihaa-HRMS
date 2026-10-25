import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Filter, Download, X, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { createLeaveRequest, cancelLeaveRequest, getLeaveRequests, getLeaveBalance, validateLeaveRequest, calculateLeaveDays } from '../lib/leave';
import { useAuth } from '../contexts/AuthContext';
import { getEmployees } from '../lib/employees';
import type { LeaveRequest, LeaveBalance, LeaveType } from '../types';

export const Leave = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState<LeaveType>('annual');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDays, setNewDays] = useState(1);
  const [leaveErrors, setLeaveErrors] = useState<string[]>([]);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const requests = await getLeaveRequests();
      setLeaveRequests(requests);
      
      // Only load balance for logged-in user if they have an employeeId
      if (user?.employeeId) {
        const balance = await getLeaveBalance(user.employeeId, new Date().getFullYear());
        setLeaveBalance(balance);
      }

      // Load employees for dropdown
      const empData = await getEmployees();
      setEmployees(empData);
    } catch (error) {
      console.error('Error loading leave data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRequests = leaveRequests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  const calculateDaysFromRange = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return calculateLeaveDays(startDate, endDate);
  };

  const openLeaveForm = () => {
    setShowLeaveForm(!showLeaveForm);
    setLeaveErrors([]);
  };

  const handleLeaveSubmit = async () => {
    if (!selectedEmployeeId) {
      setLeaveErrors(['Please select an employee']);
      return;
    }

    const request = {
      employeeId: selectedEmployeeId,
      type: newLeaveType,
      startDate: new Date(newStartDate),
      endDate: new Date(newEndDate),
      days: calculateDaysFromRange(newStartDate, newEndDate),
      reason: newReason,
    } as Partial<LeaveRequest>;

    const validationErrors = validateLeaveRequest(request);
    if (validationErrors.length > 0) {
      setLeaveErrors(validationErrors);
      return;
    }

    setSubmittingLeave(true);
    try {
      await createLeaveRequest(request);
      setNewLeaveType('annual');
      setNewStartDate('');
      setNewEndDate('');
      setNewReason('');
      setNewDays(1);
      setSelectedEmployeeId('');
      setLeaveErrors([]);
      setShowLeaveForm(false);
      loadData();
    } catch (error) {
      console.error('Error applying for leave:', error);
      setLeaveErrors(['Unable to submit leave request. Please try again.']);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelLeaveRequest(requestId);
      loadData();
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const typeColors: Record<LeaveType, string> = {
    annual: 'bg-blue-100 text-blue-800',
    medical: 'bg-purple-100 text-purple-800',
    emergency: 'bg-red-100 text-red-800',
    duty: 'bg-green-100 text-green-800',
    unpaid: 'bg-gray-100 text-gray-800',
    maternity: 'bg-pink-100 text-pink-800',
    paternity: 'bg-cyan-100 text-cyan-800',
    compassionate: 'bg-amber-100 text-amber-800',
    off_day: 'bg-indigo-100 text-indigo-800',
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
          <h1 className="text-3xl font-bold text-secondary-900">Leave Management</h1>
          <p className="text-secondary-600 mt-1">Manage leave requests and balances</p>
        </div>
        <Button onClick={openLeaveForm} className="sm:w-auto w-full">
          <Plus className="w-5 h-5 mr-2" />
          Apply for Leave
        </Button>
      </div>

      {showLeaveForm && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Employee</label>
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                />
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Employee</option>
                  {employees
                    .filter(emp => 
                      emp.fullName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                      emp.employeeId?.toLowerCase().includes(employeeSearch.toLowerCase())
                    )
                    .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Leave Type</label>
                <select
                  value={newLeaveType}
                  onChange={(e) => setNewLeaveType(e.target.value as LeaveType)}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="annual">Annual</option>
                  <option value="medical">Medical</option>
                  <option value="emergency">Emergency</option>
                  <option value="duty">Duty</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                  <option value="compassionate">Compassionate</option>
                  <option value="off_day">Off Day</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => {
                    setNewStartDate(e.target.value);
                    setNewDays(calculateDaysFromRange(e.target.value, newEndDate));
                  }}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => {
                    setNewEndDate(e.target.value);
                    setNewDays(calculateDaysFromRange(newStartDate, e.target.value));
                  }}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Days</label>
                <input
                  type="number"
                  value={newDays}
                  readOnly
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg bg-secondary-50"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-secondary-700 mb-1">Reason</label>
                <textarea
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {leaveErrors.length > 0 && (
              <div className="mt-4 space-y-2 text-sm text-red-600">
                {leaveErrors.map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={handleLeaveSubmit} loading={submittingLeave}>
                Submit Leave Request
              </Button>
              <Button variant="secondary" onClick={openLeaveForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Balance Cards */}
      {leaveBalance && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-secondary-600">Annual</p>
              <p className="text-2xl font-bold text-blue-600">{leaveBalance.annual}</p>
              <p className="text-xs text-secondary-500">days remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-secondary-600">Medical</p>
              <p className="text-2xl font-bold text-purple-600">{leaveBalance.medical}</p>
              <p className="text-xs text-secondary-500">days remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-secondary-600">Emergency</p>
              <p className="text-2xl font-bold text-red-600">{leaveBalance.emergency}</p>
              <p className="text-xs text-secondary-500">days remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-secondary-600">Duty</p>
              <p className="text-2xl font-bold text-green-600">{leaveBalance.duty}</p>
              <p className="text-xs text-secondary-500">days remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-secondary-600">Carry Forward</p>
              <p className="text-2xl font-bold text-secondary-600">{leaveBalance.carryForward}</p>
              <p className="text-xs text-secondary-500">days</p>
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
              <option value="cancelled">Cancelled</option>
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

      {/* Leave Requests Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {filteredRequests.map((request, index) => {
                const employee = employees.find(emp => emp.id === request.employeeId);
                return (
                <motion.tr
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-secondary-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-secondary-900">
                      {employee?.fullName || 'Unknown'}
                    </div>
                    <div className="text-xs text-secondary-500">
                      {employee?.employeeId || request.employeeId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColors[request.type]}`}>
                      {request.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-secondary-900">
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-secondary-900">{request.days} days</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[request.status]}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                    {new Date(request.appliedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-primary-600 hover:text-primary-900">
                        <Eye className="w-5 h-5" />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleCancelRequest(request.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600">No leave requests found</p>
          </div>
        )}
      </Card>
    </div>
  );
};
