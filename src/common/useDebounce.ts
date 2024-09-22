import { useCallback, useEffect, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T {
    const callbackRef = useRef(callback);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    
    // Update the callback ref whenever the callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    
    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]) as T;
}
