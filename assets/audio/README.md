# Sound recording provenance

The soundboard bundles these purpose-recorded effects so each pad is recognizable from its label. All files are unmodified 128 kbps MP3 preview encodings downloaded from Freesound and indexed as [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) by Openverse. CC0 does not require attribution; the source record is retained here for auditability and thanks.

| App sound | File | Creator | Freesound source |
| --- | --- | --- | --- |
| Horse Whinny | `horse-whinny.mp3` | foxen10 | [Horse_Whinny.wav](https://freesound.org/people/foxen10/sounds/149024/) |
| Horse Snort | `horse-snort.mp3` | o_ciz | [Horse(snort)_2.wav](https://freesound.org/people/o_ciz/sounds/475479/) |
| 30s Gallop | `gallop.mp3` | HebronTheatre | [Horse Gallop - Loopable.mp3](https://freesound.org/people/HebronTheatre/sounds/197212/) |
| Clown Horn | `clown-horn.mp3` | Gimp_Revival | [Clown Horn (Single Honk).wav](https://freesound.org/people/Gimp_Revival/sounds/588570/) |
| Sad Horn | `sad-horn.mp3` | kirbydx | [wah wah sad trombone.wav](https://freesound.org/people/kirbydx/sounds/175409/) |
| Engine Rev | `engine-rev.mp3` | Janosch-JR | [V12 Engine - Short Rev](https://freesound.org/people/Janosch-JR/sounds/484191/) |
| Muscle Rev | `muscle-rev.mp3` | FlaxGod | [Muscle Car Revving](https://freesound.org/people/FlaxGod/sounds/653226/) |
| Burnout | `burnout.mp3` | audible-edge | [Nissan Maxima burnout](https://freesound.org/people/audible-edge/sounds/71740/) |
| Squeaky Toy | `squeaky-toy.mp3` | Breviceps | [Squeaky Toy #4](https://freesound.org/people/Breviceps/sounds/483922/) |
| Kitten Meow | `kitten-meow.mp3` | Breviceps | [Cute Kitten Meow](https://freesound.org/people/Breviceps/sounds/448084/) |
| Cat Yowl | `cat-yowl.mp3` | HenKonen | [Cat Yowl 5.wav](https://freesound.org/people/HenKonen/sounds/682082/) |
| Circus Time | `circus.mp3` | Audeption | [Carnival fanfare (short)](https://freesound.org/people/Audeption/sounds/418525/) |
| Big Reveal | `big-reveal.mp3` | jimhancock | [TaDa!.aif](https://freesound.org/people/jimhancock/sounds/256128/) |

The gallop recording is designed to loop. The player loops it beneath the existing state machine, stopping after exactly thirty seconds for a normal pad tap or continuing until explicitly stopped in loop mode.

## Release listening check

Before deployment, play every row above on a phone speaker and confirm:

- the sound is immediately recognizable from the app label;
- it begins without a clipped attack or excessive delay;
- its loudness is usable and not startling relative to neighboring pads;
- there is no unintended speech, watermark, or unrelated background sound.

Also verify both browser-generated spoken phrases separately. “Howdy partner” must use a generic device voice and must not imitate a named performer.
