/*
GoalType = { UNDEFINED: -1, BUILD: 0, SHIFT: 1, MOVE: 2 };

Goal = function() {
};
Goal.prototype = {
  type: GoalType.UNDEFINED
};
*/
SmartAI = function(game) {
  this.game = game;
};

SmartAI.prototype.nextMove = function() {
  // Determine the best move given the current game state
  // Plan ahead a certain number of moves and analyze the grid quality
  // for each possible move it can make. The AI will choose the move that
  // is least likely to put the grid in a worse state.
  /*var goal = this.determineGoal(this.game.grid);
  // Keep looking at sub-goals until we find a sub-goal that is a simple movement.
  while (goal.type != GoalType.MOVE) {
    goal = this.determineSubGoal(this.game.grid, goal);
  }
  
  if (goal.directions) {
    // Move in the most optimal legal direction.
    for (var i = 0; i < goal.directions.length; i++) {
      if (this.game.moveAvailable(goal.directions[i])) {
        return goal.directions[i];
      }
    }
  }*/
  
  // Plan ahead a few moves in every direction and analyze the board state.
  // Go for moves that put the board in a better state.
  var originalQuality = this.gridQuality(this.game.grid);
  var results = this.planAhead(this.game.grid, 3, originalQuality);
  // Choose the best result
  var bestResult = this.chooseBestMove(results, originalQuality);
  
  return bestResult.direction;
};

// Plans a few moves ahead and returns the worst-case scenario grid quality,
// and the probability of that occurring, for each move
SmartAI.prototype.planAhead = function(grid, numMoves, originalQuality) {
  var results = new Array(4);
  
  // Try each move and see what happens.
  for (var d = 0; d < 4; d++) {
    // Work with a clone so we don't modify the original grid.
    var testGrid = grid.clone();
    var testGame = new GameController(testGrid);
    var moved = testGame.moveTiles(d);
    if (!moved) {
      results[d] = null;
      continue;
    }
    // Spawn a 2 in all possible locations.
    var result = {
      quality: -1,    // Quality of the grid
      probability: 1, // Probability that the above quality will happen
      qualityLoss: 0, // Sum of the amount that the quality will have decreased multiplied by the probability of the decrease
      direction: d
    };
    var availableCells = testGrid.availableCells();
    for (var i = 0; i < availableCells.length; i++) {
      // Assume that the worst spawn location is adjacent to an existing tile,
      // and only test cells that are adjacent to a tile.
      var hasAdjacentTile = false;
      for (var d2 = 0; d2 < 4; d2++) {
        var vector = testGame.getVector(d2);
        var adjCell = {
          x: availableCells[i].x + vector.x,
          y: availableCells[i].y + vector.y,
        };
        if (testGrid.cellContent(adjCell)) {
          hasAdjacentTile = true;
          break;
        }
      }
      if (!hasAdjacentTile)
        continue;

      var testGrid2 = testGrid.clone();
      var testGame2 = new GameController(testGrid2);
      testGame2.addTile(new Tile(availableCells[i], 2));
      var tileResult;
      if (numMoves > 1) {
        var subResults = this.planAhead(testGrid2, numMoves - 1, originalQuality);
        // Choose the sub-result with the BEST quality since that is the direction
        // that would be chosen in that case.
        tileResult = this.chooseBestMove(subResults, originalQuality);
      } else {
        var tileQuality = this.gridQuality(testGrid2);
        tileResult = {
          quality: tileQuality,
          probability: 1,
          qualityLoss: Math.max(originalQuality - tileQuality, 0)
        };
      }
      // Compare this grid quality to the grid quality for other tile spawn locations.
      // Take the WORST quality since we have no control over where the tile spawns,
      // so assume the worst case scenario.
      if (result.quality == -1 || tileResult.quality < result.quality) {
        result.quality = tileResult.quality;
        result.probability = tileResult.probability / availableCells.length;
      } else if (tileResult.quality == result.quality) {
        result.probability += tileResult.probability / availableCells.length;
      }
      result.qualityLoss += tileResult.qualityLoss / availableCells.length;
    }
    results[d] = result;
  }
  return results;
}

