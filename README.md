# The Soul of the Harmonium: scroll-driven storytelling site

One harmonium travels right, left, right, left, right, left and finally to the centre as you scroll through
seven sections: introduction, history, anatomy, mechanism, playing, culture and a finale.
Plain HTML, CSS and vanilla JavaScript, with GSAP + ScrollTrigger for the scroll animation.

```
harmonium-site/
├── index.html            page structure, content, the inline harmonium illustration
├── style.css             design tokens, layout, components, responsive rules, fallbacks
├── script.js             scroll engine, hotspots, airflow diagram, Web Audio keyboard
└── assets/
    ├── harmonium.svg     the same illustration as a standalone file (reuse it anywhere)
    └── vendor/           local copies of gsap.min.js and ScrollTrigger.min.js (GSAP 3.12.5)
```

## Run it

No build step and no dependencies to install.

* **Quickest:** double-click `index.html`.
* **Local server (recommended):** from this folder run `python3 -m http.server 8000`
  (or `npx serve`) and open <http://localhost:8000>.

Google Fonts (Cormorant Garamond + Inter) load when you are online; offline, the page falls back to
Georgia and the system sans-serif and everything still works.

## Using your own harmonium photo (optional)

The page ships with a hand-built SVG harmonium so it works with no external image. To use a photo:

1. Export a **transparent-background PNG or WebP** of a harmonium in three-quarter view, about 1600 px wide.
2. Save it as `assets/harmonium.webp` (or `.png`).
3. In `script.js`, section 2, set `var PHOTO_SRC = 'assets/harmonium.webp';`.
4. Adjust the `photo: [x%, y%]` values in the `PARTS` array so the seven anatomy hotspots sit on the
   right parts of your picture.

If the photo fails to load, the built-in illustration stays in place.

## How the scroll animation works (also commented in `script.js`, section 5)

* There is exactly **one** instrument, inside a fixed stage. Only its transform changes (x, y, scale,
  tilt, and a small yaw that turns it toward the text). It is never duplicated or swapped.
* Each section has a *pose*. For every pair of neighbouring sections, one **segment** is added to a
  **single master GSAP timeline** whose time unit is scroll pixels. A ScrollTrigger scrubs that
  timeline, so the animation follows the scrollbar in both directions.
* Inside each segment: the instrument glides to its next pose, a gentle depth swell plays, the
  outgoing text fades, blurs and lifts away early, and the incoming text arrives late with its
  children staggering in. The instrument crosses the centre while both columns are nearly empty,
  so it never collides with copy.
* One master timeline (instead of one per segment) keeps the page correct when the scroll position
  jumps: deep links like `index.html#culture`, dragging the scrollbar, nav clicks, Home/End.
* Native scrolling is never hijacked: no wheel interception, no scroll snapping.
* Theme colours (ivory → cream → walnut → charcoal) cross-fade via registered CSS custom properties.

### Fallbacks

| Situation | What happens |
|---|---|
| GSAP files missing | `script.js` tries `assets/vendor/`, then the cdnjs CDN, then switches to CSS-only mode |
| `prefers-reduced-motion` | no scrubbing, parallax or float; the instrument eases between CSS positions and text simply fades in |
| JavaScript off | all copy stays readable; the anatomy list shows as plain text |
| Phones / narrow screens (≤ 860 px) | the instrument sits in a fixed band under the header and drifts slightly left and right; text scrolls beneath a soft veil |

## Features checklist

Scroll progress bar · section dots · active-section nav highlight · mobile menu · timeline ·
7 interactive anatomy hotspots with an explanation card · animated airflow diagram (press/release the key) ·
playable on-screen keyboard (mouse, touch, or computer keys) with a synthesised reed tone (Web Audio, no audio files) ·
bellows "air" meter (press **B** or the Pump button) · three practice melodies (scale, alankar, Bhupali) ·
"Explore the Instrument", "Explore Again" and "Back to Top" buttons.

**Keyboard controls (Play section):** `A S D F G H J K L ;` = white keys, `W E T Y U O P` = black keys, `B` = pump.
In the demo, Sa is C. In real practice, Sa is movable.

## Content sources

History and technical points were checked against published sources, including the Wikipedia articles on the
[Indian harmonium](https://en.wikipedia.org/wiki/Indian_harmonium) and [pump organ](https://en.wikipedia.org/wiki/Pump_organ),
[The National (2023)](https://thenationalnews.com/arts-culture/music-stage/2023/07/05/how-the-harmonium-travelled-from-france-to-become-a-part-of-indian-music/),
the [Ananda harmonium overview](https://www.ananda.org/a-brief-tour-of-the-harmonium/), and
[The Tribune's report on the SGPC and harmonium (2022)](https://www.tribuneindia.com/news/amritsar/sgpc-no-plans-to-phase-out-harmonium-for-now-398805).
Where sources disagree (for example the exact years of the All India Radio restriction, or who first made the
hand-pumped Indian model) the page says so or uses cautious wording. Please review the text before publishing it
under your name.

## Credits and licences

* GSAP and ScrollTrigger © GreenSock, used under the GSAP standard licence (free for most uses; see greensock.com/standard-license).
* Fonts: Cormorant Garamond and Inter (SIL Open Font Licence) via Google Fonts.
* The harmonium illustration and all code in this folder were generated for this project.
