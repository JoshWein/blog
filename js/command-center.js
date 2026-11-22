// Command center builder: toggle panels on and off, or start from a preset.
// Without JS the default panels show as a static example.
(function () {
  var fig = document.querySelector('.ccb');
  if (!fig) return;
  var controls = fig.querySelector('.ccb-controls');
  var chips = fig.querySelectorAll('.chip');
  var cells = {};
  Array.prototype.forEach.call(fig.querySelectorAll('.cell'), function (c) { cells[c.getAttribute('data-panel')] = c; });
  var presets = fig.querySelectorAll('.preset');
  var status = fig.querySelector('.ccb-status');
  controls.hidden = false;

  function refresh(announce) {   // mark the preset that matches, and say how many panels show
    var on = Object.keys(cells).filter(function (id) { return !cells[id].hidden; }).sort().join(' ');
    Array.prototype.forEach.call(presets, function (b) {
      var match = b.getAttribute('data-panels').split(' ').sort().join(' ') === on;
      b.setAttribute('aria-pressed', match ? 'true' : 'false');
    });
    if (announce) status.textContent = 'Showing ' + (on ? on.split(' ').length : 0) + ' panels.';
  }

  function set(id, on) {
    var cell = cells[id], chip = fig.querySelector('.chip[data-panel="' + id + '"]');
    if (!cell || !chip) return;
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on && cell.hidden) {
      cell.hidden = false;
      cell.classList.remove('pop');
      void cell.offsetWidth;          // restart the pop-in animation
      cell.classList.add('pop');
    } else if (!on) {
      cell.hidden = true;
    }
  }

  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener('click', function () {
      set(chip.getAttribute('data-panel'), chip.getAttribute('aria-pressed') !== 'true');
      refresh(true);
    });
  });
  Array.prototype.forEach.call(fig.querySelectorAll('.preset'), function (btn) {
    btn.addEventListener('click', function () {
      var want = btn.getAttribute('data-panels').split(' ');
      Object.keys(cells).forEach(function (id) { set(id, want.indexOf(id) >= 0); });
      refresh(true);
    });
  });
  refresh(false);
})();
