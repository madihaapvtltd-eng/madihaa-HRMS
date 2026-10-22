import { useState, useEffect } from 'react';
import { PersonalInfo } from './PersonalInfo';
import { PassportIDDetails } from './PassportIDDetails';
import { WorkPermitVisa } from './WorkPermitVisa';
import { EmergencyContacts } from './EmergencyContacts';
import { EmploymentHistory } from './EmploymentHistory';
import { ContractProbation } from './ContractProbation';
import { DocumentsUpload } from './DocumentsUpload';
import { AccommodationSelection } from './AccommodationSelection';
import type { Employee, EmployeeDocument, EmergencyContact, EmploymentRecord, ContractDetails, ProbationDetails, EmployeeAccommodation } from '../../types';

interface EmployeeFormWizardProps {
  employee?: Partial<Employee>;
  onSave: (data: Partial<Employee>) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export const EmployeeFormWizard = ({ employee, onSave, onCancel, isEditing }: EmployeeFormWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department || '',
        designation: employee.designation || '',
        joinDate: employee.joinDate,
        employeeId: employee.employeeId || '',
        registrationNumber: employee.registrationNumber || '',
        photo: employee.photo || '',
        status: employee.status || 'active',
        emergencyContact: employee.emergencyContact || { name: '', relationship: '', phone: '' },
        employmentHistory: employee.employmentHistory || [],
        documents: employee.documents || [],
        contractDetails: employee.contractDetails,
        probationDetails: employee.probationDetails,
        accommodation: employee.accommodation,
      });
    }
  }, [employee]);

  const steps = [
    { title: 'Personal Information', icon: '👤' },
    { title: 'Passport & ID', icon: '📄' },
    { title: 'Work Permit & Visa', icon: '✈️' },
    { title: 'Emergency Contacts', icon: '🚨' },
    { title: 'Employment History', icon: '📋' },
    { title: 'Contract & Probation', icon: '📑' },
    { title: 'Documents', icon: '📁' },
    { title: 'Accommodation', icon: '🏠' },
  ];

  const handlePersonalInfoNext = (data: Partial<Employee>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(1);
  };

  const handlePassportIDNext = (data: EmployeeDocument[]) => {
    setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), ...data] }));
    setCurrentStep(2);
  };

  const handleWorkPermitVisaNext = (data: EmployeeDocument[]) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents?.filter(d => !data.find(nd => nd.id === d.id)) || [],
    }));
    setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), ...data] }));
    setCurrentStep(3);
  };

  const handleEmergencyContactsNext = (data: EmergencyContact[]) => {
    // Use first contact as primary emergency contact
    setFormData(prev => ({
      ...prev,
      emergencyContact: data[0] || { name: '', relationship: '', phone: '' },
    }));
    setCurrentStep(4);
  };

  const handleEmploymentHistoryNext = (data: EmploymentRecord[]) => {
    setFormData(prev => ({ ...prev, employmentHistory: data }));
    setCurrentStep(5);
  };

  const handleContractProbationNext = (data: {
    contract: Partial<ContractDetails>;
    probation: Partial<ProbationDetails>;
  }) => {
    setFormData(prev => ({
      ...prev,
      contractDetails: data.contract as ContractDetails,
      probationDetails: data.probation as ProbationDetails,
    }));
    setCurrentStep(6);
  };

  const handleDocumentsNext = (data: EmployeeDocument[]) => {
    setFormData(prev => ({ ...prev, documents: data }));
    setCurrentStep(7);
  };

  const handleAccommodationNext = (accommodation: EmployeeAccommodation | undefined) => {
    setFormData(prev => ({ ...prev, accommodation }));
    // This is the final step, submit the form
    handleComplete();
  };

  const handleSaveCurrent = async (data?: Partial<Employee>) => {
    setIsSaving(true);
    try {
      // If data is provided (from PersonalInfo save), use it directly
      const dataToSave = data ? {
        ...data,
        fullName: `${data.firstName || formData.firstName} ${data.lastName || formData.lastName}`,
      } : {
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`,
      };
      
      await onSave(dataToSave);
      // Update formData with the saved data to ensure status is preserved
      setFormData(prev => ({ ...prev, ...dataToSave }));
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`,
      });
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <PersonalInfo
            employee={employee}
            onNext={handlePersonalInfoNext}
            onCancel={onCancel}
            onSave={async (data) => {
              setFormData(prev => ({ ...prev, ...data }));
              await handleSaveCurrent(data);
            }}
          />
        );
      case 1:
        return (
          <PassportIDDetails
            documents={formData.documents?.filter(d => d.type === 'passport' || d.type === 'id_card') || []}
            onNext={handlePassportIDNext}
            onPrev={() => setCurrentStep(0)}
            onSave={handleSaveCurrent}
          />
        );
      case 2:
        return (
          <WorkPermitVisa
            documents={formData.documents?.filter(d => d.name.includes('Work Permit') || d.name.includes('Visa')) || []}
            onNext={handleWorkPermitVisaNext}
            onPrev={() => setCurrentStep(1)}
            onSave={handleSaveCurrent}
          />
        );
      case 3:
        return (
          <EmergencyContacts
            contacts={formData.emergencyContact ? [formData.emergencyContact] : []}
            onNext={handleEmergencyContactsNext}
            onPrev={() => setCurrentStep(2)}
            onSave={handleSaveCurrent}
          />
        );
      case 4:
        return (
          <EmploymentHistory
            records={formData.employmentHistory || []}
            onNext={handleEmploymentHistoryNext}
            onPrev={() => setCurrentStep(3)}
            onSave={handleSaveCurrent}
          />
        );
      case 5:
        return (
          <ContractProbation
            contract={formData.contractDetails}
            probation={formData.probationDetails}
            onNext={handleContractProbationNext}
            onPrev={() => setCurrentStep(4)}
            onSave={handleSaveCurrent}
          />
        );
      case 6:
        return (
          <DocumentsUpload
            documents={formData.documents || []}
            onNext={handleDocumentsNext}
            onPrev={() => setCurrentStep(5)}
            onSubmit={handleComplete}
            onSave={handleSaveCurrent}
          />
        );
      case 7:
        return (
          <AccommodationSelection
            accommodation={formData.accommodation}
            onNext={handleAccommodationNext}
            onPrev={() => setCurrentStep(6)}
            onCancel={onCancel}
            onSave={handleSaveCurrent}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-secondary-900">
            {steps[currentStep].icon} {steps[currentStep].title}
          </h1>
          <p className="text-sm text-secondary-600">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
        <div className="w-full bg-secondary-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {steps.map((step, index) => (
          <button
            key={index}
            onClick={() => isEditing ? setCurrentStep(index) : index < currentStep && setCurrentStep(index)}
            disabled={!isEditing && index > currentStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
              index === currentStep
                ? 'bg-primary-600 text-white'
                : index < currentStep || isEditing
                ? 'bg-green-100 text-green-700 cursor-pointer'
                : 'bg-secondary-200 text-secondary-600 cursor-not-allowed'
            }`}
          >
            <span>{step.icon}</span>
            <span className="text-sm font-medium">{step.title}</span>
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {renderStep()}
      </div>

      {/* Loading Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-secondary-900 font-medium">Saving employee profile...</p>
          </div>
        </div>
      )}
    </div>
  );
};
