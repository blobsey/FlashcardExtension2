import React, { useState, useEffect } from 'react';
import usePersistentState from '../common/usePersistentState';
import { useDebounce } from '../common/useDebounce';
import { getUserData, updateUserData } from '../common/common';
import { UserData } from '../common/types';
import '../styles/popup-tailwind.css';

const Dashboard: React.FC = () => {
    const [apiBaseUrl, _] = usePersistentState('apiBaseUrl', '');
    const [localUserData, setLocalUserData] = useState<Partial<UserData> | null>(null);

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

    return (
        <div className="p-4">
            <div>Logged in to: <code>{apiBaseUrl}</code></div>
            
            <div className="mt-4">
                <label htmlFor="maxNewCards" className="block mb-2">Max New Cards per Day:</label>
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
                <button
                    onClick={() => browser.runtime.sendMessage({ action: 'logout' })}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Dashboard;