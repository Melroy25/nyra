import { User } from '../types';

export const mockUser: User = {
  id: 'user-sarah',
  name: 'Sarah🌸',
  age: 28,
  dob: '1998-04-12',
  averageCycleLength: 28,
  periodDuration: 5,
  goals: ['Track cycle', 'Improve wellness', 'Understand symptoms'],
  partnerCode: 'NYRA-82941',
  connectedPartnerCode: 'partner-john',
  role: 'user',
};

export const mockPartner: User = {
  id: 'partner-john',
  name: 'John❤️',
  age: 30,
  dob: '1996-08-20',
  averageCycleLength: 0,
  periodDuration: 0,
  goals: [],
  partnerCode: 'NYRA-PARTNER-55',
  connectedPartnerCode: 'user-sarah',
  role: 'partner',
};
