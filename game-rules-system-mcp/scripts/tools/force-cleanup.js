const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\Julian\\git\\syndicate-system\\game-rules-system-mcp\\game-data';
const dirsToDelete = ['rulebooks', 'reference', 'sessions'];

dirsToDelete.forEach(dir => {
    const fullPath = path.join(root, dir);
    if (fs.existsSync(fullPath)) {
        console.log(`Deleting ${fullPath}...`);
        try {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`Successfully deleted ${fullPath}`);
        } catch (err) {
            console.error(`Failed to delete ${fullPath}: ${err.message}`);
        }
    } else {
        console.log(`Directory ${fullPath} does not exist.`);
    }
});
