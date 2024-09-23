import React from 'react';
import ReactDOM, { Root } from 'react-dom/client'; 
import Overlay from './Overlay';
import { getPersistentState, setPersistentState } from '../common/usePersistentState';
import {
  getUserData,
  takeScreenshotOfCallerTab,
  cacheNextFlashcard,
  getCurrentScreen
} from '../common/common';
import { Flashcard, BlockedSite, Screen } from '../common/types';
import { ToastProvider, useToast } from './Toast';
import { Message, MessageHandler } from '../common/types';

// Global reference to a React root created through createRoot(), used for destroying the overlay.
export let overlayRoot: Root | null = null;

// Creating the overlay sets this to a function which shows toasts
let toast: null | ReturnType<typeof useToast>;

// A ref to from Overlay.tsx which allows accessing setCurrentScreen from content.tsx
let setCurrentScreenRef: React.MutableRefObject<((screen: Screen) => void) | null> = { current: null };

async function showFlashcardIfNeeded(): Promise<void> {
    const userData = await getUserData();

    // Check if site is in userData blocked_sites list
    const currentUrl = window.location.href;
    const isBlockedSite = userData.blocked_sites.some((site: BlockedSite) => {
        return site.url !== '' && site.active && currentUrl.startsWith(site.url);
    });
    if (!isBlockedSite) {
        return;
    }

    /* Check if /next gives us null. If so, there are no more flashcards to review
    and return early */
    const flashcard = await getPersistentState<Flashcard | null>('flashcard');
    if (!flashcard) {
        await cacheNextFlashcard();
        const newFlashcard = await getPersistentState<Flashcard | null>('flashcard');
        if (!newFlashcard) {
            return;
        }
    }

    // If the nextFlashcardTime has passed, show flashcard
    const nextFlashcardTime = await getPersistentState<number>('nextFlashcardTime');
    const currentTime = Date.now();
    if (!nextFlashcardTime || currentTime >= nextFlashcardTime) {
        await showFlashcard();
    }
}

async function showFlashcard(): Promise<void> {
    /* showFlashcard() can be called manually by user, but we *probably* don't want to reset the
    current flashcard review loop, so return early in this edge case */
    const currentScreen = getCurrentScreen();
    if (currentScreen && ['flashcard', 'grade', 'review'].includes(currentScreen)) {
        if (toast) {
            toast({ content: 'Already showing a flashcard!' });
        }
        return;
    }

    console.log('Showing a flashard');

    // Calculate existing initial time grant, will be added to by grantTime()
    const existingTimeGrant = await getPersistentState<number>('existingTimeGrant');

    /* If showFlashcard() gets called after time is redeemed (or for the first time ever)
    then there won't be an existingTimeGrant, so we need to calculate by subtracting the
    currentTime from the nextFlashcardTime. */
    if (!existingTimeGrant) { 
        const currentTime = Date.now();
        const nextFlashcardTime = await getPersistentState<number>('nextFlashcardTime');
        const calculatedTimeGrant = nextFlashcardTime ? Math.max(nextFlashcardTime - currentTime, 0) : 0;
        await setPersistentState('existingTimeGrant', calculatedTimeGrant);
        await setPersistentState('nextFlashcardTime', currentTime);
    }

    const flashcard = await getPersistentState<Flashcard | null>('flashcard');
    if (!flashcard) {
        await cacheNextFlashcard();
    }

    if (setCurrentScreenRef.current) {
        setCurrentScreenRef.current('flashcard');
    }
    else {
        createOverlayIfNotExists('flashcard');
    }
}

async function showListScreen(): Promise<void> {
    if (setCurrentScreenRef.current) {
        setCurrentScreenRef.current('list');
    }
    else {
        createOverlayIfNotExists('list');
    }
}

