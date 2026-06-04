import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/docs');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialise auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If the user is signed in but we don't have token cached to memory (e.g. refresh),
        // we prompt standard sign in popup or allow re-authorization when action triggers.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google to get access token
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Creates a beautiful, customized health visit preparation guide in the user's personal Google Docs account.
 */
export const createGoogleDoc = async (
  token: string, 
  title: string, 
  details: {
    patientName: string;
    doctorName: string;
    specialty: string;
    date: string;
    time: string;
    type: string;
    reason: string;
    guidelines: string[];
  }
): Promise<string> => {
  // 1. Create a blank Google Doc with the specified title
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ titlePrefix: title, title })
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    throw new Error(`Google Docs Creation Failed: ${errorBody}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // 2. Draft structured document instructions
  const textContent = `${title}
=========================================
Thank you for booking with ABC Clinic! We have compiled this clinical consultation preparation checklist to help streamline your visit.

1. APPOINTMENT SUMMARY
-----------------------------------------
• Patient Name: ${details.patientName}
• Practitioner: ${details.doctorName}
• Medical Specialty: ${details.specialty}
• Date of Visit: ${details.date}
• Scheduled Time Slot: ${details.time}
• Session Format: ${details.type.toUpperCase()} Consultation
• Consultation Objectives: "${details.reason || 'Routine diagnosis and checkup'}"

2. PATIENT PRELIMINARY PREPARATION
-----------------------------------------
[ ] Check-in Time: Please register at our portal 15 minutes prior to ${details.time}.
[ ] Identity and Insurance: Bring a valid photo ID, Health Insurance information, or digital check-in pass.
[ ] Diagnostic History: Ensure any relevant lab results, previous diagnostic charts, or prescription packages are ready to present.
[ ] Symptoms Scratchpad: Use the space below to write any critical health symptoms, discomfort cycles, or questions you wish to review with ${details.doctorName}.

3. CLINICAL ADVISORY & VISITING GUIDELINES
-----------------------------------------
${details.guidelines.map((g, i) => `[ ] Guideline ${i + 1}: ${g}`).join('\n')}

4. PERSONAL CONSULTATION SCRATCHPAD
-----------------------------------------
Use this canvas to note down the discussion points, diagnostic recommendations, and follow-up routines recommended by the clinical team:
• Primary health findings:
  ___________________________________________________________

• Proposed diagnostic remedies & prescriptions:
  ___________________________________________________________

• Recommended checkup / follow-up schedules:
  ___________________________________________________________

-----------------------------------------
This document is securely synchronized with ABC Clinic Intake portal.
ABC Digital Health Division © 2026`;

  // We batch insert all this text at index 1 of the document.
  const requests = [
    {
      insertText: {
        text: textContent,
        location: { index: 1 }
      }
    }
  ];

  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });

  if (!updateRes.ok) {
    const errorBody = await updateRes.text();
    throw new Error(`Google Docs Update Failed: ${errorBody}`);
  }

  return documentId;
};
