export interface BlockedSite {
    url: string;
    active: boolean;
}

export interface UserData {
    max_new_cards: number;
    deck: string;
    decks: string[];
    blocked_sites: BlockedSite[];
}

export type Screen = 'flashcard' | 'grade' | 'review' | 'edit' | 'list';

export interface Flashcard {
    user_id: string;
    card_back: string;
    card_front: string;
    card_type: string;
    last_review_date: string;
    stability: number;
    difficulty: number;
    card_id: string;
    review_date: string;
}

export interface Message {
    action: string;
    [key: string]: any;
}

export type MessageHandler = (
    message: Message,
    sender: browser.runtime.MessageSender,
    sendResponse: (response?: any) => void
) => Promise<void>;

export interface FlashcardListResponse {
    flashcards: Flashcard[];
    nextPage: string | null;
}