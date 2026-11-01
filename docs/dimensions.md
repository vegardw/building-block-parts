# Dimensions and sources

This page lists the dimensions the generator uses, where each value comes from, and what we chose where sources
disagree. The parts are meant to be compatible with LEGO® bricks and LEGO® Technic™ elements; see the trademark note
at the end.

All values are in millimetres. Numbers in square brackets refer to the [sources](#sources) list.

## Nominal values, not measurements

The generator builds every part at its **nominal** size: the round design value that the system is laid out on, not an
average measured from real parts. Real moulded parts differ from nominal by a few hundredths of a millimetre, and
printers and CNC machines add their own errors, which are often larger. The app's fit settings (clearances) exist for
that (see the [calibration guide](calibration.md)); they change diameters and outside sizes, never the spacing of holes
and studs or the length of an axle or pin.

Where genuine parts were measured and differ from the design sources in a way that matters for the fit, the
generator uses the measured value and says so (counterbores, collars and stops, brick studs and the bars under bricks
one stud wide, [13]).

Most dimensions in this system are simple fractions of the 8 mm grid. We write that module as **L = 8 mm**, as the
proportional drawing in [1] does. Two other units appear in the sources:

- **LDU** (LDraw unit), used by the LDraw parts library [2]. The LDraw specification gives both 1/64 inch and 0.4 mm as
  "real world approximations", and one brick width (the stud pitch) is 20 LDU [3]. A measurement of 16 stud pitches came
  out at 128.0 ± 0.04 mm, which fits 0.4 mm and rules out 1/64 inch [4]. This page converts at 0.4 mm per LDU.
- A **1.6 mm unit** (one fifth of the pitch, half a plate height), used by some diagrams [10].

## The grid

| Dimension | Nominal | Notes and sources |
|---|---|---|
| Stud and hole pitch | 8.0 | All nominal sources agree [2][5][6]. Measurements: see below. |
| Plate height | 3.2 | 0.4 × pitch [5][6] |
| Brick height | 9.6 | 3 plates, 1.2 × pitch [5][6] |
| Gap between neighbouring parts | 0.2 in total | an n-stud part is n × 8 − 0.2 long [6][7][8] |
| Stud diameter | 4.8 (design); brick studs made 4.85 | [6][7]; Cailliau reasons it lies between 4.8 and 4.9 [8]; genuine brick studs measure 4.84 to 4.88 [13]. The half pin's and the axle's studs stay 4.8 |
| Stud height | 1.6 to 1.8; brick studs made 1.8 | sources differ: 1.7 [5][6], 1.8 measured [8] and drawn [7] (whose section of a brick says 1.7), 1.6 (4 LDU) in LDraw [2][8]; measured 1.8 on bricks with holes [13] |

The original brick patent (US 3,005,282) describes the stud-and-tube geometry but gives no dimensions.

**Measured pitch.** Three measurements disagree slightly with each other:

| Measured pitch | What was measured | Source |
|---|---|---|
| 8.000 (128.0 ± 0.04 over 16 pitches) | two 2 × 4 bricks on a baseplate, digital caliper | [4] |
| 7.986 ± 0.002, at 25 °C | a wall of beams from the late 1990s | Robert Munafo in [5] |
| 7.970 ± 0.010 | see the thread | [1] |

We use 8.0. It is the value every design source uses, and the measurements do not agree on a single smaller value. The
difference adds up along a beam: over the 31 gaps of a 32-hole beam (the longest the generator makes), 8.0 instead of
7.97 to 7.986 makes the end holes 0.43 to 0.93 mm further apart. That matters only when a long generated beam is pinned
alongside a long real one.

## Beam (liftarm)

The beam sets the base dimensions (pitch, width, hole, counterbore) that the other parts and the calibration bars
share. In the table, "drawing" is the proportional drawing in [1] and "LDraw" is the official LDraw geometry of a
7-hole thick beam (part 32524.dat) and its hole primitives [2].

| Dimension | Nominal | In L | Drawing [1] | LDraw [2] | Other sources |
|---|---|---|---|---|---|
| Hole pitch | 8.0 | L | L | 20 LDU = 8.0 | see the grid section |
| Width | 7.2 | 0.9 L | 0.9 L | 18 LDU = 7.2 | |
| Thickness (along the holes) | 8.0 | L | L | 20 LDU = 8.0 | no measurement found |
| Hole diameter | 4.8 | 0.6 L | 0.6 L | 12 LDU = 4.8 | 4.8 drawn for a brick with holes [7]; about 4.9 by Cailliau's reasoning [8] |
| Counterbore diameter | 6.2 (measured) | 0.775 L | 0.8 L | 16 LDU = 6.4 | about 6.20 measured [13]; 6.2 drawn for a brick with holes [7]; 5.6 in [10] |
| Counterbore depth | 0.8 | 0.1 L | 0.1 L | 2 LDU = 0.8 | not dimensioned in [7] |
| End radius | 3.6 | 0.45 L | not dimensioned | 9 LDU = 3.6 | |

The ends are semicircles centred on the end holes [2], so a beam with n holes is (n − 1) × 8 + 7.2 long.

Counterbores are on both faces of every hole. Counterbore here means the shallow, wider recess at each end of a
hole.

**Counterbore: 6.2, measured, not the drawn 6.4.** Both design sources [1][2] draw the counterbore and the collars
that sit in it the same size, 6.4 (0.8 L). Genuine parts differ: counterbores measure about 6.20 and collars about
6.0 [13], so collars seat with about 0.1 mm of play per side rather than line to line. The 6.2 also agrees with
Bartneck's drawing of a brick with holes [7], an independent source. The generator therefore uses 6.2 × 0.8:

- it matches genuine beams, so generated and genuine beams take the same pins and stops;
- a 6.0 collar, genuine or generated, still seats with play;
- the wall beside the counterbore is 0.5 mm instead of 0.4;
- printers that make holes small are covered by the hole clearance, which enlarges the counterbore together with
  the bore.

Caliper jaws in a recess only 0.8 mm deep tend to read an inside diameter slightly low, which is one more reason to
trust the agreement with [7] rather than go below 6.2. Earlier CNC test pieces for this project had 6.4 mm
counterbores, and pins fit them, as 6.0 collars fit either size. The depth stays 0.8 (0.1 L): the drawing in [1]
gives the pin collar 0.2 L wide, twice that depth, and the axle pin's collar 0.1 L, one depth, so a collar sits in
the counterbores of the parts it joins.

One community CAD reference [11] uses 7.8 × 7.8 beams and a 6.0 to 6.2 × 0.8 to 1.0 counterbore and attributes
them to Cailliau [8]. They are not on that page, but they match his older measurements page [16]: its text gives the
recess of a hole as 6.0 mm, its drawing of a one-stud brick with a hole shows Ø6.2, and 7.8 there is that brick's
width (8 − 0.2), not a measured beam. It states no recess depth. These add nothing beyond [7] and [13], so we have
not used them.

**Simplifications.** The drawing in [1] shows recesses between neighbouring holes. The generated beam is
solid there, and the hole geometry is unchanged.

## Half-height beam (thin liftarm)

Both design sources give the half-height beam the full beam's width, pitch, holes and counterbores, at half the
thickness: the drawing in [1] shows it 0.5 L thick and 0.9 L wide with a 0.6 L bore and a 0.8 L × 0.1 L counterbore,
and LDraw's thin beams (32017.dat, 5 holes; 32063.dat, 6 holes; hole primitive beamhol2.dat) are 10 × 18 LDU with a
12 LDU bore and a 16 × 2 LDU counterbore on both faces [2].

| Dimension | Nominal | In L | Drawing [1] | LDraw [2] |
|---|---|---|---|---|
| Thickness | 4.0 | 0.5 L | 0.5 L | 10 LDU = 4.0 |
| Width, pitch, hole, counterbore, end radius | as the beam | | as the beam | as the beam |

That leaves 2.4 mm of plain bore between the two counterbores. The generator's half-height beam (the beam's Half height)
is the beam with this one change, including the measured 6.2 mm counterbore; the height clearance applies to the 4 mm.

