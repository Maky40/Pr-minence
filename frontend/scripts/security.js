// Handle switch toggle event

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

const init = () => {
  initSwitch();
  initBtQrCode();
  const form = document.querySelector("form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const password = form.querySelector('input[type="password"]').value;
    if (password === "admin") {
      form.submit();
    } else {
      alert("Incorrect password");
    }
  });
};

export { init };
