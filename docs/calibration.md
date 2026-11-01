# Calibration guide

How to make printed or machined parts fit genuine parts as well as possible. The generator builds every part at its
nominal size, then adds your fit settings. Those settings are where your machine's errors are corrected. Find them
once for each machine, material and set of print or cut settings, in the app's **Calibrate** section.

## Why parts need calibrating

No printer or CNC machine makes a part exactly to size. Resin and filament printers usually make holes too small
and outside surfaces too large; a CNC machine is usually close if the CAM software compensates for the tool radius,
but its inside corners keep the tool's radius. A difference of 0.1 mm is enough to make a pin stick or wobble.

The generator can't know your machine's errors, so it lets you add a correction to each kind of feature, and it
offers a calibration part for each correction: one print or cut that shows which value fits.

## The fit settings

The eight fit settings (clearances) open with the **Fit settings** button at the top of the app, beside the section
tabs. Each value is a change to the nominal dimension in millimetres: positive makes the feature bigger, negative
smaller. The 8 mm spacing of holes and studs is never changed, nor an axle's or pin's length. Each part uses only the
settings it needs: in the **Parts** section, the box above the download button lists them, each marked as calibrated
(with the date), set by hand or not calibrated.

| Setting | What it changes | Used by | Range |
|---|---|---|---|
| Hole diameter | the bore (4.8 mm) and the counterbore (6.2 mm) of every hole | beams, bricks with holes | ±1 mm |
| Part width | the outside width: a beam's width across the flat sides (7.2 mm), a brick's or plate's length and width | beams, bricks, bricks with holes, plates | ±1 mm |
| Part height | the height: a beam's thickness along the holes (8 mm, or 4 mm for a half-height beam), a brick's (9.6 mm) or plate's (3.2 mm) without the studs | beams, bricks, bricks with holes, plates | ±1 mm |
| Axle size | the axle's cross (4.8 mm tip to tip, 1.6 mm arms) | axles, axle sides of pins | ±0.5 mm |
| Pin diameter | a pin's shaft (4.8 mm), its lips and friction ribs | pins | ±0.5 mm |
| Collar diameter | collars and stops that sit in a counterbore (6.0 mm; 5.75 mm on a stop one stud in) | pins, axles | ±0.5 mm |
| Stud diameter | every stud: 4.85 mm on bricks and plates (as genuine ones measure), 4.8 mm on a half pin's stud and the stud on an axle with stud | bricks, bricks with holes, plates, half pins, axles with stud | ±0.5 mm |
| Underside size | the size of stud the underside of bricks and plates is made for: positive leaves more room, with smaller tubes (6.51 mm) and bars (3.1 mm), and the ribs, or the walls of parts one stud wide, further out | bricks, bricks with holes, plates | ±0.5 mm |

The settings apply to every part that uses them. When a part uses a setting that isn't zero, the downloaded file
name ends in "-adjusted".

They are kept in this browser only: another browser, another computer or clearing the site's data starts again from
zero. **Save to file** writes them to a small file, and **Load from file** reads one back, in this or another
browser. Keep a file for each machine and material, for example one for a resin printer and one for a CNC machine.
**Reset all to nominal** sets them all to zero. Loading and resetting can be undone straight away. These buttons are
in the fit settings and in the **Your fit settings** box at the top of the Calibrate section, which also says how
many settings are calibrated.

## What you need

- A few genuine parts to test against: pins without friction ribs, pins with friction ribs, an axle, a beam with
  counterbored holes, and a part with an axle hole, such as a gear, a bush or an axle connector.
- For bricks and plates: a genuine 1 × 1 plate or brick, and a genuine 2 × 2 plate or brick.
- Calipers, if you want to correct the part width and height.
- Print or cut every calibration part with the same machine, material, settings and orientation you will use for
  real parts. Test resin parts after washing and full curing, and filament parts after they have cooled.

## How calibrating works in the app

The **Calibrate** section has a step for each setting: six with a calibration part, and one where you measure a
beam for the width and height. The steps come in three groups: beams, pins and axles; bricks and plates; and the
width and height, which every part uses. Skip a group whose parts you don't make. Each step tests against genuine
parts, so the steps don't depend on each other: do them in any order, and come back to a step after printing. The
list of steps shows which settings are calibrated.

Each step has three parts:

1. **Make**: set up the step's part, see it in 3D and download it, as a STEP file or, for a slicer that doesn't open
   STEP, an STL file. **Download all calibration parts** puts the six calibration parts side by side in one file,
   for one print job.
2. **Test**: the instructions for the part, the same as in the sections below.
3. **Result**: the part's features, drawn in the same order as on the part, with their values. Pick the one that
   fits best and save it: it becomes your fit setting, marked as calibrated with today's date.

## How the calibration parts work

There are six calibration parts: five bars and a calibration axle. They all work the same way:

- Each has a row of features, each made with a different value. The middle one has the **middle value**, which is
  0 (nominal) unless you change it.
