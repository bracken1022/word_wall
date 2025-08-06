'use client';

import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const ratingLabels = {
  0: 'Not rated',
  1: 'Very difficult',
  2: 'Difficult', 
  3: 'Moderate',
  4: 'Familiar',
  5: 'Very familiar'
};

export default function StarRating({ 
  rating, 
  onChange, 
  readonly = false, 
  size = 'medium',
  showLabel = false 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4 text-sm';
      case 'large':
        return 'w-8 h-8 text-xl';
      default:
        return 'w-5 h-5 text-base';
    }
  };

  const handleStarClick = (starRating: number) => {
    if (!readonly && onChange) {
      onChange(starRating);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${getSizeClasses()} transition-all duration-200 ${
              readonly 
                ? 'cursor-default' 
                : 'cursor-pointer hover:scale-110 active:scale-95'
            }`}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
          >
            <svg
              fill={star <= displayRating ? '#fbbf24' : '#e5e7eb'}
              stroke={star <= displayRating ? '#f59e0b' : '#d1d5db'}
              strokeWidth="1"
              viewBox="0 0 24 24"
              className="transition-colors duration-200"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        ))}
      </div>
      
      {showLabel && (
        <span className={`text-gray-300 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
          {ratingLabels[displayRating as keyof typeof ratingLabels]}
        </span>
      )}
      
      {!readonly && !showLabel && hoverRating > 0 && (
        <span className="text-xs text-gray-400 ml-1">
          {ratingLabels[hoverRating as keyof typeof ratingLabels]}
        </span>
      )}
    </div>
  );
}