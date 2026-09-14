// Demo build: static in-memory data standing in for the real D1-backed API.
// Names, numbers and notes below are all fictional — a sample guest list for
// showing the dashboard's UI, not real submissions.
import type { Rsvp } from "./types";

export const DEMO_RSVPS: Rsvp[] = [
  {
    id: 1, code: "demo", guest_type: "all", name: "Priya Sharma", whatsapp: "+919812345601", side: "Aanya",
    attend_haldi: "Yes", attend_sangeet: "Yes", attend_wedding: "Yes", attend_reception: "Yes",
    guest_count: 2, guest_names: "Rohan Sharma, Meher Sharma", verified: 0, hidden: 0, note: "", created_at: "2026-08-18T09:12:00.000Z",
  },
  {
    id: 2, code: "demo", guest_type: "all", name: "Karan Malhotra", whatsapp: "+919812345602", side: "Dev",
    attend_haldi: "Yes", attend_sangeet: "Yes", attend_wedding: "Yes", attend_reception: "No",
    guest_count: 1, guest_names: "Simran Malhotra", verified: 1, hidden: 0, note: "Driving down a day early", created_at: "2026-08-18T11:40:00.000Z",
  },
  {
    id: 3, code: "demo", guest_type: "all", name: "Neha Kapoor", whatsapp: "+971501234567", side: "Aanya",
    attend_haldi: "No", attend_sangeet: "Yes", attend_wedding: "Yes", attend_reception: "Yes",
    guest_count: 0, guest_names: "", verified: 0, hidden: 0, note: "Allergic to nuts", created_at: "2026-08-17T16:05:00.000Z",
  },
  {
    id: 4, code: "demo", guest_type: "all", name: "Arjun Verma", whatsapp: "+919744998811", side: "Both",
    attend_haldi: "", attend_sangeet: "", attend_wedding: "", attend_reception: "",
    guest_count: 0, guest_names: "", verified: 0, hidden: 0, note: "Started the form, never finished", created_at: "2026-08-17T08:30:00.000Z",
  },
  {
    id: 5, code: "sangeet-demo", guest_type: "sangeet", name: "Divya Nair", whatsapp: "+919846223344", side: "Aanya",
    attend_haldi: "", attend_sangeet: "Yes", attend_wedding: "Yes", attend_reception: "Yes",
    guest_count: 1, guest_names: "Suresh Nair", verified: 0, hidden: 0, note: "", created_at: "2026-08-18T13:22:00.000Z",
  },
  {
    id: 6, code: "sangeet-demo", guest_type: "sangeet", name: "Rohit Bhatia", whatsapp: "+919847778899", side: "Dev",
    attend_haldi: "", attend_sangeet: "No", attend_wedding: "Yes", attend_reception: "Yes",
    guest_count: 0, guest_names: "", verified: 0, hidden: 0, note: "", created_at: "2026-08-16T19:48:00.000Z",
  },
  {
    id: 7, code: "sangeet-demo", guest_type: "sangeet", name: "Meera Iyer", whatsapp: "+919895001122", side: "Both",
    attend_haldi: "", attend_sangeet: "Yes", attend_wedding: "Yes", attend_reception: "",
    guest_count: 3, guest_names: "Suresh Iyer, Anjali Iyer, Kiran Iyer", verified: 0, hidden: 0, note: "Needs veg meals for all four", created_at: "2026-08-16T10:15:00.000Z",
  },
  {
    id: 8, code: "wedding-demo", guest_type: "wedding", name: "Thomas George", whatsapp: "+919744112233", side: "Dev",
    attend_haldi: "", attend_sangeet: "", attend_wedding: "Yes", attend_reception: "Yes",
    guest_count: 1, guest_names: "Elsa George", verified: 1, hidden: 0, note: "", created_at: "2026-08-15T15:00:00.000Z",
  },
  {
    id: 9, code: "wedding-demo", guest_type: "wedding", name: "Kavya Reddy", whatsapp: "+919846556677", side: "Aanya",
    attend_haldi: "", attend_sangeet: "", attend_wedding: "Yes", attend_reception: "No",
    guest_count: 0, guest_names: "", verified: 0, hidden: 0, note: "", created_at: "2026-08-15T09:33:00.000Z",
  },
  {
    id: 10, code: "wedding-demo", guest_type: "wedding", name: "Aditya Rao", whatsapp: "+919895887766", side: "Dev",
    attend_haldi: "", attend_sangeet: "", attend_wedding: "No", attend_reception: "No",
    guest_count: 0, guest_names: "", verified: 1, hidden: 0, note: "Travelling that week, sending a gift", created_at: "2026-08-14T12:10:00.000Z",
  },
  {
    id: 11, code: "reception-demo", guest_type: "reception", name: "Lakshmi Menon", whatsapp: "+919744334455", side: "Both",
    attend_haldi: "", attend_sangeet: "", attend_wedding: "", attend_reception: "Yes",
    guest_count: 2, guest_names: "Ganesh Menon, Radha Menon", verified: 0, hidden: 0, note: "", created_at: "2026-08-18T17:55:00.000Z",
  },
  {
    id: 12, code: "reception-demo", guest_type: "reception", name: "Nikhil Chawla", whatsapp: "+919846990011", side: "Dev",
    attend_haldi: "", attend_sangeet: "", attend_wedding: "", attend_reception: "Yes",
    guest_count: 0, guest_names: "", verified: 0, hidden: 0, note: "", created_at: "2026-08-14T20:20:00.000Z",
  },
  {
    id: 13, code: "reception-demo", guest_type: "reception", name: "Fatima Sheikh", whatsapp: "+919895443322", side: "Aanya",
    attend_haldi: "", attend_sangeet: "", attend_wedding: "", attend_reception: "",
    guest_count: 0, guest_names: "", verified: 0, hidden: 0, note: "", created_at: "2026-08-13T07:45:00.000Z",
  },
  {
    id: 14, code: "demo", guest_type: "all", name: "Test Entry", whatsapp: "+910000000000", side: "",
    attend_haldi: "Yes", attend_sangeet: "Yes", attend_wedding: "Yes", attend_reception: "Yes",
    guest_count: 0, guest_names: "", verified: 0, hidden: 1, note: "sample hidden row", created_at: "2026-08-12T06:00:00.000Z",
  },
];
