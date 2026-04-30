import App from "./app";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code: codeParam } = await searchParams;

  if (!codeParam) {
    return <p>Please provide a join code</p>;
  }

  const code = Number(codeParam);
  if (Number.isNaN(code) || !Number.isInteger(code)) {
    return <p>Invalid join code: {codeParam}</p>;
  }

  return <App code={code} />;
}
