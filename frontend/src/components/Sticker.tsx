'use client';

import { useState, useRef } from 'react';
import { safeString } from '../utils/safeRender';

interface StickerProps {
  id: number;
  word: string;
  meaning: string;
  chineseMeaning?: string;
  usage?: string;
  scenarios?: string;
  color: string;
  x: number;
  y: number;
  onUpdate: (id: number, x: number, y: number) => void;
  onDelete: (id: number) => void;
  onCardClick: (sticker: StickerProps) => void;
}

export default function Sticker({ id, word, meaning, chineseMeaning, usage, scenarios, color, x, y, onUpdate, onDelete, onCardClick }: StickerProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  return (
    <div
      className="w-36 h-24 sm:w-40 sm:h-28 perspective-1000 transition-all duration-200 hover:scale-105 cursor-pointer hover:shadow-xl"
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation();
          
          // Handle double-click to flip
          if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
            clickTimeout.current = null;
            setIsFlipped(!isFlipped);
          } else {
            // Single click - wait to see if it's a double click
            clickTimeout.current = setTimeout(() => {
              onCardClick({ id, word, meaning, chineseMeaning, usage, scenarios, color, x, y, onUpdate, onDelete, onCardClick });
              clickTimeout.current = null;
            }, 200);
          }
        }}
      >
        {/* Glassmorphism Front of sticker */}
        <div
          className="absolute inset-0 w-full h-full rounded-2xl shadow-xl backface-hidden flex items-center justify-center text-white font-medium border border-white/30 backdrop-blur-sm"
          style={{ 
            background: `linear-gradient(135deg, ${color}80, ${color}60)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
          }}
        >
          <div className="text-center px-2 sm:px-3">
            <div className="text-sm sm:text-lg font-bold tracking-tight leading-tight drop-shadow-lg">{word}</div>
            <div className="text-xs opacity-80 mt-1 font-light hidden sm:block">click for details • double-tap to flip</div>
            <div className="text-xs opacity-80 mt-1 font-light sm:hidden">tap for details</div>
          </div>
          
          {/* Glassmorphism accent */}
          <div className="absolute top-3 right-3 w-2 h-2 bg-white/40 rounded-full shadow-sm"></div>
          <div className="absolute bottom-3 left-3 w-1 h-1 bg-white/30 rounded-full"></div>
        </div>
        
        {/* Glassmorphism Back of sticker */}
        <div className="absolute inset-0 w-full h-full bg-white/20 backdrop-blur-md rounded-2xl shadow-xl backface-hidden rotate-y-180 p-2 sm:p-3 border border-white/30 overflow-hidden">
          <div className="h-full flex flex-col text-xs">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <div className="font-bold text-white text-xs sm:text-sm drop-shadow-lg">{word}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                className="w-5 h-5 bg-red-500/30 hover:bg-red-500/50 backdrop-blur-sm text-white hover:text-red-100 rounded-lg text-xs transition-all border border-red-400/30 flex items-center justify-center shadow-lg"
              >
                ×
              </button>
            </div>
            
            {/* DeepSeek Preview - Show condensed sections from new structure */}
            {usage && (() => {
              const content = safeString(usage);
              
              // Extract first part of each section for preview (actual DeepSeek format)
              const definitionMatch = content.match(/###\s*单词定义[:：]?\s*\n([\s\S]*?)(?=###\s*使用场景|$)/i);
              const scenariosMatch = content.match(/###\s*使用场景与英文例句[:：]?\s*\n([\s\S]*?)(?=###\s*常见搭配|$)/i);
              const synonymsMatch = content.match(/####?\s*\d+\.?\s*常见近义词对比[:：]?\s*([\s\S]*?)(?=---|$)/i);
              
              const definitionPreview = definitionMatch ? definitionMatch[1].trim().substring(0, 25) + '...' : '';
              const scenariosPreview = scenariosMatch ? scenariosMatch[1].trim().substring(0, 20) + '...' : '';
              const synonymsPreview = synonymsMatch ? synonymsMatch[1].trim().split(/[,\n\|]/).slice(0, 2).join(', ').substring(0, 20) + '...' : '';
              
              return (
                <div className="text-xs space-y-1">
                  {definitionPreview && (
                    <div className="text-blue-100 bg-blue-500/20 backdrop-blur-sm px-2 py-1 rounded text-xs border border-blue-400/30">
                      🧠 {definitionPreview}
                    </div>
                  )}
                  {scenariosPreview && (
                    <div className="text-blue-100 bg-blue-500/20 backdrop-blur-sm px-2 py-1 rounded text-xs border border-blue-400/30">
                      ✅ {scenariosPreview}
                    </div>
                  )}
                  {synonymsPreview && (
                    <div className="text-blue-100 bg-blue-500/20 backdrop-blur-sm px-2 py-1 rounded text-xs border border-blue-400/30">
                      🔁 {synonymsPreview}
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* Glassmorphism drag indicator */}
            <div className="absolute bottom-2 left-2 w-4 h-0.5 bg-white/30 rounded-full shadow-sm"></div>
            <div className="absolute bottom-2 left-2 w-2 h-0.5 bg-white/60 rounded-full shadow-sm"></div>
          </div>
        </div>
      </div>
    </div>
  );
}