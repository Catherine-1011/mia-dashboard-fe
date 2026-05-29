const fs = require('fs');
let content = fs.readFileSync('app/(admindashboard)/admindashboard/orders/page.tsx', 'utf8');

const regex1 = /\{\/\*\s*Customer \+ totals\s*\*\/\}[\s\S]*?<div className="flex items-center gap-6">([\s\S]*?)<div>\s*<Button\s*variant="outline"\s*size="sm"\s*className="flex items-center gap-1"/;
content = content.replace(regex1, '{/* Customer + totals */}\n                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-end flex-1 ml-auto">\n                    <div className="flex items-center gap-6"></div>\n                    <div>\n                      <Button\n                        variant="outline"\n                        size="sm"\n                        className="flex items-center gap-1"');

const regex2 = /<div className="flex items-center gap-4">\s*<div className="text-right">\s*<p className="text-xs font-semibold flex items-center justify-end gap-1 text-muted-foreground uppercase tracking-wider mb-1">\s*<ClipboardList className="h-3.5 w-3.5" \/> Customer/g;
content = content.replace(regex2, '<div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-end flex-1 ml-auto">\n                    <div className="flex items-center gap-6">\n                      <div className="text-right">\n                        <p className="text-xs font-semibold flex items-center justify-end gap-1 text-muted-foreground uppercase tracking-wider mb-1">\n                          <ClipboardList className="h-3.5 w-3.5" /> Customer');

const regex3 = /<Badge variant=\{getStatusBadgeVariant\(order\.status\)\} className="flex items-center gap-1">\s*<Hash className="h-3 w-3" \/> \{getStatusLabel\(order\.status\)\}\s*<\/Badge>\s*<\/div>\s*<div>\s*<Button variant="outline" size="sm" className="flex items-center gap-1" onClick=\{\(\) => router\.push/g;
content = content.replace(regex3, '<Badge variant={getStatusBadgeVariant(order.status)} className="flex items-center gap-1">\n                      <Hash className="h-3 w-3" /> {getStatusLabel(order.status)}\n                    </Badge>\n                    </div>\n                  </div>\n                  <div>\n                    <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => router.push');

fs.writeFileSync('app/(admindashboard)/admindashboard/orders/page.tsx', content);
