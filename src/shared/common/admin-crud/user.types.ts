import type { z } from "zod";

import type {
	userCreateInputSchema,
	userDeleteInputSchema,
	userDetailSchema,
	userListInputSchema,
	userListItemSchema,
	userRoleSchema,
	userStatsSchema,
	userUpdateInputSchema,
} from "~/schemas/admin/user.schemas";

export type UserRole = z.output<typeof userRoleSchema>;
export type UserListInput = z.output<typeof userListInputSchema>;
export type UserListItem = z.output<typeof userListItemSchema>;
export type UserDetail = z.output<typeof userDetailSchema>;
export type UserStats = z.output<typeof userStatsSchema>;
export type UserCreateInput = z.output<typeof userCreateInputSchema>;
export type UserUpdateInput = z.output<typeof userUpdateInputSchema>;
export type UserDeleteInput = z.output<typeof userDeleteInputSchema>;
export type UserDeleteResult = Pick<UserDeleteInput, "id">;
export type UserFormInput = z.input<typeof userCreateInputSchema>;
export type UserFormValues = z.output<typeof userCreateInputSchema>;
