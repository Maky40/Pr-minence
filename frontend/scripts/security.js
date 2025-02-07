// Handle switch toggle event
import pong42 from "../services/pong42.js";
import AlertInfo from "../components/alertInfo.js";

const initBtQrCode = () => {
  const button = document.getElementById("btn-qr-code");
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    const divQrCode = document.getElementById("qr-code");
    const qrCode = document.getElementById("qr-code-img");
    const myQrcode = await pong42.player.getQRCode();
    divQrCode.classList.toggle("d-none");
    qrCode.src = myQrcode.qr_code;
  });
};

const updateTwoFactor = async (isChecked) => {
  const data = {
    activate_2fa: isChecked,
  };
  await pong42.player.changeTwoFactor(data);
};

const initSwitch = () => {
  const divDDauth = document.getElementById("double-auth");
  const switchElement = document.querySelector('[role="switch"]');
  switchElement.checked = pong42.player.two_factor;
  if (switchElement.checked) divDDauth.classList.remove("d-none");
  switchElement.addEventListener("change", (event) => {
    const isChecked = event.target.checked;
    if (isChecked) divDDauth.classList.remove("d-none");
    else divDDauth.classList.add("d-none");
    updateTwoFactor(isChecked);
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

const submitForm = async (form, event) => {
  event.preventDefault();
  const current_password = form.querySelector("#current_password").value;
  const new_password = form.querySelector("#new_password").value;
  const confirm_password = form.querySelector("#confirm_password").value;
  const data = { current_password, new_password, confirm_password };
  const alertContainer = document.getElementById("alert-container");
  if (new_password !== confirm_password) {
    const alert = new AlertInfo(
      "Les mots de passe ne correspondent pas",
      "danger"
    );
    alert.render(alertContainer);
    return;
  }
  try {
    await pong42.player.updatePassword(data);
    current_password.value = "";
    new_password.value = "";
    confirm_password.value = "";
    const alert = new AlertInfo("Mot de passe mis à jour", "success");
    alert.render(alertContainer);
  } catch (error) {
    const alert = new AlertInfo(error.message, "danger");
    alert.render(alertContainer);
  }
};

const initForm = () => {
  const form = document.querySelector("form");
  form.addEventListener("submit", (e) => submitForm(form, e));
};

const initTab = () => {
  const tabList = document.querySelectorAll(".nav-link");
  tabList.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const tabId = event.target.getAttribute("aria-controls");
      const tabPanel = document.getElementById(tabId);
      const tabPanelList = document.querySelectorAll('[role="tabpanel"]');
      tabPanelList.forEach((panel) => {
        panel.classList.remove("show active");
      });
      tabPanel.classList.add("show active");
    });
  });
};

const init = () => {
  initSwitch();
  initBtQrCode();
  initForm();
};

export { init };
