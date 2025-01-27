import Button42 from "../components/42button.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const checkDataFromForm = (data) => {
  if (data.password !== data.passwordcheck) {
    console.log("Passwords don't match");
    return returnResult(false, "Passwords don't match");
  }

  if (data.password.length < 8) {
    console.log("Password too short");
    return returnResult(false, "Password too short");
  }

  if (emailPattern.test(data.email) === false) {
    console.log("Invalid email");
    return returnResult(false, "Invalid email");
  }

  if (data.username.length < 3) {
    console.log("Username too short");
    return returnResult(false, "Username too short");
  }
  return returnResult(true, "Data is valid");
};

const singupHandler = async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);
  const result = checkDataFromForm(data);
  if (result.state) {
    console.log(data);
  } else {
    console.log("Error :" + result.message);
  }
};

const init = () => {
  UIinit();
  document
    .getElementById("signupForm")
    .addEventListener("submit", singupHandler);
};

export { init };
