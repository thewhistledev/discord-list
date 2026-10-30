const assert = require("assert");
const http = require("http");
const path = require("path");
const vm = require("vm");
const express = require("express");
const helmet = require("helmet");
const { nonceMiddleware, helmetOptions } = require("../src/server/mw/security");

const app = express();
app.use(nonceMiddleware);
app.use(helmet(helmetOptions));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../src/views"));

const hostile = '</script><script>pwn()</script>"`\'${pwn()}\u2028';
const user = { username: hostile, tag: hostile, id: "123", discriminator: "0001",
  avatarUrl: () => "/assets/img/bot/profile.svg" };
const bot = { id: "123", username: hostile, tag: hostile, avatarURL: "https://cdn.discordapp.com/avatar.png",
  bg: "", short: "short", invite: "https://discord.com", opted_coins: true, added: false,
  topgg: true, servers: 2, status: "online", owner: ["test"], owners: ["123"], card: {},
  desc: "", mainowner: "123", lib: "" };
const locals = { user, bot, path: hostile, theme: "discord",
  req: { locale: "en", language: "English", originalUrl: "/bots", query: {} },
  __: (key) => key, preferEmoji: "openmoji", isCopy: () => true, alerts: "logout",
  bots: [], servers: [], notjoined: false, rovel: { approx: () => "2" }, process };
app.get("/policy", (req, res) => res.send("ok"));
app.get("/render/:name", (req, res) => res.render(req.params.name, {
  ...locals,
  user: req.query.guest ? null : user,
  bot: { ...bot, owners: ["123"], opted_coins: !req.query.noCoins },
}));

function get(port, url) {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path: url }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on("error", reject);
  });
}
function nonce(response) {
  return response.headers["content-security-policy"].match(/script-src[^;]*'nonce-([^']+)'/)[1];
}

const server = app.listen(0, "127.0.0.1", async () => {
  try {
    const port = server.address().port;
    const first = await get(port, "/policy");
    const second = await get(port, "/policy");
    const csp = first.headers["content-security-policy"];
    assert.notStrictEqual(nonce(first), nonce(second));
    assert(!csp.includes("'unsafe-inline'") && !csp.includes("'unsafe-eval'"));
    assert(csp.includes(`style-src 'self' 'nonce-${nonce(first)}'`));
    assert(!/img-src[^;]*\shttps:(?:\s|;)/.test(csp));
    assert(csp.includes("script-src-attr 'none'"));

    for (const name of ["404", "comments", "index", "bots", "dashboard", "newdashboard",
      "dashboard-importbot", "dashboard-newbot", "editbot", "botpage", "botvote", "status"]) {
      const response = await get(port, `/render/${name}`);
      assert.strictEqual(response.status, 200, name);
      assert.strictEqual(response.headers["cache-control"], "private, no-store");
      assert(!response.body.includes('<script>pwn()</script>'), name);
      assert(!/\son(?:click|error|submit)\s*=/.test(response.body), name);
      const scripts = response.body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
      for (const [, attrs, body] of scripts) {
        if (/\bsrc=|application\/ld\+json/.test(attrs)) continue;
        assert(attrs.includes(`nonce="${nonce(response)}"`), name);
        new vm.Script(body, { filename: name + ".ejs" });
      }
    }
    for (const route of ["/render/botvote?guest=1", "/render/botvote?guest=1&noCoins=1", "/render/index?guest=1"]) {
      const response = await get(port, route);
      assert.strictEqual(response.status, 200, route);
      assert(!/\son(?:click|error|submit)\s*=/.test(response.body), route);
      for (const [, attrs, body] of response.body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc=|application\/ld\+json/.test(attrs)) continue;
        assert(attrs.includes(`nonce="${nonce(response)}"`), route);
        new vm.Script(body);
      }
    }
    console.log("CSP nonce, directives, template rendering and script escaping checks passed");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
