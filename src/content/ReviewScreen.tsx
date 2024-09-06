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
        <>
        <div className="flex flex-col items-center">
            <div className="mb-2 text-center w-full">
                {renderMarkdown(flashcard.card_front)}
            </div>
            <hr className='w-full mb-2' />
            <div className="flex flex-col items-center w-full">
                {renderMarkdown(flashcard.card_back)}
            </div>
        </div>
        <div className="flex flex-row mt-2 space-x-4">
            <button onClick={onEditButtonClick}>
                Edit
            </button>
            <button onClick={onConfirmButtonClick}>
                Confirm
            </button>
            <button onClick={onAnotherButtonClick}>
                Another
            </button>
        </div>
        </>
    );
};

export default ReviewScreen;
