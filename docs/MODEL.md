# LNG training engine

The aggregate engine (introduced in version 0.4) uses a newly written, self-contained training model in `src/engine/lng.ts`. It does not restore the former project or establish fidelity to the ship's P&IDs, PLC logic, equipment curves or commissioned settings. No parameter below is presented as a verified BELEM value.

The model supports heat-driven boiloff, BOG compression, liquid pumping with vaporisation, one gas buffer, a gas consumer, bunkering, commanded venting, and a latched simulator ESD. Each control changes the same inventory model used by the diagrams. It has no connection to onboard control equipment.

## Editable training assumptions

| Setting | Default | Meaning |
| --- | ---: | --- |
| Tank volume | 14,000 m³ | Geometric model capacity |
| LNG density | 450 kg/m³ | Constant liquid density |
| Liquid/gas temperature | −160 °C | Fixed tank temperature |
| Heat ingress | 40 kW | Converted entirely to boiloff while liquid remains |
| Consumer demand | 500 kg/h | Requested gas delivery |
| Pump flow | 8 m³/h | Maximum liquid withdrawal into the gas buffer |
| Compressor flow | 300 kg/h | Maximum BOG transfer into the gas buffer |
| Bunker flow | 50 m³/h | Requested external liquid inflow |
| Buffer volume | 10 m³ | Fixed-volume gas inventory |
| Consumer pressure floor | 0.2 bar(g) | Model delivery floor, not an automatic trip |
| Pump/compressor discharge pressure | 15 bar(g) each | Buffer filling limits |
| Vent flow | 1,000 kg/h | Maximum commanded vapour withdrawal |

Initial liquid volume is 60% of the configured tank capacity. Initial ullage pressure is 0.3 bar(g); the buffer starts at atmospheric pressure and 30 °C. Methane molar mass is 0.016043 kg/mol, the ideal-gas constant is 8.314462618 J/mol/K, and assumed latent heat is 510 kJ/kg. These constants do not constitute a composition-dependent LNG property package.

## Calculation and controls

Pressure follows `P = m R_specific T / V`. Tank gas volume is geometric capacity minus the current liquid volume. Buffer temperature stays at 30 °C. Tank liquid and vapour temperatures stay at the configured tank temperature.

Heat creates `heat ingress × time / latent heat` kilograms of vapour, capped at the remaining liquid inventory. Boiloff transfers mass from liquid to vapour; it creates no fuel. Once all liquid is depleted, this simplified model does not use the remaining heat to warm the gas.

The compressor transfers ullage gas to the buffer, capped by its requested flow, atmospheric suction inventory, and the configured buffer discharge pressure. The pump supplies liquid only when its vaporiser is also enabled. That liquid becomes buffer gas immediately, subject to available liquid, requested pump flow, and its own configured discharge pressure. Compression has priority over supplemental pump flow when both sources are enabled. Pressure limits are ideal delivery constraints; no hydraulic curves, motor power, heat exchanger duty or valve travel is calculated.

Gas delivery requires both the consumer and its gas valve. Delivery cannot exceed demand or the buffer inventory above the configured pressure floor. Unmet demand appears as lower actual delivery; it does not generate an inferred ship trip. Venting cannot remove gas below the atmospheric inventory for the current ullage. Bunkering stops transferring mass at the geometric model boundary: at least 0.1% of capacity, or 0.01 m³, is retained as gas space. This numerical boundary is not a vessel loading limit or overfill protection setting.

The ESD command immediately latches the simulator and turns off every commanded equipment flag, including bunkering and venting. Passive boiloff continues. Reset releases the latch while leaving equipment stopped; the operator must enable the required items again. This shutdown policy belongs to this training model and does not claim to reproduce the ship's cause-and-effect matrix.

## Conservation and numerical behavior

The external mass balance is:

`tank liquid + tank vapour + buffer gas − initial mass − bunkered mass + consumed mass + vented mass = 0`

Boiloff, pumping/vaporisation and compression are internal transfers. Bunkering adds fuel; consumption and venting remove it. The model reports the balance residual in kilograms. It advances in steps of at most one second. Flow readouts are averages over the most recent requested simulation interval. Commands clear those readouts until the next interval.

Commands and simulation steps return new state objects. Invalid settings or time intervals throw an error before changing their input state. Changing density, tank capacity, temperature or buffer volume preserves fuel mass, but changes the idealised pressure/volume relationship; it is a model configuration change, not a physical tank operation. A full reset starts a new inventory ledger.

Tests verify the ideal-gas calculation, latent-heat boiloff, valve and equipment dependencies, compression priority, external mass balance, capacity bounds, finite-inventory depletion, ESD/reset behavior, deterministic stepping and rejected invalid inputs. These tests establish implementation behavior; they do not validate the model against the vessel.

## Boundaries

The engine does not calculate methane saturation equilibrium, LNG mixture composition, flash gas from warm incoming LNG, tank temperature changes, buffer energy balance, stratification, rollover, cavitation, line pressure losses, real compressor/pump performance, relief-valve behavior, gas detection, electrical generation, or ship-specific protective logic. Original approved references and validation are required before developing those behaviors. Model results are estimates for exploring controls and inventories.

## Version 0.5 circuit wrapper

`src/engine/fuelCircuit.ts` adds independent four-pump, two-compressor and two-vaporizer requests plus branch isolation/common route gates. It masks effective equipment before advancing this inventory model and allocates actual transfer among connected branches. It does not multiply aggregate capacities or create independent buffer inventories. See [DIAGRAM_SOURCES.md](DIAGRAM_SOURCES.md) for source topology, training abstractions and remaining reference-only components.
