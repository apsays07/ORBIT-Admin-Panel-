import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      process.env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  const dbName = process.env.MONGODB_DATABASE || 'nexo';
  if (!uri) throw new Error('No URI');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const apps = await db.collection('applications').find({}).toArray();
  console.log('Total applications in DB:', apps.length);

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  let missingPanApps = 0;
  let xuserPanApps = 0;
  let invalidPanApps = 0;
  let genuineValidApps = 0;

  const problematicApps: any[] = [];

  for (const app of apps) {
    const pans = Array.isArray(app.panNumbers) ? app.panNumbers : [];
    if (pans.length === 0 || pans.every((p: string) => !p || p.trim() === '')) {
      missingPanApps++;
      problematicApps.push({ id: app.id, user: app.applicantName, ipo: app.ipoName, issue: 'EMPTY_PAN', pans, lots: app.numberOfPanCards });
    } else {
      for (const p of pans) {
        const clean = (p || '').trim().toUpperCase();
        if (clean.startsWith('XUSER')) {
          xuserPanApps++;
          problematicApps.push({ id: app.id, user: app.applicantName, ipo: app.ipoName, issue: 'XUSER_PAN', pans, lots: app.numberOfPanCards });
        } else if (!panRegex.test(clean)) {
          invalidPanApps++;
          problematicApps.push({ id: app.id, user: app.applicantName, ipo: app.ipoName, issue: 'INVALID_PAN', pans, lots: app.numberOfPanCards });
        } else {
          genuineValidApps++;
        }
      }
    }
  }

  console.log({
    missingPanApps,
    xuserPanApps,
    invalidPanApps,
    genuineValidApps,
    problematicCount: problematicApps.length
  });
  console.log('Problematic apps sample:');
  console.log(JSON.stringify(problematicApps.slice(0, 10), null, 2));

  await client.close();
}

main().catch(console.error);
