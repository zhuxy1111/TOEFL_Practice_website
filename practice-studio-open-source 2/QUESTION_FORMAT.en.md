# Question JSON format

Download the app's English template (`dist/templates/example-questions.en.json`) and edit it before importing. JavaScript files are not accepted. PDF import is a separate workflow that creates editable drafts.

The root is `{ "format": "practice-studio-questions", "version": 1, "questions": [...] }`, or simply a question array. Supplied format/version fields must match. Unknown fields are discarded.

| Field | Meaning |
|---|---|
| id | Unique ID, 1–64 characters; begin with a letter or digit, then letters, digits, underscores or hyphens. Existing IDs cannot be overwritten. |
| kind | `fill`, `daily`, `academic`, `email`, `discussion`, `repeat` or `interview` |
| title | Up to 160 characters; retained as entered, regardless of UI language |
| seconds | Integer from 10 to 7200. Per prompt for speaking; per set otherwise. Training defaults apply if omitted. |

## Writing

For `email` or `discussion`, `prompt` contains complete instructions and discussion materials, up to 20,000 characters. Email may also include `to` (up to 300) and `subject` (up to 500). All fields are plain text.

## Reading

For `daily` or `academic`, `passage` contains the reading material. `questions` contains 1–50 objects with `stem`, `options`, and optional `answer`.

Multiple-choice options must contain exactly four objects such as `{ "label": "A", "text": "Choice text" }`, labeled A, B, C, D in order. The answer is the corresponding letter. Use `options: []` for a text response and optionally supply a reference sentence. Blank or null keys are excluded from scoring. Reference text is compared ignoring case, punctuation and non-alphanumeric characters, for practice only.

## Word completion

For `fill`, use prefixes and underscores in `passage`, one underscore for each missing letter: `We ma__ a plan.` Supply complete words in order through `answers`, such as `["make"]`, or an empty array if no key is available. Prefixes and lengths must match. Gap positions are computed automatically; do not supply `gaps`.

## Speaking

For `repeat` or `interview`, `questions` contains 1–50 objects such as `{ "stem": "One complete sentence or interview prompt" }`. Playback uses browser speech synthesis. Recordings remain in the student's browser; remote audio and executable scripts are not imported.

## Limits

JSON files: up to 2 MB. Local library: up to 500 sets. Remote images, executable HTML/JavaScript and embedded PDF attachments are not accepted. Imported text is not translated when the UI language changes. The platform does not reproduce official adaptive testing, listening or sentence-building tasks.