- On the bars, smaller values are towards the **flat end** and larger values towards the **rounded end**, and two
  small **tabs** on the sides mark the middle feature. On the calibration axle, the sections get larger from the
  **small end** to the **stop**.
- With the default settings the values run from −0.20 to +0.20 mm in 0.05 mm steps, so there are nine features.
  The underside bar has seven, from −0.15 to +0.15 mm, which keeps it about 120 mm long. The note under the part's
  settings gives the range.
- The calibration parts ignore your fit settings: each feature's value is exactly what you save if it fits best.
- The app shows the features in a row like the part, so you can count from either end or from the middle. With the
  default settings, the second feature from the middle towards the rounded end (or the stop) is +0.10 mm, the
  third towards the flat end (or the small end) −0.15 mm.

The steps below follow the app's order, which puts the most common problem first.

### 1. Hole calibration bar: hole diameter

A beam-like bar with a hole at each value; both the bore and the counterbore of each hole are enlarged or reduced
together, just as the hole diameter setting does.

1. Try a pin without friction ribs in each hole. Too small a hole: the pin sticks or won't go in. Too large: it
   wobbles.
2. Choose the smallest hole in which that pin turns freely without noticeable wobble.
3. If you mostly use pins with friction ribs, check that they need some force and hold in the chosen hole.
4. Check that the pin's collar sits flat in the counterbore.
5. In the app, pick that hole under **Result**: its value becomes your **Hole diameter**.

Bricks with holes use the same setting. Printed studs up, their holes lie across, while the bar's holes, printed flat,
stand upright, and printers often make the two differently. Print the bar the way you print most holes; the check set
under the underside step has a brick with holes to compare.

### 2. Calibration axle: axle size

An axle made of one-stud sections, each a little larger than the one before, with a normal bevelled end at the small
end and a stop at the large end. Print or cut it exactly as you will make real axles (same orientation, too), so the
cross comes out the way theirs will.

1. Slide the small end into a genuine axle hole: a gear, a bush, an axle connector or a beam's axle hole.
2. Push it on, section by section. Each section is one stud (8 mm) long, so the hole is always on one section at a
   time.
3. The sections that are too small go in with play: the part wobbles or turns. The first one that is too large needs
   force or won't go in.
4. Choose the last section that goes in with light force and no play. In the app, pick it under **Result**: its
   value becomes your **Axle size**.

### 3. Pin calibration bar: pin diameter

Round stubs, the size of a pin's shaft, standing on a bar 16 mm apart, 8 mm tall. A pin without friction
should turn freely in a hole without wobbling, and so should a printed one.

1. Slide the hole of a genuine beam over each stub; a short beam is easiest.
2. Too large a stub: the beam sticks or won't turn. Too small: it wobbles on the stub.
3. Choose the largest stub on which the beam turns freely.
4. In the app, pick it under **Result**: its value becomes your **Pin diameter**.

Friction pins use the same value: their ribs stand 0.1 mm above the shaft and grip by themselves. The stubs have no
lip or slots, so a printed snap pin also depends on how springy the material is: if its lip won't pass through a
hole, try plain ends or a slightly smaller pin diameter.

### 4. Collar calibration bar: collar diameter

Round buttons, each the size of a stop or collar, on a bar. A genuine collar seats in a counterbore with a little
play, and so should a printed one.

1. Lay a genuine beam across the bar with a counterbore over one button.
2. If the button fits, it drops into the counterbore and the beam lies flat on the bar. If it is too large, the beam
   rests on the button and rocks.
3. Choose the largest button that lets the beam lie flat with a little play.
4. In the app, pick it under **Result**: its value becomes your **Collar diameter**, which pins and axles both use.

The buttons are lower than the counterbore is deep, so only their diameter decides the fit.

### 5. Stud calibration bar: stud diameter

A bar with a row of studs 8 mm apart, each a slightly different diameter. A genuine brick grips a genuine stud
firmly but comes off by hand, and so should it grip a printed one. Print the bar as you will print bricks: studs up.

1. Press a genuine 1 × 1 plate or brick onto each stud. A 1 × 1 covers one stud, so it shows that stud's fit alone.
2. Too large a stud: the plate needs a hard push, won't go on fully, or the stud cracks. Too small: the plate comes
   off without effort, or falls off when you turn the bar over.
3. Put the same plate on a genuine brick to feel how it should hold. Choose the stud on which it holds most like
   that; if two are close, choose the smaller, which strains a print less.
4. In the app, pick it under **Result**: its value becomes your **Stud diameter**, which a half pin's stud and an
   axle's stud use as well.

### 6. Underside calibration bar: underside size

A plate two studs wide, its underside divided into 2 × 2 sections. Each section is the underside of a 2 × 2 plate, a
tube and the walls around it, made for a slightly different stud size: larger values leave more room for the studs.
Print the bar as you will print bricks, underside down, so its first layers come out as theirs do.

