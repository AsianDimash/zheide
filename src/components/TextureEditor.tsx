
import React, { useRef, useState, useEffect } from 'react';
import { ViewConfig, TransformState } from '../types';
import { X, RotateCw, Maximize } from 'lucide-react';

interface TextureEditorProps {
    viewConfig: ViewConfig;
    setViewConfig: React.Dispatch<React.SetStateAction<ViewConfig>>;
    baseColor: string;
}

const TextureEditor: React.FC<TextureEditorProps> = ({ viewConfig, setViewConfig, baseColor }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeElement, setActiveElement] = useState<'image' | 'text' | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [interactionType, setInteractionType] = useState<'move' | 'rotate' | 'scale' | null>(null);

    // Stores initial state at the start of a drag
    const dragRef = useRef({
        startX: 0,
        startY: 0,
        initialTransform: { x: 0, y: 0, scale: 1, rotation: 0 } as TransformState,
        initialDistance: 0,
        initialAngle: 0,
        centerX: 0,
        centerY: 0
    });

    // Helper to update specific transform
    const updateTransform = (type: 'image' | 'text', updates: Partial<TransformState>) => {
        setViewConfig(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                transform: { ...prev[type].transform, ...updates }
            }
        }));
    };

    const handleMouseDown = (
        e: React.MouseEvent,
        type: 'image' | 'text',
        interaction: 'move' | 'rotate' | 'scale'
    ) => {
        e.stopPropagation();
        e.preventDefault();

        if (!containerRef.current) return;

        setActiveElement(type);
        setIsDragging(true);
        setInteractionType(interaction);

        const transform = viewConfig[type].transform;
        const clientX = e.clientX;
        const clientY = e.clientY;

        const containerRect = containerRef.current.getBoundingClientRect();
        // x/y in transform are percentages. Convert to pixels relative to container
        const centerX = (transform.x / 100) * containerRect.width;
        const centerY = (transform.y / 100) * containerRect.height;

        // Mouse pos relative to container
        const mouseRelX = clientX - containerRect.left;
        const mouseRelY = clientY - containerRect.top;

        dragRef.current = {
            startX: clientX,
            startY: clientY,
            initialTransform: { ...transform },
            // Dist from center to mouse (for scaling)
            initialDistance: Math.hypot(mouseRelX - centerX, mouseRelY - centerY),
            // Angle from center to mouse (for rotation)
            initialAngle: Math.atan2(mouseRelY - centerY, mouseRelX - centerX),
            centerX,
            centerY
        };
    };

    const handleTouchStart = (
        e: React.TouchEvent,
        type: 'image' | 'text',
        interaction: 'move' | 'rotate' | 'scale'
    ) => {
        e.stopPropagation();
        // e.preventDefault(); // Don't prevent default here to allow some interactions, or handle carefully

        if (!containerRef.current) return;

        setActiveElement(type);
        setIsDragging(true);
        setInteractionType(interaction);

        const transform = viewConfig[type].transform;
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;

        const containerRect = containerRef.current.getBoundingClientRect();
        const centerX = (transform.x / 100) * containerRect.width;
        const centerY = (transform.y / 100) * containerRect.height;

        const mouseRelX = clientX - containerRect.left;
        const mouseRelY = clientY - containerRect.top;

        dragRef.current = {
            startX: clientX,
            startY: clientY,
            initialTransform: { ...transform },
            initialDistance: Math.hypot(mouseRelX - centerX, mouseRelY - centerY),
            initialAngle: Math.atan2(mouseRelY - centerY, mouseRelX - centerX),
            centerX,
            centerY
        };
    };

    const handleDelete = (e: React.MouseEvent, type: 'image' | 'text') => {
        e.stopPropagation();
        if (type === 'image') {
            setViewConfig(prev => ({ ...prev, image: { ...prev.image, src: null } }));
        } else {
            setViewConfig(prev => ({ ...prev, text: { ...prev.text, content: '' } }));
        }
        setActiveElement(null);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !activeElement || !interactionType || !containerRef.current) return;

            e.preventDefault(); // Prevent text selection etc.

            const containerRect = containerRef.current.getBoundingClientRect();
            const currentX = e.clientX;
            const currentY = e.clientY;

            if (interactionType === 'move') {
                const deltaX = currentX - dragRef.current.startX;
                const deltaY = currentY - dragRef.current.startY;

                // Convert pixel delta to percentage
                const percentDeltaX = (deltaX / containerRect.width) * 100;
                const percentDeltaY = (deltaY / containerRect.height) * 100;

                updateTransform(activeElement, {
                    x: Math.max(0, Math.min(100, dragRef.current.initialTransform.x + percentDeltaX)),
                    y: Math.max(0, Math.min(100, dragRef.current.initialTransform.y + percentDeltaY))
                });
            }
            else if (interactionType === 'scale') {
                // Calculate new distance from center
                const mouseRelX = currentX - containerRect.left;
                const mouseRelY = currentY - containerRect.top;
                const currentDist = Math.hypot(mouseRelX - dragRef.current.centerX, mouseRelY - dragRef.current.centerY);

                // Ratio of new distance to old distance
                // Avoid division by zero or negative scaling issues
                const safeInitialDist = dragRef.current.initialDistance || 1;
                const scaleRatio = currentDist / safeInitialDist;
                const newScale = dragRef.current.initialTransform.scale * scaleRatio;

                updateTransform(activeElement, { scale: Math.max(0.1, Math.min(5, newScale)) });
            }
            else if (interactionType === 'rotate') {
                const mouseRelX = currentX - containerRect.left;
                const mouseRelY = currentY - containerRect.top;
                const currentAngle = Math.atan2(mouseRelY - dragRef.current.centerY, mouseRelX - dragRef.current.centerX);

                // Difference in angle
                const angleDiffRad = currentAngle - dragRef.current.initialAngle;
                const angleDiffDeg = angleDiffRad * (180 / Math.PI);

                updateTransform(activeElement, { rotation: (dragRef.current.initialTransform.rotation + angleDiffDeg) % 360 });
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging || !activeElement || !interactionType || !containerRef.current) return;

            // Prevent scrolling while dragging
            if (e.cancelable) e.preventDefault();

            const containerRect = containerRef.current.getBoundingClientRect();
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            if (interactionType === 'move') {
                const deltaX = currentX - dragRef.current.startX;
                const deltaY = currentY - dragRef.current.startY;

                const percentDeltaX = (deltaX / containerRect.width) * 100;
                const percentDeltaY = (deltaY / containerRect.height) * 100;

                updateTransform(activeElement, {
                    x: Math.max(0, Math.min(100, dragRef.current.initialTransform.x + percentDeltaX)),
                    y: Math.max(0, Math.min(100, dragRef.current.initialTransform.y + percentDeltaY))
                });
            }
            else if (interactionType === 'scale') {
                const mouseRelX = currentX - containerRect.left;
                const mouseRelY = currentY - containerRect.top;
                const currentDist = Math.hypot(mouseRelX - dragRef.current.centerX, mouseRelY - dragRef.current.centerY);

                const safeInitialDist = dragRef.current.initialDistance || 1;
                const scaleRatio = currentDist / safeInitialDist;
                const newScale = dragRef.current.initialTransform.scale * scaleRatio;

                updateTransform(activeElement, { scale: Math.max(0.1, Math.min(5, newScale)) });
            }
            else if (interactionType === 'rotate') {
                const mouseRelX = currentX - containerRect.left;
                const mouseRelY = currentY - containerRect.top;
                const currentAngle = Math.atan2(mouseRelY - dragRef.current.centerY, mouseRelX - dragRef.current.centerX);

                const angleDiffRad = currentAngle - dragRef.current.initialAngle;
                const angleDiffDeg = angleDiffRad * (180 / Math.PI);

                updateTransform(activeElement, { rotation: (dragRef.current.initialTransform.rotation + angleDiffDeg) % 360 });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setInteractionType(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove, { passive: false });
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, interactionType, activeElement]);

    return (
        <div
            className="w-full aspect-square bg-white rounded-lg border border-gray-200 shadow-inner relative overflow-hidden select-none"
            ref={containerRef}
        >

            {/* Overlay to catch events during drag anywhere on screen (protects against iframe stealing focus) */}
            {isDragging && (
                <div className="fixed inset-0 z-50 cursor-grabbing" style={{ cursor: interactionType === 'rotate' ? 'alias' : interactionType === 'scale' ? 'nwse-resize' : 'move' }} />
            )}

            {/* CLICK LAYER: Dedicated background layer for deselection. Z-10 ensures it's below elements but above visuals. */}
            <div
                className="absolute inset-0 z-10 cursor-default"
                onClick={() => setActiveElement(null)}
            />

            {/* Background UV Guide (Visuals) */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-10 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full text-gray-900 fill-current">
                    <path d="M50,20 L80,20 L90,10 L110,10 L120,20 L150,20 L150,180 L50,180 Z" />
                    <path d="M20,50 L50,20 L50,60 L20,60 Z" />
                    <path d="M150,20 L180,50 L180,60 L150,60 Z" />
                </svg>
                <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-400">АЙМАҚ</div>
            </div>

            {/* Base Color Preview */}
            <div
                className="absolute inset-0 z-0 opacity-60 pointer-events-none mix-blend-multiply transition-colors duration-300"
                style={{ backgroundColor: baseColor }}
            />

            {/* --- Image Layer --- */}
            {viewConfig.image.src && (
                <div
                    className={`absolute cursor-move group ${activeElement === 'image' ? 'z-30' : 'z-20'}`}
                    style={{
                        left: `${viewConfig.image.transform.x}%`,
                        top: `${viewConfig.image.transform.y}%`,
                        transform: `translate(-50%, -50%) rotate(${viewConfig.image.transform.rotation}deg)`,
                        width: `${40 * viewConfig.image.transform.scale}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'image', 'move')}
                    onTouchStart={(e) => handleTouchStart(e, 'image', 'move')}
                >
                    <img
                        src={viewConfig.image.src}
                        alt="Uploaded"
                        className={`w-full h-auto pointer-events-none transition-shadow ${activeElement === 'image' ? 'drop-shadow-xl' : ''}`}
                    />

                    {/* Controls Overlay */}
                    {(activeElement === 'image') && (
                        <div className="absolute -inset-1 border-2 border-blue-500 rounded-sm pointer-events-none">
                            <div className="pointer-events-auto">
                                {/* Scale Handle (Bottom Right) */}
                                <div
                                    className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full cursor-nwse-resize shadow-md border-2 border-white flex items-center justify-center hover:scale-110 transition-transform"
                                    onMouseDown={(e) => handleMouseDown(e, 'image', 'scale')}
                                    onTouchStart={(e) => handleTouchStart(e, 'image', 'scale')}
                                >
                                    <Maximize size={10} className="text-white" />
                                </div>

                                {/* Rotate Handle (Top Center) */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                    <div
                                        className="w-6 h-6 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center cursor-grab shadow-sm hover:bg-blue-50 hover:scale-110 transition-transform"
                                        onMouseDown={(e) => handleMouseDown(e, 'image', 'rotate')}
                                        onTouchStart={(e) => handleTouchStart(e, 'image', 'rotate')}
                                    >
                                        <RotateCw size={12} className="text-blue-600" />
                                    </div>
                                    <div className="w-0.5 h-2 bg-blue-500"></div>
                                </div>

                                {/* Delete Handle (Top Left) */}
                                <div
                                    className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 border border-white rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-red-600 hover:scale-110 transition-transform"
                                    onMouseDown={(e) => e.stopPropagation()} // Prevent triggering drag
                                    onClick={(e) => handleDelete(e, 'image')}
                                >
                                    <X size={12} className="text-white" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- Text Layer --- */}
            {viewConfig.text.content && (
                <div
                    className={`absolute cursor-move group ${activeElement === 'text' ? 'z-40' : 'z-30'} whitespace-nowrap`}
                    style={{
                        left: `${viewConfig.text.transform.x}%`,
                        top: `${viewConfig.text.transform.y}%`,
                        transform: `translate(-50%, -50%) rotate(${viewConfig.text.transform.rotation}deg) scale(${viewConfig.text.transform.scale})`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'text', 'move')}
                    onTouchStart={(e) => handleTouchStart(e, 'text', 'move')}
                >
                    <span
                        style={{
                            color: viewConfig.text.color,
                            fontFamily: viewConfig.text.fontFamily,
                            fontSize: `${viewConfig.text.fontSize * 2}px`,
                            lineHeight: 1,
                            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        className={`select-none block px-2 py-1 ${activeElement === 'text' ? '' : 'border border-dashed border-transparent hover:border-gray-400'}`}
                    >
                        {viewConfig.text.content}
                    </span>

                    {/* Controls Overlay for Text */}
                    {(activeElement === 'text') && (
                        <div className="absolute inset-0 border-2 border-blue-500 rounded pointer-events-none">
                            <div className="pointer-events-auto">
                                {/* Scale (Bottom Right) */}
                                <div
                                    className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full cursor-nwse-resize border-2 border-white flex items-center justify-center shadow hover:scale-110 transition-transform"
                                    onMouseDown={(e) => handleMouseDown(e, 'text', 'scale')}
                                    onTouchStart={(e) => handleTouchStart(e, 'text', 'scale')}
                                >
                                    <Maximize size={10} className="text-white" />
                                </div>

                                {/* Rotate (Top Right) */}
                                <div
                                    className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center cursor-grab shadow hover:scale-110 transition-transform"
                                    onMouseDown={(e) => handleMouseDown(e, 'text', 'rotate')}
                                    onTouchStart={(e) => handleTouchStart(e, 'text', 'rotate')}
                                >
                                    <RotateCw size={12} className="text-blue-600" />
                                </div>

                                {/* Delete (Top Left) */}
                                <div
                                    className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 border border-white rounded-full flex items-center justify-center cursor-pointer shadow hover:bg-red-600 hover:scale-110 transition-transform"
                                    onMouseDown={(e) => e.stopPropagation()} // Prevent triggering drag
                                    onClick={(e) => handleDelete(e, 'text')}
                                >
                                    <X size={12} className="text-white" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default TextureEditor;
