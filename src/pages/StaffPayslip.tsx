import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Calendar, Download, FileText, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { getPayroll } from '../lib/payroll';
import { useAuth } from '../contexts/AuthContext';
import { getEmployees } from '../lib/employees';
import type { Payroll as PayrollRecord, Employee } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const StaffPayslip = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeDocId, setEmployeeDocId] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);

  const loadPayrollData = useCallback(async () => {
    try {
      setLoading(true);

      // Get employee document ID from employeeId
      if (user?.employeeId) {
        const employees = await getEmployees();
        const employee = employees.find(e => e.employeeId === user.employeeId);
        if (employee) {
          setEmployeeDocId(employee.id);
          setEmployee(employee);
        }
      }

      if (employeeDocId) {
        // Get all payroll for this employee (avoiding composite index)
        const allPayroll = await getPayroll(undefined, undefined, employeeDocId);
        // Filter by month and year client-side
        const filtered = allPayroll.filter(p => p.month === selectedMonth && p.year === selectedYear);
        setPayrollData(filtered);
      } else {
        setPayrollData([]);
      }
    } catch (error) {
      console.error('Error loading payroll data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, employeeDocId, user?.employeeId]);

  useEffect(() => {
    if (user?.employeeId) {
      loadPayrollData();
    }
  }, [loadPayrollData, user?.employeeId]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const generatePayslipPDF = (payroll: PayrollRecord) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('Madihaa Pvt Ltd', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Payslip', 105, 30, { align: 'center' });

    // Period
    doc.setFontSize(10);
    doc.text(`Period: ${months[selectedMonth - 1]} ${selectedYear}`, 105, 40, { align: 'center' });

    // Employee Information
    doc.setFontSize(12);
    doc.text('Employee Information', 20, 55);
    doc.setFontSize(10);
    doc.text(`Name: ${employee?.fullName || 'N/A'}`, 20, 65);
    doc.text(`Employee ID: ${employee?.employeeId || user?.employeeId || 'N/A'}`, 20, 72);
    doc.text(`Department: ${employee?.department || 'N/A'}`, 20, 79);

    // Earnings Table
    doc.setFontSize(12);
    doc.text('Earnings', 20, 95);

    const earningsData = [
      ['Basic Salary', `MVR ${payroll.basicSalary.toLocaleString()}`],
      ...payroll.allowances.map(a => [a.name, `MVR ${a.amount.toLocaleString()}`]),
      ['', ''],
      ['Total Earnings', `MVR ${payroll.grossSalary.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 100,
      head: [['Description', 'Amount']],
      body: earningsData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Deductions Table
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Deductions', 20, finalY);

    const totalDeductions = payroll.deductions.reduce((sum, d) => sum + d.amount, 0);
    const deductionsData = [
      ...payroll.deductions.map(d => [d.name, `MVR ${d.amount.toLocaleString()}`]),
      ['', ''],
      ['Total Deductions', `MVR ${totalDeductions.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Description', 'Amount']],
      body: deductionsData,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
    });

    // Net Salary
    const netY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net Salary: MVR ${payroll.netSalary.toLocaleString()}`, 20, netY);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, 280);
    doc.text('This is a computer-generated document.', 105, 280, { align: 'center' });

    // Save PDF
    const fileName = `payslip_${employee?.employeeId || user?.employeeId || 'employee'}_${months[selectedMonth - 1]}_${selectedYear}.pdf`;
    doc.save(fileName);
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
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">My Payslips</h1>
        <p className="text-secondary-600 mt-1">View your salary details and payslips</p>
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslip Details */}
      {payrollData.length > 0 ? (
        <div className="space-y-4">
          {payrollData.map((payroll) => (
            <Card key={payroll.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-secondary-900">
                    {months[selectedMonth - 1]} {selectedYear} Payslip
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    payroll.status === 'paid' ? 'bg-green-100 text-green-800' :
                    payroll.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    payroll.status === 'processed' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings */}
                  <div>
                    <h3 className="text-sm font-semibold text-secondary-900 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                      Earnings
                    </h3>
                    <div className="space-y-2 bg-green-50 rounded-lg p-4">
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Basic Salary</span>
                        <span className="font-medium text-secondary-900">MVR {payroll.basicSalary.toLocaleString()}</span>
                      </div>
                      {payroll.allowances.map((allowance: any) => (
                        <div key={allowance.id} className="flex justify-between">
                          <span className="text-secondary-600">{allowance.name}</span>
                          <span className="font-medium text-green-600">+MVR {allowance.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {payroll.bonuses.map((bonus: any) => (
                        <div key={bonus.id} className="flex justify-between">
                          <span className="text-secondary-600">{bonus.name}</span>
                          <span className="font-medium text-green-600">+MVR {bonus.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="border-t border-green-200 pt-2 mt-2 flex justify-between font-bold">
                        <span className="text-secondary-900">Gross Salary</span>
                        <span className="text-secondary-900">MVR {payroll.grossSalary.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <h3 className="text-sm font-semibold text-secondary-900 mb-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                      Deductions
                    </h3>
                    <div className="space-y-2 bg-red-50 rounded-lg p-4">
                      {payroll.deductions.map((deduction: any) => (
                        <div key={deduction.id} className="flex justify-between">
                          <span className="text-secondary-600">{deduction.name}</span>
                          <span className="font-medium text-red-600">-MVR {deduction.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {payroll.loans.map((loan: any) => (
                        <div key={loan.id} className="flex justify-between">
                          <span className="text-secondary-600">{loan.name} (Loan)</span>
                          <span className="font-medium text-red-600">-MVR {loan.installmentAmount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="border-t border-red-200 pt-2 mt-2 flex justify-between font-bold">
                        <span className="text-secondary-900">Total Deductions</span>
                        <span className="text-secondary-900">MVR {payroll.deductions.reduce((sum: number, d: any) => sum + d.amount, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Salary */}
                <div className="mt-6 bg-primary-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-secondary-900">Net Salary</span>
                    <span className="text-2xl font-bold text-primary-600">MVR {payroll.netSalary.toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => generatePayslipPDF(payroll)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-primary-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View Details
                  </button>
                  <button
                    onClick={() => generatePayslipPDF(payroll)}
                    className="px-4 py-2 bg-secondary-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-secondary-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>

                {payroll.processedDate && (
                  <div className="mt-4 text-sm text-secondary-600">
                    Processed on: {new Date(payroll.processedDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600">No payslip found for {months[selectedMonth - 1]} {selectedYear}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
