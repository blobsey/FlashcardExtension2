import React from 'react';

import usePersistentState from '../utils/usePersistentState';

const LoginPage: React.FC = () => {
    const [apiBaseUrl, setApiBaseUrl] = usePersistentState('apiBaseUrl', '');

    return (
        <>
        <div>
            <input type='text'
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder='apiBaseUrl'>
            </input>
        </div>
        <div>
            <button
            onClick={() => browser.runtime.sendMessage({action: 'login'})}>
                Login
            </button>           
        </div>
        </>
    );
};

export default LoginPage;
