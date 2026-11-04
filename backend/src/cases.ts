export type Difficulty = "simple" | "intermediate" | "complex";
export type Language = "en" | "pcm";

export interface ClinicalCase {
  id: string;
  department: string;
  difficulty: Difficulty;
  title: string;
  /** Shown to the learner at the start. Never contains the diagnosis. */
  presentation: string;
  /** Hidden from the learner; used by the AI patient and the reviewer. */
  patientProfile: string;
  history: string[];
  keyQuestions: string[];
  redFlags: string[];
  diagnosis: string;
  differentials: string[];
  learningPoints: string[];
}

/** Seed cases for the prototype. Real cases must be clinically reviewed before release. */
export const cases: ClinicalCase[] = [
  {
    id: "paeds-fever-001",
    department: "Paediatrics",
    difficulty: "simple",
    title: "Child with fever",
    presentation: "A mother brings her 3-year-old son to the clinic because he has had a fever for 2 days.",
    patientProfile: "You are the mother of a 3-year-old boy named Tunde. Answer as the mother in first person.",
    history: [
      "Fever for 2 days, high-grade, worse at night, intermittent chills",
      "Poor appetite, vomiting twice, no diarrhoea",
      "No cough, no difficulty breathing, no convulsions",
      "Lives in Port Harcourt, sleeps without a treated mosquito net",
      "Immunisations up to date for age; no known allergies; no previous admissions",
      "Mother gave paracetamol syrup with temporary relief",
    ],
    keyQuestions: ["duration and pattern of fever", "convulsions", "vomiting/diarrhoea", "cough/breathing", "mosquito net use", "immunisation", "medications given", "urine output"],
    redFlags: ["convulsions", "persistent vomiting", "lethargy", "reduced urine output"],
    diagnosis: "Uncomplicated malaria",
    differentials: ["Upper respiratory tract infection", "Typhoid fever", "Urinary tract infection", "Meningitis"],
    learningPoints: ["Malaria is a leading cause of fever in Nigerian children", "Always screen for danger signs", "Ask about net use and immunisation"],
  },
  {
    id: "obgyn-bleed-001",
    department: "Obstetrics",
    difficulty: "intermediate",
    title: "Vaginal bleeding in pregnancy",
    presentation: "A 28-year-old woman at about 32 weeks of pregnancy presents with vaginal bleeding since this morning.",
    patientProfile: "You are Ngozi, a 28-year-old woman, G3P2, about 32 weeks pregnant. Answer in first person.",
    history: [
      "Sudden painless bright red vaginal bleeding since morning, soaked 2 pads",
      "Baby is moving, slightly less than usual",
      "No abdominal pain or contractions, no trauma",
      "Previous two deliveries by caesarean section",
      "Booked at a private clinic; no antenatal ultrasound in the third trimester",
      "No hypertension or diabetes known",
    ],
    keyQuestions: ["painless vs painful", "amount of blood", "fetal movements", "trauma", "previous caesarean", "ultrasound/placenta location", "hypertension", "dizziness"],
    redFlags: ["heavy bleeding", "reduced fetal movement", "dizziness or syncope"],
    diagnosis: "Placenta praevia",
    differentials: ["Placental abruption", "Vasa praevia", "Preterm labour", "Cervical lesion"],
    learningPoints: ["Painless antepartum haemorrhage suggests placenta praevia", "Do not do a digital vaginal exam before excluding praevia", "Needs urgent hospital assessment"],
  },
  {
    id: "med-sob-001",
    department: "Internal Medicine",
    difficulty: "complex",
    title: "Breathlessness and leg swelling",
    presentation: "A 58-year-old man presents with worsening breathlessness over 3 weeks.",
    patientProfile: "You are Mr Chukwuma, a 58-year-old retired civil servant. Answer in first person.",
    history: [
      "Breathless on climbing stairs, now on walking short distances",
      "Needs 3 pillows to sleep, wakes up at night gasping",
      "Bilateral ankle swelling for 2 weeks",
      "Known hypertension for 10 years, stopped medication 1 year ago",
      "Occasional dry cough, no fever, no haemoptysis, no chest pain",
      "Drinks alcohol occasionally; does not smoke",
    ],
    keyQuestions: ["orthopnoea", "PND", "leg swelling", "hypertension history and adherence", "chest pain", "cough/haemoptysis", "fever", "alcohol/smoking"],
    redFlags: ["breathless at rest", "chest pain", "syncope"],
    diagnosis: "Congestive heart failure (hypertensive heart disease)",
    differentials: ["Chronic kidney disease", "Pulmonary embolism", "Pneumonia", "Cirrhosis"],
    learningPoints: ["Orthopnoea and PND point to left heart failure", "Poor adherence to antihypertensives is common", "Consider renal and hepatic causes of oedema"],
  },
  {
    id: "paeds-diarrhoea-001",
    department: "Paediatrics",
    difficulty: "simple",
    title: "Infant with watery stools",
    presentation: "A father brings his 9-month-old daughter because she has been passing watery stools since yesterday.",
    patientProfile: "You are the father of a 9-month-old girl named Amaka. Answer as the father in first person.",
    history: [
      "Watery stools about 8 times in 24 hours, no blood or mucus",
      "Vomited twice yesterday, now keeps down small feeds",
      "Passed urine only twice today, fewer wet nappies than usual",
      "Baby is irritable, drinks eagerly when offered water, eyes look sunken",
      "No fever, no convulsions",
      "Breastfed plus pap; water source is a borehole, not boiled",
      "Immunisations up to date, no ORS given at home yet",
    ],
    keyQuestions: ["frequency and character of stools", "blood in stool", "vomiting", "urine output", "feeding and thirst", "fever", "water source and hygiene", "ORS given", "immunisation"],
    redFlags: ["very few wet nappies", "sunken eyes", "lethargy", "unable to drink", "blood in stool"],
    diagnosis: "Acute watery diarrhoea with some dehydration",
    differentials: ["Invasive bacterial gastroenteritis", "Malaria with gastrointestinal symptoms", "Urinary tract infection", "Intussusception"],
    learningPoints: ["Assess hydration status early", "ORS and zinc are first-line for children with watery diarrhoea", "Know the danger signs that need referral"],
  },
  {
    id: "paeds-neonate-001",
    department: "Paediatrics",
    difficulty: "complex",
    title: "Sick newborn",
    presentation: "A mother brings her 5-day-old baby who has stopped feeding well since last night.",
    patientProfile: "You are the mother of a 5-day-old baby boy, delivered at home with a traditional birth attendant. Answer in first person and sound worried.",
    history: [
      "Baby was feeding well until last night, now refuses the breast and is very sleepy",
      "Felt warm to touch this morning, no thermometer at home",
      "Umbilical stump has a foul smell and the skin around it looks red",
      "Baby cried immediately at birth; membranes ruptured long before delivery, labour lasted 2 days",
      "One episode of the whole body stiffening and jerking this morning, lasted about a minute",
      "No vaccines given yet, cord was cut with an unsterilised blade",
    ],
    keyQuestions: ["feeding", "fever or cold to touch", "cord condition", "birth history and place of delivery", "prolonged rupture of membranes", "convulsions", "activity level", "breathing", "jaundice"],
    redFlags: ["not feeding", "convulsion", "lethargy", "foul-smelling cord with redness"],
    diagnosis: "Neonatal sepsis with possible omphalitis (consider neonatal tetanus and meningitis)",
    differentials: ["Neonatal tetanus", "Neonatal meningitis", "Hypoglycaemia", "Birth asphyxia sequelae", "Neonatal jaundice"],
    learningPoints: ["Any sick neonate needs urgent referral and a full sepsis work-up", "Risk factors: prolonged rupture of membranes, unhygienic cord care, home delivery", "Convulsion in the first week suggests sepsis, meningitis, tetanus or hypoglycaemia"],
  },
  {
    id: "obs-preeclampsia-001",
    department: "Obstetrics",
    difficulty: "complex",
    title: "Headache and swelling in late pregnancy",
    presentation: "A 24-year-old woman at about 35 weeks of her first pregnancy comes with a severe headache for two days.",
    patientProfile: "You are Blessing, 24 years old, first pregnancy, about 35 weeks. Answer in first person.",
    history: [
      "Severe frontal headache for 2 days, not relieved by paracetamol",
      "Blurred vision since yesterday, saw flashing lights once",
      "Swollen feet and puffy face for about a week",
      "Pain in the upper abdomen under the right ribs since this morning",
      "Baby is moving normally, no vaginal bleeding or leaking",
      "Antenatal care at a primary health centre, told her BP was 'a bit high' at last visit but not followed up",
      "No known hypertension before pregnancy, no seizures so far",
    ],
    keyQuestions: ["headache", "visual disturbance", "epigastric/right upper quadrant pain", "swelling", "fetal movements", "bleeding or leaking", "BP at antenatal visits", "previous hypertension", "convulsions"],
    redFlags: ["severe headache", "visual disturbance", "epigastric pain", "possible convulsion"],
    diagnosis: "Severe pre-eclampsia",
    differentials: ["Eclampsia (impending)", "HELLP syndrome", "Migraine", "Malaria", "Gestational hypertension"],
    learningPoints: ["Headache, visual symptoms and epigastric pain are warning signs of severe pre-eclampsia", "Needs immediate hospital care with blood pressure control, magnesium sulphate and delivery planning", "Follow-up of raised BP at antenatal visits saves lives"],
  },
  {
    id: "surg-appendix-001",
    department: "Surgery",
    difficulty: "intermediate",
    title: "Abdominal pain moving to the right",
    presentation: "A 19-year-old student presents with abdominal pain that started yesterday.",
    patientProfile: "You are Chidi, a 19-year-old university student. Answer in first person.",
    history: [
      "Pain started around the belly button, moved to the lower right side over 12 hours",
      "Pain is constant and worse on walking or coughing",
      "Lost appetite, vomited once, mild fever",
      "No diarrhoea, no urinary symptoms, bowels last opened yesterday normally",
      "No previous surgery, no similar episodes, no medication",
      "Does not drink alcohol",
    ],
    keyQuestions: ["site and migration of pain", "character and severity", "aggravating factors", "anorexia", "vomiting", "fever", "bowel habit", "urinary symptoms", "previous surgery"],
    redFlags: ["worsening severe pain", "rigid abdomen", "high fever", "persistent vomiting"],
    diagnosis: "Acute appendicitis",
    differentials: ["Mesenteric adenitis", "Urinary tract infection or renal colic", "Typhoid fever with enteric complications", "Gastroenteritis"],
    learningPoints: ["Classic migration of pain from periumbilical to right iliac fossa", "Anorexia is an important associated feature", "Needs surgical review, delay risks perforation"],
  },
  {
    id: "med-diabetes-001",
    department: "Internal Medicine",
    difficulty: "simple",
    title: "Thirst and frequent urination",
    presentation: "A 45-year-old trader comes to the clinic because she is always thirsty and urinating a lot.",
    patientProfile: "You are Mrs Okafor, a 45-year-old trader. Answer in first person.",
    history: [
      "Excessive thirst and passing urine many times, including at night, for about 2 months",
      "Lost about 5 kg in 2 months despite eating well",
      "Tired, blurred vision at times, slow-healing foot wound",
      "Mother and an older sister have diabetes",
      "No fever, no abdominal pain, no vomiting",
      "Drinks a lot of sugary drinks, does not exercise, overweight",
    ],
    keyQuestions: ["polyuria", "polydipsia", "weight loss", "fatigue", "blurred vision", "wound healing", "family history", "diet and activity", "symptoms of DKA"],
    redFlags: ["vomiting", "abdominal pain", "drowsiness", "deep fast breathing"],
    diagnosis: "Type 2 diabetes mellitus",
    differentials: ["Type 1 diabetes", "Diabetes insipidus", "Urinary tract infection", "Hyperthyroidism"],
    learningPoints: ["Polyuria, polydipsia and weight loss are classic symptoms", "Ask about family history and complications", "Confirm with blood glucose; screen for ketoacidosis symptoms"],
  },
  {
    id: "med-tb-001",
    department: "Internal Medicine",
    difficulty: "intermediate",
    title: "Long-standing cough",
    presentation: "A 35-year-old man has had a cough for more than 3 weeks and has been losing weight.",
    patientProfile: "You are Mr Bello, a 35-year-old motorcycle taxi rider. Answer in first person.",
    history: [
      "Cough for 5 weeks, mostly productive, sometimes streaked with blood",
      "Night sweats and evening fevers",
      "Lost about 8 kg, reduced appetite",
      "A neighbour in the same compound was treated for tuberculosis last year",
      "Smokes about 5 cigarettes a day for 10 years",
      "Never had an HIV test, no previous TB treatment",
      "No chest pain, mild breathlessness on exertion",
    ],
    keyQuestions: ["duration of cough", "sputum and haemoptysis", "fever and night sweats", "weight loss", "TB contact", "smoking", "HIV status", "previous TB treatment", "breathlessness"],
    redFlags: ["haemoptysis", "breathlessness at rest", "severe weight loss"],
    diagnosis: "Pulmonary tuberculosis (suspected)",
    differentials: ["Bacterial pneumonia", "Lung cancer", "Bronchiectasis", "HIV-related lung disease"],
    learningPoints: ["Cough over 2 weeks with weight loss and night sweats should prompt TB testing", "Ask about contacts and HIV status", "Confirm with sputum GeneXpert and chest X-ray"],
  },
];

export const departments = [...new Set(cases.map((c) => c.department))];
