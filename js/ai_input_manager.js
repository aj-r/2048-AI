function AIInputManager() {
  this.events = {};
  this.listen();
}

AIMode = { RNG: 0, PRIORITY: 1, ALGORITHM: 2, SMART: 3 };
AISpeed = { FULL: 0, FAST: 1, SLOW: 2 };
TileGenerator = { RANDOM: 0, EVIL: 1 };

AIInputManager.prototype.runningAI = false;
AIInputManager.prototype.mode = AIMode.SMART;
AIInputManager.prototype.speed = AISpeed.FAST;
AIInputManager.prototype.tileGenerator = TileGenerator.RANDOM;
AIInputManager.prototype.fastMoveTime = 200; // milliseconds
AIInputManager.prototype.slowMoveTime = 750; // milliseconds
AIInputManager.prototype.game = null;
AIInputManager.prototype.stats = [];
AIInputManager.prototype.stateBufferSize = 10;
AIInputManager.prototype.prevStates = [];

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
  this.bindButtonPress(".pause-button", this.pauseOrResume);
  this.bindButtonPress(".smart-ai-button", function() { this.setAIMode(AIMode.SMART); });
  this.bindButtonPress(".algorithm-ai-button", function() { this.setAIMode(AIMode.ALGORITHM); });
  this.bindButtonPress(".priority-ai-button", function() { this.setAIMode(AIMode.PRIORITY); });
  this.bindButtonPress(".rng-ai-button", function() { this.setAIMode(AIMode.RNG); });
  this.bindButtonPress(".full-speed-button", function() { this.setAISpeed(AISpeed.FULL); });
  this.bindButtonPress(".fast-speed-button", function() { this.setAISpeed(AISpeed.FAST); });
  this.bindButtonPress(".slow-speed-button", function() { this.setAISpeed(AISpeed.SLOW); });
  this.bindButtonPress(".random-tile-button", function() { this.setTileGenerator(TileGenerator.RANDOM); });
  this.bindButtonPress(".evil-tile-button", function() { this.setTileGenerator(TileGenerator.EVIL); });
  
  this.bindButtonPress(".copy-button", this.copyStates);
  this.bindButtonPress(".load-button", this.loadState);

  // Start running the AI.
  // Wait for a specified time interval before making each move
  // so the AI is watchable
  this.startAI();
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
  html = "";
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
  this.mode = mode;
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

AIInputManager.prototype.setAISpeed = function(speed) {
  this.speed = speed;
  // Restart the AI at the new speed.
  if (this.runningAI) {
    this.stopAI();
    this.startAI();
  }
}

AIInputManager.prototype.setTileGenerator = function(gen) {
  this.tileGenerator = gen;
  switch (gen) {
    case TileGenerator.RANDOM:
      this.game.generateTile = this.game.addRandomTile;
      break;
    case TileGenerator.EVIL:
      this.game.generateTile = this.game.addEvilTile;
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
    this.stopAI();
    setTimeout(function() {
      self.emit("restart");
      self.startAI();
    }, 5000);
  } else if (this.speed == AISpeed.FULL && this.runningAI) {
    // Call nextMove continuously when in full speed.
    // Call this function again on a timeout so the browser
    // has a chance to update the screen
    setTimeout(this.nextMove.bind(this));
  }
  if (this.prevStates.length >= this.stateBufferSize) {
    this.prevStates.shift();
  }
  this.prevStates.push(this.game.grid.serialize());
}

AIInputManager.prototype.startAI = function() {
  this.runningAI = true;
  switch (this.speed) {
    case AISpeed.FULL:
      setTimeout(this.nextMove.bind(this));
      break;
    case AISpeed.FAST:
      this.aiID = setInterval(this.nextMove.bind(this), this.fastMoveTime);
      break;
    case AISpeed.SLOW:
      this.aiID = setInterval(this.nextMove.bind(this), this.slowMoveTime);
      break;
  }
}

AIInputManager.prototype.stopAI = function() {
  this.runningAI = false;
  clearInterval(this.aiID);
}


AIInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

AIInputManager.prototype.pauseOrResume = function (event) {
  event.preventDefault();
  if (this.game.over) {
    return;
  }
  if (this.runningAI) {
    this.stopAI();
    $(".pause-button").text("Resume");
  } else {
    this.startAI();
    $(".pause-button").text("Pause");
  }
};

AIInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};

AIInputManager.prototype.copyStates = function (event) {
  event.preventDefault();
  var html = "";
  for (var i = 0; i < this.prevStates.length; i++) {
    html += JSON.stringify(this.prevStates[i]) + "<br /><br />";
  }
  $(".copy-json").html(html);
};
AIInputManager.prototype.loadState = function (event) {
  var stateJSON = $(".state-input").val();
  var state = JSON.parse(stateJSON);
  this.game.grid  = new Grid(state.size, state.cells);
  // Update the actuator
  this.game.actuate();
}

AIInputManager.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector);
  if (!button)
    return;
  button.addEventListener("click", fn.bind(this));
  button.addEventListener(this.eventTouchend, fn.bind(this));
};
