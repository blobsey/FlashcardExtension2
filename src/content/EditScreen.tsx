import React, { useState, useEffect } from 'react';
import { Flashcard } from '../common/types';
import FlashcardEditorWidget from './FlashcardEditorWidget';
import { BackButton } from '../common/common';

interface EditScreenProps {
    flashcard: Partial<Flashcard> | null;
    setFlashcard: (flashcard: Partial<Flashcard> | null) => void;
    onSaveButtonClicked: (updatedFlashcard: Partial<Flashcard> | null) => Promise<Flashcard | void>;
    onCancelButtonClicked? : () => void;
}

const EditScreen: React.FC<EditScreenProps> = ({
    flashcard,
    setFlashcard,
    onSaveButtonClicked,
    onCancelButtonClicked
}) => {
    const [isPreviewEnabled, setIsPreviewEnabled] = useState(false);
    const [localFlashcard, setLocalFlashcard] = useState<Partial<Flashcard> | null>(null);

    useEffect(() => {
        setLocalFlashcard(flashcard ? { ...flashcard } : null);
    }, [flashcard]);

    const isDirty = () => {
        return JSON.stringify(localFlashcard) !== JSON.stringify(flashcard);
    };

    const handleCancel = () => {
        if (isDirty() && confirm("You have unsaved changes. Are you sure you want to cancel?")) {
            setLocalFlashcard(flashcard);
            onCancelButtonClicked?.();
        } else if (!isDirty()) {
            onCancelButtonClicked?.();
        }
    };

    const handleSave = async () => {
        const initialFlashcard = {...flashcard};
        try {
            setFlashcard(localFlashcard);
            await onSaveButtonClicked(localFlashcard);
        }
        catch(error) {
            setFlashcard(initialFlashcard);
            throw error;
        }
    };

    return (
    <>
    <BackButton onClick={handleCancel} />
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
            flashcard={localFlashcard}
            setFlashcard={setLocalFlashcard}
            isPreviewEnabled={isPreviewEnabled}
        />
        <div className='flex flex-row items-center space-x-4 mt-4'>
            <button onClick={handleCancel}>Cancel</button>
            <button onClick={handleSave}>Save</button>
        </div>
    </div>
    </>

    );
};

export default EditScreen;
