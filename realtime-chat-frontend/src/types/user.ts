export interface UserDto {
  id: string;
  userName: string;
  displayName: string;
}

export interface CurrentUser extends UserDto {}

export interface UserWithPresence extends UserDto {
  isOnline?: boolean;
}