**Minimum wall.** The generator refuses settings that leave less than 0.2 mm of wall between a counterbore and the
side of the beam (nominal: (7.2 − 6.2) / 2 = 0.5 mm). This is the project's own manufacturing limit, not a
dimension of the system, and has not been tested.

## Axle

Axles come in whole and half-stud lengths: the catalogue in [12] lists plain axles from 2 to 32 studs and axles with
a stop in 3.5, 4.5 and 5.5 studs. The generator makes any length from 1 to 32 studs in half steps (nominal length =
studs × 8 mm), with a choice of end at each end. Geometry from LDraw's axle parts and primitives [2] and the
drawing in [1]:

| Feature | Value | Sources |
|---|---|---|
| Cross, tip to tip | 4.8 (0.6 L), tips are arcs on that circle | 12 LDU in axle.dat [2]; Cailliau's page gives 4.8 [8], his older page 4.75 (and 4.85 for a stud) [16], as [9] quotes him; [11] lists 4.78 |
| Cross, arm width | 1.6 (0.2 L) | 4 LDU in axle.dat [2]; the axle hole in [1] is 0.2 L; [11] lists 1.79 |
| Plain end | face 0.2 inside the nominal length; tips bevelled over 0.8, from Ø4.8 to Ø2.57 at the face | axleend2.dat [2] (one flat bevel per arm, 2025) |
| Stop (flange) | Ø6.0 × 0.8, outer face flush with the end | Ø about 6.0 measured on stops with stud and pin collars [13]; LDraw draws 16 × 2 LDU (6.4 × 0.8) on the 3 L, 4 L, 5 L and 8 L axles with stop (24316, 87083, 15462, 55013.dat) [2] |
| Stop with stud | the stop plus an open stud Ø4.8 × 1.6 with a Ø3.2 bore beyond the end | 6587.dat, stud2.dat [2] |
| Stop one stud in | Ø5.75 flange 7.2 to 8.0 from the end, then a round Ø4.8 section to 11.2 | Ø5.75 measured on one axle [13]; positions from the 5.5 L axles with stop 32209 and 59426.dat and axleho12.dat [2] (LDraw draws Ø6.4) |
| Notched | grooves 3.6 to 4.8 from each end in all four arms, floor Ø3.2 | 2 L notched axle 32062.dat [2] |

