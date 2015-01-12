var CANDLE_NUM_IN_WINDOW = 100;
var REALIZED_TRADE_OPEN_COLOR = '#87CEFF';
var REALIZED_TRADE_CLOSE_COLOR = '#63B8FF';
var UNREALIZED_TRADE_OPEN_COLOR = '#cdcdcd';
var HORIZONTAL_LINE_NUM = 5;

var g_candles = [];
var g_trades = [];
var g_realized_trades = [];
var g_trade_open_times = {};
var g_trade_close_times = {};
var g_trade_loc = [];
var g_canvas = null;
var g_origin_x = 40;
var g_origin_y = 0;
var g_canvas_width = 1280;
var g_canvas_height = 600;
var g_candle_window_height = 450;
var g_space = 20;
var g_bar_space = 3;
var g_candle_begin_index = 0;
var g_cur_trade_index = 0;

var g_volume_origin_x = g_origin_x;
var g_volume_origin_y = g_origin_y + g_candle_window_height + g_space;
var g_volume_window_height = g_canvas_height - g_space - g_candle_window_height;

$(function() {
  console.log("loading page");

  var hook_functions = function() {
    $("#candle-file").change(function(event) {
      var file = event.target.files[0];
      var reader = new FileReader();
   
      reader.onload = function(e) {
        var content = e.target.result;
        console.log("finish reading dump from " + file.name);
        content = content.split('\n\n');

        load_candles(content[0]);
        load_trades(content[1]);
        draw_candles();
      }
      reader.readAsText(file);
    });

    $("#back-button").click(function() {
      g_candle_begin_index -= 1;
      g_candle_begin_index = Math.max(0, g_candle_begin_index);
      $("#cur-candle-span").val(g_candle_begin_index);
      draw_candles();
    });

    $("#forward-button").click(function() {
      g_candle_begin_index += 1;
      g_candle_begin_index = Math.min(g_candles.length - CANDLE_NUM_IN_WINDOW, g_candle_begin_index);
      $("#cur-candle-span").val(g_candle_begin_index);
      draw_candles();
    });

    $("#fast-forward-button").click(function() {
      if (g_realized_trades.length == 0) {
        return;
      }

      var idx = g_trade_loc[g_cur_trade_index];
      if (g_candle_begin_index < idx) {
        g_candle_begin_index = idx;
        $("#cur-candle-span").val(g_candle_begin_index);
        $("#cur-trade-span").val(g_cur_trade_index);
        draw_candles();
        return;
      }

      if (g_cur_trade_index + 1 >= g_realized_trades.length) {
        return;
      }
      g_cur_trade_index += 1;
      g_candle_begin_index = g_trade_loc[g_cur_trade_index];
      $("#cur-candle-span").val(g_candle_begin_index);
      $("#cur-trade-span").val(g_cur_trade_index);
      draw_candles();
    });

    $("#fast-back-button").click(function() {
      if (g_realized_trades.length == 0) {
        return;
      }
      if (g_cur_trade_index - 1 < 0) {
        return;
      }
      g_cur_trade_index -= 1;
      g_candle_begin_index = g_trade_loc[g_cur_trade_index];
      $("#cur-candle-span").val(g_candle_begin_index);
      $("#cur-trade-span").val(g_cur_trade_index);
      draw_candles();
    });

    $("#cur-candle-span").change(function() {
      g_candle_begin_index = $(this).val();
      draw_candles();
    });
  };

  var load_candles = function(content) {
    g_candles = [];
    lines = content.split('\n');
    for (var i in lines) {
      var line = lines[i];
      if (line.length > 0) {
        var candle = parse_candle(line);
        g_candles.push(candle);
      }
    }
    g_candle_begin_index = 0;
    g_cur_trade_index = 0;
    $("#cur-candle-span").val(g_candle_begin_index);
    $("#cur-trade-span").val(g_cur_trade_index);
    $("#cur-candle-span").text(g_candle_begin_index);
    $("#total-candle-span").text(g_candles.length);
    if (g_trades.length > 0) {
      locate_trades();
    }
  };

  var load_trades = function(content) {
    g_trades = [];
    g_realized_trades = [];
    g_trade_open_times = {};
    g_trade_close_times = {};
    lines = content.split('\n')
    for (var i in lines) {
      var line = lines[i];
      if (line.length > 0) {
        var trade = parse_trade(line);
        g_trades.push(trade);
        g_trade_open_times[trade.open_time] = trade;
        if (trade.realized) {
          g_realized_trades.push(trade);
          g_trade_close_times[trade.close_time] = trade;
        }
      }
    }
    g_cur_trade_index = 0;
    g_candle_begin_index = 0;
    $("#cur-trade-span").text(g_cur_trade_index);
    $("#total-trade-span").text(g_realized_trades.length);
    console.log(sprintf("%d(%d realized) trades loaded", g_trades.length,
                       g_realized_trades.length));
    if (g_candles.length > 0) {
      locate_trades();
    }
  };

  var parse_candle = function(str)  {
    str = str.split(',');
    return {
      timestamp: parseInt(str[0]),
      open: str[1] / 10000.0,
      high: str[2] / 10000.0,
      low: str[3] / 10000.0,
      close: str[4] / 10000.0,
      volume: parseInt(str[5]),
      // methods
      time_str: CandleUtil.time_str
    };
  };

  var parse_trade = function(str) {
    str = str.split(',');
    return {
      type: str[0],
      open_time: parseInt(str[1]),
      close_time: parseInt(str[2]),
      realized: str[3] == 1 ? true : false
    };
  }

  var draw_candles = function() {
    var begin_idx = g_candle_begin_index;
    var candles = g_candles.slice(begin_idx, begin_idx + CANDLE_NUM_IN_WINDOW);
    var stat = {
      max_volume: 0,
      min_price: 1000000000,
      max_price: 0
    };
    for (var i in candles) {
      var candle = candles[i];
      stat.max_volume = Math.max(stat.max_volume, candle.volume);
      stat.min_price = Math.min(stat.min_price, candle.low);
      stat.max_price = Math.max(stat.max_price, candle.high);
    }
    stat.scale = (g_candle_window_height - g_space * 2) / (stat.max_price - stat.min_price);
    draw_canvas(stat);
    for (var i in candles) {
      draw_candle(i, candles[i], stat);
    }
  };

  var locate_trades = function() {
    g_trade_loc = [];
    var trade_idx = 0;
    var candle_idx = 0;
    while (trade_idx < g_realized_trades.length && candle_idx < g_candles.length) {
      var trade = g_realized_trades[trade_idx];
      var candle = g_candles[candle_idx];
      if (candle.timestamp < trade.open_time) {
        candle_idx += 1;
      } else if (candle.timestamp < trade.open_time) {
        trade_idx += 1;
      } else {
        g_trade_loc.push(candle_idx);
        trade_idx += 1;
        candle_idx += 1;
      }
    }

    if (g_trade_loc.length != g_realized_trades.length) {
      console.log(sprintf("warning: only %d / %d trades located",
                          g_trade_loc.length, g_realized_trades.length));
    } else {
      console.log("all trades got located");
    }
  };

  var highlight_if_has_trade = function(idx, candle) {
    var trade = null;
    var t = candle.timestamp;

    var x = g_origin_x + parseInt(idx) * g_canvas_width / CANDLE_NUM_IN_WINDOW;
    var w = g_canvas_width / CANDLE_NUM_IN_WINDOW;

    if (t in g_trade_open_times) {
      // highlight the volume bar for all trades
      trade = g_trade_open_times[t];
      var color = UNREALIZED_TRADE_OPEN_COLOR;
      var y = g_volume_origin_y
      var h = g_canvas_height - g_candle_window_height - g_space;;
      var opacity = 0.2;
      draw_rect(g_canvas,
                x, y, w, h, null, color, opacity);

      if (trade.realized) {
        // also highligh the candle bar for realized trades
        y = g_origin_y;
        h = g_candle_window_height;
        color = REALIZED_TRADE_OPEN_COLOR;
        opacity = 0.3;
        draw_rect(g_canvas,
                x, y, w, h, null, color, opacity);
      }
    } 

    if (t in g_trade_close_times) {
      // all trades in g_trade_close_times are realized
      trade = g_trade_close_times[t];
      var color = REALIZED_TRADE_CLOSE_COLOR;
      var y = g_origin_y;
      var h = g_candle_window_height;
      var opacity = 1.0;
      draw_rect(g_canvas,
                x, y, w, h, null, color, opacity);

    }
  }

  var draw_candle = function(idx, candle, stat) {
    var display = function() {
      $("#candle-open").text(candle.open);
      $("#candle-close").text(candle.close);
      $("#candle-high").text(candle.high);
      $("#candle-low").text(candle.low);
      $("#candle-volume").text(candle.volume);
      $("#candle-time").text(candle.time_str());
    };

    var stop_display = function() {
      $("#candle-open").text("");
      $("#candle-close").text("");
      $("#candle-high").text("");
      $("#candle-low").text("");
      $("#candle-volume").text("");
      $("#candle-time").text("");
    };

    highlight_if_has_trade(idx, candle);
    // draw volume bars
    var v = candle.volume;
    var max_v = stat.max_volume;
    var volume_height = g_canvas_height - g_candle_window_height - g_space; 
    var volume_h = v / max_v * volume_height;
    var volume_box = draw_rect(g_canvas,
                               g_volume_origin_x + parseInt(idx) * g_canvas_width / CANDLE_NUM_IN_WINDOW + g_bar_space,
                               g_volume_origin_y + volume_height - volume_h,
                               g_canvas_width / CANDLE_NUM_IN_WINDOW - 2 * g_bar_space,
                               volume_h, '#CA4242',
                               '#CA4242', 1.0);
    volume_box.addMouseOverListener(display);
    volume_box.addMouseOutListener(stop_display);

    // draw the stick
    var scaled_high = (candle.high - stat.min_price) * stat.scale;
    var x = g_origin_x + (parseFloat(idx) + 0.5) * g_canvas_width / CANDLE_NUM_IN_WINDOW;
    var y = g_origin_y +  g_candle_window_height - g_space - scaled_high;
    var len = Math.max((candle.high - candle.low) * stat.scale, 2.0);
    draw_vertical_line(g_canvas, x, y,
                       len,
                      'black');

    // draw the candle
    if (candle.close > candle.open) {
      var color = 'green';
      var scaled_begin = (candle.close - stat.min_price) * stat.scale;
    } else {
      var color = 'red';
      var scaled_begin = (candle.open - stat.min_price) * stat.scale;
    }
    var x = g_origin_x + g_bar_space + parseFloat(idx) * g_canvas_width / CANDLE_NUM_IN_WINDOW;
    var y = g_origin_y +  g_candle_window_height - g_space - scaled_begin;
    var w = g_canvas_width / CANDLE_NUM_IN_WINDOW - 2 * g_bar_space;
    var h = Math.abs(candle.close - candle.open) * stat.scale;
    if (candle.close == candle.open) {
      h = 1.0;
      color = 'black';
    }
    var box = draw_rect(g_canvas, x, y, w, h, color, color);
    box.addMouseOverListener(display);
    box.addMouseOutListener(stop_display);
  }

  var draw_canvas = function(stat) {
    g_canvas.clear();
    // create background
    draw_rect(g_canvas, g_origin_x, g_origin_y, g_canvas_width, g_canvas_height, '#cdcdcd');

    // draw candle window and volume window split line
    draw_horizental_line(g_canvas, g_origin_x, g_origin_y + g_candle_window_height,
                         g_canvas_width, '#cdcdcd');

    // draw half volume ruler
    draw_horizental_line(g_canvas,
                         g_origin_x,
                         g_volume_origin_y + g_volume_window_height / 2,
                         g_canvas_width, '#cdcdcd', jsgl.DashStyles.DASH);

    // draw volume metrics
    draw_label(g_canvas, g_origin_x - 40,
               g_volume_origin_y + g_volume_window_height / 2 - 8,
               Math.ceil(stat.max_volume / 2));


    for (var i = 0; i < CANDLE_NUM_IN_WINDOW; ++i) {
      draw_vertical_line(g_canvas,
                         g_origin_x + (i + 1) * g_canvas_width / CANDLE_NUM_IN_WINDOW,
                         g_origin_y,
                         g_canvas_height, '#cdcdcd');
    }

    draw_label(g_canvas, g_origin_x - 40,
               g_origin_y,
               stat.max_price.toFixed(2));
    var line_space = (g_candle_window_height - g_space) / (HORIZONTAL_LINE_NUM + 1);
    for (var i = 0; i < HORIZONTAL_LINE_NUM; ++i) {
      draw_horizental_line(g_canvas,
                           g_origin_x,
                           g_origin_y + (i+1) * line_space,
                           g_canvas_width, '#cdcdcd', jsgl.DashStyles.DASH);

      // draw candle metrics
      draw_label(g_canvas, g_origin_x - 40,
                 g_origin_y + (i+1) * line_space - 8,
                 (stat.max_price - (i+1) * line_space / stat.scale).toFixed(2));

    }



    for (var i = 0; i < HORIZONTAL_LINE_NUM; ++i) {
      
    }

  };

  g_canvas = new jsgl.Panel($("#chartdiv")[0]);
  hook_functions();

  var picaso = {
    draw_canvas: draw_canvas
  };

  window.picaso = picaso;

  // Add hotkyes
  
  $("body").keydown(function(e) {
    if(e.keyCode == 37) {
      // left
      $("#back-button").click();
      
    } else if(e.keyCode == 39) {
      // right
      $("#forward-button").click();

    } else if (e.keyCode == 38) {
      // up
      $("#fast-back-button").click();
      return false;

    } else if (e.keyCode == 40) {
      // down
      $("#fast-forward-button").click();
      return false;
    }
  });

  console.log("page loaded");
});
