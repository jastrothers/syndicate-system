import * as fs from 'fs';
import * as path from 'path';

/**
 * Heuristic-based Balance Critic for Board Game Designs.
 * Extracts economic values and checks for common imbalances.
 */

async function analyzeBalance(targetPath: string) {
    if (!fs.existsSync(targetPath)) {
        console.error(`Error: Path not found at ${targetPath}`);
        process.exit(1);
    }

    let content = '';
    const stats = fs.statSync(targetPath);
    const absoluteTargetPath = path.resolve(targetPath);

    if (stats.isDirectory()) {
        const files = getAllFiles(absoluteTargetPath).filter(f => f.endsWith('.md') || f.endsWith('.json'));
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
                    // Use a recursive string extractor for robust matching in JSON rulebooks
                    content += '\n' + extractJsonStrings(json.sections || json);
                } catch (e) {
                    console.warn(`⚠️ Could not parse JSON file: ${file}`);
                }
            } else {
                content += '\n' + fs.readFileSync(file, 'utf-8');
            }
        }
    } else {
        content = fs.readFileSync(absoluteTargetPath, 'utf-8');
    }

    // Helper to recursively find all text content in a JSON rulebook
    function extractJsonStrings(obj: any): string {
        let text = '';
        if (typeof obj === 'string') return obj;
        if (Array.isArray(obj)) {
            return obj.map(extractJsonStrings).join('\n');
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (key === 'content' || key === 'title' || key === 'description') {
                    text += '\n' + obj[key];
                } else {
                    text += '\n' + extractJsonStrings(obj[key]);
                }
            }
        }
        return text;
    }

    console.log(`\nHeuristic Balance Analysis: ${path.basename(absoluteTargetPath)}`);
    console.log('-------------------------------------------');

    const findings: { severity: string, issue: string, recommendation: string }[] = [];

    // 1. Extract Action Point Economy
    const apMatch = content.match(/(\d+)\s*(?:Favor|Action Points|AP|energy|actions)\s*(?:per turn|each turn|per episode)/i);
    const apPerTurn = apMatch ? parseInt(apMatch[1]) : 0;

    if (apPerTurn > 0) {
        if (apPerTurn >= 5) {
            findings.push({
                severity: 'MEDIUM',
                issue: `High Action Pool (${apPerTurn} AP).`,
                recommendation: 'Verify if 5+ actions per turn leads to "analysis paralysis" or trivializes movement constraints.'
            });
        }
    }

    // 2. Variable Reward Variance (QA Recommendation)
    // Look for patterns like "Gain X Clout and Y Reputation" or "Solo: X, Shared: Y"
    const rewardPairs = content.matchAll(/(\d+)\s*(?:Clout|Reputation|Points|Tokens).*?(?:vs|or|and).*?(\d+)/gi);
    for (const pair of rewardPairs) {
        const v1 = parseInt(pair[1]);
        const v2 = parseInt(pair[2]);
        if (v1 > 0 && v2 > 0) {
            const ratio = Math.max(v1, v2) / Math.min(v1, v2);
            if (ratio > 5.0) {
                findings.push({
                    severity: 'HIGH',
                    issue: `Extreme Reward Variance: Ratio of ${ratio.toFixed(1)}x between similar state outcomes (${v1} vs ${v2}).`,
                    recommendation: 'Narrow the gap between high-success and baseline rewards to prevent early-game snowballing.'
                });
            }
        }
    }

    // 3. Trap Actions / Risk Analysis (QA Recommendation)
    // Look for Push-Your-Luck mechanics with high penalties
    const bustPenalty = content.match(/Bust:.*?(?:Lose|Penalty).*?(\d+)\s*(\w+)/i);
    const successReward = content.match(/Success:.*?(\d+)\s*(\w+)/i);
    if (bustPenalty && successReward) {
        const penaltyVal = parseInt(bustPenalty[1]);
        const rewardVal = parseInt(successReward[1]);
        if (penaltyVal >= rewardVal) {
            findings.push({
                severity: 'HIGH',
                issue: `Potential Trap Action: Bust penalty (${penaltyVal}) is >= max success reward (${rewardVal}).`,
                recommendation: 'Ensure the risk is proportional to the reward, or provide secondary benefits for "Busting".'
            });
        }
    }

    // 4. Static vs Dynamic Pricing
    if ((content.includes('Market') || content.includes('Bazaar')) && !content.includes('immediately')) {
        findings.push({
            severity: 'HIGH',
            issue: 'Market prices may only shift at end-of-turn (Static Pricing).',
            recommendation: 'Implement "Immediate Price Shifts" to prevent a single player from buying out the supply at the lowest price in one turn.'
        });
    }

    if (findings.length === 0) {
        console.log('✅ No obvious heuristic imbalances found.');
    } else {
        // De-duplicate findings based on issue string
        const uniqueFindings = Array.from(new Map(findings.map(f => [f.issue, f])).values());
        uniqueFindings.sort((a, b) => (a.severity === 'HIGH' ? -1 : 1)).forEach(f => {
            console.log(`\n[${f.severity}] ${f.issue}`);
            console.log(`   > REC: ${f.recommendation}`);
        });
    }
}

/**
 * Helper to get all files in a directory recursively.
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

const target = process.argv[2];
if (target) {
    analyzeBalance(target);
} else {
    console.log('Usage: npx ts-node balance_critic.ts <path-to-design-file>');
}
