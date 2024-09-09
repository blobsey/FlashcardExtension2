import React, { useState } from "react";
import FlashcardScreen from "./FlashcardScreen";
import GradeScreen from "./GradeScreen";
import usePersistentState from "../common/usePersistentState";
import { Flashcard } from "../common/types";
import { reviewFlashcard, editFlashcard, GRADES } from "../common/common";
import '../styles/tailwind.css';
import ReviewScreen from "./ReviewScreen";
import EditScreen from "./EditScreen";

type Screen = 'flashcard' | 'grade' | 'review' | 'edit';

// BackButton component defined within Overlay.tsx
const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button className="blobsey-back-button absolute left-4 top-4" onClick={onClick}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
    </button>
);

const Overlay: React.FC = () => {
    // Global states
    const [currentScreen, setCurrentScreen] = useState<Screen>('edit');
    const [screenHistory, setScreenHistory] = useState<Screen[]>(['flashcard']);

    // FlashcardScreen states
    const [flashcard, setFlashcard] = usePersistentState<Flashcard | null>('flashcard', null);

    // GradeScreen/ReviewScreen states
    const [flashcardReviewed, setFlashcardReviewed] = useState<Flashcard | null>(null);
    const [isFlipAnimationDone, setIsFlipAnimationDone] = useState<boolean>(false);
    const [isReviewAnimationDone, setIsReviewAnimationDone] = useState<boolean>(false);

    // EditScreen state
    const [editingFlashcard, setEditingFlashcard] = useState<Partial<Flashcard>>({
        card_front: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.',
        card_back: 'It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.'
    });

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
                        isFlipAnimationDone={isFlipAnimationDone}
                        setIsFlipAnimationDone={setIsFlipAnimationDone}
                    />
                </>
            )}
            {currentScreen === 'review' && flashcardReviewed && (
                <>
                    {screenHistory.length > 1 && <BackButton onClick={goBack} />}
                    <ReviewScreen
                        flashcard={flashcardReviewed}
                        onEditButtonClick={() => {
                            setEditingFlashcard(flashcardReviewed);
                            navigateTo('edit');
                        }}
                        onConfirmButtonClick={() => {}}
                        onAnotherButtonClick={() => {
                            setIsFlipAnimationDone(false);
                            setIsReviewAnimationDone(false);
                            navigateTo('flashcard');
                        }}
                        isReviewAnimationDone={isReviewAnimationDone}
                        setIsReviewAnimationDone={setIsReviewAnimationDone}
                    />
                </>
            )}
            {currentScreen === 'edit' && editingFlashcard && (
                <>
                    {screenHistory.length > 1 && <BackButton onClick={goBack} />}
                    <EditScreen
                        flashcard={editingFlashcard}
                        setFlashcard={setEditingFlashcard}
                        onSaveButtonClicked={async () => {
                            goBack();
                        }}
                        onCancelButtonClicked={goBack}
                    />
                </>
            )}
        </div>
    );
};

export default Overlay;

