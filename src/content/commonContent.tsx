/* Utility function for sending a message to all tabs. Relies on the 
'broadcast' message handler in background.ts and handleBroadcastReceived
in content.tsx */
export async function broadcastThroughBackgroundScript(action: string) {
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