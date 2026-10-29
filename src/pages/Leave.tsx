import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Filter, Download, X, Eye, Check, X as XIcon, CheckSquare, Square } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { createLeaveRequest, cancelLeaveRequest, getLeaveRequests, validateLeaveRequest, calculateLeaveDays, approveLeaveRequest, rejectLeaveRequest } from '../lib/leave';
import { useAuth } from '../contexts/AuthContext';
import { getEmployees } from '../lib/employees';
import type { LeaveRequest, LeaveType } from '../types';

export const Leave = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
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
  const [approvalModal, setApprovalModal] = useState<{ show: boolean; request: LeaveRequest | null; action: 'approve' | 'reject' }>({ show: false, request: null, action: 'approve' });
  const [approvalComments, setApprovalComments] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<{ show: boolean; action: 'approve' | 'reject' }>({ show: false, action: 'approve' });
  const [bulkComments, setBulkComments] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [viewModal, setViewModal] = useState<{ show: boolean; request: LeaveRequest | null }>({ show: false, request: null });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const requests = await getLeaveRequests();
      setLeaveRequests(requests);

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
    return request.status === activeTab;
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

  const handleOpenApproval = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setApprovalModal({ show: true, request, action });
    setApprovalComments('');
  };

  const handleCloseApproval = () => {
    setApprovalModal({ show: false, request: null, action: 'approve' });
    setApprovalComments('');
  };

  const handleApprovalSubmit = async () => {
    if (!approvalModal.request || !user?.employeeId) return;

    try {
      setApprovalSubmitting(true);
      
      if (approvalModal.action === 'approve') {
        await approveLeaveRequest(
          approvalModal.request.id,
          user.employeeId,
          user.displayName || 'Admin',
          0, // Level 0 approval
          approvalComments || undefined
        );
      } else {
        await rejectLeaveRequest(
          approvalModal.request.id,
          user.employeeId,
          user.displayName || 'Admin',
          0, // Level 0 approval
          approvalComments || undefined
        );
      }

      handleCloseApproval();
      loadData();
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('Failed to process approval');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleSelectRequest = (requestId: string) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleSelectAll = () => {
    const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
    if (selectedRequests.size === pendingRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(pendingRequests.map(r => r.id)));
    }
  };

  const handleOpenBulkApproval = (action: 'approve' | 'reject') => {
    if (selectedRequests.size === 0) {
      alert('Please select at least one request');
      return;
    }
    setBulkModal({ show: true, action });
    setBulkComments('');
  };

  const handleCloseBulkApproval = () => {
    setBulkModal({ show: false, action: 'approve' });
    setBulkComments('');
  };

  const handleBulkApprovalSubmit = async () => {
    if (!user?.employeeId || selectedRequests.size === 0) return;

    try {
      setBulkSubmitting(true);
      
      for (const requestId of selectedRequests) {
        if (bulkModal.action === 'approve') {
          await approveLeaveRequest(
            requestId,
            user.employeeId,
            user.displayName || 'Admin',
            0,
            bulkComments || undefined
          );
        } else {
          await rejectLeaveRequest(
            requestId,
            user.employeeId,
            user.displayName || 'Admin',
            0,
            bulkComments || undefined
          );
        }
      }

      handleCloseBulkApproval();
      setSelectedRequests(new Set());
      loadData();
    } catch (error) {
      console.error('Error processing bulk approval:', error);
      alert('Failed to process bulk approval');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleViewRequest = (request: LeaveRequest) => {
    setViewModal({ show: true, request });
  };

  const handleCloseViewModal = () => {
    setViewModal({ show: false, request: null });
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

      {/* Today's Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-600">Today on Leave</p>
            <p className="text-2xl font-bold text-blue-600">{leaveRequests.filter(r => r.status === 'approved' && new Date(r.startDate) <= new Date() && new Date(r.endDate) >= new Date()).length}</p>
            <p className="text-xs text-secondary-500">employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-600">Today on Duty</p>
            <p className="text-2xl font-bold text-green-600">{employees.length - leaveRequests.filter(r => r.status === 'approved' && new Date(r.startDate) <= new Date() && new Date(r.endDate) >= new Date()).length}</p>
            <p className="text-xs text-secondary-500">employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-600">Today on Sick Leave</p>
            <p className="text-2xl font-bold text-purple-600">{leaveRequests.filter(r => r.status === 'approved' && r.type === 'medical' && new Date(r.startDate) <= new Date() && new Date(r.endDate) >= new Date()).length}</p>
            <p className="text-xs text-secondary-500">employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-600">Pending Requests</p>
            <p className="text-2xl font-bold text-yellow-600">{leaveRequests.filter(r => r.status === 'pending').length}</p>
            <p className="text-xs text-secondary-500">awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-600">Total Employees</p>
            <p className="text-2xl font-bold text-secondary-600">{employees.length}</p>
            <p className="text-xs text-secondary-500">in system</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  activeTab === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                Pending ({leaveRequests.filter(r => r.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  activeTab === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                Approved ({leaveRequests.filter(r => r.status === 'approved').length})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  activeTab === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                Rejected ({leaveRequests.filter(r => r.status === 'rejected').length})
              </button>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button variant="secondary" className="flex-1 sm:flex-none">
                <Filter className="w-5 h-5 mr-2" />
                More Filters
              </Button>
              <Button variant="secondary" className="flex-1 sm:flex-none">
                <Download className="w-5 h-5 mr-2" />
                Export
              </Button>
            </div>
            {activeTab === 'pending' && selectedRequests.size > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => handleOpenBulkApproval('approve')}
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Approve ({selectedRequests.size})
                </Button>
                <Button
                  onClick={() => handleOpenBulkApproval('reject')}
                  className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
                >
                  <XIcon className="w-5 h-5 mr-2" />
                  Reject ({selectedRequests.size})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card>
        {/* Mobile Cards - visible only on small screens */}
        <div className="sm:hidden space-y-4 p-4">
          {filteredRequests.map((request, index) => {
            const employee = employees.find(emp => emp.id === request.employeeId);
            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg shadow p-4 border border-secondary-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {activeTab === 'pending' && (
                      <button
                        onClick={() => handleSelectRequest(request.id)}
                        className="hover:text-primary-600"
                      >
                        {selectedRequests.has(request.id) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    <div>
                      <div className="font-bold text-secondary-900 text-sm">
                        {employee?.fullName || 'Unknown'}
                      </div>
                      <div className="text-xs text-secondary-500">
                        {employee?.employeeId || request.employeeId}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                    {request.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Type:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeColors[request.type]}`}>
                      {request.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Duration:</span>
                    <span className="font-medium">
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Days:</span>
                    <span className="font-medium">{request.days}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Applied:</span>
                    <span className="font-medium">{new Date(request.appliedDate).toLocaleDateString()}</span>
                  </div>
                  <div className="text-secondary-600">
                    <span className="font-medium">Reason:</span> {request.reason}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => handleViewRequest(request)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-primary-600 text-white rounded-lg text-xs sm:text-sm flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  {activeTab === 'pending' && (
                    <>
                      <button
                        onClick={() => handleOpenApproval(request, 'approve')}
                        className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleOpenApproval(request, 'reject')}
                        className="flex-1 sm:flex-none px-3 py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm flex items-center justify-center gap-1"
                      >
                        <XIcon className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        className="flex-1 sm:flex-none px-3 py-2 bg-secondary-600 text-white rounded-lg text-xs sm:text-sm flex items-center justify-center gap-1"
                      >
                        <XIcon className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Desktop Table - visible only on larger screens */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  <button onClick={handleSelectAll} className="hover:text-primary-600">
                    {selectedRequests.size === filteredRequests.filter(r => r.status === 'pending').length && selectedRequests.size > 0 ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
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
                  <td className="px-4 py-4 whitespace-nowrap">
                    {activeTab === 'pending' && (
                      <button
                        onClick={() => handleSelectRequest(request.id)}
                        className="hover:text-primary-600"
                      >
                        {selectedRequests.has(request.id) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </td>
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
                      <button
                        onClick={() => handleViewRequest(request)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {activeTab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleOpenApproval(request, 'approve')}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleOpenApproval(request, 'reject')}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleCancelRequest(request.id)}
                            className="text-secondary-600 hover:text-secondary-900"
                            title="Cancel"
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
      </Card>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
          <p className="text-secondary-600">No leave requests found</p>
        </div>
      )}

      {/* Approval Modal */}
      {approvalModal.show && approvalModal.request && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                {approvalModal.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-secondary-600">
                  <strong>Employee:</strong> {employees.find(emp => emp.id === approvalModal.request?.employeeId)?.fullName || 'Unknown'}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Type:</strong> {approvalModal.request.type}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Dates:</strong> {new Date(approvalModal.request.startDate).toLocaleDateString()} - {new Date(approvalModal.request.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Days:</strong> {approvalModal.request.days}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Reason:</strong> {approvalModal.request.reason}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Comments (optional)
                </label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Add any comments..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleApprovalSubmit}
                  loading={approvalSubmitting}
                  className={approvalModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {approvalModal.action === 'approve' ? 'Approve' : 'Reject'}
                </Button>
                <Button variant="secondary" onClick={handleCloseApproval}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Approval Modal */}
      {bulkModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                {bulkModal.action === 'approve' ? `Approve ${selectedRequests.size} Leave Requests` : `Reject ${selectedRequests.size} Leave Requests`}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-secondary-600">
                  You are about to {bulkModal.action} <strong>{selectedRequests.size}</strong> leave request(s).
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Comments (optional)
                </label>
                <textarea
                  value={bulkComments}
                  onChange={(e) => setBulkComments(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Add any comments..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleBulkApprovalSubmit}
                  loading={bulkSubmitting}
                  className={bulkModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {bulkModal.action === 'approve' ? 'Approve All' : 'Reject All'}
                </Button>
                <Button variant="secondary" onClick={handleCloseBulkApproval}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Details Modal */}
      {viewModal.show && viewModal.request && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                Leave Request Details
              </h3>
              
              <div className="space-y-3 mb-4">
                <p className="text-sm text-secondary-600">
                  <strong>Employee:</strong> {employees.find(emp => emp.id === viewModal.request?.employeeId)?.fullName || 'Unknown'}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Type:</strong> {viewModal.request.type}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Dates:</strong> {new Date(viewModal.request.startDate).toLocaleDateString()} - {new Date(viewModal.request.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Days:</strong> {viewModal.request.days}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Reason:</strong> {viewModal.request.reason}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Status:</strong> {viewModal.request.status}
                </p>
                <p className="text-sm text-secondary-600">
                  <strong>Applied Date:</strong> {new Date(viewModal.request.appliedDate).toLocaleDateString()}
                </p>
                {viewModal.request.approvals && viewModal.request.approvals.length > 0 && (
                  <div className="text-sm text-secondary-600">
                    <strong>Approvals:</strong>
                    <ul className="ml-4 mt-1">
                      {viewModal.request.approvals.map((approval, idx) => (
                        <li key={idx}>
                          {approval.approverName} - {approval.status} ({approval.actionDate ? new Date(approval.actionDate).toLocaleDateString() : ''})
                          {approval.comments && <span className="ml-2">- {approval.comments}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Button variant="secondary" onClick={handleCloseViewModal}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
