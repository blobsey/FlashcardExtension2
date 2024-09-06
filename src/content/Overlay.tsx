import React, { useState } from "react";
import FlashcardScreen from "./FlashcardScreen";
import GradeScreen from "./GradeScreen";
import usePersistentState from "../common/usePersistentState";
import { Flashcard } from "../common/types";

type Screen = 'flashcard' | 'grade';

// BackButton component defined within Overlay.tsx
const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button className="blobsey-back-button" onClick={onClick}>
        Back
    </button>
);

const Overlay: React.FC = () => {
    const [flashcard, setFlashcard] = usePersistentState<Flashcard | null>('flashcard', null);
    const [currentScreen, setCurrentScreen] = useState<Screen>('flashcard');
    const [screenHistory, setScreenHistory] = useState<Screen[]>(['flashcard']);

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

    const handleFlip = () => {
        navigateTo('grade');
    };

    const handleGrade = (grade: string) => {
        // Handle grading logic here
        console.log(`Graded: ${grade}`);
        goBack(); // Go back to flashcard screen after grading
    };

    return (
        <div id='blobsey-overlay'>
            {currentScreen === 'flashcard' && (
                <FlashcardScreen
                    flashcard={flashcard}
                    onFlipPressed={handleFlip}
                />
            )}
            {currentScreen === 'grade' && flashcard && (
                <GradeScreen
                    onGradeButtonClick={handleGrade}
                    flashcard={{...flashcard}} // Pass a local copy
                />
            )}
            {screenHistory.length > 1 && <BackButton onClick={goBack} />}
        </div>
    );
};

export default Overlay;

