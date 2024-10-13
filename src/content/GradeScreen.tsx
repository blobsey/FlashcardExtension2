import React, { useEffect, useState } from 'react';
import { Flashcard } from '../common/types'; 
import { renderMarkdown, GRADES } from '../common/common';

interface GradeScreenProps {
    onGradeButtonClick: (grade: typeof GRADES[number]) => void;
    flashcard?: Flashcard;
    isFlipAnimationDone: boolean;
    setIsFlipAnimationDone: (isFlipAnimationDone: boolean) => void;
}

function GradeScreen({ onGradeButtonClick, flashcard, isFlipAnimationDone: isFlipAnimationDone, setIsFlipAnimationDone: setIsFlipAnimationDone }: GradeScreenProps) {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setIsFlipAnimationDone(true));
    }, [setIsFlipAnimationDone]);

    const handleGradeClick = async (grade: typeof GRADES[number]) => {
        setIsLoading(true);
        try {
            await onGradeButtonClick(grade);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
        <div className="flex flex-col items-center max-w-[45em] mx-auto">
            <div className="mb-4 text-center w-full">
                {renderMarkdown(flashcard?.card_front)}
            </div>
            <div 
                className={`grid grid-rows-[0fr] w-full transition-[grid-template-rows] duration-300 ease ${
                    isFlipAnimationDone ? 'grid-rows-[1fr]' : ''}`}
            >
                <div className="flex flex-col items-center overflow-hidden w-full">
                    <hr className={`w-full transform origin-middle transition-transform duration-300 ${
                    isFlipAnimationDone ? 'scale-x-100' : 'scale-x-0'}`} />
                    {renderMarkdown(flashcard?.card_back)}
                </div>
            </div>
        </div>
        <div className={`flex flex-row mt-4 space-x-4 ${isFlipAnimationDone ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
            {GRADES.map((grade: typeof GRADES[number], index: number) => (
                <button
                    key={grade}
                    id={`blobsey-grade-button-${grade.toLowerCase()}`}
                    onClick={() => handleGradeClick(grade)}
                    disabled={isLoading}
                    className={`blobsey-btn transform transition-[transform,opacity] duration-300 ${
                        isFlipAnimationDone 
                            ? 'translate-y-0 opacity-100' 
                            : 'translate-y-4 opacity-0'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                >
                    {grade}
                </button>
            ))}
        </div>
        </>
    );
}

export default GradeScreen;
