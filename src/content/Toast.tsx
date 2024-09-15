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
    onRemove }) => {
        return (
            <ToastPrimitive.Root 
                duration={duration} 
                onOpenChange={(open) => {
                    if (!open) onRemove();
                }}
                className="bg-black bg-opacity-25 backdrop-blur-sm rounded-lg p-2"
            >
                <ToastPrimitive.Description className="text-white">
                    {content}
                </ToastPrimitive.Description>
            </ToastPrimitive.Root>
        );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<(ToastProps & { id: number })[]>([]);

    const addToast = useCallback((props: ToastProps) => {
        setToasts(prev => [...prev, { ...props, id: Date.now(), duration: props.duration || 5000 }]);
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <ToastPrimitive.Provider swipeDirection="up">
                {toasts.map(({ id, ...toast }) => (
                    <Toast key={id} {...toast} onRemove={() => setToasts(prev => prev.filter(t => t.id !== id))} />
                ))}
                <ToastPrimitive.Viewport 
                    className="fixed bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col-reverse items-center p-6 gap-2 w-full md:max-w-[30rem] max-h-screen z-[2147483642]" 
                />
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    );
};