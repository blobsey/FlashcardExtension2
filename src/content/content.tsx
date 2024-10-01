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

    // If overlay already up, don't interrupt
    const currentScreen = getCurrentScreen();
    if (currentScreen) {
        return;
    }

    // If the nextFlashcardTime has passed, show flashcard
    const nextFlashcardTime = await getPersistentState<number>('nextFlashcardTime');
    const currentTime = Date.now();
    if (!nextFlashcardTime || currentTime >= nextFlashcardTime) {
        await showFlashcard();
    }
}

async function showFlashcard(): Promise<void> {
    console.log('Showing a flashcard');

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
        console.log('Overlay already active, setting existing overlay to flashcard screen');
        setCurrentScreenRef.current('flashcard');
    }
    else {
        createOverlayIfNotExists('flashcard');
    }
}

async function showListScreen(): Promise<void> {
    if (setCurrentScreenRef.current) {
        console.log('Overlay already active, setting existing overlay to list screen');
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

    // CLean up global vars
    toast = null;
    setCurrentScreenRef.current = null;

    if (window.location.href.includes('fallback.html')) {
        window.history.back();
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
            console.log(`Unknown action "${message.action}"`);
            return;
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
    'createOverlayInCurrentTab': async (message, sender, sendResponse) => {
        await forceCreateOverlay(message.screen);
        sendResponse({ result: 'success' });
    }
}

async function forceCreateOverlay(screenToOpen: string) {
    switch (screenToOpen) {
        case 'showFlashcard':
            const currentScreen = getCurrentScreen();
            if (currentScreen && ['flashcard', 'grade', 'review'].includes(currentScreen)) {
                /* This path is called when the user manually presses 'Show me a flashcard
                but we *probably* don't want to reset the current flashcard review loop, 
                so return early in this edge case */
                if (toast) { 
                    toast({content: 'Already showing a flashcard!'});
                }
                return;
            }
            else {
                await showFlashcard();
                break;
            }
        case 'showListScreen':
            await showListScreen();
            break;
    }
}

async function init() {
    /* Check if we are in fallback.html; if we are then that means the user pressed
    'Add flashcards' or possibly 'Show me a flashcard'/'List flashcards' which threw 
    an error. This occurs only when Popup.tsx manually opens fallback.html, and saves
    screenshot data to local storage. Try to retrieve that, but don't fail everything 
    if we fail to retrieve the screenshot data */
    if (window.location.href.startsWith(browser.runtime.getURL('fallback.html'))) {
        const urlParams = new URLSearchParams(window.location.search);
        const screen = urlParams.get('screen');
        const tabId = urlParams.get('tabId');
        
        if (tabId) {
            try {
                const tabInfo = await browser.storage.local.get(`tabInfo_${tabId}`);
                if (tabInfo[`tabInfo_${tabId}`]) {
                    const { screenshotUrl, favicon } = tabInfo[`tabInfo_${tabId}`];
                    
                    // Set background
                    document.body.style.backgroundImage = `url(${screenshotUrl})`;
                    document.body.style.backgroundSize = 'cover';
                    
                    // Set favicon
                    const link = document.createElement('link');
                    link.rel = 'icon';
                    link.href = favicon;
                    document.head.appendChild(link);
                }
            } catch (error) {
                console.error('Error setting fallback background:', error);
                // If there's an error, we'll just continue without setting the background
            }
        }
        
        if (screen) {
            await forceCreateOverlay(screen);
        }
    } else {
        await destroyOverlayIfExists();
        await showFlashcardIfNeeded();
    }

    // Listens for broadcasts from background.ts
    browser.runtime.onMessage.addListener(handleBroadcastReceived);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    document.removeEventListener('DOMContentLoaded', init);
    init();
}