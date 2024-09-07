import React, { useEffect } from 'react';
import { Flashcard } from '../common/types'; 
import { renderMarkdown, GRADES } from '../common/common';

interface GradeScreenProps {
    onGradeButtonClick: (grade: typeof GRADES[number]) => void;
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
        <div className="flex flex-col items-center max-w-[60rem] mx-auto">
            <div className="m-2 text-center">
                {renderMarkdown(flashcard?.card_front)}
            </div>
            <hr className={`w-full m-4 transform origin-middle transition-transform duration-300 ${
                isFlipped ? 'scale-x-100' : 'scale-x-0'}`} />
            <div 
                className={`grid grid-rows-[0fr] m-2 w-full transition-[grid-template-rows] duration-300 ease ${
                    isFlipped ? 'grid-rows-[1fr]' : ''}`}
            >
                <div className="flex flex-col items-center overflow-hidden">
                    {renderMarkdown(flashcard?.card_back)}
                </div>
            </div>
        </div>
        <div className={`flex flex-row mt-4 space-x-4 ${isFlipped ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
            {GRADES.map((grade: typeof GRADES[number], index: number) => (
                <button
                    key={grade}
                    id={`blobsey-grade-button-${grade.toLowerCase()}`}
                    onClick={() => onGradeButtonClick(grade)}
                    className={`transform transition-[transform,opacity] duration-300 ${
                        isFlipped 
                            ? 'translate-y-0 opacity-100' 
                            : 'translate-y-4 opacity-0'
                    }`}
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
