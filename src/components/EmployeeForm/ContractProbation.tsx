import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { ContractDetails, ProbationDetails } from '../../types';

interface ContractProbationProps {
  contract?: Partial<ContractDetails>;
  probation?: Partial<ProbationDetails>;
  employee?: { fullName?: string; firstName?: string; lastName?: string };
  onNext: (data: { contract: Partial<ContractDetails>; probation: Partial<ProbationDetails> }) => void;
  onPrev: () => void;
  onSave?: () => Promise<void>;
}

export const ContractProbation = ({ contract, probation, employee, onNext, onPrev, onSave }: ContractProbationProps) => {
  const [isSaving, setIsSaving] = useState(false);
  // Helper to safely convert date to ISO string for input
  const dateToInput = (date: Date | string | undefined): string => {
    if (!date) return '';
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
    }
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    }
    return '';
  };

  const [contractData, setContractData] = useState<Partial<ContractDetails>>({
    contractType: contract?.contractType || 'permanent',
    contractStartDate: contract?.contractStartDate || new Date(),
    contractEndDate: contract?.contractEndDate,
    salaryAmount: contract?.salaryAmount || 0,
    currency: contract?.currency || 'MVR',
    paymentFrequency: contract?.paymentFrequency || 'monthly',
    jobDescription: contract?.jobDescription || '',
    reportingManager: contract?.reportingManager || '',
    signingDate: contract?.signingDate || new Date(),
    signedBy: contract?.signedBy || '',
    status: contract?.status || 'active',
    renewalDate: contract?.renewalDate,
    notes: contract?.notes || '',
  });

  const [probationData, setProbationData] = useState<Partial<ProbationDetails>>({
    probationStartDate: probation?.probationStartDate || new Date(),
    probationEndDate: probation?.probationEndDate,
    probationPeriodMonths: probation?.probationPeriodMonths || 3,
    probationManager: probation?.probationManager || '',
    status: probation?.status || 'ongoing',
    notes: probation?.notes || '',
  });

  const handleContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'contractStartDate' || name === 'contractEndDate' || name === 'signingDate' || name === 'renewalDate') {
      setContractData(prev => ({ ...prev, [name]: value ? new Date(value) : undefined }));
    } else if (name === 'salaryAmount' || name === 'probationPeriodMonths') {
      setContractData(prev => ({ ...prev, [name]: parseFloat(value) }));
    } else {
      setContractData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProbationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'probationStartDate' || name === 'probationEndDate') {
      setProbationData(prev => ({ ...prev, [name]: value ? new Date(value) : undefined }));
    } else if (name === 'probationPeriodMonths') {
      setProbationData(prev => ({ ...prev, [name]: parseInt(value) }));
    } else {
      setProbationData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ contract: contractData, probation: probationData });
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {employee?.fullName || employee?.firstName && employee?.lastName 
            ? `${employee.firstName} ${employee.lastName}`
            : 'Employee Details'}
        </h2>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-secondary-900">Contract & Probation Details</h2>
        <p className="text-secondary-600 mt-1">Manage employment contract and probation information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Contract Section */}
        <div className="border border-secondary-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-secondary-900">Contract Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              name="contractType"
              value={contractData.contractType}
              onChange={handleContractChange}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="permanent">Permanent</option>
              <option value="fixed_term">Fixed Term</option>
              <option value="probation">Probation</option>
              <option value="temporary">Temporary</option>
              <option value="consultant">Consultant</option>
            </select>
            <select
              name="status"
              value={contractData.status}
              onChange={handleContractChange}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Contract Start Date"
              name="contractStartDate"
              type="date"
              value={dateToInput(contractData.contractStartDate)}
              onChange={handleContractChange}
            />
            <Input
              label="Contract End Date"
              name="contractEndDate"
              type="date"
              value={dateToInput(contractData.contractEndDate)}
              onChange={handleContractChange}
            />
            <Input
              label="Renewal Date"
              name="renewalDate"
              type="date"
              value={dateToInput(contractData.renewalDate)}
              onChange={handleContractChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Salary Amount"
              name="salaryAmount"
              type="number"
              value={contractData.salaryAmount}
              onChange={handleContractChange}
              placeholder="Enter salary"
            />
            <Input
              label="Currency"
              name="currency"
              value={contractData.currency}
              onChange={handleContractChange}
              placeholder="MVR"
            />
            <select
              name="paymentFrequency"
              value={contractData.paymentFrequency}
              onChange={handleContractChange}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="monthly">Monthly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <Input
            label="Job Description"
            name="jobDescription"
            value={contractData.jobDescription}
            onChange={handleContractChange}
            placeholder="Enter job description"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Reporting Manager"
              name="reportingManager"
              value={contractData.reportingManager}
              onChange={handleContractChange}
              placeholder="Enter reporting manager name"
            />
            <Input
              label="Signed By"
              name="signedBy"
              value={contractData.signedBy}
              onChange={handleContractChange}
              placeholder="Enter signatory name"
            />
          </div>

          <Input
            label="Signing Date"
            name="signingDate"
            type="date"
            value={dateToInput(contractData.signingDate)}
            onChange={handleContractChange}
          />

          <textarea
            name="notes"
            placeholder="Additional notes about the contract"
            value={contractData.notes}
            onChange={handleContractChange}
            className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
          />
        </div>

        {/* Probation Section */}
        <div className="border border-secondary-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-secondary-900">Probation Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Is Probation Employee?</label>
              <select
                name="status"
                value={probationData.status}
                onChange={handleProbationChange}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ongoing">Ongoing Probation</option>
                <option value="completed">Completed</option>
                <option value="extended">Extended</option>
                <option value="failed">Failed</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <Input
              label="Probation Period (Months)"
              name="probationPeriodMonths"
              type="number"
              value={probationData.probationPeriodMonths}
              onChange={handleProbationChange}
              min="1"
              placeholder="e.g., 3"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Probation Start Date"
              name="probationStartDate"
              type="date"
              value={dateToInput(probationData.probationStartDate)}
              onChange={handleProbationChange}
            />
            <Input
              label="Probation End Date"
              name="probationEndDate"
              type="date"
              value={dateToInput(probationData.probationEndDate)}
              onChange={handleProbationChange}
            />
          </div>

          <Input
            label="Probation Manager"
            name="probationManager"
            value={probationData.probationManager}
            onChange={handleProbationChange}
            placeholder="Enter probation manager name"
          />

          <textarea
            name="notes"
            placeholder="Additional notes about probation"
            value={probationData.notes}
            onChange={handleProbationChange}
            className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end pt-4 border-t border-secondary-200">
          <Button variant="secondary" onClick={onPrev}>
            Previous
          </Button>
          {onSave && (
            <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
          <Button type="submit">
            Next: Documents Upload
          </Button>
        </div>
      </form>
    </div>
  );
};
