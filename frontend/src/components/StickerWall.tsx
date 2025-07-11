'use client';

import { useState, useEffect, useCallback } from 'react';
import Sticker from './Sticker';
import CardModal from './CardModal';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { apiUrl } from '../utils/api';

interface StickerData {
  id: number;
  word: string;
  meaning: string;
  chineseMeaning?: string;
  usage?: string;
  scenarios?: string;
  color: string;
  x: number;
  y: number;
}

export default function StickerWall() {
  const { user, token, logout, isLoading } = useAuth();
  const [stickers, setStickers] = useState<StickerData[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newSticker, setNewSticker] = useState({
    word: '',
    meaning: '',
    usage: '',
    color: '#f59e0b',
    useAI: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCard, setSelectedCard] = useState<StickerData | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);

  const colors = [
    '#f59e0b', '#ef4444', '#10b981', '#3b82f6', 
    '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'
  ];

  const fetchStickers = useCallback(async () => {
    if (!token) return;
    
    try {
      const url = selectedLabelId 
        ? apiUrl(`/stickers/label/${selectedLabelId}`)
        : apiUrl('/stickers');
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        // Token is invalid, logout user
        logout();
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Ensure data is an array
      setStickers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch stickers:', error);
      setStickers([]); // Set empty array on error
    }
  }, [token, selectedLabelId, logout]);

  useEffect(() => {
    if (token) {
      fetchStickers();
    }
  }, [token, fetchStickers, selectedLabelId]);

  const addSticker = async () => {
    if (!token) return;
    
    console.log('addSticker called with:', newSticker);
    if (!newSticker.word) {
      console.log('No word provided');
      return;
    }
    if (!newSticker.useAI && !newSticker.meaning) {
      console.log('No AI and no meaning provided');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(apiUrl('/stickers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newSticker,
          x: 0, // Will be calculated in grid layout
          y: 0, // Will be calculated in grid layout
        }),
      });

      if (response.ok) {
        await fetchStickers();
        setNewSticker({ word: '', meaning: '', usage: '', color: '#f59e0b', useAI: true });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to add sticker:', error);
    } finally {
      setIsGenerating(false);
    }
  };


  const deleteSticker = async (id: number) => {
    if (!token) return;
    
    try {
      await fetch(apiUrl(`/stickers/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setStickers(prev => prev.filter(sticker => sticker.id !== id));
    } catch (error) {
      console.error('Failed to delete sticker:', error);
    }
  };

  const handleCardClick = (sticker: StickerData) => {
    setSelectedCard(sticker);
    setShowCardModal(true);
  };

  const closeCardModal = () => {
    setShowCardModal(false);
    setSelectedCard(null);
  };

  const handleLabelSelect = (labelId: number | null) => {
    setSelectedLabelId(labelId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
          <div className="absolute bottom-40 right-10 w-28 h-28 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-6000"></div>
        </div>

        {/* Welcome Screen */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-8">
          <div className="text-center">
            <div className="mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl mb-4 sm:mb-6">
                <svg className="w-6 h-6 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">Words Wall</h1>
              <p className="text-lg sm:text-xl text-purple-200 mb-6 sm:mb-8">AI-Powered Vocabulary Learning</p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full max-w-xs sm:w-64 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-semibold shadow-lg hover:shadow-xl text-base sm:text-lg"
              >
                Sign In
              </button>
              <br />
              <button
                onClick={() => setShowRegisterModal(true)}
                className="w-full max-w-xs sm:w-64 px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/20 transition-all font-semibold shadow-lg text-base sm:text-lg"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
        <RegisterModal 
          isOpen={showRegisterModal} 
          onClose={() => setShowRegisterModal(false)}
          onSwitchToLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden flex flex-col lg:flex-row">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-20 h-20 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
        <div className="absolute bottom-40 right-10 w-28 h-28 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-6000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-float"></div>
        <div className="absolute top-1/4 right-1/3 w-20 h-20 bg-rose-400 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-float animation-delay-2000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]"></div>

      {/* Sidebar */}
      <Sidebar onLabelSelect={handleLabelSelect} selectedLabelId={selectedLabelId} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:h-screen">
        {/* Modern Header */}
        <div className="relative z-30 py-4 lg:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 lg:px-8 border-b border-white/10 gap-4">
          <div className="flex items-center gap-2 lg:gap-4 bg-white/10 backdrop-blur-md px-4 lg:px-8 py-3 lg:py-4 rounded-2xl shadow-lg border border-white/20 w-full sm:w-auto">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-white">Words Wall</h1>
              <p className="text-purple-200 text-xs lg:text-sm">AI-Powered Vocabulary Learning</p>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-2 lg:gap-4 bg-white/10 backdrop-blur-md px-4 lg:px-6 py-3 rounded-2xl shadow-lg border border-white/20 w-full sm:w-auto">
            <div className="text-right flex-1 sm:flex-initial">
              <p className="text-white font-semibold text-sm lg:text-base">{user.username}</p>
              <p className="text-purple-200 text-xs lg:text-sm hidden sm:block">{user.email}</p>
            </div>
            <div className="flex gap-1 lg:gap-2">
              {user.isAdmin && (
                <a
                  href="/admin"
                  className="px-2 lg:px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 hover:text-white rounded-xl transition-all font-medium border border-purple-400/30 text-xs lg:text-sm"
                >
                  Admin
                </a>
              )}
              <button
                onClick={logout}
                className="px-2 lg:px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white rounded-xl transition-all font-medium border border-red-400/30 text-xs lg:text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Modern Add Button */}
          <div className="absolute top-4 lg:top-6 right-4 lg:right-8 z-50">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add Word button clicked');
                setShowAddForm(true);
              }}
              className="group bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 lg:px-6 py-2 lg:py-3 rounded-xl shadow-lg border border-white/20 transition-all duration-200 font-medium flex items-center gap-2 hover:shadow-xl hover:-translate-y-0.5 text-sm lg:text-base"
            >
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full group-hover:scale-110 transition-transform"></div>
              Add Word
            </button>
          </div>

          {/* Modern Wall Container */}
          <div className="h-full p-4 lg:p-8 flex items-center justify-center">
            <div className="relative w-full h-full bg-white/10 backdrop-blur-md rounded-2xl lg:rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Subtle accent lines */}
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              
              {/* Modern grid pattern */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `
                  radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)
                `,
                backgroundSize: '24px 24px'
              }}></div>

              {/* Stickers Container */}
              <div className="relative w-full h-full p-4 lg:p-6 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4 justify-items-center">
                  {stickers.map(sticker => (
                    <Sticker
                      key={sticker.id}
                      {...sticker}
                      onUpdate={() => {}} // No-op function for now
                      onDelete={deleteSticker}
                      onCardClick={handleCardClick}
                    />
                  ))}
                </div>
                
                {/* Modern Empty state */}
                {stickers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-8 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/30 shadow-lg">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl opacity-80 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-2xl font-bold mb-3 text-white">Start your vocabulary journey</p>
                      <p className="text-purple-200 text-lg mb-6">Add your first word and let AI help you learn</p>
                      <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 text-purple-100">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Click &quot;Add Word&quot; to begin
                      </div>
                    </div>
                  </div>
                )}

      {/* Glassmorphism Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg border border-white/20 transform transition-all duration-300 hover:scale-[1.02] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-lg"></div>
              <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Add New Word</h2>
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full shadow-lg"></div>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-white drop-shadow-sm">Word</label>
                <input
                  type="text"
                  value={newSticker.word}
                  onChange={(e) => setNewSticker({ ...newSticker, word: e.target.value })}
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 focus:outline-none transition-all text-white placeholder-white/60 shadow-lg"
                  placeholder="Enter English word"
                  disabled={isGenerating}
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-purple-500/20 backdrop-blur-sm rounded-xl border border-purple-400/30 shadow-lg animate-fade-in">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={newSticker.useAI}
                  onChange={(e) => setNewSticker({ ...newSticker, useAI: e.target.checked })}
                  className="w-4 h-4 text-purple-400 bg-white/20 border-white/30 rounded focus:ring-purple-400/50"
                  disabled={isGenerating}
                />
                <label htmlFor="useAI" className="text-sm font-medium text-purple-100 drop-shadow-sm">
                  🤖 Auto-generate meaning, Chinese translation, and usage scenarios
                </label>
              </div>

              {!newSticker.useAI && (
                <div className="animate-slide-down space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-white drop-shadow-sm">Meaning</label>
                    <input
                      type="text"
                      value={newSticker.meaning}
                      onChange={(e) => setNewSticker({ ...newSticker, meaning: e.target.value })}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 focus:outline-none transition-all text-white placeholder-white/60 shadow-lg"
                      placeholder="Enter meaning"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-white drop-shadow-sm">Usage Example</label>
                    <textarea
                      value={newSticker.usage}
                      onChange={(e) => setNewSticker({ ...newSticker, usage: e.target.value })}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl h-24 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 focus:outline-none transition-all text-white placeholder-white/60 shadow-lg resize-none"
                      placeholder="How is this word used? (optional)"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-3 text-white drop-shadow-sm">Color Theme</label>
                <div className="grid grid-cols-4 gap-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewSticker({ ...newSticker, color })}
                      className={`aspect-square rounded-xl transition-all duration-200 border-2 shadow-lg backdrop-blur-sm ${
                        newSticker.color === color 
                          ? 'border-white/60 scale-110 shadow-xl' 
                          : 'border-white/30 hover:border-white/50 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all font-semibold shadow-lg"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                onClick={addSticker}
                disabled={isGenerating || !newSticker.word}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/20"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    Add Word
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          isOpen={showCardModal}
          onClose={closeCardModal}
          word={selectedCard.word}
          usage={selectedCard.usage}
          color={selectedCard.color}
          id={selectedCard.id}
          onDelete={deleteSticker}
        />
      )}
    </div>
  );
}