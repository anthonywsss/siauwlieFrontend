export function showToast(type: "success" | "error", message: string) {
  if (typeof window === "undefined") return;

  if (type === "success") {
    alert("✅ " + message);
  } else {
    alert("❌ " + message);
  }
}
