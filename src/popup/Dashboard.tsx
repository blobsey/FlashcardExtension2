import React, { useState, useEffect } from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import { CheckIcon, Pencil1Icon, TrashIcon, CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import usePersistentState from '../common/usePersistentState';
import { useDebounce } from '../common/useDebounce';
import { getUserData, updateUserData } from '../common/common';
import { UserData, BlockedSite } from '../common/types';
import '../styles/popup-tailwind.css';

const Dashboard: React.FC = () => {
    const [apiBaseUrl, _] = usePersistentState('apiBaseUrl', '');
    const [localUserData, setLocalUserData] = useState<Partial<UserData> | null>(null);
    const [blockedSites, setBlockedSites] = useState<BlockedSite[]>([]);
    const [editingSiteIndex, setEditingSiteIndex] = useState<number | null>(null);
    const [editingUrl, setEditingUrl] = useState<string>('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userData = await getUserData();
                setLocalUserData(userData);
                setBlockedSites(userData.blocked_sites || []);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, []);

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
        const updatedSites = [...blockedSites];
        updatedSites[index].active = !updatedSites[index].active;
        setBlockedSites(updatedSites);
        updateUserData({ blocked_sites: updatedSites });
    };

    const handleEditSite = (index: number) => {
        setEditingSiteIndex(index);
        setEditingUrl(blockedSites[index].url);
    };

    const handleDeleteSite = (index: number) => {
        const updatedSites = blockedSites.filter((_, i) => i !== index);
        setBlockedSites(updatedSites);
        updateUserData({ blocked_sites: updatedSites });
    };

    const handleSaveEdit = () => {
        if (editingSiteIndex !== null) {
            const updatedSites = [...blockedSites];
            updatedSites[editingSiteIndex].url = editingUrl;
            setBlockedSites(updatedSites);
            updateUserData({ blocked_sites: updatedSites });
            setEditingSiteIndex(null);
        }
    };

    const handleCancelEdit = () => {
        setEditingSiteIndex(null);
        setEditingUrl('');
    };

    return (
        <div className="p-4 w-full">
            <div>Logged in to:</div>
            <code>{apiBaseUrl}</code>
            
            <div className="mt-4">
                <label htmlFor="maxNewCards" className="block mb-2">Max new cards per day:</label>
                <input
                    id="maxNewCards"
                    type="number"
                    value={localUserData?.max_new_cards ?? ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    min="0"
                />
            </div>
            
            <div className="mt-4">
                <h4 className="font-semibold mb-2">Blocked Sites</h4>
                <ul>
                    {blockedSites.map((site, index) => (
                        <li key={index} className="flex items-center mb-2">
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
                                            type="text"
                                            value={editingUrl}
                                            onChange={(e) => setEditingUrl(e.target.value)}
                                            className="flex-grow pl-2 p-1 border-none text-sm rounded"
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
                                        <span className="ml-2 flex-grow">{site.url}</span>
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
                </ul>
            </div>
            
            <div className="mt-4">
                <button
                    onClick={() => browser.runtime.sendMessage({ action: 'logout' })}
                    className="px-4 py-1 bg-red-500/25 text-white rounded hover:bg-red-500/50"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Dashboard;