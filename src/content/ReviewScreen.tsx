import React, { useEffect } from 'react';
import { renderMarkdown } from '../common/common';
import { Flashcard } from '../common/types';

interface ReviewScreenProps {
    flashcard?: Flashcard | null;
    areFlashcardsRemaining: boolean;
    onEditButtonClick: () => void;
    onConfirmButtonClick: () => void;
    onAnotherButtonClick: () => void;
    isReviewAnimationDone: boolean;
    setIsReviewAnimationDone: (isPlayed: boolean) => void;
}

const ReviewScreen: React.FC<ReviewScreenProps> = ({
    flashcard,
    areFlashcardsRemaining,
    onEditButtonClick,
    onConfirmButtonClick,
    onAnotherButtonClick,
    isReviewAnimationDone,
    setIsReviewAnimationDone,
}) => {
    useEffect(() => {
        requestAnimationFrame(() => setIsReviewAnimationDone(true));
    }, [setIsReviewAnimationDone]);

    return (
        <>
        <div className="flex flex-col items-center max-w-[45rem] mx-auto">
            <div className="mb-4 text-center w-full">
                {renderMarkdown(flashcard?.card_front)}
            </div>
            <div className="flex flex-col items-center overflow-hidden w-full">
                <hr className='w-full'/>
                {renderMarkdown(flashcard?.card_back)}
            </div>
        </div>
        {!areFlashcardsRemaining && 
        <div>
            {'No more flashcards to review today! :)'}
        </div>
        }
        <div className={`flex flex-row mt-4 space-x-4 ${isReviewAnimationDone ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
            {Object.entries({
                Another: onAnotherButtonClick,
                Confirm: onConfirmButtonClick,
                Edit: onEditButtonClick,
            }).map(([label, onClick], index) => (
                // Only show 'Another' if flashcards remaining
                (label !== 'Another' || areFlashcardsRemaining) &&
                <button
                    key={label}
                    onClick={onClick}
                    className={`transition-[transform,opacity] duration-300 ${isReviewAnimationDone 
                        ? 'translate-y-0 opacity-100' 
                        : 'translate-y-4 opacity-0'
                    } blobsey-btn hover:bg-gray-200`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                >
                    {label}
                </button>
            ))}
        </div>
        </>
    );
};

export default ReviewScreen;
