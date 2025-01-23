import auth from '../services/auth.js';

const updateUI = () => {
    const loggedSection = document.getElementById('logged');
    const notLoggedSection = document.getElementById('not-logged');
    if (auth.authenticated) {
        loggedSection.hidden = true;
        notLoggedSection.hidden = false;
    } else {
        loggedSection.hidden = false;
        notLoggedSection.hidden = true;
    }
}

const init = () => {
    updateUI();
    auth.addListener(() => updateUI());
}

export  {init} ;