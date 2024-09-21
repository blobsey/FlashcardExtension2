import React from "react";
import { setPersistentState, getPersistentState } from "./usePersistentState";
import { marked } from 'marked';
import { Flashcard, UserData } from "./types";
import DOMPurify from 'dompurify';

export async function closeOverlayAllTabs() {
    await broadcastAllTabs('closeOverlayAllTabs');
}

/* All possible grades that can be given to a reviewed flashcard */
export const GRADES = Object.freeze(['Again', 'Hard', 'Good', 'Easy'] as const);

/* Utility function to fetch the latest userData from the API */
export async function getUserData(): Promise<UserData> {
    const { result, data } = await browser.runtime.sendMessage({ action: "getUserData" });
    if (result !== "success") {
        throw new Error(JSON.stringify(data));
    }
    return data;
}

/* This function fetches a flashcard from the /next path in the API
and then overwrites the 'flashcard' persistent (global) state 
The function should be used whenever a new flashcard should be fetched
such as when reviewing, or when the current flashcard gets deleted
NOTE: Not including a fetchNextFlashcard() since we should never need it. */
export async function cacheNextFlashcard(): Promise<void> {
    const userData = await getUserData();
    const currentFlashcard = await getPersistentState<Flashcard | null>('flashcard');
    let newFlashcard;
    let attempts = 0;
    const maxAttempts = 3;

    do {
        const response = await browser.runtime.sendMessage({ 
            action: 'nextFlashcard', 
            deck: userData.deck
        });
        if (response.result !== 'success') {
            throw new Error(`Error while fetching nextFlashcard: ${JSON.stringify(response)}`);
        }
        newFlashcard = response.flashcard;
        attempts++;
    } while (newFlashcard.card_id === currentFlashcard?.card_id && attempts < maxAttempts);

    if (newFlashcard.card_id === currentFlashcard?.card_id) {
        throw new Error(`Failed to fetch a new flashcard after ${maxAttempts} attempts`);
    }
    await setPersistentState('flashcard', newFlashcard);
}

/* Utility function to call /edit path of API */
export async function editFlashcard(
    card_id: string, card_type: string, 
    card_front: string, card_back: string): Promise<Flashcard> {
        const response = await browser.runtime.sendMessage({
            action: 'editFlashcard',
            card_id,
            card_type,
            card_front,
            card_back
        });

        if (response.result !== 'success') 
            throw new Error(`Error editing flashcard: ${JSON.stringify(response)}`);

        const flashcard = await getPersistentState<Flashcard | null>('flashcard');

        if (flashcard?.card_id === card_id) {
            await setPersistentState('flashcard', response.flashcard);
        }
        return response.flashcard;
}

/* Utility function to call /review path of API */
export async function reviewFlashcard(
    card_id: string,
    grade: typeof GRADES[number]): Promise<Flashcard> {
        const gradeMap = { Again: 1, Hard: 2, Good: 3, Easy: 4 };
        const numericalGrade = gradeMap[grade];

        const response = await browser.runtime.sendMessage({ 
            action: 'reviewFlashcard', 
            grade: numericalGrade,
            card_id
        });
        await cacheNextFlashcard();
        
        return response.flashcard;
}

/* Utility function to take a screenshot of the current tab. Will 
return null if the caller tab is not the active tab, because in that 
case the screenshot will be wrong */
export async function takeScreenshotOfCallerTab(): Promise<string | null> {
    const response = await browser.runtime.sendMessage({ action: "screenshotCurrentTab" });
    if (response.result === 'success') {
        return response.screenshotUri;
    }
    return null;
}


export function renderMarkdown(text: string | null | undefined): React.ReactElement {
    if (!text) {
        return <div>...</div>;
    }
    const rawHtml = marked.parse(text);
    const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
    return (
        <div className='blobsey-rendered-markdown'
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
        />
    )
}

/* Utility function which adds milliseconds to the 'existingTimeGrant' (stored 
in browser.storage.local) which is the current amount of 'unredeemed' time. 
'Unredeemed' time is time accrued before hitting the 'Confirm' button. The 
Confirm button 'redeems' the time and starts counting down. */
export async function grantTime(time: number) {
    const existingTimeGrant = await getPersistentState<number>('existingTimeGrant') ?? 0;
    await setPersistentState('existingTimeGrant', existingTimeGrant + time);
}

/* Utility function for sending a message to all tabs. Relies on the 
'broadcast' message handler in background.ts and handleBroadcastReceived
in content.tsx */
export async function broadcastAllTabs(action: string) {
    try {
        const response = await browser.runtime.sendMessage({
            action: 'broadcast',
            broadcastedAction: action
        });
        if (response.result !== 'success') {
            throw new Error(`Broadcast failed: ${response.message}`);
        }
    } catch (error) {
        console.error('Error broadcasting message:', error);
        throw error;
    }
}

/* Components */

export const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button className="blobsey-back-button absolute left-4 top-4" onClick={onClick}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
    </button>
);