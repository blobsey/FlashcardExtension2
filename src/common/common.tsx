import React from "react";
import { setPersistentState, getPersistentState } from "./usePersistentState";
import { marked } from 'marked';
import { Flashcard, UserData } from "./types";
import DOMPurify from 'dompurify';

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
such as when reviewing, or when the current flashcard gets deleted */
export async function cacheNextFlashcard(): Promise<void> {
    const userData = await getUserData();
    const currentFlashcard = await getPersistentState<Flashcard>('flashcard');
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

        const flashcard = await getPersistentState<Flashcard>('flashcard');

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

        cacheNextFlashcard();
        const response = await browser.runtime.sendMessage({ 
            action: 'reviewFlashcard', 
            grade: numericalGrade,
            card_id
        });
        
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

/* Silly hack which is required because when you focus into a window, it will focus the
original document first, which will cause a scrolling jump if the overlay is scrollable */
export function handleFocusIn() {
    const activeElement = document
        .getElementById('blobsey-host')
        ?.shadowRoot
        ?.activeElement as HTMLElement;

    if (!activeElement) {
        return;
    }
    
    const focusableElements = getFocusableElements();
    const focusedIndex = focusableElements.indexOf(activeElement);

    // If current element is from overlay, find the next and focus it
    if (focusedIndex === -1 && focusableElements.length > 0) {
        focusableElements[0].focus();
    }
}

/* This returns an array of HTMLElements which are focusable and children
of the overlay. Used in handleFocusIn() and trapFocus() */
function getFocusableElements() {
    const shadowRoot = document.getElementById('blobsey-host')?.shadowRoot;
    if (!shadowRoot)
        return [];

    return Array.from(shadowRoot.querySelectorAll(
        'button:not([tabindex="-1"]), [href], input:not([tabindex="-1"]), select:not([tabindex="-1"]), textarea:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => {
        const htmlEl = el as HTMLElement;
        const isVisible = !!(htmlEl.offsetWidth || htmlEl.offsetHeight || htmlEl.getClientRects().length);
        const isNotDisabled = !htmlEl.hasAttribute('disabled');
        return isVisible && isNotDisabled;
    }) as HTMLElement[];
}

/* This is used in a keydown event of 'tab', and it will keep the focus within the
overlay. Not very accessibility-pilled, but oh well. TODO: a disable option for this */
export function trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;

    event.preventDefault();
    const focusableElements = getFocusableElements();
    const shadowRoot = document.getElementById('blobsey-host')?.shadowRoot;

    if (focusableElements.length > 0) {
        const activeElement = shadowRoot?.activeElement as HTMLElement;
        const currentIndex = focusableElements.indexOf(activeElement);
        const nextIndex = (currentIndex + (event.shiftKey ? -1 : 1) + focusableElements.length) % focusableElements.length;
        focusableElements[nextIndex].focus();
    } else {
        const host = document.getElementById('blobsey-host');
        host?.focus();
    }
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