import React from 'react';
import { Button } from '../ui/button';
import { FILTERS } from '@/lib/imageProcessing';

const FilterStep = ({ image, selectedFilter, onFilterSelect, onNext, onBack, isVideo }) => {
  return (
    <div className="flex flex-col h-[500px] bg-[#121212] overflow-hidden rounded-b-xl border-t border-[#262626]">
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {isVideo ? (
          <video 
            src={image} 
            className="max-h-full max-w-full object-contain"
            style={{ filter: selectedFilter }}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img 
            src={image} 
            alt="Preview" 
            className="max-h-full max-w-full object-contain"
            style={{ filter: selectedFilter }}
          />
        )}
      </div>
      
      <div className="p-4 bg-[#121212] border-t border-[#262626]">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Filters</span>
          <button 
            onClick={() => onFilterSelect("contrast(1.15) brightness(1.05) saturate(1.25) sepia(0.05)")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-full text-[10px] font-bold text-white transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <span>✨</span> Magic Enhance
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {FILTERS.map((f) => (
            <div 
              key={f.name}
              onClick={() => onFilterSelect(f.filter)}
              className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 group"
            >
              <div 
                className={`w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${selectedFilter === f.filter ? 'border-[#0095F6]' : 'border-transparent group-hover:border-gray-600'}`}
              >
                <img 
                  src={image} 
                  className="w-full h-full object-cover"
                  style={{ filter: f.filter }}
                  alt={f.name}
                />
              </div>
              <span className={`text-[10px] font-bold ${selectedFilter === f.filter ? 'text-[#0095F6]' : 'text-gray-500'}`}>
                {f.name.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-2">
          <Button variant="ghost" onClick={onBack} className="text-white hover:bg-[#262626]">Back</Button>
          <Button onClick={onNext} className="bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold px-8">Next</Button>
        </div>
      </div>
    </div>
  );
};

export default FilterStep;
