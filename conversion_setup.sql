drop table if exists highlight_conversion ;

create table highlight_conversion as
select
  id as student_response_id,
  student_assignment_id,
  answers_id as reading_id,
  (data->'highlights')::jsonb as old_highlight,
  null::varchar(5000) as new_highlight,
  null::boolean as errors
from student_responses
where answers_type = 'Reading'
and data::text not like '%highlight-area%'
and ((data->'highlights')::jsonb)->0 is not null
and deleted_at is null
order by id desc ;

create unique index idx_highlight_conversion
  on highlight_conversion (student_response_id);

create index idx_highlight_conversion_reading
  on highlight_conversion (reading_id, student_response_id);

drop sequence if exists seq_highlight_page;

create sequence seq_highlight_page
minvalue 0 start with 0 increment by 1;
