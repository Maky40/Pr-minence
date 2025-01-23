import Button42 from '../components/42button.js';

//initialisation de l'interface
const UIinit = () => {
    //clean le ui avant de le recharger
    document.getElementById('ft-42login-button').innerHTML = '';
    //ajout du bouton 42
    const button42 = new Button42("S'inscrire avec 42");
    document.getElementById('ft-42login-button').appendChild(button42.render());
}

const init = () => {
    UIinit();
    const form = document.getElementById('signup-form');
    if (!form) {
        console.error('Formulaire non trouvé');
        return;
    }
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        console.log(data);
    });
}

export { init };