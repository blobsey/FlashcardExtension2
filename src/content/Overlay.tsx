import React, { useState } from "react";
import FlashcardScreen from "./FlashcardScreen";
import GradeScreen from "./GradeScreen";
import usePersistentState from "../common/usePersistentState";
import { Flashcard } from "../common/types";
import { reviewFlashcard, editFlashcard, GRADES, BackButton } from "../common/common";
import '../styles/tailwind.css';
import ReviewScreen from "./ReviewScreen";
import EditScreen from "./EditScreen";
import { ToastProvider, useToast } from "./Toast";

type Screen = 'flashcard' | 'grade' | 'review' | 'edit';


const Overlay: React.FC = () => {
    // Global states
    const [currentScreen, setCurrentScreen] = useState<Screen>('flashcard');
    const [screenHistory, setScreenHistory] = useState<Screen[]>(['flashcard']);

    // FlashcardScreen states
    const [flashcard, setFlashcard] = usePersistentState<Flashcard | null>('flashcard', null);

    // GradeScreen/ReviewScreen states
    const [reviewingFlashcard, setReviewingFlashcard] = useState<Flashcard | null>(null);
    const [isFlipAnimationDone, setIsFlipAnimationDone] = useState<boolean>(false);
    const [isReviewAnimationDone, setIsReviewAnimationDone] = useState<boolean>(false);

    // EditScreen state
    const [editingFlashcard, setEditingFlashcard] = useState<Partial<Flashcard>>({});

    // Toasts for showing info, errors, etc.
    const toast = useToast();

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
                <>
                    <FlashcardScreen
                        flashcard={flashcard}
                        onFlipPressed={() => {
                            setReviewingFlashcard(flashcard);
                            navigateTo('grade');
                        }}
                    />
                    <button
                        onClick={() => toast({
                            content: "This is a test toast!",
                            duration: 5000
                        })}
                        className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Show Toast
                    </button>
                </>
            )}
            {currentScreen === 'grade' && reviewingFlashcard && (
                <>
                    {screenHistory.length > 1 && <BackButton onClick={goBack} />}
                    <GradeScreen
                        onGradeButtonClick={(grade: typeof GRADES[number]) => {
                            reviewFlashcard(reviewingFlashcard.card_id, grade);
                            navigateTo('review');
                        }}
                        flashcard={reviewingFlashcard}
                        isFlipAnimationDone={isFlipAnimationDone}
                        setIsFlipAnimationDone={setIsFlipAnimationDone}
                    />
                </>
            )}
            {currentScreen === 'review' && reviewingFlashcard && (
                <>
                    {screenHistory.length > 1 && <BackButton onClick={goBack} />}
                    <ReviewScreen
                        flashcard={reviewingFlashcard}
                        onEditButtonClick={() => {
                            setEditingFlashcard(reviewingFlashcard);
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
                        flashcard={reviewingFlashcard}
                        setFlashcard={(updates: Partial<Flashcard> | null) => {
                            // Ugly, but this function is to reconcile the difference
                            // between a Partial<Flashcard> and a Flashcard
                            setReviewingFlashcard(prevFlashcard => {
                                if (!prevFlashcard) return null;
                                return { ...prevFlashcard, ...updates } as Flashcard;
                            });
                        }}
                        onSaveButtonClicked={async () => {
                            try {
                                if (reviewingFlashcard) {
                                    await editFlashcard(
                                        reviewingFlashcard.card_id,
                                        reviewingFlashcard.card_type,
                                        reviewingFlashcard.card_front,
                                        reviewingFlashcard.card_back
                                    )
                                    goBack();
                                    toast({content: "Flashcard updated successfully!",
                                        duration: 10000
                                    });
                                } else {
                                    toast({content: "Missing required fields!"});
                                    throw new Error('Missing required fields!');
                                }
                            }
                            catch (error) {
                                toast({content: `Error editing flashcard: ${error}`});
                            }
                        }}
                        onCancelButtonClicked={goBack}
                    />
                </>
            )}
        </div>
    );
};

export default Overlay;

