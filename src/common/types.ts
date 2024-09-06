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

export interface ScreenProps {
    goBack: () => void;
    navigateTo: (path: string) => void;
}

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