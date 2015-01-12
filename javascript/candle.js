$(function() {
  var CandleUtil = {
    time_str: function() {
      var t = this.timestamp;
      var hour = Math.floor(t / 3600);
      t = t % 3600;
      var minute = Math.floor(t / 60);
      var second = t % 60;
      return sprintf(" @%02d:%02d:%02d", hour, minute, second);
    },
  };
  window.CandleUtil = CandleUtil;
});
