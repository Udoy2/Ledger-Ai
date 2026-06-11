import { readFile } from 'fs/promises';
import path from 'path';

export default async function PitchPage() {
  const filePath = path.join(process.cwd(), 'docs', 'LedgerAI_Hackathon_Pitch.html');
  const html = await readFile(filePath, 'utf-8');

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

