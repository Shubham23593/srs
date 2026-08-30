/**
 * Multilingual semantic lexicon.
 *
 * Maps surface forms (English, Devanagari Hindi, romanized Hindi/Hinglish,
 * Marathi Devanagari and romanized Marathi) to canonical English concepts and
 * capability intents. This lets the deterministic semantic engine understand
 * meaning regardless of input language or script, while the LLM (when
 * available) performs the same job at higher quality.
 */

// --- Script detection ---
const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN = /[A-Za-z]/;

// Marathi-specific Devanagari markers / words (also used in Hindi but these are strongly Marathi)
const MARATHI_DEV_MARKERS = [
  'पाहिजे', 'पाहिजेत', 'करू शकतो', 'करू शकते', 'शकतो', 'शकते',
  'करता', 'नाही', 'वापरकर्ता', 'प्रणाली', 'माहिती', 'खाते',
  'अहवाल', 'अंदाजपत्रक', 'सुरक्षित', 'जलद', 'वेगवान'
];

// Romanized Marathi markers
const MARATHI_ROMAN_MARKERS = [
  'pahije', 'pahijet', 'shakto', 'shakte', 'karu shakto', 'karu shakte',
  'baghta', 'bagh', 'karta ale', 'karat aale', 'pahijet', 'aahe', 'ahe',
  'vaparkarta', 'pranali', 'mahiti', 'khate', 'ahwal', 'andajpatrak'
];

// Romanized Hindi / Hinglish markers
const HINGLISH_MARKERS = [
  'mujhe', 'muje', 'chahiye', 'chahie', 'karna', 'karega', 'hoga', 'banana',
  'hona', 'kaise', 'jisme', 'apne', 'apna', 'apni', 'bhi', 'kare', 'karein',
  'sakta', 'sakti', 'sakte', 'wala', 'wali', 'karo', 'hota', 'hoti', 'rahega',
  'nahi', 'nahin', 'kuch', 'aur', 'hai', 'hain', 'ho', 'hun', 'kar', 'dekh',
  'dekhna', 'add', 'na', 'ko', 'se', 'mein', 'me', 'par', 'liye', 'sake',
  'chahida', 'karni', 'karte', 'karti', 'karta', 'honi', 'hon', 'dikhana',
  'mil', 'sab', 'sabhi', 'pata', 'lagana', 'rakhna', 'dena', 'lena', 'bhej'
];

const HINDI_DEV_MARKERS = [
  'चाहिए', 'करना', 'सकता', 'सकते', 'होना', 'होगा', 'नहीं', 'अपने',
  'उपयोगकर्ता', 'सिस्टम', 'प्रणाली', 'मासिक', 'रिपोर्ट', 'खाते', 'व्यय',
  'सुरक्षित', 'तेज़', 'तेज', 'लॉगिन', 'पासवर्ड'
];

// Pure stopwords (multilingual) for tokenization
const STOPWORDS = new Set([
  'the', 'a', 'an', 'should', 'must', 'shall', 'to', 'of', 'and', 'or',
  'is', 'are', 'be', 'can', 'could', 'would', 'will', 'may', 'might',
  'in', 'on', 'for', 'with', 'that', 'this', 'it', 'as', 'by', 'at',
  'users', 'user', 'system', 'admin', 'administrator', 'administrators',
  'hai', 'hain', 'ko', 'ka', 'ki', 'ke', 'mein', 'me', 'se', 'aur', 'par',
  'kar', 'karo', 'karna', 'chahiye', 'sakta', 'sakti', 'sakte', 'hona',
  'pahije', 'shakto', 'shakte', 'aahe', 'ahe', 'na', 'bhi', 'apne', 'apna',
  'ek', 'do', 'sab', 'sabhi', 'liye', 'wala', 'wali', 'hoga', 'rahega'
]);

/**
 * Capability dictionary.
 * Each entry maps multilingual surface phrases to a canonical capability:
 *   { id, title, topic, type, nfrSubcategory, section, templates, keywords }
 * Templates produce the formal "The system shall ..." statement.
 * {actor} and {object} slots are filled from the sentence where possible.
 */
