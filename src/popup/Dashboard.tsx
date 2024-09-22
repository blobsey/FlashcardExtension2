import React, { useState, useEffect } from 'react';
import usePersistentState from '../common/usePersistentState';
import '../styles/popup-tailwind.css';

const Dashboard: React.FC = () => {

    const [apiBaseUrl, _] = usePersistentState('apiBaseUrl', '');

    return (
        <>
        <div>Logged in to</div>
        <div><code>{apiBaseUrl}</code></div>
        <div>
        
        <button
            onClick={() => browser.runtime.sendMessage({ action: 'logout' })}>
                Logout
            </button> 
        </div>           
        </>
    )
};


export default Dashboard;