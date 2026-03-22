const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\Julian\\git\\syndicate-system\\game-rules-system-mcp\\game-data';

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    }
}

const games = fs.readdirSync(path.join(root, 'rulebooks')).filter(f => fs.statSync(path.join(root, 'rulebooks', f)).isDirectory());
const types = ['rulebooks', 'reference', 'sessions'];

console.log(`Found games: ${games.join(', ')}`);

games.forEach(game => {
    types.forEach(type => {
        const oldPath = path.join(root, type, game);
        const newPath = path.join(root, game, type);
        
        if (fs.existsSync(oldPath)) {
            ensureDir(newPath);
            const items = fs.readdirSync(oldPath);
            items.forEach(item => {
                const oldFile = path.join(oldPath, item);
                const newFile = path.join(newPath, item);
                console.log(`Moving ${oldFile} -> ${newFile}`);
                
                // Recursive move for directories (like version folders)
                if (fs.statSync(oldFile).isDirectory()) {
                    ensureDir(newFile);
                    const subItems = fs.readdirSync(oldFile);
                    subItems.forEach(subItem => {
                        fs.renameSync(path.join(oldFile, subItem), path.join(newFile, subItem));
                    });
                    fs.rmdirSync(oldFile);
                } else {
                    fs.renameSync(oldFile, newFile);
                }
            });
            fs.rmdirSync(oldPath);
        }
    });
});

console.log('Migration finished.');
