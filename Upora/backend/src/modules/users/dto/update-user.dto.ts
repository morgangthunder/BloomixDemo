// Temporary: Partial<CreateUserDto> for MVP
// TODO: Add @nestjs/mapped-types when package issue is resolved

export class UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}