The stop is a collar: it sits in a counterbore (6.2) with a little play, like a pin collar, so it uses the measured
collar size rather than the drawn 6.4. The round section next to a
stop one stud in, Ø4.8 like the cross tips, can't enter an axle hole, so it stops the axle there. The generator
bevels the tips with flat planes, as LDraw does, which keeps every edge a line, circle or ellipse.

**Arm width: 1.6, not 1.8.** The design sources agree on 1.6 (0.2 L). The 1.79 in [11] has no stated source and no
measurement was found; a real axle has not yet been measured for this project. Three fit settings (clearances) adjust an
axle: the axle size shifts the cross, the collar diameter the stops, and the stud diameter the stud, which sits in a
brick's underside like any stud. They are separate because the cross should be snug in an axle hole while a stop should
seat in a counterbore with play. The calibration axle (one-stud sections of graduated sizes, slid into a genuine axle
hole) and the collar calibration bar (buttons with graduated diameters, laid under a genuine beam's counterbore) find
them for a printer or CNC; see the [calibration guide](calibration.md).

**Not generated (yet).** Other axle types found in [12] and LDraw [2]: an axle with a round middle section
(99008) and axle connectors. Axle and pin combinations are made with the Pin part (see below).

## Pin

A pin has a collar in the middle and a side on each end. The catalogue in [14] lists plain pins (smooth and with
friction) of 2 and 3 studs, ½ and ¾ pins, pins with a bush or stop, and five pins with an axle on one side. The
generator builds a collar plus a side on each end, each one of: a pin of 1, 1.5 or 2 studs (with or without
friction), an axle of 1 or 2 studs, or a stud. That covers the 2L and 3L pins, the ½ pin and all five axle pins
in [14]; the 1.5-stud side is the long pin side of the "2L friction pin & 1L axle" (11214), long enough to reach
through a beam and a half-height beam. Geometry from LDraw's pin parts and primitives [2], per pin side, measured
from the centre of the collar:

| Feature | Value | Sources |
|---|---|---|
| Length | 8 mm per stud (a 2L pin is 16 mm, a 3L pin 24 mm) | 3673, 32556, 6558.dat [2]; 2 L in [1] |
| Shaft | Ø4.8 (0.6 L) | 12 LDU in connect.dat [2]; [1] |
| Bore | Ø3.2 (0.4 L), through; on an axle pin it stops at the collar | connect.dat, connect8.dat [2]; [1] |
| Collar | Ø6.0, 0.8 wide per pin side (1.6 on a two-sided pin, 0.8 on an axle pin) | Ø measured [13]; widths 0.2 L and 0.1 L in [1], 2 LDU per side in [2] (drawn Ø6.4) |
| Lip at the tip | Ø5.2 × 0.8, flat tip | 6.5 × 2 LDU in connect.dat [2]; length 0.1 L in [1] |
| Slots | two per tip, at 0° and 180°, 0.8 wide, through the wall, 3.4 in from the tip | connect.dat [2] (rounded end, r 0.4) |
| Friction ribs | four per row at 45°, 0.1 high, 0.6 wide, 2 long; one row next to the collar, one next to the lip | 2780.dat and fric.dat [2] (crest 6.25 LDU, 0.64 wide at the base) |
| Axle side | the axle cross, from the collar to a normal bevelled end 0.2 inside the nominal length | 3749, 43093, 18651, 11214.dat [2] |
| Stud (½ pin) | open stud Ø4.8 × 1.6 with the bore through it | 4274.dat, stud2a.dat [2] |

The lip is wider than the hole: it springs out into the far counterbore (it is exactly that deep) and holds the
pin, which is why the tip has slots. The friction ribs stand 0.1 mm above the shaft, which gives a friction pin an
effective diameter of about 5.0 mm without changing the shaft; [11] gives 5.0–5.1. Collars are the measured
collar size, like axle stops [13]: they sit in a counterbore with a little play.

Simplifications: the slots end square, not rounded, because a rounded end would meet the shaft in a curve that is
not a line, circle or ellipse; their length is the rounded end's apex. Some genuine friction pins also have slots
through the collar (2780.dat), and long pins a small bead around the middle of the long side (connectring.dat);
neither is modelled. "Plain ends" (no lip and no slots) is the generator's own option, for machining or brittle
materials.

Colour is how genuine pins are told apart: community sources describe black and blue for friction and grey and tan
for no friction [15], though the conventions have changed over the years. The pin diameter clearance shifts the
shaft, lips and ribs; the collar diameter the collar; the axle size an axle side; the stud diameter a half pin's
stud, which sits in a brick's underside like any stud. The pin calibration bar (round stubs with graduated
diameters) finds the pin diameter.

