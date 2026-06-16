import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '../ui/button';
import { Crop, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react';

const CropStep = ({ image, onCropComplete, onNext, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => setCrop(crop);
  const onZoomChange = (zoom) => setZoom(zoom);
  const onCropAreaComplete = (_, pixels) => setCroppedAreaPixels(pixels);

  return (
    <div className="flex flex-col h-[500px] bg-[#121212] overflow-hidden rounded-b-xl border-t border-[#262626]">
      <div className="relative flex-1 bg-black">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={onCropChange}
          onCropComplete={onCropAreaComplete}
          onZoomChange={onZoomChange}
        />
      </div>
      
      <div className="p-4 bg-[#121212] flex flex-col gap-4">
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => setAspect(1)} className={`p-2 rounded-lg transition-colors ${aspect === 1 ? 'bg-[#262626] text-white' : 'text-gray-500 hover:text-white'}`}>
            <Square size={20} />
          </button>
          <button onClick={() => setAspect(4/5)} className={`p-2 rounded-lg transition-colors ${aspect === 4/5 ? 'bg-[#262626] text-white' : 'text-gray-500 hover:text-white'}`}>
            <RectangleVertical size={20} />
          </button>
          <button onClick={() => setAspect(16/9)} className={`p-2 rounded-lg transition-colors ${aspect === 16/9 ? 'bg-[#262626] text-white' : 'text-gray-500 hover:text-white'}`}>
            <RectangleHorizontal size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-gray-500">ZOOM</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
            className="w-full accent-[#0095F6] bg-[#262626] h-1 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex justify-between mt-2">
          <Button variant="ghost" onClick={onCancel} className="text-white hover:bg-[#262626]">Cancel</Button>
          <Button onClick={() => onNext(croppedAreaPixels)} className="bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold px-8">Next</Button>
        </div>
      </div>
    </div>
  );
};

export default CropStep;
