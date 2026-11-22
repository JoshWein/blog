// "Release a bug" for the Swiss cheese diagram: each click sends a bug in from
// the left. It steers toward the nearest hole in the next slice, but it can only
// turn so fast, so sooner or later a slice catches it.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var NAMES = ['the "make no mistakes" prompt', 'AGENTS.md and skills', 'lint and types',
               'tests', 'review by another model', 'me'];
  var LEGS = 'M-4 -7 L-7 -10 M4 -7 L7 -10 M-7 0 H-10 M7 0 H10 M-4 7 L-7 10 M4 7 L7 10';
  var W = 36, SPEED = 150, MAX_LIVE = 12;

  var box = document.querySelector('.bug-launch');
  if (!box) return;
  var svg = box.parentNode.querySelector('svg');
  var btn = box.querySelector('button');
  var status = box.querySelector('.bug-status');
  var motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
  function sync() { box.hidden = !motion.matches; }
  sync();
  if (motion.addEventListener) motion.addEventListener('change', sync);

  var layers = Array.prototype.map.call(svg.querySelectorAll('.layer'), function (g) {
    var r = g.querySelector('rect');
    return {
      g: g, x: +r.getAttribute('x'),
      holes: Array.prototype.filter.call(g.querySelectorAll('.hole'), function (h) {
        return +h.getAttribute('ry') >= 8;   // the small decorative holes are too tight
      }).map(function (h) { return +h.getAttribute('cy'); })
    };
  });
  var live = 0;

  function offset(layer) {   // how far the slice has slid right now
    var m = svg.getScreenCTM(), n = layer.g.getScreenCTM();
    return m && n ? m.inverse().multiply(n).f : 0;
  }
  function nearestHole(layer, y) {
    var off = offset(layer), best = null;
    layer.holes.forEach(function (h) {
      if (best === null || Math.abs(h + off - y) < Math.abs(best - y)) best = h + off;
    });
    return best;
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function launch() {
    if (live >= MAX_LIVE) return;
    live++;
    var y = 45 + Math.random() * 165;
    var agility = 40 + Math.random() * 70;     // px per second it can move up or down
    var g = el('g', { 'class': 'bug-live' }, svg);
    var body = el('g', {}, g);
    el('circle', { r: 6 }, body);
    el('path', { d: LEGS }, body);
    var x = 20, next = 0, inside = -1, last = performance.now();

    function caught(i) {
      var t0 = performance.now(), mark = el('g', { 'class': 'live-hit' }, svg);
      el('path', { d: 'M' + (x - 5) + ' ' + (y - 5) + ' L' + (x + 5) + ' ' + (y + 5) +
                      ' M' + (x + 5) + ' ' + (y - 5) + ' L' + (x - 5) + ' ' + (y + 5) }, mark);
      status.textContent = 'Caught by ' + NAMES[i] + '.';
      (function squash(now) {
        var k = Math.min((now - t0) / 900, 1);
        body.setAttribute('transform', 'scale(' + (1 - 0.7 * k) + ' ' + (1 + 0.8 * k) + ')');
        g.style.opacity = String(1 - k);
        mark.style.opacity = String(k < 0.6 ? 1 : (1 - k) / 0.4);
        if (k < 1) requestAnimationFrame(squash);
        else { g.remove(); mark.remove(); live--; }
      })(t0);
    }

    (function step(now) {
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (inside >= 0) {
        // Riding through a hole: stay in it as the slice slides.
        y = nearestHole(layers[inside], y);
        if (x - 6 > layers[inside].x + W) { inside = -1; next++; }
      } else if (next < layers.length) {
        var target = nearestHole(layers[next], y);
        if (target !== null) {
          var dy = target - y, max = agility * dt;
          y += Math.max(-max, Math.min(max, dy));
        }
        if (x + 6 >= layers[next].x) {
          if (target !== null && Math.abs(target - y) <= 5) inside = next;
          else return caught(next);
        }
      }
      x += SPEED * dt;
      g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      requestAnimationFrame(step);
    })(last);
  }

  btn.addEventListener('click', launch);
})();
