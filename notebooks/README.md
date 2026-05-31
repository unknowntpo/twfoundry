# TWFoundry Notebooks

Use `uv` so notebook dependencies stay isolated from the frontend app.

```bash
cd /Users/unknowntpo/repo/unknowntpo/twfoundry/main/notebooks
uv sync
uv run jupyter lab
```

Open `bus-route-map-matching-concept.ipynb`.

The first notebook visualizes the bus route matching concept in layers:

1. Route shape from TDX.
2. Original bus stop points.
3. Stop points projected onto the route line.
4. A bus GPS point projected onto the route line.
5. A simple delay-signal mental model based on route progress over time.
