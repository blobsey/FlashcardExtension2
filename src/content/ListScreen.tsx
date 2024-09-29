import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { Flashcard, UserData } from "../common/types";
import { getUserData, listFlashcards, renderMarkdown } from "../common/common";
import { useDebounce } from "../common/useDebounce";

interface ListScreenProps {
    onFlashcardClicked: (flashcard: Flashcard) => void;
};

const ListScreen: React.FC<ListScreenProps> = ({
    onFlashcardClicked
}) => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [selectedDeck, setSelectedDeck] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const nextPageRef = useRef<string | null>(null);
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await getUserData();
                setUserData(data);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, []);

    const debouncedSetSearchValue = useDebounce((value: string) => {
        setSearchValue(value);
    }, 50);

    const filteredFlashcards = useMemo(() => {
        return flashcards.filter(card =>
            card.card_front.toLowerCase().includes(searchValue.toLowerCase()) ||
            card.card_back.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [flashcards, searchValue]);

    const fetchFlashcards = useCallback(async (deck?: string) => {
        try {
            setLoading(true);
            let nextPage: string | undefined;
            do {
                const response = await listFlashcards(deck, nextPage);
                setFlashcards(prevCards => [...prevCards, ...response.flashcards]);
                nextPage = response.nextPage ?? undefined;
            } while (nextPage);
        } catch (error) {
            console.error('Error fetching flashcards:', error);
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchFlashcards(selectedDeck);
    }, []);
    
    const handleDeckChange = (newDeck: string) => {
        setSelectedDeck(newDeck);
        setFlashcards([]);
        nextPageRef.current = null;
        fetchFlashcards(newDeck);
    };
    
    return (
        <div className='w-full h-full flex flex-col items-center'>        
            {userData && (
                <>
                    <div className='w-full max-w-[60rem] pr-4 flex flex-col h-full'>

                        {/* Top bar */}
                        <div className="w-full flex flex-row items-center place-content-between">
                            <div className="w-2/5 flex flex-row items-center">
                                <Select 
                                    onValueChange={handleDeckChange} 
                                    open={isSelectOpen} 
                                    onOpenChange={setIsSelectOpen}
                                    defaultValue={null as any}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All flashcards"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null as any}><i>All flashcards</i></SelectItem>
                                        {userData.decks.map(deck => (
                                            <SelectItem key={deck} value={deck}>{deck}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className='m-4 min-w-40 font-bold'>({flashcards.length} flashcards)</div>
                            </div>
                            <input
                                type="text"
                                placeholder="Search flashcards..."
                                onChange={(e) => debouncedSetSearchValue(e.target.value)}
                                className="ml-4 p-2 rounded bg-white/10 outline-none focus:outline-none focus:ring-1 focus:ring-white focus:ring-opacity-50 text-white"
                            />
                        </div>
                        
                        {/* Grid */}
                        <div className="flex-grow overflow-auto">
                            <div className="grid grid-cols-2 gap-4">
                                {filteredFlashcards.map(card => (
                                    <button 
                                        key={card.card_id} 
                                        className='rounded bg-white/5 w-full text-left h-48'
                                        onClick={() => {
                                            console.log(card);
                                            onFlashcardClicked(card);
                                        }}
                                    >
                                        <div className="flex flex-col items-center h-full">
                                            <div 
                                                className="p-2 pb-0 mb-1 max-h-[75%] overflow-hidden text-xs text-center w-full flex-grow"
                                                style={{
                                                    maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 95%, rgba(0, 0, 0, 0))'
                                                }}
                                            >
                                                {renderMarkdown(card.card_front)}
                                            </div>
                                            <hr className="border-white opacity-10"/>
                                            <div 
                                                className="p-2 pb-0 mb-2 max-h-[75%] overflow-hidden text-xs text-center w-full flex-grow"
                                                style={{
                                                    maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 95%, rgba(0, 0, 0, 0))'
                                                }}
                                            >
                                                {renderMarkdown(card.card_back)}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ListScreen;
