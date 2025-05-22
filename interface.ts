import { ObjectId } from "mongodb";
export interface Manufacturer {
  id: number;
  name: string;
  isCertified: boolean;
  yearFounded: number;
  logoUrl: string;
}

export interface Watch {
  _id?: ObjectId;
  id: number;
  name: string;
  description: string;
  price: number;
  isWaterResistant: boolean;
  releaseDate: string;
  imageUrl: string;
  watchType: string;
  features: string[];
  manufacturer: Manufacturer;
}

export interface WatchCollectionProps {
  watches: Watch[];
  currentUser?: {
    username: string;
  };
}
export interface User {
    _id?: ObjectId;
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'USER';
    createdAt: Date;
}
export interface AppLocals {
    currentUser: (User & { loggedIn?: boolean }) | null;
}