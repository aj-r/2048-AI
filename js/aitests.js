(function() {
  var ai = new SmartAI();

  var unitTests = {

    testLog2: function () {
      assert.equal(0, ai.log2(0));
      assert.equal(0, ai.log2(1));
      assert.equal(1, ai.log2(2));
      assert.equal(3, ai.log2(8));
      assert.equal(8, ai.log2(256));
      assert.equal(11, ai.log2(2048));
      assert.equal(13, ai.log2(8192));
    },
    
    testGoalEase_Basic: function() {
      // Do relative comparisons since exact output values may change as the AI is tuned.
      var grid1 = createGrid([
        0, 0, 0, 32,
        0, 0, 0, 16,
        0, 0, 0, 8,
        0, 0, 0, 4
      ]);
      var grid2 = createGrid([
        0, 0, 0, 64,
        0, 0, 0, 32,
        0, 0, 0, 16,
        0, 0, 0, 16
      ]);
      assert.greater(
        ai.getGoalEase(grid1, { x: 3, y: 1 }, { x: -1, y: 0 }),
        ai.getGoalEase(grid2, { x: 3, y: 1 }, { x: -1, y: 0 }),
        "Basic goal ease test 1 failed");
      assert.greater(
        ai.getGoalEase(grid1, { x: 3, y: 3 }, { x: -1, y: 0 }),
        ai.getGoalEase(grid2, { x: 3, y: 3 }, { x: -1, y: 0 }),
        "Basic goal ease test 2 failed");
      assert.greater(
        ai.getGoalEase(grid1, { x: 3, y: 2 }, { x: -1, y: 0 }),
        ai.getGoalEase(grid1, { x: 3, y: 1 }, { x: -1, y: 0 }),
        "Basic goal ease test 3 failed");
      assert.equal(
        ai.getGoalEase(grid2, { x: 3, y: 2 }, { x: -1, y: 0 }),
        ai.getGoalEase(grid2, { x: 3, y: 3 }, { x: -1, y: 0 }),
        "Basic goal ease test 4 failed");
      assert.equal(
        ai.getGoalEase(grid1, { x: 3, y: 1 }, { x: -1, y: 0 }),
        ai.getGoalEase(grid2, { x: 3, y: 2 }, { x: -1, y: 0 }),
        "Shifted goal ease test failed");
      grid1 = createGrid([
         0,   0,   0,   0,
         0,   2,   0,   0,
         0,   0,   0,   0,
        64, 128, 256, 256
      ]);
      grid2 = createGrid([
         0, 0, 0, 0,
         0, 0, 0, 0,
         0, 0, 2, 0,
         64, 128, 256, 256
      ]);
      assert.equal(
        ai.getGoalEase(grid1, { x: 0, y: 3 }, { x: 0, y: -1 }),
        ai.getGoalEase(grid2, { x: 0, y: 3 }, { x: 0, y: -1 }),
        "Random tile ease test failed");
    },

    testGoalEase_Zero: function() {
      var grid1 = createGrid([
        0, 0, 0, 32,
        0, 0, 0, 16,
        0, 0, 0, 8,
        0, 0, 0, 4
      ]);
      assert.equal(
        0,
        ai.getGoalEase(grid1, { x: 3, y: 2 }, { x: 1, y: 0 }),
        "Zero goal ease test failed");
    },
    
    testGoalEase_Intermediate: function() {
      var grid1 = createGrid([
        1024, 512, 256, 128,
           8,   8,   2,   2,
           2,   2,   0,   0,
           0,   0,   0,   0
      ]);
      var grid2 = createGrid([
        2048, 256, 128, 64,
           8,   8,   2,  2,
           2,   2,   0,  0,  
           0,   0,   0,  0
      ]);
      assert.equal(
        ai.getGoalEase(grid1, { x: 2, y: 1 }, { x: 0, y: 1 }),
        ai.getGoalEase(grid2, { x: 2, y: 1 }, { x: 0, y: 1 }),
        "Intermediate goal ease test 1 failed");
      assert.less(
        ai.getGoalEase(grid1, { x: 3, y: 0 }, { x: 0, y: 1 }),
        ai.getGoalEase(grid2, { x: 3, y: 0 }, { x: 0, y: 1 }),
        "Intermediate goal ease test 2 failed");
      grid1 = createGrid([
        1024, 512, 256, 128,
          16,  32,  32,  64,
           0,   0,   0,   0,
           0,   0,   0,   0
      ]);
      grid2 = createGrid([
        2048, 512, 256, 128,
           0,   0,   4,   8,
           0,   0,   0,   0,
           0,   0,   0,   0
      ]);
      assert.equal(
        ai.getGoalEase(grid1, { x: 3, y: 0 }, { x: 0, y: 1 }),
        ai.getGoalEase(grid2, { x: 3, y: 0 }, { x: 0, y: 1 }),
        "Intermediate goal ease test 3 failed");
    },

    testGoalEase_ReducedSpace: function() {
      var grid1 = createGrid([
        256, 64, 32, 16,
         16, 16,  8,  2,
          0,  0,  0,  0,
          0,  0,  0,  0
      ]);
      assert.greater(
        ai.getGoalEase(grid1, { x: 2, y: 0 }, { x: 0, y: 1 }),
        ai.getGoalEase(grid1, { x: 3, y: 0 }, { x: 0, y: 1 }),
        "Reduced space goal ease test 1 failed");
      grid1 = createGrid([
        1024, 512, 256, 128,
          32,   4,   2,   0,
           0,   0,   0,   0,
           0,   0,   0,   0
      ]);
      var grid2 = createGrid([
        1024, 512, 256, 128,
         128,   4,   2,   0,
           0,   0,   0,   0,
           0,   0,   0,   0
      ]);
      assert.greater(
        ai.getGoalEase(grid1, { x: 3, y: 0 }, { x: 0, y: 1 }),
        ai.getGoalEase(grid2, { x: 3, y: 0 }, { x: 0, y: 1 }),
        "Reduced space goal ease test 2 failed");
      grid1 = createGrid([
        256, 64, 32, 16,
          8,  8,  2,  2,
          0,  0,  0,  0,
          0,  0,  0,  0
      ]);
      grid2 = createGrid([
        1024, 32, 16, 8,
           8,  8,  2, 2,
           0,  0,  0, 0,
           0,  0,  0, 0
      ]);
      assert.greater(
        ai.getGoalEase(grid1, { x: 3, y: 0 }, { x: 0, y: 1 }),
        ai.getGoalEase(grid2, { x: 3, y: 0 }, { x: 0, y: 1 }),
        "Reduced space goal ease test 3 failed");
    }

  };

  function createGrid(values) {
    var gridSize = Math.floor(Math.sqrt(values.length));
    var grid = new Grid(gridSize);
    for (var x = 0; x < gridSize; x++) {
      for (var y = 0; y < gridSize; y++) {
        var value = values[y * gridSize + x];
        if (value) {
          grid.insertTile(new Tile({ x: x, y: y }, value));
        }
      }
    }
    return grid;
  }

  Test.runTests(unitTests);
})();