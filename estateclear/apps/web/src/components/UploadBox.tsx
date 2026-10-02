import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import clsx from 'clsx';

interface UploadBoxProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

export const UploadBox: React.FC<UploadBoxProps> = ({ onFilesSelected, className }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  }, [onFilesSelected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div
      className={clsx(
        'relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors',
        isDragging 
          ? 'border-teal-500 bg-teal-50' 
          : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50',
        className
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        title="Upload documents"
      />
      <div className="flex flex-col items-center pointer-events-none">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
          <UploadCloud className="w-8 h-8 text-teal-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Click to upload or drag and drop
        </h3>
        <p className="text-slate-500">
          Supported formats: PDF, JPG, PNG
        </p>
      </div>
    </div>
  );
};
