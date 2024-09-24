import React from 'react';

import usePersistentState from '../common/usePersistentState';

const LoginPage: React.FC = () => {
    const [apiBaseUrl, setApiBaseUrl] = usePersistentState('apiBaseUrl', '');

    return (
        <>
            <input 
                className='w-full mb-2 text-center focus:rounded'
                type='text'
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder='apiBaseUrl'>
            </input>
            <button
                className='p-2 text-center bg-white/5 rounded hover:bg-white/10 transition-colors duration-200'
                onClick={() => browser.runtime.sendMessage({action: 'login'})}
            >
                Login with Google
            </button>           
        </>
    );
};

export default LoginPage;