const CAPABILITIES = [
  // ---- Expense / core domain actions ----
  {
    id: 'EXPENSE_CREATE',
    title: 'Expense Creation',
    topic: 'Expense Management',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['add expense', 'create expense', 'record expense', 'log expense', 'enter expense', 'capture expense', 'new expense',
      'kharch jodna', 'kharch add', 'expense add', 'kharcha add', 'expenses add', 'add kharch', 'kharcha record',
      'खर्च जोड़', 'खर्च दर्ज', 'व्यय जोड़', 'व्यय दर्ज', 'खर्च add', 'खर्च नोंदव', 'खर्च जमा'],
    verbs: ['add', 'create', 'record', 'log', 'enter', 'capture', 'jod', 'jodna', 'add kar', 'नोंदव', 'जोड़', 'दर्ज', 'jama'],
    objects: ['expense', 'expenses', 'kharch', 'kharcha', 'kharcha', 'paisa', 'hisab', 'खर्च', 'व्यय', 'entry', 'entries'],
    statement: 'The system shall allow users to create and record expense entries.'
  },
  {
    id: 'EXPENSE_UPDATE',
    title: 'Expense Modification',
    topic: 'Expense Management',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['edit expense', 'update expense', 'modify expense', 'change expense', 'expense edit', 'expense update',
      'kharch edit', 'kharch update', 'खर्च संपादित', 'व्यय अपडेट', 'खर्च बदल', 'खर्च अद्ययावत'],
    verbs: ['update', 'edit', 'modify', 'change', 'apdeet', 'badal', 'संपादित', 'अद्ययावत', 'बदल'],
    objects: ['expense', 'expenses', 'kharch', 'kharcha', 'खर्च', 'व्यय', 'record', 'records'],
    statement: 'The system shall allow users to update and modify existing expense records.'
  },
  {
    id: 'EXPENSE_DELETE',
    title: 'Expense Deletion',
    topic: 'Expense Management',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['delete expense', 'remove expense', 'expense delete', 'erase expense',
      'kharch delete', 'kharch remove', 'खर्च हटा', 'खर्च डिलीट', 'व्यय हटा', 'खर्च काढून टाक'],
    verbs: ['delete', 'remove', 'erase', 'hata', 'hatao', 'kadun', 'डिलीट', 'हटा', 'काढून'],
    objects: ['expense', 'expenses', 'kharch', 'kharcha', 'खर्च', 'व्यय', 'record', 'records'],
    statement: 'The system shall allow users to delete expense records.'
  },
  {
    id: 'EXPENSE_VIEW',
    title: 'Expense Viewing',
    topic: 'Expense Management',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['view expense', 'see expense', 'list expense', 'show expense', 'view expenses', 'see expenses', 'view my expenses', 'browse expenses',
      'kharch dekh', 'kharch bagh', 'expense dekhna', 'expenses dekh', 'खर्च देख', 'व्यय देख', 'खर्च पहा', 'खर्च बघा'],
    verbs: ['view', 'see', 'show', 'list', 'browse', 'dekh', 'dekhna', 'bagh', 'pah', 'देख', 'पहा', 'बघा'],
    objects: ['expense', 'expenses', 'kharch', 'kharcha', 'खर्च', 'व्यय'],
    statement: 'The system shall allow users to view their recorded expenses.'
  },
  {
    id: 'REPORT_VIEW',
    title: 'Report Viewing',
    topic: 'Reporting',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['report', 'reports', 'monthly report', 'view report', 'generate report', 'see report', 'report dekhna', 'report dekh',
      'ahwal', 'report bagh', 'रिपोर्ट', 'अहवाल', 'मासिक रिपोर्ट', 'मासिक अहवाल', 'रिपोर्ट देख', 'अहवाल पहा'],
    statement: 'The system shall allow users to view monthly expense reports.',
    statementFor: (ctx) => {
      if (ctx.has('weekly')) return 'The system shall allow users to view weekly reports.';
      if (ctx.has('daily')) return 'The system shall allow users to view daily reports.';
      if (ctx.has('year') || ctx.has('annual') || ctx.has('varshik')) return 'The system shall allow users to view annual reports.';
      if (ctx.has('monthly') || ctx.has('mahine') || ctx.has('masik') || ctx.has('month')) return 'The system shall allow users to view monthly expense reports.';
      return 'The system shall allow users to view and generate reports.';
    }
  },
  {
    id: 'REPORT_GENERATE',
    title: 'Report Generation',
    topic: 'Reporting',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['generate report', 'create report', 'report banane', 'report banao', 'report generate', 'auto report',
      'रिपोर्ट बना', 'अहवाल तयार', 'रिपोर्ट तैयार'],
    statement: 'The system shall generate reports on request.'
  },
  {
    id: 'BUDGET_MANAGE',
    title: 'Budget Management',
    topic: 'Budget Management',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['budget', 'set budget', 'budget limit', 'spending limit', 'andajpatrak', 'budget bagh', 'budget manage',
      'बजट', 'अंदाजपत्रक', 'बजेट सेट'],
    statement: 'The system shall allow users to define and track budgets against categories.'
  },
  {
    id: 'CATEGORY_MANAGE',
    title: 'Item Categorization',
    topic: 'Core Management',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['categorize', 'categorise', 'classify', 'tag records', 'categories', 'by category', 'varg', 'प्रकार', 'वर्ग', 'श्रेणी'],
    statement: 'The system shall allow records to be organized into categories.'
  },
  // ---- Authentication / users ----
  {
    id: 'AUTH_LOGIN',
    title: 'User Login',
    topic: 'Authentication',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['login', 'log in', 'sign in', 'signin', 'authenticate', 'log into',
      'login karna', 'login karo', 'sign in karna', 'लॉगिन', 'साइन इन', 'लॉग इन'],
    statement: 'The system shall allow users to log in to their accounts.'
  },
  {
    id: 'AUTH_LOGOUT',
    title: 'User Logout',
    topic: 'Authentication',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['logout', 'log out', 'sign out', 'signout', 'लॉगआउट', 'साइन आउट'],
    statement: 'The system shall allow users to log out of their accounts.'
  },
  {
    id: 'AUTH_REGISTER',
    title: 'User Registration',
    topic: 'Authentication',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['register', 'sign up', 'signup', 'create account', 'new account', 'account banana', 'register karna',
      'रजिस्टर', 'साइन अप', 'खाते तयार', 'नोंदणी'],
    statement: 'The system shall allow new users to register and create an account.'
  },
  {
    id: 'USER_MANAGE',
    title: 'User Account Management',
    topic: 'User Management',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['manage user', 'manage account', 'user accounts manage', 'admin user', 'create user', 'delete user',
      'user manage', 'accounts manage', 'users manage', 'khate manage', 'उपयोगकर्ता प्रबंधन', 'खाती व्यवस्थापन', 'यूजर मैनेज'],
    statement: 'The system shall allow administrators to manage user accounts.'
  },
  {
    id: 'PASSWORD_RESET',
    title: 'Password Reset',
    topic: 'Authentication',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['reset password', 'forgot password', 'change password', 'password reset', 'पासवर्ड रीसेट', 'पासवर्ड बदल'],
    statement: 'The system shall allow users to reset their password.'
  },
  // ---- Data / export / notifications ----
  {
    id: 'DATA_EXPORT',
    title: 'Data Export',
    topic: 'Reporting',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['export', 'download', 'pdf', 'excel', 'csv', 'download report', 'export data', 'एक्सपोर्ट', 'डाउनलोड'],
    statement: 'The system shall allow users to export their data and reports.'
  },
  {
    id: 'NOTIFICATION',
    title: 'Notifications',
    topic: 'Notifications',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['notification', 'notify', 'alert', 'reminder', 'email alert', 'push notification', 'soochna',
      'अधिसूचना', 'सूचना', 'अलर्ट', 'नोटिफिकेशन'],
    statement: 'The system shall send notifications to users for relevant account and budget events.'
  },
  {
    id: 'SEARCH',
    title: 'Search and Filtering',
    topic: 'Expense Management',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['search', 'filter', 'find expense', 'khoj', 'खोज', 'शोध', 'सर्च', 'फिल्टर'],
    statement: 'The system shall allow users to search and filter expense records.'
  },
  {
    id: 'DASHBOARD',
    title: 'Dashboard Overview',
    topic: 'Reporting',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['dashboard', 'overview', 'summary screen', 'home screen', 'डैशबोर्ड', 'सारांश'],
    statement: 'The system shall provide a dashboard summarizing the user\'s financial activity.'
  },
  {
    id: 'ACCESS_CONTROL_VIEW',
    title: 'Data Access Control',
    topic: 'Security',
    type: 'FUNCTIONAL', section: '3',
    keywords: ['only view their own', 'view their own', 'own private', 'private financial', 'only their own data',
      'view every user', 'all users can view', 'view all', 'access all data', 'view every user\'s',
      'who can view', 'see every', 'all financial data', 'view financial', 'financial information',
      'apna hi dekh', 'sirf apna', 'sabhi ka dekh', 'सभी का डेटा', 'अपना ही डेटा', 'स्वतःचा डेटा'],
    statementFor: (ctx) => {
      if (ctx.restrictive) {
        return 'The system shall restrict users to view only their own financial information.';
      }
      return 'The system shall allow users to view financial information according to their authorized access scope.';
    }
  }
];

