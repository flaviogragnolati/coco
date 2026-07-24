/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	async redirects() {
		return [
			{ source: "/admin/crud-home", destination: "/admin", permanent: false },
			{
				source: "/admin/crud-home/:path*",
				destination: "/admin/:path*",
				permanent: false,
			},
			{
				source: "/admin/operations/user-carts",
				destination: "/admin/carts",
				permanent: false,
			},
			{
				source: "/admin/operations/user-carts/:cartId",
				destination: "/admin/carts/:cartId",
				permanent: false,
			},
			{
				source: "/admin/operations/operations",
				destination: "/admin/operations",
				permanent: false,
			},
			// `/admin/operations` itself is now the Operation entity page, so only the
			// nested sections below it are redirected.
			{
				source: "/admin/operations/:section(lots|packages|shipments|tracking)",
				destination: "/admin/:section",
				permanent: false,
			},
		];
	},
};

export default config;
