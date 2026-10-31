import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Filter, Download, Check, X, Eye, Calendar, Printer } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import {
  getOvertimeRequests,
  getOvertimeSummary,
  createOvertimeRequest,
  validateOvertimeRequest,
  approveOvertimeRequest,
  rejectOvertimeRequest,
  deleteOvertimeRequest,
} from '../lib/overtime';
import { getEmployees } from '../lib/employees';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../lib/permissions';
import type { OvertimeRequest, OvertimeSummary, Employee } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Overtime = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [summary, setSummary] = useState<OvertimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [dailyEntries, setDailyEntries] = useState<Record<string, { startTime: string; finishTime: string; breakMinutes: number; purpose: string }>>({});
  const [bulkStartTime, setBulkStartTime] = useState('');
  const [bulkBreakTime, setBulkBreakTime] = useState('30');
  const [bulkFinishTime, setBulkFinishTime] = useState('');
  const [newRequestType, setNewRequestType] = useState<'planned' | 'emergency' | 'public_holiday'>('planned');
  const [overtimeErrors, setOvertimeErrors] = useState<string[]>([]);
  const [submittingOvertime, setSubmittingOvertime] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const hasApprovePermission = can(PERMISSIONS.OVERTIME_APPROVE);
      const [requests, empData] = await Promise.all([
        getOvertimeRequests(hasApprovePermission ? undefined : user?.employeeId),
        getEmployees()
      ]);
      setOvertimeRequests(requests);
      setEmployees(empData.filter(e => e.status === 'active'));

      const payrollCycle = getPayrollCycleDates();
      const summaryData = await getOvertimeSummary(payrollCycle.start, payrollCycle.end, hasApprovePermission ? undefined : user?.employeeId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading overtime data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.employeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate payroll cycle dates (26th of previous month to 25th of current month)
  const getPayrollCycleDates = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Previous month 26th - use UTC to avoid timezone issues
    const cycleStart = new Date(Date.UTC(currentYear, currentMonth - 1, 26, 0, 0, 0, 0));

    // Current month 25th - use UTC to avoid timezone issues
    const cycleEnd = new Date(Date.UTC(currentYear, currentMonth, 25, 23, 59, 59, 999));

    console.log('Payroll cycle:', cycleStart.toISOString().split('T')[0], 'to', cycleEnd.toISOString().split('T')[0]);

    return {
      start: cycleStart,
      end: cycleEnd,
      startFormatted: cycleStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      endFormatted: cycleEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };
  };

  const payrollCycle = getPayrollCycleDates();

  const filteredRequests = overtimeRequests.filter(request => {
    const requestDate = new Date(request.date);
    // Compare using UTC to avoid timezone issues
    const requestDateUTC = Date.UTC(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
    const startUTC = payrollCycle.start.getTime();
    const endUTC = payrollCycle.end.getTime();
    const isInPayrollCycle = requestDateUTC >= startUTC && requestDateUTC <= endUTC;
    if (!isInPayrollCycle) return false;
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const toggleRequestForm = () => {
    setShowRequestForm(!showRequestForm);
    setOvertimeErrors([]);
  };

  // Generate all dates in the payroll cycle
  const getPayrollCycleDatesList = () => {
    const dates = [];
    const current = new Date(payrollCycle.start);
    const end = new Date(payrollCycle.end);

    while (current <= end) {
      // Use UTC date to avoid timezone issues
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      const day = String(current.getUTCDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  };

  const cycleDates = getPayrollCycleDatesList();

  const handleOvertimeSubmit = async () => {
    const employeeId = can(PERMISSIONS.OVERTIME_APPROVE) ? selectedEmployeeId : user?.employeeId;
    if (!employeeId) return;

    // Filter entries with actual overtime hours
    const entriesWithHours = Object.entries(dailyEntries).filter(([_, entry]) => {
      const hours = calculateOvertime(entry.startTime, entry.finishTime, entry.breakMinutes.toString());
      return hours > 0;
    });

    if (entriesWithHours.length === 0) {
      setOvertimeErrors(['No overtime entries to save. Please enter start/finish times.']);
      return;
    }

    setSubmittingOvertime(true);
    try {
      // Create overtime request for each date with hours
      for (const [date, entry] of entriesWithHours) {
        const hours = calculateOvertime(entry.startTime, entry.finishTime, entry.breakMinutes.toString());
        const request: Partial<OvertimeRequest> = {
          employeeId,
          date: new Date(date),
          startTime: entry.startTime,
          endTime: entry.finishTime,
          hours,
          reason: entry.purpose,
          requestType: newRequestType,
        };

        const validationErrors = validateOvertimeRequest(request);
        if (validationErrors.length > 0) {
          setOvertimeErrors(validationErrors);
          return;
        }

        await createOvertimeRequest(request);
      }

      setDailyEntries({});
      setBulkBreakTime('30');
      setBulkFinishTime('');
      setNewRequestType('planned');
      setSelectedEmployeeId('');
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

  const calculateOvertime = (startTime: string, finishTime: string, breakMinutes: string) => {
    if (!startTime || !finishTime) return 0;
    const start = new Date(`1970-01-01T${startTime}:00`);
    const finish = new Date(`1970-01-01T${finishTime}:00`);
    if (finish <= start) finish.setDate(finish.getDate() + 1);
    let diff = finish.getTime() - start.getTime();
    const breakMs = (parseInt(breakMinutes, 10) || 0) * 60 * 1000;
    diff -= breakMs;
    return diff > 0 ? diff / (1000 * 60 * 60) : 0;
  };

  const handleEntryChange = (date: string, field: string, value: string | number) => {
    setDailyEntries(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value,
        startTime: prev[date]?.startTime || '',
        finishTime: prev[date]?.finishTime || '',
        breakMinutes: prev[date]?.breakMinutes || 30,
        purpose: prev[date]?.purpose || ''
      }
    }));
  };

  const handleBulkApprove = async () => {
    if (!user?.employeeId || selectedRequests.size === 0) return;
    setBulkSubmitting(true);
    try {
      for (const requestId of selectedRequests) {
        await approveOvertimeRequest(requestId, user.employeeId, user.email || 'Admin');
      }
      setSelectedRequests(new Set());
      await loadData();
      alert('Overtime requests approved successfully!');
    } catch (error) {
      console.error('Error approving overtime requests:', error);
      alert('Failed to approve overtime requests. Please try again.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkReject = async () => {
    if (!user?.employeeId || selectedRequests.size === 0) return;
    setBulkSubmitting(true);
    try {
      for (const requestId of selectedRequests) {
        await rejectOvertimeRequest(requestId, user.employeeId, user.email || 'Admin');
      }
      setSelectedRequests(new Set());
      await loadData();
      alert('Overtime requests rejected successfully!');
    } catch (error) {
      console.error('Error rejecting overtime requests:', error);
      alert('Failed to reject overtime requests. Please try again.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    const canDelete = can(PERMISSIONS.OVERTIME_DELETE);
    const requestsToSelect = canDelete ? filteredRequests : filteredRequests.filter(r => r.status === 'pending');
    if (selectedRequests.size === requestsToSelect.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(requestsToSelect.map(r => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!can(PERMISSIONS.OVERTIME_DELETE) || selectedRequests.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedRequests.size} overtime request(s)? This action cannot be undone.`)) return;

    setBulkSubmitting(true);
    try {
      for (const requestId of selectedRequests) {
        await deleteOvertimeRequest(requestId);
      }
      setSelectedRequests(new Set());
      await loadData();
      alert('Overtime requests deleted successfully!');
    } catch (error) {
      console.error('Error deleting overtime requests:', error);
      alert('Failed to delete overtime requests. Please try again.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const applyBulkEdit = () => {
    const updatedEntries = { ...dailyEntries };
    let appliedCount = 0;

    cycleDates.forEach(date => {
      const entry = updatedEntries[date] || { startTime: '', finishTime: '', breakMinutes: 30, purpose: '' };
      if (bulkStartTime) {
        entry.startTime = bulkStartTime;
        appliedCount++;
      }
      if (bulkFinishTime) {
        entry.finishTime = bulkFinishTime;
        appliedCount++;
      }
      if (bulkBreakTime) {
        entry.breakMinutes = parseInt(bulkBreakTime);
        appliedCount++;
      }
      updatedEntries[date] = entry;
    });

    setDailyEntries(updatedEntries);
    alert(`Bulk changes applied to ${appliedCount} entries.`);
  };

  const generateOTForm = () => {
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) {
      alert('Please select an employee first.');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16);
    doc.text('OVERTIME FORM', pageWidth / 2, 15, { align: 'center' });

    // Employee details
    doc.setFontSize(10);
    doc.text(`Name: ${employee.fullName}`, 20, 30);
    doc.text(`ID: ${employee.employeeId}`, 20, 38);
    doc.text(`Department: ${employee.department || 'N/A'}`, 20, 46);
    doc.text(`Period: ${payrollCycle.startFormatted} to ${payrollCycle.endFormatted}`, 20, 54);

    // Table headers
    const tableData = cycleDates.map(date => {
      const entry = dailyEntries[date] || { startTime: '', finishTime: '', breakMinutes: 30, purpose: '' };
      const hours = calculateOvertime(entry.startTime, entry.finishTime, entry.breakMinutes.toString());
      return [
        new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        entry.startTime,
        entry.finishTime,
        entry.breakMinutes,
        hours > 0 ? hours.toFixed(2) : '',
        entry.purpose
      ];
    });

    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Start Time', 'Finish Time', 'Break (min)', 'Total OT (hrs)', 'Purpose']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 35 }
      }
    });

    // Signature section
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.text('______________________', 30, finalY);
    doc.text('Employee Signature', 30, finalY + 8);
    doc.text('______________________', 120, finalY);
    doc.text('Date', 120, finalY + 8);

    doc.text('______________________', 30, finalY + 25);
    doc.text('Supervisor Signature', 30, finalY + 33);
    doc.text('______________________', 120, finalY + 25);
    doc.text('Date', 120, finalY + 33);

    doc.save(`OT_Form_${employee.employeeId}_${payrollCycle.startFormatted}.pdf`);
  };

  const exportSummaryToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(14);
    doc.text(`Overtime Summary - ${payrollCycle.startFormatted} to ${payrollCycle.endFormatted}`, 14, 15);

    const headers = ['Employee', 'ID', ...cycleDates.map(d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })), 'Total'];
    const body = employees.map(employee => {
      const employeeRequests = overtimeRequests.filter(r => r.employeeId === employee.id);
      let totalHours = 0;
      const dateHours = cycleDates.map(date => {
        const request = employeeRequests.find(r => {
          const reqDate = new Date(r.date).toISOString().split('T')[0];
          return reqDate === date;
        });
        const hours = request?.hours || 0;
        totalHours += hours;
        return hours > 0 ? hours.toFixed(2) : '-';
      });

      return [employee.fullName, employee.employeeId, ...dateHours, totalHours.toFixed(2)];
    });

    autoTable(doc, {
      startY: 25,
      head: [headers],
      body,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 6 },
      styles: { fontSize: 5, cellPadding: 1 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 12 } }
    });

    doc.save(`OT_Summary_${payrollCycle.startFormatted}.pdf`);
  };

  const exportSummaryToExcel = () => {
    const headers = ['Employee', 'ID', ...cycleDates.map(d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })), 'Total'];
    const body = employees.map(employee => {
      const employeeRequests = overtimeRequests.filter(r => r.employeeId === employee.id);
      let totalHours = 0;
      const dateHours = cycleDates.map(date => {
        const request = employeeRequests.find(r => {
          const reqDate = new Date(r.date).toISOString().split('T')[0];
          return reqDate === date;
        });
        const hours = request?.hours || 0;
        totalHours += hours;
        return hours > 0 ? hours.toFixed(2) : '-';
      });

      return [employee.fullName, employee.employeeId, ...dateHours, totalHours.toFixed(2)];
    });

    const csvContent = [headers, ...body].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `OT_Summary_${payrollCycle.startFormatted}.csv`;
    link.click();
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
        {can(PERMISSIONS.OVERTIME_REQUEST) && (
          <Button onClick={toggleRequestForm} className="sm:w-auto w-full">
            <Plus className="w-5 h-5 mr-2" />
            Request Overtime
          </Button>
        )}
        {can(PERMISSIONS.OVERTIME_APPROVE) && (
          <Button variant="secondary" onClick={() => setShowSummary(!showSummary)} className="sm:w-auto w-full">
            <Download className="w-5 h-5 mr-2" />
            Monthly Summary
          </Button>
        )}
      </div>

      {showRequestForm && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Payroll Cycle:</strong> {payrollCycle.startFormatted} to {payrollCycle.endFormatted}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {can(PERMISSIONS.OVERTIME_APPROVE) && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Employee</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeId})</option>
                    ))}
                  </select>
                </div>
              )}
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

            {/* Bulk Edit Section */}
            <div className="mb-4 p-3 bg-secondary-50 rounded-lg">
              <p className="text-sm font-medium text-secondary-700 mb-2">Bulk Edit (apply to all dates)</p>
              <div className="flex gap-4">
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">Start Time</label>
                  <input
                    type="text"
                    placeholder="HH:MM"
                    value={bulkStartTime}
                    onChange={(e) => setBulkStartTime(e.target.value)}
                    className="px-3 py-1 border border-secondary-300 rounded text-sm"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">Finish Time</label>
                  <input
                    type="text"
                    placeholder="HH:MM"
                    value={bulkFinishTime}
                    onChange={(e) => setBulkFinishTime(e.target.value)}
                    className="px-3 py-1 border border-secondary-300 rounded text-sm"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">Break (min)</label>
                  <input
                    type="number"
                    value={bulkBreakTime}
                    onChange={(e) => setBulkBreakTime(e.target.value)}
                    className="px-3 py-1 border border-secondary-300 rounded text-sm w-20"
                  />
                </div>
                <button
                  onClick={applyBulkEdit}
                  className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Daily Entry Table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-secondary-300 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Start</th>
                    <th className="px-3 py-2 text-left">Finish</th>
                    <th className="px-3 py-2 text-left">Break (min)</th>
                    <th className="px-3 py-2 text-left">Hours</th>
                    <th className="px-3 py-2 text-left">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {cycleDates.map(date => {
                    const entry = dailyEntries[date] || { startTime: '', finishTime: '', breakMinutes: 30, purpose: '' };
                    const hours = calculateOvertime(entry.startTime, entry.finishTime, entry.breakMinutes.toString());
                    return (
                      <tr key={date} className="border-t border-secondary-200">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={entry.startTime}
                            onChange={(e) => handleEntryChange(date, 'startTime', e.target.value)}
                            className="w-full px-2 py-1 border border-secondary-300 rounded"
                            maxLength={5}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={entry.finishTime}
                            onChange={(e) => handleEntryChange(date, 'finishTime', e.target.value)}
                            className="w-full px-2 py-1 border border-secondary-300 rounded"
                            maxLength={5}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={entry.breakMinutes}
                            onChange={(e) => handleEntryChange(date, 'breakMinutes', parseInt(e.target.value))}
                            className="w-full px-2 py-1 border border-secondary-300 rounded w-16"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{hours.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={entry.purpose}
                            onChange={(e) => handleEntryChange(date, 'purpose', e.target.value)}
                            className="w-full px-2 py-1 border border-secondary-300 rounded"
                            placeholder="Purpose"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                Save Overtime Entries
              </Button>
              {can(PERMISSIONS.OVERTIME_APPROVE) && (
                <Button variant="secondary" onClick={generateOTForm}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print OT Form
                </Button>
              )}
              <Button variant="secondary" onClick={toggleRequestForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary */}
      {showSummary && can(PERMISSIONS.OVERTIME_APPROVE) && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
              <p className="text-sm text-blue-800">
                <strong>Payroll Cycle:</strong> {payrollCycle.startFormatted} to {payrollCycle.endFormatted}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={exportSummaryToPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button variant="secondary" size="sm" onClick={exportSummaryToExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-secondary-300 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Employee</th>
                    {cycleDates.map(date => (
                      <th key={date} className="px-2 py-2 text-center text-xs">
                        {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(employee => {
                    const employeeRequests = overtimeRequests.filter(r => r.employeeId === employee.id);
                    let totalHours = 0;

                    return (
                      <tr key={employee.id} className="border-t border-secondary-200">
                        <td className="px-3 py-2 whitespace-nowrap font-medium">
                          {employee.fullName}
                          <span className="text-xs text-secondary-500 block">{employee.employeeId}</span>
                        </td>
                        {cycleDates.map(date => {
                          const request = employeeRequests.find(r => {
                            const reqDate = new Date(r.date).toISOString().split('T')[0];
                            return reqDate === date;
                          });
                          const hours = request?.hours || 0;
                          totalHours += hours;
                          return (
                            <td key={date} className="px-2 py-2 text-center">
                              {hours > 0 ? hours.toFixed(2) : '-'}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-bold">{totalHours.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4">
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
              {can(PERMISSIONS.OVERTIME_APPROVE) && filteredRequests.some(r => r.status === 'pending') && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button onClick={handleBulkApprove} loading={bulkSubmitting} disabled={selectedRequests.size === 0}>
                    <Check className="w-4 h-4 mr-2" />
                    Approve ({selectedRequests.size})
                  </Button>
                  <Button variant="secondary" onClick={handleBulkReject} loading={bulkSubmitting} disabled={selectedRequests.size === 0}>
                    <X className="w-4 h-4 mr-2" />
                    Reject ({selectedRequests.size})
                  </Button>
                </div>
              )}
              {can(PERMISSIONS.OVERTIME_DELETE) && selectedRequests.size > 0 && (
                <Button variant="danger" onClick={handleBulkDelete} loading={bulkSubmitting}>
                  <X className="w-4 h-4 mr-2" />
                  Delete ({selectedRequests.size})
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary">
                <Filter className="w-5 h-5 mr-2" />
                More Filters
              </Button>
              <Button variant="secondary">
                <Download className="w-5 h-5 mr-2" />
                Export
              </Button>
            </div>
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
                {(can(PERMISSIONS.OVERTIME_APPROVE) && filteredRequests.some(r => r.status === 'pending')) || can(PERMISSIONS.OVERTIME_DELETE) && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRequests.size === (can(PERMISSIONS.OVERTIME_DELETE) ? filteredRequests.length : filteredRequests.filter(r => r.status === 'pending').length) && (can(PERMISSIONS.OVERTIME_DELETE) ? filteredRequests.length : filteredRequests.filter(r => r.status === 'pending').length) > 0}
                      onChange={handleSelectAll}
                      className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-600 uppercase tracking-wider">
                  Employee
                </th>
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
                  {(can(PERMISSIONS.OVERTIME_APPROVE) && filteredRequests.some(r => r.status === 'pending')) || can(PERMISSIONS.OVERTIME_DELETE) && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRequests.has(request.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRequests(prev => new Set([...prev, request.id]));
                          } else {
                            setSelectedRequests(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(request.id);
                              return newSet;
                            });
                          }
                        }}
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                    {employees.find(e => e.id === request.employeeId)?.fullName || request.employeeId}
                  </td>
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
                      {request.status === 'pending' && can(PERMISSIONS.OVERTIME_APPROVE) && (
                        <>
                          <button className="text-green-600 hover:text-green-900">
                            <Check className="w-5 h-5" />
                          </button>
                          {can(PERMISSIONS.OVERTIME_REJECT) && (
                            <button className="text-red-600 hover:text-red-900">
                              <X className="w-5 h-5" />
                            </button>
                          )}
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
