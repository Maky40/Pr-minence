// Handle switch toggle event
import pong42 from "../services/pong42.js";

const initBtQrCode = () => {
  const button = document.getElementById("btn-qr-code");
  button.addEventListener("click", () => {
    const divQrCode = document.getElementById("qr-code");
    divQrCode.classList.toggle("d-none");
  });
};

const initSwitch = () => {
  const divDDauth = document.getElementById("double-auth");
  const switchElement = document.querySelector('[role="switch"]');
  switchElement.addEventListener("change", (event) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      divDDauth.classList.remove("d-none");
    } else {
      divDDauth.classList.add("d-none");
    }
  });

  // Example with Bootstrap Form Switch
  const toggleSwitch = document.querySelector(
    '.form-check-input[type="checkbox"]'
  );
  toggleSwitch.addEventListener("change", (event) => {
    const isChecked = event.target.checked;
    // Handle switch state
  });
};

const submitForm = (form, event) => {
  event.preventDefault();
  const current_password = form.querySelector("#password").value;
  const new_password = form.querySelector("#password").value;
  const confirm_password = form.querySelector("#passwordConfirm").value;
  const data = { current_password, new_password, confirm_password };
  if (new_password !== confirm_password) {
    alert("Passwords do not match");
    return;
  }
  pong42.player.updatePassword(data);
};

const initForm = () => {
  const form = document.querySelector("form");
  form.addEventListener("submit", (e) => submitForm(form, e));
};

const init = () => {
  initSwitch();
  initBtQrCode();
  initForm();
};

export { init };
