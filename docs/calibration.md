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

The six fit settings (clearances) open with the **Fit settings** button at the top of the app, beside the section
tabs. Each value is a change to the nominal dimension in millimetres: positive makes the feature bigger, negative smaller. Lengths and the 8 mm
spacing of holes are never changed. Each part uses only the settings it needs: in the **Parts** section, the box
above the download button lists them, each marked as calibrated (with the date), set by hand or not calibrated.

| Setting | What it changes | Used by | Range |
|---|---|---|---|
| Hole diameter | the bore (4.8 mm) and the counterbore (6.2 mm) of every hole | beams | ±1 mm |
| Beam width | the width across the flat sides (7.2 mm) | beams | ±1 mm |
| Beam height | the thickness along the holes (8 mm, or 4 mm for a half-height beam) | beams | ±1 mm |
| Axle size | the axle's cross (4.8 mm tip to tip, 1.6 mm arms) and the stud on an axle with stud | axles, axle sides of pins | ±0.5 mm |
| Pin diameter | a pin's shaft (4.8 mm), its lips and friction ribs, and a half pin's stud | pins | ±0.5 mm |
| Collar diameter | collars and stops that sit in a counterbore (6.0 mm; 5.75 mm on a stop one stud in) | pins, axles | ±0.5 mm |

The settings apply to every part that uses them. When a part uses a setting that isn't zero, the downloaded file
name ends in "-adjusted".

They are kept in this browser only: another browser, another computer or clearing the site's data starts again from
zero. **Save to file** writes them to a small file, and **Load from file** reads one back, in this or another
browser. Keep a file for each machine and material, for example one for a resin printer and one for a CNC machine.
**Reset all to nominal** sets all six to zero. Loading and resetting can be undone straight away. These buttons are
in the fit settings and in the **Your fit settings** box at the top of the Calibrate section, which also says how
many settings are calibrated.

## What you need

- A few genuine parts to test against: pins without friction ribs, pins with friction ribs, an axle, a beam with
  counterbored holes, and a part with an axle hole, such as a gear, a bush or an axle connector.
- Calipers, if you want to correct the beam width and height.
- Print or cut every calibration part with the same machine, material, settings and orientation you will use for
  real parts. Test resin parts after washing and full curing, and filament parts after they have cooled.

## How calibrating works in the app

The **Calibrate** section has a step for each setting: four with a calibration part, and one where you measure a
beam for the width and height. Each step tests against genuine parts, so the steps don't depend on each other: do
them in any order, and come back to a step after printing. The list of steps shows which settings are calibrated.

Each step has three parts:

1. **Make**: set up the step's part, see it in 3D and download it, as a STEP file or, for a slicer that doesn't open
   STEP, an STL file. **Download all four calibration parts** puts the four calibration parts side by side in one
   file, for one print job.
2. **Test**: the instructions for the part, the same as in the sections below.
3. **Result**: the part's features, drawn in the same order as on the part, with their values. Pick the one that
   fits best and save it: it becomes your fit setting, marked as calibrated with today's date.

## How the calibration parts work

There are four calibration parts, one for each setting you are most likely to need: three bars and a calibration
axle. They all work the same way:

- Each has a row of features, each made with a different value. The middle one has the **middle value**, which is
  0 (nominal) unless you change it.
- On the bars, smaller values are towards the **flat end** and larger values towards the **rounded end**, and two
  small **tabs** on the sides mark the middle feature. On the calibration axle, the sections get larger from the
  **small end** to the **stop**.
- With the default settings the values run from −0.20 to +0.20 mm in 0.05 mm steps, so there are nine features.
  The note under the part's settings gives the range.
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

### 5. Beam width and height (if needed)

There is no calibration part for these; measure a beam instead. They matter when beams must fit between other parts
or lie side by side.

1. Make the step's test beam: five holes, at nominal size. Any full-height beam made with zero width and height
   settings will do.
2. Measure its width across the flat sides and its thickness along the holes, away from the ends.
3. In the app, enter the measurements under **Result**. It saves the differences from nominal with the opposite
   sign as your **Beam width** and **Beam height**. For example, a beam 7.30 mm wide is 0.10 mm too wide, so the
   beam width becomes −0.10. A full-height beam is nominally 7.2 mm wide and 8 mm thick.

Width and height are separate because printers usually make different errors across the layers and through them.

## Getting a finer or wider result

If the best feature is at either end of a part, the right value may lie beyond it. When you pick a feature at an
end, the app offers to put its value in the middle: make the part again and test once more. You can also set the
**middle value** yourself, in the part's settings.

To resolve finer differences, put your first result in the middle and use a smaller step: for example, 5 features
per side at 0.02 mm cover ±0.10 mm around it.

Each calibration part has limits that keep the parts valid, counted from nominal, so the middle value moves the
whole range towards them: the hole bar's values must stay within ±0.6 mm (the counterbore wall must stay at least
0.2 mm thick), the calibration axle's and the pin and collar bars' within ±0.5 mm.

## Notes on manufacturing processes

General experience, not measured by this project:

- **Resin printers** tend to make holes small and outsides large: expect a positive hole diameter and a zero or
  negative axle size, pin diameter and collar diameter. Results change with exposure settings, washing and curing.
  Snap pins can crack in brittle resins; plain ends avoid that.
- **Filament printers** also tend to make holes small and outsides large. Holes printed upright come out rounder
  than holes printed lying down. The first layer is often squeezed wider, which narrows the counterbore on the
  bottom face and widens the bottom edge; the slicer's elephant's foot compensation helps.
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
| Beams too wide or too thick to fit between other parts | decrease the beam width or height |
| A printed pin is too tight in genuine holes | decrease the pin diameter |
| A printed pin wobbles in genuine holes | increase the pin diameter |
| A printed snap pin's lip won't pass through a hole | decrease the pin diameter slightly, or choose plain ends |
| A printed pin's collar doesn't seat in a genuine counterbore | decrease the collar diameter |