SmartAI.prototype.chooseBestMove = function(results, originalQuality) {
  // Choose the move with the least probability of decreasing the grid quality.
  // If multiple results have the same probability, choose the one with the best quality.
  var bestResult;
  for (i = 0; i < results.length; i++) {  
    if (results[i] == null)
      continue;
    if (!bestResult ||
        results[i].qualityLoss < bestResult.qualityLoss ||
        (results[i].qualityLoss == bestResult.qualityLoss && results[i].quality > bestResult.quality) ||
        (results[i].qualityLoss == bestResult.qualityLoss && results[i].quality == bestResult.quality && results[i].probability < bestResult.probability)) {
      bestResult = results[i];
    }
  }
  if (!bestResult) {
    bestResult = {
      quality: -1,
      probability: 1,
      qualityLoss: originalQuality,
      direction: 0
    };
  }
  return bestResult;
}

// Gets the quality of the current state of the grid
SmartAI.prototype.gridQuality = function(grid) {
  // Grid quality is determined using a number of factors:
  // - monoticity: the amount to which a row/column is constantly increasing or decreasing
  // - number of empty cells
  // - ease of accomplishing the next goal
  var monoticity = this.getMonoticity(grid);
  var emptyScore = this.getEmptyCellScore(grid);
  var goalEase = this.getNextGoalEase(grid, monoticity.bestMonoticity);
  return monoticity.monoticity + emptyScore + goalEase;
}

// Determine the monoticity score for the given grid.
SmartAI.prototype.getMonoticity = function(grid) {
  /* How monoticity is determined:
  * Monoticity score is calculated for each row and column in the
  * increasing and decreasing directions. The higher of the two scores
  * (increasing/decreasing) is used as the score for each row/column.
  * The total monoticity score is the sum of the scores for each row/column.
  *
  * For each row/column:
  *   score += current_tile_value
  *   -> If a tile goes againt the monoticity direction:
  *      score -= max(current_tile_value, prev_tile_value)
  *
  * Examples:
  *   2    128    64   32
  *  +2     +0   +64  +32
   
  *  32     64   128    2
  * +32    +64  +128 -126
  *
  *   128   64   32   32
  *  +128  +64  +32  +32
  * 
  *   ___  128   64   32
  *    +0   +0  +64  +32
  *
  *   128   64   32  ___
  *  +128  +64  +32
  *
  *   ___  128  ___  ___
  *         +0
  *
  *   ___  128  ___  32
  *       +128 -128 +32
  */
  var monoticity = 0;
  var bestMonoticity = { score: -1, index: -1, row: false, increasing: false };
  var traversals = this.game.buildTraversals({x: -1, y:  0});
  var prevValue = -1;
  var incScore = 0, decScore = 0;
  
  var scoreCell = function(cell) {
    var tile = grid.cellContent(cell);
    var tileValue = (tile ? tile.value : 0);
    incScore += tileValue;
    if (tileValue <= prevValue || prevValue == -1) {
      decScore += tileValue;
      if (tileValue < prevValue) {
        incScore -= prevValue;
      }
    }
    prevValue = tileValue;
  };
  
  // Traverse each column
  traversals.x.forEach(function (x) {
    prevValue = -1;
    incScore = 0;
    decScore = 0;
    traversals.y.forEach(function (y) {
      scoreCell({ x: x, y: y });
    });
    var score = Math.max(incScore, decScore);
    monoticity += score;
    if (score > bestMonoticity.score) {
      bestMonoticity = { score: score, index: x, row: false, increasing: (incScore >= decScore) };
    }
  });
  // Traverse each row
  traversals.y.forEach(function (y) {
    prevValue = -1;
    incScore = 0;
    decScore = 0;
    traversals.x.forEach(function (x) {
      scoreCell({ x: x, y: y });
    });
    var score = Math.max(incScore, decScore);
    monoticity += score;
    if (score > bestMonoticity.score) {
      bestMonoticity = { score: score, index: y, row: true, increasing: (incScore >= decScore) };
    }
  });
  return { monoticity: monoticity, bestMonoticity: bestMonoticity };
}

