import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { UploadBox } from '../components/UploadBox';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { uploadDocument } from '../services/api';
import { assetCategories } from './AssetMap/CategoryBrowser';

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const selectedCategory = assetCategories.find(({ id }) => id === searchParams.get('category'));

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

  if (!selectedCategory) return <Navigate to="/asset-map" replace />;

  return (
    <div className="max-w-2xl mx-auto pt-8">
      <h1 className="text-3xl font-bold text-primary mb-2">Upload {selectedCategory.name}</h1>
      <p className="text-lg text-outline mb-8">
        Add documents related to {selectedCategory.name.toLowerCase()}.
      </p>

      <UploadBox onFilesSelected={handleFilesSelected} className="mb-8" />

      {files.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-primary mb-4 uppercase tracking-wider">
            Ready to process ({files.length})
          </h3>
          <div className="space-y-3">
            {files.map((file, i) => (
              <Card key={i} className="p-4 flex items-center justify-between bg-background border-transparent">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-surface-container-lowest rounded-lg">
                    <span className="material-symbols-outlined text-primary-container">description</span>
                  </div>
                  <span className="font-medium text-primary truncate">
                    {file.name}
                  </span>
                </div>
                <button 
                  onClick={() => removeFile(i)}
                  className="p-2 text-outline hover:text-outline rounded-full hover:bg-surface-container transition-colors"
                  disabled={isUploading}
                >
                  <span className="material-symbols-outlined">close</span>
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
