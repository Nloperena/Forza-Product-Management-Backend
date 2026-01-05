import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const LOG_PATH = 'e:\\Downloads\\01_Projects\\WebProjects\\PMST\\.cursor\\debug.log';

function logSync(message: string, data: any, hypothesisId: string) {
  const payload = {
    location: 'debug_git_conflicts.ts',
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-git-session',
    runId: 'initial-probe-v2',
    hypothesisId
  };
  
  try {
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(LOG_PATH, JSON.stringify(payload) + '\n');
    console.log(`[DEBUG] ${message}`);
  } catch (e: any) {
    console.error(`[DEBUG ERROR] Failed to write to log: ${e.message}`);
  }
}

async function runDiagnostics() {
  console.log('🚀 Starting Git diagnostics...');

  // #region agent log: Check git status
  try {
    const status = execSync('git status', { encoding: 'utf-8' });
    logSync('Git Status Output', { status }, 'D');
  } catch (e: any) {
    logSync('Git Status Error', { error: e.message }, 'D');
  }
  // #endregion

  // #region agent log: Check conflicts in JSON
  try {
    // Show the conflict markers in the JSON file
    // Note: use git diff --name-only to find the actual paths in the root
    const jsonConflicts = execSync('git diff', { encoding: 'utf-8' });
    logSync('Full Diff (truncated)', { diff: jsonConflicts.substring(0, 2000) }, 'A');
  } catch (e: any) {
    logSync('Diff Error', { error: e.message }, 'A');
  }
  // #endregion

  // #region agent log: Check path discrepancy
  try {
    const lsScripts = execSync('dir /s /b updateProductImageNames.ts', { encoding: 'utf-8' });
    logSync('Path search for script', { result: lsScripts }, 'C');
  } catch (e: any) {
    logSync('Path search error', { error: e.message }, 'C');
  }
  // #endregion
}

runDiagnostics();
