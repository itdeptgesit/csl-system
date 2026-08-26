'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, FileText, FileSpreadsheet, FileImage, FileCode, FileVideo, FileAudio, File, Loader2, Globe, Check, Cloud } from 'lucide-react';
import { fetchDriveFiles, DriveFile } from '../lib/googleApi';
import { isGoogleConnected, signInWithGoogle } from '../lib/googleCalendar';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (files: DriveFile[]) => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFiles,
}) => {
  const [isConnected, setIsConnected] = useState(isGoogleConnected());
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load files when modal opens or connection status changes
  useEffect(() => {
    if (isOpen) {
      const connected = isGoogleConnected();
      setIsConnected(connected);
      if (connected) {
        loadFiles();
      }
    } else {
      // Clear state when closing
      setSearchQuery('');
      setSelectedFiles([]);
      setFiles([]);
    }
  }, [isOpen, isConnected]);

  const loadFiles = async (query = '') => {
    setLoading(true);
    try {
      const driveFiles = await fetchDriveFiles(query);
      setFiles(driveFiles);
    } catch (err) {
      console.error('Failed to load drive files:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (isGoogleConnected()) {
        loadFiles(val);
      }
    }, 400);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await signInWithGoogle();
      setIsConnected(true);
      loadFiles();
    } catch (err) {
      console.error('Failed to connect Google:', err);
    } finally {
      setConnecting(false);
    }
  };

  const toggleSelectFile = (file: DriveFile) => {
    const exists = selectedFiles.some(f => f.id === file.id);
    if (exists) {
      setSelectedFiles(selectedFiles.filter(f => f.id !== file.id));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  const handleConfirmSelect = () => {
    if (selectedFiles.length > 0) {
      onSelectFiles(selectedFiles);
    }
    onClose();
  };

  // Helper to determine the best icon based on file type / mimeType
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="text-rose-500" size={16} />;
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="text-emerald-500" size={16} />;
    }
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('rtf')) {
      return <FileText className="text-blue-500" size={16} />;
    }
    if (mimeType.includes('image')) return <FileImage className="text-violet-500" size={16} />;
    if (mimeType.includes('video')) return <FileVideo className="text-amber-500" size={16} />;
    if (mimeType.includes('audio')) return <FileAudio className="text-cyan-500" size={16} />;
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('typescript') || mimeType.includes('html') || mimeType.includes('css')) {
      return <FileCode className="text-teal-500" size={16} />;
    }
    return <File className="text-slate-400" size={16} />;
  };

  if (!isOpen) return null;

  const inputClass = "w-full border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 transition-all font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-300 flex flex-col h-[80vh] max-h-[600px] border border-slate-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-400 via-green-500 to-blue-500 flex items-center justify-center shadow-sm">
              <Cloud size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Google Drive Storage
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Attach files directly from Google Drive
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Search / Connection panel */}
        {isConnected && (
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 shrink-0">
            <div className="relative">
              <input
                type="text"
                className={inputClass}
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search files in Google Drive..."
              />
              <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
              {loading && <Loader2 size={16} className="absolute right-3 top-3.5 animate-spin text-blue-500" />}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col justify-center">
          {!isConnected ? (
            <div className="text-center py-12 px-6 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-900 dark:text-zinc-100">
                <Cloud size={32} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Connect Google Account</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
                Connect your Google Drive account to search, choose, and attach folders and documents directly to your task.
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center justify-center gap-2.5 px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow shadow-zinc-900/10 active:scale-95 disabled:opacity-50"
              >
                {connecting ? <Loader2 size={14} className="animate-spin" /> : null}
                {connecting ? 'Connecting...' : 'Authorize Google Drive'}
              </button>
            </div>
          ) : loading && files.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <Loader2 size={24} className="animate-spin text-zinc-900 dark:text-zinc-100 mb-2" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Searching Drive...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <File size={36} className="text-slate-300 dark:text-zinc-600 mb-3" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">No files found</p>
              <p className="text-[11px] text-slate-400">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="space-y-1.5 self-start w-full">
              {files.map((file) => {
                const isSel = selectedFiles.some(f => f.id === file.id);
                return (
                  <button
                    key={file.id}
                    onClick={() => toggleSelectFile(file)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSel
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-100 dark:border-zinc-800">
                        {file.thumbnailLink ? (
                          <img src={file.thumbnailLink} className="w-full h-full object-cover rounded-lg" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          getFileIcon(file.mimeType)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate pr-2">
                          {file.name}
                        </p>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate max-w-[280px]">
                          {file.mimeType.split('.').pop()?.split('/').pop()}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 pl-2">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Open original file in new tab"
                        >
                          <Globe size={13} />
                        </a>
                      )}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSel
                          ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-zinc-50 dark:text-zinc-900'
                          : 'border-slate-200 dark:border-zinc-700'
                      }`}>
                        {isSel && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 rounded-b-xl flex justify-between items-center shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
            {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Choose files'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedFiles.length === 0}
              onClick={handleConfirmSelect}
              className="px-5 py-2 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 transition-all shadow active:scale-95 disabled:opacity-40"
            >
              Attach Select
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
