export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  engine: string;
  odometer: number;
  plate: string;
  nickname: string;
  color: string;
  driveType?: "chain" | "belt" | "shaft";
};

export type Ride = {
  id: string;
  date: string;
  start: string;
  end: string;
  distance: number;
  durationMin: number;
  avgSpeed: number;
  maxSpeed: number;
  weather: string;
  vehicleId?: string;
  notes?: string;
};

export type FuelEntry = {
  id: string;
  vehicleId: string;
  date: string;
  liters: number;
  pricePerLiter: number;
  odometer: number;
  station?: string;
  fullTank: boolean;
};

export type Maintenance = Record<string, Record<string, number>>; // vehicleId -> serviceKey -> lastDoneOdometer

export type SosContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
};

export type Settings = {
  riderName: string;
  city: string;
  experience: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  distanceUnit: "KM" | "MI";
  speedUnit: "KM/H" | "MPH";
  longRideThreshold: number;
  checklistReminder: boolean;
  oilChangeInterval: number;
  maintenanceNotifs: boolean;
  weatherLocation: string;
  bloodType: string;
  medicalNotes: string;
  speedLimitEnabled: boolean;
  speedLimit: number;
  sosHoldEnabled: boolean;
  emergencyMessage: string;
};

export type BikeLogEntry = {
  id: string;
  vehicleId: string;
  date: string;
  category: string;
  text: string;
};

export type SavedRoute = {
  id: string;
  name: string;
  start: string;
  end: string;
  distance: number;
  durationMin: number;
  difficulty: "Easy" | "Moderate" | "Long Ride";
  turns: number;
  favorite?: boolean;
  preset?: boolean;
};

export type ChatMsg = { id: string; role: "user" | "bot"; text: string; ts: number };

export type Incident = { id: string; type: string; notes: string; ts: number; location: string };
