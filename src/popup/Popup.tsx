import React, { useState, useEffect, useRef } from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import LoginPage from './LoginPage';
import { CheckIcon, Pencil1Icon, TrashIcon, 
    CheckCircledIcon, CrossCircledIcon, PlusIcon
} from '@radix-ui/react-icons';
import usePersistentState from '../common/usePersistentState';
import { useDebounce } from '../common/useDebounce';
import { getUserData, updateUserData } from '../common/common';
import { UserData, BlockedSite } from '../common/types';
import '../styles/popup-tailwind.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../content/Select';

const Popup: React.FC = () => {
    const [apiBaseUrl, _] = usePersistentState('apiBaseUrl', '');
    const [localUserData, setLocalUserData] = useState<Partial<UserData> | null>(null);
    const [editingSiteIndex, setEditingSiteIndex] = useState<number | null>(null);
    const [editingSiteText, setEditingSiteText] = useState<string>('');
    const editInputRef = useRef<HTMLInputElement>(null);
    const [isLoggedIn, __] = usePersistentState('isLoggedIn', false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userData = await getUserData();
                setLocalUserData(userData);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [isLoggedIn]);

    const debouncedSaveFunc = useDebounce(() => {
        if (localUserData) {
            updateUserData(localUserData);
        }
    }, 500);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputStr = e.target.value;
        setLocalUserData(prevData => {
            if (!prevData) return prevData;

            const updatedData = { ...prevData };
            
            if (inputStr === '') {
                delete updatedData.max_new_cards;
            } else {
                const newValue = parseInt(inputStr, 10);
                if (!isNaN(newValue)) {
                    updatedData.max_new_cards = newValue;
                }
            }

            return updatedData;
        });

        if (inputStr !== '') {
            debouncedSaveFunc();
        }
    };

    const handleSiteActiveChange = (index: number) => {
        setLocalUserData(prevData => {
            if (!prevData || !prevData.blocked_sites) return prevData;
            
            const updatedBlockedSites = [...prevData.blocked_sites];
            updatedBlockedSites[index] = {
                ...updatedBlockedSites[index],
                active: !updatedBlockedSites[index].active
            };
            
            const updatedData = { ...prevData, blocked_sites: updatedBlockedSites };
            updateUserData(updatedData);
            return updatedData;
        });
    };

    const handleEditSite = (index: number) => {
        if (localUserData?.blocked_sites) {
            setEditingSiteText(localUserData.blocked_sites[index].url);
        }
        setEditingSiteIndex(index);
    };

    const handleDeleteSite = (index: number) => {
        setLocalUserData(prevData => {
            if (!prevData || !prevData.blocked_sites) return prevData;
            
            const updatedSites = prevData.blocked_sites.filter((_, i) => i !== index);
            const updatedData = { ...prevData, blocked_sites: updatedSites };
            
            updateUserData(updatedData);
            
            return updatedData;
        });
    };

    const handleAddSite = () => {
        setLocalUserData(prevData => {
            if (prevData?.blocked_sites) {
                const existingBlockedSites = prevData?.blocked_sites ?? [];
                const newUserData = { 
                    ...prevData, 
                    blocked_sites: [ ...existingBlockedSites, { url: '', active: true }]
                };
                updateUserData(newUserData);
                return newUserData;
            }
            return prevData;
        });
        if (localUserData?.blocked_sites?.length) {
            setEditingSiteIndex(localUserData?.blocked_sites?.length)
        }
    }

    const handleSaveEdit = () => {
        setLocalUserData(prevData => {
            if (!prevData || !prevData.blocked_sites || editingSiteIndex === null) return prevData;
            
            const updatedBlockedSites = [...prevData.blocked_sites];
            updatedBlockedSites[editingSiteIndex] = {
                ...updatedBlockedSites[editingSiteIndex],
                url: editingSiteText
            };
            
            const updatedData = { ...prevData, blocked_sites: updatedBlockedSites };
            
            // Call updateUserData with the new data
            updateUserData(updatedData);
            
            return updatedData;
        });
        
        setEditingSiteIndex(null);
    };

    const handleCancelEdit = () => {
        setEditingSiteIndex(null);
        if (editInputRef.current?.value === '' && localUserData?.blocked_sites?.length) {
            handleDeleteSite(localUserData?.blocked_sites?.length - 1);
        }
    };

    const handleDeckChange = (value: string) => {
        console.log('Deck changed to:', value);
        setLocalUserData(prevData => {
            if (!prevData) return prevData;
            
            const updatedData = { ...prevData, deck: value };
            updateUserData(updatedData);
            return updatedData;
        });
    };

    // Auto focus input when editing a site
    useEffect(() => {
        if (editingSiteIndex !== null) {
            editInputRef.current?.focus();
        }
    }, [editingSiteIndex]);

    const createOverlayInCurrentTab = async (screen: string) => {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            const currentTab = tabs[0];
            if (currentTab && currentTab.id) {
                try {
                    await browser.tabs.sendMessage(currentTab.id, { 
                        action: 'createOverlayInCurrentTab',
                        screen
                    });
                } 
                catch (error) {
                    if (error instanceof Error && error.message.includes('Receiving end does not exist')) {
                        // Store screenshot and favicon
                        const screenshotUrl = await browser.tabs.captureVisibleTab();
                        const favicon = currentTab.favIconUrl || '';
                        const tabInfo = { screenshotUrl, favicon, timestamp: Date.now() };
                        await browser.storage.local.set({ [`tabInfo_${currentTab.id}`]: tabInfo });

                        // Also clean up old screenshots
                        const allItems = await browser.storage.local.get();
                        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                        for (const [key, value] of Object.entries(allItems)) {
                            if (key.startsWith('tabInfo_') && value.timestamp < oneDayAgo) {
                                await browser.storage.local.remove(key);
                            }
                        }

                        // Update the current tab to fallback.html
                        await browser.tabs.update(currentTab.id, {
                            url: browser.runtime.getURL(`fallback.html?screen=${encodeURIComponent(screen)}&tabId=${currentTab.id}`)
                        });
                    } else {
                        // If it's a different error, rethrow it
                        throw error;
                    }
                }
                finally {
                    window.close();
                }
            }
        }
    };

    const handleShowFlashcard = () => createOverlayInCurrentTab('showFlashcard');

    const handleShowListScreen = () => createOverlayInCurrentTab('showListScreen');

    if (!isLoggedIn) {
        return (
            <div className='p-2 w-full flex flex-col items-center'>
                <LoginPage />
            </div>
        )
    }
    return (
        <div className="p-2 w-full flex flex-col items-center">
            <div>Logged in to:</div>
            <code>{apiBaseUrl}</code>
            
            <div className="w-full mt-2">
                <div className="w-full mx-auto grid grid-cols-2 gap-2">
                    <button 
                        onClick={handleShowFlashcard}
                        className="p-2 text-center bg-white/5 rounded hover:bg-white/10 transition-colors duration-200"
                    >
                        Show me a flashcard
                    </button>
                    <button 
                        className="p-2 text-center bg-white/5 rounded hover:bg-white/10 transition-colors duration-200"
                        onClick={handleShowListScreen}
                    >
                        List flashcards
                    </button>
                    <button className="p-2 text-center bg-white/5 rounded hover:bg-white/10 transition-colors duration-200">
                        Add flashcards
                    </button>
                    <button
                        onClick={() => browser.runtime.sendMessage({ action: 'logout' })}
                        className="p-2 text-center bg-red-500/25 rounded hover:bg-red-500/50 transition-colors duration-200"
                    >
                        Logout
                    </button>
                </div>

                <hr className="mx-auto my-2 border-white/10 w-[98%]"/>

                <h4 className="font-semibold ml-1 mt-2">Settings</h4>
                <div className="flex flex-row w-full p-2 pr-4 items-center bg-black/20 rounded">
                    <label htmlFor="maxNewCards" className="flex-grow whitespace-nowrap mr-2">Max new cards per day:</label>
                    <input
                        id="maxNewCards"
                        type="number"
                        value={localUserData?.max_new_cards ?? ''}
                        onChange={handleInputChange}
                        className="w-12 text-center focus:rounded"
                        min="0"
                    />
                </div>

                <div className="flex flex-row w-full p-2 pr-4 items-center bg-black/20 rounded mt-2">
                    <label className="flex-grow whitespace-nowrap mr-2">Current deck:</label>
                    <Select 
                        onValueChange={handleDeckChange} 
                        value={localUserData?.deck}
                        onOpenChange={(open) => console.log('Select opened:', open)}
                    >
                        <SelectTrigger 
                            className="w-[180px]" 
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('SelectTrigger clicked');
                            }}
                        >
                            <SelectValue placeholder="Select a deck" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SDE@AWS">SDE@AWS</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <h4 className="font-semibold ml-1 mt-2">Blocked Sites</h4>
                <ul className="bg-black/20 p-2 rounded overflow-y-auto max-h-80">
                    {localUserData?.blocked_sites && localUserData?.blocked_sites.map((site, index) => (
                        <li key={index} className="flex items-center mb-1 ml-1">
                            <Checkbox.Root
                                className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 bg-transparent hover:bg-gray-100/25 focus:outline-white transition-colors duration-200"
                                checked={site.active}
                                onCheckedChange={() => handleSiteActiveChange(index)}
                            >
                                <Checkbox.Indicator className="text-white">
                                    <CheckIcon />
                                </Checkbox.Indicator>
                            </Checkbox.Root>
                                <div className='flex-grow flex h-6 ml-2'>
                                {editingSiteIndex === index ? 
                                    <>
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            value={editingSiteText}
                                            onChange={(e) => setEditingSiteText(e.target.value)}
                                            className="flex-grow pl-2 border-none text-sm rounded"
                                        />
                                        <button
                                            onClick={handleSaveEdit}
                                            className="p-1 ml-2 text-green-500 hover:text-green-700"
                                        >
                                            <CheckCircledIcon />
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="p-1 ml-2 text-red-500 hover:text-red-700"
                                        >
                                            <CrossCircledIcon />
                                        </button>
                                    </>
                                    :
                                    <>
                                        <span className="ml-2 flex-grow text-white/50">{site.url}</span>
                                        <button
                                            onClick={() => handleEditSite(index)}
                                            className="p-1 ml-2 text-white/50 hover:text-white"
                                        >
                                            <Pencil1Icon />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSite(index)}
                                            className="p-1 ml-2 text-red-500 hover:text-red-700"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </>
                                }
                            </div>
                        </li>
                    ))}
                    <button
                        onClick={handleAddSite}
                        className="w-[98%] p-2 m-auto flex items-center justify-center bg-white/5 rounded hover:bg-white/10"
                    >
                        <PlusIcon />
                    </button>
                </ul>
            </div>
        </div>
    );
};

export default Popup;