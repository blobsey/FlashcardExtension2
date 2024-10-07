"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Cross2Icon } from "@radix-ui/react-icons"
import { useRef, useState } from "react"
import { useToast } from "./Toast" // Assuming you have a Toast component

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
React.ElementRef<typeof DialogPrimitive.Overlay>,
React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
    {...props}
    />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
React.ElementRef<typeof DialogPrimitive.Content>,
React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
    const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null)
    
    React.useEffect(() => {
        const blobseyHost = document.getElementById('blobsey-host');
        setPortalContainer(blobseyHost?.shadowRoot as any || document.body);
        console.log(blobseyHost?.shadowRoot);
    }, []);
    
    return (
        <DialogPortal container={portalContainer}>
        <DialogOverlay className='z-[2147483644] bg-black/50'/>
        <DialogPrimitive.Content
        ref={ref}
        className={`z-[2147483644] fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 bg-white bg-opacity-10 backdrop-blur-[10px] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg ${className}`}
        {...props}
        >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <Cross2Icon className="h-4 w-4" />
        <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        </DialogPrimitive.Content>
        </DialogPortal>
    )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
    className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
    {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
    {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
React.ElementRef<typeof DialogPrimitive.Title>,
React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    {...props}
    />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
React.ElementRef<typeof DialogPrimitive.Description>,
React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
    ref={ref}
    className={`text-sm text-muted-foreground ${className}`}
    {...props}
    />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

interface DialogWithInputProps {
    title: string;
    inputPlaceholder: string;
    onSubmit: (value: string) => Promise<void>;
}

type DialogWithInputRootProps = DialogPrimitive.DialogProps & DialogWithInputProps;

const DialogWithInput: React.FC<DialogWithInputRootProps> = ({
    title,
    inputPlaceholder,
    onSubmit,
    children,
    ...props
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const value = inputRef.current?.value;
            if (value) {
                const trimmedValue = value.trim();
                await onSubmit(trimmedValue);
                setOpen(false);
            }
            else {
                throw new Error('Value is empty!');
            }
        }
        finally {
            setIsLoading(false);
            setOpen(false);
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen} {...props}>
            {children}
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={inputPlaceholder}
                        className="w-full p-2 mb-2 rounded bg-white/10 outline-none focus:outline-none focus:ring-1 focus:ring-white focus:ring-opacity-50 text-white"
                        autoFocus
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <button 
                                onClick={() => inputRef.current && (inputRef.current.value = '')} 
                                className="blobsey-btn"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                        </DialogClose>
                        <button
                            type="submit"
                            className="blobsey-btn"
                            disabled={isLoading}
                        >
                            Submit
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


interface DialogConfirmProps {
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
}

type DialogConfirmRootProps = DialogPrimitive.DialogProps & DialogConfirmProps;

const DialogConfirm: React.FC<DialogConfirmRootProps> = ({
    title,
    description,
    onConfirm,
    onCancel,
    children,
    ...props
}) => {
    const handleConfirm = () => {
        onConfirm();
        props.onOpenChange?.(false);
    };
    
    const handleCancel = () => {
        onCancel();
        props.onOpenChange?.(false);
    };
    
    return (
        <Dialog {...props}>
            {children}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <button 
                        onClick={handleCancel}
                        className="blobsey-btn"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="blobsey-btn"
                    >
                        Confirm
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogWithInput,
    DialogConfirm
}
