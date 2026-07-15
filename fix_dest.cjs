const fs = require('fs');
let code = fs.readFileSync('src/components/MobilityNavigator.tsx', 'utf8');

code = code.replace(/steps\.push\(\`Arrive at \$\{destNode\.name\}\.\`\);/g, "steps.push(`Arrive at ${destNode.name.replace('🚨 ', '')}.`);");

fs.writeFileSync('src/components/MobilityNavigator.tsx', code);