1. Stand a genuine 2 × 2 plate or brick on the table, studs up, and press one section of the bar onto it. Use a
   2 × 2: a larger part would reach into the next section.
2. Too small a section: it needs a hard push or won't go on. Too large: it comes off without effort, or the genuine
   part drops out when you turn the bar over.
3. Press a genuine 2 × 2 plate onto the same part to feel how it should hold. Choose the section that holds most
   like that; if two are close, choose the larger, which strains a print less.
4. In the app, pick it under **Result**: its value becomes your **Underside size**.

The sections test a tube and the walls together, which is how every part two or more studs wide grips. Narrower
parts grip with the walls and the bars between studs; the same setting moves them too.

To check that, **Download the check set** under **Result**: a 1 × 1, a 1 × 2 and a 2 × 2 brick and a 1 × 2 brick with
holes, made with your fit settings, in one file. Try each on genuine studs, put genuine bricks on them, and stack them
on each other. The 1 × 1 holds a stud with its walls alone and the 1 × 2 with its walls and a bar. Put a genuine pin
through the brick with holes: printed studs up, its hole lies across, unlike the hole bar's. If the 1 × 1 or the 1 × 2
holds noticeably more or less firmly than the 2 × 2, or the pin fits differently than in a printed beam, please report
it at <https://github.com/vegardw/building-block-parts/issues>: those parts may need a setting of their own.

### 7. Part width and height (if needed)

There is no calibration part for these; measure a beam instead. They matter when parts must fit between other parts
or lie side by side.

1. Make the step's test beam: five holes, at nominal size. Any full-height beam made with zero width and height
   settings will do.
2. Measure its width across the flat sides and its thickness along the holes, away from the ends.
3. In the app, enter the measurements under **Result**. It saves the differences from nominal with the opposite
   sign as your **Part width** and **Part height**. For example, a beam 7.30 mm wide is 0.10 mm too wide, so the
   part width becomes −0.10. A full-height beam is nominally 7.2 mm wide and 8 mm thick.

Width and height are separate because printers usually make different errors across the layers and through them.

## Getting a finer or wider result

If the best feature is at either end of a part, the right value may lie beyond it. When you pick a feature at an
end, the app offers to put its value in the middle: make the part again and test once more. You can also set the
**middle value** yourself, in the part's settings.

To resolve finer differences, put your first result in the middle and use a smaller step: for example, 5 features
per side at 0.02 mm cover ±0.10 mm around it.

Each calibration part has limits that keep the parts valid, counted from nominal, so the middle value moves the
whole range towards them: the hole bar's values must stay within ±0.6 mm (the counterbore wall must stay at least
0.2 mm thick), the calibration axle's and the pin, collar, stud and underside bars' within ±0.5 mm.

## Notes on manufacturing processes

General experience, not measured by this project:

- **Resin printers** tend to make holes small and outsides large: expect a positive hole diameter and underside
  size, and a zero or negative axle size, pin diameter, collar diameter and stud diameter. Results change with
  exposure settings, washing and curing.
  Snap pins can crack in brittle resins; plain ends avoid that.
- **Filament printers** also tend to make holes small and outsides large. Holes printed upright come out rounder
  than holes printed lying down. The first layer is often squeezed wider, which narrows the counterbore on the
  bottom face, widens the bottom edge and narrows a brick's underside where the studs go in; the slicer's elephant's
  foot compensation helps.
- **CNC machines** cut close to nominal when the CAM software compensates for the tool radius. Inside corners keep
  the tool's radius: on an axle, the corners between the arms fill in, which can stop the axle entering a genuine
  axle hole. Use the smallest practical tool, or a slightly negative axle size. A pin's slots are 0.8 mm wide; if
  they are impractical to cut, choose plain ends.

## When something doesn't fit

| Problem | Change |
|---|---|
| Pins or axles too tight in a beam's holes | increase the hole diameter |
| Pins wobble in a beam's holes | decrease the hole diameter |
| A collar or stop doesn't seat in a counterbore of a printed beam | increase the hole diameter, or decrease the collar diameter |
| An axle won't go into genuine axle holes | decrease the axle size |
| A gear turns on a printed axle | increase the axle size |
| A printed stop doesn't seat in a genuine counterbore | decrease the collar diameter |
| Beams too wide or too thick to fit between other parts | decrease the part width or height |
| A printed pin is too tight in genuine holes | decrease the pin diameter |
| A printed pin wobbles in genuine holes | increase the pin diameter |
| A printed snap pin's lip won't pass through a hole | decrease the pin diameter slightly, or choose plain ends |
| A printed pin's collar doesn't seat in a genuine counterbore | decrease the collar diameter |
| Genuine bricks fall off printed studs | increase the stud diameter |
| Genuine bricks won't go onto printed studs, or the studs crack | decrease the stud diameter |
| Printed bricks fall off genuine studs | decrease the underside size |
| Printed bricks won't go onto genuine studs, or they crack | increase the underside size |
