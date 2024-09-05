// usePersistentState.ts

import { useState, useEffect, useRef } from 'react';

/* Provides a function which behaves nearly identically to useState, however it
requires one additional argument (key) which is the string key in browser.storage.local

To use:
    const [state, setState] = usePersistentState<T>('yourKey', 'yourInitialValue');

Also, will re-render component if that key changes in browser.storage.local underneath,
i.e. if background.ts directly changes browser.storage.local */
function usePersistentState<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [state, _setState] = useState<T>(initialValue);
    const latestState = useRef<T>(initialValue);

    /* This prevents _setState() from being called twice (i.e. once when setState()
    called, and once in handleStorageChange()) */
    const setStateWrapped = (value: T):void => {
        if (value !== latestState.current) {
            latestState.current = value;
            _setState(value);
        }
    };

    /* Loads initial state from storage, and sets up listeners to update state
    whenever browser.storage.local gets changed underneath (i.e. from background.ts) */
    useEffect(() => {
        const loadState = async () => {
            const { [key]: storedValue } = await browser.storage.local.get(key);
            setStateWrapped(storedValue ?? initialValue);
        };

        loadState();

        const handleStorageChange = (
            changes: { [key: string]: browser.storage.StorageChange },
            areaName: string) => {
                if (areaName === 'local' && key in changes) {
                    setStateWrapped(changes[key].newValue);
                }
        };

        browser.storage.onChanged.addListener(handleStorageChange);

        return () => {
            browser.storage.onChanged.removeListener(handleStorageChange);
        }
    }, []);

    // Sets value in storage, which will then get caught by handleStorageChange()
    const setState = (value: T) => {
        setStateWrapped(value);
        browser.storage.local.set({ [key]: value })
    };

    return [state, setState];
}

/* Utility function to set a persistentState from non tsx files, example usage:
    await setPersistentState('yourKey', 'yourString'); */
export async function setPersistentState<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
}

/* Utility function to get a persistentState from non tsx files, example usage:
    const yourNum = await getPersistentState<number>('yourKey'); */
export async function getPersistentState<T>(key: string): Promise<T | null> {
    const { [key]: storedValue } = await browser.storage.local.get(key);
    return storedValue as T ?? null;
}

export default usePersistentState;