import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Flashcard } from '../common/types';
import { renderMarkdown } from '../common/common';

interface FlashcardEditorWidgetProps {
    flashcard: Partial<Flashcard> | null;
    setFlashcard: (flashcard: Partial<Flashcard> | null) => void;
    isPreviewEnabled: boolean;
    isCollapsed?: boolean;
    setIsCollapsed?: (isCollapsed: boolean) => void;
    onClose?: () => void;
}

const FlashcardEditorWidget: React.FC<FlashcardEditorWidgetProps> = ({
    flashcard,
    setFlashcard,
    isPreviewEnabled,
    isCollapsed,
    setIsCollapsed,
    onClose,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    /* For anyone reading this in the future (probably me), here is how the height  
    resize handles work. There is a similar approach for both the height resize handle
    and the middle split resizer, but the height is easier to explain, so here is
    the explanation:

    - There are refs for the initial Y coord of the click (clickY), the initial 
    height of the widget (initialHeight), and parallel state/ref for the actual height 
    of the widget. This is necessary; will be explained further below.
    - When user clicks the handle, it records the initial Y coord, which we will use
    later to calculate the delta between initial Y coord and dragged Y coord. It also
    records the initial height from whatever the current height is, as it's needed for
    the final calculation (more on that below)
    - As user drags, the new height is calculated based on initialHeight when clicked
    + offset between initial click Y coord, and Y coord dragged to. Also, while user
    is dragging, the heightRef is being updated. However this doesn't affect the 
    calculation, since we are still using the older value stored in initialHeight
    - When user stops dragging, listeners are removed
    */

    const resizeDataY = useRef({ 
        clickY: 0,
        initialHeight: 300
    });

    const [height, setHeight] = useState(300);
    const heightRef = useRef(height);

    // Update the height ref whenever height changes
    useEffect(() => {
        heightRef.current = height;
    }, [height]);

    const handleMouseDownY = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        resizeDataY.current.clickY = e.clientY;
        resizeDataY.current.initialHeight = heightRef.current;

        document.addEventListener('mousemove', handleMouseMoveY);
        document.addEventListener('mouseup', handleMouseUpY);
    }, []);

    const handleMouseMoveY = useCallback((e: MouseEvent) => {
        const deltaY = e.clientY - resizeDataY.current.clickY;
        const newHeight = Math.max(200, resizeDataY.current.initialHeight + deltaY);
        setHeight(newHeight);
    }, []);

    const handleMouseUpY = useCallback(() => {
        document.removeEventListener('mousemove', handleMouseMoveY);
        document.removeEventListener('mouseup', handleMouseUpY);
    }, []);

    const resizeDataX = useRef({
        initialClientX: 0,
        initialSplitRatio: 0.5
    });

    const [splitRatio, setSplitRatio] = useState(0.5);
    const splitRatioRef = useRef(splitRatio);
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);

    // Update the ref whenever splitRatio changes
    useEffect(() => {
        splitRatioRef.current = splitRatio;
        isDraggingRef.current = isDragging;
    }, [splitRatio, isDragging]);

    const handleMouseDownX = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        isDraggingRef.current = true;
        resizeDataX.current.initialClientX = e.clientX;
        resizeDataX.current.initialSplitRatio = splitRatioRef.current;
        document.addEventListener('mousemove', handleMouseMoveX);
        document.addEventListener('mouseup', handleMouseUpX);
    }, []);

    const handleMouseMoveX = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current || !containerRef.current) return;
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const newRatio = (e.clientX - containerRect.left) / containerRect.width;
        setSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
    }, []);

    const handleMouseUpX = useCallback(() => {
        setIsDragging(false);
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMoveX);
        document.removeEventListener('mouseup', handleMouseUpX);
    }, []);

    /* Cleanup any lingering event listeners. There shouldn't be any, but 
    just in case some weird edge case like the component unmounts while dragging */
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMoveX);
            document.removeEventListener('mouseup', handleMouseUpX);
            document.removeEventListener('mousemove', handleMouseMoveY);
            document.removeEventListener('mouseup', handleMouseUpY);
        };
    }, []); // Empty dependency array means this runs on mount and unmount

    return (
        <div 
            ref={containerRef}
            className='flex flex-col items-center relative ease-in-out transition-[width] duration-700 bg-[rgba(255,255,255,0.05)]'
            style={{ 
                height: `${height}px`,
                width: isPreviewEnabled ? '90em' : '45em',
                maxWidth: '90%'
            }}
        >
            {/* Top div (holds top textarea/preview) */}
            <div className="flex flex-row h-[calc(50%-0.5em)] w-full">
                {/* Top textarea */}
                <div
                    className={`relative has-underline ${isDragging ? '' : 'ease-in-out transition-all duration-500'} flex flex-col items-center`}
                    style={{ 
                        width: isPreviewEnabled ? `${splitRatio * 100}%` : '100%',
                        paddingRight: isPreviewEnabled ? '.5em' : '0'
                    }}
                >
                    <textarea
                        value={flashcard?.card_front ?? ''}
                        onChange={(e) => setFlashcard({ ...flashcard, card_front: e.target.value })}
                        className="w-full h-full resize-none p-4 text-wrap"
                        placeholder="Front of the card"
                    />
                </div>
                
                {/* Preview of top textarea */}
                <div
                    className={`pl-2 has-underline relative h-full ${isDragging ? '' : 'ease-in-out transition-all duration-300'} ${
                        isPreviewEnabled ? 'opacity-100' : 'w-0 opacity-0 overflow-hidden'
                    }`}
                    style={{ width: isPreviewEnabled ? `${(1 - splitRatio) * 100}%` : '0' }}
                >
                    <div className="h-full p-4 text-wrap overflow-y-auto overflow-x-hidden">
                        {renderMarkdown(flashcard?.card_front)}
                    </div>
                </div>
            </div>
                
            {/* Bottom div (holds bottom textarea and preview) */}
            <div className="items-center flex flex-row h-[calc(50%-0.5em)] w-full">
                {/* Bottom textarea */}
                <div
                    className={`${isDragging ? '' : 'ease-in-out transition-all duration-500'} flex flex-col pr-4 h-full items-center`}
                    style={{ 
                        width: isPreviewEnabled ? `${splitRatio * 100}%` : '100%',
                        paddingRight: isPreviewEnabled ? '.5em' : '0'
                    }}
                >
                    <textarea
                        value={flashcard?.card_back ?? ''}
                        onChange={(e) => setFlashcard({ ...flashcard, card_back: e.target.value })}
                        className="w-full h-full resize-none p-4"
                        placeholder="Back of the card"
                    />
                </div>

                {/* Preview of bottom textarea */}
                <div
                    className={`h-full pl-2 ${isDragging ? '' : 'ease-in-out transition-all duration-300'} ${
                        isPreviewEnabled ? 'opacity-100' : 'w-0 opacity-0 invisible overflow-hidden'
                    }`}
                    style={{ 
                        width: isPreviewEnabled ? `${(1 - splitRatio) * 100}%` : '0' 
                    }}
                >
                    <div className="h-full p-4 text-wrap overflow-y-auto overflow-x-hidden">
                        {renderMarkdown(flashcard?.card_back)}
                    </div>
                </div>
            </div>

            {/* Split adjustment handle */}
            {isPreviewEnabled && (
                <div 
                    className="absolute top-1/2 w-4 opacity-50 cursor-ew-resize flex items-center justify-center hover:opacity-100"
                    style={{ 
                        left: `calc(${splitRatio * 100}%)`, 
                        height: '2em',
                        transform: 'translate(-50%, -50%)'
                    }}
                    onMouseDown={handleMouseDownX}
                >
                    <div className="w-1 h-full bg-white bg-opacity-20 rounded-full" />
                </div>
            )}
            
            {/* Height dragging handle */}
            <div 
                className="w-full h-4 opacity-50 cursor-ns-resize flex items-center justify-center hover:opacity-100"
                onMouseDown={handleMouseDownY}
            >
                <div className="w-16 h-1 bg-white bg-opacity-20 rounded-full" />
            </div>
        </div>
    );
};

export default FlashcardEditorWidget;
