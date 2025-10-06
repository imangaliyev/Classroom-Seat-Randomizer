import React from 'react';

export const ShuffleIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <circle cx="9.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);
