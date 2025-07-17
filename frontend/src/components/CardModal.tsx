'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { safeString } from '../utils/safeRender';
import { apiUrl } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  usage?: string;
  color: string;
  id: number;
  onDelete: (id: number) => void;
  wordEntity?: {
    id: number;
    isProcessing?: boolean;
    processingStatus?: string;
    scenarios?: string[];
    meaning?: string;
    usage?: string;
  };
}

export default function CardModal({ isOpen, onClose, word, usage, color, id, onDelete, wordEntity }: CardModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(usage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [currentWordData, setCurrentWordData] = useState<{
    id: number;
    word: string;
    meaning?: string;
    usage?: string;
    isProcessing?: boolean;
    processingStatus?: string;
    scenarios?: string[];
  } | null>(null);
  const { token } = useAuth();

  // Function to fetch latest word data
  const fetchLatestWordData = async () => {
    console.log('🔍 fetchLatestWordData called');
    console.log('📊 token:', !!token);
    console.log('📊 wordEntity:', wordEntity);
    console.log('📊 wordEntity?.id:', wordEntity?.id);
    
    if (!token || !wordEntity?.id) {
      console.log('❌ Missing token or wordEntity.id, skipping fetch');
      return;
    }
    
    console.log(`🔄 Fetching latest word data for ID: ${wordEntity.id}`);
    setIsRefreshing(true);
    setRefreshError(null);
    
    try {
      const url = apiUrl(`/words/${wordEntity.id}`);
      console.log('📡 Making API call to:', url);
      console.log('📡 Headers:', { 'Authorization': `Bearer ${token?.substring(0, 10)}...` });
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (response.ok) {
        const updatedWord = await response.json();
        console.log(`✅ Retrieved latest word data for ID: ${wordEntity.id}`);
        console.log('📊 Updated word data:', updatedWord);
        
        setCurrentWordData(updatedWord);
        setEditContent(updatedWord.usage || updatedWord.meaning || '');
        
        return updatedWord;
      } else {
        const errorText = await response.text();
        console.error('❌ API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching word data for ID: ${wordEntity.id}`, error);
      setRefreshError('Failed to fetch latest word data');
      
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setRefreshError(null);
      }, 5000);
      
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset flip state when modal opens and fetch latest data
  useEffect(() => {
    console.log('🔍 CardModal useEffect triggered');
    console.log('📊 isOpen:', isOpen);
    console.log('📊 wordEntity:', wordEntity);
    console.log('📊 wordEntity?.id:', wordEntity?.id);
    
    if (isOpen) {
      setIsFlipped(false);
      setIsEditing(false);
      setEditContent(usage || '');
      setRefreshError(null);
      
      // Fetch latest word data when modal opens
      if (wordEntity?.id) {
        console.log('✅ Calling fetchLatestWordData');
        fetchLatestWordData();
      } else {
        console.log('❌ No wordEntity.id, skipping fetch');
      }
    }
  }, [isOpen, usage, wordEntity?.id]);

  const handleSave = async () => {
    if (!token) return;
    
    setIsSaving(true);
    try {
      // Use word entity ID if available, otherwise fall back to sticker ID
      const wordId = currentWordData?.id || wordEntity?.id || id;
      const response = await fetch(apiUrl(`/words/${wordId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          usage: editContent,
          meaning: editContent, // Use the same content for both fields
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        // Refresh the word data to show updated content
        await fetchLatestWordData();
      } else {
        alert('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative z-10 perspective-1000">
        <div
          className={`relative w-full h-full max-w-[95vw] max-h-[95vh] sm:w-[480px] sm:h-[600px] sm:max-w-[90vw] sm:max-h-[90vh] transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={async () => {
            console.log('🔄 Card flip clicked');
            const newFlippedState = !isFlipped;
            console.log('📊 newFlippedState:', newFlippedState);
            console.log('📊 wordEntity:', wordEntity);
            console.log('📊 wordEntity?.id:', wordEntity?.id);
            setIsFlipped(newFlippedState);
            
            // If flipping to back view, refresh the data
            if (newFlippedState && wordEntity?.id) {
              console.log('✅ Conditions met, calling fetchLatestWordData');
              try {
                await fetchLatestWordData();
              } catch {
                // Error handling is already done in fetchLatestWordData
              }
            } else {
              console.log('❌ Conditions not met for fetching data');
            }
          }}
        >
          {/* Front of Card */}
          <div
            className="absolute inset-0 w-full h-full rounded-3xl shadow-2xl backface-hidden flex items-center justify-center text-white font-medium border border-white/30 backdrop-blur-md"
            style={{ 
              background: `linear-gradient(135deg, ${color}90, ${color}70)`,
              boxShadow: '0 25px 50px rgba(0,0,0,0.4), 0 15px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            <div className="text-center px-4 sm:px-8">
              <div className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight drop-shadow-xl mb-2 sm:mb-4">{word}</div>
              <div className="text-sm sm:text-lg opacity-80 font-light">Click to reveal meaning</div>
            </div>
            
            {/* Glassmorphism accents */}
            <div className="absolute top-6 right-6 w-4 h-4 bg-white/40 rounded-full shadow-lg"></div>
            <div className="absolute bottom-6 left-6 w-2 h-2 bg-white/30 rounded-full"></div>
            <div className="absolute top-1/2 left-6 w-1 h-8 bg-white/20 rounded-full"></div>
          </div>
          
          {/* Back of Card */}
          <div className="absolute inset-0 w-full h-full bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl backface-hidden rotate-y-180 border border-white/30 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Fixed Header */}
              <div className="flex-shrink-0 p-4 sm:p-6 pb-0">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="font-bold text-white text-xl sm:text-2xl drop-shadow-lg flex items-center gap-3">
                    {word}
                    {isRefreshing && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {refreshError && (
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">!</span>
                      </div>
                    )}
                    {currentWordData?.isProcessing && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-yellow-200 text-xs">Processing...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(!isEditing);
                      }}
                      className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/30 hover:bg-blue-500/50 backdrop-blur-sm text-white hover:text-blue-100 rounded-xl transition-all border border-blue-400/30 flex items-center justify-center shadow-lg text-xs sm:text-sm font-bold"
                      title="编辑内容"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除单词 &quot;${word}&quot; 吗？`)) {
                          onDelete(id);
                          onClose();
                        }
                      }}
                      className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500/30 hover:bg-red-500/50 backdrop-blur-sm text-white hover:text-red-100 rounded-xl transition-all border border-red-400/30 flex items-center justify-center shadow-lg text-xs sm:text-sm font-bold"
                      title="删除单词"
                    >
                      🗑️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-500/30 hover:bg-gray-500/50 backdrop-blur-sm text-white hover:text-gray-100 rounded-xl transition-all border border-gray-400/30 flex items-center justify-center shadow-lg text-sm sm:text-lg font-bold"
                      title="关闭"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Error message display */}
              {refreshError && (
                <div className="mx-4 sm:mx-6 mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                  <div className="text-red-200 text-sm text-center">{refreshError}</div>
                </div>
              )}
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent relative group">
                
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <div className="text-white text-lg font-semibold mb-2">编辑 &quot;{word}&quot; 的内容</div>
                      <div className="text-white/80 text-sm mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span>🌐 1. 访问</span>
                          <a 
                            href="https://chatgpt.com/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-300 hover:text-blue-200 underline"
                          >
                            ChatGPT
                          </a>
                        </div>
                        <div className="mb-2">📝 2. 复制并发送以下提示词：</div>
                        <div className="bg-black/30 p-3 rounded-lg border border-white/10 mb-2">
                          <div className="text-green-300 font-mono text-sm mb-1">解释 {word} 的发音，使用场景以及近义词</div>
                          <button
                            onClick={() => navigator.clipboard.writeText(`解释 ${word} 的发音，使用场景以及近义词`)}
                            className="text-xs bg-green-500/20 hover:bg-green-500/30 px-2 py-1 rounded text-green-200 border border-green-400/30"
                          >
                            📋 复制提示词
                          </button>
                        </div>
                        <div className="text-white/70 text-xs">💡 3. 将ChatGPT的回答粘贴到下方文本框中</div>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-96 p-4 bg-black/30 text-white rounded-xl border border-white/20 focus:border-white/40 focus:outline-none resize-none"
                        placeholder={`请在此处输入或粘贴关于 &quot;${word}&quot; 的详细解释...`}
                      />
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-4 py-2 bg-green-500/30 hover:bg-green-500/50 text-white rounded-xl transition-all border border-green-400/30 disabled:opacity-50"
                        >
                          {isSaving ? '保存中...' : '保存'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 bg-gray-500/30 hover:bg-gray-500/50 text-white rounded-xl transition-all border border-gray-400/30"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div>
                    {/* Parse and display the new beautiful Qwen sections */}
                    {(() => {
                      // Use currentWordData if available, otherwise fall back to usage prop
                      const contentToUse = currentWordData?.usage || currentWordData?.meaning || usage || '';
                      const content = safeString(contentToUse);
                  
                  // Debug logging for full Qwen response
                  console.log('=== QWEN RESPONSE DEBUG ===');
                  console.log('Full content length:', content.length);
                  console.log('Full content:', content);
                  console.log('=== END QWEN RESPONSE ===');
                  
                  // Extract sections based on new Qwen format with more flexible matching
                  const basicInfoMatch = content.match(/###\s*🎯\s*词性与基本含义\s*([\s\S]*?)(?=###|$)/i);
                  const detailsMatch = content.match(/###\s*🌟\s*详细释义\s*([\s\S]*?)(?=###|$)/i);
                  
                  // Try multiple patterns for scenarios section
                  let scenariosMatch = content.match(/###\s*✨\s*使用场景与例句\s*([\s\S]*?)(?=###\s*🔄|###\s*🎪|###\s*🎬|$)/i);
                  if (!scenariosMatch) {
                    scenariosMatch = content.match(/###\s*✨\s*使用场景\s*([\s\S]*?)(?=###\s*🔄|###\s*🎪|###\s*🎬|$)/i);
                  }
                  if (!scenariosMatch) {
                    // Try to match from first scenario subsection
                    scenariosMatch = content.match(/####\s*🏢\s*\*\*场景一\*\*\s*([\s\S]*?)(?=###\s*🔄|###\s*🎪|###\s*🎬|$)/i);
                  }
                  
                  const synonymsMatch = content.match(/###\s*🔄\s*近义词对比\s*([\s\S]*?)(?=###|$)/i);
                  const collocationsMatch = content.match(/###\s*🎪\s*常用搭配表达\s*([\s\S]*?)(?=###|$)/i);
                  const memoryMatch = content.match(/###\s*🎬\s*记忆金句\s*([\s\S]*?)(?=---|$)/i);
                  
                  const basicInfoContent = basicInfoMatch ? basicInfoMatch[1].trim() : '';
                  const detailsContent = detailsMatch ? detailsMatch[1].trim() : '';
                  const scenariosContent = scenariosMatch ? scenariosMatch[1].trim() : '';
                  const synonymsContent = synonymsMatch ? synonymsMatch[1].trim() : '';
                  
                  // Debug logging for each section
                  console.log('=== SECTION PARSING DEBUG ===');
                  console.log('Basic Info Match:', !!basicInfoMatch, basicInfoContent.length > 0 ? 'HAS CONTENT' : 'EMPTY');
                  console.log('Details Match:', !!detailsMatch, detailsContent.length > 0 ? 'HAS CONTENT' : 'EMPTY');
                  console.log('Scenarios Match:', !!scenariosMatch, scenariosContent.length > 0 ? 'HAS CONTENT' : 'EMPTY');
                  if (!scenariosMatch) {
                    console.log('Scenarios section not found, checking for section headers in content...');
                    console.log('Contains ✨ 使用场景与例句:', content.includes('✨ 使用场景与例句'));
                    console.log('Contains 🏢 场景一:', content.includes('🏢 **场景一**'));
                  }
                  console.log('Synonyms Match:', !!synonymsMatch, synonymsContent.length > 0 ? 'HAS CONTENT' : 'EMPTY');
                  console.log('Collocations Match:', !!collocationsMatch);
                  console.log('Memory Match:', !!memoryMatch);
                  
                  if (synonymsContent) {
                    console.log('Synonyms content extracted:', synonymsContent);
                  }
                  if (basicInfoContent) {
                    console.log('Basic info content:', basicInfoContent);
                  }
                  if (scenariosContent) {
                    console.log('Scenarios content extracted:', scenariosContent);
                  }
                  const collocationsContent = collocationsMatch ? collocationsMatch[1].trim() : '';
                  
                  // Function to fix table formatting if needed
                  const fixTableFormat = (content: string) => {
                    // Check if content has table-like structure but missing proper markdown
                    if (content.includes('|') && !content.includes('---|')) {
                      // Already has pipes, might just need header separator
                      const lines = content.split('\n').filter(line => line.trim());
                      if (lines.length > 1 && lines[0].includes('|') && !lines[1].includes('---')) {
                        // Add header separator after first line
                        const headerCols = lines[0].split('|').length - 1;
                        const separator = '|' + ' --- |'.repeat(headerCols);
                        lines.splice(1, 0, separator);
                        return lines.join('\n');
                      }
                    }
                    return content;
                  };
                  const memoryContent = memoryMatch ? memoryMatch[1].trim() : '';
                  
                  return (
                    <div className="space-y-4">
                      {/* Section 1: 词性与基本含义 */}
                      {basicInfoContent && (
                        <div className="mb-4">
                          <div className="text-emerald-200 text-sm font-semibold mb-2 uppercase tracking-wide">🎯 词性与基本含义</div>
                          <div className="bg-emerald-500/20 backdrop-blur-sm p-4 rounded-xl border border-emerald-400/30 shadow-lg">
                            <div className="text-emerald-100 text-sm leading-relaxed">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({children}) => <p className="text-emerald-100 mb-2 leading-relaxed">{children}</p>,
                                  strong: ({children}) => <strong className="text-emerald-50 font-semibold">{children}</strong>,
                                  em: ({children}) => <em className="text-emerald-200 italic">{children}</em>,
                                  ul: ({children}) => <ul className="text-emerald-100 mb-2 pl-4 space-y-1">{children}</ul>,
                                  li: ({children}) => <li className="text-emerald-100 list-disc">{children}</li>
                                }}
                              >
                                {basicInfoContent}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 2: 详细释义 */}
                      {detailsContent && (
                        <div className="mb-4">
                          <div className="text-purple-200 text-sm font-semibold mb-2 uppercase tracking-wide">🌟 详细释义</div>
                          <div className="bg-purple-500/20 backdrop-blur-sm p-4 rounded-xl border border-purple-400/30 shadow-lg">
                            <div className="text-purple-100 text-sm leading-relaxed">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({children}) => <p className="text-purple-100 mb-2 leading-relaxed">{children}</p>,
                                  strong: ({children}) => <strong className="text-purple-50 font-semibold">{children}</strong>,
                                  em: ({children}) => <em className="text-purple-200 italic">{children}</em>,
                                  ul: ({children}) => <ul className="text-purple-100 mb-2 pl-4 space-y-1">{children}</ul>,
                                  li: ({children}) => <li className="text-purple-100 list-disc">{children}</li>,
                                  blockquote: ({children}) => <blockquote className="border-l-4 border-purple-400/50 pl-4 py-2 my-3 bg-purple-600/10 rounded-r-lg italic text-purple-200">{children}</blockquote>
                                }}
                              >
                                {detailsContent}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Section 3: 使用场景与例句 */}
                      {scenariosContent && (
                        <div className="mb-4">
                          <div className="text-cyan-200 text-sm font-semibold mb-2 uppercase tracking-wide">✨ 使用场景与例句</div>
                          <div className="bg-cyan-500/20 backdrop-blur-sm p-4 rounded-xl border border-cyan-400/30 shadow-lg">
                            <div className="text-cyan-100 text-sm leading-relaxed">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({children}) => <p className="text-cyan-100 mb-2 leading-relaxed">{children}</p>,
                                  strong: ({children}) => <strong className="text-cyan-50 font-semibold">{children}</strong>,
                                  em: ({children}) => <em className="text-cyan-200 italic">{children}</em>,
                                  ul: ({children}) => <ul className="text-cyan-100 mb-2 pl-4 space-y-1">{children}</ul>,
                                  ol: ({children}) => <ol className="text-cyan-100 mb-2 pl-4 space-y-1">{children}</ol>,
                                  li: ({children}) => <li className="text-cyan-100 list-disc">{children}</li>,
                                  code: ({children}) => <code className="text-cyan-50 bg-cyan-800/30 px-1 py-0.5 rounded text-xs">{children}</code>,
                                  h4: ({children}) => <h4 className="text-cyan-50 font-semibold mb-2 mt-3">{children}</h4>
                                }}
                              >
                                {scenariosContent}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Section 4: 近义词对比 */}
                      {synonymsContent && (
                        <div className="mb-4">
                          <div className="text-orange-200 text-sm font-semibold mb-2 uppercase tracking-wide">🔄 近义词对比</div>
                          <div className="bg-orange-500/20 backdrop-blur-sm p-4 rounded-xl border border-orange-400/30 shadow-lg">
                            <div className="text-orange-100 text-sm leading-relaxed">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({children}) => <p className="text-orange-100 mb-2 leading-relaxed">{children}</p>,
                                  strong: ({children}) => <strong className="text-orange-50 font-semibold">{children}</strong>,
                                  em: ({children}) => <em className="text-orange-200 italic">{children}</em>,
                                  ul: ({children}) => <ul className="text-orange-100 mb-2 pl-4 space-y-1">{children}</ul>,
                                  li: ({children}) => <li className="text-orange-100 list-disc">{children}</li>,
                                  table: ({children}) => (
                                    <div className="overflow-x-auto mb-4">
                                      <table className="w-full text-orange-100 border-collapse bg-orange-900/20 rounded-lg overflow-hidden shadow-lg">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  thead: ({children}) => <thead className="bg-orange-600/40">{children}</thead>,
                                  tbody: ({children}) => <tbody className="divide-y divide-orange-400/20">{children}</tbody>,
                                  tr: ({children}) => <tr className="hover:bg-orange-500/10 transition-colors">{children}</tr>,
                                  th: ({children}) => <th className="p-2 text-left font-semibold text-orange-50 bg-orange-600/30 border-r border-orange-400/20 last:border-r-0 text-sm">{children}</th>,
                                  td: ({children}) => <td className="p-2 text-orange-100 border-r border-orange-400/10 last:border-r-0 align-top text-sm">{children}</td>
                                }}
                              >
                                {fixTableFormat(synonymsContent)}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Section 5: 常用搭配表达 */}
                      {collocationsContent && (
                        <div className="mb-4">
                          <div className="text-rose-200 text-sm font-semibold mb-2 uppercase tracking-wide">🎪 常用搭配表达</div>
                          <div className="bg-rose-500/20 backdrop-blur-sm p-4 rounded-xl border border-rose-400/30 shadow-lg">
                            <div className="text-rose-100 text-sm leading-relaxed">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({children}) => <p className="text-rose-100 mb-2 leading-relaxed">{children}</p>,
                                  strong: ({children}) => <strong className="text-rose-50 font-semibold">{children}</strong>,
                                  em: ({children}) => <em className="text-rose-200 italic">{children}</em>,
                                  ul: ({children}) => <ul className="text-rose-100 mb-2 pl-4 space-y-1">{children}</ul>,
                                  li: ({children}) => <li className="text-rose-100 list-disc">{children}</li>,
                                  table: ({children}) => (
                                    <div className="overflow-x-auto mb-4">
                                      <table className="w-full text-rose-100 border-collapse bg-rose-900/20 rounded-lg overflow-hidden shadow-lg">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  thead: ({children}) => <thead className="bg-rose-600/40">{children}</thead>,
                                  tbody: ({children}) => <tbody className="divide-y divide-rose-400/20">{children}</tbody>,
                                  tr: ({children}) => <tr className="hover:bg-rose-500/10 transition-colors">{children}</tr>,
                                  th: ({children}) => <th className="p-2 text-left font-semibold text-rose-50 bg-rose-600/30 border-r border-rose-400/20 last:border-r-0 text-sm">{children}</th>,
                                  td: ({children}) => <td className="p-2 text-rose-100 border-r border-rose-400/10 last:border-r-0 align-top text-sm">{children}</td>
                                }}
                              >
                                {fixTableFormat(collocationsContent)}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Section 6: 记忆金句 */}
                      {memoryContent && (
                        <div className="mb-4">
                          <div className="text-indigo-200 text-sm font-semibold mb-2 uppercase tracking-wide">🎬 记忆金句</div>
                          <div className="bg-indigo-500/20 backdrop-blur-sm p-4 rounded-xl border border-indigo-400/30 shadow-lg">
                            <div className="text-indigo-100 text-sm leading-relaxed">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({children}) => <p className="text-indigo-100 mb-2 leading-relaxed">{children}</p>,
                                  strong: ({children}) => <strong className="text-indigo-50 font-semibold">{children}</strong>,
                                  em: ({children}) => <em className="text-indigo-200 italic">{children}</em>,
                                  ul: ({children}) => <ul className="text-indigo-100 mb-2 pl-4 space-y-1">{children}</ul>,
                                  li: ({children}) => <li className="text-indigo-100 list-disc">{children}</li>,
                                  code: ({children}) => <code className="text-indigo-50 bg-indigo-800/30 px-1 py-0.5 rounded text-xs">{children}</code>
                                }}
                              >
                                {memoryContent}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Fallback: show original content if parsing fails */}
                      {!basicInfoContent && !detailsContent && !scenariosContent && !synonymsContent && !collocationsContent && !memoryContent && (
                        <div className="mb-4">
                          <div className="text-blue-200 text-sm font-semibold mb-2 uppercase tracking-wide">🤖 Qwen AI 分析</div>
                          <div className="bg-blue-500/20 backdrop-blur-sm p-4 rounded-xl border border-blue-400/30 shadow-lg">
                            <div className="text-blue-100 text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({children}) => <h1 className="text-2xl font-bold text-blue-50 mb-4 border-b border-blue-400/30 pb-2">{children}</h1>,
                                  h2: ({children}) => <h2 className="text-xl font-bold text-blue-100 mb-3 mt-6">{children}</h2>,
                                  h3: ({children}) => <h3 className="text-lg font-semibold text-blue-200 mb-2 mt-4">{children}</h3>,
                                  h4: ({children}) => <h4 className="text-base font-semibold text-blue-300 mb-2 mt-3">{children}</h4>,
                                  p: ({children}) => <p className="text-blue-100 mb-3 leading-relaxed">{children}</p>,
                                  strong: ({children}) => <strong className="text-blue-50 font-semibold">{children}</strong>,
                                  em: ({children}) => <em className="text-blue-200 italic">{children}</em>,
                                  blockquote: ({children}) => (
                                    <blockquote className="border-l-4 border-blue-400/50 pl-4 py-2 my-3 bg-blue-600/10 rounded-r-lg italic text-blue-200">
                                      {children}
                                    </blockquote>
                                  ),
                                  ul: ({children}) => <ul className="text-blue-100 mb-3 pl-4 space-y-1">{children}</ul>,
                                  ol: ({children}) => <ol className="text-blue-100 mb-3 pl-4 space-y-1">{children}</ol>,
                                  li: ({children}) => <li className="text-blue-100 list-disc marker:text-blue-300">{children}</li>,
                                  code: ({children}) => <code className="text-blue-50 bg-blue-800/40 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                                  hr: () => <hr className="border-blue-400/30 my-4" />,
                                  table: ({children}) => (
                                    <div className="overflow-x-auto mb-4">
                                      <table className="w-full text-blue-100 border-collapse bg-blue-900/20 rounded-lg overflow-hidden shadow-lg">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  thead: ({children}) => <thead className="bg-blue-600/40">{children}</thead>,
                                  tbody: ({children}) => <tbody className="divide-y divide-blue-400/20">{children}</tbody>,
                                  tr: ({children}) => <tr className="hover:bg-blue-500/10 transition-colors">{children}</tr>,
                                  th: ({children}) => <th className="p-3 text-left font-semibold text-blue-50 bg-blue-600/30 border-r border-blue-400/20 last:border-r-0">{children}</th>,
                                  td: ({children}) => <td className="p-3 text-blue-100 border-r border-blue-400/10 last:border-r-0 align-top">{children}</td>
                                }}
                              >
                                {content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                  </div>
                )}
                
                {/* Extra spacing at bottom for scroll */}
                <div className="h-4"></div>
                
                {/* Scroll indicator */}
                <div className="absolute top-0 right-2 w-1 h-8 bg-gradient-to-b from-white/40 to-transparent rounded-full opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="absolute bottom-0 right-2 w-1 h-8 bg-gradient-to-t from-white/40 to-transparent rounded-full opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
              
              {/* Glassmorphism decorative elements */}
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-white/20 rounded-full blur-lg pointer-events-none"></div>
            </div>
          </div>
        </div>
        
        {/* Close hint */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-white/60 text-sm text-center">
          <div>Click card to flip • Scroll to see all content</div>
          <div className="text-xs mt-1 opacity-75">Press ESC or click outside to close</div>
        </div>
      </div>
    </div>
  );
}