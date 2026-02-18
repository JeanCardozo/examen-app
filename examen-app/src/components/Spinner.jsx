export default function Spinner({ size = "8", color = "primaryBlue" }) {
  return (
    <div className="flex justify-center items-center">
      <div
        className={`animate-spin rounded-full h-${size} w-${size} border-t-4 border-${color}`}
      ></div>
    </div>
  );
}
