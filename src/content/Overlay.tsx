import React, { useState } from "react";
import FlashcardScreen from "./FlashcardScreen";
import GradeScreen from "./GradeScreen";
import usePersistentState from "../common/usePersistentState";
import { Flashcard } from "../common/types";
import { reviewFlashcard, editFlashcard, GRADES } from "../common/common";
import '../styles/tailwind.css';
import ReviewScreen from "./ReviewScreen";

type Screen = 'flashcard' | 'grade' | 'review';

// BackButton component defined within Overlay.tsx
const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button className="blobsey-back-button absolute left-4 top-4" onClick={onClick}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
    </button>
);

const Overlay: React.FC = () => {
    const [flashcard, setFlashcard] = usePersistentState<Flashcard | null>('flashcard', null);
    const [currentScreen, setCurrentScreen] = useState<Screen>('flashcard');
    const [screenHistory, setScreenHistory] = useState<Screen[]>(['flashcard']);
    const [isFlipped, setIsFlipped] = useState<boolean>(false);
    const [flashcardReviewed, setFlashcardReviewed] = useState<Flashcard | null>(null);

    const navigateTo = (screen: Screen) => {
        setScreenHistory(prev => [...prev, screen]);
        setCurrentScreen(screen);
    };

    const goBack = () => {
        if (screenHistory.length > 1) {
            const newHistory = [...screenHistory];
            newHistory.pop();
            setScreenHistory(newHistory);
            setCurrentScreen(newHistory[newHistory.length - 1]);
        }
    };

    return (
        <div id='blobsey-overlay'>
            {currentScreen === 'flashcard' && (
                <FlashcardScreen
                    flashcard={flashcard}
                    onFlipPressed={() => {
                        setFlashcardReviewed(flashcard);
                        navigateTo('grade');
                    }}
                />
            )}
            {currentScreen === 'grade' && flashcardReviewed && (
                <>
                    {screenHistory.length > 1 && <BackButton onClick={goBack} />}
                    <GradeScreen
                        onGradeButtonClick={(grade: typeof GRADES[number]) => {
                            reviewFlashcard(flashcardReviewed.card_id, grade);
                            navigateTo('review');
                        }}
                        flashcard={flashcardReviewed}
                        isFlipped={isFlipped}
                        setIsFlipped={setIsFlipped}
                    />
                </>
            )}
            {currentScreen === 'review' && flashcardReviewed && (
                <>
                    <ReviewScreen
                    flashcard={flashcardReviewed}
                    onEditButtonClick={() => {

                    }}
                    onConfirmButtonClick={() => {}}
                    onAnotherButtonClick={() => {}}
                    />
                </>
            )}
        </div>
    );
};

export default Overlay;

