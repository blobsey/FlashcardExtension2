import React from 'react';
import { renderMarkdown } from '../common/common';
import { Flashcard } from '../common/types';

interface ReviewScreenProps {
    flashcard: Flashcard;
    onEditButtonClick: () => void;
    onConfirmButtonClick: () => void;
    onAnotherButtonClick: () => void;
}

const ReviewScreen: React.FC<ReviewScreenProps> = ({
    flashcard,
    onEditButtonClick,
    onConfirmButtonClick,
    onAnotherButtonClick,
}) => {
    return (
        <div id="blobsey-review-screen">
            <div id="blobsey-card-front">
                {renderMarkdown(flashcard.card_front)}
            </div>
            <div id="blobsey-wrapper">
                <div id="blobsey-card-back">
                    <hr id="blobsey-divider" />
                    {renderMarkdown(flashcard.card_back)}
                </div>
            </div>
            <div id="blobsey-review-buttons">
                <button onClick={onAnotherButtonClick}>Another</button>
                <button onClick={onEditButtonClick}>Edit</button>
                <button onClick={onConfirmButtonClick}>Confirm</button>
            </div>
        </div>
    );
};

export default ReviewScreen;
