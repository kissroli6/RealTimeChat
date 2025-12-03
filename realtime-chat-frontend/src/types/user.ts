export interface UserDto {
  id: string;
  userName: string;
  displayName: string;
}

export type CurrentUser = UserDto;

export interface UserWithPresence extends UserDto {
  isOnline?: boolean;
}
