'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiUrl } from '../utils/api';

interface ImportStatus {
  isRunning: boolean;
  progress: number;
  total: number;
  currentWord?: string;
  completed: number;
  errors: string[];
}

export default function AdminPanel() {
  const { token, user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchImportStatus = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(apiUrl('/admin/import-status'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const status = await response.json();
        setImportStatus(status);
      }
    } catch (error) {
      console.error('Failed to fetch import status:', error);
    }
  }, [token]);

  useEffect(() => {
    // Poll for import status if there's an active import
    if (importStatus?.isRunning) {
      statusInterval.current = setInterval(fetchImportStatus, 2000);
    } else {
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
        statusInterval.current = null;
      }
    }

    return () => {
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
      }
    };
  }, [importStatus?.isRunning, fetchImportStatus]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.type === 'text/csv' ||
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls') ||
          file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setMessage('');
      } else {
        setMessage('Please select a valid Excel file (.xlsx, .xls) or CSV file (.csv)');
        setMessageType('error');
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !token) return;

    setIsUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(apiUrl('/admin/upload-words'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`Upload successful! Processing ${result.totalWords} words...`);
        setMessageType('success');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Start polling for status
        fetchImportStatus();
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      setMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.type === 'text/csv' ||
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls') ||
          file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setMessage('');
      } else {
        setMessage('Please select a valid Excel file (.xlsx, .xls) or CSV file (.csv)');
        setMessageType('error');
        setSelectedFile(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-20 h-20 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Management</h1>
            <p className="text-purple-200">Welcome, {user?.username}! Upload Excel files to batch import words.</p>
          </div>

          {/* Upload Section */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8 mb-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Excel File
            </h2>
            
            <div 
              className="border-2 border-dashed border-white/30 rounded-2xl p-8 text-center hover:border-white/50 transition-all cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <svg className="w-12 h-12 text-white/60 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              
              {selectedFile ? (
                <div>
                  <p className="text-white font-semibold mb-2">{selectedFile.name}</p>
                  <p className="text-purple-200 text-sm">File selected successfully</p>
                </div>
              ) : (
                <div>
                  <p className="text-white mb-2">Drop your Excel file here, or click to browse</p>
                  <p className="text-purple-200 text-sm">Supports .xlsx, .xls, and .csv files (max 10MB)</p>
                  <p className="text-purple-300 text-xs mt-2">First column should contain English words</p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || importStatus?.isRunning}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload & Process
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {message && (
            <div className={`p-4 rounded-xl mb-6 border ${
              messageType === 'success' 
                ? 'bg-green-500/20 border-green-400/30 text-green-200' 
                : 'bg-red-500/20 border-red-400/30 text-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Import Progress */}
          {importStatus && (
            <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Processing Status
              </h3>
              
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm text-white mb-2">
                    <span>Progress: {importStatus.completed} / {importStatus.total}</span>
                    <span>{importStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${importStatus.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Status */}
                <div className="flex items-center gap-2 text-purple-200">
                  {importStatus.isRunning ? (
                    <>
                      <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing: {importStatus.currentWord || 'Starting...'}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span>Completed</span>
                    </>
                  )}
                </div>

                {/* Errors */}
                {importStatus.errors.length > 0 && (
                  <div>
                    <h4 className="text-red-300 font-semibold mb-2">Errors ({importStatus.errors.length}):</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importStatus.errors.map((error, index) => (
                        <div key={index} className="text-red-200 text-sm bg-red-500/10 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}