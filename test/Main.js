import {EngineControl, EngineStack, ENGINE_DECK_INIT_SIZE} from './Engine.mjs';
import { EventStack } from './Events.mjs';
import {Color, Component, centarious_roll, Action, MAX_DETECTION_RATE} from './Util.mjs';
import {ONE, ZERO, PLUS, MINUS, PSI_PLUS, PSI_MINUS, PHI_PLUS, PHI_MINUS, OMEGA0, OMEGA1, OMEGA2, OMEGA3, CLOCKWISE_TABLE} from './Planet.mjs';

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

class Player {
    constructor(socket, color) {
        this.socket = socket; // TODO is this useful ?
        this.color = color;
        this.engine_deck = [];
        this.event_deck = [];
        this.planet = null;
        this.components = [];
    }
}

var game = {
    blue_player: null,
    red_player: null,
    engine_control: new EngineControl(),
    detection_rate: 0,
    curr_player: null,
    engine_stack: new EngineStack(),
    event_stack: new EventStack(),
    component_map: new Map(),
    ground_defenses: true,
    orbital_defenses: true,
    mechanic_deck: []
}

var nb_players = 0;

function distribute_components() {
    var shuffled = [];
    Array.prototype.forEach.call(Component, comp => {
      shuffled.push(comp)
    });
    game.component_map.set(PSI_PLUS, shuffled[0]);
    game.component_map.set(PSI_MINUS, shuffled[1]);
    game.component_map.set(PHI_PLUS, shuffled[2]);
    game.component_map.set(PHI_MINUS, shuffled[3]);
    game.component_map.set(OMEGA0, shuffled[4]);
    game.component_map.set(OMEGA1, shuffled[5]);
    game.component_map.set(OMEGA2, shuffled[6]);
    game.component_map.set(OMEGA3, shuffled[7]);

    io.emit('component_map', game.component_map);
}

function determine_first_player() {
    var blue = 0;
    var red = 0;

    while (blue === red) {
        blue = centarious_roll();
        red = centarious_roll();

        if (blue > red) {
            game.curr_player = game.blue_player;
        } else {
            game.curr_player = game.red_player;
        }
    }

    io.emit('init_player');
    //call stack size exceeds when also emitting game.curr_player
}

function determine_init_locations() {
    var blue = centarious_roll();
    var red = centarious_roll();

    game.blue_player.planet = blue === 0 ? ZERO : ONE;
    game.red_player.planet = red === 0 ? ZERO : ONE;

    io.emit('locations', game.blue_player.planet, game.red_player.planet);
}

function draw_engine_cards() {
  //  for (let i = 0; i < ENGINE_DECK_INIT_SIZE; ++i) {
  //      game.blue_player.engine_deck.push(game.engine_stack.draw());
  //      game.red_player.engine_deck.push(game.engine_stack.draw());
  //  }
//TODO  Cannot read property 'cardStack' of undefined Engine.mjs when uncommented
    io.emit('engine_decks', game.blue_player.engine_deck, game.red_player.engine_deck);
}

function start() {
    distribute_components();
    determine_first_player();
    determine_init_locations();
    draw_engine_cards();
}

function won() {
    return game.component_map.size === 0;
}

function game_over() {
    return won() || game.detection_rate === MAX_DETECTION_RATE;
}

function change_player() {
    game.curr_player = game.curr_player === game.blue_player ? game.red_player : game.blue_player;
}

function navigate(arg) {
  return;
}

function exchange(arg) {
  return;
}

function retrieve() {
  return;
}

function event(arg) {
  return;
}


//TODO ON PLAYER DISCONNECT DECREMENT NB_PLAYERS
io.on('connection', function(socket) {
    if (nb_players === 0) {
        game.blue_player = new Player(socket, Color.Blue);
        nb_players++;
        return;
    } else if (nb_players === 2) {
        socket.emit('denied', "The game is full !");
        return;
    }
    game.red_player = new Player(socket, Color.Red);
    nb_players++;
    start();

    socket.on('action', function(action, arg) {
        switch (action) {
            case Action.Navigate: navigate(arg); break;
            case Action.Exchange: exchange(arg); break;
            case Action.Retrieve: retrieve(); break;
            case Action.Event: event(arg); break;
            default: socket.emit('action_error');
        }

        if (game_over()) {
            io.emit('game_over', won());
            throw new Error('Task failed successfully !');
        }

        change_player();
    });

    socket.on('mechanic', function(cont, card) {
        if (cont) {
            game.orbital_defenses = false;
            game.mechanic_deck = game.mechanic_deck.filter(elem => elem !== card);
            navigate(card);
            change_player();
            io.emit('mechanic_deck', game.mechanic_deck);

            if (game.mechanic_deck.length < 2) {
                game.mechanic_deck = [];
                io.emit('mechanic_done');
            }

        } else {
            game.mechanic_deck = [];
            io.emit('mechanic_done');
        }
    });
});

server.listen(6969, function(){
    console.log('listening');
});

/*
socket.emit('message', "this is a test"); //sending to sender-client only
socket.broadcast.emit('message', "this is a test"); //sending to all clients except sender
socket.broadcast.to('game').emit('message', 'nice game'); //sending to all clients in 'game' room(channel) except sender
socket.to('game').emit('message', 'enjoy the game'); //sending to sender client, only if they are in 'game' room(channel)
socket.broadcast.to(socketid).emit('message', 'for your eyes only'); //sending to individual socketid
io.emit('message', "this is a test"); //sending to all clients, include sender
io.in('game').emit('message', 'cool game'); //sending to all clients in 'game' room(channel), include sender
io.of('myNamespace').emit('message', 'gg'); //sending to all clients in namespace 'myNamespace', include sender
socket.emit(); //send to all connected clients
socket.broadcast.emit(); //send to all connected clients except the one that sent the message
socket.on(); //event listener, can be called on client to execute on server
io.sockets.socket(); //for emiting to specific clients
io.sockets.emit);( //send to all connected clients (same as socket.emit)
io.sockets.on() ; //initial connection from a client.
*/
