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
        <div id="blobsey-flashcard-screen">
            <div id="blobsey-card-front">
                {renderMarkdown(flashcard?.card_front)}
            </div>
            <div id="blobsey-flashcard-buttons">
                <button id='blobsey-flip-button' onClick={onFlipPressed}>
                    Flip
                </button>
            </div>
        </div>
    );
};

export default FlashcardScreen;