import React, { useState, useEffect, useCallback, useRef } from "react";
import FlashcardScreen from "./FlashcardScreen";
import GradeScreen from "./GradeScreen";
import usePersistentState, { getPersistentState } from "../common/usePersistentState";
import { BlockedSite, Flashcard, Screen, UserData } from "../common/types";
import { reviewFlashcard, 
        editFlashcard, 
        GRADES, 
        grantTime,
        getUserData,
        listFlashcards,
        updateUserData,
        createDeck,
        deleteFlashcard,
        shouldShowFlashcard
} from "../common/common";
import '../styles/content-tailwind.css';
import ReviewScreen from "./ReviewScreen";
import EditScreen from "./EditScreen";
import ListScreen from "./ListScreen"
import { useToast } from "./radix-ui/Toast";
import { broadcastThroughBackgroundScript } from "../common/common";
import { block } from "marked";
import { uploadDeck } from "../common/common";

const artificialDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface OverlayProps {
    initialScreen: Screen; 
    setCurrentScreenRef?: React.MutableRefObject<((screen: Screen) => void) | null>;
    destroyOverlay: () => Promise<void>;
}

const Overlay: React.FC<OverlayProps> = ({ initialScreen, setCurrentScreenRef, destroyOverlay }) => {
    const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen);
    const [screenHistory, setScreenHistory] = useState<Screen[]>([]);

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
    const [isFlashcardsLoaded, setIsFlashcardsLoaded] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);

    // Toasts for showing info, errors, etc.
    const toast = useToast();

    const goBack = async () => {
        console.log('screenHistory', screenHistory);
        if (screenHistory.length > 1) {
            const newHistory = [...screenHistory];
            newHistory.pop(); // Remove the previous screen
            console.log(newHistory);
            setScreenHistory(newHistory);
            setCurrentScreen(newHistory[newHistory.length - 1]);
        }
        else {
            let blockedSites = userData?.blocked_sites;
            if (!blockedSites) {
                try {
                    const fetchedUserData = await getUserData();
                    blockedSites = fetchedUserData.blocked_sites;
                    setUserData(fetchedUserData);
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    toast({ content: 'Error fetching user data. Please try again.' });
                }
            }
            
            if (blockedSites) {
                const shouldShow = shouldShowFlashcard(
                    blockedSites,
                    window.location.href,
                    flashcard,
                    await getPersistentState<number>('nextFlashcardTime') ?? Date.now()
                );
                
                if (shouldShow) {
                    setCurrentScreen('flashcard');
                } else {
                    await destroyOverlay();
                }
            }
        }
    }
    
    // Update screen history whenever currentScreen changes
    useEffect(() => {
        console.log('currentScreen is:', currentScreen);
        if (screenHistory.length === 0 || 
            currentScreen !== screenHistory[screenHistory.length - 1]) {
                setScreenHistory(prev => [...prev, currentScreen]);
                console.log([...screenHistory, currentScreen]);
        }
    }, [currentScreen]);

    // Clear out flashcards when not on list screen
    useEffect(() => {
        if (currentScreen !== 'list') {
            setFlashcards([]);
        }
    }, [currentScreen])

    // Exposes the setCurrentScreen function to any parent
    useEffect(() => {
        if (setCurrentScreenRef) {
            setCurrentScreenRef.current = setCurrentScreen;
        }
    }, [setCurrentScreenRef]);

    const abortControllerRef = useRef<AbortController | null>(null);

    const loadFlashcards = useCallback(async (deck: string | null) => {
        console.log('loadFlashcards called');                
        // Cancel any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create a new AbortController for this request
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setIsFlashcardsLoaded(false);
        setFlashcards([]);
        let nextPage: string | undefined;

        try {
            do {
                const response = await listFlashcards(deck, nextPage);
                if (signal.aborted) { // Stop fetching if deck changes
                    return;
                }
                setFlashcards(prevCards => [...prevCards, ...response.flashcards]);
                setTimeout(() => setIsFlashcardsLoaded(true), 100);
                nextPage = response.nextPage ?? undefined;
            } while (nextPage);
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    console.log('Flashcard loading aborted');
                } else {
                    console.error('Error loading flashcards:', error);
                    toast({ content: `Error loading flashcards: ${error.message}` });
                }
            }
        } finally {
            setIsFlashcardsLoaded(true);
        }
    }, []);

    // Load a new deck when selected or on initial mount
    useEffect(() => {
        if (currentScreen === 'list') {
            loadFlashcards(selectedDeck);
        }
        
        // Cleanup function to abort any ongoing request when component unmounts or deck changes
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [selectedDeck, currentScreen]);

    // Fetches userData once when Overlay mounts. TODO: Is this a good idea?
    useEffect(() => {
        getUserData().then((userData) => setUserData(userData));
    }, [])

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportFromFile = useCallback(async () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    const onFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsLoading(true);

            // Extract deck name from file name
            let deckName = file.name.split('.')[0]; // Remove file extension
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('deck', deckName);

            const response = await uploadDeck(formData);
            toast({ content: response.message });
            
            // Refresh the flashcards list and update the selected deck
            setSelectedDeck(deckName);
            await loadFlashcards(deckName);

            // Refresh user data to get updated deck list
            const updatedUserData = await getUserData();
            setUserData(updatedUserData);
        } catch (error) {
            console.error('Error importing file:', error);
            toast({ content: `Error importing file: ${error}` });
        } finally {
            setIsLoading(false);
            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [loadFlashcards, setSelectedDeck, toast]);

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
                        try {
                            if (flashcard && flashcard.card_id) {
                                setIsLoading(true);
                                await deleteFlashcard(flashcard.card_id);
                                toast({ content: "Flashcard deleted successfully!" });
                                goBack();
                            } else {
                                throw new Error('Invalid flashcard data');
                            }
                        } catch (error) {
                            console.error('Error deleting flashcard:', error);
                            toast({ content: `Error deleting flashcard: ${error}` });
                        } finally {
                            setIsLoading(false);
                        }
                    }}
                    onCancelButtonClicked={goBack}
                />
            )}
            {currentScreen === 'list' && userData && 
                <ListScreen 
                    flashcards={flashcards}
                    decks={userData.decks}
                    selectedDeck={selectedDeck}
                    activeDeck={userData.deck}
                    searchValue={searchValue}
                    scrollPosition={scrollPosition}
                    isFlashcardsLoaded={isFlashcardsLoaded}
                    setSelectedDeck={setSelectedDeck}
                    setActiveDeck={async (deck: string) => {
                        try {
                            setIsLoading(true);
                            console.log('setActiveDeck to:', deck);
                            await updateUserData({ deck: deck || '' });
                            const updatedUserData = {...userData, deck};
                            setUserData(updatedUserData);
                            toast({ content: `Active deck set to "${deck}"` });
                        } catch (error) {
                            console.error('Error updating active deck:', error);
                            toast({ content: `Error setting active deck: ${error}` });
                        } finally {
                            setIsLoading(false);
                        }
                    }}
                    setSearchValue={setSearchValue}
                    setScrollPosition={setScrollPosition}
                    setIsFlashcardsLoaded={setIsFlashcardsLoaded}
                    onFlashcardClicked={(flashcard: Flashcard) => {
                        setEditingFlashcard(flashcard);
                        setCurrentScreen('edit');
                    }}
                    onBackButtonClicked={goBack}
                    handleCreateEmptyDeck={async (newDeck) => {
                        await createDeck(newDeck);
                        const userData = await getUserData();
                        setUserData(userData);
                    }}
                    handleImportFromFile={handleImportFromFile}
                />
            }
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={onFileChange}
                accept=".csv"
            />
        </div>
    );
};

export default Overlay;
