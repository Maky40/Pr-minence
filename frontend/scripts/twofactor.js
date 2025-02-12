import auth from "../services/auth.js";

const initbtn = async () => {
  const btn = document.getElementById("twoFactorButton");
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const code = document.getElementById("code").value;
    await auth.login2FA(code);
  });
};

const init = () => {
  initbtn();
};

export { init };
