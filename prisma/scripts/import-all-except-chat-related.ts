/**
 * @fileoverview
 * Runs the CSV import commands in proper dependency order.
 * 
 * To run:
 *    npx ts-node prisma/import-all-except-chat-related.ts
 */
import { execSync } from 'child_process';

const commandsExceptChatRelated = [
    'npx ts-node prisma/scripts/import-from-csv.ts Category ./prisma/exports/export-Category.csv',
    'npx ts-node prisma/scripts/import-from-csv.ts User ./prisma/exports/export-User.csv',
    'npx ts-node prisma/scripts/import-from-csv.ts Persona ./prisma/exports/export-Persona.csv',
    'npx ts-node prisma/scripts/import-from-csv.ts Settings ./prisma/exports/export-Settings.csv',
    'npx ts-node prisma/scripts/import-from-csv.ts SettingsSwitch ./prisma/exports/export-SettingsSwitch.csv',
    'npx ts-node prisma/scripts/import-from-csv.ts Problem ./prisma/exports/export-Problem.csv',
    'npx ts-node prisma/scripts/import-from-csv.ts Transcript ./prisma/exports/export-Transcript.csv',
    'npx ts-node prisma/scripts/import-from-csv.ts ChatTemplate ./prisma/exports/export-ChatTemplate.csv',
    'npx ts-node prisma/scripts/import-from-csv.ts ChatTemplateProblem ./prisma/exports/export-ChatTemplateProblem.csv',
];

(async () => {
    for (const command of commandsExceptChatRelated) {
        try {
          console.log(`🔄 Running: ${command}`);
          execSync(command, { stdio: 'inherit' });
          console.log(`✅ Completed: ${command}`);
        }
        catch (error) {
          console.error(`❌ Command failed: ${command}`);
          throw error; // rethrow to stop the entire process
        }
    }
})();
