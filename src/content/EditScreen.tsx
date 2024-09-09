import React, { useState } from 'react';
import { Flashcard } from '../common/types';
import FlashcardEditorWidget from './FlashcardEditorWidget';

interface EditScreenProps {
    flashcard: Partial<Flashcard>;
    setFlashcard: (flashcard: Partial<Flashcard>) => void;
    onSaveButtonClicked: () => Promise<Flashcard | void>;
    onCancelButtonClicked? : () => void;
}

const EditScreen: React.FC<EditScreenProps> = ({
    flashcard,
    setFlashcard,
    onSaveButtonClicked,
    onCancelButtonClicked
}) => {
    const [isPreviewEnabled, setIsPreviewEnabled] = useState(false);

    return (
    <div className='flex flex-col items-center h-full w-full pt-4'>
        <label className='flex items-center'>
            <input
                type="checkbox"
                checked={isPreviewEnabled}
                onChange={(e) => setIsPreviewEnabled(e.target.checked)}
                className="mr-2"
            />
            Enable Preview
        </label>
        <FlashcardEditorWidget 
            flashcard={flashcard}
            setFlashcard={setFlashcard}
            isPreviewEnabled={isPreviewEnabled}
        />
        <div className='flex flex-row items-center space-x-4 mt-4'>
            <button onClick={onCancelButtonClicked}>Cancel</button>
            <button onClick={onSaveButtonClicked}>Save</button>
        </div>
    </div>
    );
};

export default EditScreen;
