import React, { useEffect, useState } from 'react';
import { renderMarkdown } from '../common/common';
import { Flashcard } from '../common/types';

interface ReviewScreenProps {
    flashcard?: Flashcard;
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
    const [isNewFlashcard, setIsNewFlashcard] = useState(false);

    useEffect(() => {
        if (flashcard) {
            setIsNewFlashcard(false);
            const timer = setTimeout(() => setIsNewFlashcard(true), 50);
            return () => clearTimeout(timer);
        }
    }, [flashcard]);

    return (
        <>
        <div className="flex flex-col items-center max-w-[60rem] mx-auto">
            <div className="m-2 text-center w-full">
                {renderMarkdown(flashcard?.card_front)}
            </div>
            <hr className='w-full m-4' />
            <div className="flex flex-col items-center w-full">
                {renderMarkdown(flashcard?.card_back)}
            </div>
        </div>
        <div className={`flex flex-row mt-4 space-x-4 ${isNewFlashcard ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
            {Object.entries({
                Another: onAnotherButtonClick,
                Confirm: onConfirmButtonClick,
                Edit: onEditButtonClick,
            }).map(([label, onClick], index) => (
                <button
                    key={label}
                    onClick={onClick}
                    className={`transition-[transform,opacity] duration-300 ${isNewFlashcard 
                        ? 'translate-y-0 opacity-100' 
                        : 'translate-y-4 opacity-0'
                    } hover:bg-gray-200`}
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
