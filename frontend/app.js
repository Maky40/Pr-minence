// Cibler les éléments nécessaires
const playButton = document.getElementById('play-button');
const mainContent = document.getElementById('main-content');
const dashContent = document.getElementById('dashboard-content');
const loginForm = document.getElementById('login-form');
const chatContent = document.getElementById('chat-content');
const chatButton = document.getElementById('chat-button');
const homeButton = document.getElementById('home-button');
const dashboardButton = document.getElementById('dashboard-button');
const connexionButton = document.getElementById('connexion-button');
const signupButton = document.getElementById('signup-button');
const createAccountButton = document.getElementById('create-account-button'); // Créer un compte
const signupForm = document.getElementById('signup-form');
const backToLoginButton = document.getElementById('back-to-login');
const signupNavbarButton = document.getElementById('signup-navbar-button');
// Variable globale pour connaitre la vue actuelle et gerer l'historique
let currentView = 'home';

// Fonction pour basculer entre les vues
function changeView(view) {
    if (view === 'home') {
        mainContent.style.display = 'flex';
        loginForm.style.display = 'none';
        chatContent.style.display = 'none';
        dashContent.style.display = 'none';
        signupForm.style.display = 'none';
    } else if (view === 'login') {
        mainContent.style.display = 'none';
        loginForm.style.display = 'flex';
        chatContent.style.display = 'none';
        dashContent.style.display = 'none';
        signupForm.style.display = 'none';
    } else if (view === 'chat') {
        mainContent.style.display = 'none';
        loginForm.style.display = 'none';
        chatContent.style.display = 'grid';
        dashContent.style.display = 'none';
        signupForm.style.display = 'none';
    } else if (view === 'signup') {
        mainContent.style.display = 'none';
        loginForm.style.display = 'none';
        chatContent.style.display = 'none';
        dashContent.style.display = 'none';
        signupForm.style.display = 'flex';
    }
    currentView = view;
}


// Ajouter un événement au clic sur le bouton "PLAY"
playButton.addEventListener('click', () => {
	if (currentView !== 'login'){
		changeView('login');
		history.pushState({ view: 'login' }, '', '#login');}
});

connexionButton.addEventListener('click', () => {
	if (currentView !== 'login'){
		changeView('login');
		history.pushState({ view: 'login' }, '', '#login');}
});

// Ajouter un événement au clic sur le bouton "CHAT"
chatButton.addEventListener('click', () => {
	if (currentView !== 'chat'){
		changeView('chat');
		history.pushState({ view: 'chat' }, '', '#chat');}
})

homeButton.addEventListener('click', () => {
	if (currentView !== 'home'){
		changeView('home');
		history.pushState({ view: 'home' }, '', '#home');}
})

// Gérer les changements de l'historique
window.onpopstate = (event) => {
	const state = event.state;
	if (state && state.view)
		changeView(state.view);
	else
		changeView('home');
};

// Initialiser la vue en fonction de l'URL
window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash === '#login') {
        changeView('login');
    } else if (hash === '#chat') {
        changeView('chat');
    } else if (hash === '#signup') {
        changeView('signup');
    } else {
        changeView('home');
    }
});

signupButton.addEventListener('click', () => {
    if (currentView !== 'signup') {
        changeView('signup');
        history.pushState({ view: 'signup' }, '', '#signup');
    }
});

backToLoginButton.addEventListener('click', () => {
    if (currentView !== 'login') {
        changeView('login');
        history.pushState({ view: 'login' }, '', '#login');
    }
});

signupNavbarButton.addEventListener('click', () => {
    if (currentView !== 'signup') {
        changeView('signup');
        history.pushState({ view: 'signup' }, '', '#signup');
    }
});


createAccountButton.addEventListener('click', async (event) => {
    event.preventDefault(); // Pour éviter la soumission par défaut du formulaire
    const username = document.getElementById('new-username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('new-password').value;

    try {
        const response = await fetch('http://localhost:8000/api/users/signup/', { // utilisation de l'API definie dans urls.py
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();

        if (response.ok) {
            alert('Inscription réussie !');
        } else {
            alert(`Erreur : ${data.error}`);
        }
    } catch (error) {
        console.error('Erreur lors de la requête :', error);
        alert('Erreur de connexion au serveur.');
    }
});


