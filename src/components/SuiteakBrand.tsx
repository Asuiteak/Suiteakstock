import React from 'react';

interface SuiteakIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Official Suiteak emblem: Red circle with the fine geometric 'A' monogram.
 * Exactly matches the Suiteak Interiorismo brand mark.
 */
export const SuiteakIcon: React.FC<SuiteakIconProps> = ({ className = 'w-10 h-10', size }) => {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Suiteak Interiorismo Logo"
    >
      {/* Solid Red Circle */}
      <circle cx="50" cy="50" r="48" fill="#EA1D24" />
      {/* Centered fine black 'A' */}
      <path
        d="M 50 23.5 L 34.5 76 M 50 23.5 L 65.5 76 M 39.5 56.5 L 60.5 56.5"
        stroke="#000000"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface SuiteakWordmarkProps {
  className?: string;
  theme?: 'dark' | 'light';
  showStock?: boolean;
}

/**
 * Suiteak wordmark with the signature red 'A'
 */
export const SuiteakWordmark: React.FC<SuiteakWordmarkProps> = ({
  className = 'text-xl',
  theme = 'dark',
  showStock = true,
}) => {
  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const stockColor = theme === 'dark' ? 'text-slate-300' : 'text-slate-600';

  return (
    <span className={`font-black tracking-tight ${textColor} ${className}`}>
      SUITE<span className="text-[#EA1D24]">A</span>K
      {showStock && <span className={`font-bold ml-1 ${stockColor}`}>STOCK</span>}
    </span>
  );
};
