import * as fs from 'fs';
import * as path from 'path';

/**
 * Advanced consistency checker for board game designs.
 * Parses component manifests and verifies their usage in the rules.
 */

async function checkConsistency(targetPath: string) {
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

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Extract Components Manifest
    const componentRegex = /[-*]?\s*(\d+)\s+([A-Za-z0-9\s]+?)(?:\s*[:(].*|\s*$)/gm;
    const components: { count: number, name: string }[] = [];
    let match;
    
    const componentsSectionStart = content.search(/#+\s*(?:Components|Pieces|Manifest)/i);
    const rulesSectionStart = content.search(/#+\s*(?:Rules|Gameplay|Turn Structure)/i);
    
    const componentsText = (componentsSectionStart !== -1 && rulesSectionStart !== -1) 
        ? content.substring(componentsSectionStart, rulesSectionStart)
        : content;

    while ((match = componentRegex.exec(componentsText)) !== null) {
        components.push({
            count: parseInt(match[1]),
            name: match[2].trim()
        });
    }

    if (components.length === 0) {
        warnings.push('No obvious component manifest found (e.g., "12 Sector Tiles").');
    }

    // 2. Verify Component Usage in Rules
    const rulesText = (rulesSectionStart !== -1) ? content.substring(rulesSectionStart) : content;
    
    components.forEach(comp => {
        const singular = comp.name.replace(/s$/, '').trim();
        const usageRegex = new RegExp(`\\b${singular}(s)?\\b`, 'i');
        
        if (!usageRegex.test(rulesText)) {
            warnings.push(`Component "${comp.name}" is defined but never mentioned in the rules section.`);
        }
    });

    // 3. Look for "Mystery Components" in Rules
    const mysteryRegex = /(\d+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    const ignoreTerms = ['Step', 'Turn', 'Phase', 'Favor', 'AP', 'Baddie', 'Episode', 'Reputation'];
    while ((match = mysteryRegex.exec(rulesText)) !== null) {
        const count = match[1];
        const name = match[2];
        const alreadyKnown = components.some(c => name.toLowerCase().includes(c.name.toLowerCase().replace(/s$/, '').trim()));
        
        if (!alreadyKnown && !ignoreTerms.some(term => name.toLowerCase().includes(term.toLowerCase().replace(/s$/, '')))) {
            warnings.push(`Rules mention "${count} ${name}", but this is not clearly defined in the Components section.`);
        }
    }

    console.log(`\nAdvanced Consistency Report: ${path.basename(absoluteTargetPath)}`);
    console.log('-------------------------------------------');
    
    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ Design matches manifest perfectly.');
    } else {
        errors.forEach(err => console.log(`❌ ERROR: ${err}`));
        warnings.forEach(warn => console.log(`⚠️ WARNING: ${warn}`));
    }
    
    process.exit(errors.length > 0 ? 1 : 0);
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

const targetFile = process.argv[2];
if (targetFile) {
    checkConsistency(targetFile);
} else {
    console.log('Usage: npx ts-node consistency_checker.ts <path-to-design-file>');
}