// ---- Non-functional capability patterns (quality attributes) ----
const NFR_PATTERNS = [
  {
    id: 'NFR_PERFORMANCE_FAST',
    nfrSubcategory: 'PERFORMANCE',
    topic: 'Performance',
    section: '5.1',
    ambiguous: true,
    keywords: ['fast', 'quick', 'quickly', 'speed', 'responsive', 'tezz', 'tez', 'jaldi', 'jald', 'vegvan', 'gati',
      'तेज़', 'तेज', 'जल्दी', 'वेगवान', 'जलद', 'good performance', 'high performance', 'performance acchi',
      'fast hona chahiye', 'fast hona', 'jaldi chale', 'jaldi load'],
    measurable: /(\d+(?:\.\d+)?)\s*(ms|millisecond|seconds?|sec|s)\b/i,
    measurableStatement: (m) => `The system shall respond to user actions within ${m[1]} ${/ms|millisecond/i.test(m[2]) ? 'milliseconds' : 'seconds'} under normal load.`,
    vagueStatement: 'The system shall provide acceptable response performance.',
    clarification: 'The required response-time threshold has not been specified. What maximum response time should the system support under normal load?',
    metricHint: 'response time'
  },
  {
    id: 'NFR_SECURITY',
    nfrSubcategory: 'SECURITY',
    topic: 'Security',
    section: '5.3',
    ambiguous: true,
    keywords: ['secure', 'security', 'safe from hackers', 'encrypted', 'surakshit', 'safed', 'secure hona', 'security chahiye',
      'सुरक्षित', 'सुरक्षा', 'data encrypt', 'encryption', 'password protect'],
    measurable: /(aes|rsa|tls|ssl|256|128|oauth|jwt|two.?factor|2fa|otp)/i,
    measurableStatement: (m) => `The system shall protect data using ${m[1].toUpperCase()} security controls.`,
    vagueStatement: 'The system shall provide appropriate security controls to protect user data.',
    clarification: 'The specific security requirements have not been stated. Which protections are required (e.g., encryption standard, authentication mechanism, access control)?',
    metricHint: 'security control'
  },
  {
    id: 'NFR_USABILITY',
    nfrSubcategory: 'USABILITY',
    topic: 'Usability',
    section: '5.4',
    ambiguous: true,
    keywords: ['easy to use', 'user-friendly', 'user friendly', 'simple', 'intuitive', 'asaan', 'saral', 'sopya',
      'आसान', 'सरल', 'सोपे', 'easy hona chahiye', 'use karne me aasan'],
    measurable: null,
    vagueStatement: 'The system shall be usable and require minimal training for end users.',
    clarification: 'The usability target has not been quantified. What usability criteria must be met (e.g., task completion time, training duration, satisfaction score)?',
    metricHint: 'usability'
  },
  {
    id: 'NFR_AVAILABILITY',
    nfrSubcategory: 'AVAILABILITY',
    topic: 'Reliability',
    section: '5.4',
    ambiguous: false,
    keywords: ['available', 'uptime', 'always on', '24/7', 'available 24', '99.9', '99.99', 'उपलब्ध', 'चालू'],
    measurable: /(\d{2,3}(?:\.\d+)?)\s*%/,
    measurableStatement: (m) => `The system shall maintain ${m[1]}% availability.`,
    vagueStatement: 'The system shall remain available during agreed operating hours.',
    clarification: '',
    metricHint: 'availability'
  },
  {
    id: 'NFR_SCALABILITY',
    nfrSubcategory: 'SCALABILITY',
    topic: 'Performance',
    section: '5.4',
    ambiguous: true,
    keywords: ['scalable', 'scale', 'grow users', 'many users', 'concurrent', 'load', 'स्केलेबल', 'मापनीयता'],
    measurable: /(\d[\d,]*)\s*(users|concurrent|requests)/i,
    measurableStatement: (m) => `The system shall support ${m[1]} concurrent users.`,
    vagueStatement: 'The system shall scale to support growth in the number of users and transaction volume.',
    clarification: 'The expected load has not been quantified. How many concurrent users or transactions must the system support?',
    metricHint: 'concurrent users'
  },
  {
    id: 'NFR_RELIABILITY',
    nfrSubcategory: 'RELIABILITY',
    topic: 'Reliability',
    section: '5.4',
    ambiguous: true,
    keywords: ['reliable', 'no downtime', 'crash', 'dependable', 'vishwasniya', 'विश्वसनीय', 'भरवशाचा'],
    measurable: null,
    vagueStatement: 'The system shall operate reliably and preserve data integrity.',
    clarification: 'The reliability target has not been quantified. What mean time between failures or error rate is acceptable?',
    metricHint: 'reliability'
  }
];

