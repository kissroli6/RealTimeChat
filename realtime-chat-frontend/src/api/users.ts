import { api } from "./client";

export type UserDto = {
  id: string;
  userName: string;
  displayName: string;
};

export async function getUserByUserName(userName: string): Promise<UserDto> {
  const res = await api.get<UserDto>(
    `/api/users/by-username/${encodeURIComponent(userName)}`
  );
  return res.data;
}

export async function createUser(userName: string, displayName: string): Promise<UserDto> {
  const res = await api.post<UserDto>("/api/users", { 
    userName, 
    displayName 
  });
  return res.data;
}

export async function getAllUsers(): Promise<UserDto[]> {
  const res = await api.get<UserDto[]>("/api/users");
  return res.data;
}