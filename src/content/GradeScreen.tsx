import React from 'react';
import { Flashcard } from '../common/types'; 
import { renderMarkdown } from '../common/common';

interface GradeScreenProps {
    onGradeButtonClick: (grade: string) => void;
    flashcard?: Flashcard;
}

function GradeScreen({ onGradeButtonClick, flashcard }: GradeScreenProps) {
    return (
        <div id="blobsey-grade-screen">
            <div id="blobsey-card-front">
                {renderMarkdown(flashcard?.card_front)}
            </div>
            <div id="blobsey-card-back">
                {renderMarkdown(flashcard?.card_back)}
            </div>
            <div id="blobsey-grade-buttons">
                {['Again', 'Hard', 'Good', 'Easy'].map((grade) => (
                    <button
                    key={grade}
                    id={`blobsey-grade-button-${grade.toLowerCase()}`}
                    onClick={() => onGradeButtonClick(grade)} 
                    >
                    {grade}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default GradeScreen;
