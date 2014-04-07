function AIInputManager() {
  this.events = {};

  if (window.navigator.msPointerEnabled) {
    //Internet Explorer 10 style
    this.eventTouchstart    = "MSPointerDown";
    this.eventTouchmove     = "MSPointerMove";
    this.eventTouchend      = "MSPointerUp";
  } else {
    this.eventTouchstart    = "touchstart";
    this.eventTouchmove     = "touchmove";
    this.eventTouchend      = "touchend";
  }

  this.listen();
}

AIMode = { SMART: 0, RNG: 1 };

AIInputManager.prototype.mode = AIMode.RNG;
AIInputManager.prototype.moveTime = 150; // milliseconds
AIInputManager.prototype.game = null;

AIInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

AIInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

AIInputManager.prototype.listen = function () {
  var self = this;

  // Respond to button presses
  this.bindButtonPress(".retry-button", this.restart);
  this.bindButtonPress(".keep-playing-button", this.keepPlaying);

  // Start running the AI.
  // Wait for a specified time interval before making each move
  // so the AI is watchable
  this.aiID = setInterval(this.nextMove.bind(this), this.moveTime);
};

AIInputManager.prototype.nextMove = function() {
  var self = this;
  var move = 0;
  switch (this.mode) {
    case AIMode.SMART:
      move = this.nextMoveSmart();
      break;
    case AIMode.RNG:
      move = this.nextMoveRNG();
      break;
  }
  this.emit("move", move);

  // If the game is over, do a longer wait and start again.
  if (this.game.over) {
    clearInterval(this.aiID);
    setTimeout(function() {
      self.emit("restart");
      self.aiID = setInterval(self.nextMove.bind(self), self.moveTime);
      }, 5000);
  }
}

AIInputManager.prototype.nextMoveRNG = function() {
  // Move in a random direction.
  // TODO: determine which directions are valid
  return Math.floor(Math.random() * 4);
}

AIInputManager.prototype.nextMoveSmart = function() {
  // Determine the best move given the current game state
  // Use a couple of stragtegies:
  // 1. Goals:
  //   - Determine the main goal given the current board state
  //     (e.g. if the highest number is 64, build it up to 128)
  //   - Determine sub-goals that must happen to achieve that goal
  // 2. Planning ahead
  //   - in some cases, the AI should plan ahead a certain number of
  //     moves to determine the effect of each possible move it can make.
  //     If it sees that a certain move will put the board in a bad state
  //     (i.e. forced to push the wrong direction), then it will avoid that
  //     move. Alternatively, if it sees a sequence of moves that will 
  //     accomplish a goal, it will do those moves.
  var move = 0;
  return move;
}

AIInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

AIInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};

AIInputManager.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector);
  button.addEventListener("click", fn.bind(this));
  button.addEventListener(this.eventTouchend, fn.bind(this));
};
