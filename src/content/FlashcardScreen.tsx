import React, { useState, useEffect } from "react";
import usePersistentState from "../utils/usePersistentState";
import { 
    Flashcard, 
    renderMarkdown, 
    cacheNextFlashcard 
} from "./common";

interface FlashcardScreenProps {
    navigateToEditScreen?: () => void;
}

const FlashcardScreen: React.FC<FlashcardScreenProps> = ({ navigateToEditScreen }) => {
    const [phase, setPhase] = useState<'front' | 'back' | 'reviewed'>('front');
    const [flashcard, setFlashcard] = usePersistentState<Flashcard | null>('flashcard', null);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleFlip = () => {
        setPhase('back');
        requestAnimationFrame(() => setIsExpanded(true));
    }

    const handleReview = (grade: string) => {
        const gradeMap = { again: 1, hard: 2, medium: 3, easy: 4 };
        const numericalGrade = gradeMap[grade.toLowerCase() as keyof typeof gradeMap];

        setPhase('reviewed');
        browser.runtime.sendMessage({ 
            action: 'reviewFlashcard', 
            grade: numericalGrade,
            card_id: flashcard?.card_id
        }).finally(() => {
            cacheNextFlashcard();
        });
    }

    return (
        <div id="blobsey-flashcard-screen">
            <div id="blobsey-card-front">
                {renderMarkdown(flashcard?.card_front)}
            </div>
            {phase !== 'front' && (
            <div id="blobsey-card-back-wrapper" className={isExpanded ? 'expanded' : ''}>
                <div id="blobsey-card-back">
                    <hr id="blobsey-divider" className={isExpanded ? 'expanded' : ''}/>
                    {renderMarkdown(flashcard?.card_back)}
                </div>
            </div>
            )}
            <div id="blobsey-flashcard-buttons">
                {phase === 'front' && (
                    <button id='blobsey-flip-button' onClick={handleFlip}>
                        Flip
                    </button>
                )}
                {phase === 'back' && (
                    ['Again', 'Hard', 'Medium', 'Easy'].map((grade) => (
                        <button
                            key={grade}
                            id={`blobsey-review-button-${grade}`}
                            onClick={() => handleReview(grade)}
                        >
                            {grade}
                        </button>
                    ))
                )}
                {phase === 'reviewed' && (
                    <>
                        <button onClick={() => setPhase('front')}>Another</button>
                        {navigateToEditScreen && <button onClick={navigateToEditScreen}>Edit</button>}
                        <button onClick={() => {/* Handle confirm action */}}>Confirm</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default FlashcardScreen;