import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadBox } from '../components/UploadBox';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FileText, X } from 'lucide-react';
import { uploadDocument } from '../services/api';

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    
    try {
      // Simulate sequential upload for MVP
      for (const file of files) {
        await uploadDocument(file);
      }
      navigate('/processing');
    } catch (e) {
      console.error(e);
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Upload documents</h1>
      <p className="text-lg text-slate-600 mb-8">
        Add bank statements, insurance policies, or any other financial documents.
      </p>

      <UploadBox onFilesSelected={handleFilesSelected} className="mb-8" />

      {files.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-slate-900 mb-4 uppercase tracking-wider">
            Ready to process ({files.length})
          </h3>
          <div className="space-y-3">
            {files.map((file, i) => (
              <Card key={i} className="p-4 flex items-center justify-between bg-slate-50 border-transparent">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-white rounded-lg">
                    <FileText className="w-5 h-5 text-teal-700" />
                  </div>
                  <span className="font-medium text-slate-900 truncate">
                    {file.name}
                  </span>
                </div>
                <button 
                  onClick={() => removeFile(i)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                  disabled={isUploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          variant="secondary" 
          onClick={() => navigate(-1)}
          disabled={isUploading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={files.length === 0 || isUploading}
          className="flex-1"
        >
          {isUploading ? 'Uploading...' : 'Process documents'}
        </Button>
      </div>
    </div>
  );
};
