import Button42 from "../components/42button.js";
import auth from "../services/auth.js";

const UIinit = () => {
  //clean le ui avant de le recharger
  document.getElementById("ft-42login-button").innerHTML = "";
  //ajout du bouton 42
  const button42 = new Button42("connexion avec 42");
  button42.render(document.getElementById('ft-42login-button'));
};

const loading = (loading) => {
  if (loading) {
    document.getElementById("login-waiting").classList.remove("d-none");
    document.getElementById("loginButton").classList.add("d-none");
  } else {
    document.getElementById("login-waiting").classList.add("d-none");
    document.getElementById("loginButton").classList.remove("d-none");
  }
};

const showErrorMessage = (message) => {
  const errorDiv = document.getElementById("error-msg");
  errorDiv.innerText = message;
  errorDiv.classList.remove("d-none");
  errorDiv.classList.add("animate__animated", "animate__shakeX");

  // Remove animation classes after animation ends
  errorDiv.addEventListener("animationend", () => {
    errorDiv.classList.remove("animate__animated", "animate__shakeX");
  });
};

const loginFormHandler = async (data) => {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    loading(true);
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      await auth.login(username, password);

      changePage("#home");
      console.log("Login successful");
    } catch (error) {
      showErrorMessage("Erreur de connexion. Vérifiez vos identifiants.");
    } finally {
      loading(false);
    }
  });
};

const init = () => {
  UIinit();
  loginFormHandler();
};

export { init };
