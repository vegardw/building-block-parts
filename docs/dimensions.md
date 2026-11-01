# Dimensions and sources

This page lists the dimensions the generator uses, where each value comes from, and what we chose where sources
disagree. The parts are meant to be compatible with LEGO® Technic™ elements; see the trademark note at the end.

All values are in millimetres. Numbers in square brackets refer to the [sources](#sources) list.

## Nominal values, not measurements

The generator builds every part at its **nominal** size: the round design value that the system is laid out on,
not an average measured from real parts. Real moulded parts differ from nominal by a few hundredths of a millimetre,
and printers and CNC machines add their own errors, which are often larger. The app's fit settings (clearances)
exist for that (see the [calibration guide](calibration.md)); they change diameters, widths and heights, never
lengths or the hole spacing.

Where genuine parts were measured and differ from the design sources in a way that matters for the fit, the
generator uses the measured value and says so (counterbores, collars and stops, [13]).

Most dimensions in this system are simple fractions of the 8 mm grid. We write that module as **L = 8 mm**, as the
proportional drawing in [1] does. Two other units appear in the sources:

- **LDU** (LDraw unit), used by the LDraw parts library [2]. The LDraw specification gives both 1/64 inch and
  0.4 mm as "real world approximations", and one brick width (the stud pitch) is 20 LDU [3]. A measurement of 16 stud pitches came out at
  128.0 ± 0.04 mm, which fits 0.4 mm and rules out 1/64 inch [4]. This page converts at 0.4 mm per LDU.
- A **1.6 mm unit** (one fifth of the pitch, half a plate height), used by some diagrams [10].

## The grid

| Dimension | Nominal | Notes and sources |
|---|---|---|
| Stud and hole pitch | 8.0 | All nominal sources agree [2][5][6]. Measurements: see below. |
| Plate height | 3.2 | 0.4 × pitch [5][6] |
| Brick height | 9.6 | 3 plates, 1.2 × pitch [5][6] |
| Gap between neighbouring parts | 0.2 in total | an n-stud part is n × 8 − 0.2 long [6][7][8] |
| Stud diameter | 4.8 | [6][7]; Cailliau reasons it lies between 4.8 and 4.9 [8] |
| Stud height | 1.6 to 1.8 | sources differ: 1.7 [5][6], 1.8 measured [8] and drawn [7], 1.6 (4 LDU) in LDraw [8] |

The original brick patent (US 3,005,282) describes the stud-and-tube geometry but gives no dimensions.

**Measured pitch.** Three measurements disagree slightly with each other:

| Measured pitch | What was measured | Source |
|---|---|---|
| 8.000 (128.0 ± 0.04 over 16 pitches) | two 2 × 4 bricks on a baseplate, digital caliper | [4] |
| 7.986 ± 0.002, at 25 °C | a wall of beams from the late 1990s | Robert Munafo in [5] |
| 7.970 ± 0.010 | see the thread | [1] |

We use 8.0. It is the value every design source uses, and the measurements do not agree on a single smaller value.
The difference adds up along a beam: over the 31 gaps of a 32-hole beam (the longest the generator makes), 8.0
instead of 7.97 to 7.986 makes the end holes 0.43 to 0.93 mm further apart. That matters only when a long generated beam is pinned alongside a long
real one.

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

That leaves 2.4 mm of plain bore between the two counterbores. The generator's half-height beam (the beam's Half
height) is the beam with this one change, including the measured 6.2 mm counterbore; the height clearance applies to the 4 mm.

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
measurement was found; a real axle has not yet been measured for this project. Two fit settings (clearances)
adjust an axle: the axle size shifts the cross and the stud, the collar diameter the stops. They are separate
because the cross should be snug in an axle hole while a stop should seat in a counterbore with play. The
calibration axle (one-stud sections of graduated sizes, slid into a genuine axle hole) and the collar calibration
bar (buttons with graduated diameters, laid under a genuine beam's counterbore) find them for a printer or CNC; see the [calibration guide](calibration.md).

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
shaft, lips, ribs and stud; the collar diameter the collar; the axle size an axle side. The pin calibration bar
(round stubs with graduated diameters) finds the pin diameter.

## Reference values for future parts

Not used by the generator yet. Recorded here so future parts start from sourced values.

| Part | Dimension | Value | Sources |
|---|---|---|---|
| Axle hole | across the cross × arm width | 4.8 × 1.6 (0.6 L × 0.2 L) | [1]; [11] lists 4.80 × 1.83 |
| Bush | outer diameter; length | 7.2 (0.9 L); 8.0 (L), half bush 4.0 (0.5 L) | [1] |
| Brick with holes | hole centre above the bottom | 5.8 | [7][8]; LDraw uses 5.6 [8], and so does [10] (3.5 units) |

## Open questions

- Beam thickness on real parts: no published measurement of a beam was found.
- The stop one stud in's 5.75 mm flange, measured on one axle only; collar widths.
- A genuine pin's shaft, lip and friction ribs (taken from LDraw, not yet measured), and whether printed snap pins
  hold in practice.
- A test print or cut at the 0.2 mm minimum wall.
- A real axle's arm width and tip diameter (1.6 and 4.8 here), and the plain end's inset and bevel.

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
14. BrickArchitect parts catalogue, pin category (12 parts including retired) and the axle category's pins with axle.
    <https://brickarchitect.com/parts/category-162>
15. Community discussion of pin colours, e.g. Eurobricks forum threads on friction and frictionless pins and the
    Brickset article on new pins. <https://www.eurobricks.com/forum/forums/topic/108290-random-technic-pin-question>,
    <https://brickset.com/article/65112>
16. Robert Cailliau, earlier dimensions page ("the measurements"), robertcailliau.eu (no longer online; Internet Archive
    copy of 16 January 2017). Quoted by [9] and the likely source of the values [11] attributes to [8].
    <https://web.archive.org/web/20170116173744/http://www.robertcailliau.eu/Lego/Dimensions/zMeasurements-en.xhtml>

## Trademarks

LEGO® and Technic™ are trademarks of the LEGO Group of companies. The LEGO Group does not sponsor, authorize,
or endorse this project.
