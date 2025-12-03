// src/api/users.ts
import { api } from "./client";
import type { UserDto } from "../types/user";

// Loginhoz használt függvény
export async function getUserByUserName(userName: string): Promise<UserDto> {
  const res = await api.get<UserDto>(
    `/api/users/by-username/${encodeURIComponent(userName)}`
  );
  return res.data;
}

// User lista (DM indításhoz)
export async function getAllUsers(): Promise<UserDto[]> {
  const res = await api.get<UserDto[]>("/api/users");
  return res.data;
}

