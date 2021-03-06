import {EngineControl, EngineStack} from './public/js/utility/Engine.mjs';
import {EventStack, Event} from './public/js/utility/Events.mjs';
import {DETECTION_MAP, Color, Component, centarious_roll, entanglion_roll, Action, MAX_DETECTION_RATE, ENGINE_DECK_INIT_SIZE} from './public/js/utility/Util.mjs';
import {ONE, ZERO, CLOCKWISE_TABLE, transition} from './public/js/utility/Planet.mjs';

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

class Player {
    constructor(color) {
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
    component_map: [], // Components arranged according to the CLOCKWISE_TABLE of planets
    components_left: 8,
    ground_defenses: true,
    orbital_defenses: true,
    mechanic_deck: []
}

function send_locations() {
    io.emit('locations', JSON.stringify(game.blue_player.planet), JSON.stringify(game.red_player.planet));
}

function send_components() {
    io.emit('components', game.component_map, game.blue_player.components, game.red_player.components);
}

function send_curr_player() {
    io.emit('current_player', game.curr_player);
}

function send_engine_decks() {
    io.emit('engine_decks', game.blue_player.engine_deck, game.red_player.engine_deck);
}

function send_engine_control() {
    io.emit('engine_control', game.engine_control.get());
}

function won() {
    return game.components_left === 0;
}

function game_over() {
    return won() || game.detection_rate === MAX_DETECTION_RATE;
}

function change_player() {
    game.curr_player = game.curr_player === Color.Blue ? Color.Red : Color.Blue;
}

function curr_player() {
    return game.curr_player === Color.Blue ? game.blue_player : game.red_player;
}

function get_other_player() {
    return game.curr_player === Color.Blue ? game.red_player : game.blue_player;
}

function set_detection_rate(new_rate) {
    game.detection_rate = new_rate;
    io.emit('detection_rate', game.detection_rate);
}

function draw_card() {
    var drawn = game.engine_stack.draw();
    if (game.engine_stack.empty()) {
        game.engine_stack.reset(game.blue_player.engine_deck, game.red_player.engine_deck, game.mechanic_deck);
    }

    if (drawn === EngineCard.PROBE) {
        var roll = DETECTION_MAP[entanglion_roll() - 1];
        if (roll < 4) {
            set_detection_rate(game.detection_rate + 1);
        }

        io.emit('probe_drawn');
        return draw_card();
    } else {
        return drawn;
    }
}

function set_locations(one, two) {
    game.blue_player.planet = one;
    game.red_player.planet = two;

    send_locations();
}

function distribute_components() {
    function shuffle(array) {
        var ctr = array.length, temp, index;
      
      // While there are elements in the array
        while (ctr > 0) {
      // Pick a random index
            index = Math.floor(Math.random() * ctr);
      // Decrease ctr by 1
            ctr--;
      // And swap the last element with it
            temp = array[ctr];
            array[ctr] = array[index];
            array[index] = temp;
        }

        return array;
    }

    for(var comp in Component)
      game.component_map.push(comp);


    shuffle(game.component_map);
    
    send_components();
}

function determine_first_player() {
    var blue = 0;
    var red = 0;

    while (blue === red) {
        blue = entanglion_roll();
        red = entanglion_roll();

        if (blue > red) {
            game.curr_player = Color.Blue;
        } else {
            game.curr_player = Color.Red;
        }
    }

    send_curr_player();
}

function determine_init_locations() {
    var blue = centarious_roll();
    var red = centarious_roll();

    var one = blue === 0 ? ZERO : ONE;
    var two = red === 0 ? ZERO : ONE;

    set_locations(one, two);
}

function draw_engine_cards() {
    for (let i = 0; i < ENGINE_DECK_INIT_SIZE; ++i) {
        game.blue_player.engine_deck.push(game.engine_stack.draw());
        game.red_player.engine_deck.push(game.engine_stack.draw());
    }
    
    send_engine_decks();
}

function start() {
    distribute_components();
    determine_first_player();
    determine_init_locations();
    draw_engine_cards();
    set_detection_rate(game.detection_rate);
}

function navigate(engine_card) {
    if (engine_card === EngineCard.SWAP) {
        if (curr_player().planet === OMGEGA0) {
            set_locations(OMEGA3, OMEGA3);
        } else if (curr_player().planet === OMEGA3) {
            set_locations(OMEGA0, OMEGA0);
        } else {
            set_locations(game.red_player.planet, game.blue_player.planet);
        }
    } else {
        var dest = transition(game.curr_player, game.blue_player.planet, game.red_player.planet, engine_card);
        if (dest.galaxy === Galaxy.Entanglion) {
            set_locations(dest, dest);
        } else {
            if (game.curr_player === Color.BLUE) {
                set_locations(dest, game.red_player.planet);
            } else {
                set_locations(game.blue_player.planet, dest);
            }
        }
    }

    if (game.blue_player.planet.galaxy === Galaxy.Entanglion) {
        if (game.orbital_defenses) {
            orbital_defense(); // TODO
            // Detection rate may have increased if an event was triggered abvoe
            if (game_over()) return;
        } else {
            game.orbital_defenses = true;
        }
    }

    game.engine_control.push(engine_card);
    if (game.engine_control.full()) {
        game.engine_control.reset();
        new_event(); // TODO
    }

    send_engine_control();

    // Detection rate may have increased if an event was triggered above
    if (game_over()) return;

    // If we are not in the middle of a Mechanic event
    if (game.mechanic_deck.length === 0) exchange(engine_card);
}

function exchange(card) {
    var curr = curr_player();
    curr.splice(curr.indexOf(card));
    var drawn = draw_card();
    curr.engine_deck.push(drawn);
    send_engine_decks();
}

function retrieve() {
    if (game.ground_defenses) {
        var roll = DETECTION_MAP[entanglion_roll() - 1];
        if (roll <= DETECTION_MAP[game.detection_rate - 1]) {
            set_detection_rate(game.detection_rate + 1);
            return;
        }
    } else {
        game.ground_defenses = true;
    }

    var comp_index = CLOCKWISE_TABLE.indexOf(curr_player().planet);
    var comp = game.component_map[comp_index];
    game.component_map[comp_index] = null;
    curr_player().components.push(comp);
    send_components();
}

function event(ev) {
    switch (ev) {
        case Event.Bennet:
            if (game.blue_player.components.length === 0 && game.red_player.components.length === 0) {
                return;
            }

            curr_player().emit('ask_bennet', get_other_player().components.length !== 0);
            // TODO

        case Event.Heisenberg:
            var roll = entanglion_roll();
            var planet = CLOCKWISE_TABLE[roll - 1];
            set_locations(planet, planet);
            break;
        case Event.Tunnel:
            change_player();
            //TODO
        case Event.Mechanic:
            for (var i = 0; i < 3; ++i) {
                game.mechanic_deck.push(draw_card());
                if (game_over()) {
                    return;
                }
            }
            change_player();
            io.emit('mechanic_deck', game.mechanic_deck);
            break;
        case Event.Error:
            set_detection_rate(6); // 6 corresponds to the "first 4"
            break;
        case Event.Schrodinger:
            set_detection_rate(game.detection_rate + 1);
            break;
        case Event.Spooky:
            if (curr_player().components.length === 0) {
                return;
            }

            var unoccupied_planets = [];
            for (var i = 0; i < 8; ++i) {
                if (game.component_map[i] != null) {
                    unoccupied_planets.push(CLOCKWISE_TABLE[i]);
                }
            }

            var index = entanglion_roll % unoccupied_planets.length;
            var planet = unoccupied_planets[index];
            var comp = curr_player().components[Math.floor(Math.random() * curr_player().components.length)];
            game.component_map[index] = comp;
            send_components();
            break;
        case Event.Collapse:
            set_detection_rate(Math.max(game.detection_rate - 2, 1))
    } 
}

var nb_players = 0;

io.on('connection', function(socket) {
    if (nb_players === 0) {
        game.blue_player = new Player(Color.Blue);
        socket.emit('color', Color.Blue);
        nb_players++;
    } else if (nb_players === 1) {
        game.red_player = new Player(Color.Red);
        socket.emit('color', Color.Red);
        nb_players++;
        start();
    } else {
        socket.emit('denied', "The game is full !");
    }

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
        send_curr_player();
    });

    socket.on('mechanic', function(cont, card) {
        if (cont) {
            game.orbital_defenses = false;
            game.mechanic_deck = game.mechanic_deck.filter(elem => elem !== card);
            navigate(card);
            io.emit('mechanic_deck', game.mechanic_deck);
            
            if (game.mechanic_deck.length < 2) {
                game.mechanic_deck = [];
                io.emit('mechanic_done');
            } else {
                change_player();
                send_curr_player();
            }

        } else {
            game.mechanic_deck = [];
            io.emit('mechanic_done');
        }
    });

    socket.on('tunnel', function(orbital) {
        if (oribtal) {
            game.orbital_defenses = false;
        } else {
            game.ground_defenses = false;
        }
        //TODO
    });

    socket.on('disconnect', function () {
      nb_players--;
      throw new Error("A player disconnected, game over"); // Could be improved to let the player rejoin
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
