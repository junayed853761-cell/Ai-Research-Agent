import fs from 'fs';

let content = fs.readFileSync('src/pages/SavedReports.tsx', 'utf8');

// Ensure proper React imports
if (!content.includes("import React, { useState } from 'react';")) {
    if (content.includes("import React, { useState, useEffect } from 'react';")) {
        // do nothing
    } else if (content.includes("import React, { useState")) {
        content = content.replace(/import React, { useState.*? } from 'react';/, "import React, { useState, useEffect } from 'react';");
    } else {
        content = "import React, { useState, useEffect } from 'react';\n" + content;
    }
} else {
    content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';");
}
fs.writeFileSync('src/pages/SavedReports.tsx', content);

content = fs.readFileSync('src/pages/History.tsx', 'utf8');
if (!content.includes("import React, { useState } from 'react';") && !content.includes("import React, { useState, useEffect } from 'react';")) {
    content = "import React, { useState, useEffect } from 'react';\n" + content;
} else if (content.includes("import React, { useState } from 'react';")) {
    content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';");
}
fs.writeFileSync('src/pages/History.tsx', content);

console.log("fixed imports");
