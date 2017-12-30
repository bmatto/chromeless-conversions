import { Chromeless } from 'chromeless'
import { Client } from 'pg'

const client = new Client()

const getReading = `
SELECT
  id as reading_id,
  passage
FROM readings
WHERE id = $1`

const getHighlights = `
SELECT
  student_response_id,
  reading_id as content_id,
  old_highlight as json,
  jsonb_array_length(old_highlight) as num_highlights
FROM  highlight_conversion
ORDER BY
  reading_id desc,
  student_response_id desc
LIMIT 1000 OFFSET nextval('seq_highlight_page') * 1000
`
const setHighlight = `
UPDATE highlight_conversion
SET errors = false,
new_highlight = $2
WHERE student_response_id = $1
`

const setError = `
UPDATE highlight_conversion
SET errors = $2
WHERE student_response_id = $1
`

const addPassage = highlights => {
  const highlighter = rangy.createHighlighter()

  highlights.forEach(
    ({ serialized_selection, highlight_type, id, highlight_selection }) => {

      if (typeof(serialized_selection) !== 'undefined') {
        highlighter.addClassApplier(
          rangy.createClassApplier('highlighted', {
            normalize: true,
            elementTagName: 'mark',
            elementProperties: {
              className: `highlight-type-${highlight_type}`
            },
            elementAttributes: {
              highlightId: id
            }
          })
        )

        const selection = rangy.deserializeSelection(
          serialized_selection,
          document.getElementById('highlight-area')
        )

        highlighter.highlightSelection('highlighted', {
          selection
        })
      }
    }
  )

  return highlighter.serialize()
}

async function run() {
  const chromeless = new Chromeless()
  await client.connect()

  var highlights
  var lesson = { rows: [{}] }
  do {
    highlights = await client.query(getHighlights)

    for (const {student_response_id, content_id, json, num_highlights} of highlights.rows) {
      var time = new Date();
      console.log(`${time} INPUT: ${student_response_id} #${num_highlights}`)

      if ( lesson.rows[0].reading_id != content_id) {
        lesson = await client.query(getReading, [content_id])
      }

      const { reading_id, passage } = lesson.rows[0]

      try {
        const serialized = await chromeless
          .setHtml(
            `<head>
              <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/rangy/1.3.0/rangy-core.min.js"></script>
              <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/rangy/1.3.0/rangy-classapplier.min.js"></script>
              <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/rangy/1.3.0/rangy-highlighter.min.js"></script>
              <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/rangy/1.3.0/rangy-serializer.min.js"></script>
            </head>
            <body>
              <div id="highlight-area">
                ${passage}
              </div>
            </body>`
          )
          .wait('div#highlight-area')
          .evaluate(addPassage, json)

        await client.query(setHighlight, [student_response_id, serialized])
        console.log(`  RESULT: ${student_response_id} ${serialized}`)
      }
      catch(err) {
        await client.query(setError, [student_response_id, true])
        console.log(`  ERROR: ${student_response_id} ${err.message}`)
      }
    }
  }
  while(highlights.rows.length > 1)

  console.log(`Shutting Down`)
  await chromeless.end()
  await client.end()
}

run().catch(console.error.bind(console))
