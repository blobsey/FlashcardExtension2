import React, { useState, useEffect, useCallback } from "react";
import FlashcardScreen from "./FlashcardScreen";
import GradeScreen from "./GradeScreen";
import usePersistentState from "../common/usePersistentState";
import { Flashcard, Screen, UserData } from "../common/types";
import { reviewFlashcard, 
        editFlashcard, 
        GRADES, 
        BackButton,
        grantTime,
        getUserData,
        listFlashcards,
} from "../common/common";
import '../styles/content-tailwind.css';
import ReviewScreen from "./ReviewScreen";
import EditScreen from "./EditScreen";
import ListScreen from "./ListScreen"
import { useToast } from "./radix-ui/Toast";
import { broadcastThroughBackgroundScript } from "../common/common";

const artificialDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface OverlayProps {
    initialScreen: Screen; 
    setCurrentScreenRef?: React.MutableRefObject<((screen: Screen) => void) | null>
}

const Overlay: React.FC<OverlayProps> = ({ initialScreen, setCurrentScreenRef }) => {
    const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen);
    const [screenHistory, setScreenHistory] = useState<Screen[]>([]);

    // Update screen history whenever currentScreen changes
    useEffect(() => {
        console.log('currentScreen is:', currentScreen);
        setScreenHistory(prev => [...prev, currentScreen]);
        console.log([...screenHistory, currentScreen]);
    }, [currentScreen]);

    // Exposes the setCurrentScreen function to any parent
    useEffect(() => {
        if (setCurrentScreenRef) {
            setCurrentScreenRef.current = setCurrentScreen;
        }
    }, [setCurrentScreenRef]);

    // FlashcardScreen states
    const [flashcard, setFlashcard] = usePersistentState<Flashcard | null>('flashcard', null);

    // GradeScreen/ReviewScreen states
    const [reviewingFlashcard, setReviewingFlashcard] = useState<Flashcard | null>(null);
    const [isFlipAnimationDone, setIsFlipAnimationDone] = useState<boolean>(false);
    const [isReviewAnimationDone, setIsReviewAnimationDone] = useState<boolean>(false);

    // EditScreen state
    const [editingFlashcard, setEditingFlashcard] = useState<Partial<Flashcard>>({});

    // ListScreen state
    const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
    const [searchValue, setSearchValue] = useState<string>('');
    const [scrollPosition, setScrollPosition] = useState<number>(0);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [userData, setUserData] = useState<UserData | null>(null);

    // Toasts for showing info, errors, etc.
    const toast = useToast();

    const goBack = () => {
        if (screenHistory.length > 1) {
            const newHistory = [...screenHistory];
            newHistory.pop(); // Remove the previous screen
            setScreenHistory(newHistory);
            setCurrentScreen(newHistory[newHistory.length - 1]);
        }
    };

    const loadFlashcards = useCallback(async (deck: string | null) => {
        setFlashcards([]);
        let nextPage: string | undefined;
        do {
            console.log('loadFlashcards called');
            const response = await listFlashcards(selectedDeck, nextPage);
            setFlashcards(prevCards => [...prevCards, ...response.flashcards]);
            nextPage = response.nextPage ?? undefined;
        } while (nextPage);
    }, [selectedDeck])

    // Initial fetch of flashcards for list screen
    useEffect(() => {
        if (currentScreen === 'list' && flashcards.length === 0) {
            console.log('Listing flashcards because currentScreen is', currentScreen);
            loadFlashcards(selectedDeck);
        }
    }, [currentScreen]);

    // Load a new deck when selected
    useEffect(() => {
        if (currentScreen === 'list') {
            loadFlashcards(selectedDeck);
        }
    }, [selectedDeck])

    // Fetches userData once when Overlay mounts. TODO: Is this a good idea?
    useEffect(() => {
        getUserData().then((userData) => setUserData(userData));
    }, [])

    return (
        <div id='blobsey-overlay' data-current-screen={currentScreen}>
            {currentScreen === 'flashcard' && (
                <FlashcardScreen
                    flashcard={flashcard}
                    onFlipPressed={() => {
                        setReviewingFlashcard(flashcard);
                        setCurrentScreen('grade');
                    }}
                />
            )}
            {currentScreen === 'grade' && reviewingFlashcard && (
                <GradeScreen
                    onGradeButtonClick={async (grade: typeof GRADES[number]) => {
                        await reviewFlashcard(reviewingFlashcard.card_id, grade);
                        await grantTime(1000 * 60); // 1 minute
                        setCurrentScreen('review');
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
                        setCurrentScreen('edit');
                    }}
                    onConfirmButtonClick={async () => {
                        /* Redeem time, and close any flashcard-showing 
                        overlays on all tabs */
                        const response = await browser.runtime.sendMessage({ 
                            action: 'redeemExistingTimeGrant'
                        });
                        if (response.result !== 'success') {
                            throw new Error(response);
                        }
                        await broadcastThroughBackgroundScript('closeOverlayIfFlashcardScreen');
                    }}
                    onAnotherButtonClick={() => {
                        setIsFlipAnimationDone(false);
                        setIsReviewAnimationDone(false);
                        setCurrentScreen('flashcard');
                    }}
                    isReviewAnimationDone={isReviewAnimationDone}
                    setIsReviewAnimationDone={setIsReviewAnimationDone}
                />
            )}
            {currentScreen === 'edit' && editingFlashcard && (
                <EditScreen
                    flashcard={editingFlashcard}
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
                    onDeleteButtonClicked={async (flashcard: Partial<Flashcard> | null) => {

                    }}
                    onCancelButtonClicked={goBack}
                />
            )}
            {currentScreen === 'list' && userData && 
                <ListScreen 
                    flashcards={flashcards}
                    decks={userData.decks}
                    selectedDeck={selectedDeck}
                    searchValue={searchValue}
                    scrollPosition={scrollPosition}
                    setSelectedDeck={setSelectedDeck}
                    setSearchValue={setSearchValue}
                    setScrollPosition={setScrollPosition}
                    onFlashcardClicked={(flashcard: Flashcard) => {
                        setEditingFlashcard(flashcard);
                        setCurrentScreen('edit');
                    }}
                    onBackButtonClicked={goBack}
                    onCreateEmptyDeckClicked={() => {
                        console.log('createEmptyDeck clicked');
                    }}
                />
            }
        </div>
    );
};

export default Overlay;

