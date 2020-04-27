import { planetScaleEnum as scaleEnum } from './scaling.mjs';

var config = {
	type: Phaser.AUTO,
	parent: 'phaser-example',
	width: 1200,
	height: 700,
	physics: {
		default: 'arcade',
		arcade: {
			debug: false,
			gravity: { y: 10 }
		}
	},
	scene: {
		preload: preload,
		create: create,
		update: update
	}
};


var game = new Phaser.Game(config);
var quantumCompSet = [];
var image = [];



function preload() {
    this.load.image('bg', 'assets/BOARD1.png');
    this.load.atlas('quantumComp','assets/quantum_components/sprites.png','assets/quantum_components/quantumSprites.json');
    
}

function create() {

  this.socket = io();
  

  var bg = this.add.image(0,0,'bg').setOrigin(0,0);
  bg.displayWidth = config.width;
  bg.displayHeight = config.height;

  // creating and adding quantum components 

  this.socket.on('init', (quantumComponentIndices)=>{
    console.log("yep");
    
    // creating and adding quantum components 
    quantumCompSet = this.textures.get('quantumComp').getFrameNames();
    let planets = quantumComponentIndices;
    for (var i = 0; i < 8; i++) {
      let currentValues = planets[i]
      image[i] = this.add.sprite(currentValues[0] * config.width, currentValues[1] * config.height, 'quantumComp', quantumCompSet[i]).setInteractive().setOrigin(0, 0);
      image[i].displayWidth = (97 / 1600) * config.width;
      image[i].displayHeight = (103 / 1200) * config.height;
    }
  })
  

  


  /** 
  this.input.on('gameobjectover', function(pointer, draggableObject){
    draggableObject.setTint(0x000022);
  })

  this.input.on('gameobjectout',function(pointer,draggableObject){
    draggableObject.clearTint();
  })

  this.input.on('dragstart',function(pointer, draggableObject){
    draggableObject.setTint(0x110000);
  })

  this.input.on('drag',function(pointer, draggableObject, dragX, dragY){
    draggableObject.x = dragX;
    draggableObject.y = dragY;
  })

  this.input.on('dragend',function(pointer, draggableObject){
    draggableObject.clearTint();
  })
 
  var self = this;
  this.socket = io();
  this.background = this.add.image(0, 0, "background");
  this.background.setOrigin(0, 0);


  this.socket.on('component_map', function(data) {
    console.log('component map received');
    var map = new Map(JSON.parse(data));
    for([key,value] of map)
      console.log(key + '=' + value);
  });
  this.socket.on('init_player', function(data) {
    console.log('inti player done it is: ', data);
  });
  this.socket.on('locations', function(data1, data2) {
    console.log('locations: ', data1, data2);
  });
  this.socket.on('engine_decks', function(one, two) {
    console.log('engine deck 1: ', one, '\n engine deck 2: ', two);
  });
  */ 
}

function update() {

}
