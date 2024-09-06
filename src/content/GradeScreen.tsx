import React, { useEffect } from 'react';
import { Flashcard } from '../common/types'; 
import { renderMarkdown } from '../common/common';

interface GradeScreenProps {
    onGradeButtonClick: (grade: "again" | "hard" | "medium" | "easy") => void;
    flashcard?: Flashcard;
    isFlipped: boolean;
    setIsFlipped: (isFlipped: boolean) => void;
}

function GradeScreen({ onGradeButtonClick, flashcard, isFlipped, setIsFlipped }: GradeScreenProps) {
    useEffect(() => {
        requestAnimationFrame(() => setIsFlipped(true));
    }, [setIsFlipped]);

    return (
        <>
        <div className="flex flex-col items-center">
            <div className="mb-2 text-center">
                {renderMarkdown(flashcard?.card_front)}
            </div>
            <hr className={`w-full mb-2 transform origin-middle transition-transform duration-300 ${
                isFlipped ? 'scale-x-100' : 'scale-x-0'}`} />
            <div 
                className={`grid grid-rows-[0fr] w-full transition-[grid-template-rows] duration-300 ease ${
                    isFlipped ? 'grid-rows-[1fr]' : ''}`}
            >
                <div className="flex flex-col items-center overflow-hidden">
                    {renderMarkdown(flashcard?.card_back)}
                </div>
            </div>
        </div>
        <div className="flex flex-row mt-2 space-x-4">
            {(['Again', 'Hard', 'Good', 'Easy'] as const).map((grade) => (
                <button
                    key={grade}
                    id={`blobsey-grade-button-${grade.toLowerCase()}`}
                    onClick={() => onGradeButtonClick(grade.toLowerCase() as "again" | "hard" | "medium" | "easy")}
                >
                    {grade}
                </button>
            ))}
        </div>
        </>
    );
}

export default GradeScreen;
