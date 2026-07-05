const fs = require('fs');

let content = fs.readFileSync('db-server.js', 'utf8');

// Replace transporter.sendMail blocks
content = content.replace(
  /await transporter\.sendMail\([\s\S]*?\);/g,
  `console.log("Simulación: Correo de notificación omitido.");`
);

// Replace mailTransporter.sendMail blocks
content = content.replace(
  /await mailTransporter\.sendMail\([\s\S]*?\);/g,
  `console.log("Simulación: Correo de notificación omitido.");`
);

// Comment out the transporter definition just to be clean
content = content.replace(
  /const mailTransporter = nodemailer\.createTransport\([\s\S]*?\);/g,
  `// const mailTransporter = nodemailer.createTransport({...});`
);

fs.writeFileSync('db-server.js', content);
console.log('db-server.js modified successfully');
