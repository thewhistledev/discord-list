// Error events do not bubble; capture them so dynamically inserted images work too.
document.addEventListener("error", function (event) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  if (image.hasAttribute("data-image-hide-on-error")) {
    image.hidden = true;
  } else if (image.dataset.imageFallback) {
    const fallback = image.dataset.imageFallback;
    delete image.dataset.imageFallback;
    image.src = fallback;
  }
}, true);

function setCardBackground(element) {
  if (element.dataset.background) {
    element.style.backgroundImage = `url(${JSON.stringify(element.dataset.background)})`;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-background]").forEach(setCardBackground);
});

document.addEventListener("submit", function (event) {
  if (event.target.matches("form[data-prevent-submit]")) event.preventDefault();
});

document.addEventListener("click", function (event) {
  const element = event.target.closest("[data-action], #rdl-widget");
  if (!element) return;
  if (element.matches("a")) event.preventDefault();
  switch (element.dataset.action) {
    case "loginButton": return loginButton();
    case "voteLogin":
      Cookies.set("return", window.location.href, { expires: 7 });
      return loginButton();
    case "addVote": return addVote();
    case "addBot": return addBot();
    case "editBot": return editBot();
    case "importBot": return importBot();
    case "syncfun": return syncfun();
    case "sync": return sync();
    case "goback": return goback();
    case "earn":
      if (/^_\d+captcha\d+$/.test(element.dataset.earnFunction)) {
        return window[element.dataset.earnFunction]();
      }
      return;
  }
  if (element.id === "rdl-widget") {
    element.classList.add("scale-out-center");
    Swal.fire({ title: "Announcement", text: element.dataset.announcement,
      imageWidth: 100, imageHeight: 100, imageUrl: "/assets/img/announce.png",
      didRender: twemoji.parse }).then(() => element.classList.remove("scale-out-center"));
  }
});
