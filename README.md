# Maxwell Demon Lab

An interactive browser-based laboratory for exploring **Maxwell's demon**, gas dynamics, and the relationship between particle filtering, temperature, and pressure.

The project is intended to make a classic thought experiment tangible: simulate particles moving between two chambers, change the rule at the partition, and observe how the system's measurable properties evolve.

> **Status:** Initial working simulation. The model, interactive controls, live chamber statistics, and history charts are implemented. Particle–particle collisions and a physical energy/information budget for the demon are not implemented yet.

## The experiment

A two-dimensional container is divided into left and right chambers by a partition. Particles move with individual velocities and interact with the walls and the passage between chambers.

The interface supports four partition modes:

- **Closed partition** — no particles cross.
- **Open passage** — particles may cross in either direction.
- **One-way filter** — particles may cross only from left to right.
- **Maxwell's demon** — passage depends on particle speed; for example, fast particles are favoured to the right and slow particles to the left.

Adjustable particle count, velocity scale, speed distribution, and demon threshold make it possible to investigate how filtering rules affect particle counts, kinetic energy, temperature estimates, and pressure estimates.

## Implemented features

- A real-time 2D Canvas view of both chambers and moving particles.
- Adjustable particle count and speed scale.
- Configurable speed distribution, including uniform and Maxwell–Boltzmann-inspired initial distributions.
- Interactive partition modes and filter parameters.
- Live statistics for each chamber:
  - particle count;
  - mean kinetic energy and temperature estimate;
  - relative pressure estimate;
  - pressure difference between chambers.
- Time-series charts for particle counts, temperature, and pressure.
- Pause, resume, reset, and velocity randomisation controls.
- A self-contained page that can run locally in a modern browser without a server.

The simulation is deliberately dependency-free and runs entirely in the browser.

## Physical model and limitations

The initial implementation will be a simplified numerical model, not a complete molecular-dynamics engine.

For a two-dimensional ideal gas with no bulk flow, a normalised temperature estimate can be defined as

\[
T^* = \frac{1}{2N}\sum_{i=1}^{N}(v_{x,i}^2+v_{y,i}^2),
\]

where velocities and physical constants are expressed in normalised units. If the gas has collective motion, thermal energy should be calculated relative to the chamber's mean velocity.

For chambers of equal area, a relative ideal-gas pressure estimate is

\[
P^* \propto N T^*.
\]

These quantities are useful for comparing the two chambers, but they do not necessarily represent the full mechanical pressure in a strongly non-equilibrium state. Temperature is undefined for an empty chamber.

Particle–particle collisions are currently omitted; without them, the model cannot fully reproduce thermalisation and equilibrium. The interface keeps this limitation visible.

## An important distinction

An ideal one-way filter is an externally imposed rule. Demonstrating that this rule redistributes particles in a simulation does **not** demonstrate that a physically real, cost-free one-way device exists.

A physical analysis of Maxwell's demon must also consider measurement, information processing, memory reset, the mechanism that controls passage, and energy and entropy changes in the device and its environment.

The project separates three questions:

1. Can a specified filtering algorithm create a pressure difference in the model?
2. Does that difference persist when particle collisions and equilibration are included?
3. Could a physical device implement the rule when its energetic and informational costs are accounted for?

The simulation is a tool for exploring these questions, not a proof of a violation of the second law of thermodynamics.

## Technology

- HTML5
- CSS
- Vanilla JavaScript
- Canvas 2D

The goal is to keep the first version lightweight and easy to run locally, without a required backend or external runtime dependencies.

## Deployment

All files served to the browser are located in `public/`. Configure your web server's document root to point to this directory:

- Entry point: `public/index.html`
- Styles: `public/styles.css`
- Browser modules: `public/src/`

The site is static and requires no backend, build step, or external runtime dependencies. Serve it over HTTP(S) (rather than opening the HTML via `file://`) so browser JavaScript modules load reliably.

For local development, run a static server with `public/` as its document root. To run the model tests with Node.js 20 or later from the repository root:

```sh
npm test
```

## Roadmap

- [x] Implement the particle system and chamber geometry.
- [x] Add closed, open, one-way, and speed-selective partition modes.
- [x] Calculate and display chamber statistics.
- [x] Add time-series charts and experiment controls.
- [x] Add repeatable tests for partition rules, crossings, and statistics.
- [ ] Add particle–particle collisions and study their effect on equilibration.
- [ ] Explore accounting for the demon's measurement and information-processing costs.

## Contributing

For changes to the physical model, document the assumptions, equations, and limitations alongside the implementation. Prefer small, testable steps and distinguish simulated behaviour from claims about real physical systems.
