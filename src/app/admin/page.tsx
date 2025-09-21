async function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function AdminPage() {
	// Fake delay to test suspense boundary
	await delay(2000);

	return (
		<div>
			<h1>Admin Page</h1>
			<p>Welcome to the admin section of the application.</p>
		</div>
	);
}
