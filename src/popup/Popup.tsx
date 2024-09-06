import React from 'react';
import usePersistentState from '../common/usePersistentState';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';

const Popup: React.FC = () => {
    const [isLoggedIn, _] = usePersistentState('isLoggedIn', false);

    return (
        <div id='root'>
            {isLoggedIn ? <Dashboard /> : <LoginPage />}
        </div>
    );
};

export default Popup;