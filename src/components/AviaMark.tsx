import type { ReactNode } from 'react';

interface AviaMarkProps {
  mood?: 'idle' | 'thinking' | 'celebrate' | 'gentle';
  size?: 'small' | 'large';
  children?: ReactNode;
}

export function AviaMark({ mood = 'idle', size = 'small', children }: AviaMarkProps) {
  return (
    <span className={`avia-mark avia-mark--${size} avia-mark--${mood}`} aria-hidden="true">
      <svg viewBox="0 0 72 72" role="presentation">
        <defs>
          <linearGradient id="aviaWing" x1="8" y1="9" x2="62" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e94d52" />
            <stop offset="0.58" stopColor="#d6262e" />
            <stop offset="1" stopColor="#9f1d27" />
          </linearGradient>
          <radialGradient id="aviaGlow"><stop stopColor="#f5c9ca" stopOpacity=".72" /><stop offset="1" stopColor="#f5c9ca" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="36" cy="36" r="34" fill="url(#aviaGlow)" />
        <path d="M13 43.5c8.1-1.2 14.8-5 20.3-11.5 4.7-5.5 8.2-10.5 12-13.5-.1 8.4-2.5 15.1-7.2 20.1 5.4-.5 10.7-3.3 15.9-8.3-1.1 10.1-5.6 17.5-13.4 22.1-8.5 5.1-18.1 3.3-27.6-1.2 5.9.1 10.4-1.1 14.1-3.7-4.9.2-9.6-1-14.1-4Z" fill="url(#aviaWing)" />
        <path d="M19 42.6c9.1-.3 15.6-4 21.9-11.5M26.2 49.4c6.7-.6 12-3.6 16.1-8.7" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2.2" opacity=".95" />
        <path className="avia-spark" d="M54 11v8m-4-4h8m-4 31v6m-3-3h6" stroke="#a51e27" strokeLinecap="round" strokeWidth="2" />
        <circle className="avia-orbit-dot" cx="13" cy="21" r="2.4" fill="#e94d52" />
      </svg>
      {children}
    </span>
  );
}
