import { Chromeless } from 'chromeless'
import { Client } from 'pg'

const client = new Client()

const getlesson = `
select l.id, l.content_id, r.passage
from lessons l
inner join readings r on r.id = l.reading_id
where l.lesson_type in (1,2,4,7)
and l.id = 17654
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
WHERE a.lesson_id = 17654
`

async function run() {
  client.connect().then(() => {
    client.query(
      'SELECT l.id, r.passage FROM lessons l inner join readings r on r.id = l.reading_id WHERE l.lesson_type = 1 LIMIT 10',
      (err, res) => {
        if (err) {
          console.log(err.stack)
        } else {
          const { passage } = res.rows[0]

          const chromeless = new Chromeless()

          chromeless
            .evaluate(
              passage => {
                const doc = new DOMParser().parseFromString(
                  passage,
                  'text/html'
                )

                document.body.appendChild(doc.body)
              },
              [passage]
            )
            .then(() => {
              chromeless.screenshot().then(screenshot => {
                console.log(screenshot)
                chromeless.end()
              })
            })

          // prints local file path or S3 url
        }
      }
    )
  })
}

run().catch(console.error.bind(console))
