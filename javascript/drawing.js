function draw_rect(canvas, x, y, w, h, color, fill_color, fill_opacity) {
  var rect = canvas.createRectangle();
  rect.setLocationXY(x, y);
  rect.setSizeWH(w, h);

  var c = color;
  with (rect.getStroke()) {
    setColor(c);
  }

  if (typeof(fill_color) !== 'undefined') {
    fill_opacity = (typeof(fill_opacity) !== 'undefined' ? fill_opacity : 1.0);
    with (rect.getFill()) {
      setColor(fill_color);
      setOpacity(fill_opacity);
    }
  }
  canvas.addElement(rect);
  return rect;
}

function draw_horizental_line(canvas, x, y, len, color, dash_style) {
  draw_line(canvas, x, y, x + len, y, color, dash_style);
}

function draw_vertical_line(canvas, x, y, len, color, dash_style) {
  draw_line(canvas, x, y, x, y + len, color, dash_style);
}

function draw_line(canvas, x1, y1, x2, y2, color, dash_style) {
  dash_style = (typeof(dash_style) !== 'undefined' ? dash_style : jsgl.DashStyles.SOLID);
  var line = canvas.createLine();
  line.setStartPointXY(x1, y1);
  line.setEndPointXY(x2, y2);
  var c = color; // somehow in the with block, 'color' is changed to black
  with (line.getStroke()) {
    setColor(c);
    setDashStyle(dash_style);
  }
  canvas.addElement(line);
}

function draw_label(canvas, x, y, text) {
  var label = canvas.createLabel();
  label.setLocationXY(x, y);
  label.setText(text);
  label.setFontColor("#888888")
  canvas.addElement(label);
}
