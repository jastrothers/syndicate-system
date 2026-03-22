import * as fs from 'fs';
import * as path from 'path';

/**
 * Session Manager for Board Game Design Workflows.
 * Handles directory creation and step-based logging in 'game-data/'.
 */

const BASE_DIR = path.resolve('game-data');

function initSession(gameSlug: string, theme: string) {
    const targetDir = path.join(BASE_DIR, gameSlug, 'design');

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const summaryPath = path.join(targetDir, 'process-summary.md');
    if (!fs.existsSync(summaryPath)) {
        fs.writeFileSync(summaryPath, `# Process Summary: ${gameSlug}\n\nTheme: ${theme}\n\n`);
    }

    console.log(`Initialized design logs in: ${targetDir}`);
    return targetDir;
}

function logStep(gameSlug: string, step: number, content: string, isSummary: boolean = false) {
    const targetDir = path.join(BASE_DIR, gameSlug, 'design');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    if (isSummary) {
        const summaryPath = path.join(targetDir, 'process-summary.md');
        const timestamp = new Date().toLocaleTimeString();
        const summaryEntry = `### Step ${step} - ${timestamp}\n\n${content}\n\n---\n\n`;
        fs.appendFileSync(summaryPath, summaryEntry);
        console.log(`Appended summary for step ${step} to process-summary.md`);
        return;
    }

    const fileName = `step${step}-log.md`;
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, content);
    console.log(`Saved step ${step} to ${fileName}`);
}

async function main() {
    const args = process.argv.slice(2);
    const cmd = args[0];

    try {
        if (cmd === 'init') {
            const gameSlug = args[1] || 'undated-game';
            const theme = args[2] || 'No theme provided';
            initSession(gameSlug, theme);
        } else if (cmd === 'log') {
            const gameSlug = args[1];
            const step = parseInt(args[2]);
            const isSummary = args[3] === '--summary';
            const content = args.slice(isSummary ? 4 : 3).join(' ');
            logStep(gameSlug, step, content, isSummary);
        } else {
            console.log('Usage:');
            console.log('  ts-node session_manager.ts init <gameSlug> <theme>');
            console.log('  ts-node session_manager.ts log <gameSlug> <step_number> [--summary] <content>');
        }
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

main();
