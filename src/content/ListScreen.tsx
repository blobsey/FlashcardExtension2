import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./radix-ui/Select";
import { Flashcard, UserData } from "../common/types";
import { BackButton, getUserData, listFlashcards, renderMarkdown } from "../common/common";
import { useDebounce } from "../common/useDebounce";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./radix-ui/Dropdown";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogFooter, 
    DialogClose, 
    DialogTitle,
    DialogTrigger,
    DialogWithInput
} from "./radix-ui/Dialog";
import { DotsVerticalIcon, PlusIcon } from "@radix-ui/react-icons";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useToast } from "./radix-ui/Toast";
import { CardStackIcon } from "@radix-ui/react-icons";
import LoadingBig from "./icons/LoadingBig";

interface ListScreenProps {
    // Data props
    flashcards: Flashcard[] | null;
    decks: string[] | null;

    // State props
    selectedDeck: string | null;
    searchValue: string;
    scrollPosition: number;
    isFlashcardsLoaded: boolean;

    // State setters
    setSelectedDeck: (deck: string | null) => void;
    setSearchValue: (value: string) => void;
    setScrollPosition: (position: number) => void;
    setIsFlashcardsLoaded: (loaded: boolean) => void;

    // Event handlers
    onFlashcardClicked: (flashcard: Flashcard) => void;
    onBackButtonClicked: () => void;
    handleCreateEmptyDeck: (deckName: string) => Promise<void>;
    handleImportFromFile: () => void;
};

const ListScreen: React.FC<ListScreenProps> = ({
    flashcards,
    decks,
    selectedDeck,
    searchValue,
    scrollPosition,
    isFlashcardsLoaded,
    setSelectedDeck,
    setSearchValue,
    setScrollPosition,
    setIsFlashcardsLoaded,
    onFlashcardClicked,
    onBackButtonClicked,
    handleCreateEmptyDeck,
    handleImportFromFile,
}) => {
    const [isAddDropdownOpen, setIsAddDropdownOpen] = useState<boolean>(false);

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

    // Cleanup
    useEffect(() => {
        // Set initial scroll position when component mounts
        if (gridRef.current) {
            console.log('Restoring scrollPosition to', scrollPosition);
            console.log('Grid has clientHeight', gridRef.current?.clientHeight);
            gridRef.current.scrollTop = scrollPosition;
        }
    }, []);

    const toast = useToast();

    return (
        <>
        <div className='w-full h-full flex flex-col items-center'>        
            {/* Top bar */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between p-4 space-y-4 md:space-y-0 md:space-x-4">
                {/* Left side of top bar */}
                <div className="flex flex-row w-full">
                    <BackButton onClick={onBackButtonClicked} />
                    <div className='flex flex-row justify-between items-center space-x-2 w-full '>
                        {/* Just select and + button */}
                        <div className='flex flex-row w-full max-w-[20em] space-x-2'>
                            <div className='w-full'>
                                <Select
                                    value={selectedDeck ?? null as any}
                                    onValueChange={(value) => setSelectedDeck(value)} 
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
                            <DropdownMenu open={isAddDropdownOpen} onOpenChange={setIsAddDropdownOpen}>
                                <DropdownMenuTrigger className="p-2 rounded hover:bg-white/10">
                                    <PlusIcon className="h-5 w-5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DialogWithInput
                                        title='Enter deck name'
                                        inputPlaceholder="Deck name"
                                        onSubmit={async (newDeck) => {
                                            await handleCreateEmptyDeck(newDeck);
                                            setIsAddDropdownOpen(false);
                                            setSelectedDeck(newDeck);
                                            toast({content: `Deck ${newDeck} created successfully`});
                                        }}
                                    >
                                        <DialogTrigger asChild>
                                            <button 
                                                className='blobsey-dropdownitem'
                                            >
                                                Create empty deck
                                            </button>
                                        </DialogTrigger>
                                    </DialogWithInput>
                                    <DropdownMenuItem onSelect={handleImportFromFile}>
                                        Import from CSV...
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Flashcard counter */}
                        <div className='whitespace-nowrap font-bold'>({flashcards?.length ?? 0} flashcards)</div>

                        {/* Deck context menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger className="p-2 rounded hover:bg-white/10">
                                <DotsVerticalIcon className="h-5 w-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => console.log("Set as active deck")}>
                                    Set as active deck
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => console.log("Download deck")}>
                                    Download deck
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => console.log("Delete deck")}>
                                    Delete deck
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => console.log("Rename deck")}>
                                    Rename deck
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                {/* Right side of top bar */}
                <div className="w-full md:w-64 max-w-full md:max-w-[20em]">
                    {/* Search bar */}
                    <input
                        type="text"
                        placeholder="Search flashcards..."
                        onChange={(e) => debouncedSetSearchValue(e.target.value)}
                        className="w-full p-2 rounded bg-white/10 outline-none focus:outline-none focus:ring-1 focus:ring-white focus:ring-opacity-50 text-white"
                    />
                </div>
            </div>
            
            {/* Grid or Empty State */}
            <div 
                className="flex-grow overflow-auto pl-2 pr-4 w-full"
                ref={gridRef}
            >
            <div style={{ minHeight: `${scrollPosition + (window.innerHeight)}px` }}>
                {filteredFlashcards.length > 0 ? (
                    <div className="py-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredFlashcards.map(card => (
                            <button 
                                key={card.card_id} 
                                className='rounded bg-white/5 w-full focus:outline-none focus:ring-1 focus:ring-white focus:ring-opacity-50 text-left h-48 hover:bg-white/10 transition-colors ease'
                                onClick={() => {
                                    if (gridRef.current) {
                                        setScrollPosition(gridRef.current.scrollTop);
                                    }
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
                ) : isFlashcardsLoaded ? (
                    <div className="flex opacity-50 flex-col items-center justify-center h-full text-center">
                        <CardStackIcon className="w-24 h-24 mb-4 text-gray-400" />
                        <h3 className="text-xl font-semibold mb-2">No flashcards found</h3>
                        <p className="text-gray-400">
                            {searchValue 
                                ? "Try adjusting your search or select a different deck." 
                                : "Create your first flashcard to get started!"}
                        </p>
                    </div>
                ) : (
                    <div className='flex h-full w-full items-center justify-center'>
                        <LoadingBig className='opacity-50 w-[10%] h-[10%] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'/>
                    </div>
                )}
                </div>
            </div>
        </div>
        </>
    );
};

export default ListScreen;