// ---- Constraints / dependencies / assumptions / interfaces / business rules ----
const CONSTRAINT_PATTERNS = [
  {
    id: 'CON_TECH_STACK',
    keywords: ['must use', 'should use', 'use postgres', 'postgresql', 'mysql', 'mongodb', 'mongo', 'redis', 'react', 'angular', 'node', 'python', 'java', 'tech stack', 'technology stack', 'database must', 'built in', 'framework',
      'पोस्टग्रेस', 'पोस्टग्रेस्क्यूएल', 'डेटाबेस'],
    statement: (ctx) => `The system shall be implemented using ${titleCaseTech(ctx.tech) || 'the specified technology stack'}.`,
    extract: (t) => {
      // ordered specific -> generic; dedupe postgres/postgresql
      const techs = ['postgresql', 'mysql', 'mongodb', 'redis', 'react', 'angular', 'node.js', 'python', 'java', 'docker', 'kubernetes', 'aws', 'azure'];
      const found = techs.filter((x) => t.includes(x));
      if (!found.length && /\bpostgres\b/.test(t)) found.push('postgresql');
      if (!found.length && /\bmongo\b/.test(t)) found.push('mongodb');
      if (!found.length && /\bnode\b/.test(t)) found.push('node.js');
      return found.length ? [...new Set(found)].join(', ') : null;
    }
  }
];

