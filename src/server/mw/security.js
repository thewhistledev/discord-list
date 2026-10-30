const crypto = require("crypto");

function nonceMiddleware(req, res, next) {
  res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
  // A cached rendered page would reuse its script nonce across visitors.
  const render = res.render;
  res.render = function (...args) {
    res.set("Cache-Control", "private, no-store");
    return render.apply(this, args);
  };
  // These helpers serialize values safely inside nonce-authorized scripts.
  res.locals.scriptJson = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) =>
    "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0")
  );
  res.locals.scriptString = (value) => res.locals.scriptJson(String(value)).slice(1, -1)
    .replace(/['`$]/g, (character) => "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0"));
  next();
}

const helmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      scriptSrc: ["'self'", (req, res) => "'nonce-" + res.locals.cspNonce + "'",
        "https://twemoji.maxcdn.com", "https://cdn.jsdelivr.net", "https://unpkg.com",
        "https://cdnjs.cloudflare.com", "https://www.googletagmanager.com", "https://arc.io",
        "https://yonle.github.io"],
      imgSrc: ["'self'", "data:", "https://cdn.discordapp.com",
        "https://ui-avatars.com", "https://twemoji.maxcdn.com", "https://demos.joypixels.com",
        "https://gitcdn.xyz", "https://media.giphy.com"],
      styleSrc: ["'self'", (req, res) => "'nonce-" + res.locals.cspNonce + "'",
        "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.discordapp.com", "https://pro.fontawesome.com",
        "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://pro.fontawesome.com", "https://cdn.jsdelivr.net"],
    },
  },
};

module.exports = { nonceMiddleware, helmetOptions };
