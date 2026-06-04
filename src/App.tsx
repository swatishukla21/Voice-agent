import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  User,
  Calendar,
  PhoneCall,
  Search,
  ChevronLeft,
  ChevronRight,
  Bell,
  Mic,
  MicOff,
  Send,
  CheckCircle,
  X,
  Plus,
  Compass,
  AlertCircle,
  Info,
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  HelpCircle,
  Video,
  Activity,
  FileText,
  LogIn,
  LogOut,
  Check,
  Loader2
} from 'lucide-react';
import { Doctor, Appointment, BookingState, ChatMessage } from './types';
import { doctors } from './doctorsData';
import { initAuth, googleSignIn, logout, createGoogleDoc } from './firebase';

export default function App() {
  // Navigation View: 'home' | 'doctors' | 'schedule' | 'confirm' | 'appointments'
  const [currentView, setCurrentView] = useState<'home' | 'doctors' | 'schedule' | 'confirm' | 'appointments'>('home');

  // Pre-populated appointments matching the clinic dashboard mockup images
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'apt-sarah-mitchell',
      patientName: 'John Smith',
      patientPhone: '555-0199',
      doctorName: 'Dr. Sarah Mitchell',
      doctorSpecialty: 'Cardiology',
      doctorImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwxnFfPhM09XrPg-k5UN3sDd-8BoPFN8r5AcUr-CH4DTkwd2SluH6BvVZn6lzCOtU9IlIDBnwPSYjX7UsQUYIhjfAF_dxHagaIy1UBI0hJ4BcR_1RYsKNkuOgaNZbpJ1GqHAG2AkXhUodkbFuUr9TWD2-5x7GqbB9h63KtDvveR4krjVanLOwo7A256FBsQ3krVGtYZaqo2jbd3EqLXCYv3W_MLHJwop1YkmsXlfXtEuyAJ4ZVCYRpIORse_RW9mxtTdDnSNLk0w',
      date: 'Monday, Oct 12, 2026',
      time: '09:30 AM',
      type: 'in-person',
      reason: 'Routine Cardiology Checkup',
      status: 'confirmed'
    },
    {
      id: 'apt-michael-chen',
      patientName: 'John Smith',
      patientPhone: '555-0199',
      doctorName: 'Dr. Michael Chen',
      doctorSpecialty: 'Pediatrics',
      doctorImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDy8b057x8Zp63_6O7Z5zdAuDwbEX3cr5IhvtwGvcrCogrfG7I7k_Nf6IP1aSC6H902TuRhSOguh7yEmgKc-s60psQAvIfKTd7qclqtEUbBOGwjyApgIJOYPLbSUkZFsF6A5lSQuCJ-uqqDgbF846lFsPPlP2a3eq1cLmIP-_ijqTV_CiChiI3tDSReGxYxpYmn0mW_GyzXPFktmotloEcIQLudCalqgXpZ8dpqIAsxoZZ_fDSUl_8OxIYWTEOnvUCbbt7TMIBeVQ',
      date: 'Saturday, Oct 24, 2026',
      time: '02:00 PM',
      type: 'online',
      reason: 'Dental Health Consult & Dental Cleaning review',
      status: 'confirmed'
    }
  ]);

  // Client booking draft state (populated by both direct UI clicks & AI assistant function calls)
  const [draft, setDraft] = useState<BookingState>({
    patientName: 'John Smith',
    patientPhone: '555-0199',
    doctorName: '',
    doctorSpecialty: '',
    reason: '',
    date: 'Friday, Oct 11, 2026', // default date shown in mockup calendar
    time: '',
    type: 'in-person'
  });

  // Active doctor reference object for the Scheduler tab
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Search filter inside Doctors route
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  // Show Success Alert Modal on appointment finalized
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Text / Speech Chat states for virtual assistant
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: "Hello! Thank you for calling ABC Clinic. I'm your virtual voice appointment assistant. How may I help you today?"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Speech configurations
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Virtual agent sidebar status
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(true);

  // Google Docs Auth state
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSignKeyAttempt, setIsSignKeyAttempt] = useState(false);
  const [docExportLoadingId, setDocExportLoadingId] = useState<string | null>(null);
  const [exportedDocUrls, setExportedDocUrls] = useState<Record<string, string>>({});
  const [docsError, setDocsError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSignKeyAttempt(true);
    setDocsError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setDocsError(err.message || "Failed to authenticate Google Docs access.");
    } finally {
      setIsSignKeyAttempt(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setDocsError(null);
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleExportToGoogleDoc = async (apt: Appointment) => {
    let activeToken = googleToken;
    if (!activeToken) {
      try {
        const result = await googleSignIn();
        if (result) {
          setGoogleUser(result.user);
          setGoogleToken(result.accessToken);
          activeToken = result.accessToken;
        } else {
          return;
        }
      } catch (err: any) {
        console.error(err);
        setDocsError(err.message || "Sign-in required to export to Google Docs.");
        return;
      }
    }

    const confirmExport = window.confirm(
      `Would you like to generate a beautiful, interactive visit preparation checklist for your appointment with ${apt.doctorName} in Google Docs?`
    );
    if (!confirmExport) return;

    setDocExportLoadingId(apt.id);
    setDocsError(null);

    try {
      const title = `ABC Clinic: Visit Preparation Guide - ${apt.doctorName} (${apt.doctorSpecialty})`;
      const guidelines = [
        "Please arrive 15 minutes early and check in at Room 402.",
        "Ensure healthcare insurance cards or clinical pre-history lists are on hand.",
        apt.type === 'online' 
          ? "Test your webcam and audio system before joining the telehealth chamber."
          : "Coordinate diagnostic records or physical medical paperwork.",
        "Use this Document as an active diary during the appointment with the clinician."
      ];

      const documentId = await createGoogleDoc(activeToken!, title, {
        patientName: apt.patientName,
        doctorName: apt.doctorName,
        specialty: apt.doctorSpecialty,
        date: apt.date,
        time: apt.time,
        type: apt.type,
        reason: apt.reason,
        guidelines
      });

      const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
      setExportedDocUrls(prev => ({ ...prev, [apt.id]: docUrl }));
      speakText(`Excellent! I have drafted your clinical checkup checklist successfully in Google Docs. You can open and edit it now!`);
    } catch (err: any) {
      console.error(err);
      setDocsError(err?.message || "Failed to create Google Doc. Please try re-authenticating.");
    } finally {
      setDocExportLoadingId(null);
    }
  };

  // Load and configure browser speech recognition on startup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          submitChatToAssistant(text);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
      };

      speechRecognitionRef.current = rec;
    }
  }, []);

  // Speak assistant replies back to the user
  const speakText = (text: string) => {
    if (!isVoiceOutputEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      // Prefer friendly female voice if possible
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira')));
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech Synthesis Error:", e);
    }
  };

  // Scroll to bottom of chat transcripts
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isAiResponding]);

  // Toggle speech listener
  const toggleListening = () => {
    if (!isSpeechSupported) return;
    if (isListening) {
      speechRecognitionRef.current?.stop();
    } else {
      setIsListening(true);
      window.speechSynthesis.cancel(); // Stop talking on mic activate
      speechRecognitionRef.current?.start();
    }
  };

  // Send message to Express API backend holding Gemini SDK
  const submitChatToAssistant = async (userInput: string) => {
    if (!userInput.trim()) return;

    // Add message to local transcript log
    const updatedMessages = [...chatMessages, { role: 'user', text: userInput } as ChatMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsAiResponding(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          // Limit history length to fit context easily
          history: chatMessages.slice(-10).map(m => ({ role: m.role, text: m.text }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to query scheduling agent.');
      }

      const data = await response.json();
      const reply = data.reply || "I am processing that context.";
      
      // Add model's answer
      setChatMessages(prev => [...prev, { role: 'model', text: reply }]);
      
      // Perform TTS synthesis
      speakText(reply);

      // Evaluate function declarations called by Gemini
      if (data.functionCalls && data.functionCalls.length > 0) {
        for (const call of data.functionCalls) {
          const { name, args } = call;
          console.log(`Assistant Triggered Action [${name}]:`, args);

          if (name === 'updateDraft') {
            // Merge draft parameters dynamically
            setDraft(prev => {
              const updated = { ...prev, ...args };
              // If doctorName matches something in our list, associate selectedDoctor
              if (args.doctorName) {
                const doc = doctors.find(d => d.name.toLowerCase().includes(args.doctorName.toLowerCase()));
                if (doc) {
                  setSelectedDoctor(doc);
                  updated.doctorName = doc.name;
                  updated.doctorSpecialty = doc.specialty;
                }
              }
              return updated;
            });
          }

          if (name === 'setActiveView') {
            if (['home', 'doctors', 'schedule', 'confirm'].includes(args.view)) {
              setCurrentView(args.view as any);
            }
          }

          if (name === 'confirmBooking') {
            handleFinalizeAppointment(true);
          }

          if (name === 'cancelAppointment') {
            handleCancelAppointment(args.id);
          }
        }
      }

    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: "Apologies, I encountered a communication error. Please try speaking or typing again." }]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Set selected Doctor from manual UI clicks
  const handleSelectDoctorForBooking = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setDraft(prev => ({
      ...prev,
      doctorName: doc.name,
      doctorSpecialty: doc.specialty,
      time: doc.availableSlots[0] || '10:00 AM'
    }));
    setCurrentView('schedule');
  };

  // Cancel confirmed appointments
  const handleCancelAppointment = (aptId: string) => {
    setAppointments(prev => prev.filter(a => a.id !== aptId));
  };

  // Booking finalized completely
  const handleFinalizeAppointment = (fromAi = false) => {
    // Generate valid target doctor card fields
    const targetedDoctorName = draft.doctorName || selectedDoctor?.name || 'Dr. Smith';
    const activeDoc = doctors.find(d => d.name === targetedDoctorName) || selectedDoctor;
    const targetedImage = activeDoc?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqwJ_-q4T4bh6PJLO04EVDLm2YC5sCPH6ZcSNVNyaGRQLA42zqensvQLzEvjwYs1JCyX_rIL1kTH_l47-xIBkEsjxsPZJoIR_MrKInUiXjMxKgOqD2MOoo3WqVbPSUp3ecu-2fu08X0HFtHsdIpSxjoIhMXbeR_ZpSLUadYUe0muIoSJdpQSpS650DLDms_xDfvrxFWLpZY1fA6nsHoW_R_0ZbTXGJYHcz2WUPZWL3dBkpJ7rIIMRpj7Ss43ag7SvMiWEKv5gS0g';
    const targetedSpecialty = draft.doctorSpecialty || activeDoc?.specialty || 'General Medical';

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientName: draft.patientName || 'John Smith',
      patientPhone: draft.patientPhone || '555-0199',
      doctorName: targetedDoctorName,
      doctorSpecialty: targetedSpecialty,
      doctorImage: targetedImage,
      date: draft.date || 'Tuesday, Oct 24, 2026',
      time: draft.time || '10:00 AM',
      type: draft.type || 'in-person',
      reason: draft.reason || 'Medical consultation',
      status: 'confirmed'
    };

    setAppointments(prev => [newApt, ...prev]);
    setShowSuccessToast(true);
    setCurrentView('home');

    // Reset draft fields
    setDraft({
      patientName: 'John Smith',
      patientPhone: '555-0199',
      doctorName: '',
      doctorSpecialty: '',
      reason: '',
      date: 'Friday, Oct 11, 2026',
      time: '',
      type: 'in-person'
    });
    setSelectedDoctor(null);

    // AI voice announcement on complete
    if (fromAi) {
      speakText("Perfect John! Your clinic session is successfully booked. You will receive a confirmation message shortly.");
    }
  };

  // Filter doctors based on input search and top medical specialty pills
  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
                          doc.specialty.toLowerCase().includes(doctorSearch.toLowerCase());
    const matchesSpecialty = selectedSpecialty ? doc.specialty.toLowerCase() === selectedSpecialty.toLowerCase() : true;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col antialiased select-none pb-24 md:pb-0 relative overflow-hidden font-sans">
      
      {/* Glow ambient background tags for Frosted Glass */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-teal-500/15 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[200px] left-[300px] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Clinically Designed Header */}
      <header className="sticky top-0 z-40 bg-slate-950/40 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 font-display">
          <div className="w-10 h-10 rounded-xl bg-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/20">
            <span className="material-icons-span text-slate-950">local_hospital</span>
          </div>
          <div>
            <h1 className="font-display font-extrabold text-lg text-white tracking-tight leading-none font-sans">ABC Clinic</h1>
            <span className="text-[10px] text-teal-400 font-mono tracking-widest leading-none">INTELLIGENT HEALTH GATEWAY</span>
          </div>
        </div>

        {/* Diagnostic Notifications & Profile Headshot */}
        <div className="flex items-center gap-4">
          {/* Virtual Assistant Toggle Button */}
          <button
            onClick={() => setIsAssistantExpanded(!isAssistantExpanded)}
            className={`flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-full hover:bg-white/10 text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 duration-100 ${isAssistantExpanded ? 'border-teal-400/40' : ''}`}
          >
            <PhoneCall className={`h-4 w-4 ${isAssistantExpanded ? 'animate-bounce text-teal-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline font-sans">AI Voice Assistant</span>
          </button>

          <button className="p-2 text-slate-300 hover:bg-white/10 rounded-full bg-white/5 border border-white/5 transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900"></span>
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-white/15">
            <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-teal-400/30 overflow-hidden shadow-inner">
              <img
                alt="Patient Profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwxnFfPhM09XrPg-k5UN3sDd-8BoPFN8r5AcUr-CH4DTkwd2SluH6BvVZn6lzCOtU9IlIDBnwPSYjX7UsQUYIhjfAF_dxHagaIy1UBI0hJ4BcR_1RYsKNkuOgaNZbpJ1GqHAG2AkXhUodkbFuUr9TWD2-5x7GqbB9h63KtDvveR4krjVanLOwo7A256FBsQ3krVGtYZaqo2jbd3EqLXCYv3W_MLHJwop1YkmsXlfXtEuyAJ4ZVCYRpIORse_RW9mxtTdDnSNLk0w"
              />
            </div>
            <div className="hidden md:block text-left font-display">
              <div className="text-sm font-bold text-slate-100 leading-none">John Smith</div>
              <span className="text-[10px] text-slate-400 font-mono">ID: PT-30911</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main split dashboard view */}
      <div className="flex-1 flex max-w-[1700px] w-full mx-auto relative overflow-hidden">
        
        {/* Left Side: Medical Portal Dashboard (Takes 65% on large screen) */}
        <div className={`flex-1 overflow-y-auto px-4 sm:px-8 py-6 transition-all duration-300 relative z-10 ${isAssistantExpanded ? 'lg:max-w-[65%]' : 'max-w-full'}`}>
          <AnimatePresence mode="wait">

            {/* 1. HOME SCREEN */}
            {currentView === 'home' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Hero Greeting Panel */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-teal-400/5 border border-white/10 text-white p-6 sm:p-8 shadow-xl backdrop-blur-md">
                  <div className="absolute -right-12 -top-12 opacity-[0.06] pointer-events-none">
                    <Activity className="h-64 w-64 text-teal-400" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-teal-300">
                      <Sparkles className="h-3.5 w-3.5 text-teal-400" /> Welcome back to ABC Clinic
                    </span>
                    <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
                      Good morning, John
                    </h2>
                    <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed">
                      Your medical wellness is our clinic's priority. Book interactive sessions with certified doctors, preview summaries or discuss via voice with our intelligent AI concierge.
                    </p>

                    {/* Integrated Specialists Search */}
                    <div className="relative max-w-xl mt-4 font-sans">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                      <input
                        type="text"
                        placeholder="Search doctors, specialities, or health checkups..."
                        value={doctorSearch}
                        onChange={(e) => {
                          setDoctorSearch(e.target.value);
                          setCurrentView('doctors');
                        }}
                        className="w-full h-11 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-450 outline-none focus:border-teal-400/40 focus:bg-white/10 transition-all font-sans text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Dashboard Bento Grid Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Book Appointment Action */}
                  <button
                    onClick={() => setCurrentView('doctors')}
                    className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl shadow-lg hover:scale-[1.01] hover:bg-white/10 hover:border-teal-400/30 transition-all text-left group backdrop-blur-md"
                  >
                    <div className="space-y-1.5 max-w-[75%] font-display">
                      <span className="font-bold text-xl text-white block">Book Appointment</span>
                      <span className="text-xs text-slate-400 leading-relaxed block">Choose specialties, view reviews, and reserve clinical time slots.</span>
                    </div>
                    <div className="w-12 h-12 bg-teal-400/10 text-teal-300 rounded-full flex items-center justify-center border border-teal-400/25 group-hover:bg-teal-400 group-hover:text-slate-950 transition-colors duration-200">
                      <Plus className="h-6 w-6" />
                    </div>
                  </button>

                  {/* Quick view of schedule */}
                  <button
                    onClick={() => setCurrentView('appointments')}
                    className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl shadow-lg hover:scale-[1.01] hover:bg-white/10 hover:border-teal-400/30 transition-all text-left group backdrop-blur-md"
                  >
                    <div className="space-y-1.5 max-w-[75%] font-display">
                      <span className="font-bold text-xl text-teal-300 block">My Appointments</span>
                      <span className="text-xs text-slate-400 block">Review and manage your pending or active medical visits.</span>
                    </div>
                    <div className="w-12 h-12 bg-white/5 text-teal-400 border border-white/10 rounded-full flex items-center justify-center shadow-sm group-hover:bg-teal-400 group-hover:text-slate-950 transition-colors duration-200">
                      <Calendar className="h-5 w-5" />
                    </div>
                  </button>
                </div>

                {/* Live appointments overview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-lg text-white">Your Scheduled Consultations</h3>
                    {appointments.length > 0 && (
                      <button
                        onClick={() => setCurrentView('appointments')}
                        className="text-xs font-semibold text-teal-400 hover:underline hover:text-teal-300"
                      >
                        View all appointments ({appointments.length})
                      </button>
                    )}
                  </div>

                  {appointments.length === 0 ? (
                    <div className="bg-white/5 rounded-xl border border-dashed border-white/10 p-8 text-center text-slate-400">
                      <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40 text-teal-400" />
                      <p className="text-sm">No scheduled checkups available. Talk with our Voice Agent or view Specialists to schedule!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {appointments.slice(0, 2).map((apt) => (
                        <div key={apt.id} className="p-4 bg-white/5 rounded-xl border border-white/10 shadow-sm relative overflow-hidden flex gap-4 hover:shadow-md hover:border-white/20 transition-all">
                          <div className="absolute top-0 left-0 w-1 bg-teal-400 h-full"></div>
                          {/* Calendar card date icon badge */}
                          <div className="w-14 h-14 bg-white/5 rounded-lg flex flex-col items-center justify-center p-1 border border-white/10">
                            <span className="text-[9px] uppercase font-bold text-teal-450 font-mono select-none">
                              {apt.date.split(',')[1]?.trim().split(' ')[0] || 'Schedule'}
                            </span>
                            <span className="text-lg font-bold text-white leading-none">
                              {apt.date.split(',')[1]?.trim().split(' ')[1] || ' Visit'}
                            </span>
                          </div>
                          <div className="flex-1 space-y-1 min-w-0 font-sans">
                            <h4 className="text-sm font-bold text-white truncate">{apt.doctorName}</h4>
                            <p className="sky-span text-xs text-teal-450 font-semibold font-sans">{apt.doctorSpecialty}</p>
                            <div className="flex items-center gap-3 text-slate-400 pt-1">
                              <span className="flex items-center gap-1 text-[11px]">
                                <Clock className="h-3 w-3 text-teal-400" /> {apt.time}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] capitalize">
                                {apt.type === 'online' ? <Video className="h-3 w-3 text-teal-400" /> : <MapPin className="h-3 w-3 text-teal-400" />} {apt.type}
                              </span>
                            </div>
                          </div>
                          
                          {/* Fast Cancel Button */}
                          <button
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="text-slate-400 hover:text-red-400 absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
                            title="Cancel appointment"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Health Summary Banner Block */}
                <div className="bg-white/5 rounded-2xl border border-white/10 p-6 shadow-sm flex flex-col sm:flex-row gap-6 items-center backdrop-blur-md">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center text-teal-400">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUuuRWntfAJTaRkyYEjDKzomeHjokLMpbK5djUSewDBzuhNsl0RY5oBYUYPbjsFszVPVK424Qoixb9tJBC4oFlxr8tdqCLKJeJLlGUCQr4LGesMiLkyx4HlPzNoEfwMahPLedHRzLMeCulz9W6Ny23niq8lvywKvWVlymymhHLFDNRmrqop0FV3vOmif7GA4Imc-fZwjmb3oDq0utAXdwT1KihzSFxBvYqx9m8ZdEeweCKweJ2LPang3-A630R28mHLk3kGY5oqQ"
                      alt="Stethoscope"
                      className="object-cover w-full h-full opacity-70"
                    />
                  </div>
                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-300 text-[10px] font-bold border border-teal-400/15">
                      <Sparkles className="h-2.5 w-2.5 text-teal-400 animate-pulse" /> NEW CLINICAL INSIGHT
                    </span>
                    <h4 className="text-md font-bold text-white leading-tight">Your Weekly Wellness & Laboratory Checkup Status</h4>
                    <p className="text-xs text-slate-350 leading-relaxed max-w-xl">
                      Great progress! We detected optimal improvements in Vitamin D & Cardiovascular telemetry results of your latest session reviews. See personalized clinic reports.
                    </p>
                  </div>
                  <button 
                    onClick={() => alert("Report downloaded successfully to patient records.")}
                    className="px-4 py-2 bg-teal-400 text-slate-950 font-sans text-xs font-bold rounded-lg hover:bg-teal-350 active:scale-95 transition-all text-neutral-900"
                  >
                    Read Report
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. DOCTOR DIRECTORY/SPECIALIST VIEW */}
            {currentView === 'doctors' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
                  <div className="space-y-1">
                    <h2 className="font-display font-extrabold text-2xl text-white">Find Your Specialist</h2>
                    <p className="text-xs text-slate-400">Connect with expert clinical consultation practitioners standing by.</p>
                  </div>

                  {/* Specialist Search Input inside Page */}
                  <div className="relative w-full sm:w-64 font-sans">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Doctor name or department..."
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      className="w-full text-xs h-9 bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 text-white outline-none focus:border-teal-400/50"
                    />
                  </div>
                </div>

                {/* Specialty select pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none font-sans">
                  {['All', 'Cardiology', 'Dermatology', 'Pediatrics'].map((spec) => (
                    <button
                      key={spec}
                      onClick={() => setSelectedSpecialty(spec === 'All' ? null : spec)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        (spec === 'All' && selectedSpecialty === null) || selectedSpecialty === spec
                          ? 'bg-teal-400 text-slate-900 shadow-md shadow-teal-400/25'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:border-slate-450 hover:bg-white/10'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>

                {/* Doctors List Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDoctors.map((doc) => (
                    <div key={doc.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-lg hover:border-teal-400/40 transition-all group backdrop-blur-md">
                      <div className="absolute top-0 left-0 w-1.5 bg-teal-400 h-full"></div>
                      
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                          <img alt={doc.name} className="w-full h-full object-cover opacity-90" src={doc.image} />
                        </div>
                        <div className="flex-1 space-y-1 min-w-0 font-sans">
                          <div className="flex items-start justify-between min-w-0 gap-2">
                            <h3 className="font-display font-extrabold text-base text-white truncate">{doc.name}</h3>
                            <span className="flex items-center gap-1 bg-teal-400/10 px-2 py-0.5 rounded-md border border-teal-400/20 leading-none flex-shrink-0">
                              <span className="text-[10px] font-bold text-teal-300">★ {doc.rating}</span>
                            </span>
                          </div>
                          <p className="text-teal-400 text-xs font-bold">{doc.specialty}</p>

                          <div className="flex items-center gap-4 text-[11px] text-slate-450 pt-1.5 border-t border-white/5">
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-mono">Experience</span>
                              <span className="font-semibold text-slate-200">{doc.experience}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-mono">Total Patients</span>
                              <span className="font-semibold text-slate-200">{doc.patients}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CTA Booking buttons */}
                      <div className="mt-4 flex gap-2 pt-3 border-t border-dashed border-white/5 font-sans">
                        <button
                          onClick={() => {
                            setChatInput(`I want to book an appointment with ${doc.name}`);
                            submitChatToAssistant(`I want to book an appointment with ${doc.name}`);
                          }}
                          className="flex-1 text-xs border border-teal-400/30 text-teal-300 py-2 rounded-lg hover:bg-white/5 transition-colors font-semibold"
                        >
                          Ask Assistant to Book
                        </button>
                        <button
                          onClick={() => handleSelectDoctorForBooking(doc)}
                          className="flex-1 text-xs bg-teal-400 text-slate-950 py-2 rounded-lg hover:bg-teal-300 active:scale-[0.98] transition-all font-semibold"
                        >
                          Book Direct
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct care video consultations banner */}
                <div className="bg-gradient-to-r from-teal-500/20 to-blue-500/20 border border-white/10 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg backdrop-blur-md">
                  <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.04]">
                    <Clock className="w-48 h-48" />
                  </div>
                  <div className="space-y-4 max-w-lg">
                    <span className="px-3 py-1 bg-teal-400/15 border border-teal-400/30 text-teal-300 rounded-full text-[10px] tracking-wider uppercase font-bold backdrop-blur-sm">Direct Care Telehealth</span>
                    <h3 className="font-display font-extrabold text-xl">Immediate Virtual Consultations Available Today.</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Skip office lines on general medical queries. Securely chat with an on-call therapist or certified physician in less than 15 minutes.
                    </p>
                    <button
                      onClick={() => alert("Launching virtual lobby secure connection...")}
                      className="px-5 py-2.5 bg-teal-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm hover:bg-teal-350 transition-all active:scale-95"
                    >
                      Start Telehealth Visit
                    </button>
                  </div>
                </div>

                {/* Nearby clinics preview details map */}
                <div className="bg-white/5 rounded-2xl border border-white/10 p-5 flex flex-col md:flex-row gap-6 justify-between items-center backdrop-blur-md">
                  <div className="space-y-1">
                    <h4 className="text-white font-bold font-display text-sm">Central City Branch Location</h4>
                    <p className="text-xs text-slate-300 font-sans">124 Medical Plaza, Suite 402 — 3 Miles near your current workspace.</p>
                  </div>
                  <div className="h-28 w-full md:w-56 overflow-hidden rounded-xl border border-white/10 flex-shrink-0">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuApGZwDXWOUTgOmo_a_ezqR6NEBGe7bWgAVoV0HY1cZomZubvhkFA5k3Eug4DG_WhYHfwCn36RjhR72Wudlqcu3UM9pMyLeHdU2pIggriuPEkffCa9fbFbZBrv-Ho_aiAWNsvcYii8yNZkCuVqgFila3-ktPxaUdRGrKZvV4LKN2lP-4Hz315C7YSXumbQyrkDCQIU4gvQi0Ym-FvxQw3UdyC2M_6N41uiz9DI2QqaKOXMKN4Au3OtsBzOmp4BURVtxiSff-_H7Aw"
                      alt="Map View"
                      className="w-full h-full object-cover opacity-80"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. SCHEDULE / CALENDAR SLOT SCREEN */}
            {currentView === 'schedule' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                  <div>
                    <h2 className="font-display font-extrabold text-2xl text-white">Schedule Medical Appointment</h2>
                    <p className="text-xs text-slate-400">
                      Select visit medium, targeted calendar days, and preferred hour slot below.
                    </p>
                  </div>

                  {/* Online / In-person Toggles */}
                  <div className="bg-white/5 p-1 rounded-xl inline-flex border border-white/10 backdrop-blur-sm">
                    <button
                      onClick={() => setDraft(prev => ({ ...prev, type: 'in-person' }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        draft.type === 'in-person' ? 'bg-teal-400 text-slate-900 shadow-sm' : 'text-slate-350 hover:text-white'
                      }`}
                    >
                      In-Person Visit
                    </button>
                    <button
                      onClick={() => setDraft(prev => ({ ...prev, type: 'online' }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        draft.type === 'online' ? 'bg-teal-400 text-slate-900 shadow-sm' : 'text-slate-350 hover:text-white'
                      }`}
                    >
                      Online Video
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Calendar Widget panel (matches Oct 2026 scheduling mockup layout) */}
                  <div className="md:col-span-7 bg-white/5 rounded-2xl border border-white/10 p-5 shadow-sm backdrop-blur-md">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-display font-bold text-base text-white">October 2026</h3>
                      <div className="flex gap-1">
                        <button className="p-1 rounded-full border border-white/10 hover:bg-white/10 text-slate-200">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button className="p-1 rounded-full border border-white/10 hover:bg-white/10 text-slate-200">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-400 border-b border-white/5 pb-2 mb-2">
                      <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                    </div>

                    {/* Day numbers */}
                    <div className="grid grid-cols-7 gap-y-3 test-calendar text-center text-xs font-medium">
                      <div className="text-slate-600 py-1 select-none opacity-30">25</div>
                      <div className="text-slate-600 py-1 select-none opacity-30">26</div>
                      <div className="text-slate-600 py-1 select-none opacity-30">27</div>
                      <div className="text-slate-600 py-1 select-none opacity-30">28</div>
                      <div className="text-slate-600 py-1 select-none opacity-30">29</div>
                      <div className="text-slate-600 py-1 select-none opacity-30">30</div>
                      <div className="text-slate-200 py-1">1</div>

                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDraft(prev => ({ ...prev, date: `${d === 4 ?'Friday' : d===10?'Wednesday':'Sunday'}, Oct ${d}, 2026` }))}
                          className="hover:bg-white/10 text-slate-200 rounded-lg py-1.5 focus:outline-none relative flex flex-col items-center justify-center font-bold"
                        >
                          {d}
                          {(d === 4 || d === 10) && <span className="absolute bottom-1 w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></span>}
                        </button>
                      ))}

                      {/* Selected Day - Friday Oct 11 shown in Mockup card */}
                      <button className="bg-teal-400 text-slate-900 rounded-lg py-1.5 focus:outline-none font-extrabold shadow-md shadow-teal-400/20">
                        11
                      </button>

                      {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDraft(prev => ({ ...prev, date: `Oct ${d}, 2026` }))}
                          className="hover:bg-white/10 text-slate-200 rounded-lg py-1.5 focus:outline-none font-bold"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slots select widget on right */}
                  <div className="md:col-span-5 space-y-4">
                    {/* Active reservation day block */}
                    <div className="bg-teal-400/10 text-teal-300 p-4 border border-teal-400/20 rounded-xl border-l-4 border-teal-400 font-sans">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">SELECTED TARGET DAY</span>
                      <h4 className="text-base font-bold text-teal-300 font-display">{draft.date || 'Friday, Oct 11, 2026'}</h4>
                      <p className="text-xs text-slate-300 mt-0.5">Visit medium: <span className="font-bold underline capitalize">{draft.type}</span></p>
                    </div>

                    {/* Available slots panel */}
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-5 shadow-sm space-y-4 backdrop-blur-md">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase font-mono">CHOOSE APPOINTMENT TIME</span>
                        <h4 className="font-bold text-white text-sm">Available Hour Increments</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 font-sans">
                        {/* Render standard hours based on selected doctor */}
                        {(selectedDoctor?.availableSlots || ['09:30 AM', '10:00 AM', '02:00 PM', '03:30 PM', '05:00 PM']).map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setDraft(prev => ({ ...prev, time: slot }))}
                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                              draft.time === slot
                                ? 'bg-teal-400 border-teal-400 text-slate-900 shadow-md shadow-teal-400/10'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:border-slate-450'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>

                      {/* Brief visit reason annotation */}
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Reason for Visit</label>
                        <input
                          type="text"
                          placeholder="e.g. Allergy flare up, regular check..."
                          value={draft.reason}
                          onChange={(e) => setDraft(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full text-xs h-9 bg-white/5 px-3 border border-white/10 rounded-lg text-white outline-none focus:border-teal-400/50"
                        />
                      </div>

                      <div className="pt-2 font-sans">
                        <button
                          onClick={() => {
                            if (!draft.time) {
                              alert("Please select a preferred time slot first.");
                              return;
                            }
                            setCurrentView('confirm');
                          }}
                          className="w-full py-3 bg-teal-400 text-slate-900 hover:bg-teal-300 active:scale-[0.98] transition-all rounded-xl font-bold text-xs shadow-md shadow-teal-400/10"
                        >
                          Review & Confirm Appointment
                        </button>
                        <span className="text-[10px] text-slate-400 block text-center mt-2.5">No cancellation penalties until 24h before.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. CONFIRM VISITS SCREEN */}
            {currentView === 'confirm' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="border-b border-white/10 pb-3 font-sans">
                  <h2 className="font-display font-extrabold text-2xl text-white">Confirm Your Clinic Visit</h2>
                  <p className="text-xs text-slate-400">Kindly review the drafted health appointment parameters below before finalizing booking.</p>
                </div>

                <div className="bg-white/5 rounded-2xl border border-white/10 p-5 shadow-lg space-y-4 backdrop-blur-md font-sans">
                  {/* Doctor Profile card detail reviews with clean formatting */}
                  <div className="bg-white/5 p-4 rounded-xl flex items-start gap-4 border-l-4 border-teal-400 border border-white/5 font-sans">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                      <img
                        src={selectedDoctor?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9mgASNBgXPawETylwX3e7Oi9ssZaNvb_3JKNrceoJzIwAUtLA8Ir8zQrWGxJNwoguRPBOuR2T6ND9DstKYY7rWj-MOcHnqlDFRe8R4-JgVbX2GlxGfYOKVxf9Zhswh7oqgKK-1LALM1I5lyz839ZrqmlVOekxUMbQbt6Eyyt7D60a1cPMTOsODvtEh80YBAIFwx4bGV_cGsvr87NlMZ2XClHaFtSoKRkAdTpWwtEk9OpVgp1n9SAsjsGFOLj3nxQbrfBbXtp_iQ'}
                        alt="Selected Doctor"
                        className="object-cover w-full h-full opacity-95"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Practitioner Specialist</span>
                      <h4 className="text-base font-extrabold text-teal-300 font-display">{draft.doctorName || selectedDoctor?.name || 'Dr. Smith'}</h4>
                      <p className="text-xs text-slate-300">{draft.doctorSpecialty || selectedDoctor?.specialty || 'Health department'}</p>
                    </div>
                  </div>

                  {/* Visit type and category detailed review */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-400/10 text-teal-300 rounded-full flex items-center justify-center border border-teal-400/15">
                        {draft.type === 'online' ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Visit Type</span>
                        <h5 className="text-xs font-bold text-white capitalize">{draft.type} Session</h5>
                        <p className="text-[10px] text-slate-400">{draft.type === 'online' ? 'Clinical Telehealth Video' : 'Office Diagnostic Visit'}</p>
                      </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 text-slate-300 rounded-full flex items-center justify-center border border-white/5">
                        <User className="h-5 w-5 text-teal-400" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Patient Name</span>
                        <h5 className="text-xs font-bold text-white">{draft.patientName || 'John Smith'}</h5>
                        <p className="text-[10px] text-slate-400">Phone: {draft.patientPhone || '555-0199'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Timing blocks */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-teal-400/10 border border-teal-400/15 text-teal-300 rounded-full flex items-center justify-center">
                        <Calendar className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Reserved Date</span>
                        <h5 className="text-xs font-bold text-white">{draft.date || 'Tuesday, Oct 24, 2026'}</h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-teal-400/10 border border-teal-400/15 text-teal-300 rounded-full flex items-center justify-center">
                        <Clock className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Reserved Time</span>
                        <h5 className="text-xs font-bold text-white">{draft.time || '10:00 AM'}</h5>
                      </div>
                    </div>
                  </div>

                  {/* Visit reason */}
                  <div className="text-sm bg-white/5 p-3.5 rounded-lg border border-white/5 text-slate-300">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono mb-1">Clinic visit consultation objective</span>
                    <p className="text-xs italic">" {draft.reason || 'Symptom review / medical consultation.'} "</p>
                  </div>

                  {/* Advisory warn callout block */}
                  <div className="bg-teal-400/5 rounded-xl p-4 border border-teal-400/20 flex gap-3 text-slate-200 text-xs">
                    <Info className="h-5 w-5 flex-shrink-0 text-teal-400" />
                    <div>
                      <span className="font-bold block text-white">Patient arrival guidelines</span>
                      <p className="text-slate-300 mt-0.5 font-sans">Please arrive 15 minutes prior to scheduled session time. Ensure carrying healthcare insurance card or diagnostic history records.</p>
                    </div>
                  </div>

                  {/* Operational Finalize Bookings CTA buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleFinalizeAppointment()}
                      className="w-full bg-teal-400 text-slate-950 hover:bg-teal-300 py-3 px-4 rounded-full font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                    >
                      Confirm Appointment Booking Session
                    </button>
                    <button
                      onClick={() => setCurrentView('schedule')}
                      className="w-full py-2 bg-transparent hover:underline text-teal-300 text-xs font-bold transition-all"
                    >
                      Go Back / Modify Details
                    </button>
                  </div>
                </div>

                {/* Progress Indicators steps matching Confirmation page */}
                <div className="flex items-center justify-center gap-2 pt-4">
                  <div className="flex items-center gap-1.5 text-teal-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center text-[10px]">1</span>
                    Select Specialty
                  </div>
                  <div className="w-8 h-0.5 bg-teal-400/40 rounded-full"></div>
                  <div className="flex items-center gap-1.5 text-teal-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center text-[10px]">2</span>
                    Input Details
                  </div>
                  <div className="w-8 h-0.5 bg-white/20 rounded-full"></div>
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-slate-400 flex items-center justify-center text-[10px] border border-white/10">3</span>
                    Final Confirm
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. ALL CONFIRMED APPOINTMENTS DETAILED VIEW */}
            {currentView === 'appointments' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="border-b border-white/10 pb-3 flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 shadow-sm bg-white/5 backdrop-blur-md">
                  <div>
                    <h2 className="font-display font-extrabold text-2xl text-white">My Appointments</h2>
                    <p className="text-xs text-slate-400">Review status, details, or cancel your active consultations.</p>
                  </div>
                  <button
                    onClick={() => setCurrentView('doctors')}
                    className="flex items-center gap-1.5 bg-teal-400 text-slate-950 hover:bg-teal-300 px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition-all text-neutral-900"
                  >
                    <Plus className="h-4 w-4" /> Book New Session
                  </button>
                </div>

                {/* Google Docs Integration Portal Status */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row gap-4 items-center justify-between backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-[0.03]">
                    <FileText className="w-32 h-32 text-teal-400" />
                  </div>
                  <div className="flex items-center gap-3 z-10 text-left">
                    <div className="w-12 h-12 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-teal-300" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-display font-extrabold text-sm text-white tracking-tight">Google Docs Clinical Integration</h3>
                      <p className="text-xs text-slate-450 leading-relaxed">
                        {googleUser 
                          ? `Connected Account: ${googleUser.email}` 
                          : "Connect your Google accounts to draft custom health visit checklists directly inside Google Docs."}
                      </p>
                    </div>
                  </div>

                  <div className="z-10">
                    {googleUser ? (
                      <button
                        onClick={handleGoogleSignOut}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" /> Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={handleGoogleSignIn}
                        disabled={isSignKeyAttempt}
                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer text-neutral-900 font-sans"
                      >
                        {isSignKeyAttempt ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        Connect Google Docs
                      </button>
                    )}
                  </div>
                </div>

                {docsError && (
                  <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 flex gap-2 text-xs text-red-300 animate-in fade-in duration-200 font-sans text-left">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                    <span>{docsError}</span>
                  </div>
                )}

                {appointments.length === 0 ? (
                  <div className="bg-white/5 rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400 font-sans">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-40 text-teal-400" />
                    <h4 className="font-bold text-white text-sm mb-1">Your appointment book is empty</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Please discuss with our Virtual AI Assistant or browse Specialists directory to book clinical reviews.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="bg-white/5 rounded-2xl border border-white/10 p-5 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-5 items-start md:items-center justify-between backdrop-blur-md">
                        <div className="absolute top-0 left-0 w-1.5 bg-teal-400 h-full"></div>

                        <div className="flex gap-4 items-center">
                          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex-shrink-0">
                            <img alt={apt.doctorName} className="w-full h-full object-cover opacity-90" src={apt.doctorImage} />
                          </div>
                          <div className="space-y-0.5 font-sans">
                            <h3 className="font-display font-bold text-base text-white">{apt.doctorName}</h3>
                            <p className="text-teal-400 text-xs font-bold leading-none">{apt.doctorSpecialty}</p>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-350 pt-1">
                              <span className="flex items-center gap-1 font-semibold text-slate-300"><Calendar className="h-3.5 w-3.5 text-teal-400" /> {apt.date}</span>
                              <span className="flex items-center gap-1 font-semibold text-slate-300"><Clock className="h-3.5 w-3.5 text-teal-400" /> {apt.time}</span>
                              <span className="flex items-center gap-1 tracking-wide capitalize"><Activity className="h-3.5 w-3.5 text-teal-400" /> {apt.type} Visit</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-none border-white/5 flex-row justify-end font-sans">
                          {exportedDocUrls[apt.id] ? (
                            <a
                              href={exportedDocUrls[apt.id]}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all font-sans"
                            >
                              <Check className="h-3.5 w-3.5" /> Open Google Doc
                            </a>
                          ) : (
                            <button
                              onClick={() => handleExportToGoogleDoc(apt)}
                              disabled={docExportLoadingId === apt.id}
                              className="px-4 py-2 bg-teal-400/10 hover:bg-teal-400/20 text-teal-300 border border-teal-400/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 font-sans cursor-pointer"
                            >
                              {docExportLoadingId === apt.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Creating Doc...
                                </>
                              ) : (
                                <>
                                  <FileText className="h-3.5 w-3.5" />
                                  Draft Google Doc
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedDoctor(doctors.find(d => d.name === apt.doctorName) || null);
                              setDraft({
                                patientName: apt.patientName,
                                patientPhone: apt.patientPhone,
                                doctorName: apt.doctorName,
                                doctorSpecialty: apt.doctorSpecialty,
                                reason: apt.reason,
                                date: apt.date,
                                time: apt.time,
                                type: apt.type
                              });
                              setCurrentView('schedule');
                              speakText(`Ok John, let's select a new date and time for your appointment with ${apt.doctorName}`);
                            }}
                            className="px-4 py-2 border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Cancel Appointment
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Right Side: High Fidelity Virtual AI Voice Assistant Panel */}
        <AnimatePresence>
          {isAssistantExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 280 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 280 }}
              transition={{ type: 'spring', damping: 26, stiffness: 170 }}
              className="w-full lg:w-[35%] bg-slate-950/75 border-l border-white/10 h-[calc(100vh-73px)] flex flex-col justify-between shadow-2xl relative z-40 backdrop-blur-xl"
            >
              {/* Virtual panel header */}
              <div className="p-4 bg-slate-950/40 border-b border-white/5 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5 font-sans">
                  <div className="w-8 h-8 rounded-full bg-teal-400/20 border border-teal-400/35 text-teal-300 flex items-center justify-center animate-pulse">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-sm text-white tracking-tight leading-tight">ABC Virtual Booking Voice</h3>
                    <span className="text-[9px] text-teal-400 font-mono tracking-wider">● AI SESSION ACTIVE</span>
                  </div>
                </div>

                {/* System toggles */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsVoiceOutputEnabled(!isVoiceOutputEnabled);
                      // Speech cancel on mute toggled
                      window.speechSynthesis.cancel();
                    }}
                    className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${!isVoiceOutputEnabled ? 'text-red-400' : 'text-teal-400'}`}
                    title={isVoiceOutputEnabled ? "Mute Voice Out" : "Enable Voice Out"}
                  >
                    {!isVoiceOutputEnabled ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setIsAssistantExpanded(false)}
                    className="p-1 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Voice Waves Animating / Bouncing matching speech or active processing */}
              <div className="h-16 px-4 bg-white/5 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2 font-sans">
                  <span className="text-xs font-bold text-slate-400 font-mono">Telemetry:</span>
                  <span className="text-[10px] bg-teal-400/15 border border-teal-400/20 text-teal-300 px-2.5 py-0.5 rounded-full font-bold">
                    {isListening ? 'User Talking...' : isAiResponding ? 'AI Formulating...' : 'Ready / Listening'}
                  </span>
                </div>

                {/* Wave Bars Bouncing */}
                <div className="flex items-end gap-1.5 h-6">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={isAiResponding || isListening ? {
                        height: [4, 24, 4],
                      } : {
                        height: [4, 8, 4],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6 + i * 0.1,
                        ease: "easeInOut"
                      }}
                      className="w-1 bg-teal-400 rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Transcript Chat Window Bubble Logs */}
              <div
                ref={chatScrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20"
              >
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed text-xs shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-teal-400 text-slate-950 rounded-br-none font-bold font-sans shadow-md'
                          : 'bg-white/5 text-slate-100 rounded-bl-none border border-white/10 backdrop-blur-md font-sans'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 select-none">
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-slate-950' : 'text-slate-400'}`}>
                          {msg.role === 'user' ? 'John Smith (You)' : 'ABC Virtual Assistant'}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}

                {isAiResponding && (
                  <div className="flex justify-start font-sans">
                    <div className="bg-white/5 text-slate-400 rounded-2xl px-4 py-3 leading-relaxed text-xs rounded-bl-none border border-white/10 shadow-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Virtual scheduling helper preview (real-time sync panel) */}
              {selectedDoctor || draft.doctorName || draft.date || draft.time ? (
                <div className="p-3 mx-4 my-2 rounded-xl bg-teal-400/5 border border-teal-400/20 flex flex-col gap-1 text-[11px] text-slate-300 animate-in fade-in slide-in-from-bottom-2">
                  <span className="text-[8px] font-bold uppercase text-teal-400 font-mono tracking-wider leading-none">AI Agent Form Synchronization</span>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 border-t border-white/5">
                    <div>
                      <span className="text-slate-500 font-mono text-[9px]">SPECIALIST: </span>
                      <span className="font-bold text-white">{draft.doctorName || 'Not Selected'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono text-[9px]">MEDIUM: </span>
                      <span className="font-bold text-white capitalize">{draft.type}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 font-mono text-[9px]">DAY & TIME: </span>
                      <span className="font-bold text-white">
                        {draft.date ? draft.date.slice(0, 15) : 'Any Day'} @ {draft.time || 'Not selected'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Input Controller Zone */}
              <div className="p-4 bg-slate-950/40 border-t border-white/10 space-y-3 backdrop-blur-md font-sans">
                <div className="flex items-center gap-2">
                  {/* Push to talk microphone dictation */}
                  {isSpeechSupported ? (
                    <button
                      onClick={toggleListening}
                      className={`p-3 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                        isListening
                          ? 'bg-red-505 bg-red-600 text-white animate-pulse shadow-md shadow-red-900/35'
                          : 'bg-white/5 border border-white/10 text-slate-350 hover:bg-white/10'
                      }`}
                      title={isListening ? "Listening... click to stop" : "Start speaking instructions"}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  ) : null}

                  {/* Text search companion */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitChatToAssistant(chatInput);
                    }}
                    className="flex-1 flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder={isListening ? "Listening to your Speech..." : "Type instruction commands..."}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isListening}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 outline-none rounded-xl text-white placeholder-slate-500 text-xs disabled:opacity-60 focus:border-teal-400/40 h-10 select-all"
                    />
                    <button
                      type="submit"
                      disabled={isListening || !chatInput.trim()}
                      className="p-2.5 bg-teal-400 text-slate-905 text-slate-950 rounded-xl flex items-center justify-center hover:bg-teal-300 active:scale-95 disabled:opacity-40 transition-all font-bold"
                    >
                      <Send className="h-4.5 w-4.5" />
                    </button>
                  </form>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between px-1 bg-white/5 p-2.5 rounded-lg border border-white/5 select-none font-mono">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-red-400 animate-pulse" /> Emergency: Call 911
                  </span>
                  <span>ABC Intake Assistant v2.0</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Call to Action launcher when assistant is closed */}
      {!isAssistantExpanded && (
        <motion.button
          onClick={() => setIsAssistantExpanded(true)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 md:bottom-6 right-6 z-40 bg-teal-400 hover:bg-teal-300 text-slate-950 p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer select-none transition-all active:scale-95"
        >
          <PhoneCall className="h-6 w-6 text-slate-950 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-950"></span>
        </motion.button>
      )}

      {/* Confirmed Appointment Modal alert overlay */}
      <AnimatePresence>
        {showSuccessToast && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl space-y-4 backdrop-blur-xl font-sans"
            >
              <div className="w-16 h-16 bg-teal-400/10 text-teal-300 rounded-full flex items-center justify-center mx-auto mb-2 border border-teal-400/25">
                <CheckCircle className="h-10 w-10 text-teal-400" />
              </div>

              <div className="space-y-1">
                <h3 className="font-display font-extrabold text-xl text-white">Booking Finalized!</h3>
                <p className="text-xs text-slate-400">Your medical appointment was successfully registered in ABC Clinic systems.</p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs text-left text-slate-300">
                <p>We sent a calendar invite summary, preparation instructions, and digital check-in passes to your registered address.</p>
              </div>

              <button
                onClick={() => setShowSuccessToast(false)}
                className="w-full py-2.5 bg-teal-400 text-slate-950 hover:bg-teal-300 text-xs font-bold rounded-xl active:scale-95 transition-all"
              >
                Back to Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Interactive Navigation Bar (Matches mockup navigation aesthetics with active state styling) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-950/80 border-t border-white/10 px-6 flex justify-around items-center z-35 md:hidden shadow-lg select-all backdrop-blur-lg font-sans">
        <button
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentView === 'home' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] uppercase font-bold tracking-tight mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setCurrentView('doctors')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentView === 'doctors' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[10px] uppercase font-bold tracking-tight mt-0.5">Specialists</span>
        </button>

        <button
          onClick={() => setCurrentView('schedule')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentView === 'schedule' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[10px] uppercase font-bold tracking-tight mt-0.5">Book</span>
        </button>

        <button
          onClick={() => setCurrentView('appointments')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentView === 'appointments' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="h-5 w-5" />
          <span className="text-[10px] uppercase font-bold tracking-tight mt-0.5">Visits</span>
        </button>
      </nav>
    </div>
  );
}
