import React from 'react';

interface LoadingBigProps {
  className?: string;
}

const LoadingBig: React.FC<LoadingBigProps> = ({ className = '' }) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
      <style>{`.spinner_ngNb{animation:spinner_ZRWK 1.2s cubic-bezier(0.52,.6,.25,.99) infinite}.spinner_6TBP{animation-delay:.6s}@keyframes spinner_ZRWK{0%{transform:translate(12px,12px) scale(0);opacity:1}100%{transform:translate(0,0) scale(1);opacity:0}}`}</style>
      <path className="spinner_ngNb" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9,9,0,0,1,12,21Z" transform="translate(12, 12) scale(0)" fill="white"/>
      <path className="spinner_ngNb spinner_6TBP" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9,9,0,0,1,12,21Z" transform="translate(12, 12) scale(0)" fill="white"/>
    </svg>
  );
};

export default LoadingBig;
