// src/api/client.ts
import axios from "axios";
import { API_BASE_URL } from "../config";

// Alap axios instance az API hívásokhoz
export const api = axios.create({
  baseURL: API_BASE_URL,
  // ha majd auth cookie / header lesz, itt tudjuk beállítani
  withCredentials: false,
});

// Példa: később ide kerülhetnek konkrét helper függvények is, pl.
// export async function getRooms() {
//   const res = await api.get("/api/chatrooms");
//   return res.data;
// }