async function createOverlayIfNotExists(initialScreen: Screen): Promise<void> {
    let host = document.getElementById('blobsey-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'blobsey-host';
        document.body.appendChild(host);
    }
    
    const shadowRoot = host.attachShadow({ mode: 'open' });
    
    // Load CSS files
    const cssFiles = [
        'content-tailwind.css'
    ];
    const timestamp = Date.now(); // Get current timestamp
    for (const file of cssFiles) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${browser.runtime.getURL(`styles/${file}`)}?t=${timestamp}`;
        shadowRoot.appendChild(link);
    }

    // Save the original overflow state, then make it 'hidden' to disable scrolling
    document.body.dataset._blobseyOriginalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Screenshot webpage before drawing any overlay
    const screenshotUri = await takeScreenshotOfCallerTab();
    const background = document.createElement('div');
    background.id = 'blobsey-overlay-background';
    background.className = screenshotUri ? 'filter' : 'backdropFilter';
    background.style.backgroundImage = screenshotUri ? `url(${screenshotUri})` : 'none';
    shadowRoot.appendChild(background);
    background.animate({ opacity: [0, 1] }, { duration: 250, easing: 'ease' }).finished;

    // Silly hacks to trap the focus into the overlay
    document.addEventListener('keydown', trapFocus);
    document.addEventListener('focusin', handleFocusIn);

    overlayRoot = ReactDOM.createRoot(shadowRoot); // Create root
    overlayRoot.render(
        <ToastProvider>
            <ToastSetter />
            <Overlay 
                initialScreen={initialScreen}
                setCurrentScreenRef={setCurrentScreenRef}
            />
        </ToastProvider>
    );
}

// Component which allows using toasts from content.tsx
function ToastSetter() {
    toast = useToast();
    return null;
}

export async function destroyOverlayIfExists(): Promise<void> {
    const host = document.getElementById('blobsey-host');
    if (host) {
        if (host.shadowRoot) {
            const background = host.shadowRoot.getElementById('blobsey-overlay-background');
            if (background) {
                await background.animate({ opacity: [1, 0] }, { duration: 250, easing: 'ease' }).finished;
            }

            // Attempt to unmount any existing React root
            if (overlayRoot) {
                overlayRoot.unmount();
                overlayRoot = null;
            }
        }

        host.remove();

        // Restore original scrolling behavior
        const originalOverflow = document.body.dataset._blobseyOriginalOverflow ?? 'visible';
        document.body.style.overflow = originalOverflow;

        // Clean up listeners
        document.removeEventListener('keydown', trapFocus);
        document.removeEventListener('focusin', handleFocusIn);
    }

    if (window.location.href.includes('blank.html')) {
        window.history.back();
    }

    if (toast) {
        toast = null;
    }
}

/* Silly hack which is required because when you focus into a window, it will focus the
original document first, which will cause a scrolling jump if the overlay is scrollable */
function handleFocusIn() {
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
function trapFocus(event: KeyboardEvent) {
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

const handleBroadcastReceived = (
    message: Message, 
    sender: browser.runtime.MessageSender, 
    sendResponse: (response?: any) => void) => {
        const handler = messageHandlers[message.action];
        if (!handler) {
            console.error(`Unknown action "${message.action}"`);
            sendResponse({result: 'error', message: 'Unknown action'});
        }

        console.log('Calling handler for:', message);
        handler(message, sender, sendResponse)
        .catch(error => {
            console.error(`Error handling "${message.action}" message:`, error);
            sendResponse({result: 'error', message: error.toString()});
        });
        
        return true; // Indicates async response
}

const messageHandlers: Record<string, MessageHandler> = {
    'closeOverlayAllTabs': async (message, sender, sendResponse) => {
        await destroyOverlayIfExists();
        sendResponse({ result: 'success' });
    },
    'closeOverlayIfFlashcardScreen': async (message, sender, sendResponse) => {
        const currentScreen = getCurrentScreen();
        if (currentScreen && ['flashcard', 'grade', 'review'].includes(currentScreen)) {
            await destroyOverlayIfExists();
        }
        sendResponse({ result: 'success' });
    },
    'showFlashcardAlarm': async (message, sender, sendResponse) => {
        const nextFlashcardTime = await getPersistentState<number>('nextFlashcardTime') ?? Date.now();
        const delay = Math.max(0, nextFlashcardTime - Date.now());
        setTimeout(async () => await showFlashcardIfNeeded(), delay);
        sendResponse({ result: 'success' });
    },
    'showFlashcard': async (message, sender, sendResponse) => {
        await showFlashcard();
        sendResponse({ result: 'success' });
    },
    'showListScreen': async (message, sender, sendResponse) => {
        await showListScreen();
        sendResponse({ result: 'success' });
    }
}

async function init() {
    await destroyOverlayIfExists();
    await showFlashcardIfNeeded();
    // Listens for broadcasts from background.ts
    browser.runtime.onMessage.addListener(handleBroadcastReceived);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    document.removeEventListener('DOMContentLoaded', init);
    init();
}