var beforeUnloadMessage = null;

var resizeEvent = new Event('paneresize');
Split(['#input', '#editor', '#graph'], {
  sizes: [25, 25, 50],
  onDragEnd: function () {
    var svgOutput = document.getElementById('svg_output');
    if (svgOutput != null) {
      svgOutput.dispatchEvent(resizeEvent);
    }
  }
});

var graph_type = document.querySelector('#graph_type');
var graph_area = document.querySelector('#graph_area');
var first_line_checkbox = document.querySelector('#first_line_checkbox');
var use_labels_checkbox = document.querySelector('#use_labels_checkbox');

var editor = ace.edit('editor');
editor.getSession().setMode('ace/mode/dot');

var parser = new DOMParser();
var worker;
var result;

function generateViz() {
  var data = graph_area.value;
  var directed = graph_type.value === 'digraph';
  var ignore_the_first_line = first_line_checkbox.checked;
  var use_labels = use_labels_checkbox.checked;
  var sep = directed ? ' -> ' : ' -- ';

  var lines = data.split('\n');
  var result = [];

  for (var i in lines) {
    if (ignore_the_first_line) {
      ignore_the_first_line = false;
      continue;
    }
    var line = lines[i].trim();
    if (line.length < 1 || line[0] === '#') {
      continue;
    }
    var elems = line.split(/\s+/);
    if (elems.length < 2) return;
    var from = elems[0];
    var to = elems[1];
    var edge = from + sep + to;
    if (use_labels && elems.length > 2) edge += '[label="' + elems[2] + '"]';
    result.push(edge);
  }

  result = result.map((line) => '  ' + line + ';\n');

  var vizData = (directed ? 'digraph' : 'graph') + ' {\n' + result.join('') + '}';
  editor.getSession().getDocument().setValue(vizData);
}

function updateGraph() {
  if (worker) {
    worker.terminate();
  }

  document.querySelector('#output').classList.add('working');
  document.querySelector('#output').classList.remove('error');

  worker = new Worker('./worker.js');

  worker.onmessage = function (e) {
    document.querySelector('#output').classList.remove('working');
    document.querySelector('#output').classList.remove('error');

    result = e.data;

    updateOutput();
  };

  worker.onerror = function (e) {
    document.querySelector('#output').classList.remove('working');
    document.querySelector('#output').classList.add('error');

    var message =
      e.message === undefined
        ? 'An error occurred while processing the graph input.'
        : e.message;

    var error = document.querySelector('#error');
    while (error.firstChild) {
      error.removeChild(error.firstChild);
    }

    document
      .querySelector('#error')
      .appendChild(document.createTextNode(message));

    console.error(e);
    e.preventDefault();
  };

  var params = {
    src: editor.getSession().getDocument().getValue(),
    options: {
      engine: document.querySelector('#engine select').value,
      format: document.querySelector('#format select').value
    }
  };

  // Instead of asking for png-image-element directly, which we can't do in a worker,
  // ask for SVG and convert when updating the output.

  if (params.options.format == 'png-image-element') {
    params.options.format = 'svg';
  }

  worker.postMessage(params);
}

function updateOutput() {
  var graph = document.querySelector('#output');

  var svg = graph.querySelector('svg');
  if (svg) {
    graph.removeChild(svg);
  }

  var text = graph.querySelector('#text');
  if (text) {
    graph.removeChild(text);
  }

  var img = graph.querySelector('img');
  if (img) {
    graph.removeChild(img);
  }

  if (!result) {
    return;
  }

  if (
    document.querySelector('#format select').value == 'svg' &&
    !document.querySelector('#raw input').checked
  ) {
    var svg = parser.parseFromString(result, 'image/svg+xml').documentElement;
    svg.id = 'svg_output';
    graph.appendChild(svg);

    panZoom = svgPanZoom(svg, {
      zoomEnabled: true,
      controlIconsEnabled: true,
      fit: true,
      center: true,
      minZoom: 0.1
    });

    svg.addEventListener(
      'paneresize',
      function (e) {
        panZoom.resize();
      },
      false
    );
    window.addEventListener('resize', function (e) {
      panZoom.resize();
    });
  } else if (
    document.querySelector('#format select').value == 'png-image-element'
  ) {
    var image = Viz.svgXmlToPngImageElement(result);
    graph.appendChild(image);
  } else {
    var text = document.createElement('div');
    text.id = 'text';
    text.appendChild(document.createTextNode(result));
    graph.appendChild(text);
  }
}

graph_area.addEventListener(
  'input',
  function () {
    generateViz();
    beforeUnloadMessage = 'Your changes will not be saved.';
  },
  false
);

graph_type.addEventListener('input', generateViz, false);
first_line_checkbox.addEventListener('input', generateViz, false);
use_labels_checkbox.addEventListener('input', generateViz, false);

editor.on('change', function () {
  updateGraph();
  beforeUnloadMessage = 'Your changes will not be saved.';
});

window.addEventListener('beforeunload', function (e) {
  return beforeUnloadMessage;
});

document
  .querySelector('#engine select')
  .addEventListener('change', function () {
    updateGraph();
  });

document
  .querySelector('#format select')
  .addEventListener('change', function () {
    if (document.querySelector('#format select').value === 'svg') {
      document.querySelector('#raw').classList.remove('disabled');
      document.querySelector('#raw input').disabled = false;
    } else {
      document.querySelector('#raw').classList.add('disabled');
      document.querySelector('#raw input').disabled = true;
    }

    updateGraph();
  });

document.querySelector('#raw input').addEventListener('change', function () {
  updateOutput();
});

updateGraph();
