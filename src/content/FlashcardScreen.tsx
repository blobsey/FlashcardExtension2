import React from "react";
import { useState, useEffect } from "react";
import usePersistentState from "../utils/usePersistentState";
import { 
    Flashcard, 
    renderMarkdown, 
    cacheNextFlashcard 
} from "./common";

const FlashcardScreen: React.FC = () => {
    const [innerScreen, setInnerScreen] = useState('quiz');
    const [flashcard, setFlashcard] = usePersistentState<Flashcard | null>('flashcard', null);
    const [flashcardToGrade, setFlashcardToGrade] = useState<Flashcard | null>(null);

    const handleFlip = () => {
        setInnerScreen('grade');
        setFlashcardToGrade(flashcard);
    }

    const QuizInnerScreen = () => {
        return (
            <div id="blobsey-quiz-screen">
                <div id='blobsey-card-front'>
                    {renderMarkdown(flashcard?.card_front)}
                </div>
                <button id='blobsey-flip-button'
                onClick={handleFlip}>
                    Flip
                </button>
            </div>
        );
    };

    const GradeInnerScreen = () => {
        const [isRevealed, setRevealed] = useState(false);

        useEffect(() => {
            requestAnimationFrame(() => setRevealed(true));
        }, []);

        return (
            <div id="blobsey-grade-screen">
                <div id="blobsey-card-front">
                    {renderMarkdown(flashcardToGrade?.card_front)}
                </div>
                <div id="blobsey-card-back-wrapper" className={isRevealed ? 'expanded' : ''}>
                    <div id="blobsey-card-back">
                        <hr id="blobsey-divider" className={isRevealed ? 'expanded' : ''}/>
                        {renderMarkdown(flashcardToGrade?.card_back)}
                    </div>
                </div>
                <div id="blobsey-grade-buttons">
                    {['Again', 'Hard', 'Medium', 'Easy'].map((grade, index) => (
                        <button
                            key={grade}
                            id={`blobsey-grade-button-${index}`}
                            onClick={() => {/* Handle grading logic */}}
                        >
                            {grade}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    switch(innerScreen) {
        case 'quiz': 
            return <QuizInnerScreen />;
        case 'grade': 
            return <GradeInnerScreen />;
    }
};

export default FlashcardScreen;