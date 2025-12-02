// src/api/users.ts

import { api } from "./client";

export type UserDto = {
  id: string;
  userName: string;
  displayName: string;
};

export async function createUser(
  userName: string,
  displayName: string
): Promise<UserDto> {
  const res = await api.post<UserDto>("/api/users", {
    userName,
    displayName,
  });
  return res.data;
}

export async function getUser(id: string): Promise<UserDto> {
  const res = await api.get<UserDto>(`/api/users/${id}`);
  return res.data;
}

// ⬇⬇⬇ ÚJ: user lekérése userName alapján (loginhez)
export async function getUserByUserName(
  userName: string
): Promise<UserDto> {
  const res = await api.get<UserDto>(
    `/api/users/by-username/${encodeURIComponent(userName)}`
  );
  return res.data;
}
