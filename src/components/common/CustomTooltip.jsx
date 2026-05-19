import React from 'react';

const CustomTooltip = ({ showCustomTooltip, customTooltipContent, customTooltipPosition }) => {
  if (!showCustomTooltip) return null;

  return (
    <div className="fixed bg-[#20747f] text-white p-3 rounded-md shadow-lg z-50 text-base pointer-events-none" style={{ left: customTooltipPosition.x, top: customTooltipPosition.y }}>
      {customTooltipContent}
    </div>
  );
};

export default CustomTooltip;
