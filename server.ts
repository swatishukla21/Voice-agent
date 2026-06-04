import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header as required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Doctor lists for the AI model to know who is available and their specialties
const clinicsInfo = `
Clinics branches & specialists at ABC Clinic:
- Cardiology:
  * Dr. Sarah Mitchell (Cardiology Checkup, slots: 09:30 AM, 10:15 AM, 11:00 AM, 01:00 PM, 02:00 PM, 03:15 PM)
  * Dr. James Mitchell (Senior Cardiologist, slots: 09:30 AM, 10:00 AM, 11:15 AM, 01:30 PM, 02:30 PM, 03:45 PM, 05:00 PM)
- Dermatology:
  * Dr. Sarah Jenkins (Dermatologist, slots: 09:30 AM, 10:00 AM, 10:45 AM, 02:00 PM, 03:30 PM, 04:15 PM, 05:00 PM, 06:00 PM)
  * Dr. Smith (Dermatology Specialist, slots: 10:00 AM, 11:30 AM, 01:15 PM, 02:45 PM, 04:00 PM)
- Pediatrics:
  * Dr. Michael Chen (Pediatric Specialist, slots: 08:00 AM, 09:00 AM, 10:00 AM, 11:00 AM, 02:00 PM, 03:00 PM, 04:00 PM)

Note: Slots represent times on patient's preferred scheduling dates.
Address: 124 Medical Plaza, Suite 402, Central City Branch.
`;

const systemInstruction = `
You are a professional, friendly, and efficient medical appointment scheduling assistant (voice virtul companion) for "ABC Clinic".
Your primary goal is to help patients book, reschedule, cancel, or inquire about doctor appointments while maintaining a polite, professional, and empathetic tone.

Rules:
1. Greet patients professionally on start.
2. Identify the patient's intent (book, reschedule, cancel, or inquire about appointments).
3. Collect the following information step-by-step:
   - Full name
   - Contact phone number
   - Preferred doctor or specialty (e.g. Dermatology, Cardiology, Pediatrics)
   - Reason for visit (brief description)
   - Preferred date (suggest next Tuesday, tomorrow, Friday Oct 11, etc. dynamically)
   - Preferred time slot (matching doctor's slots. E.g. Dr. Sarah Jenkins is free at 09:30 AM, 10:00 AM, 02:00 PM)
   - Whether the appointment is online (video call) or in-person
4. Ask ONLY ONE question at a time to ensure a clean voice conversational flow. Never overwhelm the user with multiple requests in one response.
5. If the user mentions symptoms, NEVER provide medical diagnoses, treatment advice, or emergency prescriptions. If they mention severe issues or an emergency (chest pain, severe bleeding, difficulty breathing), immediately state: "For medical emergencies, please hang up and contact emergency services (911) or proceed to the nearest hospital immediately."
6. Let the user know the branch details if relevant: Central City Branch at 124 Medical Plaza, Suite 402.
7. Call the 'updateDraft' tool immediately whenever you learn a new detail about the appointment (like full name, date, doctor icon, reason, type, or slot).
8. Use 'setActiveView' to switch the page to guide the user visually:
   - Show 'doctors' view when inquiring/selecting.
   - Show 'schedule' view when selecting dates/slots.
   - Show 'confirm' view when you summarize the booking prior to finalizing they agree.
   - Show 'home' view during greetings or simple queries.
9. When the user says "Yes, that's correct" or confirms the appointment summary, call the 'confirmBooking' tool to finalize it and move from draft to real appointment.
10. If they ask to cancel, list their appointments or call 'cancelAppointment' if ID is known. Or ask them for the name of the doctor / date they wish to cancel to proceed.
11. Keep responses short, direct, polite, concise, and highly suited for spoken audio.
`;

const updateDraft: FunctionDeclaration = {
  name: "updateDraft",
  description: "Updates the patient's current appointment booking details in progress. Call this as soon as you find out any field like name, phone, chosen doctor, date, time slot, reason, or visit type (online/in-person). This populates the clinic portal Form in real-time.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      patientName: { type: Type.STRING, description: "Full name of the patient." },
      patientPhone: { type: Type.STRING, description: "Patient's phone number." },
      doctorName: { type: Type.STRING, description: "Correct doctor name, e.g. Dr. Sarah Mitchell, Dr. Sarah Jenkins, Dr. James Mitchell, Dr. Michael Chen, Dr. Smith." },
      doctorSpecialty: { type: Type.STRING, description: "Specialty name: Dermatology, Cardiology, or Pediatrics." },
      reason: { type: Type.STRING, description: "Reason for consultation." },
      date: { type: Type.STRING, description: "Date of appointment, preferred Friday, Oct 11, 2026, or any user stated day. E.g. 'Oct 11, 2026'." },
      time: { type: Type.STRING, description: "Time of appointment slot. Make sure it matches one of the doctor's available slots." },
      type: { type: Type.STRING, description: "Visit context: 'in-person' or 'online'." }
    }
  }
};

const setActiveView: FunctionDeclaration = {
  name: "setActiveView",
  description: "Switches the user's active screen/view in the application to visually guide the patient.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      view: {
        type: Type.STRING,
        description: "The name of the view screen. Use: 'home', 'doctors', 'schedule', 'confirm'."
      }
    },
    required: ["view"]
  }
};

const confirmBooking: FunctionDeclaration = {
  name: "confirmBooking",
  description: "Finalizes the booking of the active drafted appointment. Call this when the patient explicitly agrees/confirms the summary.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const cancelAppointment: FunctionDeclaration = {
  name: "cancelAppointment",
  description: "Cancels an existing confirmed appointment of the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "The ID of the appointment to cancel." }
    },
    required: ["id"]
  }
};

// API Endpoint for conversations
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Format chat history for @google/genai SDK
    // The history needs to match contents array structure: [{ role: 'user', parts: [{ text: ... }] }]
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction + "\n" + clinicsInfo,
        tools: [{
          functionDeclarations: [updateDraft, setActiveView, confirmBooking, cancelAppointment]
        }]
      }
    });

    const reply = response.text || "";
    const functionCalls = response.functionCalls || [];

    res.json({
      reply,
      functionCalls
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI assistant." });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server bound to 0.0.0.0:${PORT}`);
  });
}

startServer();
