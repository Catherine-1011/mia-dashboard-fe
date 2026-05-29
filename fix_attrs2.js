const fs = require('fs');
let content = fs.readFileSync('app/(admindashboard)/admindashboard/orders/page.tsx', 'utf8');

const regex = /<p className="text-\[13px\] font-medium text-muted-foreground mt-1">\s*× \{item\.quantity\}\s*<\/p>/g;

content = content.replace(regex, '<p className="text-[13px] font-medium text-muted-foreground mt-1">$' + '{parseFloat(item.price).toLocaleString()} × {item.quantity}</p>');

fs.writeFileSync('app/(admindashboard)/admindashboard/orders/page.tsx', content);
