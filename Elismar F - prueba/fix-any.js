const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace `catch (error: any) {` and handle `error.message`
    content = content.replace(/catch \((error|err): any\) \{/g, "catch ($1) {\n      const errorObj = $1 as Error;");
    // However, error/err might be used as `error.message`. Let's just do a simpler fix for eslint:
    // Add eslint-disable for line
    content = original.replace(/catch \((error|err): any\) \{/g, "// eslint-disable-next-line @typescript-eslint/no-explicit-any\n    catch ($1: any) {");

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
