import { onCall } from 'firebase-functions/v2/https';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export const fetchJobs = onCall(async (request) => {
  const databaseId = process.env.NOTION_JOBS_DATABASE_ID;

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Show on Website',
      select: { equals: 'Yes' },
    },
    sorts: [{ property: 'Created', direction: 'descending' }],
  });

  const jobs = response.results.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      title: props.Title?.title?.[0]?.plain_text || 'Untitled',
      location: props.Location?.rich_text?.[0]?.plain_text || '',
      salary: props.Salary?.rich_text?.[0]?.plain_text || '',
      type: props.Type?.select?.name || '',
      industry: props.Industry?.select?.name || '',
      description: props.Description?.rich_text?.[0]?.plain_text || '',
      posted: page.created_time,
    };
  });

  return { jobs };
});