// Determine the empty cell score for the given grid.
SmartAI.prototype.getEmptyCellScore = function(grid) {
  // Look at number of empty cells. More empty cells = better.
  var availableCells = grid.availableCells();
  var emptyCellWeight = 32;
  return availableCells.length * emptyCellWeight;
}

// Determine the next goal for the given grid and get the ease with which the
// goal can be accomplished.
SmartAI.prototype.getNextGoalEase = function(grid, bestMonoticity) {
  // - A "goal" is to double a tile value (e.g. build a 64 up to a 128)
  // - The "goal ease" is a score that indiates how easy it is to accomplish the goal.
  // - The goal ease should have a low value for difficult goals, and it should
  //   have a steep slope around the difficult goal region to more clearly
  //   differentiate between hard goals.
  // - An impossible goal has a goal ease of 0.

  // To determine the main goal, look at the row/column with the best monoticity.
  // The target cell is:
  // - The first cell that goes against the monoticity direction (looking in increasing monoticity order),
  // - The first cell whose value is more than double the previous cell value, or
  // - The first cell in the row/column
  // TODO: if the target tile is blocked off (has a lower value that the
  // adjacent tile in the next row/column), then adjust goals accordingly
  var goalEase = 0;
  var cell = { x: 0, y: 0 };
  var vector = { x: 0, y: 0 };
  var normalVector = { x: 0, y: 0 };
  if (bestMonoticity.row) {
    cell.y = bestMonoticity.index;
    if (bestMonoticity.increasing) {
      cell.x = grid.size - 1;
      vector.x = -1;
    } else {
      vector.x = 1;
    }
    normalVector.x = (bestMonoticity.index < grid.size / 2 ? 1 : -1);
  } else {
    cell.x = bestMonoticity.index;
    if (bestMonoticity.increasing) {
      cell.y = grid.size - 1;
      vector.y = -1;
    } else {
      vector.y = 1;
    }
    normalVector.y = (bestMonoticity.index < grid.size / 2 ? 1 : -1);
  }

  var goalEase = this.getBestGoalEase(grid, cell, vector, normalVector);
  /*
  // Now look at the next row / column and look at the goal eases
  var bestTile = grid.cellContent(bestCell);
  if (!bestTile) {
    // The target tile is an empty tile.
    // No further calculation required
    return goalEase;
  }
  var goalValue = bestTile.value;
  if (normalVector.y == 0) {
    // Next column
    cell.x = bestCell.x + normalVector.x;
  }
  cell.y = bestCell.y + normalVector.y;*/
  return goalEase;
}

// Fast log2 for integers
SmartAI.prototype.log2 = function(x) {
  var c = 0;
  while (x > 1) {
    x >>= 1; // Right shift (divide by 2)
    c++;
  }
  return c;
}

// Gets the best goal ease for a given row or column
SmartAI.prototype.getBestGoalEase = function(grid, startCell, vector, normalVector) {
  // Look at the goal ease for each cell in the row/column
  // and choose the easiest.
  var bestEase = -1;
  var cell = { x: startCell.x, y: startCell.y };
  for (var i = 0; i < grid.size; i++) {
    var ease = this.getGoalEase(grid, cell, normalVector);
    bestEase = Math.max(ease, bestEase);
    cell.x += vector.x;
    cell.y += vector.y;
  }
  return bestEase;
}

