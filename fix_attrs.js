const fs = require('fs');
let content = fs.readFileSync('app/(admindashboard)/admindashboard/orders/page.tsx', 'utf8');

const regex = /\{item\.variantAttributes && Object\.keys\(item\.variantAttributes\)\.length > 0 && \([\s\S]*?<\/div>\s*\)\}\s*<p className="text-xs text-muted-foreground(?:\s+[^"]*)?">[\s\S]*?<\/p>/g;

content = content.replace(regex, (match) => {
  return '{item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (' +
         '\n                                <div className="flex flex-wrap gap-1.5 mt-1">' +
         '\n                                  {Object.entries(item.variantAttributes).map(([k, v]) => (' +
         '\n                                    <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-secondary/50 text-secondary-foreground border border-black/5 dark:border-white/10">' +
         '\n                                      <span className="text-muted-foreground mr-1 capitalize">{k}:</span> {v}' +
         '\n                                    </span>' +
         '\n                                  ))}' +
         '\n                                </div>' +
         '\n                              )}' +
         '\n                              <p className="text-[13px] font-medium text-muted-foreground mt-1">' +
         '\n                                \ \u00D7 {item.quantity}' +
         '\n                              </p>';
});

fs.writeFileSync('app/(admindashboard)/admindashboard/orders/page.tsx', content);
