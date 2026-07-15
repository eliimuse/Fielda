const fs = require('fs');
let code = fs.readFileSync('src/components/MobilityNavigator.tsx', 'utf8');

const oldCode = `    // Formulate turn-by-turn steps
    if (isEmergencyMode) {
      steps.push(\`⚠️ EVACUATION ACTIVE: Move away from \${startNode.name}.\`);
      steps.push(\`Follow emergency lights down the main corridor.\`);
      steps.push(\`Exit stadium safely via \${destNode.name}.\`);
    } else {
      steps.push(\`Enter via \${startNode.name}\${wheelchair ? ' (ADA Priority Gate).' : '.'}\`);`;

const newCode = `    // Formulate turn-by-turn steps
    const isEvacuation = isEmergencyMode && (startNode.name.includes('🚨') || destNode.name.includes('🚨'));
    
    if (isEvacuation) {
      steps.push(\`⚠️ EVACUATION ACTIVE: Move away from \${startNode.name.replace('🚨 ', '')}.\`);
      steps.push(\`Follow emergency lights down the main corridor.\`);
      steps.push(\`Exit stadium safely via \${destNode.name.replace('🚨 ', '')}.\`);
    } else {
      steps.push(\`Enter via \${startNode.name.replace('🚨 ', '')}\${wheelchair ? ' (ADA Priority Gate).' : '.'}\`);`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/MobilityNavigator.tsx', code);
