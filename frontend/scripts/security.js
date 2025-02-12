// Handle switch toggle event
import pong42 from "../services/pong42.js";
import AlertInfo from "../components/alertInfo.js";

const cleanup = () => {
  // Remove event listeners from buttons
  const qrButton = document.getElementById("btn-qr-code");
  const switchElement = document.querySelector('[role="switch"]');
  const form = document.querySelector("form");
  const tabTriggers = document.querySelectorAll('[data-bs-toggle="tab"]');

  // Clean up existing listeners
  if (qrButton) {
    qrButton.replaceWith(qrButton.cloneNode(true));
  }
  if (switchElement) {
    switchElement.replaceWith(switchElement.cloneNode(true));
  }
  if (form) {
    form.replaceWith(form.cloneNode(true));
  }
  tabTriggers.forEach((trigger) => {
    trigger.replaceWith(trigger.cloneNode(true));
  });
};

const initBtQrCode = () => {
  const button = document.getElementById("btn-qr-code");
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    console.log("QR Code button clicked");
    const divQrCode = document.getElementById("div-qr-code");
    const qrCode = document.getElementById("qr-code-img-secu");
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
  const divDDauth = document.getElementById("double-auth-info");
  const switchElement = document.querySelector('[role="switch"]');
  switchElement.checked = pong42.player.two_factor;

  if (switchElement.checked) divDDauth.classList.remove("d-none");
  else divDDauth.classList.add("d-none");
  switchElement.addEventListener("change", (event) => {
    const isChecked = event.target.checked;
    if (isChecked) divDDauth.classList.remove("d-none");
    else divDDauth.classList.add("d-none");
    updateTwoFactor(isChecked);
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
  // Get both tabs and content
  const tabTriggers = document.querySelectorAll('[data-bs-toggle="tab"]');
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabTriggers.forEach((trigger) => {
    trigger.addEventListener("shown.bs.tab", (event) => {
      const targetId = event.target.getAttribute("data-bs-target");
      console.log("Tab shown:", targetId);

      // Manually toggle content visibility
      tabPanes.forEach((pane) => {
        if (pane.id === targetId.replace("#", "")) {
          pane.classList.add("show", "active");
        } else {
          pane.classList.remove("show", "active");
        }
      });
    });

    // Create and initialize Bootstrap tab
    const bsTab = new bootstrap.Tab(trigger);

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      bsTab.show();
    });
  });
};

const init = () => {
  cleanup();

  initForm();
  initBtQrCode();
  initTab();
  initSwitch();
};

export { init };
