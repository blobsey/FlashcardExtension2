import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./radix-ui/Select";
import { Flashcard, UserData } from "../common/types";
import { BackButton, getUserData, listFlashcards, renderMarkdown } from "../common/common";
import { useDebounce } from "../common/useDebounce";

interface ListScreenProps {
    // Data props
    flashcards: Flashcard[] | null;
    decks: string[] | null;

    // State props
    selectedDeck: string | null;
    searchValue: string;
    scrollPosition: number;

    // State setters
    setSelectedDeck: (deck: string | null) => void;
    setSearchValue: (value: string) => void;
    setScrollPosition: (position: number) => void;

    // Event handlers
    onFlashcardClicked: (flashcard: Flashcard) => void;
    onBackButtonClicked: () => void;
};

const ListScreen: React.FC<ListScreenProps> = ({
    flashcards,
    decks,
    selectedDeck,
    searchValue,
    scrollPosition,
    setSelectedDeck,
    setSearchValue,
    setScrollPosition,
    onFlashcardClicked,
    onBackButtonClicked
}) => {
    const debouncedSetSearchValue = useDebounce((value: string) => {
        setSearchValue(value);
    }, 50);

    const filteredFlashcards = useMemo(() => {
        return flashcards?.filter(card =>
            card.card_front.toLowerCase().includes(searchValue.toLowerCase()) ||
            card.card_back.toLowerCase().includes(searchValue.toLowerCase())
        ) ?? [];
    }, [flashcards, searchValue]);

    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.scrollTop = scrollPosition;
        }
    }, []); // Only set initial scroll position on mount

    const debouncedSetScrollPosition = useDebounce((position: number) => {
        setScrollPosition(position);
    }, 200); // Debounce to update 200ms after scrolling stops

    const handleScroll = useCallback(() => {
        if (gridRef.current) {
            debouncedSetScrollPosition(gridRef.current.scrollTop);
        }
    }, [debouncedSetScrollPosition]);

    return (
        <>
        <div className='w-full h-full flex flex-col items-center'>        
            {/* Top bar */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between p-4 space-y-4 md:space-y-0 md:space-x-4">
                {/* Left side of top bar */}
                <div className="flex flex-row items-center space-x-4 w-full md:flex-grow">
                    <BackButton onClick={onBackButtonClicked} />
                    <div className='w-full max-w-[20rem]'>
                        <Select 
                            onValueChange={(value) => setSelectedDeck(value)} 
                            defaultValue={selectedDeck as any}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All flashcards"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={null as any}><i>All flashcards</i></SelectItem>
                                {decks && decks.map(deck => (
                                    <SelectItem key={deck} value={deck}>{deck}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='whitespace-nowrap font-bold'>({flashcards?.length ?? 0} flashcards)</div>
                </div>
                {/* Search bar */}
                <input
                    type="text"
                    placeholder="Search flashcards..."
                    onChange={(e) => debouncedSetSearchValue(e.target.value)}
                    className="w-full md:w-64 max-w-full md:max-w-[40%] p-2 rounded bg-white/10 outline-none focus:outline-none focus:ring-1 focus:ring-white focus:ring-opacity-50 text-white"
                />
            </div>
            
            {/* Grid */}
            <div 
                className="flex-grow overflow-auto pl-2 pr-4 w-full"
                ref={gridRef}
                onScroll={handleScroll}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFlashcards.map(card => (
                        <button 
                            key={card.card_id} 
                            className='rounded bg-white/5 w-full text-left h-48 hover:bg-white/10'
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
    );
};

export default ListScreen;
