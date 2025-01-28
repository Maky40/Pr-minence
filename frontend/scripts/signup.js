import Button42 from "../components/42button.js";
import auth from "../services/auth.js";

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
//fonction qui check les données du formulaire
const checkDataFromForm = (data) => {
  if (data.password !== data.passwordConfirm) {
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
    try {
      const response = await auth.registerUser(data);
      if (response.ok) {
        console.log("User registered");
      } else {
        console.log("Error registering user");
      }
    } catch (error) {
      console.error("Error registering user:", error);
    }
  } else {
    console.log("Error :" + result.message);
  }
};

//fonction pour previsualiser l'avatar
const avatarHandler = (event) => {
  const previewDiv = document.getElementById("avatarPreview");
  const previewImg = previewDiv.querySelector("img");
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewDiv.classList.remove("d-none");
    };

    reader.onerror = () => {
      console.error("Error reading file");
      previewDiv.classList.add("d-none");
    };

    reader.readAsDataURL(file);
  } else {
    previewDiv.classList.add("d-none");
  }
};

const init = () => {
  UIinit();
  document
    .getElementById("signupForm")
    .addEventListener("submit", singupHandler);
  document.getElementById("avatar").addEventListener("change", avatarHandler);
};

export { init };