const DEPENDENCY_PATTERNS = [
  {
    id: 'DEP_SERVICE',
    keywords: ['depends on', 'dependency', 'integrate with', 'third party', 'third-party', 'external service', 'payment gateway', 'email provider', 'sms provider', 'api integration', 'relies on',
      'निर्भर', 'अवलंबून', 'ईमेल सर्व्हिस', 'पेमेंट गेटवे'],
    statement: (ctx) => `The system shall depend on ${ctx.dependency ? (startsWithVowel(ctx.dependency) ? 'an ' : 'the ') + ctx.dependency : 'an external service provider'} for its operation.`,
    extract: (t) => {
      const svcs = ['email notification provider', 'email service', 'sms gateway', 'payment gateway', 'razorpay', 'stripe', 'paypal', 'google', 'whatsapp', 'sendgrid', 'twilio'];
      const found = svcs.filter((x) => t.includes(x));
      return found.length ? found.join(', ') : null;
    }
  }
];

const INTERFACE_PATTERNS = [
  {
    id: 'INT_API',
    keywords: ['api', 'interface', 'integrate', 'integration', 'webhook', 'rest api', 'external interface', 'एपीआई', 'इंटरफेस'],
    statement: 'The system shall expose and consume well-defined external interfaces for integration with other systems.'
  }
];

