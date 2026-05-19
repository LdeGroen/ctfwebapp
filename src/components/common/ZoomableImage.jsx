import React, { useState, useRef } from 'react';

const ZoomableImage = ({ src, alt }) => {
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const imageRef = useRef(null);
    const containerRef = useRef(null);
    const isPinching = useRef(false);
    const lastPinchDist = useRef(0);
    const isDragging = useRef(false);
    const lastDragPos = useRef({ x: 0, y: 0 });

    const updateTransform = (newTransform, { clamp = true } = {}) => {
        setTransform(prev => {
            let { scale, x, y } = { ...prev, ...newTransform };

            if (clamp) {
                scale = Math.max(1, Math.min(scale, 5));

                if (scale === 1) {
                    x = 0;
                    y = 0;
                } else {
                    const imageEl = imageRef.current;
                    const containerEl = containerRef.current;
                    if (imageEl && containerEl) {
                        const max_x = (imageEl.offsetWidth * scale - containerEl.clientWidth) / 2;
                        const max_y = (imageEl.offsetHeight * scale - containerEl.clientHeight) / 2;
                        x = Math.max(-max_x, Math.min(x, max_x));
                        y = Math.max(-max_y, Math.min(y, max_y));
                    }
                }
            }
            return { scale, x, y };
        });
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const scaleDelta = e.deltaY * -0.01;
        updateTransform({ scale: transform.scale + scaleDelta });
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        isDragging.current = true;
        lastDragPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        const dx = e.clientX - lastDragPos.current.x;
        const dy = e.clientY - lastDragPos.current.y;
        lastDragPos.current = { x: e.clientX, y: e.clientY };
        updateTransform({ x: transform.x + dx, y: transform.y + dy });
    };

    const handleMouseUp = () => isDragging.current = false;

    const getDistance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            isPinching.current = true;
            lastPinchDist.current = getDistance(e.touches);
        } else if (e.touches.length === 1) {
            e.preventDefault();
            isDragging.current = true;
            lastDragPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchMove = (e) => {
        if (isPinching.current && e.touches.length === 2) {
            e.preventDefault();
            const newDist = getDistance(e.touches);
            const scaleDelta = (newDist - lastPinchDist.current) * 0.01;
            lastPinchDist.current = newDist;
            updateTransform({ scale: transform.scale + scaleDelta });
        } else if (isDragging.current && e.touches.length === 1) {
            e.preventDefault();
            const dx = e.touches[0].clientX - lastDragPos.current.x;
            const dy = e.clientY - lastDragPos.current.y;
            lastDragPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            updateTransform({ x: transform.x + dx, y: transform.y + dy });
        }
    };

    const handleTouchEnd = () => {
        isPinching.current = false;
        isDragging.current = false;
    };

    const handleDoubleClick = () => {
        updateTransform({ scale: transform.scale > 1 ? 1 : 2 });
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
        >
            <img
                ref={imageRef}
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out"
                style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
            />
        </div>
    );
};

export default ZoomableImage;
