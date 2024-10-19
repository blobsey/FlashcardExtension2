import React, { createContext, useContext, useState, useCallback } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';

/* A wrapper for the radix-ui toast which abstracts away a lot of the complexity for
some defaults that I like. Usage:

1. Wrap your parent in the ToastProvider
import { ToastProvider } from './content/Toast';

function App() {
  return (
    <ToastProvider>
      { ... stuff ...}
      </ToastProvider>
    );
}

2. Call toast like this:
    const toast = useToast();

    const someFunc = () => {
        toast({
            content: "This is a toast message!",
            duration: 3000 // Optional: defaults to 5000ms if not provided
        });
    };
*/

interface ToastProps {
    content: React.ReactNode;
    duration?: number;
}

/* Storing the toast() in context so any child of ToastProvider can call toast 
Also can be null if user forgets to wrap their parent component in ToastProvider */
const ToastContext = createContext<((props: ToastProps) => void) | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used in a ToastProvider');
    return context;
}

const Toast: React.FC<ToastProps & { onRemove: () => void }> = ({
    content, 
    duration, 
    onRemove 
}) => {
    return (
        <ToastPrimitive.Root 
            duration={duration} 
            onOpenChange={(open) => {
                if (!open) setTimeout(onRemove, 150);
            }}
            className="bg-gray-300/10 backdrop-blur-sm rounded p-2 hover:bg-gray-300/15 data-[state=open]:animate-slideUpAndFade data-[state=closed]:animate-fadeOut flex items-center"
        >
            <ToastPrimitive.Description className="text-white flex-grow mr-2">
                {content}
            </ToastPrimitive.Description>
            <ToastPrimitive.Close className="text-white opacity-70 hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m18 18-6-6m0 0L6 6m6 6 6-6m-6 6-6 6"/>
                </svg>
            </ToastPrimitive.Close>
        </ToastPrimitive.Root>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<(ToastProps & { id: number })[]>([]);

    const addToast = useCallback((props: ToastProps) => {
        setToasts(prev => [{ ...props, id: Date.now(), duration: props.duration || 3000 }, ...prev]);
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <ToastPrimitive.Provider swipeDirection="down">
                <ToastPrimitive.Viewport 
                    className="fixed bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col justify-end m-6 gap-2 w-full md:max-w-[30rem] max-h-screen z-[2147483645]" 
                >
                    {toasts.map(({ id, ...toast }) => (
                        <Toast key={id} {...toast} onRemove={() => setToasts(prev => prev.filter(t => t.id !== id))} />
                    ))}
                </ToastPrimitive.Viewport>
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    );
};