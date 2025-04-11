import Button42 from "../components/42button.js";
import auth from "../services/auth.js";
import pong42 from "../services/pong42.js";
import { validateField } from "../utils/Form.js";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const showErrorMessage = (message) => {
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
  // Validation des mots de passe (inchangée)...

  // Email validation
  const validateEmail = validateField("email", data.email);
  if (validateEmail.isValid === false) {
    return returnResult(validateEmail.isValid, validateEmail.message);
  }

  // First name validation
  const validateFirstName = validateField("civil", data.first_name);
  if (validateFirstName.isValid === false) {
    return returnResult(validateFirstName.isValid, validateFirstName.message);
  }

  // Last name validation
  const validateLastName = validateField("civil", data.last_name);
  if (validateLastName.isValid === false) {
    return returnResult(validateLastName.isValid, validateLastName.message);
  }

  // Username validation (déjà correct)
  const validateUsername = validateField("username", data.username);
  if (validateUsername.isValid === false) {
    return returnResult(validateUsername.isValid, validateUsername.message);
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
