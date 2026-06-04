export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  patients: string;
  image: string;
  availableSlots: string[];
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorImage: string;
  date: string;
  time: string;
  type: 'in-person' | 'online';
  reason: string;
  status: 'confirmed' | 'cancelled';
}

export interface BookingState {
  patientName: string;
  patientPhone: string;
  doctorName: string;
  doctorSpecialty: string;
  reason: string;
  date: string;
  time: string;
  type: 'in-person' | 'online';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isVoice?: boolean;
}

export interface VoiceAssistantData {
  status: string;
  message: string;
}
