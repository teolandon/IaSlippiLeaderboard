import { getPlayerDataThrottled } from './slippi'
import { GoogleSpreadsheet } from 'google-spreadsheet';
import * as syncFs from 'fs';
import * as path from 'path';
import util from 'util';
import * as settings from '../settings';
import { parse } from 'csv-parse/sync';

import { exec } from 'child_process';
const fs = syncFs.promises;
const execPromise = util.promisify(exec);

const CSV_FILE_PATH = path.join(__dirname, '../Iowa Ranked Slippi Leaderboard (Responses) - Form Responses 1.csv');

// try to get connect codes from Google Sheets
const getPlayerConnectCodesFromGoogleSheets = async (): Promise<string[] | null> => {
  try {
    console.log('Attempting to fetch data from Google Spreadsheet...');

    // import credentials
    let creds;
    try {
      creds = require('../creds.json');
    } catch (error) {
      console.log('Could not load Google credentials, will use CSV backup.');
      return null;
    }

    const doc = new GoogleSpreadsheet(settings.spreadsheetID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = (await sheet.getRows()).slice(1); // remove the csv header

    const codes = [...new Set(rows.map((r) => r._rawData[1]).filter(r => r !== ''))] as string[];
    console.log('Retrieved data from the google form!');

    return codes;
  } catch (error) {
    console.log('Error accessing Google Form:', error.message);
    console.log('Falling back to CSV file.');
    return null;
  }
};

// get connect codes from CSV
const getPlayerConnectCodesFromCSV = async (): Promise<string[]> => {
  try {
    console.log('Loading player data from CSV file...');

    const fileContent = await fs.readFile(CSV_FILE_PATH, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    // get codes from second column
    const connectCodes = records.map((record: any) => {
      const columnNames = Object.keys(record);
      if (columnNames.length >= 2) {
        return record[columnNames[1]];
      }
      return null;
    }).filter((code: string | null) => code && code.trim() !== '');

    // remove duplicates
    const uniqueCodes = [...new Set(connectCodes)] as string[];
    console.log('Successfully loaded data!');

    return uniqueCodes;
  } catch (error) {
    console.error('Error reading/parsing CSV:', error);
    return [];
  }
};

const getPlayerConnectCodes = async (): Promise<string[]> => {
  const googleSheetsCodes = await getPlayerConnectCodesFromGoogleSheets();
  if (googleSheetsCodes && googleSheetsCodes.length > 0) {
    return googleSheetsCodes;
  }
  return await getPlayerConnectCodesFromCSV();
};

const getPlayers = async () => {
  const codes = await getPlayerConnectCodes();
  console.log(`Found ${codes.length} player codes:`);

  // print each connect code
  codes.forEach((code, index) => {
    console.log(`${index + 1}. ${code}`);
  });

  const BATCH_SIZE = 5;
  const allPlayers = [];

  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(codes.length/BATCH_SIZE)}...`);
    const batchCodes = codes.slice(i, i + BATCH_SIZE);

    const batchData = batchCodes.map(code => getPlayerDataThrottled(code));
    const batchResults = await Promise.all(batchData.map(p => p.catch(e => e)));
    const validBatchResults = batchResults.filter(result => !(result instanceof Error));

    const batchPlayers = validBatchResults
      .filter((data: any) => data?.data?.getUser)
      .map((data: any) => data.data.getUser);

    allPlayers.push(...batchPlayers);
    console.log(`Batch complete. Processed ${batchPlayers.length}/${batchCodes.length} players successfully.`);
  }

  return allPlayers.sort((p1, p2) =>
    p2.rankedNetplayProfile.ratingOrdinal - p1.rankedNetplayProfile.ratingOrdinal);
};

async function main() {
  console.log('Starting player fetch...');
  try {
    const players = await getPlayers();
    if(!players.length) {
      console.log('Error fetching player data. Terminating.');
      return;
    }
    console.log(`Player fetch complete. Total players processed: ${players.length}`);

    // create data directory if needed
    const dataDir = path.join(__dirname, 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    const newFile = path.join(__dirname, 'data/players-new.json');
    const oldFile = path.join(__dirname, 'data/players-old.json');
    const timestamp = path.join(__dirname, 'data/timestamp.json');

    // check if the file exists before rename
    try {
      await fs.access(newFile);
      await fs.rename(newFile, oldFile);
      console.log('Renamed existing data file.');
    } catch {
      // if new file DNE then create an empty old file
      await fs.writeFile(oldFile, JSON.stringify([]));
    }

    await fs.writeFile(newFile, JSON.stringify(players));
    await fs.writeFile(timestamp, JSON.stringify({updated: Date.now()}));
    console.log('Wrote new data file and timestamp.');

    const rootDir = path.normalize(path.join(__dirname, '..'));
    console.log(rootDir);

    // check git status
    const { stdout, stderr } = await execPromise(`git -C ${rootDir} status --porcelain`);
    if(stdout || stderr) {
      console.log('Pending git changes... aborting deploy');
      return;
    }
    console.log('Deploying.');
    const { stdout: stdout2, stderr: stderr2 } = await execPromise(`npm run --prefix ${rootDir} deploy`);
    console.log(stdout2);
    if(stderr2) {
      console.error(stderr2);
    }
    console.log('Deploy complete.');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
