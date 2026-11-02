import { createContext, useContext, useState } from 'react';

// English / Telugu text for the website. Add more keys here as needed.
const D = {
  en: {
    home: 'Home', about: 'About', contact: 'Contact', help: 'Help Us', login: 'Login', register: 'Register', logout: 'Logout', howItWorks: 'How it works', portal: 'Staff Portal',
    staffNoticeTitle: 'This role uses the Staff Portal', staffNoticeText: 'Medical Officers, Specialists, Navigators and District Admins register and log in through the Staff Portal. Health Workers use this page.', staffContinue: 'Continue to Staff Portal',
    tagline: 'Screening, referral and care for oral health, from the village to the specialist.',
    heroTitle: 'Early oral care for every tribal community',
    heroSub: 'A connected network of health workers, medical officers, specialists and navigators, so no mouth ulcer goes unnoticed.',
    getStarted: 'Get Started', learn: 'Learn More',
    stat1: 'Roles connected', stat2: 'Steps to a referral', stat3: 'Languages', stat4: 'Consent-first',
    workers: 'Health Workers', workersT: 'ASHA and ANM workers register patients, capture photos and record habits in the village.',
    specialists: 'Specialists', specialistsT: 'Oncology and oral medicine specialists review referred cases and guide treatment.',
    patients: 'Patients', patientsT: 'Every patient is followed from first screening to treatment, with consent and privacy.',
    howTitle: 'From village screening to treatment',
    s1: 'Screen', s1t: 'Health worker records symptoms, habits and an oral photo.',
    s2: 'Review', s2t: 'Medical officer checks the case and decides on referral.',
    s3: 'Consult', s3t: 'Specialist reviews and guides diagnosis and treatment.',
    s4: 'Navigate', s4t: 'Navigator helps the patient reach appointments and follow-up.',
    aboutTitle: 'About Oral Health', aboutText1: 'Oral cancer and other mouth diseases are common where tobacco, areca nut and gutkha are used. Most cases can be prevented or treated well when found early.',
    warnTitle: 'Warning signs',
    warn1: 'A mouth ulcer that does not heal in 2 weeks', warn2: 'White or red patches in the mouth', warn3: 'Pain or difficulty in swallowing', warn4: 'A lump in the mouth or neck',
    warnNote: 'See a health worker if you notice any of these.',
    abdmTitle: 'Built to fit India’s digital health ecosystem',
    abdmText: 'Patient records can carry an optional 14-digit ABHA number, the same health ID used across the Ayushman Bharat Digital Mission, so care can follow the patient.',
    abdm1: 'ABHA-ready patient records', abdm2: 'Consent captured for every patient', abdm3: 'Telugu and English interface',
    contactTitle: 'Contact Us', mobile: 'Mobile', email: 'Email',
    helpTitle: 'Help Us', emergency: 'Emergency call', helpText: 'In case of an emergency or severe mouth bleeding, call immediately.',
    loginTitle: 'Welcome back', loginSub: 'Login with your role, ID and password.', registerTitle: 'Create your account', registerSub: 'Choose your profession. The form changes for each role.',
    selectRole: 'Select your profession', password: 'Password',
    noAccount: "Don't have an account?", haveAccount: 'Already registered?',
    dashboard: 'Dashboard', addPatient: 'Add Patient', patientsList: 'Patients', profile: 'My Profile',
    welcome: 'Welcome', totalPatients: 'Total patients', highPriority: 'High priority', thisWeek: 'Added this week', withAbha: 'With ABHA number',
    recent: 'Recent patients', viewAll: 'View all', search: 'Search by name, mobile or ABHA', all: 'All', high: 'High', medium: 'Medium', low: 'Low',
    priority: 'Screening priority', priorityNote: 'Indicative only, based on symptoms and habits. Not a diagnosis.',
    noPatients: 'No patients yet', noPatientsT: 'Added patients will appear here.', details: 'Patient details', close: 'Close',
    next: 'Next', back: 'Back', save: 'Save patient',
  },
  te: {
    home: 'హోమ్', about: 'మా గురించి', contact: 'సంప్రదించండి', help: 'సహాయం', login: 'లాగిన్', register: 'నమోదు', logout: 'లాగ్అవుట్', howItWorks: 'ఎలా పనిచేస్తుంది', portal: 'సిబ్బంది పోర్టల్',
    staffNoticeTitle: 'ఈ పాత్ర సిబ్బంది పోర్టల్ వాడుతుంది', staffNoticeText: 'వైద్య అధికారులు, నిపుణులు, నావిగేటర్లు మరియు జిల్లా అడ్మిన్లు సిబ్బంది పోర్టల్ ద్వారా నమోదు మరియు లాగిన్ అవుతారు. ఆరోగ్య కార్యకర్తలు ఈ పేజీని వాడతారు.', staffContinue: 'సిబ్బంది పోర్టల్‌కు కొనసాగండి',
    tagline: 'గ్రామం నుండి నిపుణుడి వరకు నోటి ఆరోగ్యానికి స్క్రీనింగ్, రిఫరల్ మరియు సంరక్షణ.',
    heroTitle: 'ప్రతి గిరిజన సమాజానికి ముందస్తు నోటి సంరక్షణ',
    heroSub: 'ఆరోగ్య కార్యకర్తలు, వైద్య అధికారులు, నిపుణులు మరియు నావిగేటర్లు కలిసి, ఏ నోటి పుండూ గుర్తించకుండా ఉండకుండా చూసే నెట్‌వర్క్.',
    getStarted: 'ప్రారంభించండి', learn: 'మరింత తెలుసుకోండి',
    stat1: 'అనుసంధానమైన పాత్రలు', stat2: 'రిఫరల్‌కు దశలు', stat3: 'భాషలు', stat4: 'ముందుగా సమ్మతి',
    workers: 'ఆరోగ్య కార్యకర్తలు', workersT: 'ఆశా మరియు ఏఎన్ఎం కార్యకర్తలు గ్రామంలో రోగులను నమోదు చేసి ఫోటోలు తీసి అలవాట్లను నమోదు చేస్తారు.',
    specialists: 'నిపుణులు', specialistsT: 'ఆంకాలజీ మరియు ఓరల్ మెడిసిన్ నిపుణులు రిఫర్ చేసిన కేసులను సమీక్షించి చికిత్స సూచిస్తారు.',
    patients: 'రోగులు', patientsT: 'సమ్మతి మరియు గోప్యతతో మొదటి స్క్రీనింగ్ నుండి చికిత్స వరకు ప్రతి రోగిని అనుసరిస్తారు.',
    howTitle: 'గ్రామ స్క్రీనింగ్ నుండి చికిత్స వరకు',
    s1: 'స్క్రీనింగ్', s1t: 'ఆరోగ్య కార్యకర్త లక్షణాలు, అలవాట్లు మరియు నోటి ఫోటోను నమోదు చేస్తారు.',
    s2: 'సమీక్ష', s2t: 'వైద్య అధికారి కేసును పరిశీలించి రిఫరల్ నిర్ణయిస్తారు.',
    s3: 'సంప్రదింపు', s3t: 'నిపుణుడు సమీక్షించి రోగ నిర్ధారణ మరియు చికిత్సకు మార్గనిర్దేశం చేస్తారు.',
    s4: 'సహాయం', s4t: 'నావిగేటర్ రోగి అపాయింట్‌మెంట్లకు చేరుకోవడానికి మరియు ఫాలో-అప్‌కు సహాయపడతారు.',
    aboutTitle: 'నోటి ఆరోగ్యం గురించి', aboutText1: 'పొగాకు, వక్క మరియు గుట్కా వాడే చోట నోటి క్యాన్సర్ మరియు ఇతర నోటి వ్యాధులు ఎక్కువ. ముందే గుర్తిస్తే చాలా కేసులను నివారించవచ్చు లేదా బాగా చికిత్స చేయవచ్చు.',
    warnTitle: 'హెచ్చరిక సంకేతాలు',
    warn1: 'రెండు వారాలకు మానని నోటి పుండు', warn2: 'నోటిలో తెలుపు లేదా ఎరుపు మచ్చలు', warn3: 'నొప్పి లేదా మింగడంలో ఇబ్బంది', warn4: 'నోటిలో లేదా మెడలో గడ్డ',
    warnNote: 'ఇవి కనిపిస్తే ఆరోగ్య కార్యకర్తను కలవండి.',
    abdmTitle: 'భారత డిజిటల్ ఆరోగ్య వ్యవస్థకు అనుగుణంగా రూపొందించబడింది',
    abdmText: 'రోగి రికార్డులలో ఐచ్ఛికంగా 14 అంకెల ఆభా నంబర్ ఉండవచ్చు. ఇది ఆయుష్మాన్ భారత్ డిజిటల్ మిషన్ అంతటా వాడే ఆరోగ్య ఐడి, తద్వారా సంరక్షణ రోగిని అనుసరిస్తుంది.',
    abdm1: 'ఆభా-సిద్ధ రోగి రికార్డులు', abdm2: 'ప్రతి రోగి సమ్మతి నమోదు', abdm3: 'తెలుగు మరియు ఇంగ్లీష్ ఇంటర్‌ఫేస్',
    contactTitle: 'సంప్రదించండి', mobile: 'మొబైల్', email: 'ఇమెయిల్',
    helpTitle: 'సహాయం', emergency: 'అత్యవసర కాల్', helpText: 'అత్యవసర పరిస్థితిలో లేదా నోటి నుండి తీవ్ర రక్తస్రావం అయితే వెంటనే కాల్ చేయండి.',
    loginTitle: 'తిరిగి స్వాగతం', loginSub: 'మీ పాత్ర, ఐడి మరియు పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి.', registerTitle: 'మీ ఖాతాను సృష్టించండి', registerSub: 'మీ వృత్తిని ఎంచుకోండి. ప్రతి పాత్రకు ఫారం మారుతుంది.',
    selectRole: 'మీ వృత్తిని ఎంచుకోండి', password: 'పాస్‌వర్డ్',
    noAccount: 'ఖాతా లేదా?', haveAccount: 'ఇప్పటికే నమోదు అయ్యారా?',
    dashboard: 'డాష్‌బోర్డ్', addPatient: 'రోగిని చేర్చండి', patientsList: 'రోగులు', profile: 'నా ప్రొఫైల్',
    welcome: 'స్వాగతం', totalPatients: 'మొత్తం రోగులు', highPriority: 'అధిక ప్రాధాన్యత', thisWeek: 'ఈ వారం చేర్చినవి', withAbha: 'ఆభా నంబర్ ఉన్నవి',
    recent: 'ఇటీవలి రోగులు', viewAll: 'అన్నీ చూడండి', search: 'పేరు, మొబైల్ లేదా ఆభాతో వెతకండి', all: 'అన్నీ', high: 'అధికం', medium: 'మధ్యస్థం', low: 'తక్కువ',
    priority: 'స్క్రీనింగ్ ప్రాధాన్యత', priorityNote: 'లక్షణాలు మరియు అలవాట్ల ఆధారంగా సూచన మాత్రమే. ఇది రోగ నిర్ధారణ కాదు.',
    noPatients: 'ఇంకా రోగులు లేరు', noPatientsT: 'చేర్చిన రోగులు ఇక్కడ కనిపిస్తారు.', details: 'రోగి వివరాలు', close: 'మూసివేయి',
    next: 'తదుపరి', back: 'వెనుకకు', save: 'రోగిని సేవ్ చేయండి',
  },
};

const Ctx = createContext(null);
export const useLang = () => useContext(Ctx);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('ad_lang') || 'en');
  const toggle = () => {
    const next = lang === 'en' ? 'te' : 'en';
    localStorage.setItem('ad_lang', next);
    setLang(next);
  };
  const t = (k) => D[lang][k] ?? D.en[k] ?? k;
  return <Ctx.Provider value={{ lang, toggle, t }}>{children}</Ctx.Provider>;
}
