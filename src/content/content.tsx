import React from 'react';
import ReactDOM, { Root } from 'react-dom/client'; 
import Overlay from './Overlay';
import { getPersistentState } from '../common/usePersistentState';
import {
  getUserData,
  takeScreenshotOfCallerTab,
  cacheNextFlashcard,
  trapFocus,
  handleFocusIn,
} from '../common/common';
import { Flashcard, BlockedSite } from '../common/types';
import { ToastProvider } from './Toast';

// Global reference to a React root created through createRoot(), used for destroying the overlay.
let overlayRoot: Root | null = null;

async function showFlashcardIfNeeded(): Promise<void> {
    const userData = await getUserData();

    // Check if site is in userData blocked_sites list
    const currentUrl = window.location.href;
    const isBlockedSite = userData.blocked_sites.some((site: BlockedSite) => {
        return site.active && currentUrl.includes(site.url);
    });
    if (!isBlockedSite) {
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
    // Calculate existing initial time grant, will be added to by grantTime()
    const existingTimeGrant = await getPersistentState<number>('existingTimeGrant');
    if (!existingTimeGrant) { // In case showFlashcard() gets called before "redeeming" time
        const currentTime = Date.now();
        const nextFlashcardTime = await getPersistentState<number>('nextFlashcardTime');
        const calculatedTimeGrant = nextFlashcardTime ? Math.max(nextFlashcardTime - currentTime, 0) : 0;
        await browser.storage.local.set({
            existingTimeGrant: calculatedTimeGrant
        });
    }

    const flashcard = await getPersistentState<Flashcard>('flashcard');
    if (!flashcard) {
        cacheNextFlashcard();
    }
    await createOverlayIfNotExists();
}

async function createOverlayIfNotExists(): Promise<void> {
    let host = document.getElementById('blobsey-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'blobsey-host';
        document.body.appendChild(host);
    }
    
    const shadowRoot = host.attachShadow({ mode: 'open' });
    
    // Load CSS files
    const cssFiles = [
        'tailwind.css'
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
            <Overlay />
        </ToastProvider>
    );
}

async function destroyOverlayIfExists(): Promise<void> {
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
}

async function init() {
    await destroyOverlayIfExists();
    await showFlashcardIfNeeded();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    document.removeEventListener('DOMContentLoaded', init);
    init();
}