import Button42 from "../components/42button.js";
import auth from "../services/auth.js";
import pong42 from "../services/pong42.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const showErrorMessage = (message) => {
  console.log("Error message ---:", message);
  const errorDiv = document.getElementById("error-msg");
  errorDiv.innerHTML = message;
  errorDiv.classList.remove("d-none");
  errorDiv.classList.add("animate__animated", "animate__shakeX");

  // Remove animation classes after animation ends
  errorDiv.addEventListener("animationend", () => {
    errorDiv.classList.remove("animate__animated", "animate__shakeX");
  });
};

//initialisation de l'interface
const UIinit = () => {
  //clean le ui avant de le recharger
  document.getElementById("ft-42login-button").innerHTML = "";
  //ajout du bouton 42
  const button42 = new Button42("S'inscrire avec 42");
  button42.render(document.getElementById("ft-42login-button"));
};

const returnResult = (state, message) => {
  return { state, message };
};
//fonction qui check les données du formulaire
const checkDataFromForm = (data) => {
  if (data.password !== data.passwordConfirm) {
    console.log("Les mots de passe ne correspondent pas");
    return returnResult(false, "Les mots de passe ne correspondent pas");
  }

  if (data.password.length < 8) {
    console.log("Mot de passe trop court");
    return returnResult(
      false,
      "Le mot de passe doit contenir au moins 8 caractères"
    );
  }

  if (emailPattern.test(data.email) === false) {
    console.log("Email invalide");
    return returnResult(false, "Adresse email invalide");
  }

  if (data.username.length < 3) {
    console.log("Nom d'utilisateur trop court");
    return returnResult(
      false,
      "Le nom d'utilisateur doit contenir au moins 3 caractères"
    );
  }
  return returnResult(true, "Les données sont valides");
};

const singupHandler = async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);
  const result = checkDataFromForm(data);
  if (result.state) {
    try {
      await auth.registerUser(data);
    } catch (error) {
      console.error("Error registering user:", error);
      showErrorMessage(error.message);
    }
  } else {
    console.log("Error :" + result.message);
    showErrorMessage(result.message);
  }
};

const init = () => {
  if (auth.authenticated) {
    changePage(pong42.getCurrentPage() || "home");
  }
  UIinit();
  document
    .getElementById("signupForm")
    .addEventListener("submit", singupHandler);
};

export { init };