// Out-of-scope / unrelated topics (Phase 2)
const OUT_OF_SCOPE_PATTERNS = [
  { reason: 'SPORTS', patterns: [/\b(football|soccer|cricket|ipl|fifa|world cup|match score|match dekhna|match dekh|football match|क्रिकेट|फुटबॉल|मॅच)\b/i] },
  { reason: 'WEATHER', patterns: [/\b(weather|temperature|forecast|barish|mausam|rain today|मौसम|हवामान)\b/i] },
  { reason: 'POLITICS', patterns: [/\b(prime minister|president|modi|biden|trump|election|rajneeti|politics|चुनाव|राजनीति)\b/i] },
  { reason: 'ENTERTAINMENT', patterns: [/\b(tell me a joke|chutkula|joke sunao|sing a song|recipe|khana kaise banaye|biryani|movie|film|gana|song|गाना|फिल्म|चुटकुला|विनोद)\b/i] },
  { reason: 'GREETING', patterns: [
    /^(hello|hi|hey|heya|namaste|hola|greetings|wassup|yo|namaskar)[!?. ,]*$/i,
    /^good\s+(morning|afternoon|evening|night)[!?. ,]*$/i,
    /^(kaise\s+ho|kya\s+hal\s+hai|kya\s+chal\s+raha\s+hai|kasa\s+ahai|kasa\s+ahes)[!?. ,]*$/i,
    /^(ok|okay|k|cool|sure|thanks|thank\s+you|dhanyawad|shukriya|bye|exit|test|testing|theek hai|thik hai|barobar)[!?. ,]*$/i
  ] },
  { reason: 'IDENTITY', patterns: [
    /^(who\s+are\s+you|what\s+is\s+your\s+name|what\s+do\s+you\s+do|who\s+made\s+you|aap\s+kaun\s+ho|tum\s+kaun\s+ho|tera\s+naam\s+kya\s+hai|tumhi\s+kon|help)[!?. ,]*$/i
  ] }
];

// Vague / ambiguous quality words (Phase 10)
const VAGUE_WORDS = [
  'fast', 'quick', 'secure', 'safe', 'easy', 'user-friendly', 'user friendly',
  'flexible', 'robust', 'seamless', 'efficient', 'optimal', 'good', 'better',
  'nice', 'modern', 'scalable', 'reliable', 'tezz', 'tez', 'surakshit', 'asaan', 'saral',
  'jaldi', 'vegvan', 'sopya', 'तेज़', 'तेज', 'सुरक्षित', 'आसान', 'सरल', 'वेगवान', 'जलद', 'सोपे'
];

function startsWithVowel(s) {
  return /^[aeiou]/i.test(String(s || '').trim());
}

function titleCaseTech(s) {
  if (!s) return '';
  const proper = {
    postgresql: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB', redis: 'Redis',
    node: 'Node.js', 'node.js': 'Node.js', aws: 'AWS', azure: 'Azure',
    docker: 'Docker', kubernetes: 'Kubernetes', react: 'React',
    angular: 'Angular', python: 'Python', java: 'Java'
  };
  return String(s).split(/,\s*/).map((t) => proper[t.trim().toLowerCase()] || t).join(', ');
}

module.exports = {
  DEVANAGARI, LATIN,
  MARATHI_DEV_MARKERS, MARATHI_ROMAN_MARKERS,
  HINGLISH_MARKERS, HINDI_DEV_MARKERS,
  STOPWORDS,
  CAPABILITIES, NFR_PATTERNS,
  CONSTRAINT_PATTERNS, DEPENDENCY_PATTERNS, INTERFACE_PATTERNS,
  OUT_OF_SCOPE_PATTERNS, VAGUE_WORDS,
  startsWithVowel, titleCaseTech
};
