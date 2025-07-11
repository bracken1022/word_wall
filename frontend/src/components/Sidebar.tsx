'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiUrl } from '../utils/api';

interface Label {
  id: number;
  name: string;
  color: string;
  stickerCount: number;
  createdAt: string;
}

interface SidebarProps {
  onLabelSelect: (labelId: number | null) => void;
  selectedLabelId: number | null;
}

export default function Sidebar({ onLabelSelect, selectedLabelId }: SidebarProps) {
  const { token } = useAuth();
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const labelColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'
  ];

  const fetchLabels = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(apiUrl('/labels'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        // Token is invalid, set empty array and let parent handle logout
        setLabels([]);
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Ensure data is an array
      setLabels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch labels:', error);
      setLabels([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchLabels();
    }
  }, [token, fetchLabels]);

  const handleEditLabel = (label: Label) => {
    setEditingLabel(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const handleSaveEdit = async () => {
    if (!token || !editingLabel) return;

    try {
      await fetch(apiUrl(`/labels/${editingLabel}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          color: editColor,
        }),
      });
      
      setEditingLabel(null);
      fetchLabels();
    } catch (error) {
      console.error('Failed to update label:', error);
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    if (!token) return;
    
    if (!confirm('Are you sure you want to delete this collection? All words will be unorganized.')) {
      return;
    }

    try {
      await fetch(apiUrl(`/labels/${labelId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (selectedLabelId === labelId) {
        onLabelSelect(null);
      }
      fetchLabels();
    } catch (error) {
      console.error('Failed to delete label:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 bg-white/10 backdrop-blur-md border-r border-white/20 p-6">
        <div className="text-white">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-80 bg-white/10 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-white/20 flex flex-col lg:h-screen">
      <div className="p-4 lg:p-6 border-b border-white/10">
        <h2 className="text-lg lg:text-xl font-bold text-white mb-1 lg:mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Collections
        </h2>
        <p className="text-purple-200 text-xs lg:text-sm">
          Words are automatically organized into collections of 10
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 max-h-48 lg:max-h-none">
        {/* All Words Button */}
        <button
          onClick={() => onLabelSelect(null)}
          className={`w-full mb-4 p-4 rounded-xl transition-all flex items-center justify-between ${
            selectedLabelId === null
              ? 'bg-white/20 border-2 border-white/40'
              : 'bg-white/5 border border-white/20 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
            <span className="text-white font-medium">All Words</span>
          </div>
          <span className="text-purple-200 text-sm">
            {labels.reduce((total, label) => total + label.stickerCount, 0)}
          </span>
        </button>

        {/* Labels List */}
        <div className="space-y-3">
          {labels.map((label) => (
            <div
              key={label.id}
              className={`p-4 rounded-xl transition-all border ${
                selectedLabelId === label.id
                  ? 'bg-white/20 border-white/40'
                  : 'bg-white/5 border-white/20 hover:bg-white/10'
              }`}
            >
              {editingLabel === label.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 text-sm"
                    placeholder="Collection name"
                  />
                  <div className="flex gap-2 mb-3">
                    {labelColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          editColor === color ? 'border-white' : 'border-white/30'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-3 py-1 bg-green-500/20 text-green-200 rounded-lg text-sm hover:bg-green-500/30 transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingLabel(null)}
                      className="flex-1 px-3 py-1 bg-gray-500/20 text-gray-200 rounded-lg text-sm hover:bg-gray-500/30 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onLabelSelect(label.id)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full shadow-lg"
                        style={{ backgroundColor: label.color }}
                      ></div>
                      <div>
                        <span className="text-white font-medium">{label.name}</span>
                        <div className="text-purple-200 text-xs">
                          {label.stickerCount}/10 words
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-200 text-sm">{label.stickerCount}</span>
                      {label.stickerCount === 10 && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </button>
                  
                  <div className="flex gap-1 mt-3">
                    <button
                      onClick={() => handleEditLabel(label)}
                      className="flex-1 px-2 py-1 bg-blue-500/20 text-blue-200 rounded text-xs hover:bg-blue-500/30 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLabel(label.id)}
                      className="flex-1 px-2 py-1 bg-red-500/20 text-red-200 rounded text-xs hover:bg-red-500/30 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {labels.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-purple-200 mb-2">No collections yet</p>
              <p className="text-purple-300 text-sm">Add your first word to create a collection!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}