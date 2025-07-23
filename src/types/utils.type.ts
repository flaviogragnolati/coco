import type { Dayjs } from "~/utils/date";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Nullable<T> = T | null;

export type NullableFields<T> = {
	[P in keyof T]: T[P] | null;
};

export type NonNullableFields<T> = {
	[P in keyof T]: NonNullable<T[P]>;
};

export type Nullish<T> = T | null | undefined;
export type NonNullish<T> = Exclude<T, null | undefined>;

export type NullishFields<T> = {
	[P in keyof T]: T[P] | null | undefined;
};

export type NonNullishFields<T> = {
	[P in keyof T]: NonNullish<T[P]>;
};

export type NonNullableFieldsExcept<T, K extends keyof T> = {
	[P in keyof T]: P extends K ? T[P] : NonNullable<T[P]>;
};

export type UnDot<T extends string> = T extends `${infer A}.${infer B}`
	? [A, ...UnDot<B>]
	: [T];

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type PartialRecord<K extends keyof any, T> = {
	[P in K]?: T;
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type Tail<T extends any[]> = ((...t: T) => void) extends (
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	h: any,
	...r: infer R
) => void
	? R
	: never;

export type DeepOmit<T, Path extends string[]> = T extends object
	? Path["length"] extends 1
		? Omit<T, Path[0]>
		: {
				[K in keyof T]: K extends Path[0] ? DeepOmit<T[K], Tail<Path>> : T[K];
			}
	: T;

export type DeepOmitByPath<T, Path extends string> = DeepOmit<T, UnDot<Path>>;

export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
		}
	: T;

// @see https://stackoverflow.com/questions/59071058/how-to-pick-and-rename-certain-keys-using-typescript
export type RenameMulti<
	T,
	R extends {
		[K in keyof R]: K extends keyof T ? PropertyKey : "Error: key not in T";
	},
> = { [P in keyof T as P extends keyof R ? R[P] : P]: T[P] };

export type TupleUnion<U extends string, R extends string[] = []> = {
	[S in U]: Exclude<U, S> extends never
		? [...R, S]
		: TupleUnion<Exclude<U, S>, [...R, S]>;
}[U] &
	string[];

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> &
	Pick<T, K>;

export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> &
	Pick<T, K>;

export type Mandatory<T> = Required<T> & NonNullableFields<T>;

export type MandatoryExcept<T, K extends keyof T> = Required<Omit<T, K>> &
	NonNullableFields<Omit<T, K>> &
	Pick<T, K>;

export type Modify<T, R> = Omit<T, keyof R> & R;

export type StrictModify<
	T,
	R extends { [K in keyof R]: K extends keyof T ? T[K] : never },
> = keyof R extends keyof T ? Omit<T, keyof R> & R : never;

export type ArrayLengthMutationKeys =
	| "splice"
	| "push"
	| "pop"
	| "shift"
	| "unshift";
export type FixedLengthArray<
	T,
	L extends number,
	TObj = [T, ...Array<T>],
> = Pick<TObj, Exclude<keyof TObj, ArrayLengthMutationKeys>> & {
	readonly length: L;
	[I: number]: T;
	[Symbol.iterator]: () => IterableIterator<T>;
};

export type DeepKeys<T> = T extends object
	? {
			[K in keyof T]?: K extends string | number
				? `${K}` | `${K}.${DeepKeys<T[K]>}`
				: never;
		}[keyof T]
	: never;

type JsonPrimitive = string | number | boolean | null;
type Jsonifiable =
	| JsonPrimitive
	| JsonPrimitive[]
	| { [key: string]: Jsonifiable };

type JsonParseValue<T> = T extends Date
	? string
	: T extends JsonPrimitive
		? T
		: T extends (infer U)[]
			? JsonParseValue<U>[]
			: // biome-ignore lint/suspicious/noExplicitAny: <explanation>
				T extends { [key: string]: any }
				? JsonParse<T>
				: T extends (infer U)[] | null
					? JsonParseValue<U>[] | null
					: T extends object | null
						? JsonParse<T> | null
						: never;

export type JsonParse<T> = {
	[K in keyof T]: JsonParseValue<T[K]>;
};

export function isStringOrNumber(value: unknown): value is string | number {
	return typeof value === "string" || typeof value === "number";
}

export function notEmpty<TValue>(
	value: TValue | null | undefined,
): value is TValue {
	if (value === null || value === undefined) return false;
	return true;
}

export const isDefined = <T>(
	value: T | undefined | null,
): value is NonNullable<T> => value !== undefined && value !== null;

export const isNotDefined = <T>(
	value: T | undefined | null,
): value is undefined | null => value === undefined || value === null;

export const isEmpty = (
	value: string | undefined | null,
): value is undefined | null =>
	value === undefined || value === null || value === "";

export const isNotEmpty = (value: string | undefined | null): value is string =>
	value !== undefined && value !== null && value !== "";

export const filterNullish = <T>(
	arr: (T | null | undefined)[],
): NonNullable<T>[] => {
	return arr.filter((item): item is NonNullable<T> => {
		return item !== null && item !== undefined;
	});
};

export type NullishString = string | null | undefined;
export type NullishNumber = number | null | undefined;
export type NullishBoolean = boolean | null | undefined;
export type NullishDate = Date | null | undefined;
export type NullishObject<T> = T | null | undefined;
export type NullishArray<T> = T[] | null | undefined;
