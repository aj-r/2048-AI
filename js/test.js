AssertError = function(message) {
  this.name = "AssertError";
  this.message = message || "";
};
AssertError.prototype = Error.prototype;

function assert(a, message) {
  if (!a) {
    message = "Assertion failed" + (message ? ": " + message : "");
    throw new AssertError(message);
  }
}

assert.true = function(a, message) {
  assert(a);
}

assert.false = function(a, message) {
  if (a) {
    message = "Assertion failed" + (message ? ": " + message : "");
    throw new AssertError(message);
  }
}

assert.equal = function(a, b, message) {
  if (a != b) {
    message = "Assertion failed (" + a + " = " + b +")" + (message ? ": " + message : "");
    throw new AssertError(message);
  }
}

assert.notEqual = function(a, b, message) {
  if (a == b) {
    message = "Assertion failed (" + a + " != " + b + ")" + (message ? ": " + message : "");
    throw new AssertError(message);
  }
}

assert.greater = function(a, b, message) {
  if (a <= b) {
    message = "Assertion failed (" + a + " > " + b + ")" + (message ? ": " + message : "");
    throw new AssertError(message);
  }
}

assert.greaterOrEqual = function(a, b, message) {
  if (a < b) {
    message = "Assertion failed (" + a + " >= " + b + ")" + (message ? ": " + message : "");
    throw new AssertError(message);
  }
}

assert.less = function(a, b, message) {
  if (a >= b) {
    message = "Assertion failed (" + a + " < " + b + ")" + (message ? ": " + message : "");
    throw new AssertError(message);
  }
}

assert.lessOrEqual = function(a, b, message) {
  if (a > b) {
    message = "Assertion failed (" + a + " <= " + b + ")" + (message ? ": " + message : "");
    throw new AssertError(message);
  }
}

Test = {

  runTests: function(tests) {
    for (var i in tests) {
      var result = this.runTest(i, tests[i]);
    }
  },

  runTest: function(name, test) {
    var result;
    try {
      test();
      result = { success: true, message: "Success" };
    } catch (e) {
      result = {
        success: false,
        message: (e.name == "AssertError" ? e.message: e.stack)
      };
    }
    this.reportResult(name, result);
  },

  reportResult: function(name, result) {
    var row = document.createElement("div");
    row.className = "row";
    var cell1 = document.createElement("div");
    cell1.className = "col1";
    cell1.innerText = name;
    var cell2 = document.createElement("div");
    cell2.className = "col2 " + (result.success ? "success" : "fail");
    cell2.innerText = result.message;
    row.appendChild(cell1);
    row.appendChild(cell2);
    var tables = document.getElementsByClassName("table");
    if (tables.length) {
      tables[0].appendChild(row);
    }

    if (result.success) {
      console.info(name + ": " + result.message);
    } else {
      console.error(name + ": " + result.message);
    }
  }
};