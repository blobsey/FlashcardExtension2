import { getPersistentState, setPersistentState } from "../common/usePersistentState";
import { Message, MessageHandler } from "../common/types";

browser.alarms.onAlarm.addListener((alarm) => {
    console.log('Got alarm:', alarm);
    if (alarm.name === "showFlashcardAlarm") {
        broadcastAllTabsFromBackground('showFlashcardAlarm');
    }
});

async function broadcastAllTabsFromBackground(action: string) {
    const tabs = await browser.tabs.query({});
    const broadcastPromises = tabs.map(tab => {
        if (tab.id !== undefined) {
            return browser.tabs.sendMessage(tab.id, {
                action
            }).catch(error => {
                console.info(`Failed to send message to 'tab '${tab.title}'`, error);
            });
        }
    });
    
    await Promise.all(broadcastPromises);
    return;
}

// Listener which relates message.action to corresponding function in messageHandlers
browser.runtime.onMessage.addListener((
    message: Message, 
    sender: browser.runtime.MessageSender, 
    sendResponse: (response?: any) => void) => {
        const handler = messageHandlers[message.action];
        if (!handler) {
            console.error(`Unknown action "${message.action}"`);
            sendResponse({result: 'error', message: 'Unknown action'});
        }

        handler(message, sender, sendResponse)
        .catch(error => {
            console.error(`Error handling "${message.action}" message:`, error);
            sendResponse({result: 'error', message: error.toString()});
        });
        
        return true; // Indicates async response
});

const messageHandlers: Record<string, MessageHandler> = {
    'redeemExistingTimeGrant': async (message, sender, sendResponse) => {
        const existingTimeGrant = await getPersistentState<number>('existingTimeGrant') ?? 0;
        const currentTime = Date.now();
        let baseTime = await getPersistentState<number>('nextFlashcardTime') ?? currentTime;
        if (baseTime < currentTime) {
            baseTime = currentTime;
        }
        const nextFlashcardTime = baseTime + existingTimeGrant;
        setPersistentState('nextFlashcardTime', nextFlashcardTime);
        setPersistentState('existingTimeGrant', 0);
    
        browser.alarms.create("showFlashcardAlarm", {
            delayInMinutes: existingTimeGrant / 60000,
        });
        const alarmInfo = await browser.alarms.get("showFlashcardAlarm");
        console.log('baseTime:', new Date(baseTime).toLocaleString());
        console.log('nextFlashcardTime:', new Date(nextFlashcardTime).toLocaleString());
        if (alarmInfo && alarmInfo.scheduledTime) {
            console.log('Alarm scheduledTime:', new Date(alarmInfo.scheduledTime).toLocaleString());
        }
        sendResponse({ result: 'success' });
    },
    'broadcast': async (message, sender, sendResponse) => {
        await broadcastAllTabsFromBackground(message.broadcastedAction);
        sendResponse({ result: 'success' });
    },
    'screenshotCurrentTab': async (message, sender, sendResponse) => {
        if (!sender.tab || !sender.tab.active) {
            throw new Error("Caller tab must be the active tab to capture screenshot");
        }

        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab.id !== sender.tab.id) {
            throw new Error("Caller tab must be the active tab to capture screenshot");
        }

        const dataUrl = await browser.tabs.captureVisibleTab();
        sendResponse({ result: 'success', screenshotUri: dataUrl });
    },
    'login': async (message, sender, sendResponse) => {
        const apiBaseUrl = await getPersistentState('apiBaseUrl');

        // Open login page
        const tab = await browser.tabs.create({ url: `${apiBaseUrl}/login`, active: true });

        // After successful login, cutomatically close tab after 3 seconds
        const tabCloser = (tabId: number, changeInfo: any, updatedTab: browser.tabs.Tab) => {
            if (tabId === tab.id && 
                changeInfo.status === 'complete' && 
                updatedTab.url?.startsWith(`${apiBaseUrl}/auth`)) {
                    setTimeout(() => {
                        browser.tabs.remove(tabId);
                    }, 3000);

                    handleApiRequest("/validate-authentication")
                    .then((data) => {
                        if (data.message !== 'Authentication valid') {
                            throw new Error('Authentication failed');
                        }
                        setPersistentState('isLoggedIn', true);
                    });
            }
        };
        browser.tabs.onUpdated.addListener(tabCloser);

        // Listener which cleans up listeners when tab closed
        const listenerRemover = (tabId: number) => {
            if (tabId === tab.id) {
                browser.tabs.onUpdated.removeListener(tabCloser);
                browser.tabs.onRemoved.removeListener(listenerRemover);
            }
        };
        browser.tabs.onRemoved.addListener(listenerRemover);
        
        sendResponse({result: 'success'});
    },
    'logout': async (message, sender, sendResponse) => {
        const apiBaseUrl = await getPersistentState('apiBaseUrl');
        await browser.storage.local.clear();
        await setPersistentState('apiBaseUrl', apiBaseUrl);
        const data = await handleApiRequest("/logout");
        sendResponse({result: 'success', response: data});
    },
    'getUserData': async (message, sender, sendResponse) => {
        const data = await handleApiRequest("/user-data", { method: 'GET' });
        sendResponse({result: 'success', ...data});
    },
    'nextFlashcard': async (message, sender, sendResponse) => {
        const deck = message.deck || "";
        const data = await handleApiRequest(`/next?deck=${encodeURIComponent(deck)}`);
        sendResponse({result: 'success', ...data});
    },
    'reviewFlashcard': async (message, sender, sendResponse) => {
        const data = await handleApiRequest(`/review/${message.card_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grade: message.grade
            })
        });
        sendResponse({result: 'success', ...data});
    },
    'editFlashcard': async (message, sender, sendResponse) => {
        const data = await handleApiRequest(`/edit/${message.card_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                card_type: message.card_type,
                card_front: message.card_front, 
                card_back: message.card_back 
            })
        });
        sendResponse({result: 'success', ...data})
    }
}

