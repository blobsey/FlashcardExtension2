import React from "react";
import { renderMarkdown } from "../common/common";
import { Flashcard } from "../common/types";

interface FlashcardScreenProps {
    flashcard: Flashcard | null;
    onFlipPressed: () => void;
}

const FlashcardScreen: React.FC<FlashcardScreenProps> = ({
    flashcard,
    onFlipPressed
}) => {
    return (
        <>
        <div className="flex flex-col items-center max-w-[60rem] mx-auto">
            <div className="mb-2 text-center">
                {renderMarkdown(flashcard?.card_front)}
            </div>
        </div>
        <div className="flex flex-row mt-2 space-x-4">
            <button onClick={onFlipPressed}>
                Flip
            </button>
        </div>
        </>
    );
};

export default FlashcardScreen;