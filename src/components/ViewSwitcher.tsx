import React from 'react';
import { Shirt } from 'lucide-react';

interface ViewSwitcherProps {
  onViewChange: (view: 'front' | 'back' | 'left' | 'right') => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ onViewChange }) => {
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
      <ViewButton label="Алды" onClick={() => onViewChange('front')}>
        <Shirt size={24} strokeWidth={1.5} />
      </ViewButton>
      
      <ViewButton label="Арты" onClick={() => onViewChange('back')}>
        {/* Flipped shirt icon for visual cue */}
        <div className="scale-x-[-1]">
            <Shirt size={24} strokeWidth={1.5} />
        </div>
      </ViewButton>

      <ViewButton label="Сол жақ" onClick={() => onViewChange('left')}>
        <div className="rotate-90">
             <Shirt size={24} strokeWidth={1.5} />
        </div>
      </ViewButton>

      <ViewButton label="Оң жақ" onClick={() => onViewChange('right')}>
         <div className="-rotate-90">
             <Shirt size={24} strokeWidth={1.5} />
        </div>
      </ViewButton>
    </div>
  );
};

interface ViewButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

const ViewButton: React.FC<ViewButtonProps> = ({ label, onClick, children }) => {
  return (
    <div className="group flex flex-col items-center gap-1 cursor-pointer" onClick={onClick}>
       {/* Tooltip-like Label */}
       <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
       </span>

       <div className="w-12 h-12 bg-white rounded-full shadow-lg border-2 border-transparent group-hover:border-blue-500 flex items-center justify-center text-gray-700 hover:text-blue-600 transition-all transform hover:scale-105">
         {children}
       </div>
    </div>
  );
};

export default ViewSwitcher;