async function handleApiRequest(path: string, options: RequestInit = {}): Promise<any> {
    const apiBaseUrl = await getPersistentState<string>('apiBaseUrl') as string;
    let url = new URL(path, apiBaseUrl);

    // Include credentials (cookies) in the request
    options.credentials = 'include';

    const response = await fetch(url, options);
    const contentType = response.headers.get('Content-Type') || '';

    if (!response.ok) { // If response not in 200-299
        let error: Error & { details?: any; responseText?: string; status?: number; statusText?: string; };
    
        // If type is 'application/json' try to parse and rethrow error
        if (contentType && contentType.includes('application/json')) {
            const errorDetails = await response.json();
            error = new Error(`API Request not ok: ${JSON.stringify(errorDetails) || response.statusText}`);
            error.details = errorDetails;
        } else { // If not 'application/json' then parse as plaintext
            const errorText = await response.text();
            error = new Error(`API Request not ok: ${errorText || response.statusText}`);
            error.responseText = errorText;
        }
    
        error.status = response.status;
        error.statusText = response.statusText;
        console.error(error);
        throw error;
    }

    // Return the response according to content type
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    else if (contentType && contentType.includes('text/csv')) { // If file download, handle it here
                // Get filename from Content-Disposition header
                const disposition = response.headers.get('Content-Disposition') || '';
                let filename = disposition.split(/;(.+)/)[1]?.split(/=(.+)/)[1] || '';
                if (filename.toLowerCase().startsWith("utf-8''"))
                    filename = decodeURIComponent(filename.replace("utf-8''", ''));
                else
                    filename = filename.replace(/['"]/g, '');
        
                // Generate download URL and click it
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                return { message: "Hello!" };
    }
    else {
        return await response.text();
    }
}