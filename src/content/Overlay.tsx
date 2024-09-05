import React, { useEffect, useState } from "react";
import FlashcardScreen from "./FlashcardScreen";


const Overlay: React.FC = () => {

    return (
        <>
        <div id="blobsey-overlay">
            <FlashcardScreen />
        </div>
        </>
    );
};

export default Overlay;

