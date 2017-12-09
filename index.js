import { Chromeless } from 'chromeless'
import { Client } from 'pg'

const client = new Client()

const getlesson = `
select l.id, l.content_id, r.passage
from lessons l
inner join readings r on r.id = l.reading_id
where l.lesson_type in (1,2,4,7)
and l.id = 16327
order by l.id
`

const getHighlights = `
select sr.student_assignment_id, sr.id,((sr.data->'highlights')::text)::json
from  assignments a
inner join student_assignments sa
on sa.assignment_id = a.id
inner join student_responses sr
on sr.student_assignment_id = sa.id
AND sr.answers_type = 'Reading'
WHERE a.lesson_id = 16327
`

const addPassage = highlights => {
  const highlighter = rangy.createHighlighter()

  highlights.forEach(
    ({ serialized_selection, highlight_type, id, highlight_selection }) => {
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
  )

  return highlighter.serialize()
}

async function run() {
  const chromeless = new Chromeless()

  await client.connect()

  const lesson = await client.query(getlesson)
  const highlights = await client.query(getHighlights)
  const { passage } = lesson.rows[0]
  const { json } = highlights.rows[0]

  const serialized = await chromeless
    .setHtml(
      `<head><script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/rangy/1.3.0/rangy-core.min.js"></script>
      <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/rangy/1.3.0/rangy-classapplier.min.js"></script>
      <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/rangy/1.3.0/rangy-highlighter.min.js"></script>
      <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/rangy/1.3.0/rangy-serializer.min.js"></script>
      </head><body><div id="highlight-area">${passage}</div></body>`
    )
    .wait('div#highlight-area')
    .evaluate(addPassage, json)

  console.log(serialized)

  await chromeless.end()
  await client.end()
}

run().catch(console.error.bind(console))
