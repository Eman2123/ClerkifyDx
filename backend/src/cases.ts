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
];

export const departments = [...new Set(cases.map((c) => c.department))];
