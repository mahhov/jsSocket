const WebSocket = require('ws');
const Rand = require('./rand');
const Inputs = require('./Inputs');
const ColonyBot = require('../ColonyBot');

const CLIENT_STATE_ENUM = {
	LOBBY: 0,
	IN_GAME: 1,
};

const KEY_ENUM = {
	LEFT: 'a',
	RIGHT: 'd',
	DOWN: 's',
	UP: 'w',
	MOUSE: 'mouse',
};

class ClientInterface {
	constructor(clientIndex) {
		this.id = Rand.randId();
		this.name = Rand.randName();
		this.state = CLIENT_STATE_ENUM.LOBBY;
		this.game = null;
		this.clientIndex = clientIndex;
		this.tile = clientIndex + 1;
	}

	isAlive() {
		return false;
	}

	send(message) {
	}

	static sendToClients(clients, message) {
		clients.forEach(client => client.send(message));
	}

	iter() {
	}

	play() {
	}
}

class PlayerClientInterface extends ClientInterface {
	constructor(clientIndex, netClient) {
		super(clientIndex);
		this.inputs = new Inputs();
		this.netClient = netClient;
	}

	isAlive() {
		return this.netClient.readyState !== WebSocket.CLOSED;
	}

	send(message) {
		PlayerClientInterface.sendToNetClient(this.netClient, message);
	}

	static sendToNetClient(netClient, message) {
		if (netClient.readyState !== WebSocket.OPEN)
			return;
		let stringMessage = JSON.stringify(message);
		netClient.send(stringMessage);
	}

	iter() {
		this.inputs.applyAccumulatedInputs();
	}

	play() {
		let mouseInput = this.getMouseInput();
		if (!mouseInput)
			return;
		let tile = this.game.board.tiles[mouseInput.x][mouseInput.y];
		if (tile === this.tile)
			this.game.select(mouseInput);
		else if (tile === 0)
			this.game.applyMove(this.game.selected, mouseInput, this.tile);
	}

	getMouseInput() {
		if (!this.inputs.isTriggered(KEY_ENUM.MOUSE))
			return;
		let x = Math.floor(this.game.board.width * this.inputs.mouse.x);
		let y = Math.floor(this.game.board.height * this.inputs.mouse.y);
		if (this.game.board.inBounds(x, y))
			return {x, y};
	}
}

class BotClientInterface extends ClientInterface {
	constructor(clientIndex) {
		super(clientIndex);
	}

	isAlive() {
		return this.game.clients.length === 2;
	}

	send(message) {
		// this.colonyBot = this.colonyBot || new ColonyBot(message.data.tiles, this.tile); // todo y not working?
		this.colonyBot = new ColonyBot(message.data.tiles, this.tile);
	}

	play() {
		let play = this.colonyBot.play();
		console.log("=== play", JSON.stringify(play))
		if (play)
			this.game.applyMove(play.move.from, play.move.to, this.tile);
	}
}

module.exports = {CLIENT_STATE_ENUM, ClientInterface, PlayerClientInterface, BotClientInterface};