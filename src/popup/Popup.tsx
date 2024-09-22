import React from 'react';
import usePersistentState from '../common/usePersistentState';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';

const Popup: React.FC = () => {
    const [isLoggedIn, _] = usePersistentState('isLoggedIn', false);

    return (
        <>
            {isLoggedIn ? <Dashboard /> : <LoginPage />}
        </>
    );
};

export default Popup;