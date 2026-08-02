import { initToolsShell, applyToolsChrome, t } from "./tools-shell.js";

function render() {
  applyToolsChrome("hub");
  const title = document.querySelector("#tools-title");
  const lede = document.querySelector("#tools-lede");
  if (title) title.textContent = t("toolsHubTitle");
  if (lede) lede.textContent = t("toolsHubLede");
  document.title = `${t("toolsHubTitle")} — Hangar Match`;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
}

initToolsShell({
  active: "hub",
  titleKey: "toolsHubTitle",
  ledeKey: "toolsHubLede",
  onLangChange: render,
});
render();