// Gets the ease with which a goal can be accomplished.
SmartAI.prototype.getGoalEase = function(grid, goalCell, normalVector) {
  var easeWeight = 1024;
  var goalTile = grid.cellContent(goalCell);
  var goalTileValue = (goalTile ? goalTile.value : 0);
  if (goalTileValue == 0) {
    // Empty cell - easy to fill
    return easeWeight;
  }
  var requiredSpace = this.log2(goalTileValue);
  // Determine the space available to build up the tile
  var space = grid.size * (
    (normalVector.x > 0 ? grid.size - goalCell.x - 1 : (normalVector.x < 0 ? goalCell.x : 0)) +
    (normalVector.y > 0 ? grid.size - goalCell.y - 1 : (normalVector.y < 0 ? goalCell.y : 0)));
  if (space < requiredSpace) {
    // Impossible goal
    return 0;
  }

  // Now look at the next row / column and look at the goal eases
  var startCell = {
    x: goalCell.x + normalVector.x,
    y: goalCell.y + normalVector.y
  };
  var startTile = grid.cellContent(startCell);
  var startTileValue = (startTile ? startTile.value : 0);
  if (startTileValue > tileValue) {
    // If the start tile value is greater than the goal tile value, then the goal is impossible.
    return 0;
  } else if (startTileValue == tileValue) {
    // Easy goal - we've already achieved it!
    return easeWeight;
  }
  // Traverse the rest of the row/column (in both directions), find the easiest goal, then compare it to the base ease.
  var bestSubgoalEase = -1;
  for (var i = -1; i <= 1; i += 2) {
    var vector = { x: normalVector.y * i, y: normalVector.x * i };
    var cell = { x: startCell.x + vector.x, y: startCell.y + vector.y };
    while (grid.withinBounds(cell)) {
      var tile = grid.cellContent(cell);
      var tileValue = (tile ? tile.value : 0);
      if (tileValue >= goalTileValue) {
        // This tile is larger than the goal tile, so it will interfere with the goal.
        // Decrease the available space.
        space -= (vector.x > 0 ? grid.size - cell.x : 0)
               + (vector.x < 0 ? cell.x + 1 : 0)
               + (vector.y > 0 ? grid.size - cell.y : 0)
               + (vector.y < 0 ? cell.y + 1 : 0);
        break;
      }
      var subgoalEase = this.getGoalEase(grid, cell, normalVector);
      bestSubgoalEase = Math.max(subgoalEase, bestSubgoalEase);
      cell.x += vector.x;
      cell.y += vector.y;
    }
  }

  // Determine the ease using an arbitrary function.
  var baseEase = easeWeight * (1 - 1 / (space - requiredSpace + 2));
  return Math.max(0, Math.min(bestSubgoalEase, baseEase));
}
/*
// Determine the main (highest level) goal to accomplish for the current grid
SmartAI.prototype.determineGoal = function(grid) {
  // 2. Goals:
  //   - Determine the main goal given the current board state
  //     (e.g. if the highest number is 64, build it up to 128)
  //   - Determine sub-goals that must happen to achieve that goal

  var goal = new Goal();
  // Find the highest tile on the board.
  var maxValue = 0;
  var maxCells = [];
  grid.eachCell(function(x, y, tile) {
    if (tile && tile.value >= maxValue) {
      if (tile.value > maxValue) {
        maxCells = [];
        maxValue = tile.value;
      }
      maxCells.push({x: x, y: y});
    }
  });
  var maxCell;
  if (maxCells.length == 1) {
    maxCell = maxCells[0];
  } else {
    // If there are multiple cells with the highest value, choose the one closest to the corner
    var minDist = grid.size;
    for (var i = 0; i < maxCells.length; i++) {
      dist = Math.min(maxCells[i].x, grid.size - maxCells[i].x - 1)
           + Math.min(maxCells[i].y, grid.size - maxCells[i].y - 1);
      if (dist < minDist) {
        minDist = dist;
        maxCell = maxCells[i];
      }
    }
  }
  // Find the distance of the max tile from the corner
  dist = Math.min(maxCell.x, grid.size - maxCell.x - 1)
       + Math.min(maxCell.y, grid.size - maxCell.y - 1);
  if (dist == 0) {
    // Great! The tile is in a corner.
    // In this case, the goal is to double that tile's value.
    goal.type = GoalType.BUILD;
    goal.cell = maxCell;
    goal.value = maxValue * 2;
    return goal;
  }
  // Shoot, the highest tile is not in the corner.
  // Find a way to get it in the corner.
  if (dist == 1) {
    if (maxValue <= 512) {
      // Option 1: build up the corner tile to have the same value as the max tile
      // This is only reasonable if the tile value is not greater than 512.
      goal.type = GoalType.BUILD;
      goal.cell = { x: (maxCell.x < grid.size / 2 ? 0 : grid.size - 1),
                    y: (maxCell.y < grid.size / 2 ? 0 : grid.size - 1) };
      goal.value = maxValue;
      return goal;
    }
    // Things are looking pretty rough.
    // Option 2: do some fancy moves to try and shift the max tile into a different corner.
    // This is only reasonable if there are enough open cells.
    var availableCells = game.grid.availableCells();
    if (availableCells.length > 4) {
      // TODO: if the target cell is empty, just move! (don't shift)
      goal.type = GoalType.SHIFT;
      goal.fromCell = maxCell;
      if (maxCell.x == 0 || maxCell.x == game.size - 1) {
        goal.cell = { x: maxCell.x,
                      y: (maxCell.y < grid.size / 2 ? grid.size - 1: 0) };
      } else {
        goal.cell = { x: (maxCell.x < grid.size / 2 ? grid.size - 1 : 0),
                      y: maxCell.y };
      }
      return goal;
    }
    // Now things are looking REALLY rough.
    // Option 3: Our best bet is to try and build up the max tile to clear up room on the board.
    goal.type = GoalType.BUILD;
    goal.cell = maxCell;
    goal.value = maxValue * 2;
    return goal;
  }
  // dist > 1
  // The cell is really far from a corner, which sucks.
  // Do some fancy moves to try and shift the max tile into a different corner.
  var availableCells = game.grid.availableCells();
  goal.type = GoalType.SHIFT;
  goal.fromCell = maxCell;
  goal.cell = { x: maxCell.x,
                y: (maxCell.y < grid.size / 2 ? grid.size - 1: 0) };
  return goal;
};

// Determine the sub-goal required to achieve the current goal.
SmartAI.prototype.determineSubGoal = function(grid, goal) {
  var subgoal = new Goal();
  if (goal.type == GoalType.BUILD) {
    var tile = grid.cellContent(goal.cell);
    
    if (!tile) {
      // Cell is empty. This is easy; just move a tile into that cell.
      goal.type = GoalType.MOVE;
      vector = { x: goal.cell.x - grid.size / 2,
                 y: goal.cell.y - grid.size / 2 };
      goal.directions = this.getDirections(vector);
      return goal;
    }
    
    // See if any adjacent cells have equal value.
    var adjacentCells = new Array(4);
    for (i = 0; i < 4; i++) {
      var vector = this.game.getVector(i);
      var adjCell = {x: goal.cell.x + vector.x, y: goal.cell.y + vector.y };
      var adjTile = grid.cellContent(adjCell);
      if (adjTile && adjTile.value == tile.value) {
        // Adjacent tiles with equal value. Combine the tiles.
        // Flip the vector and use that as the direction.
        vector.x = -vector.x;
        vector.y = -vector.y;
        goal.type = GoalType.MOVE;
        goal.directions = this.getDirections(vector);
        return goal;
      }
    }
    
    // No tiles to combine. Start building an adjacent tile.
    
  } else if (goal.type == GoalType.MOVE) {
  }
  return subgoal;
};

// Gets the direction of movement priority order given a vector
SmartAI.prototype.getDirections = function(vector) {
  directions = [0, 3, -1, -1];
  if (vector.x > 0) {
    directions[0] = 2;
  }
  if (vector.y > 0) {
    directions[1] = 1;
  }
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    var temp = directions[0];
    directions[0] = directions[1];
    directions[1] = temp;
  }
  directions[2] = (directions[1] + 2) % 4;
  directions[3] = (directions[0] + 2) % 4;

  */