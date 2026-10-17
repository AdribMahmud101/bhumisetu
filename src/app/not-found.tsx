import Link from "next/link";
export default function NotFound() {
  return (
    <main style={{ padding: "80px", textAlign: "center" }}>
      <h1>রেকর্ড বা পেজ পাওয়া যায়নি</h1>
      <p>এই লিংকটি সঠিক কিনা যাচাই করুন।</p>
      <Link href="/verify">জমির রেকর্ড খুঁজুন →</Link>
    </main>
  );
}
