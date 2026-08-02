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

  const stamp = document.querySelector("#app-teaser-stamp");
  const teaserTitle = document.querySelector("#app-teaser-title");
  const text = document.querySelector("#app-teaser-text");
  const cta = document.querySelector("#app-teaser-cta");
  if (stamp) stamp.textContent = t("appTeaserStamp");
  if (teaserTitle) teaserTitle.textContent = t("appTeaserTitle");
  if (text) text.textContent = t("appTeaserText");
  if (cta) cta.textContent = t("appTeaserCta");
}

initToolsShell({
  active: "hub",
  titleKey: "toolsHubTitle",
  ledeKey: "toolsHubLede",
  onLangChange: render,
});
render();
