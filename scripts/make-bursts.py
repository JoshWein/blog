# Generates css/bursts-{light,dark}.svg: wall-drawing style line bursts.
# Usage: python3 scripts/make-bursts.py css   (same seed gives the same drawing)
import random, math, sys
W, H = 1600, 1500
r = random.Random(7)
lines = []  # (x1,y1,x2,y2,color,width)
# keep clear of the page title and intro text (svg is centered, so this is the
# heading column on a 1280px-wide screen) so lines never run through words
TEXT = (300, 110, 1060, 320)
def hits_text(x1, y1, x2, y2):
    for i in range(41):
        t = i / 40; x = x1 + (x2 - x1) * t; y = y1 + (y2 - y1) * t
        if TEXT[0] <= x <= TEXT[2] and TEXT[1] <= y <= TEXT[3]: return True
    return False
# fan 1: from a point on the left edge, radiating right (blue)
def fan(cx, cy, a0, a1, n, lmin, lmax, col):
    for i in range(n):
        a = math.radians(a0 + (a1 - a0) * i / (n - 1) + r.uniform(-1.5, 1.5))
        L = r.uniform(lmin, lmax)
        while hits_text(cx, cy, cx + L * math.cos(a), cy + L * math.sin(a)): L *= .9
        lines.append((cx, cy, cx + L * math.cos(a), cy + L * math.sin(a), col, 1.6))
fan(40, 210, -38, 30, 11, 380, 900, "b")
fan(1560, 980, 150, 228, 12, 300, 820, "b")
# crossing field: straight segments at many angles
while len(lines) < 23 + 34:
    col = r.choices("bry", [3, 3, 2])[0]
    # bias toward the top band and the side margins
    zone = r.random()
    if zone < .5:   x, y = r.uniform(0, W), r.uniform(60, 420)
    elif zone < .75: x, y = r.uniform(0, 260), r.uniform(300, H)
    else:            x, y = r.uniform(W - 260, W), r.uniform(300, H)
    a = math.radians(r.uniform(-35, 35) + (0 if r.random() < .7 else 90 * r.choice([-1, 1])))
    L = r.uniform(200, 700)
    if hits_text(x - L/2*math.cos(a), y - L/2*math.sin(a), x + L/2*math.cos(a), y + L/2*math.sin(a)): continue
    lines.append((x - L/2*math.cos(a), y - L/2*math.sin(a), x + L/2*math.cos(a), y + L/2*math.sin(a), col, 1.1 if col != "b" else 1.3))
pal = {"light": {"b": "#2f5fb3", "r": "#d4483c", "y": "#e2b21c", "op": .5},
       "dark":  {"b": "#6f9be8", "r": "#ef7b6f", "y": "#f0cf5c", "op": .6}}
for mode, p in pal.items():
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none" stroke-linecap="round" opacity="{p["op"]}">']
    for x1, y1, x2, y2, c, w in lines:
        out.append(f'<path d="M{x1:.0f} {y1:.0f}L{x2:.0f} {y2:.0f}" stroke="{p[c]}" stroke-width="{w}"/>')
    out.append("</svg>")
    open(f"{sys.argv[1]}/bursts-{mode}.svg", "w").write("\n".join(out))
