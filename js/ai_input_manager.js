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

AIMode = { RNG: 0, PRIORITY: 1, ALGORITHM: 2, SMART: 3 };

AIInputManager.prototype.mode = AIMode.SMART;
AIInputManager.prototype.moveTime = 100; // milliseconds
AIInputManager.prototype.game = null;
AIInputManager.prototype.stats = [];

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
  // Respond to button presses
  this.bindButtonPress(".retry-button", this.restart);

  // Start running the AI.
  // Wait for a specified time interval before making each move
  // so the AI is watchable
  this.aiID = setInterval(this.nextMove.bind(this), this.moveTime);
};

if (!Math.log2) {
  Math.log2 = function(x) {
    return Math.log(x) / Math.LN2;
  };
}

AIInputManager.prototype.updateStats = function() {
  // Find the highest number achieved.
  var self = this;
  var maxValue = 0;
  this.game.grid.eachCell(function(x, y, tile) {
    if (tile)
      maxValue = Math.max(tile.value, maxValue);
  });
  var index = Math.round(Math.log2(maxValue));
  while (index >= this.stats.length) {
    this.stats.push(0);
  }
  this.stats[index] += 1;
  var total = 0;
  for (var i = 0; i < this.stats.length; i++) {
    total += this.stats[i];
  }
  
  // Update the HTML
  var html = "<div class='stats-header'>Highest numbers:</div>";
  for (var i = 0; i < this.stats.length; i++) {
    var percentage = this.stats[i] / total * 100;
    // Round to 1 decimal place
    percentage = Math.round(percentage * 10) / 10;
    if (this.stats[i] > 0) {
      html += "<div class='stats-number'>" + Math.pow(2, i) + ":</div>";
      html += "<div class='stats-value'>" + this.stats[i] + " (" + percentage + "%)</div>";
    }
  }
  $(".stats-container").html(html);
}

AIInputManager.prototype.setAIMode = function(mode) {
  switch (mode) {
    case AIMode.RNG:
      this.ai = new RNGAI(this.game);
      break;
    case AIMode.PRIORITY:
      this.ai = new PriorityAI(this.game);
      break;
    case AIMode.ALGORITHM:
      this.ai = new AlgorithmAI(this.game);
      break;
    case AIMode.SMART:
      this.ai = new SmartAI(this.game);
      break;
  }
}

AIInputManager.prototype.nextMove = function() {
  var self = this;
  if (!this.ai)
    this.setAIMode(this.mode);
  var move = this.ai.nextMove();
  this.emit("move", move);

  // If the game is over, do a longer wait and start again.
  if (this.game.over) {
    // Update stats
    this.updateStats();
    // Wait a bit, then start a new game.
    clearInterval(this.aiID);
    setTimeout(function() {
      self.emit("restart");
      self.aiID = setInterval(self.nextMove.bind(self), self.moveTime);
      }, 5000);
  }
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