## Brick and plate

The generator makes bricks and plates from 1 × 1 to 16 × 32 studs, and the stud and underside calibration bars,
with the values chosen below (see "What the generator uses"). A brick is 9.6 tall and a plate 3.2, without studs,
and both are n × 8 − 0.2 long and wide (see [the grid](#the-grid)); genuine bricks one to three studs long measure
exactly that, 7.8, 15.8 and 23.8, and a four-stud one 31.7 [13]. The underside is open: a wall
round the edge, and inside it tubes (parts two or more studs wide) or bars (parts one stud wide) that grip the studs
of the part below. The main source is [7], drawings of a genuine 2 × 4 brick and 2 × 4 plate with measurements;
LDraw [2] draws the same features, simplified and without the 0.2 gap, so its walls come out 0.1 thicker.

| Feature | Value | Sources |
|---|---|---|
| Top | 1.0 thick | [7] (brick and plate); [17]; LDraw draws 4 LDU = 1.6 |
| Wall | 1.2 on parts two or more studs wide; 1.5 on parts one stud wide (both measured, see below) | 1.2: measured [13]; [7] (2 × 4 brick and plate), [17]. 1.5: measured [13]; [7] (1 × 4 brick with holes), LDraw (4 LDU less half the gap; 3001, 3005, 3010.dat), [10] (1 unit, also drawn without the gap: 4.8 inside its 1 × 2, 12.8 inside its 2 × 2), [5] (as (8 − 5) / 2, taking the stud as 5) |
| Ribs on the inside of the wall | 0.6 wide, 0.3 deep (they reach a 4.8 stud), one at each stud | 12.8 between opposite ribs, measured [13]; [7] draws them 0.6 wide and 0.2 deep; [17] makes them 0.7 wide, reaching to 0.03 from the stud |
| Tube (parts two or more studs wide) | Ø6.51 outside, Ø4.8 inside, the full height | [7]; √2 × 8 − 4.8 = 6.51, the formula in [5] (which takes the stud as 5 and gets 6.31); 5√2 − 3 units in [10]; LDraw draws 6.4 (stud4.dat) |
| Bar (parts one stud wide) | Ø3.1 (genuine ones about 3.0 to 3.14, hard to measure; 3.2 by design); solid, between neighbouring studs, down to the bottom | measured [13]; 8 − 4.8 = 3.2; LDraw stud3.dat (3010, 3710.dat) [2]; [7] (1 × 4 brick with holes); [18]; [17] uses 3.14 |
| Open stud (on some parts) | Ø4.8 outside, Ø3.2 inside | LDraw stud2.dat [2]; [7]; 2 units in [10] |
| Recess under each stud | Ø2.6 | [7] (Ø2.4 in [10]); saves material, takes no part in the fit |

A plate has the same underside, 2.2 deep under its 1.0 top [7], with bars on plates one stud wide (LDraw 3710.dat [2]).
[7] also shows a 0.8 cross wall in the middle of the 2 × 4 brick, ending 2.3 above the bottom.

A brick and two plates are 9.6 + 2 × 3.2 = 16.0 tall, two pitches. That is why bricks with holes are stacked with two
plates between them: their holes are then 16 mm apart vertically, so an upright beam can be pinned across them [5].

**How a stud is held.** A stud of the part below touches the underside along a few lines. Under a part two or more
studs wide, a tube sits in the middle of four studs and touches all four (√2 × 8 − 4.8 = 6.51), and the wall or a rib
is on the stud's outer side. Under a part one stud wide, the bars before and after the stud touch it (8 − 4.8 = 3.2),
and so do the walls, which are 1.5 thick there (7.8 − 2 × 1.5 = 4.8). In a 1 × 1 brick, the four walls hold the stud.
At the design sizes all of these touch a Ø4.8 stud exactly. Genuine parts follow that for the underside, but their
studs are larger [13]:

- the inside of parts one stud wide measures 4.8, and the ribs of parts two studs wide are 12.8 apart, so they touch
  a 4.8 stud exactly; genuine studs measure 4.84 to 4.88, so walls and ribs grip them with about 0.05 mm of
  interference on the diameter. That, and the plastic flexing, is the grip ("clutch");
- the bars measure about 3.0 to 3.14, less than 8 − 4.85 = 3.15, so they touch a genuine stud lightly at most: in
  parts one stud wide the walls grip, and the bars keep the studs in place along the part;
- a tube of 6.51 would grip a 4.85 stud with the same 0.05 (√2 × 8 − 4.85 = 6.46); it hasn't been measured yet.

**Walls: measured.** Parts one stud wide have 1.5 walls that grip the stud from both sides: two 1 × 2 bricks and a 1 × 4
brick measure 4.8 ± 0.02 inside [13], as the 1 × 4 brick with holes in [7], LDraw's bricks and the 1 × 2 in [10] have
it. One 1 × 6 brick measured 5.1 inside; it is treated as an outlier until another long brick is measured. Parts two or
more studs wide have 1.2 walls with ribs: a 2 × 3 and two 2 × 4 bricks measure 13.4 between the walls and 12.8 between
opposite ribs [13].

**Fit and tolerances.** Claims about how precisely genuine bricks are moulded range from a few micrometres to 0.1 mm
(Cailliau believes the moulds are made to under 0.01 mm [8]; [18] says a tenth of a millimetre); we found no figure
published by the LEGO Group. Either way it is far below what printers hold. Generators for printed bricks treat the
stud and each feature that grips it separately:

- MachineBlocks [18] has an adjustment (mm added to the nominal size) for the stud diameter, the wall thickness, the
  tube diameter and the bar under parts one stud wide (which it calls a pin). Its calibration tool prints a row of
  five samples 0.1 apart for each of the four, tested with genuine bricks from loose to snug. Further adjustments
  cover the holes of bricks with holes, the hole in open studs, each outside face and the height. Its walls and
  tubes grip with a band 0.1 thick and 0.8 tall near the bottom. Defaults, for FDM printers: studs +0.2, walls and
  tubes −0.1, holes +0.2, holes in open studs +0.3, each outside face −0.1.
- LEGO.scad [17] builds small fixed clearances into the geometry (0.1 per side between neighbouring parts, 0.03
  between a stud and a tube or rib, 0.01 for a bar in an open stud) and offers a scale factor for the studs and a
  length factor for the ribs.
- A vendor's guide for FDM printers [19], which cites no sources, aims for printed studs of 4.75 to 4.85 and an
  underside that takes 4.90 to 5.00: it makes studs smaller where MachineBlocks makes them bigger.

None of the sources covers resin printing or CNC.

**What the generator uses.** Outside, n × 8 − 0.2 each way: the four-stud reading of 31.7 fits the slightly shorter
genuine pitch others have measured (7.97 to 7.99, see [the grid](#the-grid)), but the generator keeps 8.0, as for
beams, and the part width setting adjusts the outside. A 1.0 top. Under parts two or more studs wide: 1.2 walls, a
rib 0.6 wide at each stud row and column on every wall, and a tube of √2 × 8 − 4.8 = 6.514 with a Ø4.8 bore, the
full height, between each four studs. The ribs reach a 4.8 stud, 0.3 deep, as genuine bricks measure (12.8 between
opposite ribs [13]); [7] draws them 0.2 deep. A rib that touches also lets the underside setting act on the walls as
well as on the tube. Under parts one stud wide: walls that touch the studs (4.8 inside, all round) and bars between
the studs. The underside calibration bar's sections are 2 × 2 plates' undersides. The underside setting moves every
surface that touches a stud by half its value, away from the stud: tubes and bars shrink by the value, and each rib's
or a narrow part's wall face moves out by half.

Left out, as they don't touch a stud: the recess under each stud, the cross wall in the middle of a 2 × 4 brick [7],
and the logo on the studs.

Studs are Ø4.85, as genuine bricks' studs measure (4.84 to 4.88 [13]), not the design's 4.8: the underside is made for a
4.8 stud, as genuine undersides measure, and that 0.05 is the grip. So at zero fit settings a machine without errors
makes studs and undersides like genuine ones. Studs are 1.8 tall, as measured on bricks with holes, whose studs have no
logo [13], and as the only other readings of genuine studs have them ([8], and [7]'s side views); the 1.7 in [5][6] and
LDraw's 1.6 look like rounded figures. A taller stud grips over more of its length and still clears the inside of a
plate (2.2 deep) and the boss under a hole (2.2 up). The half pin's and the axle's studs stay Ø4.8 × 1.6 (LDraw) until a
genuine one is measured.

Parts one stud wide get 1.5 walls (4.8 inside) and Ø3.1 bars, plain bricks and bricks with holes alike. Genuine bars
measure about 3.0 under bricks with holes and 3.1 to 3.14 under plain bricks [13], but they are hard to read with
calipers, so one rounded value is truer to the readings than two precise-looking ones. 3.1 stays a little clear of
two genuine studs (8 − 4.85 = 3.15): the walls grip, as in genuine parts, and the bars keep the studs in place along
the part.

## Brick with holes

A brick one stud wide with holes across it for pins and axles, from 1 × 1 to 1 × 16 [2]. Its underside has bars like
a plain brick's, and its holes are those of the beam. The generator makes all of these lengths (see "What the
generator uses" below).

| Feature | Value | Sources |
|---|---|---|
| Holes | n − 1 for n studs, halfway between the studs; under the studs on the 1 × 1 brick and the 1 × 2 brick with two holes | LDraw 3700, 3701, 3894, 3702, 2730, 3895, 3703, 6541, 32000.dat [2]; [7] |
| Hole centre above the bottom | 5.8 | [7]; [8], from how parts fit together (also in LEGO's own Digital Designer); [17]; [18] (3.625 × 1.6). LDraw (14 LDU) and [10] (3.5 units) use 5.6; caliper readings 5.6 to 5.8 [13] |
| Bore and counterbore | Ø4.8; Ø6.2 × 0.8 on both faces, as in the beam | counterbore Ø6.2 measured [13]; Ø4.8 and Ø6.2 in [7]; LDraw peghole.dat 4.8 and 6.4 × 0.8 [2]; [8] measures the bore 6.2 long between the recesses, which is 7.8 − 2 × 0.8 |
| Boss round each hole, inside | Ø7.2, joined to the top | [7] (R3.6); LDraw draws Ø6.4 |
| Bar under each hole | Ø3.1, as under plain bricks (3.2 drawn, about 3.0 measured); from the bottom up to the boss, whose lowest point is 5.8 − 3.6 = 2.2 up | [7]; LDraw stud3a.dat [2]; [13] |
| Walls | 1.5, sides and ends (4.8 inside) | [7]; [13] |
| Studs | open, Ø4.8 outside (4.85 measured), Ø3.2 inside | [7]; LDraw stud2.dat [2]; [13]; [8] shows four small bumps inside on recent bricks |

The counterbore comes within 9.6 − 5.8 − 3.1 = 0.7 of the top face [7].

**Hole height: 5.8, not LDraw's 5.6.** The sources that start from genuine parts give 5.8: the measured drawing [7],
Cailliau's assemblies [8], and LEGO's own Digital Designer as he reports it; both printed-brick generators [17][18] use
it too. LDraw's 5.6 puts the centre 4.0 below the top, and [8] shows assemblies where LDraw models differ visibly
from genuine parts because of it. The height doesn't change how the holes line up with each other (bricks stacked
with two plates between have holes 16 apart either way), only where they sit relative to the studs. Caliper readings
of a genuine brick with a pin through its hole gave 5.6, 5.7 and 5.8 [13]: a round pin's top is hard to measure to
0.1. **The generator uses 5.8 for now; it may change with a better measurement**, for example of a beam pinned flat
against the brick's side, whose top edge is half the beam's width above the hole.

**What the generator uses.** Holes as above: one between each two studs, or under the stud of a 1 × 1, the beam's
bore and counterbores with the hole setting, the centre 5.8 above the bottom whatever the height setting. Studs
Ø4.85 × 1.8 and solid, like a plain brick's (genuine ones are open, which matters only for moulding). Inside, walls
4.8 apart and Ø3.1 bars between the studs, as in a plain brick one stud wide, and a boss round each hole, 7.2 wide,
up to the top. The boss is a block rather than round: flat underneath at the round boss's lowest point (5.8 − 3.6 =
2.2 up), because a round bar meeting a round boss across it leaves an edge that is not a line, circle or ellipse. The
studs of the part below reach 1.8, so they stay clear of it. A 1 × 1 is solid round its hole, with room underneath
for one stud, 4.8 square and 2.2 deep, as deep as a plate's (LDraw's 6541.dat is 1.6 deep). The walls round each
counterbore, to the side inside the boss and up to the top face, must stay at least 0.2 thick (`MIN_WALL`), which
limits the hole setting to +0.6, as on beams, and with it the part height setting.

## Reference values for future parts

Not used by the generator yet. Recorded here so future parts start from sourced values.

| Part | Dimension | Value | Sources |
|---|---|---|---|
| Axle hole | across the cross × arm width | 4.8 × 1.6 (0.6 L × 0.2 L) | [1]; [11] lists 4.80 × 1.83 |
| Bush | outer diameter; length | 7.2 (0.9 L); 8.0 (L), half bush 4.0 (0.5 L) | [1] |

## Open questions

- Beam thickness on real parts: no published measurement of a beam was found.
- The stop one stud in's 5.75 mm flange, measured on one axle only; collar widths.
- A genuine pin's shaft, lip and friction ribs (taken from LDraw, not yet measured), and whether printed snap pins
  hold in practice.
- A test print or cut at the 0.2 mm minimum wall.
- A real axle's arm width and tip diameter (1.6 and 4.8 here), and the plain end's inset and bevel.
- Bricks: a tube's outside diameter; 1 × 1 bricks and plates (inside, ribs) and a 1 × 2 plate's bar; whether a half
  pin's stud and an axle's stud measure 4.85 like a brick's (they stay 4.8 until then); another long 1 × N brick (one
  1 × 6 measured 5.1 inside: perhaps beside ribs).
- The hole height of a brick with holes (5.8 here for now, 5.6 in LDraw): caliper readings with a pin through the hole
  gave 5.6 to 5.8. A beam pinned flat against the brick's side would do better: the height of its top edge above
  the table, less half its width.

## Sources

1. Reddit thread with a proportional drawing of beams, pins, axles and connectors, all dimensioned as
   fractions of L. <https://www.reddit.com/r/legotechnic/comments/1igulh0/technic_parts_measurements/>
2. LDraw parts library, official files, CC BY 4.0: thick beam 32524.dat (Philippe Hurbain), thin beams 32017.dat
   and 32063.dat (Lutz Uhlmann), hole primitives peghole.dat (James Jessiman), connhole.dat (Magnus Forsberg),
   beamhole.dat and beamhol2.dat (Willy Tschager), axle.dat (James Jessiman).
   <https://library.ldraw.org/library/official/parts/32524.dat>,
   <https://library.ldraw.org/library/official/parts/32017.dat>, <https://library.ldraw.org/library/official/parts/32063.dat>,
   <https://library.ldraw.org/library/official/p/beamhol2.dat>, <https://library.ldraw.org/library/official/p/peghole.dat>,
   <https://library.ldraw.org/library/official/p/connhole.dat>, <https://library.ldraw.org/library/official/p/beamhole.dat>,
   <https://library.ldraw.org/library/official/p/axle.dat>.
   Axles (authors in each file): 3704, 3705, 4519, 32062, 24316, 87083, 15462, 55013, 32209, 59426, 6587 and
   99008.dat under <https://library.ldraw.org/library/official/parts/>; primitives axleend2.dat (Magnus Forsberg),
   axleho12.dat (Rene Rechthaler) and stud2.dat (James Jessiman) under <https://library.ldraw.org/library/official/p/>.
   Pins (authors in each file): 3673, 2780, 4274, 32556, 6558, 3749, 43093, 11214, 18651 and 32054.dat under the
   parts URL above; primitives connect.dat, connect5.dat, connect8.dat, stud2a.dat, fric.dat and confricrib*.dat
   under the primitives URL above.
   Bricks and plates (authors in each file): 3001, 3005, 3010, 3020 and 3710.dat with the subparts s/3001s01,
   s/3005s01 and s/3010s01.dat; bricks with holes 3700, 3701, 3894, 3702, 2730, 3895, 3703, 6541 and 32000.dat;
   primitives stud.dat, stud2.dat, stud3.dat, stud3a.dat and stud4.dat (James Jessiman).
3. LDraw File Format Specification 1.0.2, section "The LDraw Unit (LDU)". <https://www.ldraw.org/article/218.html>
4. Stefan Gustavson, "Empirical findings regarding the length of 1 LDU", Linköping University, 2005 (written
   tongue in cheek, but with real measurements). <https://itn-web.it.liu.se/~stegu76/lego/LDUlength.pdf>
5. LUGNET building FAQ, brick dimensions (by Cary Clark, with answers by Robert Munafo, Jef Poskanzer and others),
   2005. <https://www.lugnet.com/~330/FAQ/Build/dimensions>
6. CMG Lee (Cmglee), diagram of nominal brick dimensions, Wikimedia Commons, CC BY-SA 3.0, compiled from
   orionrobots.co.uk and dimensionsguide.com. <https://commons.wikimedia.org/wiki/File:Lego_dimensions.svg>
7. Christoph Bartneck, brick dimensions and measurements, 2019, with technical drawings of a 2 × 4 brick, a 2 × 4
   plate and a 1 × 4 brick with holes (part 3701).
   <https://www.bartneck.de/2019/04/21/lego-brick-dimensions-and-measurements/>
8. Robert Cailliau, "More Dimensions", 2014 (dimensions derived from how parts fit together, plus some
   measurements). <https://www.cailliau.org/Alphabetical/L/Lego/Dimensions/More%20Dimensions/BBEditPreviewTemp.html>
9. Eurobricks forum, thread on pin and axle dimensions, 2012.
   <https://www.eurobricks.com/forum/forums/topic/75308-lego-pin-and-axle-standard/>
10. Diagram with all dimensions in 1.6 mm units, in an answer by pcantin on Bricks Stack Exchange (2011, edited 2015).
    <https://bricks.stackexchange.com/questions/288/what-are-the-dimensions-of-a-lego-brick>
11. fa-mc/vibe-cading, CAD reference document (community, values mostly without stated sources).
    <https://github.com/fa-mc/vibe-cading/blob/main/docs/lego-technic.md>
12. BrickArchitect parts catalogue, axle category (27 current parts). <https://brickarchitect.com/parts/category-161>
13. Measurements made for this project, 2026, with inexpensive digital calipers and small samples:
    pin collars Ø5.92 to 6.02 over several pins (one outlier at 5.72); collars of two axles with stop and stud about
    Ø6.0; the stop of one 5.5 L axle with stop one stud in about Ø5.75; counterbores of beams about Ø6.20 inside.
    Bricks, 2026-11-01: inside width 4.8 ± 0.02 on two 1 × 2 bricks and a 1 × 4 brick (one 1 × 6 brick 5.1, treated
    as an outlier); 12.8 between opposite ribs and 13.4 between the walls on a 2 × 3 and two 2 × 4 bricks; the bars
    under two 1 × 2 bricks, a 1 × 4 and a 1 × 6 brick about 3.1 to 3.14 (hard to measure), solid, down to the bottom;
    studs 4.84 to 4.88 on all of these bricks; outside, 7.8 (one stud), 15.8 (two), 23.8 (three) and 31.7 (four).
    Bricks with holes, 2026-11-01: studs 4.85 and 1.8 tall; counterbores Ø6.2; the bars under the holes about 3.0
    (hard to measure); the hole centre 5.6, 5.7 and 5.8 above the bottom in three caliper readings with a pin through
    the hole.
14. BrickArchitect parts catalogue, pin category (12 parts including retired) and the axle category's pins with axle.
    <https://brickarchitect.com/parts/category-162>
15. Community discussion of pin colours, e.g. Eurobricks forum threads on friction and frictionless pins and the
    Brickset article on new pins. <https://www.eurobricks.com/forum/forums/topic/108290-random-technic-pin-question>,
    <https://brickset.com/article/65112>
16. Robert Cailliau, earlier dimensions page ("the measurements"), robertcailliau.eu (no longer online; Internet Archive
    copy of 16 January 2017). Quoted by [9] and the likely source of the values [11] attributes to [8].
    <https://web.archive.org/web/20170116173744/http://www.robertcailliau.eu/Lego/Dimensions/zMeasurements-en.xhtml>
17. cfinke/LEGO.scad, an OpenSCAD brick generator (MIT licence): the constants in LEGO.scad, read 2026.
    <https://github.com/cfinke/LEGO.scad>
18. MachineBlocks (Jan Philipp Knöller), an OpenSCAD brick generator with a calibration tool (CC BY-NC-SA 4.0):
    the calibration page of its documentation, and the defaults in config/config-default.scad,
    config/calibration/calibration.scad and lib/block.scad, read 2026. <https://machineblocks.com/docs/calibration>,
    <https://github.com/pks5/machineblocks>
19. Meshy, "Best Tolerances for 3D Printing LEGO-Compatible Bricks", 2026: a vendor's guide for FDM printers,
    without sources. <https://www.meshy.ai/blog/lego-compatible-3d-print-tolerances>

## Trademarks

LEGO® and Technic™ are trademarks of the LEGO Group of companies. The LEGO Group does not sponsor, authorize,
or endorse this project.
