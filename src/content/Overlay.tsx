import React, { useState, useEffect } from "react";
import FlashcardScreen from "./FlashcardScreen";
import GradeScreen from "./GradeScreen";
import usePersistentState from "../common/usePersistentState";
import { Flashcard } from "../common/types";
import { reviewFlashcard, 
        editFlashcard, 
        GRADES, 
        BackButton,
        grantTime,
        closeOverlayAllTabs
} from "../common/common";
import '../styles/tailwind.css';
import ReviewScreen from "./ReviewScreen";
import EditScreen from "./EditScreen";
import { useToast } from "./Toast";

type Screen = 'flashcard' | 'grade' | 'review' | 'edit';

const artificialDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
                <FlashcardScreen
                    flashcard={flashcard}
                    onFlipPressed={() => {
                        setReviewingFlashcard(flashcard);
                        navigateTo('grade');
                    }}
                />
            )}
            {currentScreen === 'grade' && reviewingFlashcard && (
                <GradeScreen
                    onGradeButtonClick={async (grade: typeof GRADES[number]) => {
                        await reviewFlashcard(reviewingFlashcard.card_id, grade);
                        await grantTime(1000 * 60); // 1 minute
                        navigateTo('review');
                    }}
                    flashcard={reviewingFlashcard}
                    isFlipAnimationDone={isFlipAnimationDone}
                    setIsFlipAnimationDone={setIsFlipAnimationDone}
                />
            )}
            {currentScreen === 'review' && reviewingFlashcard && (
                <ReviewScreen
                    flashcard={reviewingFlashcard}
                    areFlashcardsRemaining={flashcard !== null}
                    onEditButtonClick={() => {
                        setEditingFlashcard(reviewingFlashcard);
                        navigateTo('edit');
                    }}
                    onConfirmButtonClick={async () => {
                        browser.runtime.sendMessage({ action: 'redeemExistingTimeGrant'});
                        await closeOverlayAllTabs();
                    }}
                    onAnotherButtonClick={() => {
                        setIsFlipAnimationDone(false);
                        setIsReviewAnimationDone(false);
                        navigateTo('flashcard');
                    }}
                    isReviewAnimationDone={isReviewAnimationDone}
                    setIsReviewAnimationDone={setIsReviewAnimationDone}
                />
            )}
            {currentScreen === 'edit' && editingFlashcard && (
                <EditScreen
                    flashcard={{...reviewingFlashcard}}
                    setFlashcard={(updates: Partial<Flashcard> | null) => {
                        // Ugly, but this function is to reconcile the difference
                        // between a Partial<Flashcard> and a Flashcard
                        setReviewingFlashcard(prevFlashcard => {
                            if (!prevFlashcard) return null;
                            return { ...prevFlashcard, ...updates } as Flashcard;
                        });
                    }}
                    onSaveButtonClicked={async (updatedFlashcard: Partial<Flashcard> | null) => {
                        try {
                            if (updatedFlashcard && updatedFlashcard.card_id) {
                                await editFlashcard(
                                    updatedFlashcard.card_id,
                                    updatedFlashcard.card_type || '',
                                    updatedFlashcard.card_front || '',
                                    updatedFlashcard.card_back || ''
                                )
                                goBack();
                                toast({content: "Flashcard updated successfully!"});
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
            )}
        </div>
    );
};

export default Overlay;

