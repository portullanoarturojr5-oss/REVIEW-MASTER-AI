import { SubjectFolder, Reviewer, FlashcardItem, MasteryLevel, FolderDocument, ProgressiveSetScore } from "../types";

const FOLDERS_KEY = "review_master_folders_v1";
const REVIEWERS_KEY = "review_master_reviewers_v1";
const DOCUMENTS_KEY = "review_master_documents_v1";

const INITIAL_FOLDERS: SubjectFolder[] = [
  {
    id: "folder-neuro",
    name: "Cognitive Neuroscience",
    description: "Memory consolidation, synaptic plasticity, and neural pathways",
    color: "#2563EB", // Royal blue
    icon: "Brain",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "folder-econ",
    name: "Microeconomics",
    description: "Supply & demand elasticity, market structures, consumer theory",
    color: "#0284C7", // Cyan-Navy
    icon: "TrendingUp",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const INITIAL_DOCUMENTS: FolderDocument[] = [
  {
    id: "doc-neuro-1",
    folderId: "folder-neuro",
    name: "lecture4_synaptic_transmission.txt",
    fileType: "txt",
    sizeBytes: 1684,
    uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    pageOrSlideCount: 1,
    text: `Neurobiology Lecture 4: Synaptic Plasticity and Memory Consolidation

1. The Synaptic Basis of Memory:
Donald Hebb postulated in 1949 that when an axon of cell A repeatedly assists in firing cell B, metabolic changes or growth occur such that cell A's efficiency in firing B is increased. This is colloquially summarized as 'neurons that fire together, wire together'.

2. Long-Term Potentiation (LTP) in the Hippocampus:
LTP was first formally documented by Terje Lømo in 1966 in the rabbit dentate gyrus. It refers to a persistent strengthening of synapses based on recent patterns of activity.

3. Receptor Mechanics during Basal vs. High-Frequency Stimulation:
- At resting membrane potential (-70 mV), NMDA receptors are blocked by extracellular Magnesium ions (Mg2+).
- Glutamate released into the synaptic cleft binds to both AMPA and NMDA receptors.
- AMPA receptors conduct primarily Sodium ions (Na+), resulting in excitatory postsynaptic potentials (EPSPs).
- When high-frequency stimulation depolarizes the postsynaptic membrane to approximately -30 mV, the electrostatic repulsion ejects the Mg2+ block from the NMDA channel pore.
- With the pore unblocked, Calcium ions (Ca2+) flow into the postsynaptic dendritic spine.

4. Second Messenger Cascades:
- Postsynaptic Ca2+ influx activates Calcium/Calmodulin-dependent protein kinase II (CaMKII).
- CaMKII autophosphorylates, locking it into an active state.
- Activated CaMKII promotes the exocytosis and insertion of additional AMPA receptors into the postsynaptic density.
- Retrograde signaling via nitric oxide (NO) diffuses back to the presynaptic terminal to increase subsequent glutamate vesicle release.`,
  },
  {
    id: "doc-econ-1",
    folderId: "folder-econ",
    name: "microecon_ch3_elasticity.docx",
    fileType: "docx",
    sizeBytes: 2840,
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    pageOrSlideCount: 4,
    text: `Chapter 3: Price Elasticity of Demand and Supply

1. Definition of Elasticity:
Price Elasticity of Demand (PED) measures the proportional responsiveness of quantity demanded to changes in the price of a good.
Formula: PED = (% change in Quantity Demanded) / (% change in Price).

2. Categories of Elasticity:
- Elastic Demand (|PED| > 1): Quantity demanded changes by a higher percentage than the price change. Consumers are highly sensitive to price shifts.
- Inelastic Demand (|PED| < 1): Quantity demanded changes by a lower percentage than the price change. Examples include essential medicines and basic utilities.
- Unitary Elastic (|PED| = 1): Proportional change in quantity equals proportional change in price.
- Perfectly Inelastic (|PED| = 0): Vertical demand curve; quantity demanded remains invariant regardless of price.

3. Primary Determinants of PED:
- Availability of Close Substitutes: Goods with abundant alternatives have more elastic demand.
- Proportion of Income: Goods requiring a large fraction of a consumer's budget have higher elasticity.
- Luxuries vs. Necessities: Necessities tend to be price-inelastic, whereas luxuries are elastic.
- Time Horizon: Demand is consistently more elastic in the long run as buyers find alternatives.`,
  },
];

const INITIAL_REVIEWERS: Reviewer[] = [
  {
    id: "rev-synapse",
    folderId: "folder-neuro",
    title: "Synaptic Plasticity & Long-Term Potentiation (LTP)",
    summary:
      "Core mechanisms of Long-Term Potentiation (LTP) in the hippocampus, focusing on NMDA and AMPA receptor dynamics, calcium influx, and retrograde messengers like nitric oxide.",
    sourceType: "notes",
    sourceFileName: "lecture4_synaptic_transmission.txt",
    rawContent: `Neurobiology Lecture 4: Synaptic Plasticity and Memory Consolidation

1. The Synaptic Basis of Memory:
Donald Hebb postulated in 1949 that when an axon of cell A repeatedly assists in firing cell B, metabolic changes or growth occur such that cell A's efficiency in firing B is increased. This is colloquially summarized as 'neurons that fire together, wire together'.

2. Long-Term Potentiation (LTP) in the Hippocampus:
LTP was first formally documented by Terje Lømo in 1966 in the rabbit dentate gyrus. It refers to a persistent strengthening of synapses based on recent patterns of activity.

3. Receptor Mechanics during Basal vs. High-Frequency Stimulation:
- At resting membrane potential (-70 mV), NMDA receptors are blocked by extracellular Magnesium ions (Mg2+).
- Glutamate released into the synaptic cleft binds to both AMPA and NMDA receptors.
- AMPA receptors conduct primarily Sodium ions (Na+), resulting in excitatory postsynaptic potentials (EPSPs).
- When high-frequency stimulation depolarizes the postsynaptic membrane to approximately -30 mV, the electrostatic repulsion ejects the Mg2+ block from the NMDA channel pore.
- With the pore unblocked, Calcium ions (Ca2+) flow into the postsynaptic dendritic spine.

4. Second Messenger Cascades:
- Postsynaptic Ca2+ influx activates Calcium/Calmodulin-dependent protein kinase II (CaMKII).
- CaMKII autophosphorylates, locking it into an active state.
- Activated CaMKII promotes the exocytosis and insertion of additional AMPA receptors into the postsynaptic density.
- Retrograde signaling via nitric oxide (NO) diffuses back to the presynaptic terminal to increase subsequent glutamate vesicle release.`,
    keyConcepts: [
      "Long-Term Potentiation (LTP)",
      "NMDA Magnesium (Mg2+) Block",
      "AMPA Receptor Exocytosis",
      "CaMKII Activation",
      "Retrograde Messenger (Nitric Oxide)",
    ],
    flashcards: [
      {
        id: "fc-1",
        front: "What ion blocks the NMDA receptor pore at resting membrane potential?",
        back: "Extracellular Magnesium ions (Mg2+).",
        sourceExcerpt: "At resting membrane potential (-70 mV), NMDA receptors are blocked by extracellular Magnesium ions (Mg2+).",
        category: "Receptor Mechanics",
        mastery: "mastered",
        lastReviewed: new Date().toISOString(),
      },
      {
        id: "fc-2",
        front: "What voltage threshold typically ejects the Mg2+ block from the NMDA receptor?",
        back: "Depolarization to approximately -30 mV.",
        sourceExcerpt: "When high-frequency stimulation depolarizes the postsynaptic membrane to approximately -30 mV, the electrostatic repulsion ejects the Mg2+ block from the NMDA channel pore.",
        category: "Receptor Mechanics",
        mastery: "learning",
        lastReviewed: new Date().toISOString(),
      },
      {
        id: "fc-3",
        front: "What enzyme is activated by postsynaptic calcium influx and autophosphorylates to remain active?",
        back: "Calcium/Calmodulin-dependent protein kinase II (CaMKII).",
        sourceExcerpt: "Postsynaptic Ca2+ influx activates Calcium/Calmodulin-dependent protein kinase II (CaMKII). CaMKII autophosphorylates, locking it into an active state.",
        category: "Second Messenger Cascades",
        mastery: "new",
      },
      {
        id: "fc-4",
        front: "What is the consequence of activated CaMKII on AMPA receptors?",
        back: "It promotes the exocytosis and insertion of additional AMPA receptors into the postsynaptic density.",
        sourceExcerpt: "Activated CaMKII promotes the exocytosis and insertion of additional AMPA receptors into the postsynaptic density.",
        category: "Second Messenger Cascades",
        mastery: "new",
      },
      {
        id: "fc-5",
        front: "What retrograde gas molecule diffuses back to the presynaptic terminal to enhance neurotransmitter release?",
        back: "Nitric Oxide (NO).",
        sourceExcerpt: "Retrograde signaling via nitric oxide (NO) diffuses back to the presynaptic terminal to increase subsequent glutamate vesicle release.",
        category: "Retrograde Signaling",
        mastery: "learning",
      },
    ],
    quizQuestions: [
      // === SET 1 (Questions 1-10) ===
      {
        id: "qz-1",
        type: "multiple_choice",
        question: "Who first documented Long-Term Potentiation (LTP) in 1966 in the rabbit dentate gyrus?",
        options: ["Donald Hebb", "Terje Lømo", "Santiago Ramón y Cajal", "Eric Kandel"],
        correctAnswer: "Terje Lømo",
        sourceExcerpt: "LTP was first formally documented by Terje Lømo in 1966 in the rabbit dentate gyrus.",
        explanation: "The text explicitly credits Terje Lømo with documenting LTP in 1966.",
      },
      {
        id: "qz-2",
        type: "true_false",
        question: "At resting membrane potential, glutamate binding to NMDA receptors allows immediate calcium influx.",
        options: ["True", "False"],
        correctAnswer: "False",
        sourceExcerpt: "At resting membrane potential (-70 mV), NMDA receptors are blocked by extracellular Magnesium ions (Mg2+).",
        explanation: "The text states that at resting potential, NMDA channels are physically blocked by Mg2+ ions, preventing ion passage.",
      },
      {
        id: "qz-3",
        type: "multiple_choice",
        question: "Which ion conducts through AMPA receptors to produce initial excitatory postsynaptic potentials (EPSPs)?",
        options: ["Sodium ions (Na+)", "Chloride ions (Cl-)", "Potassium ions (K+)", "Magnesium ions (Mg2+)"],
        correctAnswer: "Sodium ions (Na+)",
        sourceExcerpt: "AMPA receptors conduct primarily Sodium ions (Na+), resulting in excitatory postsynaptic potentials (EPSPs).",
        explanation: "The text clearly states that AMPA receptors conduct primarily Sodium ions (Na+).",
      },
      {
        id: "qz-4",
        type: "identification",
        question: "Name the key protein kinase that autophosphorylates following postsynaptic Ca2+ influx.",
        options: [],
        correctAnswer: "CaMKII",
        sourceExcerpt: "Postsynaptic Ca2+ influx activates Calcium/Calmodulin-dependent protein kinase II (CaMKII).",
        explanation: "The notes explicitly name Calcium/Calmodulin-dependent protein kinase II, abbreviated CaMKII.",
      },
      {
        id: "qz-5",
        type: "multiple_choice",
        question: "What is the resting membrane potential of the postsynaptic neuron specified in the lecture notes?",
        options: ["-70 mV", "-30 mV", "-90 mV", "+30 mV"],
        correctAnswer: "-70 mV",
        sourceExcerpt: "At resting membrane potential (-70 mV), NMDA receptors are blocked by extracellular Magnesium ions (Mg2+).",
        explanation: "The notes state explicitly that the resting membrane potential is -70 mV.",
      },
      {
        id: "qz-6",
        type: "true_false",
        question: "Donald Hebb's 1949 postulate is colloquially summarized as 'neurons that fire together, wire together'.",
        options: ["True", "False"],
        correctAnswer: "True",
        sourceExcerpt: "This is colloquially summarized as 'neurons that fire together, wire together'.",
        explanation: "The notes directly quote this phrase as the colloquial summary of Hebb's postulate.",
      },
      {
        id: "qz-7",
        type: "multiple_choice",
        question: "At what membrane potential does high-frequency stimulation depolarize the postsynaptic membrane to eject the Mg2+ block?",
        options: ["-30 mV", "-70 mV", "-55 mV", "0 mV"],
        correctAnswer: "-30 mV",
        sourceExcerpt: "When high-frequency stimulation depolarizes the postsynaptic membrane to approximately -30 mV, the electrostatic repulsion ejects the Mg2+ block from the NMDA channel pore.",
        explanation: "Depolarization to approximately -30 mV produces the electrostatic repulsion that ejects the Mg2+ ion block.",
      },
      {
        id: "qz-8",
        type: "identification",
        question: "Name the retrograde signaling molecule that diffuses back to the presynaptic terminal to enhance glutamate release.",
        options: [],
        correctAnswer: "nitric oxide",
        sourceExcerpt: "Retrograde signaling via nitric oxide (NO) diffuses back to the presynaptic terminal to increase subsequent glutamate vesicle release.",
        explanation: "The notes identify nitric oxide (NO) as the retrograde messenger diffusing to the presynaptic terminal.",
      },
      {
        id: "qz-9",
        type: "short_answer",
        question: "Explain how activated CaMKII leads to increased synaptic strength.",
        options: [],
        correctAnswer: "Activated CaMKII autophosphorylates and promotes the exocytosis and insertion of additional AMPA receptors into the postsynaptic density.",
        rubricKeywords: ["AMPA receptors", "postsynaptic density", "insertion", "exocytosis"],
        sourceExcerpt: "Activated CaMKII promotes the exocytosis and insertion of additional AMPA receptors into the postsynaptic density.",
        explanation: "The text explains that CaMKII autophosphorylates and promotes the exocytosis and insertion of additional AMPA receptors into the postsynaptic density.",
      },
      {
        id: "qz-10",
        type: "multiple_choice",
        question: "In what anatomical brain structure was Long-Term Potentiation first formally documented in 1966?",
        options: ["Rabbit dentate gyrus", "Cat visual cortex", "Rat amygdala", "Human cerebellum"],
        correctAnswer: "Rabbit dentate gyrus",
        sourceExcerpt: "LTP was first formally documented by Terje Lømo in 1966 in the rabbit dentate gyrus.",
        explanation: "The text specifically mentions the rabbit dentate gyrus as the location of the 1966 experiment.",
      },

      // === SET 2 (Questions 11-20) ===
      {
        id: "qz-11",
        type: "multiple_choice",
        question: "In what year did Donald Hebb postulate that metabolic changes or growth occur when cell A repeatedly assists in firing cell B?",
        options: ["1949", "1966", "1973", "1984"],
        correctAnswer: "1949",
        sourceExcerpt: "Donald Hebb postulated in 1949 that when an axon of cell A repeatedly assists in firing cell B, metabolic changes or growth occur",
        explanation: "The text states that Donald Hebb published this postulate in 1949.",
      },
      {
        id: "qz-12",
        type: "true_false",
        question: "High-frequency stimulation hyperpolarizes the postsynaptic membrane to eject the Mg2+ block.",
        options: ["True", "False"],
        correctAnswer: "False",
        sourceExcerpt: "When high-frequency stimulation depolarizes the postsynaptic membrane to approximately -30 mV, the electrostatic repulsion ejects the Mg2+ block from the NMDA channel pore.",
        explanation: "The text explicitly states it depolarizes (not hyperpolarizes) the membrane to eject the block.",
      },
      {
        id: "qz-13",
        type: "multiple_choice",
        question: "Which ion provides the physical pore block in NMDA receptors at resting potential?",
        options: ["Magnesium ions (Mg2+)", "Sodium ions (Na+)", "Calcium ions (Ca2+)", "Zinc ions (Zn2+)"],
        correctAnswer: "Magnesium ions (Mg2+)",
        sourceExcerpt: "At resting membrane potential (-70 mV), NMDA receptors are blocked by extracellular Magnesium ions (Mg2+).",
        explanation: "Extracellular Magnesium ions (Mg2+) block the NMDA channel pore at resting potential.",
      },
      {
        id: "qz-14",
        type: "identification",
        question: "Identify the ion that flows into the postsynaptic dendritic spine once the NMDA channel pore is unblocked.",
        options: [],
        correctAnswer: "Calcium",
        sourceExcerpt: "With the pore unblocked, Calcium ions (Ca2+) flow into the postsynaptic dendritic spine.",
        explanation: "The text notes that Calcium ions (Ca2+) enter the dendritic spine once the pore is unblocked.",
      },
      {
        id: "qz-15",
        type: "multiple_choice",
        question: "What enzymatic modification locks CaMKII into an active state following calcium influx?",
        options: ["Autophosphorylation", "Ubiquitination", "Acetylation", "Methylation"],
        correctAnswer: "Autophosphorylation",
        sourceExcerpt: "CaMKII autophosphorylates, locking it into an active state.",
        explanation: "The notes state that CaMKII autophosphorylates, which locks it into an active state.",
      },
      {
        id: "qz-16",
        type: "true_false",
        question: "Retrograde signaling via nitric oxide (NO) decreases subsequent glutamate vesicle release.",
        options: ["True", "False"],
        correctAnswer: "False",
        sourceExcerpt: "Retrograde signaling via nitric oxide (NO) diffuses back to the presynaptic terminal to increase subsequent glutamate vesicle release.",
        explanation: "Nitric oxide retrograde signaling increases (not decreases) glutamate vesicle release.",
      },
      {
        id: "qz-17",
        type: "multiple_choice",
        question: "Which neurotransmitter is released into the synaptic cleft to bind both AMPA and NMDA receptors?",
        options: ["Glutamate", "GABA", "Dopamine", "Acetylcholine"],
        correctAnswer: "Glutamate",
        sourceExcerpt: "Glutamate released into the synaptic cleft binds to both AMPA and NMDA receptors.",
        explanation: "The notes specify that glutamate binds to both receptor subtypes.",
      },
      {
        id: "qz-18",
        type: "identification",
        question: "What postsynaptic receptor type conducts Sodium ions to produce excitatory postsynaptic potentials (EPSPs)?",
        options: [],
        correctAnswer: "AMPA",
        sourceExcerpt: "AMPA receptors conduct primarily Sodium ions (Na+), resulting in excitatory postsynaptic potentials (EPSPs).",
        explanation: "AMPA receptors conduct Na+ to generate EPSPs.",
      },
      {
        id: "qz-19",
        type: "short_answer",
        question: "What happens when high-frequency stimulation depolarizes the postsynaptic membrane to -30 mV?",
        options: [],
        correctAnswer: "Electrostatic repulsion ejects the Mg2+ block from the NMDA receptor pore, allowing Calcium ions (Ca2+) to flow into the postsynaptic dendritic spine.",
        rubricKeywords: ["electrostatic repulsion", "ejects", "Mg2+", "Calcium", "Ca2+"],
        sourceExcerpt: "When high-frequency stimulation depolarizes the postsynaptic membrane to approximately -30 mV, the electrostatic repulsion ejects the Mg2+ block from the NMDA channel pore. With the pore unblocked, Calcium ions (Ca2+) flow into the postsynaptic dendritic spine.",
        explanation: "Depolarization causes electrostatic repulsion of the Mg2+ ion block, allowing Ca2+ influx into the dendritic spine.",
      },
      {
        id: "qz-20",
        type: "true_false",
        question: "Long-Term Potentiation refers to a persistent strengthening of synapses based on recent patterns of activity.",
        options: ["True", "False"],
        correctAnswer: "True",
        sourceExcerpt: "It refers to a persistent strengthening of synapses based on recent patterns of activity.",
        explanation: "The text provides this exact definition for Long-Term Potentiation (LTP).",
      },
    ],
    quizStats: {
      totalAttempts: 2,
      bestScore: 100,
      lastScore: 100,
      lastTakenAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export function getFolders(): SubjectFolder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) {
      saveFolders(INITIAL_FOLDERS);
      return INITIAL_FOLDERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading folders from storage:", err);
    return INITIAL_FOLDERS;
  }
}

export function saveFolders(folders: SubjectFolder[]): void {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch (err) {
    console.error("Error saving folders:", err);
  }
}

export function getReviewers(): Reviewer[] {
  try {
    const raw = localStorage.getItem(REVIEWERS_KEY);
    if (!raw) {
      saveReviewers(INITIAL_REVIEWERS);
      return INITIAL_REVIEWERS;
    }
    const reviewers: Reviewer[] = JSON.parse(raw);
    // If the seed reviewer has fewer than 20 questions, update its question bank to include Set 1 & Set 2
    const neuroReviewer = reviewers.find((r) => r.id === "rev-neuro-1");
    if (neuroReviewer && neuroReviewer.quizQuestions.length < 20) {
      const initialNeuro = INITIAL_REVIEWERS.find((r) => r.id === "rev-neuro-1");
      if (initialNeuro) {
        neuroReviewer.quizQuestions = initialNeuro.quizQuestions;
        saveReviewers(reviewers);
      }
    }
    return reviewers;
  } catch (err) {
    console.error("Error reading reviewers from storage:", err);
    return INITIAL_REVIEWERS;
  }
}

export function saveReviewers(reviewers: Reviewer[]): void {
  try {
    localStorage.setItem(REVIEWERS_KEY, JSON.stringify(reviewers));
  } catch (err) {
    console.error("Error saving reviewers:", err);
  }
}

export function saveNewReviewer(newReviewer: Reviewer): void {
  const current = getReviewers();
  saveReviewers([newReviewer, ...current]);
}

export function updateReviewer(updatedReviewer: Reviewer): void {
  const current = getReviewers();
  const index = current.findIndex((r) => r.id === updatedReviewer.id);
  if (index !== -1) {
    current[index] = { ...updatedReviewer, updatedAt: new Date().toISOString() };
    saveReviewers(current);
  }
}

export function deleteReviewer(id: string): void {
  const current = getReviewers();
  saveReviewers(current.filter((r) => r.id !== id));
}

export function updateFlashcardMastery(
  reviewerId: string,
  flashcardId: string,
  mastery: MasteryLevel
): void {
  const current = getReviewers();
  const reviewer = current.find((r) => r.id === reviewerId);
  if (!reviewer) return;

  const card = reviewer.flashcards.find((fc) => fc.id === flashcardId);
  if (card) {
    card.mastery = mastery;
    card.lastReviewed = new Date().toISOString();
    reviewer.updatedAt = new Date().toISOString();
    saveReviewers(current);
  }
}

export function recordQuizResult(reviewerId: string, scorePercent: number): void {
  const current = getReviewers();
  const reviewer = current.find((r) => r.id === reviewerId);
  if (!reviewer) return;

  reviewer.quizStats = {
    totalAttempts: (reviewer.quizStats?.totalAttempts || 0) + 1,
    bestScore: Math.max(reviewer.quizStats?.bestScore || 0, scorePercent),
    lastScore: scorePercent,
    lastTakenAt: new Date().toISOString(),
  };
  reviewer.updatedAt = new Date().toISOString();
  saveReviewers(current);
}

export function recordProgressiveQuizResult(
  reviewerId: string,
  setNumber: number,
  scorePercent: number,
  correctCount: number,
  totalQuestions: number
): void {
  const current = getReviewers();
  const reviewer = current.find((r) => r.id === reviewerId);
  if (!reviewer) return;

  const setScore: ProgressiveSetScore = {
    setNumber,
    scorePercent,
    correctCount,
    totalQuestions,
    completedAt: new Date().toISOString(),
  };

  const existingSetScores = reviewer.quizStats?.setScores || {};
  const updatedSetScores = {
    ...existingSetScores,
    [setNumber]: setScore,
  };

  reviewer.quizStats = {
    totalAttempts: (reviewer.quizStats?.totalAttempts || 0) + 1,
    bestScore: Math.max(reviewer.quizStats?.bestScore || 0, scorePercent),
    lastScore: scorePercent,
    lastTakenAt: new Date().toISOString(),
    setScores: updatedSetScores,
  };
  reviewer.updatedAt = new Date().toISOString();
  saveReviewers(current);

  try {
    localStorage.setItem(`progressive_set_scores_${reviewerId}`, JSON.stringify(updatedSetScores));
  } catch (e) {
    console.error("Error saving set scores:", e);
  }
}

export function getSetScores(reviewerId: string): Record<number, ProgressiveSetScore> {
  try {
    const raw = localStorage.getItem(`progressive_set_scores_${reviewerId}`);
    if (raw) return JSON.parse(raw);
    const reviewers = getReviewers();
    const reviewer = reviewers.find((r) => r.id === reviewerId);
    return reviewer?.quizStats?.setScores || {};
  } catch (e) {
    return {};
  }
}

export function resetSetScores(reviewerId: string): void {
  try {
    localStorage.removeItem(`progressive_set_scores_${reviewerId}`);
    const reviewers = getReviewers();
    const reviewer = reviewers.find((r) => r.id === reviewerId);
    if (reviewer && reviewer.quizStats) {
      reviewer.quizStats.setScores = {};
      saveReviewers(reviewers);
    }
  } catch (e) {
    console.error("Error resetting set scores:", e);
  }
}

export function getFolderDocuments(folderId?: string): FolderDocument[] {
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    let allDocs: FolderDocument[] = [];
    if (!raw) {
      saveFolderDocuments(INITIAL_DOCUMENTS);
      allDocs = INITIAL_DOCUMENTS;
    } else {
      allDocs = JSON.parse(raw);
    }
    if (folderId) {
      return allDocs.filter((d) => d.folderId === folderId);
    }
    return allDocs;
  } catch (err) {
    console.error("Error reading documents from storage:", err);
    return INITIAL_DOCUMENTS;
  }
}

export function saveFolderDocuments(docs: FolderDocument[]): void {
  try {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error("Error saving documents:", err);
  }
}

export function addFolderDocument(newDoc: FolderDocument): void {
  const current = getFolderDocuments();
  // Filter out any document with identical id
  const updated = [newDoc, ...current.filter((d) => d.id !== newDoc.id)];
  saveFolderDocuments(updated);
}

export function addMultipleFolderDocuments(newDocs: FolderDocument[]): void {
  const current = getFolderDocuments();
  const newIds = new Set(newDocs.map((d) => d.id));
  const updated = [...newDocs, ...current.filter((d) => !newIds.has(d.id))];
  saveFolderDocuments(updated);
}

export function deleteFolderDocument(docId: string): void {
  const current = getFolderDocuments();
  saveFolderDocuments(current.filter((d) => d.id !== docId));
}

export function deleteDocumentsByFolder(folderId: string): void {
  const current = getFolderDocuments();
  saveFolderDocuments(current.filter((d) => d.folderId !== folderId));
}

export function exportStudyData(): string {
  const data = {
    version: "1.1",
    exportedAt: new Date().toISOString(),
    folders: getFolders(),
    reviewers: getReviewers(),
    documents: getFolderDocuments(),
  };
  return JSON.stringify(data, null, 2);
}

export function importStudyData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed.folders) && Array.isArray(parsed.reviewers)) {
      saveFolders(parsed.folders);
      saveReviewers(parsed.reviewers);
      if (Array.isArray(parsed.documents)) {
        saveFolderDocuments(parsed.documents);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to import study data:", err);
    return false;
  }
}
