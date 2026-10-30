import { useState } from 'react';
import { Button } from '../ui/Button';
import { Upload, FileText, Trash2 } from 'lucide-react';
import type { DocumentType, EmployeeDocument } from '../../types';

interface DocumentsUploadProps {
  documents?: EmployeeDocument[];
  employee?: { fullName?: string; firstName?: string; lastName?: string };
  onNext: (data: EmployeeDocument[]) => void;
  onPrev: () => void;
  onSubmit: (isComplete: boolean) => void;
  onSave?: () => Promise<void>;
}

export const DocumentsUpload = ({ documents = [], employee, onNext, onPrev, onSubmit, onSave }: DocumentsUploadProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [docs, setDocs] = useState<EmployeeDocument[]>(documents);
  const [selectedType, setSelectedType] = useState<string>('certificate');

  const documentTypes = [
    { value: 'id_card', label: 'ID Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'contract', label: 'Contract' },
    { value: 'training_certificate', label: 'Training Certificate' },
    { value: 'other', label: 'Other Document' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const url = reader.result as string;
          const newDoc: EmployeeDocument = {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: selectedType as DocumentType,
            name: file.name,
            url: url,
            uploadedAt: new Date(),
            expiryDate: undefined,
          };
          setDocs(prev => [...prev, newDoc]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeDoc = (id: string) => {
    setDocs(docs.filter(doc => doc.id !== id));
  };

  const handleComplete = () => {
    onNext(docs);
    onSubmit(true);
  };

  const handlePrevStep = () => {
    onNext(docs);
    onPrev();
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
        <h2 className="text-2xl font-bold text-secondary-900">Documents Upload</h2>
        <p className="text-secondary-600 mt-1">Upload employee documents and certificates</p>
      </div>

      <div className="space-y-6">
        {/* Document Type Selection */}
        <div className="border border-secondary-200 rounded-lg p-6 space-y-4 bg-secondary-50">
          <h3 className="text-lg font-semibold text-secondary-900">Select Document Type</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {documentTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`p-3 rounded-lg border-2 text-center transition ${
                  selectedType === type.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                    : 'border-secondary-200 text-secondary-600 hover:border-primary-300'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-primary-300 rounded-lg p-8">
          <label className="cursor-pointer">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="w-12 h-12 text-primary-500" />
              <div>
                <p className="text-center font-medium text-secondary-900">
                  Click to upload or drag and drop
                </p>
                <p className="text-center text-sm text-secondary-600">
                  PDF, DOC, DOCX, PNG, JPG (Max 10MB each)
                </p>
              </div>
            </div>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            />
          </label>
        </div>

        {/* Uploaded Documents */}
        {docs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-secondary-900">Uploaded Documents ({docs.length})</h3>
            <div className="space-y-2">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-secondary-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-secondary-900 truncate">{doc.name}</p>
                      <p className="text-xs text-secondary-600">
                        {documentTypes.find(t => t.value === doc.type)?.label || doc.type}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDoc(doc.id)}
                    className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Note:</span> Documents are optional at this stage. You can upload them later from the employee profile. All documents will be securely stored and accessible from the Digital Personnel Files section.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end pt-4 border-t border-secondary-200">
          <Button variant="secondary" onClick={handlePrevStep}>
            Previous
          </Button>
          {onSave && (
            <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
          <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
            Complete & Save Employee
          </Button>
        </div>
      </div>
    </div>
  );
};
